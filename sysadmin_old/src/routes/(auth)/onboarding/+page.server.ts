import { db } from '$lib/server/db';
import { organization, member } from '$lib/server/db/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		if (!locals.user) error(401, 'Unauthorized');

		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { error: 'Organization name is required' });

		const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
		const orgId = crypto.randomUUID();

		try {
			await db.insert(organization).values({ id: orgId, name, slug, createdAt: new Date() });
		} catch (e) {
			if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
				return fail(400, { error: 'An organization with that name already exists' });
			}
			throw e;
		}

		await db.insert(member).values({
			id: crypto.randomUUID(),
			organizationId: orgId,
			userId: locals.user.id,
			role: 'owner',
			createdAt: new Date()
		});

		redirect(303, '/dashboard');
	}
};
