import { db } from '../db';
import { maintenanceWindowsTable } from '../db/schema';
import { type MaintenanceWindow } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getMaintenanceWindows = async (statusPageId: number): Promise<MaintenanceWindow[]> => {
  try {
    const results = await db.select()
      .from(maintenanceWindowsTable)
      .where(eq(maintenanceWindowsTable.status_page_id, statusPageId))
      .orderBy(desc(maintenanceWindowsTable.scheduled_start))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch maintenance windows:', error);
    throw error;
  }
};