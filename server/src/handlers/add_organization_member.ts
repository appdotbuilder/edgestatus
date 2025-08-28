import { db } from '../db';
import { organizationsTable, organizationMembersTable, usersTable } from '../db/schema';
import { type OrganizationMember, type UserRole } from '../schema';
import { eq, and, count } from 'drizzle-orm';

export const addOrganizationMember = async (organizationId: number, userId: number, role: UserRole = 'member'): Promise<OrganizationMember> => {
  try {
    // Verify organization exists and get plan type
    const organizations = await db.select({
      id: organizationsTable.id,
      plan_type: organizationsTable.plan_type
    })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, organizationId))
      .execute();

    if (organizations.length === 0) {
      throw new Error('Organization not found');
    }

    const organization = organizations[0];

    // Verify user exists
    const users = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    // Check if user is already a member
    const existingMembers = await db.select({ id: organizationMembersTable.id })
      .from(organizationMembersTable)
      .where(
        and(
          eq(organizationMembersTable.organization_id, organizationId),
          eq(organizationMembersTable.user_id, userId)
        )
      )
      .execute();

    if (existingMembers.length > 0) {
      throw new Error('User is already a member of this organization');
    }

    // Check plan limits
    const memberCountResult = await db.select({ count: count() })
      .from(organizationMembersTable)
      .where(eq(organizationMembersTable.organization_id, organizationId))
      .execute();

    const currentMemberCount = memberCountResult[0].count;

    // Define plan limits
    const planLimits = {
      free: 7,
      pro: 35,
      plus: 50,
      enterprise: Infinity
    };

    const limit = planLimits[organization.plan_type];
    if (currentMemberCount >= limit) {
      throw new Error(`Organization has reached the member limit for ${organization.plan_type} plan (${limit} members)`);
    }

    // Add the member
    const result = await db.insert(organizationMembersTable)
      .values({
        organization_id: organizationId,
        user_id: userId,
        role: role
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Add organization member failed:', error);
    throw error;
  }
};