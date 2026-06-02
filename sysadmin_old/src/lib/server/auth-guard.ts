import { error } from '@sveltejs/kit';

// Blocks view-only members — for normal mutations (add/edit employees, workstations, etc.)
export function requireMember(memberRole: string | undefined) {
	if (memberRole !== 'owner' && memberRole !== 'member') {
		error(403, 'Forbidden');
	}
}

// Owner only — for user management (invite, remove, change role)
export function requireOwner(memberRole: string | undefined) {
	if (memberRole !== 'owner') {
		error(403, 'Forbidden');
	}
}

// System admin only — for the admin panel
export function requireSuperAdmin(isAdmin: boolean | undefined) {
	if (!isAdmin) {
		error(403, 'Forbidden');
	}
}
