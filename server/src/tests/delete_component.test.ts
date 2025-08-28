import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  organizationsTable, 
  statusPagesTable, 
  componentsTable,
  incidentsTable,
  incidentAffectedComponentsTable,
  maintenanceWindowsTable,
  maintenanceAffectedComponentsTable
} from '../db/schema';
import { deleteComponent } from '../handlers/delete_component';
import { eq } from 'drizzle-orm';

describe('deleteComponent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing component', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed',
        first_name: 'Test',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();

    const org = await db.insert(organizationsTable)
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
        organization_id: org[0].id,
        name: 'Test Status Page',
        slug: 'test-status-page',
        description: 'Test description',
        is_public: true
      })
      .returning()
      .execute();

    const component = await db.insert(componentsTable)
      .values({
        status_page_id: statusPage[0].id,
        name: 'Test Component',
        description: 'A test component',
        status: 'operational',
        position: 1
      })
      .returning()
      .execute();

    // Delete the component
    const result = await deleteComponent(component[0].id);

    // Should return true for successful deletion
    expect(result).toBe(true);

    // Verify component was deleted from database
    const deletedComponent = await db.select()
      .from(componentsTable)
      .where(eq(componentsTable.id, component[0].id))
      .execute();

    expect(deletedComponent).toHaveLength(0);
  });

  it('should return false for non-existent component', async () => {
    const result = await deleteComponent(999);
    expect(result).toBe(false);
  });

  it('should delete component and clean up incident affected components', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed',
        first_name: 'Test',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();

    const org = await db.insert(organizationsTable)
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
        organization_id: org[0].id,
        name: 'Test Status Page',
        slug: 'test-status-page',
        description: 'Test description',
        is_public: true
      })
      .returning()
      .execute();

    const component = await db.insert(componentsTable)
      .values({
        status_page_id: statusPage[0].id,
        name: 'Test Component',
        description: 'A test component',
        status: 'operational',
        position: 1
      })
      .returning()
      .execute();

    // Create an incident
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

    // Link component to incident
    await db.insert(incidentAffectedComponentsTable)
      .values({
        incident_id: incident[0].id,
        component_id: component[0].id
      })
      .execute();

    // Verify affected component relationship exists
    const beforeDeletion = await db.select()
      .from(incidentAffectedComponentsTable)
      .where(eq(incidentAffectedComponentsTable.component_id, component[0].id))
      .execute();

    expect(beforeDeletion).toHaveLength(1);

    // Delete the component
    const result = await deleteComponent(component[0].id);

    expect(result).toBe(true);

    // Verify component was deleted
    const deletedComponent = await db.select()
      .from(componentsTable)
      .where(eq(componentsTable.id, component[0].id))
      .execute();

    expect(deletedComponent).toHaveLength(0);

    // Verify incident affected components were cleaned up
    const afterDeletion = await db.select()
      .from(incidentAffectedComponentsTable)
      .where(eq(incidentAffectedComponentsTable.component_id, component[0].id))
      .execute();

    expect(afterDeletion).toHaveLength(0);

    // Verify incident still exists
    const incidentStillExists = await db.select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, incident[0].id))
      .execute();

    expect(incidentStillExists).toHaveLength(1);
  });

  it('should delete component and clean up maintenance affected components', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed',
        first_name: 'Test',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();

    const org = await db.insert(organizationsTable)
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
        organization_id: org[0].id,
        name: 'Test Status Page',
        slug: 'test-status-page',
        description: 'Test description',
        is_public: true
      })
      .returning()
      .execute();

    const component = await db.insert(componentsTable)
      .values({
        status_page_id: statusPage[0].id,
        name: 'Test Component',
        description: 'A test component',
        status: 'operational',
        position: 1
      })
      .returning()
      .execute();

    // Create a maintenance window
    const maintenanceWindow = await db.insert(maintenanceWindowsTable)
      .values({
        status_page_id: statusPage[0].id,
        title: 'Test Maintenance',
        description: 'Test maintenance description',
        status: 'scheduled',
        scheduled_start: new Date(),
        scheduled_end: new Date(Date.now() + 3600000), // 1 hour later
        created_by: user[0].id
      })
      .returning()
      .execute();

    // Link component to maintenance window
    await db.insert(maintenanceAffectedComponentsTable)
      .values({
        maintenance_window_id: maintenanceWindow[0].id,
        component_id: component[0].id
      })
      .execute();

    // Verify affected component relationship exists
    const beforeDeletion = await db.select()
      .from(maintenanceAffectedComponentsTable)
      .where(eq(maintenanceAffectedComponentsTable.component_id, component[0].id))
      .execute();

    expect(beforeDeletion).toHaveLength(1);

    // Delete the component
    const result = await deleteComponent(component[0].id);

    expect(result).toBe(true);

    // Verify component was deleted
    const deletedComponent = await db.select()
      .from(componentsTable)
      .where(eq(componentsTable.id, component[0].id))
      .execute();

    expect(deletedComponent).toHaveLength(0);

    // Verify maintenance affected components were cleaned up
    const afterDeletion = await db.select()
      .from(maintenanceAffectedComponentsTable)
      .where(eq(maintenanceAffectedComponentsTable.component_id, component[0].id))
      .execute();

    expect(afterDeletion).toHaveLength(0);

    // Verify maintenance window still exists
    const maintenanceStillExists = await db.select()
      .from(maintenanceWindowsTable)
      .where(eq(maintenanceWindowsTable.id, maintenanceWindow[0].id))
      .execute();

    expect(maintenanceStillExists).toHaveLength(1);
  });

  it('should clean up both incident and maintenance affected components', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed',
        first_name: 'Test',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();

    const org = await db.insert(organizationsTable)
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
        organization_id: org[0].id,
        name: 'Test Status Page',
        slug: 'test-status-page',
        description: 'Test description',
        is_public: true
      })
      .returning()
      .execute();

    const component = await db.insert(componentsTable)
      .values({
        status_page_id: statusPage[0].id,
        name: 'Test Component',
        description: 'A test component',
        status: 'operational',
        position: 1
      })
      .returning()
      .execute();

    // Create an incident and maintenance window
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

    const maintenanceWindow = await db.insert(maintenanceWindowsTable)
      .values({
        status_page_id: statusPage[0].id,
        title: 'Test Maintenance',
        description: 'Test maintenance description',
        status: 'scheduled',
        scheduled_start: new Date(),
        scheduled_end: new Date(Date.now() + 3600000),
        created_by: user[0].id
      })
      .returning()
      .execute();

    // Link component to both incident and maintenance window
    await db.insert(incidentAffectedComponentsTable)
      .values({
        incident_id: incident[0].id,
        component_id: component[0].id
      })
      .execute();

    await db.insert(maintenanceAffectedComponentsTable)
      .values({
        maintenance_window_id: maintenanceWindow[0].id,
        component_id: component[0].id
      })
      .execute();

    // Delete the component
    const result = await deleteComponent(component[0].id);

    expect(result).toBe(true);

    // Verify all related data was cleaned up
    const incidentAffected = await db.select()
      .from(incidentAffectedComponentsTable)
      .where(eq(incidentAffectedComponentsTable.component_id, component[0].id))
      .execute();

    const maintenanceAffected = await db.select()
      .from(maintenanceAffectedComponentsTable)
      .where(eq(maintenanceAffectedComponentsTable.component_id, component[0].id))
      .execute();

    expect(incidentAffected).toHaveLength(0);
    expect(maintenanceAffected).toHaveLength(0);

    // Verify component was deleted
    const deletedComponent = await db.select()
      .from(componentsTable)
      .where(eq(componentsTable.id, component[0].id))
      .execute();

    expect(deletedComponent).toHaveLength(0);
  });
});