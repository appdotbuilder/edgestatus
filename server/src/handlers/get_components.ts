import { db } from '../db';
import { componentsTable } from '../db/schema';
import { type Component } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getComponents = async (statusPageId: number): Promise<Component[]> => {
  try {
    // Query components for the specific status page, ordered by position
    const results = await db.select()
      .from(componentsTable)
      .where(eq(componentsTable.status_page_id, statusPageId))
      .orderBy(asc(componentsTable.position))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch components:', error);
    throw error;
  }
};