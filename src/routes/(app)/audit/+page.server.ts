import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const organizationId = locals.organizationId;
	const subjectType = url.searchParams.get('subjectType') ?? null;

	const conditions = [];
	if (organizationId) conditions.push(eq(auditLog.organizationId, organizationId));
	if (subjectType) conditions.push(eq(auditLog.subjectType, subjectType));

	const logs = await db
		.select()
		.from(auditLog)
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(desc(auditLog.createdAt));

	return { logs, subjectType };
};
