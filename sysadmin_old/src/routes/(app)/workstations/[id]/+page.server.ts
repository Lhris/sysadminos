import { db } from '$lib/server/db';
import { workstation, employee, auditLog, workstationAssignment, workstationTimeline, note } from '$lib/server/db/schema';
import { eq, asc, desc, and, isNull } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import * as audit from '$lib/server/audit';
import { requireMember } from '$lib/server/auth-guard';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const orgId = locals.organizationId!;

	const [ws] = await db
		.select({
			id: workstation.id,
			serialNumber: workstation.serialNumber,
			make: workstation.make,
			model: workstation.model,
			deviceType: workstation.deviceType,
			os: workstation.os,
			cpu: workstation.cpu,
			ram: workstation.ram,
			orderDate: workstation.orderDate,
			warrantyExpiry: workstation.warrantyExpiry,
			location: workstation.location,
			status: workstation.status,
			notes: workstation.notes,
			assignedEmployeeId: workstation.assignedEmployeeId,
			assignedEmployeeFirstName: employee.firstName,
			assignedEmployeeLastName: employee.lastName
		})
		.from(workstation)
		.leftJoin(employee, eq(workstation.assignedEmployeeId, employee.id))
		.where(and(eq(workstation.id, params.id), eq(workstation.organizationId, orgId)));

	if (!ws) error(404, 'Workstation not found');

	const [timeline, notes, events, employees] = await Promise.all([
		db.select({
			id: workstationTimeline.id,
			employeeId: workstationTimeline.employeeId,
			label: workstationTimeline.label,
			startAt: workstationTimeline.startAt,
			endAt: workstationTimeline.endAt,
			employeeFirstName: employee.firstName,
			employeeLastName: employee.lastName
		})
		.from(workstationTimeline)
		.leftJoin(employee, eq(workstationTimeline.employeeId, employee.id))
		.where(eq(workstationTimeline.workstationId, params.id))
		.orderBy(asc(workstationTimeline.startAt), asc(workstationTimeline.createdAt)),
		db.select().from(note)
			.where(and(eq(note.entityType, 'workstation'), eq(note.entityId, params.id)))
			.orderBy(desc(note.createdAt)),
		db.select().from(auditLog)
			.where(and(eq(auditLog.entityId, params.id), eq(auditLog.organizationId, orgId)))
			.orderBy(desc(auditLog.createdAt)),
		db.select({ id: employee.id, firstName: employee.firstName, lastName: employee.lastName })
			.from(employee)
			.where(eq(employee.organizationId, orgId))
	]);

	return { workstation: ws, timeline, notes, events, employees };
};

export const actions: Actions = {
	assign: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const employeeId = data.get('employeeId')?.toString() ?? '';
		if (!employeeId) return fail(400, { assignError: 'Select an employee' });

		const [ws] = await db.select().from(workstation)
			.where(and(eq(workstation.id, params.id), eq(workstation.organizationId, orgId)));
		if (!ws) error(404, 'Workstation not found');
		if (ws.status === 'retired') return fail(400, { assignError: 'Cannot assign a retired workstation' });

		const [emp] = await db.select().from(employee)
			.where(and(eq(employee.id, employeeId), eq(employee.organizationId, orgId)));
		if (!emp) return fail(400, { assignError: 'Employee not found' });

		const isReassign = ws.status === 'assigned' && ws.assignedEmployeeId && ws.assignedEmployeeId !== employeeId;
		let prevEmp: typeof emp | undefined;

		if (isReassign && ws.assignedEmployeeId) {
			[prevEmp] = await db.select().from(employee).where(eq(employee.id, ws.assignedEmployeeId));

			await db.update(workstationAssignment)
				.set({ unassignedAt: new Date() })
				.where(and(
					eq(workstationAssignment.workstationId, params.id),
					eq(workstationAssignment.employeeId, ws.assignedEmployeeId),
					isNull(workstationAssignment.unassignedAt)
				));
		}

		await db.update(workstation)
			.set({ assignedEmployeeId: employeeId, status: 'assigned', updatedAt: new Date() })
			.where(eq(workstation.id, params.id));

		await db.insert(workstationAssignment).values({ workstationId: params.id, employeeId });

		const today = new Date().toISOString().split('T')[0];

		if (isReassign && prevEmp) {
			await db.update(workstationTimeline)
				.set({ endAt: today })
				.where(and(
					eq(workstationTimeline.workstationId, params.id),
					eq(workstationTimeline.employeeId, prevEmp.id),
					isNull(workstationTimeline.endAt)
				));
		}
		await db.insert(workstationTimeline).values({ workstationId: params.id, employeeId, startAt: today });

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
					to:   { id: emp.id,     label: `${emp.firstName} ${emp.lastName}` }
				}
			});
			await audit.log({ action: 'workstation.unassigned', organizationId: orgId, entityType: 'employee', entityId: prevEmp.id, entityLabel: `${prevEmp.firstName} ${prevEmp.lastName}`, actorId: locals.user!.id, actorLabel: locals.user!.name, metadata: { related: { type: 'workstation', id: ws.id, label: `${ws.make} ${ws.model} (${ws.serialNumber})` } } });
			await audit.log({ action: 'workstation.assigned',   organizationId: orgId, entityType: 'employee', entityId: emp.id,     entityLabel: `${emp.firstName} ${emp.lastName}`,         actorId: locals.user!.id, actorLabel: locals.user!.name, metadata: { related: { type: 'workstation', id: ws.id, label: `${ws.make} ${ws.model} (${ws.serialNumber})` } } });
		} else {
			await audit.logBoth({
				action: 'workstation.assigned',
				organizationId: orgId,
				primary: { type: 'workstation', id: ws.id, label: `${ws.make} ${ws.model} (${ws.serialNumber})` },
				related: { type: 'employee', id: emp.id, label: `${emp.firstName} ${emp.lastName}` },
				actorId: locals.user!.id,
				actorLabel: locals.user!.name
			});
		}

		return { success: true };
	},

	unassign: async ({ params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const [ws] = await db.select().from(workstation)
			.where(and(eq(workstation.id, params.id), eq(workstation.organizationId, orgId)));
		if (!ws) error(404, 'Workstation not found');
		if (!ws.assignedEmployeeId) return fail(400);

		const [emp] = await db.select().from(employee).where(eq(employee.id, ws.assignedEmployeeId));

		await db.update(workstation)
			.set({ assignedEmployeeId: null, status: 'available', updatedAt: new Date() })
			.where(eq(workstation.id, params.id));

		await db.update(workstationAssignment)
			.set({ unassignedAt: new Date() })
			.where(and(
				eq(workstationAssignment.workstationId, params.id),
				eq(workstationAssignment.employeeId, ws.assignedEmployeeId),
				isNull(workstationAssignment.unassignedAt)
			));

		await db.update(workstationTimeline)
			.set({ endAt: new Date().toISOString().split('T')[0] })
			.where(and(
				eq(workstationTimeline.workstationId, params.id),
				eq(workstationTimeline.employeeId, ws.assignedEmployeeId),
				isNull(workstationTimeline.endAt)
			));

		if (emp) {
			await audit.logBoth({
				action: 'workstation.unassigned',
				organizationId: orgId,
				primary: { type: 'workstation', id: ws.id, label: `${ws.make} ${ws.model} (${ws.serialNumber})` },
				related: { type: 'employee', id: emp.id, label: `${emp.firstName} ${emp.lastName}` },
				actorId: locals.user!.id,
				actorLabel: locals.user!.name
			});
		}

		return { success: true };
	},

	addEntry: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const employeeId = data.get('employeeId')?.toString() || null;
		const label = data.get('label')?.toString().trim() || null;
		const startAt = data.get('startAt')?.toString() || null;
		const endAt = data.get('endAt')?.toString() || null;
		if (!employeeId && !label) return fail(400, { entryError: 'Select an employee or enter a label' });

		// Verify employee belongs to org if provided
		if (employeeId) {
			const [emp] = await db.select({ id: employee.id }).from(employee)
				.where(and(eq(employee.id, employeeId), eq(employee.organizationId, orgId)));
			if (!emp) return fail(400, { entryError: 'Employee not found' });
		}

		await db.insert(workstationTimeline).values({ workstationId: params.id, employeeId, label, startAt, endAt });
		return { success: true };
	},

	updateEntry: async ({ request, locals }) => {
		requireMember(locals.memberRole);

		const data = await request.formData();
		const id = data.get('id')?.toString() ?? '';
		const employeeId = data.get('employeeId')?.toString() || null;
		const label = data.get('label')?.toString().trim() || null;
		const startAt = data.get('startAt')?.toString() || null;
		const endAt = data.get('endAt')?.toString() || null;
		await db.update(workstationTimeline).set({ employeeId, label, startAt, endAt }).where(eq(workstationTimeline.id, id));
		return { success: true };
	},

	deleteEntry: async ({ request, locals }) => {
		requireMember(locals.memberRole);

		const data = await request.formData();
		const id = data.get('id')?.toString() ?? '';
		await db.delete(workstationTimeline).where(eq(workstationTimeline.id, id));
		return { success: true };
	},

	addNote: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);

		const data = await request.formData();
		const body = data.get('body')?.toString().trim() ?? '';
		if (!body) return fail(400, { noteError: 'Note cannot be empty' });

		await db.insert(note).values({
			entityType: 'workstation',
			entityId: params.id,
			body,
			authorLabel: locals.user!.name
		});
		return { success: true };
	},

	update: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const fd = await request.formData();
		const g = (k: string) => fd.get(k)?.toString().trim() ?? '';
		const opt = (k: string) => fd.get(k)?.toString().trim() || null;

		const serialNumber = g('serialNumber');
		const make        = g('make');
		const model       = g('model');
		const deviceType  = g('deviceType') as 'laptop' | 'desktop' | 'monitor' | 'other';
		const newStatus   = g('status') as 'available' | 'assigned' | 'in_repair' | 'flagged' | 'retired';
		const os             = opt('os');
		const cpu            = opt('cpu');
		const ram            = opt('ram');
		const location       = opt('location');
		const orderDate      = opt('orderDate');
		const warrantyExpiry = opt('warrantyExpiry');
		const notes          = opt('notes');

		const validDeviceTypes = ['laptop', 'desktop', 'monitor', 'other'];
		const validStatuses    = ['available', 'assigned', 'in_repair', 'flagged', 'retired'];
		if (!serialNumber || !make || !model || !validDeviceTypes.includes(deviceType))
			return fail(400, { updateError: 'Serial number, make, model, and type are required' });
		if (!validStatuses.includes(newStatus))
			return fail(400, { updateError: 'Invalid status' });

		const [ws] = await db.select().from(workstation)
			.where(and(eq(workstation.id, params.id), eq(workstation.organizationId, orgId)));
		if (!ws) error(404, 'Workstation not found');

		if (ws.status === 'assigned' && newStatus !== 'assigned' && ws.assignedEmployeeId) {
			await db.update(workstationAssignment)
				.set({ unassignedAt: new Date() })
				.where(and(
					eq(workstationAssignment.workstationId, params.id),
					eq(workstationAssignment.employeeId, ws.assignedEmployeeId),
					isNull(workstationAssignment.unassignedAt)
				));
			await db.update(workstationTimeline)
				.set({ endAt: new Date().toISOString().split('T')[0] })
				.where(and(
					eq(workstationTimeline.workstationId, params.id),
					eq(workstationTimeline.employeeId, ws.assignedEmployeeId),
					isNull(workstationTimeline.endAt)
				));
			await db.update(workstation)
				.set({ assignedEmployeeId: null })
				.where(eq(workstation.id, params.id));
		}

		await db.update(workstation)
			.set({ serialNumber, make, model, deviceType, status: newStatus, os, cpu, ram, location, orderDate, warrantyExpiry, notes, updatedAt: new Date() })
			.where(eq(workstation.id, params.id));

		const statusChanged = ws.status !== newStatus;
		await audit.log({
			action: statusChanged ? 'workstation.status_changed' : 'workstation.updated',
			organizationId: orgId,
			entityType: 'workstation',
			entityId: ws.id,
			entityLabel: `${make} ${model} (${serialNumber})`,
			actorId: locals.user!.id,
			actorLabel: locals.user!.name,
			metadata: statusChanged ? { from: ws.status, to: newStatus } : undefined
		});

		return { success: true };
	}
};
