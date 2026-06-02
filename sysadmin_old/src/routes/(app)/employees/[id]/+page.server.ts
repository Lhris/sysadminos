import { db } from '$lib/server/db';
import { employee, auditLog, workstation, workstationAssignment, workstationTimeline } from '$lib/server/db/schema';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import * as audit from '$lib/server/audit';
import { requireMember } from '$lib/server/auth-guard';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const orgId = locals.organizationId!;

	const [emp] = await db.select().from(employee)
		.where(and(eq(employee.id, params.id), eq(employee.organizationId, orgId)));
	if (!emp) error(404, 'Employee not found');

	const [events, allWorkstations] = await Promise.all([
		db.select().from(auditLog)
			.where(and(eq(auditLog.entityId, params.id), eq(auditLog.organizationId, orgId)))
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
		.where(eq(workstation.organizationId, orgId))
	]);

	return {
		employee: emp,
		events,
		workstations: allWorkstations.filter(w => w.assignedEmployeeId === params.id),
		assignable: allWorkstations.filter(w =>
			w.assignedEmployeeId !== params.id &&
			(w.status === 'available' || w.status === 'assigned')
		)
	};
};

export const actions: Actions = {
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
				entityType: 'workstation',
				entityId: ws.id,
				entityLabel: `${ws.make} ${ws.model} (${ws.serialNumber})`,
				actorId: locals.user!.id,
				actorLabel: locals.user!.name,
				metadata: {
					from: { id: prevEmp.id, label: `${prevEmp.firstName} ${prevEmp.lastName}` },
					to:   { id: params.id,  label: `${emp.firstName} ${emp.lastName}` }
				}
			});
			await audit.log({ action: 'workstation.unassigned', organizationId: orgId, entityType: 'employee', entityId: prevEmp.id, entityLabel: `${prevEmp.firstName} ${prevEmp.lastName}`, actorId: locals.user!.id, actorLabel: locals.user!.name, metadata: { related: { type: 'workstation', id: ws.id, label: `${ws.make} ${ws.model} (${ws.serialNumber})` } } });
			await audit.log({ action: 'workstation.assigned',   organizationId: orgId, entityType: 'employee', entityId: params.id,  entityLabel: `${emp.firstName} ${emp.lastName}`,         actorId: locals.user!.id, actorLabel: locals.user!.name, metadata: { related: { type: 'workstation', id: ws.id, label: `${ws.make} ${ws.model} (${ws.serialNumber})` } } });
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
	}
};
