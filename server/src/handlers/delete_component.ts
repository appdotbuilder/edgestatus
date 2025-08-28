import { db } from '../db';
import { componentsTable, incidentAffectedComponentsTable, maintenanceAffectedComponentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteComponent = async (id: number): Promise<boolean> => {
  try {
    // First, check if component exists
    const existingComponent = await db.select()
      .from(componentsTable)
      .where(eq(componentsTable.id, id))
      .execute();

    if (existingComponent.length === 0) {
      return false;
    }

    // Delete related data first to maintain referential integrity
    
    // Remove component from incident affected components
    await db.delete(incidentAffectedComponentsTable)
      .where(eq(incidentAffectedComponentsTable.component_id, id))
      .execute();

    // Remove component from maintenance affected components
    await db.delete(maintenanceAffectedComponentsTable)
      .where(eq(maintenanceAffectedComponentsTable.component_id, id))
      .execute();

    // Finally, delete the component itself
    const result = await db.delete(componentsTable)
      .where(eq(componentsTable.id, id))
      .execute();

    // Return true if component was successfully deleted
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Component deletion failed:', error);
    throw error;
  }
};