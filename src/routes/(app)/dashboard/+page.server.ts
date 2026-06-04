import { db } from '$lib/server/db';
import { auditLog, employee, workstation, checklistAssignment, checklistTemplate, checklistTemplateItem, checklistCompletion } from '$lib/server/db/schema';
import { desc, eq, count, gte, ne, and, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const orgId = locals.organizationId!;

	const weekStart = new Date();
	weekStart.setHours(0, 0, 0, 0);
	weekStart.setDate(weekStart.getDate() - weekStart.getDay());

	const [
		recentAudit,
		[{ onboardingCount }],
		[{ terminationCount }],
		[{ employeeCount }],
		[{ workstationCount }],
		[{ flaggedCount }],
		[{ auditTodayCount }],
		assignmentsRaw
	] = await Promise.all([
		db.select().from(auditLog)
			.where(eq(auditLog.organizationId, orgId))
			.orderBy(desc(auditLog.createdAt)).limit(5),
		db.select({ onboardingCount: count() }).from(employee)
			.where(and(eq(employee.organizationId, orgId), eq(employee.status, 'onboarding'))),
		db.select({ terminationCount: count() }).from(employee)
			.where(and(eq(employee.organizationId, orgId), eq(employee.status, 'offboarding'))),
		db.select({ employeeCount: count() }).from(employee)
			.where(and(eq(employee.organizationId, orgId), ne(employee.status, 'terminated'))),
		db.select({ workstationCount: count() }).from(workstation)
			.where(and(eq(workstation.organizationId, orgId), ne(workstation.status, 'retired'))),
		db.select({ flaggedCount: count() }).from(workstation)
			.where(and(eq(workstation.organizationId, orgId), eq(workstation.status, 'flagged'))),
		db.select({ auditTodayCount: count() }).from(auditLog)
			.where(and(eq(auditLog.organizationId, orgId), gte(auditLog.createdAt, weekStart))),
		db.select({
			id: checklistAssignment.id,
			employeeId: employee.id,
			firstName: employee.firstName,
			lastName: employee.lastName,
			templateId: checklistTemplate.id,
			templateName: checklistTemplate.name,
			assignedAt: checklistAssignment.assignedAt
		})
			.from(checklistAssignment)
			.innerJoin(employee, eq(checklistAssignment.employeeId, employee.id))
			.innerJoin(checklistTemplate, eq(checklistAssignment.templateId, checklistTemplate.id))
			.where(eq(checklistAssignment.organizationId, orgId))
	]);

	const assignmentIds = assignmentsRaw.map(a => a.id);
	const templateIds = [...new Set(assignmentsRaw.map(a => a.templateId))];

	const [completionCounts, itemCounts] = await Promise.all([
		assignmentIds.length > 0
			? db.select({ assignmentId: checklistCompletion.assignmentId, cnt: count() })
				.from(checklistCompletion)
				.where(inArray(checklistCompletion.assignmentId, assignmentIds))
				.groupBy(checklistCompletion.assignmentId)
			: Promise.resolve([]),
		templateIds.length > 0
			? db.select({ templateId: checklistTemplateItem.templateId, cnt: count() })
				.from(checklistTemplateItem)
				.where(inArray(checklistTemplateItem.templateId, templateIds))
				.groupBy(checklistTemplateItem.templateId)
			: Promise.resolve([])
	]);

	const completedMap = Object.fromEntries(completionCounts.map(c => [c.assignmentId, c.cnt]));
	const totalMap = Object.fromEntries(itemCounts.map(c => [c.templateId, c.cnt]));

	const pendingChecklists = assignmentsRaw
		.map(a => ({
			...a,
			completed: completedMap[a.id] ?? 0,
			total: totalMap[a.templateId] ?? 0
		}))
		.filter(a => a.completed < a.total)
		.sort((a, b) => (b.assignedAt?.getTime() ?? 0) - (a.assignedAt?.getTime() ?? 0))
		.slice(0, 10);

	return {
		recentAudit,
		pendingChecklists,
		onboardingCount,
		terminationCount,
		employeeCount,
		workstationCount,
		flaggedCount,
		auditTodayCount
	};
};
