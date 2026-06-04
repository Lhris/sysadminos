import { db } from '$lib/server/db';
import { employee, checklistTemplate, checklistTemplateItem, checklistAssignment, checklistCompletion } from '$lib/server/db/schema';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireMember } from '$lib/server/auth-guard';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const orgId = locals.organizationId!;

	const [template] = await db.select().from(checklistTemplate)
		.where(and(eq(checklistTemplate.id, params.id), eq(checklistTemplate.organizationId, orgId)));
	if (!template) error(404, 'Template not found');

	const [items, assignments] = await Promise.all([
		db.select().from(checklistTemplateItem)
			.where(eq(checklistTemplateItem.templateId, params.id))
			.orderBy(asc(checklistTemplateItem.position), asc(checklistTemplateItem.createdAt)),
		db.select({
			id: checklistAssignment.id,
			employeeId: checklistAssignment.employeeId,
			assignedAt: checklistAssignment.assignedAt,
			firstName: employee.firstName,
			lastName: employee.lastName
		})
		.from(checklistAssignment)
		.innerJoin(employee, eq(checklistAssignment.employeeId, employee.id))
		.where(eq(checklistAssignment.templateId, params.id))
		.orderBy(asc(employee.firstName), asc(employee.lastName))
	]);

	const completions = assignments.length > 0
		? await db.select({
			assignmentId: checklistCompletion.assignmentId,
			templateItemId: checklistCompletion.templateItemId
		}).from(checklistCompletion)
			.where(inArray(checklistCompletion.assignmentId, assignments.map(a => a.id)))
		: [];

	return { template, items, assignments, completions };
};

export const actions: Actions = {
	updateTemplate: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		const description = data.get('description')?.toString().trim() || null;
		if (!name) return fail(400, { updateError: 'Name is required' });

		await db.update(checklistTemplate)
			.set({ name, description })
			.where(and(eq(checklistTemplate.id, params.id), eq(checklistTemplate.organizationId, orgId)));

		return { success: true };
	},

	addItem: async ({ params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const [template] = await db.select().from(checklistTemplate)
			.where(and(eq(checklistTemplate.id, params.id), eq(checklistTemplate.organizationId, orgId)));
		if (!template) error(404, 'Template not found');

		const existing = await db.select({ position: checklistTemplateItem.position })
			.from(checklistTemplateItem)
			.where(eq(checklistTemplateItem.templateId, params.id));
		const nextPosition = existing.length > 0
			? Math.max(...existing.map(i => i.position)) + 1
			: 0;

		const [created] = await db.insert(checklistTemplateItem)
			.values({ templateId: params.id, label: 'New Task', position: nextPosition })
			.returning();

		return { success: true, itemId: created.id };
	},

	updateItem: async ({ request, locals }) => {
		requireMember(locals.memberRole);

		const data = await request.formData();
		const id = data.get('id')?.toString() ?? '';
		const label = data.get('label')?.toString().trim() ?? '';
		if (!id || !label) return fail(400);

		await db.update(checklistTemplateItem)
			.set({ label })
			.where(eq(checklistTemplateItem.id, id));

		return { success: true };
	},

	deleteItem: async ({ request, locals }) => {
		requireMember(locals.memberRole);

		const data = await request.formData();
		const id = data.get('id')?.toString() ?? '';
		if (!id) return fail(400);

		await db.delete(checklistTemplateItem).where(eq(checklistTemplateItem.id, id));
		return { success: true };
	},

	toggle: async ({ request, params, locals }) => {
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
	},

	addSection: async ({ request, params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		const data = await request.formData();
		const label = data.get('label')?.toString().trim() ?? 'New Section';

		const [template] = await db.select().from(checklistTemplate)
			.where(and(eq(checklistTemplate.id, params.id), eq(checklistTemplate.organizationId, orgId)));
		if (!template) error(404, 'Template not found');

		await db.insert(checklistTemplateItem).values({ templateId: params.id, label, type: 'section' });
		return { success: true };
	},

	reorderItems: async ({ request, locals }) => {
		requireMember(locals.memberRole);

		const data = await request.formData();
		const ids = JSON.parse(data.get('ids')?.toString() ?? '[]') as string[];

		await Promise.all(
			ids.map((id, position) =>
				db.update(checklistTemplateItem).set({ position }).where(eq(checklistTemplateItem.id, id))
			)
		);

		return { success: true };
	},

	deleteTemplate: async ({ params, locals }) => {
		requireMember(locals.memberRole);
		const orgId = locals.organizationId!;

		await db.delete(checklistTemplate)
			.where(and(eq(checklistTemplate.id, params.id), eq(checklistTemplate.organizationId, orgId)));

		redirect(303, '/checklists');
	}
};
