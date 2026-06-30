import { db } from '$lib/server/db';
import { employee, checklistTemplate, checklistTemplateItem, checklistAssignment, checklistCompletion, automation } from '$lib/server/db/schema';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireMember } from '$lib/server/auth-guard';
import { parseFields } from '$lib/automation';
import { runAttachedAutomation } from '$lib/server/run-automation';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const orgId = locals.organizationId!;

	const [assignment] = await db.select().from(checklistAssignment)
		.where(and(eq(checklistAssignment.id, params.assignmentId), eq(checklistAssignment.organizationId, orgId)));
	if (!assignment) error(404, 'Assignment not found');

	const [[emp], [template], items, completions] = await Promise.all([
		db.select().from(employee).where(eq(employee.id, assignment.employeeId)),
		db.select().from(checklistTemplate).where(eq(checklistTemplate.id, assignment.templateId)),
		db.select().from(checklistTemplateItem)
			.where(eq(checklistTemplateItem.templateId, assignment.templateId))
			.orderBy(asc(checklistTemplateItem.position), asc(checklistTemplateItem.createdAt)),
		db.select().from(checklistCompletion)
			.where(eq(checklistCompletion.assignmentId, params.assignmentId))
	]);

	if (!emp || !template) error(404, 'Not found');

	// Load any automations attached to this template's items, keyed by id, so
	// the run dialog can render fields + payload preview.
	const automationIds = [...new Set(items.map(i => i.automationId).filter(Boolean) as string[])];
	const automationRows = automationIds.length > 0
		? await db.select().from(automation)
			.where(and(eq(automation.organizationId, orgId), inArray(automation.id, automationIds)))
		: [];
	const automations = Object.fromEntries(
		automationRows.map(a => [a.id, { ...a, fields: parseFields(a.fields) }])
	);

	return { assignment, employee: emp, template, items, completions, automations };
};

export const actions: Actions = {
	toggle: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const templateItemId = data.get('templateItemId')?.toString() ?? '';
		const completing = data.get('completing') === 'true';

		const [assignment] = await db.select().from(checklistAssignment)
			.where(and(eq(checklistAssignment.id, params.assignmentId), eq(checklistAssignment.organizationId, orgId)));
		if (!assignment) return fail(404);

		if (completing) {
			await db.insert(checklistCompletion).values({
				assignmentId: params.assignmentId,
				templateItemId,
				completedByLabel: locals.user?.name
			}).onConflictDoNothing();
		} else {
			await db.delete(checklistCompletion).where(
				and(
					eq(checklistCompletion.assignmentId, params.assignmentId),
					eq(checklistCompletion.templateItemId, templateItemId)
				)
			);
		}

		return { success: true };
	},

	updateDates: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const startRaw = data.get('startDate')?.toString() ?? '';
		const dueRaw   = data.get('dueDate')?.toString() ?? '';
		const startDate = startRaw ? `${startRaw}T08:30:00-08:00` : null;
		const dueDate   = dueRaw   ? `${dueRaw}T08:30:00-08:00`   : null;

		await db.update(checklistAssignment)
			.set({ startDate, dueDate })
			.where(and(eq(checklistAssignment.id, params.assignmentId), eq(checklistAssignment.organizationId, orgId)));

		return { success: true };
	},

	runAutomation: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const data = await request.formData();
		return runAttachedAutomation({
			orgId: locals.organizationId!,
			assignmentId: params.assignmentId,
			templateItemId: data.get('templateItemId')?.toString() ?? '',
			payloadRaw: data.get('payload')?.toString() ?? '',
			actorId: locals.user?.id,
			actorLabel: locals.user?.name
		});
	},

	unassign: async ({ params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		await db.delete(checklistAssignment)
			.where(and(eq(checklistAssignment.id, params.assignmentId), eq(checklistAssignment.organizationId, orgId)));

		redirect(303, '/checklists');
	}
};
