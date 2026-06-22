import { db } from '$lib/server/db';
import { role, employee } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { DEFAULT_ROLES } from '$lib/constants';

/**
 * Returns the org's roles for the role picker. The first time an org has no
 * rows, the table is lazily seeded from the roles already used by its
 * employees (falling back to the defaults) so the dropdown is never empty.
 */
export async function listRoles(organizationId: string): Promise<string[]> {
	const rows = await db
		.select({ name: role.name })
		.from(role)
		.where(eq(role.organizationId, organizationId))
		.orderBy(asc(role.name));
	if (rows.length > 0) return rows.map((r) => r.name);

	const used = await db
		.selectDistinct({ name: employee.role })
		.from(employee)
		.where(eq(employee.organizationId, organizationId));
	const seed = [...new Set([...used.map((u) => u.name).filter(Boolean), ...DEFAULT_ROLES])];
	await ensureRoles(organizationId, seed);
	return seed.sort((a, b) => a.localeCompare(b));
}

/**
 * Inserts any role names that don't already exist for the org. Call this
 * whenever an employee is saved with a (possibly new, free-typed) role so the
 * picker stays in sync. No-op for blank/duplicate names.
 */
export async function ensureRoles(organizationId: string, names: (string | null | undefined)[]): Promise<void> {
	const unique = [...new Set(names.map((n) => (n ?? '').trim()).filter(Boolean))];
	if (unique.length === 0) return;
	await db
		.insert(role)
		.values(unique.map((name) => ({ organizationId, name })))
		.onConflictDoNothing();
}
