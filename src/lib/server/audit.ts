import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { currentRequestContext } from '$lib/server/request-context';

interface LogParams {
	organizationId: string;
	action: string;
	subjectType: string;
	subjectId: string;
	subjectLabel: string;
	actorId?: string;
	actorLabel?: string;
	actorEmail?: string;
	ipAddress?: string;
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
	actorEmail?: string;
	ipAddress?: string;
	metadata?: Record<string, unknown>;
}

export async function log(params: LogParams) {
	const ctx = currentRequestContext();
	await db.insert(auditLog).values({
		organizationId: params.organizationId,
		action: params.action,
		subjectType: params.subjectType,
		subjectId: params.subjectId,
		subjectLabel: params.subjectLabel,
		actorId: params.actorId,
		actorLabel: params.actorLabel,
		actorEmail: params.actorEmail ?? ctx.email,
		ipAddress: params.ipAddress ?? ctx.ip,
		metadata: params.metadata ? JSON.stringify(params.metadata) : null
	});
}

// Inserts two rows so both subjects' feeds capture a cross-subject event.
// Each row embeds the *other* subject under metadata.related so a single row
// is self-describing (the audit feed can render "X → Y" from one row).
export async function logBoth(params: LogBothParams) {
	const ctx = currentRequestContext();
	const shared = {
		organizationId: params.organizationId,
		action: params.action,
		actorId: params.actorId,
		actorLabel: params.actorLabel,
		actorEmail: params.actorEmail ?? ctx.email,
		ipAddress: params.ipAddress ?? ctx.ip
	};

	await db.insert(auditLog).values([
		{
			...shared,
			subjectType: params.primary.type,
			subjectId: params.primary.id,
			subjectLabel: params.primary.label,
			metadata: JSON.stringify({ ...params.metadata, related: params.related })
		},
		{
			...shared,
			subjectType: params.related.type,
			subjectId: params.related.id,
			subjectLabel: params.related.label,
			metadata: JSON.stringify({ ...params.metadata, related: params.primary })
		}
	]);
}
