import { db } from '$lib/server/db';
import { employee, checklistTemplate, checklistAssignment } from '$lib/server/db/schema';
import { desc, asc, eq, and, inArray } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import * as audit from '$lib/server/audit';
import { requireMember } from '$lib/server/auth-guard';
import { listRoles, ensureRoles } from '$lib/server/roles';
import { COUNTRIES } from '$lib/constants';
import type { PageServerLoad, Actions } from './$types';

const STATUSES = ['active', 'onboarding', 'offer_pending', 'pending_termination', 'terminated', 'no_status'] as const;

export const load: PageServerLoad = async ({ locals }) => {
	const orgId = locals.organizationId!;
	const [employees, roles, templates] = await Promise.all([
		db.select().from(employee).where(eq(employee.organizationId, orgId)).orderBy(desc(employee.createdAt)),
		listRoles(orgId),
		db.select({ id: checklistTemplate.id, name: checklistTemplate.name, checklistType: checklistTemplate.checklistType })
			.from(checklistTemplate)
			.where(eq(checklistTemplate.organizationId, orgId))
			.orderBy(asc(checklistTemplate.name))
	]);
	return { employees, roles, templates };
};

export const actions: Actions = {
	setStatus: async ({ request, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const id = data.get('employeeId')?.toString() ?? '';
		const status = data.get('status')?.toString() ?? '';

		if (!id || !STATUSES.includes(status as (typeof STATUSES)[number])) {
			return fail(400, { statusError: 'Invalid status' });
		}

		const [emp] = await db.select().from(employee)
			.where(and(eq(employee.id, id), eq(employee.organizationId, orgId)));
		if (!emp) error(404, 'Employee not found');

		if (emp.status === status) return { success: true };

		const becameTerminated = status === 'terminated' && emp.status !== 'terminated';

		await db.update(employee)
			.set({ status, updatedAt: new Date() })
			.where(and(eq(employee.id, id), eq(employee.organizationId, orgId)));

		await audit.log({
			action: 'employee.status_changed',
			organizationId: orgId,
			subjectType: 'employee',
			subjectId: id,
			subjectLabel: `${emp.firstName} ${emp.lastName}`,
			actorId: locals.user!.id,
			actorLabel: locals.user!.name,
			metadata: { from: emp.status, to: status }
		});

		// Terminations are now derived from employee status (see /terminations),
		// so there's no separate record to create — just record the transition.
		if (becameTerminated) {
			await audit.log({
				action: 'employee.terminated',
				organizationId: orgId,
				subjectType: 'employee',
				subjectId: id,
				subjectLabel: `${emp.firstName} ${emp.lastName}`,
				actorId: locals.user!.id,
				actorLabel: locals.user!.name
			});
		}

		return { success: true };
	},

	bulkUpdate: async ({ request, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const ids = data.getAll('ids').map(String).filter(Boolean);
		const field = data.get('field')?.toString() ?? '';
		const value = data.get('value')?.toString() ?? '';

		if (ids.length === 0) return fail(400, { bulkError: 'No employees selected' });

		if (field === 'status') {
			if (!STATUSES.includes(value as (typeof STATUSES)[number])) return fail(400, { bulkError: 'Invalid status' });
		} else if (field === 'country') {
			if (!COUNTRIES.includes(value)) return fail(400, { bulkError: 'Invalid country' });
		} else if (field === 'role') {
			if (!value.trim()) return fail(400, { bulkError: 'Role is required' });
		} else {
			return fail(400, { bulkError: 'Invalid field' });
		}

		const targets = await db.select().from(employee)
			.where(and(inArray(employee.id, ids), eq(employee.organizationId, orgId)));
		if (targets.length === 0) return fail(400, { bulkError: 'No matching employees' });

		await db.update(employee)
			.set({ [field]: value, updatedAt: new Date() })
			.where(and(inArray(employee.id, ids), eq(employee.organizationId, orgId)));

		// Keep the role picker in sync if a new role was applied.
		if (field === 'role') await ensureRoles(orgId, [value]);

		await Promise.all(
			targets
				.filter((emp) => (emp as Record<string, unknown>)[field] !== value)
				.map((emp) =>
					audit.log({
						action: field === 'status' ? 'employee.status_changed' : 'employee.updated',
						organizationId: orgId,
						subjectType: 'employee',
						subjectId: emp.id,
						subjectLabel: `${emp.firstName} ${emp.lastName}`,
						actorId: locals.user!.id,
						actorLabel: locals.user!.name,
						metadata: field === 'status' ? { from: emp.status, to: value, bulk: true } : { [field]: value, bulk: true }
					})
				)
		);

		// Bulk-terminating just records the transition per employee — terminations
		// are derived from employee status now (see /terminations).
		if (field === 'status' && value === 'terminated') {
			for (const emp of targets) {
				if (emp.status === 'terminated') continue;
				await audit.log({
					action: 'employee.terminated',
					organizationId: orgId,
					subjectType: 'employee',
					subjectId: emp.id,
					subjectLabel: `${emp.firstName} ${emp.lastName}`,
					actorId: locals.user!.id,
					actorLabel: locals.user!.name
				});
			}
		}

		return { success: true, updated: targets.length };
	},

	bulkAssignChecklist: async ({ request, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const ids = data.getAll('ids').map(String).filter(Boolean);
		const templateId = data.get('templateId')?.toString() ?? '';

		if (ids.length === 0) return fail(400, { bulkError: 'No employees selected' });
		if (!templateId) return fail(400, { bulkError: 'No template selected' });

		const [tmpl] = await db.select().from(checklistTemplate)
			.where(and(eq(checklistTemplate.id, templateId), eq(checklistTemplate.organizationId, orgId)));
		if (!tmpl) return fail(400, { bulkError: 'Invalid template' });

		const targets = await db.select().from(employee)
			.where(and(inArray(employee.id, ids), eq(employee.organizationId, orgId)));
		if (targets.length === 0) return fail(400, { bulkError: 'No matching employees' });

		// onConflictDoNothing skips employees already assigned this template
		// (unique index on employeeId + templateId).
		await db.insert(checklistAssignment).values(
			targets.map((emp) => ({
				organizationId: orgId,
				employeeId: emp.id,
				templateId,
				assignedByLabel: locals.user?.name
			}))
		).onConflictDoNothing();

		await Promise.all(
			targets.map((emp) =>
				audit.log({
					action: 'checklist.assigned',
					organizationId: orgId,
					subjectType: 'employee',
					subjectId: emp.id,
					subjectLabel: `${emp.firstName} ${emp.lastName}`,
					actorId: locals.user!.id,
					actorLabel: locals.user!.name,
					metadata: { templateId, templateName: tmpl.name, bulk: true, related: { type: 'template', id: templateId, label: tmpl.name } }
				})
			)
		);

		return { success: true, updated: targets.length };
	}
};
