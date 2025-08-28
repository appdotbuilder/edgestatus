import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, statusPagesTable, componentsTable } from '../db/schema';
import { type UpdateComponentInput } from '../schema';
import { updateComponent } from '../handlers/update_component';
import { eq } from 'drizzle-orm';

describe('updateComponent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Setup helper to create test data
  const createTestData = async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'owner'
      })
      .returning()
      .execute();

    // Create organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create status page
    const statusPageResult = await db.insert(statusPagesTable)
      .values({
        organization_id: orgResult[0].id,
        name: 'Test Status Page',
        slug: 'test-status-page',
        description: 'A test status page',
        is_public: true
      })
      .returning()
      .execute();

    // Create component
    const componentResult = await db.insert(componentsTable)
      .values({
        status_page_id: statusPageResult[0].id,
        name: 'Original Component',
        description: 'Original description',
        status: 'operational',
        position: 1
      })
      .returning()
      .execute();

    return {
      user: userResult[0],
      organization: orgResult[0],
      statusPage: statusPageResult[0],
      component: componentResult[0]
    };
  };

  it('should update component name', async () => {
    const testData = await createTestData();

    const updateInput: UpdateComponentInput = {
      id: testData.component.id,
      name: 'Updated Component Name'
    };

    const result = await updateComponent(updateInput);

    expect(result.name).toEqual('Updated Component Name');
    expect(result.id).toEqual(testData.component.id);
    expect(result.status_page_id).toEqual(testData.statusPage.id);
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.status).toEqual('operational'); // Should remain unchanged
    expect(result.position).toEqual(1); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update component description', async () => {
    const testData = await createTestData();

    const updateInput: UpdateComponentInput = {
      id: testData.component.id,
      description: 'Updated description'
    };

    const result = await updateComponent(updateInput);

    expect(result.description).toEqual('Updated description');
    expect(result.name).toEqual('Original Component'); // Should remain unchanged
    expect(result.status).toEqual('operational'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update component status', async () => {
    const testData = await createTestData();

    const updateInput: UpdateComponentInput = {
      id: testData.component.id,
      status: 'major_outage'
    };

    const result = await updateComponent(updateInput);

    expect(result.status).toEqual('major_outage');
    expect(result.name).toEqual('Original Component'); // Should remain unchanged
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update component position', async () => {
    const testData = await createTestData();

    const updateInput: UpdateComponentInput = {
      id: testData.component.id,
      position: 5
    };

    const result = await updateComponent(updateInput);

    expect(result.position).toEqual(5);
    expect(result.name).toEqual('Original Component'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const testData = await createTestData();

    const updateInput: UpdateComponentInput = {
      id: testData.component.id,
      name: 'Fully Updated Component',
      description: 'Fully updated description',
      status: 'under_maintenance',
      position: 10
    };

    const result = await updateComponent(updateInput);

    expect(result.name).toEqual('Fully Updated Component');
    expect(result.description).toEqual('Fully updated description');
    expect(result.status).toEqual('under_maintenance');
    expect(result.position).toEqual(10);
    expect(result.status_page_id).toEqual(testData.statusPage.id);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null description update', async () => {
    const testData = await createTestData();

    const updateInput: UpdateComponentInput = {
      id: testData.component.id,
      description: null
    };

    const result = await updateComponent(updateInput);

    expect(result.description).toBeNull();
    expect(result.name).toEqual('Original Component'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should persist changes to database', async () => {
    const testData = await createTestData();

    const updateInput: UpdateComponentInput = {
      id: testData.component.id,
      name: 'Database Test Component',
      status: 'performance_issues'
    };

    await updateComponent(updateInput);

    // Verify changes in database
    const componentsInDb = await db.select()
      .from(componentsTable)
      .where(eq(componentsTable.id, testData.component.id))
      .execute();

    expect(componentsInDb).toHaveLength(1);
    expect(componentsInDb[0].name).toEqual('Database Test Component');
    expect(componentsInDb[0].status).toEqual('performance_issues');
    expect(componentsInDb[0].description).toEqual('Original description'); // Unchanged
    expect(componentsInDb[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent component', async () => {
    const updateInput: UpdateComponentInput = {
      id: 99999,
      name: 'Non-existent Component'
    };

    expect(updateComponent(updateInput)).rejects.toThrow(/Component with id 99999 not found/i);
  });

  it('should update only updated_at when no other fields provided', async () => {
    const testData = await createTestData();

    const originalUpdatedAt = testData.component.updated_at;

    // Wait a small amount to ensure updated_at changes
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateComponentInput = {
      id: testData.component.id
    };

    const result = await updateComponent(updateInput);

    expect(result.name).toEqual('Original Component'); // Should remain unchanged
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.status).toEqual('operational'); // Should remain unchanged
    expect(result.position).toEqual(1); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should handle all possible component statuses', async () => {
    const testData = await createTestData();
    const statuses = ['operational', 'performance_issues', 'partial_outage', 'major_outage', 'under_maintenance'] as const;

    for (const status of statuses) {
      const updateInput: UpdateComponentInput = {
        id: testData.component.id,
        status: status
      };

      const result = await updateComponent(updateInput);
      expect(result.status).toEqual(status);
    }
  });
});