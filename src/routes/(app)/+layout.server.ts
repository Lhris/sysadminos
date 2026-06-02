import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { member, organization } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
    if (!locals.user) redirect(302, '/login');

    const organizations = await db
        .select({ id: organization.id, name: organization.name })
        .from(member)
        .innerJoin(organization, eq(member.organizationId, organization.id))
        .where(eq(member.userId, locals.user.id));

    return {
        user: locals.user,
        memberRole: locals.memberRole,
        isDev: locals.isDev ?? false,
        organizationId: locals.organizationId,
        organizations
    };
};
