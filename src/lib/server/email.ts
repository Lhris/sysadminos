import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendOtpEmail(
	email: string,
	otp: string,
	type: 'sign-in' | 'email-verification' | 'forget-password'
) {
	const { data, error } = await resend.emails.send({
		from: env.RESEND_FROM,
		to: email,
		subject:
			type === 'sign-in'
				? 'Your sign-in code'
				: type === 'email-verification'
					? 'Verify your email'
					: 'Reset your password',
		html: `<p>Your code: <strong>${otp}</strong> — expires in 5 minutes.</p>`
	});

	if (error) {
		console.error('[email] Resend error:', error);
		throw new Error(error.message);
	}

	console.log('[email] OTP sent to', email, '— code:', otp, '— id:', data?.id);
}
