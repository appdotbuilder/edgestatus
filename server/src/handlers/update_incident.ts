import { db } from '../db';
import { incidentsTable } from '../db/schema';
import { type UpdateIncidentInput, type Incident } from '../schema';
import { eq } from 'drizzle-orm';

export const updateIncident = async (input: UpdateIncidentInput): Promise<Incident> => {
  try {
    // Build the update values object dynamically
    const updateValues: any = {
      updated_at: new Date()
    };

    // Only include fields that are provided in the input
    if (input.title !== undefined) {
      updateValues.title = input.title;
    }
    
    if (input.description !== undefined) {
      updateValues.description = input.description;
    }
    
    if (input.status !== undefined) {
      updateValues.status = input.status;
      
      // Set resolved_at timestamp when status changes to 'resolved'
      if (input.status === 'resolved') {
        updateValues.resolved_at = new Date();
      } else {
        // Clear resolved_at if status changes away from resolved
        updateValues.resolved_at = null;
      }
    }

    // Update the incident record
    const result = await db.update(incidentsTable)
      .set(updateValues)
      .where(eq(incidentsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Incident with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Incident update failed:', error);
    throw error;
  }
};