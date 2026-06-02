import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db';
import { member, user } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;

		const [dbUser] = await db
			.select({ isAdmin: user.isAdmin })
			.from(user)
			.where(eq(user.id, session.user.id));
		event.locals.isAdmin = dbUser?.isAdmin ?? false;

		const activeOrgId = (session.session as Record<string, unknown>).activeOrganizationId as string | undefined;

		if (activeOrgId) {
			const [m] = await db
				.select({ role: member.role })
				.from(member)
				.where(and(eq(member.organizationId, activeOrgId), eq(member.userId, session.user.id)));

			if (m) {
				event.locals.organizationId = activeOrgId;
				event.locals.memberRole = m.role as 'owner' | 'member' | 'view-only';
			}
		}

		// Auto-select the first available org when no active org is set
		if (!event.locals.organizationId) {
			const [first] = await db
				.select({ organizationId: member.organizationId, role: member.role })
				.from(member)
				.where(eq(member.userId, session.user.id))
				.limit(1);

			if (first) {
				event.locals.organizationId = first.organizationId;
				event.locals.memberRole = first.role as 'owner' | 'member' | 'view-only';
			}
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
