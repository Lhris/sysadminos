import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, organization, member, invitation } from '$lib/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.isDev) redirect(302, '/dashboard');

    const [users, organizations, allMembers, invitations] = await Promise.all([
        db
            .select({
                id: user.id,
                name: user.name,
                email: user.email,
                isDev: user.isDev,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt
            })
            .from(user)
            .orderBy(desc(user.createdAt)),

        db
            .select({ id: organization.id, name: organization.name, slug: organization.slug, createdAt: organization.createdAt })
            .from(organization)
            .orderBy(desc(organization.createdAt)),

        db
            .select({
                id: member.id,
                userId: member.userId,
                organizationId: member.organizationId,
                role: member.role,
                userName: user.name,
                userEmail: user.email,
                orgName: organization.name
            })
            .from(member)
            .innerJoin(user, eq(member.userId, user.id))
            .innerJoin(organization, eq(member.organizationId, organization.id)),

        db
            .select({
                id: invitation.id,
                email: invitation.email,
                name: invitation.name,
                role: invitation.role,
                status: invitation.status,
                expiresAt: invitation.expiresAt,
                createdAt: invitation.createdAt,
                organizationId: invitation.organizationId,
                orgName: organization.name
            })
            .from(invitation)
            .innerJoin(organization, eq(invitation.organizationId, organization.id))
            .orderBy(desc(invitation.createdAt))
    ]);

    return { users, organizations, allMembers, invitations };
};

export const actions: Actions = {
    updateUser: async ({ request, locals }) => {
        if (!locals.isDev) return fail(403);
        const data = await request.formData();
        const userId = data.get('userId') as string;
        const name = (data.get('name') as string)?.trim();
        const emailVerified = data.get('emailVerified') === 'true';
        const isDev = data.get('isDev') === 'true';
        const addMembers: { orgId: string; role: string }[] = JSON.parse(data.get('addMembers') as string || '[]');
        const removeMembers: string[] = JSON.parse(data.get('removeMembers') as string || '[]');
        const updateMembers: { id: string; role: string }[] = JSON.parse(data.get('updateMembers') as string || '[]');

        await db.update(user).set({ name, emailVerified, isDev }).where(eq(user.id, userId));

        for (const { orgId, role } of addMembers) {
            await db.insert(member).values({
                id: crypto.randomUUID(),
                userId,
                organizationId: orgId,
                role,
                createdAt: new Date()
            });
        }

        for (const memberId of removeMembers) {
            await db.delete(member).where(eq(member.id, memberId));
        }

        for (const { id, role } of updateMembers) {
            await db.update(member).set({ role }).where(eq(member.id, id));
        }
    },

    createOrg: async ({ request, locals }) => {
        if (!locals.isDev) return fail(403);
        const data = await request.formData();
        const name = (data.get('name') as string)?.trim();
        if (!name) return fail(400, { createOrgError: 'Name is required' });

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        try {
            await auth.api.createOrganization({
                body: { name, slug },
                headers: request.headers
            });
        } catch (e: any) {
            return fail(400, { createOrgError: e?.message ?? 'Failed to create organization' });
        }
    },

    addMember: async ({ request, locals }) => {
        if (!locals.isDev) return fail(403);
        const data = await request.formData();
        const userId = data.get('userId') as string;
        const organizationId = data.get('organizationId') as string;
        const role = (data.get('role') as string) ?? 'member';

        if (!userId || !organizationId) return fail(400, { addMemberError: 'Missing fields' });

        const existing = await db
            .select({ id: member.id })
            .from(member)
            .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
            .limit(1);

        if (existing.length > 0) return fail(400, { addMemberError: 'User is already a member' });

        await db.insert(member).values({
            id: crypto.randomUUID(),
            userId,
            organizationId,
            role,
            createdAt: new Date()
        });
    },

    updateMemberRole: async ({ request, locals }) => {
        if (!locals.isDev) return fail(403);
        const data = await request.formData();
        const memberId = data.get('memberId') as string;
        const role = data.get('role') as string;
        if (!memberId || !role) return fail(400);
        await db.update(member).set({ role }).where(eq(member.id, memberId));
    },

    removeMember: async ({ request, locals }) => {
        if (!locals.isDev) return fail(403);
        const data = await request.formData();
        const memberId = data.get('memberId') as string;
        await db.delete(member).where(eq(member.id, memberId));
    },

    invite: async ({ request, locals }) => {
        if (!locals.isDev) return fail(403);
        const data = await request.formData();
        const email = (data.get('email') as string)?.trim();
        const name = (data.get('name') as string)?.trim() || null;
        const role = (data.get('role') as string) ?? 'member';
        const organizationId = data.get('organizationId') as string;

        if (!email || !organizationId) return fail(400, { inviteError: 'Email and organization are required' });

        try {
            const result = await auth.api.createInvitation({
                body: { email, role, organizationId },
                headers: request.headers
            });
            if (name && result?.id) {
                await db.update(invitation).set({ name }).where(eq(invitation.id, result.id));
            }
        } catch (e: any) {
            return fail(400, { inviteError: e?.message ?? 'Failed to send invite' });
        }
    },

    cancelInvite: async ({ request, locals }) => {
        if (!locals.isDev) return fail(403);
        const data = await request.formData();
        const invitationId = data.get('invitationId') as string;
        await db.update(invitation).set({ status: 'cancelled' }).where(eq(invitation.id, invitationId));
    }
};
