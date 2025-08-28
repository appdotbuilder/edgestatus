import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  organizationsTable, 
  statusPagesTable, 
  componentsTable, 
  maintenanceWindowsTable, 
  maintenanceAffectedComponentsTable 
} from '../db/schema';
import { type CreateMaintenanceWindowInput } from '../schema';
import { createMaintenanceWindow } from '../handlers/create_maintenance_window';
import { eq } from 'drizzle-orm';

// Test input with all fields including defaults
const testInput: CreateMaintenanceWindowInput = {
  status_page_id: 1,
  title: 'Database Maintenance',
  description: 'Routine database maintenance and upgrades',
  scheduled_start: new Date('2024-02-01T02:00:00Z'),
  scheduled_end: new Date('2024-02-01T04:00:00Z'),
  created_by: 1,
  affected_component_ids: [1, 2]
};

describe('createMaintenanceWindow', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a maintenance window', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'Test',
      last_name: 'User'
    }).returning().execute();

    const organization = await db.insert(organizationsTable).values({
      name: 'Test Org',
      slug: 'test-org',
      owner_id: user[0].id
    }).returning().execute();

    const statusPage = await db.insert(statusPagesTable).values({
      organization_id: organization[0].id,
      name: 'Test Status Page',
      slug: 'test-status-page'
    }).returning().execute();

    const components = await db.insert(componentsTable).values([
      {
        status_page_id: statusPage[0].id,
        name: 'Database',
        position: 0
      },
      {
        status_page_id: statusPage[0].id,
        name: 'API',
        position: 1
      }
    ]).returning().execute();

    const input: CreateMaintenanceWindowInput = {
      ...testInput,
      status_page_id: statusPage[0].id,
      created_by: user[0].id,
      affected_component_ids: [components[0].id, components[1].id]
    };

    const result = await createMaintenanceWindow(input);

    // Basic field validation
    expect(result.title).toEqual('Database Maintenance');
    expect(result.description).toEqual('Routine database maintenance and upgrades');
    expect(result.status).toEqual('scheduled');
    expect(result.status_page_id).toEqual(statusPage[0].id);
    expect(result.created_by).toEqual(user[0].id);
    expect(result.scheduled_start).toEqual(input.scheduled_start);
    expect(result.scheduled_end).toEqual(input.scheduled_end);
    expect(result.actual_start).toBeNull();
    expect(result.actual_end).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save maintenance window to database', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'Test',
      last_name: 'User'
    }).returning().execute();

    const organization = await db.insert(organizationsTable).values({
      name: 'Test Org',
      slug: 'test-org',
      owner_id: user[0].id
    }).returning().execute();

    const statusPage = await db.insert(statusPagesTable).values({
      organization_id: organization[0].id,
      name: 'Test Status Page',
      slug: 'test-status-page'
    }).returning().execute();

    const input: CreateMaintenanceWindowInput = {
      ...testInput,
      status_page_id: statusPage[0].id,
      created_by: user[0].id,
      affected_component_ids: []
    };

    const result = await createMaintenanceWindow(input);

    // Query using proper drizzle syntax
    const maintenanceWindows = await db.select()
      .from(maintenanceWindowsTable)
      .where(eq(maintenanceWindowsTable.id, result.id))
      .execute();

    expect(maintenanceWindows).toHaveLength(1);
    expect(maintenanceWindows[0].title).toEqual('Database Maintenance');
    expect(maintenanceWindows[0].description).toEqual('Routine database maintenance and upgrades');
    expect(maintenanceWindows[0].status).toEqual('scheduled');
    expect(maintenanceWindows[0].created_at).toBeInstanceOf(Date);
    expect(maintenanceWindows[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create affected component relationships', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'Test',
      last_name: 'User'
    }).returning().execute();

    const organization = await db.insert(organizationsTable).values({
      name: 'Test Org',
      slug: 'test-org',
      owner_id: user[0].id
    }).returning().execute();

    const statusPage = await db.insert(statusPagesTable).values({
      organization_id: organization[0].id,
      name: 'Test Status Page',
      slug: 'test-status-page'
    }).returning().execute();

    const components = await db.insert(componentsTable).values([
      {
        status_page_id: statusPage[0].id,
        name: 'Database',
        position: 0
      },
      {
        status_page_id: statusPage[0].id,
        name: 'API',
        position: 1
      }
    ]).returning().execute();

    const input: CreateMaintenanceWindowInput = {
      ...testInput,
      status_page_id: statusPage[0].id,
      created_by: user[0].id,
      affected_component_ids: [components[0].id, components[1].id]
    };

    const result = await createMaintenanceWindow(input);

    // Verify affected components were created
    const affectedComponents = await db.select()
      .from(maintenanceAffectedComponentsTable)
      .where(eq(maintenanceAffectedComponentsTable.maintenance_window_id, result.id))
      .execute();

    expect(affectedComponents).toHaveLength(2);
    expect(affectedComponents.map(ac => ac.component_id).sort()).toEqual([components[0].id, components[1].id].sort());
    affectedComponents.forEach(ac => {
      expect(ac.created_at).toBeInstanceOf(Date);
    });
  });

  it('should handle empty affected component ids', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'Test',
      last_name: 'User'
    }).returning().execute();

    const organization = await db.insert(organizationsTable).values({
      name: 'Test Org',
      slug: 'test-org',
      owner_id: user[0].id
    }).returning().execute();

    const statusPage = await db.insert(statusPagesTable).values({
      organization_id: organization[0].id,
      name: 'Test Status Page',
      slug: 'test-status-page'
    }).returning().execute();

    const input: CreateMaintenanceWindowInput = {
      ...testInput,
      status_page_id: statusPage[0].id,
      created_by: user[0].id,
      affected_component_ids: []
    };

    const result = await createMaintenanceWindow(input);

    // Verify no affected components were created
    const affectedComponents = await db.select()
      .from(maintenanceAffectedComponentsTable)
      .where(eq(maintenanceAffectedComponentsTable.maintenance_window_id, result.id))
      .execute();

    expect(affectedComponents).toHaveLength(0);
    expect(result.id).toBeDefined();
  });

  it('should throw error for non-existent status page', async () => {
    const input: CreateMaintenanceWindowInput = {
      ...testInput,
      status_page_id: 999,
      created_by: 1
    };

    await expect(createMaintenanceWindow(input)).rejects.toThrow(/status page with id 999 not found/i);
  });

  it('should throw error for non-existent creator user', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'Test',
      last_name: 'User'
    }).returning().execute();

    const organization = await db.insert(organizationsTable).values({
      name: 'Test Org',
      slug: 'test-org',
      owner_id: user[0].id
    }).returning().execute();

    const statusPage = await db.insert(statusPagesTable).values({
      organization_id: organization[0].id,
      name: 'Test Status Page',
      slug: 'test-status-page'
    }).returning().execute();

    const input: CreateMaintenanceWindowInput = {
      ...testInput,
      status_page_id: statusPage[0].id,
      created_by: 999
    };

    await expect(createMaintenanceWindow(input)).rejects.toThrow(/user with id 999 not found/i);
  });

  it('should throw error for invalid component ids', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'Test',
      last_name: 'User'
    }).returning().execute();

    const organization = await db.insert(organizationsTable).values({
      name: 'Test Org',
      slug: 'test-org',
      owner_id: user[0].id
    }).returning().execute();

    const statusPage = await db.insert(statusPagesTable).values({
      organization_id: organization[0].id,
      name: 'Test Status Page',
      slug: 'test-status-page'
    }).returning().execute();

    const input: CreateMaintenanceWindowInput = {
      ...testInput,
      status_page_id: statusPage[0].id,
      created_by: user[0].id,
      affected_component_ids: [999, 1000]
    };

    await expect(createMaintenanceWindow(input)).rejects.toThrow(/components with ids 999, 1000 not found or do not belong to the status page/i);
  });

  it('should throw error for components from different status page', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'Test',
      last_name: 'User'
    }).returning().execute();

    const organization = await db.insert(organizationsTable).values({
      name: 'Test Org',
      slug: 'test-org',
      owner_id: user[0].id
    }).returning().execute();

    const statusPage1 = await db.insert(statusPagesTable).values({
      organization_id: organization[0].id,
      name: 'Test Status Page 1',
      slug: 'test-status-page-1'
    }).returning().execute();

    const statusPage2 = await db.insert(statusPagesTable).values({
      organization_id: organization[0].id,
      name: 'Test Status Page 2',
      slug: 'test-status-page-2'
    }).returning().execute();

    const component1 = await db.insert(componentsTable).values({
      status_page_id: statusPage1[0].id,
      name: 'Database 1',
      position: 0
    }).returning().execute();

    const component2 = await db.insert(componentsTable).values({
      status_page_id: statusPage2[0].id,
      name: 'Database 2',
      position: 0
    }).returning().execute();

    const input: CreateMaintenanceWindowInput = {
      ...testInput,
      status_page_id: statusPage1[0].id,
      created_by: user[0].id,
      affected_component_ids: [component1[0].id, component2[0].id]
    };

    await expect(createMaintenanceWindow(input)).rejects.toThrow(/not found or do not belong to the status page/i);
  });
});