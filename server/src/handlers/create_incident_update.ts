import { db } from '../db';
import { incidentUpdatesTable, incidentsTable } from '../db/schema';
import { type CreateIncidentUpdateInput, type IncidentUpdate } from '../schema';
import { eq } from 'drizzle-orm';

export const createIncidentUpdate = async (input: CreateIncidentUpdateInput): Promise<IncidentUpdate> => {
  try {
    // Start a transaction to ensure both operations succeed or fail together
    const result = await db.transaction(async (tx) => {
      // Insert the incident update
      const updateResult = await tx.insert(incidentUpdatesTable)
        .values({
          incident_id: input.incident_id,
          title: input.title,
          description: input.description,
          status: input.status,
          created_by: input.created_by
        })
        .returning()
        .execute();

      const incidentUpdate = updateResult[0];

      // Update the parent incident's status and updated_at timestamp
      await tx.update(incidentsTable)
        .set({
          status: input.status,
          updated_at: new Date(),
          // If status is resolved, set resolved_at timestamp
          ...(input.status === 'resolved' && { resolved_at: new Date() })
        })
        .where(eq(incidentsTable.id, input.incident_id))
        .execute();

      return incidentUpdate;
    });

    return result;
  } catch (error) {
    console.error('Incident update creation failed:', error);
    throw error;
  }
};