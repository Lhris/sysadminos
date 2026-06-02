import { db } from '$lib/server/db';
import { invitation, organization } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    const [inv] = await db
        .select({
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
            orgName: organization.name,
            organizationId: invitation.organizationId
        })
        .from(invitation)
        .innerJoin(organization, eq(invitation.organizationId, organization.id))
        .where(eq(invitation.id, params.id))
        .limit(1);

    return {
        invitation: inv ?? null,
        user: locals.user ?? null
    };
};
