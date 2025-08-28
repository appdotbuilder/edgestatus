import { db } from '../db';
import { statusPagesTable, organizationsTable } from '../db/schema';
import { type CreateStatusPageInput, type StatusPage } from '../schema';
import { eq, count } from 'drizzle-orm';

export const createStatusPage = async (input: CreateStatusPageInput): Promise<StatusPage> => {
  try {
    // First, get the organization to check its plan type
    const organization = await db.select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, input.organization_id))
      .execute();

    if (organization.length === 0) {
      throw new Error('Organization not found');
    }

    const org = organization[0];

    // Count existing status pages for this organization
    const statusPageCount = await db.select({ count: count() })
      .from(statusPagesTable)
      .where(eq(statusPagesTable.organization_id, input.organization_id))
      .execute();

    const currentCount = statusPageCount[0].count;

    // Define plan limits
    const planLimits = {
      free: 1,
      pro: 3,
      plus: 12,
      enterprise: 100
    };

    const limit = planLimits[org.plan_type];
    
    // Check if the organization has reached its plan limit
    if (currentCount >= limit) {
      throw new Error(`Plan limit exceeded. ${org.plan_type} plan allows maximum ${limit} status pages`);
    }

    // Insert the new status page
    const result = await db.insert(statusPagesTable)
      .values({
        organization_id: input.organization_id,
        name: input.name,
        slug: input.slug,
        description: input.description,
        custom_domain: input.custom_domain,
        branding_logo_url: input.branding_logo_url,
        branding_primary_color: input.branding_primary_color,
        branding_secondary_color: input.branding_secondary_color,
        is_public: input.is_public
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Status page creation failed:', error);
    throw error;
  }
};