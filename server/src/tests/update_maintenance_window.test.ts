import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, statusPagesTable, maintenanceWindowsTable } from '../db/schema';
import { type UpdateMaintenanceWindowInput } from '../schema';
import { updateMaintenanceWindow } from '../handlers/update_maintenance_window';
import { eq } from 'drizzle-orm';

describe('updateMaintenanceWindow', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test data
  let userId: number;
  let organizationId: number;
  let statusPageId: number;
  let maintenanceWindowId: number;

  const setupTestData = async () => {
    // Create user
    const userResult = await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hash',
      first_name: 'Test',
      last_name: 'User',
      role: 'owner'
    }).returning().execute();
    userId = userResult[0].id;

    // Create organization
    const orgResult = await db.insert(organizationsTable).values({
      name: 'Test Org',
      slug: 'test-org',
      owner_id: userId
    }).returning().execute();
    organizationId = orgResult[0].id;

    // Create status page
    const pageResult = await db.insert(statusPagesTable).values({
      organization_id: organizationId,
      name: 'Test Status Page',
      slug: 'test-page'
    }).returning().execute();
    statusPageId = pageResult[0].id;

    // Create maintenance window
    const scheduledStart = new Date('2024-01-01T10:00:00Z');
    const scheduledEnd = new Date('2024-01-01T12:00:00Z');
    
    const maintenanceResult = await db.insert(maintenanceWindowsTable).values({
      status_page_id: statusPageId,
      title: 'Original Maintenance',
      description: 'Original description',
      status: 'scheduled',
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      created_by: userId
    }).returning().execute();
    maintenanceWindowId = maintenanceResult[0].id;
  };

  it('should update maintenance window title', async () => {
    await setupTestData();

    const input: UpdateMaintenanceWindowInput = {
      id: maintenanceWindowId,
      title: 'Updated Maintenance Title'
    };

    const result = await updateMaintenanceWindow(input);

    expect(result.id).toEqual(maintenanceWindowId);
    expect(result.title).toEqual('Updated Maintenance Title');
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.status).toEqual('scheduled'); // Unchanged
  });

  it('should update maintenance window description', async () => {
    await setupTestData();

    const input: UpdateMaintenanceWindowInput = {
      id: maintenanceWindowId,
      description: 'Updated maintenance description'
    };

    const result = await updateMaintenanceWindow(input);

    expect(result.description).toEqual('Updated maintenance description');
    expect(result.title).toEqual('Original Maintenance'); // Unchanged
  });

  it('should update scheduled start and end times', async () => {
    await setupTestData();

    const newStart = new Date('2024-01-02T14:00:00Z');
    const newEnd = new Date('2024-01-02T16:00:00Z');

    const input: UpdateMaintenanceWindowInput = {
      id: maintenanceWindowId,
      scheduled_start: newStart,
      scheduled_end: newEnd
    };

    const result = await updateMaintenanceWindow(input);

    expect(result.scheduled_start).toEqual(newStart);
    expect(result.scheduled_end).toEqual(newEnd);
  });

  it('should set actual_start when status changes to in_progress', async () => {
    await setupTestData();

    const beforeUpdate = new Date();
    
    const input: UpdateMaintenanceWindowInput = {
      id: maintenanceWindowId,
      status: 'in_progress'
    };

    const result = await updateMaintenanceWindow(input);

    expect(result.status).toEqual('in_progress');
    expect(result.actual_start).toBeInstanceOf(Date);
    expect(result.actual_start!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    expect(result.actual_end).toBeNull();
  });

  it('should set actual_end when status changes to completed', async () => {
    await setupTestData();

    // First set to in_progress
    await updateMaintenanceWindow({
      id: maintenanceWindowId,
      status: 'in_progress'
    });

    const beforeComplete = new Date();

    const input: UpdateMaintenanceWindowInput = {
      id: maintenanceWindowId,
      status: 'completed'
    };

    const result = await updateMaintenanceWindow(input);

    expect(result.status).toEqual('completed');
    expect(result.actual_end).toBeInstanceOf(Date);
    expect(result.actual_end!.getTime()).toBeGreaterThanOrEqual(beforeComplete.getTime());
  });

  it('should set actual_end when status changes to cancelled', async () => {
    await setupTestData();

    const beforeCancel = new Date();

    const input: UpdateMaintenanceWindowInput = {
      id: maintenanceWindowId,
      status: 'cancelled'
    };

    const result = await updateMaintenanceWindow(input);

    expect(result.status).toEqual('cancelled');
    expect(result.actual_end).toBeInstanceOf(Date);
    expect(result.actual_end!.getTime()).toBeGreaterThanOrEqual(beforeCancel.getTime());
  });

  it('should clear actual timestamps when status changes back to scheduled', async () => {
    await setupTestData();

    // First set to in_progress (sets actual_start)
    await updateMaintenanceWindow({
      id: maintenanceWindowId,
      status: 'in_progress'
    });

    // Then set to completed (sets actual_end)
    await updateMaintenanceWindow({
      id: maintenanceWindowId,
      status: 'completed'
    });

    // Now reset to scheduled
    const input: UpdateMaintenanceWindowInput = {
      id: maintenanceWindowId,
      status: 'scheduled'
    };

    const result = await updateMaintenanceWindow(input);

    expect(result.status).toEqual('scheduled');
    expect(result.actual_start).toBeNull();
    expect(result.actual_end).toBeNull();
  });

  it('should preserve existing actual_start when manually provided', async () => {
    await setupTestData();

    const customStart = new Date('2024-01-01T09:30:00Z');

    const input: UpdateMaintenanceWindowInput = {
      id: maintenanceWindowId,
      status: 'in_progress',
      actual_start: customStart
    };

    const result = await updateMaintenanceWindow(input);

    expect(result.status).toEqual('in_progress');
    expect(result.actual_start).toEqual(customStart);
  });

  it('should preserve existing actual_end when manually provided', async () => {
    await setupTestData();

    const customEnd = new Date('2024-01-01T11:45:00Z');

    const input: UpdateMaintenanceWindowInput = {
      id: maintenanceWindowId,
      status: 'completed',
      actual_end: customEnd
    };

    const result = await updateMaintenanceWindow(input);

    expect(result.status).toEqual('completed');
    expect(result.actual_end).toEqual(customEnd);
  });

  it('should update multiple fields at once', async () => {
    await setupTestData();

    const newStart = new Date('2024-01-03T10:00:00Z');
    const newEnd = new Date('2024-01-03T14:00:00Z');

    const input: UpdateMaintenanceWindowInput = {
      id: maintenanceWindowId,
      title: 'Multi-field Update',
      description: 'Updated with multiple fields',
      status: 'in_progress',
      scheduled_start: newStart,
      scheduled_end: newEnd
    };

    const result = await updateMaintenanceWindow(input);

    expect(result.title).toEqual('Multi-field Update');
    expect(result.description).toEqual('Updated with multiple fields');
    expect(result.status).toEqual('in_progress');
    expect(result.scheduled_start).toEqual(newStart);
    expect(result.scheduled_end).toEqual(newEnd);
    expect(result.actual_start).toBeInstanceOf(Date);
  });

  it('should update updated_at timestamp', async () => {
    await setupTestData();

    // Get original updated_at
    const original = await db.select()
      .from(maintenanceWindowsTable)
      .where(eq(maintenanceWindowsTable.id, maintenanceWindowId))
      .execute();
    
    const originalUpdatedAt = original[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateMaintenanceWindowInput = {
      id: maintenanceWindowId,
      title: 'Timestamp Test'
    };

    const result = await updateMaintenanceWindow(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should persist changes to database', async () => {
    await setupTestData();

    const input: UpdateMaintenanceWindowInput = {
      id: maintenanceWindowId,
      title: 'Database Persistence Test',
      status: 'in_progress'
    };

    const result = await updateMaintenanceWindow(input);

    // Verify changes persisted in database
    const dbResult = await db.select()
      .from(maintenanceWindowsTable)
      .where(eq(maintenanceWindowsTable.id, maintenanceWindowId))
      .execute();

    expect(dbResult).toHaveLength(1);
    expect(dbResult[0].title).toEqual('Database Persistence Test');
    expect(dbResult[0].status).toEqual('in_progress');
    expect(dbResult[0].actual_start).toBeInstanceOf(Date);
    expect(dbResult[0].id).toEqual(result.id);
  });

  it('should throw error when maintenance window not found', async () => {
    await setupTestData();

    const input: UpdateMaintenanceWindowInput = {
      id: 99999, // Non-existent ID
      title: 'This should fail'
    };

    await expect(updateMaintenanceWindow(input)).rejects.toThrow(/Maintenance window with id 99999 not found/i);
  });
});