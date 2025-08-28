import { db } from '../db';
import { incidentUpdatesTable } from '../db/schema';
import { type IncidentUpdate } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getIncidentUpdates = async (incidentId: number): Promise<IncidentUpdate[]> => {
  try {
    const results = await db.select()
      .from(incidentUpdatesTable)
      .where(eq(incidentUpdatesTable.incident_id, incidentId))
      .orderBy(desc(incidentUpdatesTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get incident updates:', error);
    throw error;
  }
};