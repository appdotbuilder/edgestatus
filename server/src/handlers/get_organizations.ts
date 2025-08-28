import { db } from '../db';
import { organizationsTable, organizationMembersTable } from '../db/schema';
import { type Organization } from '../schema';
import { eq, or } from 'drizzle-orm';

export const getOrganizations = async (userId: number): Promise<Organization[]> => {
  try {
    // Get organizations where user is either owner or member
    const results = await db.select({
      id: organizationsTable.id,
      name: organizationsTable.name,
      slug: organizationsTable.slug,
      plan_type: organizationsTable.plan_type,
      owner_id: organizationsTable.owner_id,
      created_at: organizationsTable.created_at,
      updated_at: organizationsTable.updated_at
    })
    .from(organizationsTable)
    .leftJoin(organizationMembersTable, eq(organizationsTable.id, organizationMembersTable.organization_id))
    .where(
      or(
        eq(organizationsTable.owner_id, userId),
        eq(organizationMembersTable.user_id, userId)
      )
    )
    .execute();

    // Remove duplicates (user could be both owner and member)
    const uniqueOrganizations = results.reduce((acc: Organization[], result) => {
      const existing = acc.find(org => org.id === result.id);
      if (!existing) {
        acc.push(result);
      }
      return acc;
    }, []);

    return uniqueOrganizations;
  } catch (error) {
    console.error('Failed to fetch organizations:', error);
    throw error;
  }
};