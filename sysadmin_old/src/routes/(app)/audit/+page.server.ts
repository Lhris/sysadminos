import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const events = await db
		.select()
		.from(auditLog)
		.where(eq(auditLog.organizationId, locals.organizationId!))
		.orderBy(desc(auditLog.createdAt));
	return { events };
};
