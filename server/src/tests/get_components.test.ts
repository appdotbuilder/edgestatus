import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, statusPagesTable, componentsTable } from '../db/schema';
import { getComponents } from '../handlers/get_components';
import { eq } from 'drizzle-orm';

describe('getComponents', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test setup helper to create required data
  const setupTestData = async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'owner'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: userId
      })
      .returning()
      .execute();

    const orgId = orgResult[0].id;

    // Create status page
    const statusPageResult = await db.insert(statusPagesTable)
      .values({
        organization_id: orgId,
        name: 'Test Status Page',
        slug: 'test-status-page',
        description: 'A test status page',
        is_public: true
      })
      .returning()
      .execute();

    return {
      userId,
      orgId,
      statusPageId: statusPageResult[0].id
    };
  };

  it('should return empty array when status page has no components', async () => {
    const { statusPageId } = await setupTestData();

    const result = await getComponents(statusPageId);

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return components ordered by position', async () => {
    const { statusPageId } = await setupTestData();

    // Create components with different positions
    const component1 = await db.insert(componentsTable)
      .values({
        status_page_id: statusPageId,
        name: 'Database',
        description: 'Main database service',
        status: 'operational',
        position: 2
      })
      .returning()
      .execute();

    const component2 = await db.insert(componentsTable)
      .values({
        status_page_id: statusPageId,
        name: 'API Server',
        description: 'REST API service',
        status: 'performance_issues',
        position: 0
      })
      .returning()
      .execute();

    const component3 = await db.insert(componentsTable)
      .values({
        status_page_id: statusPageId,
        name: 'Web Frontend',
        description: 'User interface',
        status: 'under_maintenance',
        position: 1
      })
      .returning()
      .execute();

    const result = await getComponents(statusPageId);

    // Should be ordered by position: API Server (0), Web Frontend (1), Database (2)
    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('API Server');
    expect(result[0].position).toEqual(0);
    expect(result[1].name).toEqual('Web Frontend');
    expect(result[1].position).toEqual(1);
    expect(result[2].name).toEqual('Database');
    expect(result[2].position).toEqual(2);
  });

  it('should return complete component data with all fields', async () => {
    const { statusPageId } = await setupTestData();

    await db.insert(componentsTable)
      .values({
        status_page_id: statusPageId,
        name: 'Test Component',
        description: 'A test component',
        status: 'partial_outage',
        position: 0
      })
      .returning()
      .execute();

    const result = await getComponents(statusPageId);

    expect(result).toHaveLength(1);
    const component = result[0];

    // Verify all required fields are present
    expect(component.id).toBeDefined();
    expect(typeof component.id).toBe('number');
    expect(component.status_page_id).toEqual(statusPageId);
    expect(component.name).toEqual('Test Component');
    expect(component.description).toEqual('A test component');
    expect(component.status).toEqual('partial_outage');
    expect(component.position).toEqual(0);
    expect(component.created_at).toBeInstanceOf(Date);
    expect(component.updated_at).toBeInstanceOf(Date);
  });

  it('should only return components for the specified status page', async () => {
    const { userId, orgId, statusPageId: statusPage1Id } = await setupTestData();

    // Create another status page
    const statusPage2Result = await db.insert(statusPagesTable)
      .values({
        organization_id: orgId,
        name: 'Another Status Page',
        slug: 'another-status-page',
        description: 'Another test status page',
        is_public: true
      })
      .returning()
      .execute();

    const statusPage2Id = statusPage2Result[0].id;

    // Create components for both status pages
    await db.insert(componentsTable)
      .values({
        status_page_id: statusPage1Id,
        name: 'Component 1',
        description: 'Component for status page 1',
        status: 'operational',
        position: 0
      })
      .execute();

    await db.insert(componentsTable)
      .values({
        status_page_id: statusPage2Id,
        name: 'Component 2',
        description: 'Component for status page 2',
        status: 'operational',
        position: 0
      })
      .execute();

    // Query components for status page 1 only
    const result = await getComponents(statusPage1Id);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Component 1');
    expect(result[0].status_page_id).toEqual(statusPage1Id);
  });

  it('should handle components with same position gracefully', async () => {
    const { statusPageId } = await setupTestData();

    // Create components with same position
    await db.insert(componentsTable)
      .values({
        status_page_id: statusPageId,
        name: 'Component A',
        description: 'First component',
        status: 'operational',
        position: 1
      })
      .execute();

    await db.insert(componentsTable)
      .values({
        status_page_id: statusPageId,
        name: 'Component B',
        description: 'Second component',
        status: 'operational',
        position: 1
      })
      .execute();

    const result = await getComponents(statusPageId);

    // Should return both components, order is consistent but not guaranteed
    expect(result).toHaveLength(2);
    expect(result.every(c => c.position === 1)).toBe(true);
    
    const componentNames = result.map(c => c.name).sort();
    expect(componentNames).toEqual(['Component A', 'Component B']);
  });

  it('should return components with different statuses', async () => {
    const { statusPageId } = await setupTestData();

    const statuses: Array<'operational' | 'performance_issues' | 'partial_outage' | 'major_outage' | 'under_maintenance'> = ['operational', 'performance_issues', 'partial_outage', 'major_outage', 'under_maintenance'];
    
    // Create components with different statuses
    for (let i = 0; i < statuses.length; i++) {
      await db.insert(componentsTable)
        .values({
          status_page_id: statusPageId,
          name: `Component ${i + 1}`,
          description: `Component with ${statuses[i]} status`,
          status: statuses[i],
          position: i
        })
        .execute();
    }

    const result = await getComponents(statusPageId);

    expect(result).toHaveLength(5);
    
    // Verify each status is represented
    const resultStatuses = result.map(c => c.status);
    expect(resultStatuses).toEqual(statuses);
  });

  it('should handle non-existent status page gracefully', async () => {
    const nonExistentStatusPageId = 99999;

    const result = await getComponents(nonExistentStatusPageId);

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should verify components are saved correctly in database', async () => {
    const { statusPageId } = await setupTestData();

    await db.insert(componentsTable)
      .values({
        status_page_id: statusPageId,
        name: 'Database Service',
        description: 'Primary database',
        status: 'operational',
        position: 5
      })
      .execute();

    // Verify via direct database query
    const dbComponents = await db.select()
      .from(componentsTable)
      .where(eq(componentsTable.status_page_id, statusPageId))
      .execute();

    expect(dbComponents).toHaveLength(1);
    expect(dbComponents[0].name).toEqual('Database Service');

    // Verify handler returns same data
    const handlerResult = await getComponents(statusPageId);
    expect(handlerResult).toHaveLength(1);
    expect(handlerResult[0].name).toEqual('Database Service');
    expect(handlerResult[0].id).toEqual(dbComponents[0].id);
  });
});