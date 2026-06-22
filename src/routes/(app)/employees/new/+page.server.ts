import { db } from '$lib/server/db';
import { employee } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';
import * as audit from '$lib/server/audit';
import { requireMember } from '$lib/server/auth-guard';
import { listRoles, ensureRoles } from '$lib/server/roles';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { roles: await listRoles(locals.organizationId!) };
};

const VALID_STATUSES = ['active', 'onboarding', 'offer_pending', 'pending_termination', 'terminated', 'no_status'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Store as PST 8:30am (UTC-8) so new Date() renders the correct date in any US timezone
function toStoredDate(raw: string): string {
	const day = raw.trim().slice(0, 10);
	return day ? `${day}T08:30:00-08:00` : '';
}

// Drizzle wraps DB errors as "Failed query: …" and keeps the real Postgres
// message on `.cause`, so flatten the whole chain before sniffing for a
// unique-constraint violation.
function isUniqueViolation(e: unknown): boolean {
	let text = '';
	let cur: unknown = e;
	while (cur instanceof Error) {
		text += ' ' + cur.message;
		cur = cur.cause;
	}
	text = text.toLowerCase();
	return text.includes('unique') || text.includes('duplicate key');
}

export const actions: Actions = {
	single: async ({ request, locals }) => {
		requireMember(locals.memberRole);

		const data = await request.formData();

		const firstName      = data.get('firstName')?.toString().trim() ?? '';
		const lastName       = data.get('lastName')?.toString().trim() ?? '';
		const microsoftEmail = data.get('microsoftEmail')?.toString().trim() ?? '';
		const personalEmail  = data.get('personalEmail')?.toString().trim() || null;
		const tempPassword   = data.get('tempPassword')?.toString().trim() || null;
		const role           = data.get('role')?.toString().trim() ?? '';
		const country        = data.get('country')?.toString().trim() ?? '';
		const address        = data.get('address')?.toString().trim() || null;
		const startDate      = toStoredDate(data.get('startDate')?.toString() ?? '');
		const status         = data.get('status')?.toString() ?? 'onboarding';

		const errors: Record<string, string> = {};
		if (!firstName)     errors.firstName     = 'Required';
		if (!lastName)      errors.lastName      = 'Required';
		if (!microsoftEmail) errors.microsoftEmail = 'Required';
		else if (!EMAIL_RE.test(microsoftEmail))
			errors.microsoftEmail = 'Invalid email';
		if (!role)      errors.role      = 'Required';
		if (!country)   errors.country   = 'Required';

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
				role, country, address, startDate, status
			}).returning();

			await ensureRoles(locals.organizationId!, [role]);

			await audit.log({
				action: 'employee.created',
				organizationId: locals.organizationId!,
				subjectType: 'employee',
				subjectId: created.id,
				subjectLabel: `${firstName} ${lastName}`,
				actorId: locals.user!.id,
				actorLabel: locals.user!.name,
				metadata: { role, country, status }
			});
		} catch (e) {
			if (isUniqueViolation(e)) {
				return fail(400, {
					errors: { microsoftEmail: 'This email is already registered' },
					values: { firstName, lastName, microsoftEmail, personalEmail, tempPassword, role, country, startDate, status }
				});
			}
			throw e;
		}

		redirect(303, '/employees');
	},

	bulk: async ({ request, locals }) => {
		requireMember(locals.memberRole);

		const data = await request.formData();
		const raw = data.get('json')?.toString() ?? '';

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return fail(400, { bulkError: 'Could not parse JSON. Check for syntax errors.', bulkValue: raw });
		}
		if (!Array.isArray(parsed)) {
			return fail(400, { bulkError: 'Expected a JSON array of employee objects.', bulkValue: raw });
		}
		if (parsed.length === 0) {
			return fail(400, { bulkError: 'The array is empty.', bulkValue: raw });
		}

		const rows: (typeof employee.$inferInsert)[] = [];
		const rowErrors: string[] = [];

		parsed.forEach((item, i) => {
			const label = `Row ${i + 1}`;
			if (typeof item !== 'object' || item === null) {
				rowErrors.push(`${label}: not an object`);
				return;
			}
			const o = item as Record<string, unknown>;
			const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

			const firstName      = str(o.firstName);
			const lastName       = str(o.lastName);
			const microsoftEmail = str(o.microsoftEmail);
			const role           = str(o.role);
			const country        = str(o.country);
			const status         = str(o.status) || 'offer_pending';

			const missing: string[] = [];
			if (!firstName) missing.push('firstName');
			if (!lastName) missing.push('lastName');
			if (!microsoftEmail) missing.push('microsoftEmail');
			if (!role) missing.push('role');
			if (!country) missing.push('country');
			if (missing.length) {
				rowErrors.push(`${label}: missing ${missing.join(', ')}`);
				return;
			}
			if (!EMAIL_RE.test(microsoftEmail)) {
				rowErrors.push(`${label}: invalid microsoftEmail "${microsoftEmail}"`);
				return;
			}
			if (!VALID_STATUSES.includes(status)) {
				rowErrors.push(`${label}: invalid status "${status}"`);
				return;
			}

			rows.push({
				organizationId: locals.organizationId!,
				firstName, lastName, microsoftEmail, role, country, status,
				personalEmail: str(o.personalEmail) || null,
				tempPassword:  str(o.tempPassword) || null,
				address:       str(o.address) || null,
				startDate:     toStoredDate(str(o.startDate))
			});
		});

		// Reject duplicate emails within the batch before touching the DB.
		const seen = new Set<string>();
		for (const r of rows) {
			const key = r.microsoftEmail.toLowerCase();
			if (seen.has(key)) rowErrors.push(`Duplicate microsoftEmail in batch: ${r.microsoftEmail}`);
			seen.add(key);
		}

		// Reject emails that already exist in the DB (microsoftEmail is globally
		// unique) so we can report exactly which ones collide instead of failing
		// the whole insert with an opaque constraint error.
		if (rows.length > 0) {
			const existing = await db
				.select({ email: employee.microsoftEmail })
				.from(employee)
				.where(inArray(employee.microsoftEmail, rows.map((r) => r.microsoftEmail)));
			const taken = new Set(existing.map((e) => e.email.toLowerCase()));
			for (const r of rows) {
				if (taken.has(r.microsoftEmail.toLowerCase())) {
					rowErrors.push(`Already registered: ${r.microsoftEmail}`);
				}
			}
		}

		if (rowErrors.length) {
			return fail(400, { bulkError: `${rowErrors.length} problem(s) found — nothing was added.`, bulkErrors: rowErrors, bulkValue: raw });
		}

		try {
			const created = await db.insert(employee).values(rows).returning({ id: employee.id, firstName: employee.firstName, lastName: employee.lastName });
			await ensureRoles(locals.organizationId!, rows.map((r) => r.role));
			await Promise.all(created.map((c) =>
				audit.log({
					action: 'employee.created',
					organizationId: locals.organizationId!,
					subjectType: 'employee',
					subjectId: c.id,
					subjectLabel: `${c.firstName} ${c.lastName}`,
					actorId: locals.user!.id,
					actorLabel: locals.user!.name,
					metadata: { bulk: true }
				})
			));
		} catch (e) {
			if (isUniqueViolation(e)) {
				return fail(400, { bulkError: 'One or more Microsoft emails are already registered. No employees were added.', bulkValue: raw });
			}
			throw e;
		}

		redirect(303, '/employees');
	}
};
