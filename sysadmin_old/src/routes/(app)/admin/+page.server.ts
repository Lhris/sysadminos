import { db } from '$lib/server/db';
import { organization, member, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireSuperAdmin } from '$lib/server/auth-guard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireSuperAdmin(locals.isAdmin);

	const orgs = await db
		.select({ id: organization.id, name: organization.name, slug: organization.slug, createdAt: organization.createdAt })
		.from(organization);

	const members = await db
		.select({
			orgId: member.organizationId,
			memberId: member.id,
			role: member.role,
			joinedAt: member.createdAt,
			userId: user.id,
			name: user.name,
			email: user.email,
			isAdmin: user.isAdmin
		})
		.from(member)
		.innerJoin(user, eq(member.userId, user.id));

	const membersByOrg = members.reduce<Record<string, typeof members>>(
		(acc, m) => {
			(acc[m.orgId] ??= []).push(m);
			return acc;
		},
		{}
	);

	return {
		orgs: orgs.map((org) => ({
			...org,
			members: membersByOrg[org.id] ?? []
		})),
		totalUsers: new Set(members.map((m) => m.userId)).size
	};
};
