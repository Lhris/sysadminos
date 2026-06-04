import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';

interface LogParams {
	organizationId: string;
	action: string;
	subjectType: string;
	subjectId: string;
	subjectLabel: string;
	actorId?: string;
	actorLabel?: string;
	metadata?: Record<string, unknown>;
}

interface Subject {
	type: string;
	id: string;
	label: string;
}

interface LogBothParams {
	organizationId: string;
	action: string;
	primary: Subject;
	related: Subject;
	actorId?: string;
	actorLabel?: string;
	metadata?: Record<string, unknown>;
}

export async function log(params: LogParams) {
	await db.insert(auditLog).values({
		organizationId: params.organizationId,
		action: params.action,
		subjectType: params.subjectType,
		subjectId: params.subjectId,
		subjectLabel: params.subjectLabel,
		actorId: params.actorId,
		actorLabel: params.actorLabel,
		metadata: params.metadata ? JSON.stringify(params.metadata) : null
	});
}

// Inserts two rows so both subjects' feeds capture a cross-subject event.
export async function logBoth(params: LogBothParams) {
	const shared = {
		organizationId: params.organizationId,
		action: params.action,
		actorId: params.actorId,
		actorLabel: params.actorLabel,
		metadata: params.metadata ? JSON.stringify(params.metadata) : null
	};

	await db.insert(auditLog).values([
		{
			...shared,
			subjectType: params.primary.type,
			subjectId: params.primary.id,
			subjectLabel: params.primary.label
		},
		{
			...shared,
			subjectType: params.related.type,
			subjectId: params.related.id,
			subjectLabel: params.related.label
		}
	]);
}
