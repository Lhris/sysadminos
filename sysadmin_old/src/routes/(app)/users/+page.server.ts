import { db } from '$lib/server/db';
import { member, user, invitation } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireOwner } from '$lib/server/auth-guard';
import { fail } from '@sveltejs/kit';
import * as audit from '$lib/server/audit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const members = await db
		.select({
			memberId: member.id,
			role: member.role,
			joinedAt: member.createdAt,
			userId: user.id,
			name: user.name,
			email: user.email
		})
		.from(member)
		.innerJoin(user, eq(member.userId, user.id))
		.where(eq(member.organizationId, locals.organizationId!));

	const pendingInvites = await db
		.select()
		.from(invitation)
		.where(
			and(
				eq(invitation.organizationId, locals.organizationId!),
				eq(invitation.status, 'pending')
			)
		);

	return { members, pendingInvites };
};

export const actions: Actions = {
	invite: async ({ request, locals }) => {
		requireOwner(locals.memberRole);

		const data = await request.formData();
		const email = data.get('email')?.toString().trim() ?? '';
		const role = data.get('role')?.toString() ?? 'view-only';

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { inviteError: 'Valid email required' });
		}

		const existing = await db
			.select({ id: member.id })
			.from(member)
			.innerJoin(user, eq(member.userId, user.id))
			.where(
				and(eq(member.organizationId, locals.organizationId!), eq(user.email, email))
			);

		if (existing.length > 0) {
			return fail(400, { inviteError: 'User is already a member' });
		}

		await db.insert(invitation).values({
			id: crypto.randomUUID(),
			organizationId: locals.organizationId!,
			email,
			role,
			status: 'pending',
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			inviterId: locals.user!.id
		});

		await audit.log({
			action: 'user.invited',
			organizationId: locals.organizationId!,
			entityType: 'user',
			entityId: email,
			entityLabel: email,
			actorId: locals.user!.id,
			actorLabel: locals.user!.name,
			metadata: { role }
		});
	},

	changeRole: async ({ request, locals }) => {
		requireOwner(locals.memberRole);

		const data = await request.formData();
		const memberId = data.get('memberId')?.toString() ?? '';
		const role = data.get('role')?.toString() ?? '';

		if (!memberId || !['owner', 'member', 'view-only'].includes(role)) {
			return fail(400, {});
		}

		const [target] = await db
			.select({ userId: member.userId })
			.from(member)
			.where(and(eq(member.id, memberId), eq(member.organizationId, locals.organizationId!)));

		if (!target) return fail(404, {});
		if (target.userId === locals.user!.id) return fail(400, { error: 'Cannot change your own role' });

		await db
			.update(member)
			.set({ role })
			.where(and(eq(member.id, memberId), eq(member.organizationId, locals.organizationId!)));

		await audit.log({
			action: 'user.roleChanged',
			organizationId: locals.organizationId!,
			entityType: 'user',
			entityId: target.userId,
			entityLabel: target.userId,
			actorId: locals.user!.id,
			actorLabel: locals.user!.name,
			metadata: { role }
		});
	},

	removeMember: async ({ request, locals }) => {
		requireOwner(locals.memberRole);

		const data = await request.formData();
		const memberId = data.get('memberId')?.toString() ?? '';

		if (!memberId) return fail(400, {});

		const [target] = await db
			.select({ userId: member.userId })
			.from(member)
			.where(and(eq(member.id, memberId), eq(member.organizationId, locals.organizationId!)));

		if (!target) return fail(404, {});
		if (target.userId === locals.user!.id) return fail(400, { error: 'Cannot remove yourself' });

		await db
			.delete(member)
			.where(and(eq(member.id, memberId), eq(member.organizationId, locals.organizationId!)));

		await audit.log({
			action: 'user.removed',
			organizationId: locals.organizationId!,
			entityType: 'user',
			entityId: target.userId,
			entityLabel: target.userId,
			actorId: locals.user!.id,
			actorLabel: locals.user!.name
		});
	},

	cancelInvite: async ({ request, locals }) => {
		requireOwner(locals.memberRole);

		const data = await request.formData();
		const inviteId = data.get('inviteId')?.toString() ?? '';

		if (!inviteId) return fail(400, {});

		await db
			.delete(invitation)
			.where(and(eq(invitation.id, inviteId), eq(invitation.organizationId, locals.organizationId!)));
	}
};
