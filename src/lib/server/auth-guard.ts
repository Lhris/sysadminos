import { error } from '@sveltejs/kit';

export function requireMember(memberRole: string | undefined) {
	if (memberRole !== 'owner' && memberRole !== 'admin' && memberRole !== 'member') {
		error(403, 'Forbidden');
	}
}

export function requireOwner(memberRole: string | undefined) {
	if (memberRole !== 'owner' && memberRole !== 'admin') {
		error(403, 'Forbidden');
	}
}
