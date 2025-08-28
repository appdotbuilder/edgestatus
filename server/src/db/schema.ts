import { serial, text, pgTable, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const planTypeEnum = pgEnum('plan_type', ['free', 'pro', 'plus', 'enterprise']);
export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'member', 'viewer']);
export const incidentStatusEnum = pgEnum('incident_status', ['investigating', 'identified', 'monitoring', 'resolved']);
export const maintenanceStatusEnum = pgEnum('maintenance_status', ['scheduled', 'in_progress', 'completed', 'cancelled']);
export const componentStatusEnum = pgEnum('component_status', ['operational', 'performance_issues', 'partial_outage', 'major_outage', 'under_maintenance']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  role: userRoleEnum('role').notNull().default('member'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Organizations table
export const organizationsTable = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan_type: planTypeEnum('plan_type').notNull().default('free'),
  owner_id: integer('owner_id').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Status pages table
export const statusPagesTable = pgTable('status_pages', {
  id: serial('id').primaryKey(),
  organization_id: integer('organization_id').notNull().references(() => organizationsTable.id),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  custom_domain: text('custom_domain'),
  branding_logo_url: text('branding_logo_url'),
  branding_primary_color: text('branding_primary_color'),
  branding_secondary_color: text('branding_secondary_color'),
  is_public: boolean('is_public').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Components table
export const componentsTable = pgTable('components', {
  id: serial('id').primaryKey(),
  status_page_id: integer('status_page_id').notNull().references(() => statusPagesTable.id),
  name: text('name').notNull(),
  description: text('description'),
  status: componentStatusEnum('status').notNull().default('operational'),
  position: integer('position').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Incidents table
export const incidentsTable = pgTable('incidents', {
  id: serial('id').primaryKey(),
  status_page_id: integer('status_page_id').notNull().references(() => statusPagesTable.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: incidentStatusEnum('status').notNull().default('investigating'),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  resolved_at: timestamp('resolved_at'),
});

// Incident updates table
export const incidentUpdatesTable = pgTable('incident_updates', {
  id: serial('id').primaryKey(),
  incident_id: integer('incident_id').notNull().references(() => incidentsTable.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: incidentStatusEnum('status').notNull(),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Maintenance windows table
export const maintenanceWindowsTable = pgTable('maintenance_windows', {
  id: serial('id').primaryKey(),
  status_page_id: integer('status_page_id').notNull().references(() => statusPagesTable.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: maintenanceStatusEnum('status').notNull().default('scheduled'),
  scheduled_start: timestamp('scheduled_start').notNull(),
  scheduled_end: timestamp('scheduled_end').notNull(),
  actual_start: timestamp('actual_start'),
  actual_end: timestamp('actual_end'),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Organization members table (many-to-many relationship)
export const organizationMembersTable = pgTable('organization_members', {
  id: serial('id').primaryKey(),
  organization_id: integer('organization_id').notNull().references(() => organizationsTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  role: userRoleEnum('role').notNull().default('member'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Incident affected components table (many-to-many relationship)
export const incidentAffectedComponentsTable = pgTable('incident_affected_components', {
  id: serial('id').primaryKey(),
  incident_id: integer('incident_id').notNull().references(() => incidentsTable.id),
  component_id: integer('component_id').notNull().references(() => componentsTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Maintenance affected components table (many-to-many relationship)
export const maintenanceAffectedComponentsTable = pgTable('maintenance_affected_components', {
  id: serial('id').primaryKey(),
  maintenance_window_id: integer('maintenance_window_id').notNull().references(() => maintenanceWindowsTable.id),
  component_id: integer('component_id').notNull().references(() => componentsTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many, one }) => ({
  ownedOrganizations: many(organizationsTable),
  organizationMemberships: many(organizationMembersTable),
  createdIncidents: many(incidentsTable),
  createdIncidentUpdates: many(incidentUpdatesTable),
  createdMaintenanceWindows: many(maintenanceWindowsTable),
}));

export const organizationsRelations = relations(organizationsTable, ({ one, many }) => ({
  owner: one(usersTable, {
    fields: [organizationsTable.owner_id],
    references: [usersTable.id],
  }),
  statusPages: many(statusPagesTable),
  members: many(organizationMembersTable),
}));

export const statusPagesRelations = relations(statusPagesTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [statusPagesTable.organization_id],
    references: [organizationsTable.id],
  }),
  components: many(componentsTable),
  incidents: many(incidentsTable),
  maintenanceWindows: many(maintenanceWindowsTable),
}));

export const componentsRelations = relations(componentsTable, ({ one, many }) => ({
  statusPage: one(statusPagesTable, {
    fields: [componentsTable.status_page_id],
    references: [statusPagesTable.id],
  }),
  incidentAffected: many(incidentAffectedComponentsTable),
  maintenanceAffected: many(maintenanceAffectedComponentsTable),
}));

export const incidentsRelations = relations(incidentsTable, ({ one, many }) => ({
  statusPage: one(statusPagesTable, {
    fields: [incidentsTable.status_page_id],
    references: [statusPagesTable.id],
  }),
  createdBy: one(usersTable, {
    fields: [incidentsTable.created_by],
    references: [usersTable.id],
  }),
  updates: many(incidentUpdatesTable),
  affectedComponents: many(incidentAffectedComponentsTable),
}));

export const incidentUpdatesRelations = relations(incidentUpdatesTable, ({ one }) => ({
  incident: one(incidentsTable, {
    fields: [incidentUpdatesTable.incident_id],
    references: [incidentsTable.id],
  }),
  createdBy: one(usersTable, {
    fields: [incidentUpdatesTable.created_by],
    references: [usersTable.id],
  }),
}));

export const maintenanceWindowsRelations = relations(maintenanceWindowsTable, ({ one, many }) => ({
  statusPage: one(statusPagesTable, {
    fields: [maintenanceWindowsTable.status_page_id],
    references: [statusPagesTable.id],
  }),
  createdBy: one(usersTable, {
    fields: [maintenanceWindowsTable.created_by],
    references: [usersTable.id],
  }),
  affectedComponents: many(maintenanceAffectedComponentsTable),
}));

export const organizationMembersRelations = relations(organizationMembersTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [organizationMembersTable.organization_id],
    references: [organizationsTable.id],
  }),
  user: one(usersTable, {
    fields: [organizationMembersTable.user_id],
    references: [usersTable.id],
  }),
}));

export const incidentAffectedComponentsRelations = relations(incidentAffectedComponentsTable, ({ one }) => ({
  incident: one(incidentsTable, {
    fields: [incidentAffectedComponentsTable.incident_id],
    references: [incidentsTable.id],
  }),
  component: one(componentsTable, {
    fields: [incidentAffectedComponentsTable.component_id],
    references: [componentsTable.id],
  }),
}));

export const maintenanceAffectedComponentsRelations = relations(maintenanceAffectedComponentsTable, ({ one }) => ({
  maintenanceWindow: one(maintenanceWindowsTable, {
    fields: [maintenanceAffectedComponentsTable.maintenance_window_id],
    references: [maintenanceWindowsTable.id],
  }),
  component: one(componentsTable, {
    fields: [maintenanceAffectedComponentsTable.component_id],
    references: [componentsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Organization = typeof organizationsTable.$inferSelect;
export type NewOrganization = typeof organizationsTable.$inferInsert;

export type StatusPage = typeof statusPagesTable.$inferSelect;
export type NewStatusPage = typeof statusPagesTable.$inferInsert;

export type Component = typeof componentsTable.$inferSelect;
export type NewComponent = typeof componentsTable.$inferInsert;

export type Incident = typeof incidentsTable.$inferSelect;
export type NewIncident = typeof incidentsTable.$inferInsert;

export type IncidentUpdate = typeof incidentUpdatesTable.$inferSelect;
export type NewIncidentUpdate = typeof incidentUpdatesTable.$inferInsert;

export type MaintenanceWindow = typeof maintenanceWindowsTable.$inferSelect;
export type NewMaintenanceWindow = typeof maintenanceWindowsTable.$inferInsert;

export type OrganizationMember = typeof organizationMembersTable.$inferSelect;
export type NewOrganizationMember = typeof organizationMembersTable.$inferInsert;

export type IncidentAffectedComponent = typeof incidentAffectedComponentsTable.$inferSelect;
export type NewIncidentAffectedComponent = typeof incidentAffectedComponentsTable.$inferInsert;

export type MaintenanceAffectedComponent = typeof maintenanceAffectedComponentsTable.$inferSelect;
export type NewMaintenanceAffectedComponent = typeof maintenanceAffectedComponentsTable.$inferInsert;

// Important: Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  organizations: organizationsTable,
  statusPages: statusPagesTable,
  components: componentsTable,
  incidents: incidentsTable,
  incidentUpdates: incidentUpdatesTable,
  maintenanceWindows: maintenanceWindowsTable,
  organizationMembers: organizationMembersTable,
  incidentAffectedComponents: incidentAffectedComponentsTable,
  maintenanceAffectedComponents: maintenanceAffectedComponentsTable,
};