import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  organizationsTable, 
  statusPagesTable, 
  componentsTable, 
  incidentsTable, 
  incidentUpdatesTable, 
  maintenanceWindowsTable,
  incidentAffectedComponentsTable,
  maintenanceAffectedComponentsTable
} from '../db/schema';
import { deleteStatusPage } from '../handlers/delete_status_page';
import { eq } from 'drizzle-orm';

describe('deleteStatusPage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return false for non-existent status page', async () => {
    const result = await deleteStatusPage(999);
    expect(result).toBe(false);
  });

  it('should delete status page with no related data', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hash',
        first_name: 'Owner',
        last_name: 'User',
        role: 'owner'
      })
      .returning()
      .execute();

    const organization = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: user[0].id
      })
      .returning()
      .execute();

    const statusPage = await db.insert(statusPagesTable)
      .values({
        organization_id: organization[0].id,
        name: 'Test Status Page',
        slug: 'test-status',
        description: 'Test description',
        is_public: true
      })
      .returning()
      .execute();

    // Delete status page
    const result = await deleteStatusPage(statusPage[0].id);
    expect(result).toBe(true);

    // Verify status page is deleted
    const remainingPages = await db.select()
      .from(statusPagesTable)
      .where(eq(statusPagesTable.id, statusPage[0].id))
      .execute();

    expect(remainingPages).toHaveLength(0);
  });

  it('should cascade delete all related data', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hash',
        first_name: 'Owner',
        last_name: 'User',
        role: 'owner'
      })
      .returning()
      .execute();

    const organization = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: user[0].id
      })
      .returning()
      .execute();

    const statusPage = await db.insert(statusPagesTable)
      .values({
        organization_id: organization[0].id,
        name: 'Test Status Page',
        slug: 'test-status',
        description: 'Test description',
        is_public: true
      })
      .returning()
      .execute();

    // Create components
    const component1 = await db.insert(componentsTable)
      .values({
        status_page_id: statusPage[0].id,
        name: 'Component 1',
        description: 'Test component 1',
        status: 'operational',
        position: 1
      })
      .returning()
      .execute();

    const component2 = await db.insert(componentsTable)
      .values({
        status_page_id: statusPage[0].id,
        name: 'Component 2',
        description: 'Test component 2',
        status: 'operational',
        position: 2
      })
      .returning()
      .execute();

    // Create incident
    const incident = await db.insert(incidentsTable)
      .values({
        status_page_id: statusPage[0].id,
        title: 'Test Incident',
        description: 'Test incident description',
        status: 'investigating',
        created_by: user[0].id
      })
      .returning()
      .execute();

    // Create incident update
    await db.insert(incidentUpdatesTable)
      .values({
        incident_id: incident[0].id,
        title: 'Incident Update',
        description: 'Update description',
        status: 'identified',
        created_by: user[0].id
      })
      .execute();

    // Create incident affected components
    await db.insert(incidentAffectedComponentsTable)
      .values({
        incident_id: incident[0].id,
        component_id: component1[0].id
      })
      .execute();

    // Create maintenance window
    const maintenance = await db.insert(maintenanceWindowsTable)
      .values({
        status_page_id: statusPage[0].id,
        title: 'Test Maintenance',
        description: 'Test maintenance description',
        status: 'scheduled',
        scheduled_start: new Date('2024-01-01T10:00:00Z'),
        scheduled_end: new Date('2024-01-01T12:00:00Z'),
        created_by: user[0].id
      })
      .returning()
      .execute();

    // Create maintenance affected components
    await db.insert(maintenanceAffectedComponentsTable)
      .values({
        maintenance_window_id: maintenance[0].id,
        component_id: component2[0].id
      })
      .execute();

    // Delete status page
    const result = await deleteStatusPage(statusPage[0].id);
    expect(result).toBe(true);

    // Verify all related data is deleted
    const remainingPages = await db.select()
      .from(statusPagesTable)
      .where(eq(statusPagesTable.id, statusPage[0].id))
      .execute();
    expect(remainingPages).toHaveLength(0);

    const remainingComponents = await db.select()
      .from(componentsTable)
      .where(eq(componentsTable.status_page_id, statusPage[0].id))
      .execute();
    expect(remainingComponents).toHaveLength(0);

    const remainingIncidents = await db.select()
      .from(incidentsTable)
      .where(eq(incidentsTable.status_page_id, statusPage[0].id))
      .execute();
    expect(remainingIncidents).toHaveLength(0);

    const remainingIncidentUpdates = await db.select()
      .from(incidentUpdatesTable)
      .where(eq(incidentUpdatesTable.incident_id, incident[0].id))
      .execute();
    expect(remainingIncidentUpdates).toHaveLength(0);

    const remainingMaintenance = await db.select()
      .from(maintenanceWindowsTable)
      .where(eq(maintenanceWindowsTable.status_page_id, statusPage[0].id))
      .execute();
    expect(remainingMaintenance).toHaveLength(0);

    const remainingIncidentComponents = await db.select()
      .from(incidentAffectedComponentsTable)
      .where(eq(incidentAffectedComponentsTable.incident_id, incident[0].id))
      .execute();
    expect(remainingIncidentComponents).toHaveLength(0);

    const remainingMaintenanceComponents = await db.select()
      .from(maintenanceAffectedComponentsTable)
      .where(eq(maintenanceAffectedComponentsTable.maintenance_window_id, maintenance[0].id))
      .execute();
    expect(remainingMaintenanceComponents).toHaveLength(0);
  });

  it('should handle multiple incidents with updates', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hash',
        first_name: 'Owner',
        last_name: 'User',
        role: 'owner'
      })
      .returning()
      .execute();

    const organization = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: user[0].id
      })
      .returning()
      .execute();

    const statusPage = await db.insert(statusPagesTable)
      .values({
        organization_id: organization[0].id,
        name: 'Test Status Page',
        slug: 'test-status',
        description: 'Test description',
        is_public: true
      })
      .returning()
      .execute();

    // Create multiple incidents
    const incident1 = await db.insert(incidentsTable)
      .values({
        status_page_id: statusPage[0].id,
        title: 'Incident 1',
        description: 'First incident',
        status: 'investigating',
        created_by: user[0].id
      })
      .returning()
      .execute();

    const incident2 = await db.insert(incidentsTable)
      .values({
        status_page_id: statusPage[0].id,
        title: 'Incident 2',
        description: 'Second incident',
        status: 'identified',
        created_by: user[0].id
      })
      .returning()
      .execute();

    // Create multiple updates for each incident
    await db.insert(incidentUpdatesTable)
      .values([
        {
          incident_id: incident1[0].id,
          title: 'Update 1-1',
          description: 'First update for incident 1',
          status: 'identified',
          created_by: user[0].id
        },
        {
          incident_id: incident1[0].id,
          title: 'Update 1-2',
          description: 'Second update for incident 1',
          status: 'monitoring',
          created_by: user[0].id
        },
        {
          incident_id: incident2[0].id,
          title: 'Update 2-1',
          description: 'First update for incident 2',
          status: 'resolved',
          created_by: user[0].id
        }
      ])
      .execute();

    // Delete status page
    const result = await deleteStatusPage(statusPage[0].id);
    expect(result).toBe(true);

    // Verify all incident updates are deleted
    const remainingUpdates = await db.select()
      .from(incidentUpdatesTable)
      .execute();
    expect(remainingUpdates).toHaveLength(0);

    // Verify all incidents are deleted
    const remainingIncidents = await db.select()
      .from(incidentsTable)
      .execute();
    expect(remainingIncidents).toHaveLength(0);
  });

  it('should not affect data from other status pages', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hash',
        first_name: 'Owner',
        last_name: 'User',
        role: 'owner'
      })
      .returning()
      .execute();

    const organization = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: user[0].id
      })
      .returning()
      .execute();

    // Create two status pages
    const statusPage1 = await db.insert(statusPagesTable)
      .values({
        organization_id: organization[0].id,
        name: 'Status Page 1',
        slug: 'status-1',
        description: 'First status page',
        is_public: true
      })
      .returning()
      .execute();

    const statusPage2 = await db.insert(statusPagesTable)
      .values({
        organization_id: organization[0].id,
        name: 'Status Page 2',
        slug: 'status-2',
        description: 'Second status page',
        is_public: true
      })
      .returning()
      .execute();

    // Create components for both
    await db.insert(componentsTable)
      .values([
        {
          status_page_id: statusPage1[0].id,
          name: 'Component 1-1',
          description: 'Component for page 1',
          status: 'operational',
          position: 1
        },
        {
          status_page_id: statusPage2[0].id,
          name: 'Component 2-1',
          description: 'Component for page 2',
          status: 'operational',
          position: 1
        }
      ])
      .execute();

    // Delete only the first status page
    const result = await deleteStatusPage(statusPage1[0].id);
    expect(result).toBe(true);

    // Verify first status page is deleted
    const page1Results = await db.select()
      .from(statusPagesTable)
      .where(eq(statusPagesTable.id, statusPage1[0].id))
      .execute();
    expect(page1Results).toHaveLength(0);

    // Verify second status page and its data still exist
    const page2Results = await db.select()
      .from(statusPagesTable)
      .where(eq(statusPagesTable.id, statusPage2[0].id))
      .execute();
    expect(page2Results).toHaveLength(1);

    const page2Components = await db.select()
      .from(componentsTable)
      .where(eq(componentsTable.status_page_id, statusPage2[0].id))
      .execute();
    expect(page2Components).toHaveLength(1);
    expect(page2Components[0].name).toEqual('Component 2-1');
  });
});