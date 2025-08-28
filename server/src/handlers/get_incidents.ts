import { db } from '../db';
import { incidentsTable } from '../db/schema';
import { type Incident } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getIncidents = async (statusPageId: number): Promise<Incident[]> => {
  try {
    // Query incidents for the specific status page, ordered by created_at DESC
    const results = await db.select()
      .from(incidentsTable)
      .where(eq(incidentsTable.status_page_id, statusPageId))
      .orderBy(desc(incidentsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch incidents:', error);
    throw error;
  }
};