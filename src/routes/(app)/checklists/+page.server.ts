import { db } from '$lib/server/db';
import { employee, checklistTemplate, checklistTemplateItem, checklistAssignment, checklistCompletion } from '$lib/server/db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { requireMember } from '$lib/server/auth-guard';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const orgId = locals.organizationId!;

	const [employees, templates, templateItems, assignments] = await Promise.all([
		db.select().from(employee)
			.where(eq(employee.organizationId, orgId))
			.orderBy(asc(employee.firstName), asc(employee.lastName)),
		db.select().from(checklistTemplate)
			.where(eq(checklistTemplate.organizationId, orgId))
			.orderBy(asc(checklistTemplate.name)),
		db.select().from(checklistTemplateItem)
			.orderBy(asc(checklistTemplateItem.position), asc(checklistTemplateItem.createdAt)),
		db.select().from(checklistAssignment)
			.where(eq(checklistAssignment.organizationId, orgId))
	]);

	const assignmentIds = assignments.map(a => a.id);
	const completions = assignmentIds.length > 0
		? await db.select({ assignmentId: checklistCompletion.assignmentId, templateItemId: checklistCompletion.templateItemId })
			.from(checklistCompletion)
			.innerJoin(checklistAssignment, eq(checklistCompletion.assignmentId, checklistAssignment.id))
			.where(eq(checklistAssignment.organizationId, orgId))
		: [];

	return {
		employees: employees.filter(e => e.status !== 'terminated'),
		templates,
		templateItems,
		assignments,
		completions
	};
};

export const actions: Actions = {
	addTemplate: async ({ request, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { addTemplateError: 'Name is required' });

		await db.insert(checklistTemplate).values({ organizationId: orgId, name });
		return { success: true };
	},

	assign: async ({ request, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const employeeId = data.get('employeeId')?.toString() ?? '';
		const templateId = data.get('templateId')?.toString() ?? '';
		if (!employeeId || !templateId) return fail(400, { assignError: 'Select an employee and template' });

		const [[emp], [tmpl]] = await Promise.all([
			db.select().from(employee).where(and(eq(employee.id, employeeId), eq(employee.organizationId, orgId))),
			db.select().from(checklistTemplate).where(and(eq(checklistTemplate.id, templateId), eq(checklistTemplate.organizationId, orgId)))
		]);
		if (!emp || !tmpl) return fail(400, { assignError: 'Invalid selection' });

		await db.insert(checklistAssignment).values({
			organizationId: orgId,
			employeeId,
			templateId,
			assignedByLabel: locals.user?.name
		}).onConflictDoNothing();

		return { success: true };
	},

	toggle: async ({ request, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const assignmentId = data.get('assignmentId')?.toString() ?? '';
		const templateItemId = data.get('templateItemId')?.toString() ?? '';
		const completing = data.get('completing') === 'true';

		const [assignment] = await db.select().from(checklistAssignment)
			.where(and(eq(checklistAssignment.id, assignmentId), eq(checklistAssignment.organizationId, orgId)));
		if (!assignment) return fail(404);

		if (completing) {
			await db.insert(checklistCompletion).values({
				assignmentId,
				templateItemId,
				completedByLabel: locals.user?.name
			}).onConflictDoNothing();
		} else {
			await db.delete(checklistCompletion).where(
				and(
					eq(checklistCompletion.assignmentId, assignmentId),
					eq(checklistCompletion.templateItemId, templateItemId)
				)
			);
		}

		return { success: true };
	}
};
