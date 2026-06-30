import { db } from '$lib/server/db';
import { automation } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { requireMember } from '$lib/server/auth-guard';
import { parseFields } from '$lib/automation';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const orgId = locals.organizationId!;

	const rows = await db
		.select()
		.from(automation)
		.where(eq(automation.organizationId, orgId))
		.orderBy(asc(automation.name));

	return {
		automations: rows.map((a) => ({ ...a, fieldCount: parseFields(a.fields).length }))
	};
};

export const actions: Actions = {
	addAutomation: async ({ request, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		const url = data.get('url')?.toString().trim() ?? '';
		const description = data.get('description')?.toString().trim() || null;
		if (!name) return fail(400, { addError: 'Name is required' });
		if (!url) return fail(400, { addError: 'URL is required' });

		await db.insert(automation).values({ organizationId: orgId, name, url, description });
		return { success: true };
	}
};
