import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  organizationsTable, 
  statusPagesTable, 
  componentsTable 
} from '../db/schema';
import { type CreateComponentInput } from '../schema';
import { createComponent } from '../handlers/create_component';
import { eq } from 'drizzle-orm';

describe('createComponent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testOrganizationId: number;
  let testStatusPageId: number;

  // Helper to create prerequisite data
  const createPrerequisites = async (planType: 'free' | 'pro' | 'plus' | 'enterprise' = 'free') => {
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
    
    testUserId = userResult[0].id;

    // Create organization with specified plan
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        slug: 'test-org',
        plan_type: planType,
        owner_id: testUserId
      })
      .returning()
      .execute();

    testOrganizationId = orgResult[0].id;

    // Create status page
    const statusPageResult = await db.insert(statusPagesTable)
      .values({
        organization_id: testOrganizationId,
        name: 'Test Status Page',
        slug: 'test-status-page',
        description: 'A test status page',
        custom_domain: null,
        branding_logo_url: null,
        branding_primary_color: null,
        branding_secondary_color: null,
        is_public: true
      })
      .returning()
      .execute();

    testStatusPageId = statusPageResult[0].id;
  };

  // Helper to create multiple components for limit testing
  const createComponents = async (count: number) => {
    const components = [];
    for (let i = 0; i < count; i++) {
      const input: CreateComponentInput = {
        status_page_id: testStatusPageId,
        name: `Test Component ${i + 1}`,
        description: `Component ${i + 1} description`,
        status: 'operational',
        position: i
      };
      const component = await createComponent(input);
      components.push(component);
    }
    return components;
  };

  const testInput: CreateComponentInput = {
    status_page_id: 0, // Will be set in tests
    name: 'Web Server',
    description: 'Main web application server',
    status: 'operational',
    position: 1
  };

  it('should create a component successfully', async () => {
    await createPrerequisites();
    
    const input = { ...testInput, status_page_id: testStatusPageId };
    const result = await createComponent(input);

    expect(result.name).toEqual('Web Server');
    expect(result.description).toEqual('Main web application server');
    expect(result.status).toEqual('operational');
    expect(result.position).toEqual(1);
    expect(result.status_page_id).toEqual(testStatusPageId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save component to database', async () => {
    await createPrerequisites();
    
    const input = { ...testInput, status_page_id: testStatusPageId };
    const result = await createComponent(input);

    const components = await db.select()
      .from(componentsTable)
      .where(eq(componentsTable.id, result.id))
      .execute();

    expect(components).toHaveLength(1);
    expect(components[0].name).toEqual('Web Server');
    expect(components[0].description).toEqual('Main web application server');
    expect(components[0].status).toEqual('operational');
    expect(components[0].position).toEqual(1);
    expect(components[0].created_at).toBeInstanceOf(Date);
  });

  it('should create component with default values from schema', async () => {
    await createPrerequisites();
    
    const minimalInput: CreateComponentInput = {
      status_page_id: testStatusPageId,
      name: 'Minimal Component',
      description: null,
      status: 'operational', // Zod default applied
      position: 0 // Zod default applied
    };

    const result = await createComponent(minimalInput);

    expect(result.name).toEqual('Minimal Component');
    expect(result.description).toBeNull();
    expect(result.status).toEqual('operational');
    expect(result.position).toEqual(0);
  });

  it('should throw error when status page does not exist', async () => {
    const input = { ...testInput, status_page_id: 999999 };
    
    await expect(createComponent(input)).rejects.toThrow(/status page not found/i);
  });

  it('should enforce free plan component limit (7)', async () => {
    await createPrerequisites('free');
    
    // Create 7 components (the limit)
    await createComponents(7);

    // Trying to create an 8th component should fail
    const input = { ...testInput, status_page_id: testStatusPageId };
    await expect(createComponent(input)).rejects.toThrow(/component limit exceeded for free plan/i);
  });

  it('should enforce pro plan component limit (36)', async () => {
    await createPrerequisites('pro');
    
    // Create 36 components (the limit)
    await createComponents(36);

    // Trying to create a 37th component should fail
    const input = { ...testInput, status_page_id: testStatusPageId };
    await expect(createComponent(input)).rejects.toThrow(/component limit exceeded for pro plan/i);
  });

  it('should enforce plus plan component limit (60)', async () => {
    await createPrerequisites('plus');
    
    // Create 60 components (the limit)
    await createComponents(60);

    // Trying to create a 61st component should fail
    const input = { ...testInput, status_page_id: testStatusPageId };
    await expect(createComponent(input)).rejects.toThrow(/component limit exceeded for plus plan/i);
  });

  it('should allow unlimited components for enterprise plan', async () => {
    await createPrerequisites('enterprise');
    
    // Create a large number of components (more than other plan limits)
    await createComponents(100);

    // Should still be able to create more
    const input = { ...testInput, status_page_id: testStatusPageId };
    const result = await createComponent(input);

    expect(result).toBeDefined();
    expect(result.name).toEqual('Web Server');
  });

  it('should handle different component statuses correctly', async () => {
    await createPrerequisites();
    
    const statuses = ['operational', 'performance_issues', 'partial_outage', 'major_outage', 'under_maintenance'] as const;
    
    for (const status of statuses) {
      const input: CreateComponentInput = {
        status_page_id: testStatusPageId,
        name: `Component ${status}`,
        description: `Component with ${status} status`,
        status,
        position: 0
      };

      const result = await createComponent(input);
      expect(result.status).toEqual(status);
    }
  });

  it('should handle component positioning correctly', async () => {
    await createPrerequisites();
    
    const positions = [0, 5, 10, 100];
    
    for (const position of positions) {
      const input: CreateComponentInput = {
        status_page_id: testStatusPageId,
        name: `Component at position ${position}`,
        description: 'Positioned component',
        status: 'operational',
        position
      };

      const result = await createComponent(input);
      expect(result.position).toEqual(position);
    }
  });

  it('should allow null description', async () => {
    await createPrerequisites();
    
    const input: CreateComponentInput = {
      status_page_id: testStatusPageId,
      name: 'Component without description',
      description: null,
      status: 'operational',
      position: 0
    };

    const result = await createComponent(input);
    expect(result.description).toBeNull();
  });
});