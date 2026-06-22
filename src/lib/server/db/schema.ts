import { pgTable, text, timestamp, index, integer, uniqueIndex } from 'drizzle-orm/pg-core';

export const employee = pgTable('employee', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	organizationId: text('organization_id'),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	microsoftEmail: text('microsoft_email').notNull().unique(),
	personalEmail: text('personal_email'),
	tempPassword: text('temp_password'),
	role: text('role').notNull(),
	country: text('country').notNull(),
	address: text('address'),
	startDate: text('start_date').notNull(),
	status: text('status').notNull().default('onboarding'),
	createdAt: timestamp('created_at').$defaultFn(() => new Date()),
	updatedAt: timestamp('updated_at').$defaultFn(() => new Date())
});

export const role = pgTable('role', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	organizationId: text('organization_id'),
	name: text('name').notNull(),
	createdAt: timestamp('created_at').$defaultFn(() => new Date())
}, (t) => [
	uniqueIndex('role_org_name_unique').on(t.organizationId, t.name)
]);

export const workstation = pgTable('workstation', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	organizationId: text('organization_id'),
	serialNumber: text('serial_number').notNull().unique(),
	make: text('make').notNull(),
	model: text('model').notNull(),
	deviceType: text('device_type').notNull(),
	os: text('os'),
	cpu: text('cpu'),
	ram: text('ram'),
	orderDate: text('order_date'),
	warrantyExpiry: text('warranty_expiry'),
	location: text('location'),
	status: text('status').notNull().default('available'),
	assignedEmployeeId: text('assigned_employee_id').references(() => employee.id),
	notes: text('notes'),
	createdAt: timestamp('created_at').$defaultFn(() => new Date()),
	updatedAt: timestamp('updated_at').$defaultFn(() => new Date())
});

export const workstationAssignment = pgTable('workstation_assignment', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	workstationId: text('workstation_id').notNull().references(() => workstation.id),
	employeeId: text('employee_id').notNull().references(() => employee.id),
	assignedAt: timestamp('assigned_at').$defaultFn(() => new Date()),
	unassignedAt: timestamp('unassigned_at')
});

export const workstationTimeline = pgTable('workstation_timeline', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	workstationId: text('workstation_id').notNull().references(() => workstation.id),
	employeeId: text('employee_id').references(() => employee.id),
	label: text('label'),
	startAt: text('start_at'),
	endAt: text('end_at'),
	createdAt: timestamp('created_at').$defaultFn(() => new Date())
}, (t) => [
	index('timeline_workstation_idx').on(t.workstationId)
]);

export const note = pgTable('note', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	ownerType: text('owner_type').notNull(),
	ownerId: text('owner_id').notNull(),
	body: text('body').notNull(),
	authorLabel: text('author_label'),
	createdAt: timestamp('created_at').$defaultFn(() => new Date())
}, (t) => [
	index('note_owner_idx').on(t.ownerType, t.ownerId)
]);

export const auditLog = pgTable('audit_log', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	organizationId: text('organization_id'),
	action: text('action').notNull(),
	subjectType: text('subject_type').notNull(),
	subjectId: text('subject_id').notNull(),
	subjectLabel: text('subject_label').notNull(),
	actorId: text('actor_id'),
	actorLabel: text('actor_label'),
	metadata: text('metadata'),
	createdAt: timestamp('created_at').$defaultFn(() => new Date())
}, (t) => [
	index('audit_subject_id_idx').on(t.subjectId),
	index('audit_subject_type_idx').on(t.subjectType),
	index('audit_created_at_idx').on(t.createdAt)
]);

export const checklistTemplate = pgTable('checklist_template', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	organizationId: text('organization_id').notNull(),
	name: text('name').notNull(),
	description: text('description'),
	// Distinguishes onboarding vs termination (vs general) checklists. See
	// CHECKLIST_TYPES in src/lib/constants.ts — extendable to more types.
	checklistType: text('checklist_type').notNull().default('general'),
	createdAt: timestamp('created_at').$defaultFn(() => new Date())
}, (t) => [
	index('checklist_template_org_idx').on(t.organizationId)
]);

export const checklistTemplateItem = pgTable('checklist_template_item', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	templateId: text('template_id').notNull().references(() => checklistTemplate.id, { onDelete: 'cascade' }),
	type: text('type').notNull().default('task'),
	label: text('label').notNull(),
	description: text('description'),
	videoUrl: text('video_url'),
	docUrl: text('doc_url'),
	notes: text('notes'),
	position: integer('position').notNull().default(0),
	createdAt: timestamp('created_at').$defaultFn(() => new Date())
}, (t) => [
	index('checklist_template_item_template_idx').on(t.templateId)
]);

export const checklistAssignment = pgTable('checklist_assignment', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	organizationId: text('organization_id').notNull(),
	employeeId: text('employee_id').notNull().references(() => employee.id, { onDelete: 'cascade' }),
	templateId: text('template_id').notNull().references(() => checklistTemplate.id, { onDelete: 'cascade' }),
	assignedAt: timestamp('assigned_at').$defaultFn(() => new Date()),
	assignedByLabel: text('assigned_by_label'),
	startDate: text('start_date'),
	dueDate: text('due_date')
}, (t) => [
	uniqueIndex('checklist_assignment_unique_idx').on(t.employeeId, t.templateId),
	index('checklist_assignment_employee_idx').on(t.employeeId)
]);

export const checklistCompletion = pgTable('checklist_completion', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	assignmentId: text('assignment_id').notNull().references(() => checklistAssignment.id, { onDelete: 'cascade' }),
	templateItemId: text('template_item_id').notNull().references(() => checklistTemplateItem.id, { onDelete: 'cascade' }),
	completedAt: timestamp('completed_at').$defaultFn(() => new Date()),
	completedByLabel: text('completed_by_label')
}, (t) => [
	uniqueIndex('checklist_completion_unique_idx').on(t.assignmentId, t.templateItemId),
	index('checklist_completion_assignment_idx').on(t.assignmentId)
]);

// ── Platform tracker ──────────────────────────────────────────────

export const platform = pgTable('platform', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	organizationId: text('organization_id').notNull(),
	name: text('name').notNull(),
	description: text('description'),
	createdAt: timestamp('created_at').$defaultFn(() => new Date()),
	updatedAt: timestamp('updated_at').$defaultFn(() => new Date())
}, (t) => [
	index('platform_org_idx').on(t.organizationId)
]);

// A single seat/license on a platform, optionally linked to an employee.
export const platformLicense = pgTable('platform_license', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	platformId: text('platform_id').notNull().references(() => platform.id, { onDelete: 'cascade' }),
	employeeId: text('employee_id').references(() => employee.id, { onDelete: 'set null' }),
	matchEmail: text('match_email'),
	displayName: text('display_name'),
	metadata: text('metadata'),
	removedAt: timestamp('removed_at'),
	removedByLabel: text('removed_by_label'),
	createdAt: timestamp('created_at').$defaultFn(() => new Date())
}, (t) => [
	index('platform_license_platform_idx').on(t.platformId),
	index('platform_license_employee_idx').on(t.employeeId)
]);

export type Platform = typeof platform.$inferSelect;
export type PlatformLicense = typeof platformLicense.$inferSelect;

export type ChecklistTemplate = typeof checklistTemplate.$inferSelect;
export type ChecklistTemplateItem = typeof checklistTemplateItem.$inferSelect;
export type ChecklistAssignment = typeof checklistAssignment.$inferSelect;
export type ChecklistCompletion = typeof checklistCompletion.$inferSelect;

export type Employee = typeof employee.$inferSelect;
export type NewEmployee = typeof employee.$inferInsert;
export type Workstation = typeof workstation.$inferSelect;
export type NewWorkstation = typeof workstation.$inferInsert;
export type WorkstationAssignment = typeof workstationAssignment.$inferSelect;
export type WorkstationTimeline = typeof workstationTimeline.$inferSelect;
export type Note = typeof note.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;

export * from './auth.schema';
