import { db } from '$lib/server/db';
import { employee } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const employees = await db
		.select()
		.from(employee)
		.where(eq(employee.organizationId, locals.organizationId!))
		.orderBy(desc(employee.createdAt));
	return { employees };
};
