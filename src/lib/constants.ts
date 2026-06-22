// Roles now live in the `role` DB table (per organization) and are managed at
// runtime — add one just by typing it into the role field on any employee
// form. These defaults are only used to seed an org's table the first time it
// has no roles yet. See src/lib/server/roles.ts.
export const DEFAULT_ROLES: string[] = [
	'Bookkeeping Specialist',
	'Bookkeeping Lead'
];

// Countries are still a fixed code list.
export const COUNTRIES: string[] = [
	'United States',
	'Philippines'
];

// Checklist templates are typed so onboarding vs termination checklists can be
// surfaced in the right place. Extendable — add a type here and a label below.
export const CHECKLIST_TYPES = ['general', 'onboarding', 'termination'] as const;
export type ChecklistType = (typeof CHECKLIST_TYPES)[number];

export const CHECKLIST_TYPE_LABELS: Record<ChecklistType, string> = {
	general: 'General',
	onboarding: 'Onboarding',
	termination: 'Termination'
};

// Employee statuses that mean the person is being offboarded. Their termination
// checklists + platform removals show on /terminations; other checklists hide.
export const TERMINATING_STATUSES = ['pending_termination', 'terminated'] as const;

// Which checklist types are visible for an employee given their status.
export function visibleChecklistTypes(status: string): ChecklistType[] {
	return (TERMINATING_STATUSES as readonly string[]).includes(status)
		? ['termination']
		: ['general', 'onboarding'];
}
