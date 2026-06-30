import { db } from '$lib/server/db';
import { employee, checklistTemplateItem, checklistAssignment, automation } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { parseFields, resolveTokens, buildPayload } from '$lib/automation';
import { log } from '$lib/server/audit';

interface RunOpts {
	orgId: string;
	assignmentId: string;
	templateItemId: string;
	payloadRaw: string;
	actorId?: string;
	actorLabel?: string;
}

// Fires the automation attached to a checklist task for one assigned employee.
// Shared by the per-employee checklist page and the template grid so both
// trigger points behave identically. Returns a SvelteKit action result.
export async function runAttachedAutomation(opts: RunOpts) {
	const { orgId, assignmentId, templateItemId, payloadRaw } = opts;

	const [assignment] = await db.select().from(checklistAssignment)
		.where(and(eq(checklistAssignment.id, assignmentId), eq(checklistAssignment.organizationId, orgId)));
	if (!assignment) return fail(404, { runError: 'Assignment not found' });

	const [item] = await db.select().from(checklistTemplateItem)
		.where(and(eq(checklistTemplateItem.id, templateItemId), eq(checklistTemplateItem.templateId, assignment.templateId)));
	if (!item?.automationId) return fail(400, { runError: 'No automation on this task' });

	const [auto] = await db.select().from(automation)
		.where(and(eq(automation.id, item.automationId), eq(automation.organizationId, orgId)));
	if (!auto) return fail(404, { runError: 'Automation not found' });

	const [emp] = await db.select().from(employee).where(eq(employee.id, assignment.employeeId));
	if (!emp) return fail(404, { runError: 'Employee not found' });

	const fields = parseFields(auto.fields);

	// Prefer values edited in the dialog; fall back to resolved defaults.
	let payload: Record<string, string>;
	try {
		const submitted = payloadRaw ? JSON.parse(payloadRaw) : null;
		payload = submitted && typeof submitted === 'object'
			? submitted
			: buildPayload(fields, Object.fromEntries(fields.map(f => [f.key, resolveTokens(f.default, emp)])));
	} catch {
		return fail(400, { runError: 'Invalid payload' });
	}

	const subject = {
		organizationId: orgId,
		action: 'automation.run',
		subjectType: 'employee',
		subjectId: emp.id,
		subjectLabel: `${emp.firstName} ${emp.lastName}`,
		actorId: opts.actorId,
		actorLabel: opts.actorLabel
	} as const;

	let status = 0;
	let ok = false;
	try {
		const res = await fetch(auto.url, {
			method: auto.method,
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(10000)
		});
		status = res.status;
		ok = res.ok;
	} catch (e) {
		await log({ ...subject, metadata: { automation: auto.name, url: auto.url, ok: false, error: e instanceof Error ? e.message : 'fetch failed' } });
		return fail(502, { runError: `Request failed: ${e instanceof Error ? e.message : 'unreachable'}` });
	}

	await log({ ...subject, metadata: { automation: auto.name, url: auto.url, status, ok } });

	if (!ok) return fail(502, { runError: `Webhook returned ${status}` });
	return { success: true, ranStatus: status };
}
