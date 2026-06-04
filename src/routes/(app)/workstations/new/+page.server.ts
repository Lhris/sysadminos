import { db } from '$lib/server/db';
import { workstation } from '$lib/server/db/schema';
import * as audit from '$lib/server/audit';
import { requireMember } from '$lib/server/auth-guard';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireMember(locals.memberRole);

		const data = await request.formData();

		const serialNumber   = data.get('serialNumber')?.toString().trim() ?? '';
		const make           = data.get('make')?.toString().trim() ?? '';
		const model          = data.get('model')?.toString().trim() ?? '';
		const deviceType     = data.get('deviceType')?.toString() ?? '';
		const os             = data.get('os')?.toString().trim() || null;
		const cpu            = data.get('cpu')?.toString().trim() || null;
		const ram            = data.get('ram')?.toString().trim() || null;
		const orderDate      = data.get('orderDate')?.toString() || null;
		const warrantyExpiry = data.get('warrantyExpiry')?.toString() || null;
		const location       = data.get('location')?.toString().trim() || null;
		const notes          = data.get('notes')?.toString().trim() || null;
		const status         = data.get('status')?.toString() ?? 'available';

		const errors: Record<string, string> = {};
		if (!serialNumber) errors.serialNumber = 'Required';
		if (!make)         errors.make         = 'Required';
		if (!model)        errors.model        = 'Required';
		if (!deviceType || !['laptop', 'desktop', 'monitor', 'other'].includes(deviceType))
			errors.deviceType = 'Required';

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				errors,
				values: { serialNumber, make, model, deviceType, os, cpu, ram, orderDate, warrantyExpiry, location, notes, status }
			});
		}

		try {
			const [created] = await db.insert(workstation).values({
				organizationId: locals.organizationId!,
				serialNumber, make, model, deviceType,
				os, cpu, ram, orderDate, warrantyExpiry, location, notes, status
			}).returning();

			await audit.log({
				action: 'workstation.created',
				organizationId: locals.organizationId!,
				subjectType: 'workstation',
				subjectId: created.id,
				subjectLabel: `${make} ${model} (${serialNumber})`,
				actorId: locals.user!.id,
				actorLabel: locals.user!.name,
				metadata: { deviceType, status }
			});
		} catch (e) {
			if (e instanceof Error && e.message.toLowerCase().includes('unique')) {
				return fail(400, {
					errors: { serialNumber: 'This serial number is already registered' },
					values: { serialNumber, make, model, deviceType, os, cpu, ram, orderDate, warrantyExpiry, location, notes, status }
				});
			}
			throw e;
		}

		redirect(303, '/workstations');
	}
};
