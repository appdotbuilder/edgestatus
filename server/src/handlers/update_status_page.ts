import { db } from '../db';
import { statusPagesTable } from '../db/schema';
import { type UpdateStatusPageInput, type StatusPage } from '../schema';
import { eq } from 'drizzle-orm';

export const updateStatusPage = async (input: UpdateStatusPageInput): Promise<StatusPage> => {
  try {
    // Check if status page exists
    const existingStatusPages = await db.select()
      .from(statusPagesTable)
      .where(eq(statusPagesTable.id, input.id))
      .execute();

    if (existingStatusPages.length === 0) {
      throw new Error(`Status page with ID ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData['name'] = input.name;
    }
    if (input.description !== undefined) {
      updateData['description'] = input.description;
    }
    if (input.custom_domain !== undefined) {
      updateData['custom_domain'] = input.custom_domain;
    }
    if (input.branding_logo_url !== undefined) {
      updateData['branding_logo_url'] = input.branding_logo_url;
    }
    if (input.branding_primary_color !== undefined) {
      updateData['branding_primary_color'] = input.branding_primary_color;
    }
    if (input.branding_secondary_color !== undefined) {
      updateData['branding_secondary_color'] = input.branding_secondary_color;
    }
    if (input.is_public !== undefined) {
      updateData['is_public'] = input.is_public;
    }

    // Update the status page
    const result = await db.update(statusPagesTable)
      .set(updateData)
      .where(eq(statusPagesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Status page update failed:', error);
    throw error;
  }
};