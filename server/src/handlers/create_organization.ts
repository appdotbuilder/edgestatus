import { db } from '../db';
import { organizationsTable, usersTable } from '../db/schema';
import { type CreateOrganizationInput, type Organization } from '../schema';
import { eq } from 'drizzle-orm';

export const createOrganization = async (input: CreateOrganizationInput): Promise<Organization> => {
  try {
    // Validate that the owner exists
    const existingOwner = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.owner_id))
      .execute();

    if (existingOwner.length === 0) {
      throw new Error(`Owner with ID ${input.owner_id} not found`);
    }

    // Check if slug already exists
    const existingSlug = await db.select()
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, input.slug))
      .execute();

    if (existingSlug.length > 0) {
      throw new Error(`Organization with slug '${input.slug}' already exists`);
    }

    // Insert organization record
    const result = await db.insert(organizationsTable)
      .values({
        name: input.name,
        slug: input.slug,
        plan_type: input.plan_type,
        owner_id: input.owner_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Organization creation failed:', error);
    throw error;
  }
};