import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { organization, emailOTP } from 'better-auth/plugins';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { user, invitation } from '$lib/server/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { sendOtpEmail } from '$lib/server/email';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true },
	user: {
		additionalFields: {
			isDev: {
				type: 'boolean',
				defaultValue: false,
				input: false
			}
		}
	},
	plugins: [
		organization({
			async sendInvitationEmail({ invitation }) {
				console.log(`[invite] ${invitation.email} → ${env.ORIGIN}/accept-invitation/${invitation.id}`);
			}
		}),
		emailOTP({
			async sendVerificationOTP({ email, otp, type }) {
				const [existingUser] = await db
					.select({ id: user.id })
					.from(user)
					.where(eq(user.email, email))
					.limit(1);

				const [pendingInvite] = await db
					.select({ id: invitation.id })
					.from(invitation)
					.where(
						and(
							eq(invitation.email, email),
							eq(invitation.status, 'pending'),
							gt(invitation.expiresAt, new Date())
						)
					)
					.limit(1);

				if (!existingUser && !pendingInvite) {
					throw new Error('No account found for this email.');
				}

				console.log(`[otp] ${email} — ${otp} (${type})`);
				await sendOtpEmail(email, otp, type).catch((e) =>
					console.error('[otp] email send failed:', e.message)
				);
			}
		}),
		sveltekitCookies(getRequestEvent)
	]
});
