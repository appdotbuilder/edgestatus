import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, statusPagesTable, maintenanceWindowsTable } from '../db/schema';
import { getMaintenanceWindows } from '../handlers/get_maintenance_windows';

describe('getMaintenanceWindows', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no maintenance windows exist', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'owner'
      })
      .returning()
      .execute();

    const [organization] = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: user.id
      })
      .returning()
      .execute();

    const [statusPage] = await db.insert(statusPagesTable)
      .values({
        organization_id: organization.id,
        name: 'Test Status Page',
        slug: 'test-status',
        description: 'A test status page',
        is_public: true
      })
      .returning()
      .execute();

    const result = await getMaintenanceWindows(statusPage.id);

    expect(result).toHaveLength(0);
  });

  it('should return maintenance windows for specific status page', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'owner'
      })
      .returning()
      .execute();

    const [organization] = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: user.id
      })
      .returning()
      .execute();

    const [statusPage] = await db.insert(statusPagesTable)
      .values({
        organization_id: organization.id,
        name: 'Test Status Page',
        slug: 'test-status',
        description: 'A test status page',
        is_public: true
      })
      .returning()
      .execute();

    // Create maintenance windows
    const scheduledStart = new Date('2024-01-15T10:00:00Z');
    const scheduledEnd = new Date('2024-01-15T14:00:00Z');

    const [maintenanceWindow] = await db.insert(maintenanceWindowsTable)
      .values({
        status_page_id: statusPage.id,
        title: 'Database Maintenance',
        description: 'Scheduled database maintenance window',
        status: 'scheduled',
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        created_by: user.id
      })
      .returning()
      .execute();

    const result = await getMaintenanceWindows(statusPage.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(maintenanceWindow.id);
    expect(result[0].title).toEqual('Database Maintenance');
    expect(result[0].description).toEqual('Scheduled database maintenance window');
    expect(result[0].status).toEqual('scheduled');
    expect(result[0].scheduled_start).toBeInstanceOf(Date);
    expect(result[0].scheduled_end).toBeInstanceOf(Date);
    expect(result[0].created_by).toEqual(user.id);
  });

  it('should order maintenance windows by scheduled_start DESC', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'owner'
      })
      .returning()
      .execute();

    const [organization] = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: user.id
      })
      .returning()
      .execute();

    const [statusPage] = await db.insert(statusPagesTable)
      .values({
        organization_id: organization.id,
        name: 'Test Status Page',
        slug: 'test-status',
        description: 'A test status page',
        is_public: true
      })
      .returning()
      .execute();

    // Create multiple maintenance windows with different scheduled start times
    const earlierWindow = await db.insert(maintenanceWindowsTable)
      .values({
        status_page_id: statusPage.id,
        title: 'Earlier Maintenance',
        description: 'Earlier maintenance window',
        status: 'scheduled',
        scheduled_start: new Date('2024-01-10T10:00:00Z'),
        scheduled_end: new Date('2024-01-10T14:00:00Z'),
        created_by: user.id
      })
      .returning()
      .execute();

    const laterWindow = await db.insert(maintenanceWindowsTable)
      .values({
        status_page_id: statusPage.id,
        title: 'Later Maintenance',
        description: 'Later maintenance window',
        status: 'scheduled',
        scheduled_start: new Date('2024-01-20T10:00:00Z'),
        scheduled_end: new Date('2024-01-20T14:00:00Z'),
        created_by: user.id
      })
      .returning()
      .execute();

    const result = await getMaintenanceWindows(statusPage.id);

    expect(result).toHaveLength(2);
    // Should be ordered by scheduled_start DESC (latest first)
    expect(result[0].title).toEqual('Later Maintenance');
    expect(result[1].title).toEqual('Earlier Maintenance');
    expect(result[0].scheduled_start > result[1].scheduled_start).toBe(true);
  });

  it('should only return maintenance windows for specific status page', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'owner'
      })
      .returning()
      .execute();

    const [organization] = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: user.id
      })
      .returning()
      .execute();

    // Create two status pages
    const [statusPage1] = await db.insert(statusPagesTable)
      .values({
        organization_id: organization.id,
        name: 'Status Page 1',
        slug: 'status-1',
        description: 'First status page',
        is_public: true
      })
      .returning()
      .execute();

    const [statusPage2] = await db.insert(statusPagesTable)
      .values({
        organization_id: organization.id,
        name: 'Status Page 2',
        slug: 'status-2',
        description: 'Second status page',
        is_public: true
      })
      .returning()
      .execute();

    // Create maintenance windows for both status pages
    await db.insert(maintenanceWindowsTable)
      .values({
        status_page_id: statusPage1.id,
        title: 'Page 1 Maintenance',
        description: 'Maintenance for page 1',
        status: 'scheduled',
        scheduled_start: new Date('2024-01-15T10:00:00Z'),
        scheduled_end: new Date('2024-01-15T14:00:00Z'),
        created_by: user.id
      })
      .execute();

    await db.insert(maintenanceWindowsTable)
      .values({
        status_page_id: statusPage2.id,
        title: 'Page 2 Maintenance',
        description: 'Maintenance for page 2',
        status: 'scheduled',
        scheduled_start: new Date('2024-01-16T10:00:00Z'),
        scheduled_end: new Date('2024-01-16T14:00:00Z'),
        created_by: user.id
      })
      .execute();

    // Get maintenance windows for first status page only
    const result = await getMaintenanceWindows(statusPage1.id);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Page 1 Maintenance');
    expect(result[0].status_page_id).toEqual(statusPage1.id);
  });

  it('should handle maintenance windows with different statuses', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'owner'
      })
      .returning()
      .execute();

    const [organization] = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: user.id
      })
      .returning()
      .execute();

    const [statusPage] = await db.insert(statusPagesTable)
      .values({
        organization_id: organization.id,
        name: 'Test Status Page',
        slug: 'test-status',
        description: 'A test status page',
        is_public: true
      })
      .returning()
      .execute();

    // Create maintenance windows with different statuses
    await db.insert(maintenanceWindowsTable)
      .values([
        {
          status_page_id: statusPage.id,
          title: 'Scheduled Maintenance',
          description: 'Future maintenance',
          status: 'scheduled',
          scheduled_start: new Date('2024-01-15T10:00:00Z'),
          scheduled_end: new Date('2024-01-15T14:00:00Z'),
          created_by: user.id
        },
        {
          status_page_id: statusPage.id,
          title: 'In Progress Maintenance',
          description: 'Currently ongoing maintenance',
          status: 'in_progress',
          scheduled_start: new Date('2024-01-10T10:00:00Z'),
          scheduled_end: new Date('2024-01-10T14:00:00Z'),
          actual_start: new Date('2024-01-10T10:05:00Z'),
          created_by: user.id
        },
        {
          status_page_id: statusPage.id,
          title: 'Completed Maintenance',
          description: 'Past maintenance',
          status: 'completed',
          scheduled_start: new Date('2024-01-05T10:00:00Z'),
          scheduled_end: new Date('2024-01-05T14:00:00Z'),
          actual_start: new Date('2024-01-05T10:00:00Z'),
          actual_end: new Date('2024-01-05T13:45:00Z'),
          created_by: user.id
        }
      ])
      .execute();

    const result = await getMaintenanceWindows(statusPage.id);

    expect(result).toHaveLength(3);
    // Should be ordered by scheduled_start DESC
    expect(result[0].title).toEqual('Scheduled Maintenance');
    expect(result[0].status).toEqual('scheduled');
    expect(result[1].title).toEqual('In Progress Maintenance');
    expect(result[1].status).toEqual('in_progress');
    expect(result[2].title).toEqual('Completed Maintenance');
    expect(result[2].status).toEqual('completed');
  });

  it('should handle maintenance windows with nullable fields', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'owner'
      })
      .returning()
      .execute();

    const [organization] = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: user.id
      })
      .returning()
      .execute();

    const [statusPage] = await db.insert(statusPagesTable)
      .values({
        organization_id: organization.id,
        name: 'Test Status Page',
        slug: 'test-status',
        description: 'A test status page',
        is_public: true
      })
      .returning()
      .execute();

    // Create maintenance window with nullable fields set to null
    const [maintenanceWindow] = await db.insert(maintenanceWindowsTable)
      .values({
        status_page_id: statusPage.id,
        title: 'Simple Maintenance',
        description: 'Maintenance with no actual times',
        status: 'scheduled',
        scheduled_start: new Date('2024-01-15T10:00:00Z'),
        scheduled_end: new Date('2024-01-15T14:00:00Z'),
        actual_start: null,
        actual_end: null,
        created_by: user.id
      })
      .returning()
      .execute();

    const result = await getMaintenanceWindows(statusPage.id);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Simple Maintenance');
    expect(result[0].actual_start).toBeNull();
    expect(result[0].actual_end).toBeNull();
    expect(result[0].scheduled_start).toBeInstanceOf(Date);
    expect(result[0].scheduled_end).toBeInstanceOf(Date);
  });
});