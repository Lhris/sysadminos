import { db } from '$lib/server/db';
import {
	employee,
	platform,
	platformLicense,
	checklistAssignment,
	checklistTemplate,
	checklistTemplateItem,
	checklistCompletion
} from '$lib/server/db/schema';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { TERMINATING_STATUSES } from '$lib/constants';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const orgId = locals.organizationId!;

	// A "termination" is now derived: any employee whose status is pending_termination
	// or terminated. Their pending platform removals + termination checklists are
	// computed live from current state — no standalone termination record.
	const emps = await db
		.select()
		.from(employee)
		.where(and(eq(employee.organizationId, orgId), inArray(employee.status, [...TERMINATING_STATUSES])))
		.orderBy(asc(employee.status), asc(employee.firstName), asc(employee.lastName));

	if (emps.length === 0) return { terminations: [] };

	const empIds = emps.map((e) => e.id);

	// Platform-removal progress: total licenses vs. those already removed.
	const licenseCounts = await db
		.select({
			employeeId: platformLicense.employeeId,
			total: sql<number>`count(*)`.mapWith(Number),
			done: sql<number>`count(*) filter (where ${platformLicense.removedAt} is not null)`.mapWith(Number)
		})
		.from(platformLicense)
		.innerJoin(platform, eq(platformLicense.platformId, platform.id))
		.where(and(eq(platform.organizationId, orgId), inArray(platformLicense.employeeId, empIds)))
		.groupBy(platformLicense.employeeId);
	const licMap = new Map(licenseCounts.map((c) => [c.employeeId, c]));

	// Termination-type checklist assignments for these employees.
	const assignments = await db
		.select({
			id: checklistAssignment.id,
			employeeId: checklistAssignment.employeeId,
			templateId: checklistAssignment.templateId
		})
		.from(checklistAssignment)
		.innerJoin(checklistTemplate, eq(checklistAssignment.templateId, checklistTemplate.id))
		.where(
			and(
				eq(checklistAssignment.organizationId, orgId),
				eq(checklistTemplate.checklistType, 'termination'),
				inArray(checklistAssignment.employeeId, empIds)
			)
		);

	// Count completable (task) items per template + completions per assignment.
	const templateIds = [...new Set(assignments.map((a) => a.templateId))];
	const items = templateIds.length
		? await db
				.select()
				.from(checklistTemplateItem)
				.where(and(inArray(checklistTemplateItem.templateId, templateIds), eq(checklistTemplateItem.type, 'task')))
		: [];
	const taskCountByTemplate = new Map<string, number>();
	const taskItemIds = new Set(items.map((i) => i.id));
	for (const it of items) taskCountByTemplate.set(it.templateId, (taskCountByTemplate.get(it.templateId) ?? 0) + 1);

	const assignmentIds = assignments.map((a) => a.id);
	const completions = assignmentIds.length
		? await db.select().from(checklistCompletion).where(inArray(checklistCompletion.assignmentId, assignmentIds))
		: [];
	const doneByAssignment = new Map<string, number>();
	for (const c of completions) {
		if (!taskItemIds.has(c.templateItemId)) continue;
		doneByAssignment.set(c.assignmentId, (doneByAssignment.get(c.assignmentId) ?? 0) + 1);
	}

	const checklistAgg = new Map<string, { total: number; done: number }>();
	for (const a of assignments) {
		const total = taskCountByTemplate.get(a.templateId) ?? 0;
		const done = Math.min(doneByAssignment.get(a.id) ?? 0, total);
		const cur = checklistAgg.get(a.employeeId) ?? { total: 0, done: 0 };
		cur.total += total;
		cur.done += done;
		checklistAgg.set(a.employeeId, cur);
	}

	return {
		terminations: emps.map((e) => {
			const lic = licMap.get(e.id);
			const cl = checklistAgg.get(e.id) ?? { total: 0, done: 0 };
			return {
				employeeId: e.id,
				firstName: e.firstName,
				lastName: e.lastName,
				role: e.role,
				status: e.status,
				platformTotal: lic?.total ?? 0,
				platformDone: lic?.done ?? 0,
				checklistTotal: cl.total,
				checklistDone: cl.done
			};
		})
	};
};
