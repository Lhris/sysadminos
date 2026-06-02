import { auth } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/dashboard');
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '');
		const email = String(data.get('email') ?? '');
		const password = String(data.get('password') ?? '');

		try {
			await auth.api.signUpEmail({ body: { name, email, password } });
		} catch {
			return fail(400, { error: 'Could not create account. Email may already be in use.' });
		}

		redirect(302, '/dashboard');
	}
};
