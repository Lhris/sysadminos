import { db } from '$lib/server/db';
import {
	employee,
	platform,
	platformLicense,
	checklistAssignment,
	checklistTemplate,
	checklistTemplateItem,
	checklistCompletion
} from '$lib/server/db/schema';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { requireMember } from '$lib/server/auth-guard';
import { TERMINATING_STATUSES } from '$lib/constants';
import type { PageServerLoad, Actions } from './$types';

// The detail page is keyed by employeeId now (terminations are derived from
// employee status, there's no termination record).
async function loadEmployee(id: string, orgId: string) {
	const [emp] = await db
		.select()
		.from(employee)
		.where(and(eq(employee.id, id), eq(employee.organizationId, orgId)));
	return emp;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const orgId = locals.organizationId!;

	const emp = await loadEmployee(params.id, orgId);
	if (!emp) error(404, 'Employee not found');

	// Platform removals: the employee's licenses across all platforms. Active
	// (removedAt null) = still to remove; removed = done.
	const licenses = await db
		.select({
			id: platformLicense.id,
			platformId: platform.id,
			platformName: platform.name,
			matchEmail: platformLicense.matchEmail,
			displayName: platformLicense.displayName,
			removedAt: platformLicense.removedAt,
			removedByLabel: platformLicense.removedByLabel
		})
		.from(platformLicense)
		.innerJoin(platform, eq(platformLicense.platformId, platform.id))
		.where(and(eq(platform.organizationId, orgId), eq(platformLicense.employeeId, params.id)))
		.orderBy(asc(platform.name));

	// Termination-type checklists assigned to this employee (normal assignments).
	const assignments = await db
		.select({
			id: checklistAssignment.id,
			templateId: checklistAssignment.templateId,
			templateName: checklistTemplate.name,
			assignedAt: checklistAssignment.assignedAt
		})
		.from(checklistAssignment)
		.innerJoin(checklistTemplate, eq(checklistAssignment.templateId, checklistTemplate.id))
		.where(
			and(
				eq(checklistAssignment.employeeId, params.id),
				eq(checklistTemplate.checklistType, 'termination')
			)
		)
		.orderBy(asc(checklistAssignment.assignedAt));

	const templateIds = [...new Set(assignments.map((a) => a.templateId))];
	const assignmentIds = assignments.map((a) => a.id);

	const [templateItems, completions, terminationTemplates] = await Promise.all([
		templateIds.length
			? db
					.select()
					.from(checklistTemplateItem)
					.where(inArray(checklistTemplateItem.templateId, templateIds))
					.orderBy(asc(checklistTemplateItem.position), asc(checklistTemplateItem.createdAt))
			: Promise.resolve([] as (typeof checklistTemplateItem.$inferSelect)[]),
		assignmentIds.length
			? db.select().from(checklistCompletion).where(inArray(checklistCompletion.assignmentId, assignmentIds))
			: Promise.resolve([] as (typeof checklistCompletion.$inferSelect)[]),
		db
			.select()
			.from(checklistTemplate)
			.where(and(eq(checklistTemplate.organizationId, orgId), eq(checklistTemplate.checklistType, 'termination')))
			.orderBy(asc(checklistTemplate.name))
	]);

	const assignedTemplateIds = new Set(assignments.map((a) => a.templateId));

	return {
		employee: emp,
		licenses,
		assignments,
		templateItems,
		completions,
		availableTemplates: terminationTemplates.filter((t) => !assignedTemplateIds.has(t.id))
	};
};

export const actions: Actions = {
	togglePlatformRemoval: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;
		if (!(await loadEmployee(params.id, orgId))) return fail(404);

		const data = await request.formData();
		const licenseId = data.get('licenseId')?.toString() ?? '';
		const removing = data.get('removing') === 'true';

		// Verify the license belongs to this employee + org before touching it.
		const [lic] = await db
			.select({ id: platformLicense.id })
			.from(platformLicense)
			.innerJoin(platform, eq(platformLicense.platformId, platform.id))
			.where(
				and(
					eq(platformLicense.id, licenseId),
					eq(platformLicense.employeeId, params.id),
					eq(platform.organizationId, orgId)
				)
			);
		if (!lic) return fail(404);

		// Removal state lives on the license itself — same toggle the platform
		// page uses, so both views stay consistent.
		await db
			.update(platformLicense)
			.set({
				removedAt: removing ? new Date() : null,
				removedByLabel: removing ? locals.user?.name : null
			})
			.where(eq(platformLicense.id, licenseId));
		return { success: true };
	},

	toggleChecklistItem: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;
		if (!(await loadEmployee(params.id, orgId))) return fail(404);

		const data = await request.formData();
		const assignmentId = data.get('assignmentId')?.toString() ?? '';
		const templateItemId = data.get('templateItemId')?.toString() ?? '';
		const completing = data.get('completing') === 'true';

		// Ensure the assignment belongs to this employee + org.
		const [assignment] = await db
			.select()
			.from(checklistAssignment)
			.where(
				and(
					eq(checklistAssignment.id, assignmentId),
					eq(checklistAssignment.employeeId, params.id),
					eq(checklistAssignment.organizationId, orgId)
				)
			);
		if (!assignment) return fail(404);

		if (completing) {
			await db
				.insert(checklistCompletion)
				.values({ assignmentId, templateItemId, completedByLabel: locals.user?.name })
				.onConflictDoNothing();
		} else {
			await db
				.delete(checklistCompletion)
				.where(
					and(eq(checklistCompletion.assignmentId, assignmentId), eq(checklistCompletion.templateItemId, templateItemId))
				);
		}
		return { success: true };
	},

	addChecklist: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;
		if (!(await loadEmployee(params.id, orgId))) return fail(404);

		const data = await request.formData();
		const templateId = data.get('templateId')?.toString() ?? '';
		if (!templateId) return fail(400, { addError: 'Select a checklist' });

		// Only termination-type templates can be attached here.
		const [tmpl] = await db
			.select()
			.from(checklistTemplate)
			.where(
				and(
					eq(checklistTemplate.id, templateId),
					eq(checklistTemplate.organizationId, orgId),
					eq(checklistTemplate.checklistType, 'termination')
				)
			);
		if (!tmpl) return fail(400, { addError: 'Checklist not found' });

		// Proxy of /checklists: this is a normal assignment.
		await db
			.insert(checklistAssignment)
			.values({ organizationId: orgId, employeeId: params.id, templateId, assignedByLabel: locals.user?.name })
			.onConflictDoNothing();
		return { success: true };
	},

	removeChecklist: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;
		if (!(await loadEmployee(params.id, orgId))) return fail(404);

		const data = await request.formData();
		const assignmentId = data.get('assignmentId')?.toString() ?? '';
		await db
			.delete(checklistAssignment)
			.where(
				and(
					eq(checklistAssignment.id, assignmentId),
					eq(checklistAssignment.employeeId, params.id),
					eq(checklistAssignment.organizationId, orgId)
				)
			);
		return { success: true };
	}
};
