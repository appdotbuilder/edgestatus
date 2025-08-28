import { db } from '../db';
import { statusPagesTable, organizationsTable } from '../db/schema';
import { type StatusPage } from '../schema';
import { eq } from 'drizzle-orm';

export const getStatusPages = async (organizationId: number): Promise<StatusPage[]> => {
  try {
    // First verify that the organization exists
    const organization = await db.select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, organizationId))
      .execute();

    if (organization.length === 0) {
      throw new Error(`Organization with id ${organizationId} not found`);
    }

    // Fetch all status pages for the organization
    const results = await db.select()
      .from(statusPagesTable)
      .where(eq(statusPagesTable.organization_id, organizationId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get status pages:', error);
    throw error;
  }
};