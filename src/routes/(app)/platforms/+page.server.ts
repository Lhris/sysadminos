import { db } from '$lib/server/db';
import { platform, platformLicense } from '$lib/server/db/schema';
import { eq, asc, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { requireMember } from '$lib/server/auth-guard';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const orgId = locals.organizationId!;

	const platforms = await db
		.select()
		.from(platform)
		.where(eq(platform.organizationId, orgId))
		.orderBy(asc(platform.name));

	const counts = await db
		.select({
			platformId: platformLicense.platformId,
			total: sql<number>`count(*)`.mapWith(Number),
			active: sql<number>`count(*) filter (where ${platformLicense.removedAt} is null)`.mapWith(Number),
			removed: sql<number>`count(*) filter (where ${platformLicense.removedAt} is not null)`.mapWith(Number),
			unlinked: sql<number>`count(*) filter (where ${platformLicense.employeeId} is null and ${platformLicense.removedAt} is null)`.mapWith(Number)
		})
		.from(platformLicense)
		.innerJoin(platform, eq(platformLicense.platformId, platform.id))
		.where(eq(platform.organizationId, orgId))
		.groupBy(platformLicense.platformId);

	const countMap = new Map(counts.map((c) => [c.platformId, c]));

	return {
		platforms: platforms.map((p) => ({
			...p,
			licenseCount: countMap.get(p.id)?.total ?? 0,
			activeCount: countMap.get(p.id)?.active ?? 0,
			removedCount: countMap.get(p.id)?.removed ?? 0,
			unlinkedCount: countMap.get(p.id)?.unlinked ?? 0
		}))
	};
};

export const actions: Actions = {
	addPlatform: async ({ request, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		const description = data.get('description')?.toString().trim() || null;
		if (!name) return fail(400, { addError: 'Name is required' });

		await db.insert(platform).values({ organizationId: orgId, name, description });
		return { success: true };
	}
};
