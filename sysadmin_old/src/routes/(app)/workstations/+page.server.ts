import { db } from '$lib/server/db';
import { workstation, employee, workstationAssignment, workstationTimeline } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import * as audit from '$lib/server/audit';
import { requireMember } from '$lib/server/auth-guard';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const orgId = locals.organizationId!;

	const workstations = await db
		.select({
			id: workstation.id,
			serialNumber: workstation.serialNumber,
			make: workstation.make,
			model: workstation.model,
			deviceType: workstation.deviceType,
			os: workstation.os,
			cpu: workstation.cpu,
			ram: workstation.ram,
			location: workstation.location,
			status: workstation.status,
			assignedEmployeeId: workstation.assignedEmployeeId,
			assignedEmployeeName: employee.firstName,
			assignedEmployeeLastName: employee.lastName
		})
		.from(workstation)
		.leftJoin(employee, eq(workstation.assignedEmployeeId, employee.id))
		.where(eq(workstation.organizationId, orgId))
		.orderBy(workstation.serialNumber);

	return { workstations };
};

export const actions: Actions = {
	setStatus: async ({ request, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const id = data.get('id')?.toString() ?? '';
		const newStatus = data.get('status')?.toString() as 'available' | 'assigned' | 'in_repair' | 'flagged' | 'retired' | undefined;
		const validStatuses = ['available', 'assigned', 'in_repair', 'flagged', 'retired'];
		if (!id || !newStatus || !validStatuses.includes(newStatus)) return fail(400);

		const [ws] = await db.select().from(workstation)
			.where(and(eq(workstation.id, id), eq(workstation.organizationId, orgId)));
		if (!ws) error(404, 'Workstation not found');
		if (ws.status === newStatus) return { success: true };

		const updates: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };

		if (ws.status === 'assigned' && newStatus !== 'assigned' && ws.assignedEmployeeId) {
			updates.assignedEmployeeId = null;

			await db.update(workstationAssignment)
				.set({ unassignedAt: new Date() })
				.where(and(
					eq(workstationAssignment.workstationId, id),
					eq(workstationAssignment.employeeId, ws.assignedEmployeeId),
					isNull(workstationAssignment.unassignedAt)
				));

			await db.update(workstationTimeline)
				.set({ endAt: new Date().toISOString().split('T')[0] })
				.where(and(
					eq(workstationTimeline.workstationId, id),
					eq(workstationTimeline.employeeId, ws.assignedEmployeeId),
					isNull(workstationTimeline.endAt)
				));
		}

		await db.update(workstation).set(updates).where(eq(workstation.id, id));

		await audit.log({
			action: 'workstation.status_changed',
			organizationId: orgId,
			entityType: 'workstation',
			entityId: ws.id,
			entityLabel: `${ws.make} ${ws.model} (${ws.serialNumber})`,
			actorId: locals.user!.id,
			actorLabel: locals.user!.name,
			metadata: { from: ws.status, to: newStatus }
		});

		return { success: true };
	}
};
