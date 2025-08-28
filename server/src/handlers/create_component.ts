import { db } from '../db';
import { componentsTable, statusPagesTable, organizationsTable } from '../db/schema';
import { type CreateComponentInput, type Component } from '../schema';
import { eq, count } from 'drizzle-orm';

export const createComponent = async (input: CreateComponentInput): Promise<Component> => {
  try {
    // First, validate that the status page exists and get organization plan type
    const statusPageResult = await db.select({
      status_page_id: statusPagesTable.id,
      organization_id: statusPagesTable.organization_id,
      plan_type: organizationsTable.plan_type
    })
    .from(statusPagesTable)
    .innerJoin(organizationsTable, eq(statusPagesTable.organization_id, organizationsTable.id))
    .where(eq(statusPagesTable.id, input.status_page_id))
    .execute();

    if (statusPageResult.length === 0) {
      throw new Error('Status page not found');
    }

    const { plan_type } = statusPageResult[0];

    // Check component count limits based on plan type
    const componentCountResult = await db.select({ count: count() })
      .from(componentsTable)
      .where(eq(componentsTable.status_page_id, input.status_page_id))
      .execute();

    const currentComponentCount = componentCountResult[0].count;

    // Define plan limits
    const planLimits = {
      free: 7,
      pro: 36,
      plus: 60,
      enterprise: Infinity
    };

    const limit = planLimits[plan_type];
    if (currentComponentCount >= limit) {
      throw new Error(`Component limit exceeded for ${plan_type} plan (limit: ${limit === Infinity ? 'unlimited' : limit})`);
    }

    // Insert the component
    const result = await db.insert(componentsTable)
      .values({
        status_page_id: input.status_page_id,
        name: input.name,
        description: input.description,
        status: input.status,
        position: input.position
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Component creation failed:', error);
    throw error;
  }
};