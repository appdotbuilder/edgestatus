import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import { 
  createUserInputSchema,
  createOrganizationInputSchema,
  createStatusPageInputSchema,
  createComponentInputSchema,
  createIncidentInputSchema,
  createIncidentUpdateInputSchema,
  createMaintenanceWindowInputSchema,
  updateStatusPageInputSchema,
  updateComponentInputSchema,
  updateIncidentInputSchema,
  updateMaintenanceWindowInputSchema,
  userRoleSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { createOrganization } from './handlers/create_organization';
import { createStatusPage } from './handlers/create_status_page';
import { createComponent } from './handlers/create_component';
import { createIncident } from './handlers/create_incident';
import { createIncidentUpdate } from './handlers/create_incident_update';
import { createMaintenanceWindow } from './handlers/create_maintenance_window';
import { getStatusPages } from './handlers/get_status_pages';
import { getStatusPage } from './handlers/get_status_page';
import { getComponents } from './handlers/get_components';
import { getIncidents } from './handlers/get_incidents';
import { getIncidentUpdates } from './handlers/get_incident_updates';
import { getMaintenanceWindows } from './handlers/get_maintenance_windows';
import { getOrganizations } from './handlers/get_organizations';
import { updateStatusPage } from './handlers/update_status_page';
import { updateComponent } from './handlers/update_component';
import { updateIncident } from './handlers/update_incident';
import { updateMaintenanceWindow } from './handlers/update_maintenance_window';
import { addOrganizationMember } from './handlers/add_organization_member';
import { deleteStatusPage } from './handlers/delete_status_page';
import { deleteComponent } from './handlers/delete_component';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  // Organization management
  createOrganization: publicProcedure
    .input(createOrganizationInputSchema)
    .mutation(({ input }) => createOrganization(input)),

  getOrganizations: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getOrganizations(input.userId)),

  addOrganizationMember: publicProcedure
    .input(z.object({ 
      organizationId: z.number(), 
      userId: z.number(), 
      role: userRoleSchema.optional() 
    }))
    .mutation(({ input }) => addOrganizationMember(input.organizationId, input.userId, input.role)),

  // Status page management
  createStatusPage: publicProcedure
    .input(createStatusPageInputSchema)
    .mutation(({ input }) => createStatusPage(input)),

  getStatusPages: publicProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(({ input }) => getStatusPages(input.organizationId)),

  getStatusPage: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getStatusPage(input.id)),

  updateStatusPage: publicProcedure
    .input(updateStatusPageInputSchema)
    .mutation(({ input }) => updateStatusPage(input)),

  deleteStatusPage: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteStatusPage(input.id)),

  // Component management
  createComponent: publicProcedure
    .input(createComponentInputSchema)
    .mutation(({ input }) => createComponent(input)),

  getComponents: publicProcedure
    .input(z.object({ statusPageId: z.number() }))
    .query(({ input }) => getComponents(input.statusPageId)),

  updateComponent: publicProcedure
    .input(updateComponentInputSchema)
    .mutation(({ input }) => updateComponent(input)),

  deleteComponent: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteComponent(input.id)),

  // Incident management
  createIncident: publicProcedure
    .input(createIncidentInputSchema)
    .mutation(({ input }) => createIncident(input)),

  getIncidents: publicProcedure
    .input(z.object({ statusPageId: z.number() }))
    .query(({ input }) => getIncidents(input.statusPageId)),

  updateIncident: publicProcedure
    .input(updateIncidentInputSchema)
    .mutation(({ input }) => updateIncident(input)),

  // Incident updates
  createIncidentUpdate: publicProcedure
    .input(createIncidentUpdateInputSchema)
    .mutation(({ input }) => createIncidentUpdate(input)),

  getIncidentUpdates: publicProcedure
    .input(z.object({ incidentId: z.number() }))
    .query(({ input }) => getIncidentUpdates(input.incidentId)),

  // Maintenance window management
  createMaintenanceWindow: publicProcedure
    .input(createMaintenanceWindowInputSchema)
    .mutation(({ input }) => createMaintenanceWindow(input)),

  getMaintenanceWindows: publicProcedure
    .input(z.object({ statusPageId: z.number() }))
    .query(({ input }) => getMaintenanceWindows(input.statusPageId)),

  updateMaintenanceWindow: publicProcedure
    .input(updateMaintenanceWindowInputSchema)
    .mutation(({ input }) => updateMaintenanceWindow(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();