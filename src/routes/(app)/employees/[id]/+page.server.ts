import { db } from '$lib/server/db';
import { employee, auditLog, workstation, workstationAssignment, workstationTimeline, checklistAssignment, checklistTemplate, checklistTemplateItem, checklistCompletion } from '$lib/server/db/schema';
import { eq, desc, and, isNull, asc, inArray } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import * as audit from '$lib/server/audit';
import { requireMember } from '$lib/server/auth-guard';
import { listRoles, ensureRoles } from '$lib/server/roles';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const orgId = locals.organizationId!;

	const [emp] = await db.select().from(employee)
		.where(and(eq(employee.id, params.id), eq(employee.organizationId, orgId)));
	if (!emp) error(404, 'Employee not found');

	const assignments = await db.select().from(checklistAssignment)
		.where(eq(checklistAssignment.employeeId, params.id))
		.orderBy(asc(checklistAssignment.assignedAt));

	const assignmentIds = assignments.map(a => a.id);
	const templateIds = [...new Set(assignments.map(a => a.templateId))];

	const [events, allWorkstations, templates, templateItems, completions, roles] = await Promise.all([
		db.select().from(auditLog)
			.where(and(eq(auditLog.subjectId, params.id), eq(auditLog.organizationId, orgId)))
			.orderBy(desc(auditLog.createdAt)),
		db.select({
			id: workstation.id,
			serialNumber: workstation.serialNumber,
			make: workstation.make,
			model: workstation.model,
			deviceType: workstation.deviceType,
			status: workstation.status,
			assignedEmployeeId: workstation.assignedEmployeeId,
			holderFirstName: employee.firstName,
			holderLastName: employee.lastName
		})
		.from(workstation)
		.leftJoin(employee, eq(workstation.assignedEmployeeId, employee.id))
		.where(eq(workstation.organizationId, orgId)),
		templateIds.length > 0
			? db.select().from(checklistTemplate).where(inArray(checklistTemplate.id, templateIds))
			: Promise.resolve([] as (typeof checklistTemplate.$inferSelect)[]),
		templateIds.length > 0
			? db.select().from(checklistTemplateItem)
				.where(inArray(checklistTemplateItem.templateId, templateIds))
				.orderBy(asc(checklistTemplateItem.position), asc(checklistTemplateItem.createdAt))
			: Promise.resolve([] as (typeof checklistTemplateItem.$inferSelect)[]),
		assignmentIds.length > 0
			? db.select().from(checklistCompletion).where(inArray(checklistCompletion.assignmentId, assignmentIds))
			: Promise.resolve([] as (typeof checklistCompletion.$inferSelect)[]),
		listRoles(orgId)
	]);

	return {
		employee: emp,
		events,
		workstations: allWorkstations.filter(w => w.assignedEmployeeId === params.id),
		assignable: allWorkstations.filter(w =>
			w.assignedEmployeeId !== params.id &&
			(w.status === 'available' || w.status === 'assigned')
		),
		assignments,
		templates,
		templateItems,
		completions,
		roles
	};
};

export const actions: Actions = {
	updateEmployee: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const firstName      = data.get('firstName')?.toString().trim() ?? '';
		const lastName       = data.get('lastName')?.toString().trim() ?? '';
		const microsoftEmail = data.get('microsoftEmail')?.toString().trim() ?? '';
		const personalEmail  = data.get('personalEmail')?.toString().trim() || null;
		const tempPassword   = data.get('tempPassword')?.toString().trim() || null;
		const role           = data.get('role')?.toString().trim() ?? '';
		const country        = data.get('country')?.toString().trim() ?? '';
		const address        = data.get('address')?.toString().trim() || null;
		const startDateRaw   = data.get('startDate')?.toString() ?? '';
		const startDate      = startDateRaw ? `${startDateRaw}T08:30:00-08:00` : '';
		const status         = data.get('status')?.toString() ?? 'onboarding';

		const errors: Record<string, string> = {};
		if (!firstName)      errors.firstName      = 'Required';
		if (!lastName)       errors.lastName       = 'Required';
		if (!microsoftEmail) errors.microsoftEmail = 'Required';
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(microsoftEmail))
			errors.microsoftEmail = 'Invalid email';
		if (!role)      errors.role      = 'Required';
		if (!country)   errors.country   = 'Required';

		if (Object.keys(errors).length > 0) return fail(400, { editErrors: errors });

		const [emp] = await db.select().from(employee)
			.where(and(eq(employee.id, params.id), eq(employee.organizationId, orgId)));
		if (!emp) error(404, 'Employee not found');

		const becameTerminated = status === 'terminated' && emp.status !== 'terminated';

		await db.update(employee)
			.set({ firstName, lastName, microsoftEmail, personalEmail, tempPassword, role, country, address, startDate, status, updatedAt: new Date() })
			.where(and(eq(employee.id, params.id), eq(employee.organizationId, orgId)));

		await ensureRoles(orgId, [role]);

		await audit.log({
			action: 'employee.updated',
			organizationId: orgId,
			subjectType: 'employee',
			subjectId: params.id,
			subjectLabel: `${firstName} ${lastName}`,
			actorId: locals.user!.id,
			actorLabel: locals.user!.name,
			metadata: { role, country, status }
		});

		// Terminations are derived from employee status now (see /terminations) —
		// no separate record to create, just record the transition.
		if (becameTerminated) {
			await audit.log({
				action: 'employee.terminated',
				organizationId: orgId,
				subjectType: 'employee',
				subjectId: params.id,
				subjectLabel: `${firstName} ${lastName}`,
				actorId: locals.user!.id,
				actorLabel: locals.user!.name
			});
		}

		return { updateSuccess: true };
	},

	assign: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const workstationId = data.get('workstationId')?.toString() ?? '';
		if (!workstationId) return fail(400, { assignError: 'Select a workstation' });

		const [ws] = await db.select().from(workstation)
			.where(and(eq(workstation.id, workstationId), eq(workstation.organizationId, orgId)));
		if (!ws) return fail(400, { assignError: 'Workstation not found' });
		if (ws.status === 'retired') return fail(400, { assignError: 'Cannot assign a retired workstation' });

		const [emp] = await db.select().from(employee)
			.where(and(eq(employee.id, params.id), eq(employee.organizationId, orgId)));
		if (!emp) error(404, 'Employee not found');

		const isReassign = ws.status === 'assigned' && ws.assignedEmployeeId && ws.assignedEmployeeId !== params.id;
		let prevEmp: typeof emp | undefined;

		if (isReassign && ws.assignedEmployeeId) {
			[prevEmp] = await db.select().from(employee).where(eq(employee.id, ws.assignedEmployeeId));

			await db.update(workstationAssignment)
				.set({ unassignedAt: new Date() })
				.where(and(
					eq(workstationAssignment.workstationId, workstationId),
					eq(workstationAssignment.employeeId, ws.assignedEmployeeId),
					isNull(workstationAssignment.unassignedAt)
				));
		}

		await db.update(workstation)
			.set({ assignedEmployeeId: params.id, status: 'assigned', updatedAt: new Date() })
			.where(eq(workstation.id, workstationId));

		await db.insert(workstationAssignment).values({ workstationId, employeeId: params.id });

		const today = new Date().toISOString().split('T')[0];

		if (isReassign && prevEmp) {
			await db.update(workstationTimeline)
				.set({ endAt: today })
				.where(and(
					eq(workstationTimeline.workstationId, workstationId),
					eq(workstationTimeline.employeeId, prevEmp.id),
					isNull(workstationTimeline.endAt)
				));
		}
		await db.insert(workstationTimeline).values({ workstationId, employeeId: params.id, startAt: today });

		if (isReassign && prevEmp) {
			await audit.log({
				action: 'workstation.reassigned',
				organizationId: orgId,
				subjectType: 'workstation',
				subjectId: ws.id,
				subjectLabel: `${ws.make} ${ws.model} (${ws.serialNumber})`,
				actorId: locals.user!.id,
				actorLabel: locals.user!.name,
				metadata: {
					from: { id: prevEmp.id, label: `${prevEmp.firstName} ${prevEmp.lastName}` },
					to:   { id: params.id,  label: `${emp.firstName} ${emp.lastName}` }
				}
			});
			await audit.log({ action: 'workstation.unassigned', organizationId: orgId, subjectType: 'employee', subjectId: prevEmp.id, subjectLabel: `${prevEmp.firstName} ${prevEmp.lastName}`, actorId: locals.user!.id, actorLabel: locals.user!.name, metadata: { related: { type: 'workstation', id: ws.id, label: `${ws.make} ${ws.model} (${ws.serialNumber})` } } });
			await audit.log({ action: 'workstation.assigned', organizationId: orgId, subjectType: 'employee', subjectId: params.id, subjectLabel: `${emp.firstName} ${emp.lastName}`, actorId: locals.user!.id, actorLabel: locals.user!.name, metadata: { related: { type: 'workstation', id: ws.id, label: `${ws.make} ${ws.model} (${ws.serialNumber})` } } });
		} else {
			await audit.logBoth({
				action: 'workstation.assigned',
				organizationId: orgId,
				primary: { type: 'workstation', id: ws.id, label: `${ws.make} ${ws.model} (${ws.serialNumber})` },
				related: { type: 'employee', id: params.id, label: `${emp.firstName} ${emp.lastName}` },
				actorId: locals.user!.id,
				actorLabel: locals.user!.name
			});
		}

		return { success: true };
	},

	unassign: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const workstationId = data.get('workstationId')?.toString() ?? '';
		if (!workstationId) return fail(400);

		const [ws] = await db.select().from(workstation)
			.where(and(eq(workstation.id, workstationId), eq(workstation.organizationId, orgId)));
		if (!ws) return fail(400);

		const [emp] = await db.select().from(employee)
			.where(and(eq(employee.id, params.id), eq(employee.organizationId, orgId)));
		if (!emp) error(404, 'Employee not found');

		await db.update(workstation)
			.set({ assignedEmployeeId: null, status: 'available', updatedAt: new Date() })
			.where(eq(workstation.id, workstationId));

		await db.update(workstationAssignment)
			.set({ unassignedAt: new Date() })
			.where(and(
				eq(workstationAssignment.workstationId, workstationId),
				eq(workstationAssignment.employeeId, params.id),
				isNull(workstationAssignment.unassignedAt)
			));

		await db.update(workstationTimeline)
			.set({ endAt: new Date().toISOString().split('T')[0] })
			.where(and(
				eq(workstationTimeline.workstationId, workstationId),
				eq(workstationTimeline.employeeId, params.id),
				isNull(workstationTimeline.endAt)
			));

		await audit.logBoth({
			action: 'workstation.unassigned',
			organizationId: orgId,
			primary: { type: 'workstation', id: ws.id, label: `${ws.make} ${ws.model} (${ws.serialNumber})` },
			related: { type: 'employee', id: params.id, label: `${emp.firstName} ${emp.lastName}` },
			actorId: locals.user!.id,
			actorLabel: locals.user!.name
		});

		return { success: true };
	},

	toggleTask: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const assignmentId = data.get('assignmentId')?.toString() ?? '';
		const templateItemId = data.get('templateItemId')?.toString() ?? '';
		const completing = data.get('completing') === 'true';

		const [assignment] = await db.select().from(checklistAssignment)
			.where(and(eq(checklistAssignment.id, assignmentId), eq(checklistAssignment.employeeId, params.id)));
		if (!assignment) return fail(404);

		if (completing) {
			await db.insert(checklistCompletion).values({
				assignmentId,
				templateItemId,
				completedByLabel: locals.user?.name
			}).onConflictDoNothing();
		} else {
			await db.delete(checklistCompletion).where(
				and(
					eq(checklistCompletion.assignmentId, assignmentId),
					eq(checklistCompletion.templateItemId, templateItemId)
				)
			);
		}

		return { success: true };
	}
};
