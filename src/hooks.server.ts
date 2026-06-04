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

		const [u] = await db
			.select({ isDev: user.isDev })
			.from(user)
			.where(eq(user.id, session.user.id))
			.limit(1);

		event.locals.isDev = u?.isDev ?? false;

		let orgId = session.session.activeOrganizationId;

		if (!orgId) {
			const [firstMembership] = await db
				.select({ organizationId: member.organizationId })
				.from(member)
				.where(eq(member.userId, session.user.id))
				.limit(1);

			if (firstMembership) {
				orgId = firstMembership.organizationId;
				await auth.api.setActiveOrganization({
					headers: event.request.headers,
					body: { organizationId: orgId }
				});
			}
		}

		if (orgId) {
			event.locals.organizationId = orgId;

			const [m] = await db
				.select({ role: member.role })
				.from(member)
				.where(and(eq(member.userId, session.user.id), eq(member.organizationId, orgId)))
				.limit(1);

			if (m) {
				event.locals.memberRole = m.role;
			}
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
