import { db } from './db';
import { auditLog } from './db/schema';

interface Entity {
	type: string;
	id: string;
	label: string;
}

interface LogParams {
	action: string;
	organizationId: string;
	entityType: string;
	entityId: string;
	entityLabel: string;
	actorId?: string;
	actorLabel?: string;
	metadata?: Record<string, unknown>;
}

interface LogBothParams {
	action: string;
	organizationId: string;
	primary: Entity;
	related: Entity;
	actorId?: string;
	actorLabel?: string;
	metadata?: Record<string, unknown>;
}

// Single-entity event. Use for creates, deletes, and updates that
// only concern one entity (e.g. employee.created, order.fulfilled).
export async function log(params: LogParams) {
	await db.insert(auditLog).values({
		action: params.action,
		organizationId: params.organizationId,
		entityType: params.entityType,
		entityId: params.entityId,
		entityLabel: params.entityLabel,
		actorId: params.actorId ?? null,
		actorLabel: params.actorLabel ?? null,
		metadata: params.metadata ? JSON.stringify(params.metadata) : null
	});
}

// Cross-entity event. Inserts two rows in one call so both entities'
// activity feeds show the event. Each row stores the other side in metadata.
//
// Usage:
//   await audit.logBoth({
//     action: 'workstation.assigned',
//     primary: { type: 'workstation', id: ws.id, label: 'WS-047' },
//     related: { type: 'employee',    id: emp.id, label: 'Alex Rivera' },
//     metadata: { previousEmployee: 'Jordan Kim' }
//   });
//
// Result:
//   row 1 — entityId=ws.id,  metadata.related = { type:'employee', id, label }
//   row 2 — entityId=emp.id, metadata.related = { type:'workstation', id, label }
export async function logBoth(params: LogBothParams) {
	const { action, organizationId, primary, related, actorId, actorLabel, metadata } = params;

	await db.insert(auditLog).values([
		{
			action,
			organizationId,
			entityType: primary.type,
			entityId: primary.id,
			entityLabel: primary.label,
			actorId: actorId ?? null,
			actorLabel: actorLabel ?? null,
			metadata: JSON.stringify({
				...metadata,
				related: { type: related.type, id: related.id, label: related.label }
			})
		},
		{
			action,
			organizationId,
			entityType: related.type,
			entityId: related.id,
			entityLabel: related.label,
			actorId: actorId ?? null,
			actorLabel: actorLabel ?? null,
			metadata: JSON.stringify({
				...metadata,
				related: { type: primary.type, id: primary.id, label: primary.label }
			})
		}
	]);
}
