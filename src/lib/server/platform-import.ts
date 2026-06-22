	import type { Employee } from '$lib/server/db/schema';

export interface ParsedEntry {
	matchEmail: string | null;
	displayName: string | null;
	metadata: string; // original entry, stringified
}

export interface MatchedLicense extends ParsedEntry {
	employeeId: string | null;
	matchedBy: 'email' | 'name' | null;
}

const EMAIL_KEYS = ['email', 'emailaddress', 'mail', 'useremail', 'user', 'login', 'username', 'upn', 'userprincipalname'];
const NAME_KEYS = ['name', 'displayname', 'fullname', 'full_name', 'user', 'employee'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pick(obj: Record<string, unknown>, keys: string[]): string | null {
	// Case-insensitive key lookup.
	const lower: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj)) lower[k.toLowerCase().replace(/[\s_-]/g, '')] = v;
	for (const key of keys) {
		const v = lower[key.replace(/[\s_-]/g, '')];
		if (typeof v === 'string' && v.trim()) return v.trim();
	}
	return null;
}

/**
 * Parses a pasted JSON blob into license entries. Accepts:
 *  - an array of objects (e.g. [{ "name": "...", "email": "..." }])
 *  - an array of email strings (["a@x.com", ...])
 *  - a single object (treated as one entry)
 * Throws on invalid JSON or unusable shapes.
 */
export function parseLicenseJson(raw: string): ParsedEntry[] {
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		throw new Error('Invalid JSON — could not parse the pasted text.');
	}

	const arr = Array.isArray(data) ? data : [data];
	if (arr.length === 0) throw new Error('No entries found in the JSON.');

	const entries: ParsedEntry[] = [];
	for (const item of arr) {
		if (typeof item === 'string') {
			const s = item.trim();
			if (!s) continue;
			entries.push({
				matchEmail: EMAIL_RE.test(s) ? s.toLowerCase() : null,
				displayName: EMAIL_RE.test(s) ? null : s,
				metadata: JSON.stringify(item)
			});
		} else if (item && typeof item === 'object') {
			const obj = item as Record<string, unknown>;
			const email = pick(obj, EMAIL_KEYS);
			const name = pick(obj, NAME_KEYS);
			entries.push({
				matchEmail: email && EMAIL_RE.test(email) ? email.toLowerCase() : email,
				displayName: name,
				metadata: JSON.stringify(item)
			});
		}
		// silently skip nulls/numbers
	}

	if (entries.length === 0) throw new Error('No usable entries found in the JSON.');
	return entries;
}

/**
 * Links parsed entries to employees: by email (Microsoft then personal),
 * falling back to first+last name match. Unmatched entries get a null employeeId.
 */
export function matchEntries(entries: ParsedEntry[], employees: Employee[]): MatchedLicense[] {
	const byMsEmail = new Map<string, Employee>();
	const byPersonalEmail = new Map<string, Employee>();
	const byName = new Map<string, Employee | null>(); // null = ambiguous (dupe name)

	for (const e of employees) {
		if (e.microsoftEmail) byMsEmail.set(e.microsoftEmail.toLowerCase(), e);
		if (e.personalEmail) byPersonalEmail.set(e.personalEmail.toLowerCase(), e);
		const nameKey = `${e.firstName} ${e.lastName}`.toLowerCase().trim();
		byName.set(nameKey, byName.has(nameKey) ? null : e);
	}

	return entries.map((entry) => {
		let employeeId: string | null = null;
		let matchedBy: 'email' | 'name' | null = null;

		const email = entry.matchEmail?.toLowerCase() ?? null;
		if (email) {
			const hit = byMsEmail.get(email) ?? byPersonalEmail.get(email);
			if (hit) {
				employeeId = hit.id;
				matchedBy = 'email';
			}
		}

		if (!employeeId && entry.displayName) {
			const hit = byName.get(entry.displayName.toLowerCase().trim());
			if (hit) {
				employeeId = hit.id;
				matchedBy = 'name';
			}
		}

		return { ...entry, employeeId, matchedBy };
	});
}
