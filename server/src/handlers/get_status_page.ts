import { db } from '../db';
import { statusPagesTable } from '../db/schema';
import { type StatusPage } from '../schema';
import { eq } from 'drizzle-orm';

export const getStatusPage = async (id: number): Promise<StatusPage | null> => {
  try {
    const results = await db.select()
      .from(statusPagesTable)
      .where(eq(statusPagesTable.id, id))
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    const statusPage = results[0];
    return {
      ...statusPage,
      // Convert Date objects for consistent typing
      created_at: statusPage.created_at,
      updated_at: statusPage.updated_at
    };
  } catch (error) {
    console.error('Status page retrieval failed:', error);
    throw error;
  }
};