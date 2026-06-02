import { db } from '$lib/server/db';
import { auditLog, employee, workstation } from '$lib/server/db/schema';
import { desc, eq, count, gte, ne, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const orgId = locals.organizationId!;

	const weekStart = new Date();
	weekStart.setHours(0, 0, 0, 0);
	weekStart.setDate(weekStart.getDate() - weekStart.getDay());

	const [
		recentAudit,
		onboarding,
		[{ onboardingCount }],
		[{ terminationCount }],
		[{ employeeCount }],
		[{ workstationCount }],
		[{ flaggedCount }],
		[{ auditTodayCount }]
	] = await Promise.all([
		db.select().from(auditLog)
			.where(eq(auditLog.organizationId, orgId))
			.orderBy(desc(auditLog.createdAt)).limit(5),
		db.select().from(employee)
			.where(and(eq(employee.organizationId, orgId), eq(employee.status, 'onboarding'))),
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
			.where(and(eq(auditLog.organizationId, orgId), gte(auditLog.createdAt, weekStart)))
	]);

	return {
		recentAudit,
		onboarding,
		onboardingCount,
		terminationCount,
		employeeCount,
		workstationCount,
		flaggedCount,
		auditTodayCount
	};
};
