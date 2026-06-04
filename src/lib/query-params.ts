import { createUseQueryParams } from 'svelte-query-params';
import { sveltekit } from 'svelte-query-params/adapters/sveltekit';

export const useEmployeeParams = createUseQueryParams(
	{
		status: (value) => (typeof value === 'string' ? value : undefined)
	},
	{ adapter: sveltekit({ replace: true }) }
);

export const useAuditParams = createUseQueryParams(
	{
		subjectType: (value) => (typeof value === 'string' ? value : undefined)
	},
	{ adapter: sveltekit({ replace: true }) }
);
