import { db } from '$lib/server/db';
import { employee } from '$lib/server/db/schema';
import * as audit from '$lib/server/audit';
import { requireMember } from '$lib/server/auth-guard';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireMember(locals.memberRole);

		const data = await request.formData();

		const firstName    = data.get('firstName')?.toString().trim() ?? '';
		const lastName     = data.get('lastName')?.toString().trim() ?? '';
		const microsoftEmail = data.get('microsoftEmail')?.toString().trim() ?? '';
		const personalEmail  = data.get('personalEmail')?.toString().trim() || null;
		const tempPassword   = data.get('tempPassword')?.toString().trim() || null;
		const role     = data.get('role')?.toString().trim() ?? '';
		const country  = data.get('country')?.toString().trim() ?? '';
		const startDate = data.get('startDate')?.toString() ?? '';
		const status = (data.get('status')?.toString() ?? 'onboarding') as
			'active' | 'onboarding' | 'offboarding' | 'terminated';

		const errors: Record<string, string> = {};
		if (!firstName)     errors.firstName     = 'Required';
		if (!lastName)      errors.lastName      = 'Required';
		if (!microsoftEmail) errors.microsoftEmail = 'Required';
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(microsoftEmail))
			errors.microsoftEmail = 'Invalid email';
		if (!role)      errors.role      = 'Required';
		if (!country)   errors.country   = 'Required';
		if (!startDate) errors.startDate = 'Required';

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				errors,
				values: { firstName, lastName, microsoftEmail, personalEmail, tempPassword, role, country, startDate, status }
			});
		}

		try {
			const [created] = await db.insert(employee).values({
				organizationId: locals.organizationId!,
				firstName, lastName, microsoftEmail,
				personalEmail, tempPassword,
				role, country, startDate, status
			}).returning();

			await audit.log({
				action: 'employee.created',
				organizationId: locals.organizationId!,
				entityType: 'employee',
				entityId: created.id,
				entityLabel: `${firstName} ${lastName}`,
				actorId: locals.user!.id,
				actorLabel: locals.user!.name,
				metadata: { role, country, status }
			});
		} catch (e) {
			if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
				return fail(400, {
					errors: { microsoftEmail: 'This email is already registered' },
					values: { firstName, lastName, microsoftEmail, personalEmail, tempPassword, role, country, startDate, status }
				});
			}
			throw e;
		}

		redirect(303, '/employees');
	}
};
