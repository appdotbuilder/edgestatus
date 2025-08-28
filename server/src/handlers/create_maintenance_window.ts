import { db } from '../db';
import { maintenanceWindowsTable, maintenanceAffectedComponentsTable, statusPagesTable, usersTable, componentsTable } from '../db/schema';
import { type CreateMaintenanceWindowInput, type MaintenanceWindow } from '../schema';
import { eq } from 'drizzle-orm';

export const createMaintenanceWindow = async (input: CreateMaintenanceWindowInput): Promise<MaintenanceWindow> => {
  try {
    // Verify that the status page exists
    const statusPage = await db.select()
      .from(statusPagesTable)
      .where(eq(statusPagesTable.id, input.status_page_id))
      .execute();

    if (statusPage.length === 0) {
      throw new Error(`Status page with id ${input.status_page_id} not found`);
    }

    // Verify that the creator user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.created_by} not found`);
    }

    // Verify that all affected components exist and belong to the status page
    if (input.affected_component_ids.length > 0) {
      const components = await db.select()
        .from(componentsTable)
        .where(eq(componentsTable.status_page_id, input.status_page_id))
        .execute();

      const validComponentIds = components.map(c => c.id);
      const invalidComponentIds = input.affected_component_ids.filter(id => !validComponentIds.includes(id));

      if (invalidComponentIds.length > 0) {
        throw new Error(`Components with ids ${invalidComponentIds.join(', ')} not found or do not belong to the status page`);
      }
    }

    // Insert the maintenance window record
    const result = await db.insert(maintenanceWindowsTable)
      .values({
        status_page_id: input.status_page_id,
        title: input.title,
        description: input.description,
        scheduled_start: input.scheduled_start,
        scheduled_end: input.scheduled_end,
        created_by: input.created_by
      })
      .returning()
      .execute();

    const maintenanceWindow = result[0];

    // Create entries in maintenance_affected_components table for each affected component
    if (input.affected_component_ids.length > 0) {
      await db.insert(maintenanceAffectedComponentsTable)
        .values(
          input.affected_component_ids.map(component_id => ({
            maintenance_window_id: maintenanceWindow.id,
            component_id
          }))
        )
        .execute();
    }

    return maintenanceWindow;
  } catch (error) {
    console.error('Maintenance window creation failed:', error);
    throw error;
  }
};