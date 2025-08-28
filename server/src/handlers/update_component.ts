import { db } from '../db';
import { componentsTable } from '../db/schema';
import { type UpdateComponentInput, type Component } from '../schema';
import { eq } from 'drizzle-orm';

export const updateComponent = async (input: UpdateComponentInput): Promise<Component> => {
  try {
    // Verify component exists first
    const existingComponent = await db.select()
      .from(componentsTable)
      .where(eq(componentsTable.id, input.id))
      .execute();

    if (existingComponent.length === 0) {
      throw new Error(`Component with id ${input.id} not found`);
    }

    // Build update object only with provided fields
    const updateData: Partial<typeof componentsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.position !== undefined) {
      updateData.position = input.position;
    }

    // Update component record
    const result = await db.update(componentsTable)
      .set(updateData)
      .where(eq(componentsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Component update failed:', error);
    throw error;
  }
};