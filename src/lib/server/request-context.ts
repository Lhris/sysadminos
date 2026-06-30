import { AsyncLocalStorage } from 'node:async_hooks';

// Request-scoped actor/IP info so audit logging can stamp every event with the
// acting user's email and client IP without threading them through every call
// site. Populated in hooks.server.ts; read (as a fallback) in server/audit.ts.
export interface RequestContext {
	email?: string;
	ip?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function currentRequestContext(): RequestContext {
	return requestContext.getStore() ?? {};
}
