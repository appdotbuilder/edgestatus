import { db } from '../db';
import { 
  statusPagesTable, 
  componentsTable, 
  incidentsTable, 
  incidentUpdatesTable, 
  maintenanceWindowsTable,
  incidentAffectedComponentsTable,
  maintenanceAffectedComponentsTable
} from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteStatusPage = async (id: number): Promise<boolean> => {
  try {
    // Verify status page exists
    const statusPage = await db.select()
      .from(statusPagesTable)
      .where(eq(statusPagesTable.id, id))
      .execute();

    if (statusPage.length === 0) {
      return false; // Status page not found
    }

    // Start cascade deletion from most dependent tables to least dependent
    
    // 1. Delete incident updates (depends on incidents)
    const incidents = await db.select()
      .from(incidentsTable)
      .where(eq(incidentsTable.status_page_id, id))
      .execute();

    for (const incident of incidents) {
      await db.delete(incidentUpdatesTable)
        .where(eq(incidentUpdatesTable.incident_id, incident.id))
        .execute();
    }

    // 2. Delete incident affected components (junction table)
    for (const incident of incidents) {
      await db.delete(incidentAffectedComponentsTable)
        .where(eq(incidentAffectedComponentsTable.incident_id, incident.id))
        .execute();
    }

    // 3. Delete maintenance affected components (junction table)
    const maintenanceWindows = await db.select()
      .from(maintenanceWindowsTable)
      .where(eq(maintenanceWindowsTable.status_page_id, id))
      .execute();

    for (const maintenance of maintenanceWindows) {
      await db.delete(maintenanceAffectedComponentsTable)
        .where(eq(maintenanceAffectedComponentsTable.maintenance_window_id, maintenance.id))
        .execute();
    }

    // 4. Delete incidents
    await db.delete(incidentsTable)
      .where(eq(incidentsTable.status_page_id, id))
      .execute();

    // 5. Delete maintenance windows
    await db.delete(maintenanceWindowsTable)
      .where(eq(maintenanceWindowsTable.status_page_id, id))
      .execute();

    // 6. Delete components
    await db.delete(componentsTable)
      .where(eq(componentsTable.status_page_id, id))
      .execute();

    // 7. Finally delete the status page itself
    await db.delete(statusPagesTable)
      .where(eq(statusPagesTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Status page deletion failed:', error);
    throw error;
  }
};