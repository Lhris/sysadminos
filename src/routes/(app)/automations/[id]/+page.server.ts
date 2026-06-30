import { db } from '$lib/server/db';
import { automation } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireMember } from '$lib/server/auth-guard';
import { parseFields } from '$lib/automation';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const orgId = locals.organizationId!;

	const [row] = await db.select().from(automation)
		.where(and(eq(automation.id, params.id), eq(automation.organizationId, orgId)));
	if (!row) error(404, 'Automation not found');

	return { automation: row, fields: parseFields(row.fields) };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		const url = data.get('url')?.toString().trim() ?? '';
		const description = data.get('description')?.toString().trim() || null;
		if (!name) return fail(400, { updateError: 'Name is required' });
		if (!url) return fail(400, { updateError: 'URL is required' });

		// `fields` arrives as a JSON string; normalise via parseFields and re-serialise.
		const fields = parseFields(data.get('fields')?.toString() ?? '');
		const fieldsJson = fields.length > 0 ? JSON.stringify(fields) : null;

		await db.update(automation)
			.set({ name, url, description, fields: fieldsJson, updatedAt: new Date() })
			.where(and(eq(automation.id, params.id), eq(automation.organizationId, orgId)));

		return { success: true };
	},

	delete: async ({ params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		await db.delete(automation)
			.where(and(eq(automation.id, params.id), eq(automation.organizationId, orgId)));

		redirect(303, '/automations');
	}
};
