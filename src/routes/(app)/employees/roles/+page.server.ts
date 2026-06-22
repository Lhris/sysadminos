import { db } from '$lib/server/db';
import { employee, role } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { requireMember } from '$lib/server/auth-guard';
import { listRoles } from '$lib/server/roles';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const orgId = locals.organizationId!;
	await listRoles(orgId); // ensure the table is seeded

	const [roleRows, employees] = await Promise.all([
		db.select({ id: role.id, name: role.name }).from(role)
			.where(eq(role.organizationId, orgId)).orderBy(asc(role.name)),
		db.select({ role: employee.role }).from(employee)
			.where(eq(employee.organizationId, orgId))
	]);

	const roles = roleRows.map((r) => ({
		...r,
		count: employees.filter((e) => e.role === r.name).length
	}));

	return { roles };
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;
		const name = (await request.formData()).get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { error: 'Role name is required' });

		const existing = await db.select({ id: role.id }).from(role)
			.where(and(eq(role.organizationId, orgId), eq(role.name, name))).limit(1);
		if (existing.length > 0) return fail(400, { error: 'That role already exists' });

		await db.insert(role).values({ organizationId: orgId, name });
		return { success: true };
	},

	rename: async ({ request, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;
		const data = await request.formData();
		const id = data.get('roleId')?.toString() ?? '';
		const name = data.get('name')?.toString().trim() ?? '';
		if (!id || !name) return fail(400, { error: 'Role name is required' });

		const [current] = await db.select().from(role)
			.where(and(eq(role.id, id), eq(role.organizationId, orgId)));
		if (!current) return fail(404, { error: 'Role not found' });
		if (current.name === name) return { success: true };

		const clash = await db.select({ id: role.id }).from(role)
			.where(and(eq(role.organizationId, orgId), eq(role.name, name))).limit(1);
		if (clash.length > 0) return fail(400, { error: 'That role already exists' });

		await db.update(role).set({ name }).where(eq(role.id, id));
		// Carry the rename through to employees holding the old role label.
		await db.update(employee)
			.set({ role: name, updatedAt: new Date() })
			.where(and(eq(employee.organizationId, orgId), eq(employee.role, current.name)));
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;
		const id = (await request.formData()).get('roleId')?.toString() ?? '';
		if (!id) return fail(400);

		const [current] = await db.select().from(role)
			.where(and(eq(role.id, id), eq(role.organizationId, orgId)));
		if (!current) return fail(404, { error: 'Role not found' });

		const inUse = await db.select({ id: employee.id }).from(employee)
			.where(and(eq(employee.organizationId, orgId), eq(employee.role, current.name))).limit(1);
		if (inUse.length > 0) return fail(400, { error: `Can't delete "${current.name}" — it's assigned to employees. Reassign them first.` });

		await db.delete(role).where(eq(role.id, id));
		return { success: true };
	}
};
