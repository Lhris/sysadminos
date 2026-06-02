import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const task = sqliteTable('task', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});

export const employee = sqliteTable('employee', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	organizationId: text('organization_id'),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	microsoftEmail: text('microsoft_email').notNull().unique(),
	personalEmail: text('personal_email'),
	tempPassword: text('temp_password'),
	role: text('role').notNull(),
	country: text('country').notNull(),
	startDate: text('start_date').notNull(),
	status: text('status', { enum: ['active', 'onboarding', 'offboarding', 'terminated'] })
		.notNull()
		.default('onboarding'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export type Employee = typeof employee.$inferSelect;
export type NewEmployee = typeof employee.$inferInsert;

export const auditLog = sqliteTable('audit_log', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	organizationId: text('organization_id'),
	// dot-namespaced action: 'employee.created', 'workstation.assigned', etc.
	action: text('action').notNull(),
	entityType: text('entity_type').notNull(), // 'employee' | 'workstation' | 'order' | ...
	entityId: text('entity_id').notNull(),
	entityLabel: text('entity_label').notNull(), // denormalised display name
	actorId: text('actor_id'),
	actorLabel: text('actor_label'),
	metadata: text('metadata'), // JSON string for extra context
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
}, (t) => [
	index('audit_entity_id_idx').on(t.entityId),
	index('audit_entity_type_idx').on(t.entityType),
	index('audit_created_at_idx').on(t.createdAt)
]);

export type AuditLog = typeof auditLog.$inferSelect;

export const workstation = sqliteTable('workstation', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	organizationId: text('organization_id'),
	serialNumber: text('serial_number').notNull().unique(),
	make: text('make').notNull(),
	model: text('model').notNull(),
	deviceType: text('device_type', { enum: ['laptop', 'desktop', 'monitor', 'other'] }).notNull(),
	os: text('os'),
	cpu: text('cpu'),
	ram: text('ram'),
	orderDate: text('order_date'),
	warrantyExpiry: text('warranty_expiry'),
	location: text('location'),
	status: text('status', { enum: ['available', 'assigned', 'in_repair', 'flagged', 'retired'] })
		.notNull()
		.default('available'),
	assignedEmployeeId: text('assigned_employee_id').references(() => employee.id),
	notes: text('notes'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const workstationAssignment = sqliteTable('workstation_assignment', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	workstationId: text('workstation_id').notNull().references(() => workstation.id),
	employeeId: text('employee_id').notNull().references(() => employee.id),
	assignedAt: integer('assigned_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
	unassignedAt: integer('unassigned_at', { mode: 'timestamp' })
});

export type Workstation = typeof workstation.$inferSelect;
export type WorkstationAssignment = typeof workstationAssignment.$inferSelect;

export const workstationTimeline = sqliteTable('workstation_timeline', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	workstationId: text('workstation_id').notNull().references(() => workstation.id),
	employeeId: text('employee_id').references(() => employee.id),
	label: text('label'),
	startAt: text('start_at'),
	endAt: text('end_at'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
}, (t) => [
	index('timeline_workstation_idx').on(t.workstationId)
]);

export type WorkstationTimeline = typeof workstationTimeline.$inferSelect;

export const note = sqliteTable('note', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	entityType: text('entity_type').notNull(),
	entityId: text('entity_id').notNull(),
	body: text('body').notNull(),
	authorLabel: text('author_label'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
}, (t) => [
	index('note_entity_idx').on(t.entityType, t.entityId)
]);

export type Note = typeof note.$inferSelect;

export * from './auth.schema';
