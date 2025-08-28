import { z } from 'zod';

// Enums for various status and role types
export const planTypeSchema = z.enum(['free', 'pro', 'plus', 'enterprise']);
export type PlanType = z.infer<typeof planTypeSchema>;

export const userRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const incidentStatusSchema = z.enum(['investigating', 'identified', 'monitoring', 'resolved']);
export type IncidentStatus = z.infer<typeof incidentStatusSchema>;

export const maintenanceStatusSchema = z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']);
export type MaintenanceStatus = z.infer<typeof maintenanceStatusSchema>;

export const componentStatusSchema = z.enum(['operational', 'performance_issues', 'partial_outage', 'major_outage', 'under_maintenance']);
export type ComponentStatus = z.infer<typeof componentStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Organization schema
export const organizationSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  plan_type: planTypeSchema,
  owner_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Organization = z.infer<typeof organizationSchema>;

// Status page schema
export const statusPageSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  custom_domain: z.string().nullable(),
  branding_logo_url: z.string().nullable(),
  branding_primary_color: z.string().nullable(),
  branding_secondary_color: z.string().nullable(),
  is_public: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type StatusPage = z.infer<typeof statusPageSchema>;

// Component schema
export const componentSchema = z.object({
  id: z.number(),
  status_page_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  status: componentStatusSchema,
  position: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Component = z.infer<typeof componentSchema>;

// Incident schema
export const incidentSchema = z.object({
  id: z.number(),
  status_page_id: z.number(),
  title: z.string(),
  description: z.string(),
  status: incidentStatusSchema,
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  resolved_at: z.coerce.date().nullable()
});

export type Incident = z.infer<typeof incidentSchema>;

// Incident update schema
export const incidentUpdateSchema = z.object({
  id: z.number(),
  incident_id: z.number(),
  title: z.string(),
  description: z.string(),
  status: incidentStatusSchema,
  created_by: z.number(),
  created_at: z.coerce.date()
});

export type IncidentUpdate = z.infer<typeof incidentUpdateSchema>;

// Maintenance window schema
export const maintenanceWindowSchema = z.object({
  id: z.number(),
  status_page_id: z.number(),
  title: z.string(),
  description: z.string(),
  status: maintenanceStatusSchema,
  scheduled_start: z.coerce.date(),
  scheduled_end: z.coerce.date(),
  actual_start: z.coerce.date().nullable(),
  actual_end: z.coerce.date().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type MaintenanceWindow = z.infer<typeof maintenanceWindowSchema>;

// Organization member schema
export const organizationMemberSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  user_id: z.number(),
  role: userRoleSchema,
  created_at: z.coerce.date()
});

export type OrganizationMember = z.infer<typeof organizationMemberSchema>;

// Incident affected components schema
export const incidentAffectedComponentSchema = z.object({
  id: z.number(),
  incident_id: z.number(),
  component_id: z.number(),
  created_at: z.coerce.date()
});

export type IncidentAffectedComponent = z.infer<typeof incidentAffectedComponentSchema>;

// Maintenance affected components schema
export const maintenanceAffectedComponentSchema = z.object({
  id: z.number(),
  maintenance_window_id: z.number(),
  component_id: z.number(),
  created_at: z.coerce.date()
});

export type MaintenanceAffectedComponent = z.infer<typeof maintenanceAffectedComponentSchema>;

// Input schemas for creating entities
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleSchema.default('member')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createOrganizationInputSchema = z.object({
  name: z.string(),
  slug: z.string(),
  plan_type: planTypeSchema.default('free'),
  owner_id: z.number()
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationInputSchema>;

export const createStatusPageInputSchema = z.object({
  organization_id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  custom_domain: z.string().nullable(),
  branding_logo_url: z.string().nullable(),
  branding_primary_color: z.string().nullable(),
  branding_secondary_color: z.string().nullable(),
  is_public: z.boolean().default(true)
});

export type CreateStatusPageInput = z.infer<typeof createStatusPageInputSchema>;

export const createComponentInputSchema = z.object({
  status_page_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  status: componentStatusSchema.default('operational'),
  position: z.number().int().default(0)
});

export type CreateComponentInput = z.infer<typeof createComponentInputSchema>;

export const createIncidentInputSchema = z.object({
  status_page_id: z.number(),
  title: z.string(),
  description: z.string(),
  status: incidentStatusSchema.default('investigating'),
  created_by: z.number(),
  affected_component_ids: z.array(z.number()).default([])
});

export type CreateIncidentInput = z.infer<typeof createIncidentInputSchema>;

export const createIncidentUpdateInputSchema = z.object({
  incident_id: z.number(),
  title: z.string(),
  description: z.string(),
  status: incidentStatusSchema,
  created_by: z.number()
});

export type CreateIncidentUpdateInput = z.infer<typeof createIncidentUpdateInputSchema>;

export const createMaintenanceWindowInputSchema = z.object({
  status_page_id: z.number(),
  title: z.string(),
  description: z.string(),
  scheduled_start: z.coerce.date(),
  scheduled_end: z.coerce.date(),
  created_by: z.number(),
  affected_component_ids: z.array(z.number()).default([])
});

export type CreateMaintenanceWindowInput = z.infer<typeof createMaintenanceWindowInputSchema>;

// Update schemas
export const updateStatusPageInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  custom_domain: z.string().nullable().optional(),
  branding_logo_url: z.string().nullable().optional(),
  branding_primary_color: z.string().nullable().optional(),
  branding_secondary_color: z.string().nullable().optional(),
  is_public: z.boolean().optional()
});

export type UpdateStatusPageInput = z.infer<typeof updateStatusPageInputSchema>;

export const updateComponentInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  status: componentStatusSchema.optional(),
  position: z.number().int().optional()
});

export type UpdateComponentInput = z.infer<typeof updateComponentInputSchema>;

export const updateIncidentInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  description: z.string().optional(),
  status: incidentStatusSchema.optional()
});

export type UpdateIncidentInput = z.infer<typeof updateIncidentInputSchema>;

export const updateMaintenanceWindowInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  description: z.string().optional(),
  status: maintenanceStatusSchema.optional(),
  scheduled_start: z.coerce.date().optional(),
  scheduled_end: z.coerce.date().optional(),
  actual_start: z.coerce.date().nullable().optional(),
  actual_end: z.coerce.date().nullable().optional()
});

export type UpdateMaintenanceWindowInput = z.infer<typeof updateMaintenanceWindowInputSchema>;