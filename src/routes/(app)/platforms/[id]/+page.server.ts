import { db } from '$lib/server/db';
import { platform, platformLicense, employee } from '$lib/server/db/schema';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireMember } from '$lib/server/auth-guard';
import { parseLicenseJson, matchEntries } from '$lib/server/platform-import';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const orgId = locals.organizationId!;

	const [plat] = await db
		.select()
		.from(platform)
		.where(and(eq(platform.id, params.id), eq(platform.organizationId, orgId)));
	if (!plat) error(404, 'Platform not found');

	const [licenses, employees] = await Promise.all([
		db
			.select({
				id: platformLicense.id,
				matchEmail: platformLicense.matchEmail,
				displayName: platformLicense.displayName,
				employeeId: platformLicense.employeeId,
				removedAt: platformLicense.removedAt,
				removedByLabel: platformLicense.removedByLabel,
				createdAt: platformLicense.createdAt,
				empFirstName: employee.firstName,
				empLastName: employee.lastName,
				empStatus: employee.status
			})
			.from(platformLicense)
			.leftJoin(employee, eq(platformLicense.employeeId, employee.id))
			.where(eq(platformLicense.platformId, params.id))
			.orderBy(asc(platformLicense.matchEmail), asc(platformLicense.displayName)),
		db
			.select({ id: employee.id, firstName: employee.firstName, lastName: employee.lastName, status: employee.status })
			.from(employee)
			.where(eq(employee.organizationId, orgId))
			.orderBy(asc(employee.firstName), asc(employee.lastName))
	]);

	return {
		platform: plat,
		licenses: licenses.map((l) => ({
			...l,
			pendingTermination: l.empStatus === 'pending_termination' || l.empStatus === 'terminated'
		})),
		employees
	};
};

export const actions: Actions = {
	bulkImport: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const [plat] = await db
			.select()
			.from(platform)
			.where(and(eq(platform.id, params.id), eq(platform.organizationId, orgId)));
		if (!plat) error(404, 'Platform not found');

		const data = await request.formData();
		const raw = data.get('json')?.toString() ?? '';
		if (!raw.trim()) return fail(400, { importError: 'Paste some JSON first.' });

		let entries;
		try {
			entries = parseLicenseJson(raw);
		} catch (e) {
			return fail(400, { importError: e instanceof Error ? e.message : 'Could not parse JSON.' });
		}

		const employees = await db.select().from(employee).where(eq(employee.organizationId, orgId));
		const matched = matchEntries(entries, employees);

		await db.insert(platformLicense).values(
			matched.map((m) => ({
				platformId: params.id,
				employeeId: m.employeeId,
				matchEmail: m.matchEmail,
				displayName: m.displayName,
				metadata: m.metadata
			}))
		);

		const linked = matched.filter((m) => m.employeeId).length;

		return {
			importResult: { imported: matched.length, linked, unlinked: matched.length - linked }
		};
	},

	syncUnlinked: async ({ params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const [plat] = await db
			.select()
			.from(platform)
			.where(and(eq(platform.id, params.id), eq(platform.organizationId, orgId)));
		if (!plat) error(404, 'Platform not found');

		// Re-run matching for this platform's active, currently-unlinked licenses.
		const unlinked = await db
			.select()
			.from(platformLicense)
			.where(
				and(
					eq(platformLicense.platformId, params.id),
					isNull(platformLicense.employeeId),
					isNull(platformLicense.removedAt)
				)
			);
		if (unlinked.length === 0) return { syncResult: { matched: 0, total: 0 } };

		const employees = await db.select().from(employee).where(eq(employee.organizationId, orgId));
		const matched = matchEntries(
			unlinked.map((l) => ({ matchEmail: l.matchEmail, displayName: l.displayName, metadata: l.metadata ?? '' })),
			employees
		);

		const updates = unlinked
			.map((l, i) => ({ licenseId: l.id, employeeId: matched[i].employeeId }))
			.filter((u): u is { licenseId: string; employeeId: string } => !!u.employeeId);

		await Promise.all(
			updates.map((u) =>
				db.update(platformLicense).set({ employeeId: u.employeeId }).where(eq(platformLicense.id, u.licenseId))
			)
		);

		return { syncResult: { matched: updates.length, total: unlinked.length } };
	},

	addLicense: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const email = data.get('email')?.toString().trim() || null;
		const displayName = data.get('displayName')?.toString().trim() || null;
		const employeeId = data.get('employeeId')?.toString() || null;
		if (!email && !displayName) return fail(400, { addLicenseError: 'Enter an email or name.' });

		if (employeeId) {
			const [emp] = await db.select().from(employee).where(and(eq(employee.id, employeeId), eq(employee.organizationId, orgId)));
			if (!emp) return fail(400, { addLicenseError: 'Employee not found.' });
		}

		await db.insert(platformLicense).values({
			platformId: params.id,
			employeeId,
			matchEmail: email ? email.toLowerCase() : null,
			displayName
		});
		return { success: true };
	},

	linkLicense: async ({ request, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const licenseId = data.get('licenseId')?.toString() ?? '';
		const employeeId = data.get('employeeId')?.toString() || null;

		if (employeeId) {
			const [emp] = await db.select().from(employee).where(and(eq(employee.id, employeeId), eq(employee.organizationId, orgId)));
			if (!emp) return fail(400);
		}

		await db.update(platformLicense).set({ employeeId }).where(eq(platformLicense.id, licenseId));
		return { success: true };
	},

	toggleRemoved: async ({ request, locals }) => {
		requireMember(locals.memberRole);
		const data = await request.formData();
		const licenseId = data.get('licenseId')?.toString() ?? '';
		const removing = data.get('removing') === 'true';

		const now = new Date();
		await db
			.update(platformLicense)
			.set({
				removedAt: removing ? now : null,
				removedByLabel: removing ? locals.user?.name : null
			})
			.where(eq(platformLicense.id, licenseId));
		return { success: true };
	},

	deleteLicense: async ({ request, locals }) => {
		requireMember(locals.memberRole);
		const data = await request.formData();
		const licenseId = data.get('licenseId')?.toString() ?? '';
		await db.delete(platformLicense).where(eq(platformLicense.id, licenseId));
		return { success: true };
	},

	updatePlatform: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		const description = data.get('description')?.toString().trim() || null;
		if (!name) return fail(400, { editError: 'Name is required' });

		await db
			.update(platform)
			.set({ name, description, updatedAt: new Date() })
			.where(and(eq(platform.id, params.id), eq(platform.organizationId, orgId)));
		return { editSuccess: true };
	},

	deletePlatform: async ({ params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;
		await db.delete(platform).where(and(eq(platform.id, params.id), eq(platform.organizationId, orgId)));
		redirect(303, '/platforms');
	}
};
