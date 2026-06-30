// Shared (client + server) helpers for automations: turning a profile into a
// flat webhook payload. See src/lib/server/db/schema.ts `automation`.

export interface AutomationField {
	key: string;
	label: string;
	default: string;
}

// Minimal shape of an employee profile that token resolution reads from.
export interface ProfileLike {
	firstName?: string | null;
	lastName?: string | null;
	microsoftEmail?: string | null;
	personalEmail?: string | null;
	role?: string | null;
	country?: string | null;
	address?: string | null;
	startDate?: string | null;
	status?: string | null;
	tempPassword?: string | null;
}

// {{token}} → function reading the profile. `companyEmail` aliases the Microsoft
// email since that is the account address sent to new hires.
const TOKEN_RESOLVERS: Record<string, (p: ProfileLike) => string> = {
	firstName: (p) => p.firstName ?? '',
	lastName: (p) => p.lastName ?? '',
	fullName: (p) => [p.firstName, p.lastName].filter(Boolean).join(' '),
	microsoftEmail: (p) => p.microsoftEmail ?? '',
	companyEmail: (p) => p.microsoftEmail ?? '',
	personalEmail: (p) => p.personalEmail ?? '',
	role: (p) => p.role ?? '',
	country: (p) => p.country ?? '',
	address: (p) => p.address ?? '',
	startDate: (p) => p.startDate ?? '',
	status: (p) => p.status ?? '',
	tempPassword: (p) => p.tempPassword ?? ''
};

// Token keys offered as a hint in the automation editor.
export const PROFILE_TOKENS = Object.keys(TOKEN_RESOLVERS);

// Replace every {{token}} in `template` with its resolved profile value.
// Unknown tokens are left untouched so typos are visible rather than silently dropped.
export function resolveTokens(template: string, profile: ProfileLike): string {
	return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
		const resolver = TOKEN_RESOLVERS[key];
		return resolver ? resolver(profile) : match;
	});
}

// Safely parse the stored `fields` JSON into a typed array. Returns [] on any error.
export function parseFields(json: string | null | undefined): AutomationField[] {
	if (!json) return [];
	try {
		const parsed = JSON.parse(json);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((f) => f && typeof f.key === 'string' && f.key.trim() !== '')
			.map((f) => ({
				key: String(f.key),
				label: String(f.label ?? f.key),
				default: String(f.default ?? '')
			}));
	} catch {
		return [];
	}
}

// Build the flat JSON object sent to the webhook from field keys and their values.
export function buildPayload(
	fields: AutomationField[],
	values: Record<string, string>
): Record<string, string> {
	const payload: Record<string, string> = {};
	for (const field of fields) {
		payload[field.key] = values[field.key] ?? '';
	}
	return payload;
}
