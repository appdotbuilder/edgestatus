import { db } from '../db';
import { maintenanceWindowsTable } from '../db/schema';
import { type UpdateMaintenanceWindowInput, type MaintenanceWindow } from '../schema';
import { eq } from 'drizzle-orm';

export const updateMaintenanceWindow = async (input: UpdateMaintenanceWindowInput): Promise<MaintenanceWindow> => {
  try {
    // Prepare update object with provided fields
    const updateData: Partial<typeof maintenanceWindowsTable.$inferInsert> = {
      updated_at: new Date()
    };

    // Add provided fields to update
    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.scheduled_start !== undefined) {
      updateData.scheduled_start = input.scheduled_start;
    }
    if (input.scheduled_end !== undefined) {
      updateData.scheduled_end = input.scheduled_end;
    }
    if (input.actual_start !== undefined) {
      updateData.actual_start = input.actual_start;
    }
    if (input.actual_end !== undefined) {
      updateData.actual_end = input.actual_end;
    }

    // Handle status changes with automatic timestamp management
    if (input.status !== undefined) {
      updateData.status = input.status;
      
      // Set actual_start when maintenance begins
      if (input.status === 'in_progress' && updateData.actual_start === undefined) {
        updateData.actual_start = new Date();
      }
      
      // Set actual_end when maintenance completes or is cancelled
      if ((input.status === 'completed' || input.status === 'cancelled') && updateData.actual_end === undefined) {
        updateData.actual_end = new Date();
      }
      
      // Clear actual timestamps if going back to scheduled
      if (input.status === 'scheduled') {
        updateData.actual_start = null;
        updateData.actual_end = null;
      }
    }

    // Update maintenance window record
    const result = await db.update(maintenanceWindowsTable)
      .set(updateData)
      .where(eq(maintenanceWindowsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Maintenance window with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Maintenance window update failed:', error);
    throw error;
  }
};