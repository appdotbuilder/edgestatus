import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, statusPagesTable, incidentsTable, incidentUpdatesTable } from '../db/schema';
import { type CreateIncidentUpdateInput } from '../schema';
import { createIncidentUpdate } from '../handlers/create_incident_update';
import { eq } from 'drizzle-orm';

describe('createIncidentUpdate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test data setup helper
  const setupTestData = async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        slug: 'test-org',
        plan_type: 'pro',
        owner_id: user.id
      })
      .returning()
      .execute();

    const organization = orgResult[0];

    // Create status page
    const statusPageResult = await db.insert(statusPagesTable)
      .values({
        organization_id: organization.id,
        name: 'Test Status Page',
        slug: 'test-status',
        description: 'Test status page',
        is_public: true
      })
      .returning()
      .execute();

    const statusPage = statusPageResult[0];

    // Create incident
    const incidentResult = await db.insert(incidentsTable)
      .values({
        status_page_id: statusPage.id,
        title: 'Test Incident',
        description: 'Test incident description',
        status: 'investigating',
        created_by: user.id
      })
      .returning()
      .execute();

    const incident = incidentResult[0];

    return { user, organization, statusPage, incident };
  };

  it('should create an incident update', async () => {
    const { user, incident } = await setupTestData();

    const testInput: CreateIncidentUpdateInput = {
      incident_id: incident.id,
      title: 'Issue Identified',
      description: 'We have identified the root cause of the issue',
      status: 'identified',
      created_by: user.id
    };

    const result = await createIncidentUpdate(testInput);

    // Verify the returned incident update
    expect(result.incident_id).toEqual(incident.id);
    expect(result.title).toEqual('Issue Identified');
    expect(result.description).toEqual(testInput.description);
    expect(result.status).toEqual('identified');
    expect(result.created_by).toEqual(user.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save incident update to database', async () => {
    const { user, incident } = await setupTestData();

    const testInput: CreateIncidentUpdateInput = {
      incident_id: incident.id,
      title: 'Issue Monitoring',
      description: 'We are monitoring the fix',
      status: 'monitoring',
      created_by: user.id
    };

    const result = await createIncidentUpdate(testInput);

    // Query the database to verify the update was saved
    const updates = await db.select()
      .from(incidentUpdatesTable)
      .where(eq(incidentUpdatesTable.id, result.id))
      .execute();

    expect(updates).toHaveLength(1);
    expect(updates[0].incident_id).toEqual(incident.id);
    expect(updates[0].title).toEqual('Issue Monitoring');
    expect(updates[0].description).toEqual(testInput.description);
    expect(updates[0].status).toEqual('monitoring');
    expect(updates[0].created_by).toEqual(user.id);
    expect(updates[0].created_at).toBeInstanceOf(Date);
  });

  it('should update parent incident status and timestamp', async () => {
    const { user, incident } = await setupTestData();

    const testInput: CreateIncidentUpdateInput = {
      incident_id: incident.id,
      title: 'Issue Identified',
      description: 'Root cause identified',
      status: 'identified',
      created_by: user.id
    };

    await createIncidentUpdate(testInput);

    // Verify the parent incident was updated
    const updatedIncidents = await db.select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, incident.id))
      .execute();

    expect(updatedIncidents).toHaveLength(1);
    const updatedIncident = updatedIncidents[0];
    expect(updatedIncident.status).toEqual('identified');
    expect(updatedIncident.updated_at).toBeInstanceOf(Date);
    expect(updatedIncident.updated_at > incident.updated_at).toBe(true);
    expect(updatedIncident.resolved_at).toBeNull();
  });

  it('should set resolved_at when status is resolved', async () => {
    const { user, incident } = await setupTestData();

    const testInput: CreateIncidentUpdateInput = {
      incident_id: incident.id,
      title: 'Issue Resolved',
      description: 'The issue has been completely resolved',
      status: 'resolved',
      created_by: user.id
    };

    await createIncidentUpdate(testInput);

    // Verify resolved_at was set
    const updatedIncidents = await db.select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, incident.id))
      .execute();

    expect(updatedIncidents).toHaveLength(1);
    const updatedIncident = updatedIncidents[0];
    expect(updatedIncident.status).toEqual('resolved');
    expect(updatedIncident.resolved_at).toBeInstanceOf(Date);
    expect(updatedIncident.resolved_at).not.toBeNull();
  });

  it('should handle all incident status types', async () => {
    const { user, incident } = await setupTestData();

    const statuses = ['investigating', 'identified', 'monitoring', 'resolved'] as const;

    for (const status of statuses) {
      const testInput: CreateIncidentUpdateInput = {
        incident_id: incident.id,
        title: `Status Update: ${status}`,
        description: `Update for ${status} status`,
        status: status,
        created_by: user.id
      };

      const result = await createIncidentUpdate(testInput);

      expect(result.status).toEqual(status);
      expect(result.title).toEqual(`Status Update: ${status}`);
    }
  });

  it('should fail when incident does not exist', async () => {
    const { user } = await setupTestData();

    const testInput: CreateIncidentUpdateInput = {
      incident_id: 99999, // Non-existent incident ID
      title: 'Update for non-existent incident',
      description: 'This should fail',
      status: 'investigating',
      created_by: user.id
    };

    await expect(createIncidentUpdate(testInput)).rejects.toThrow(/foreign key constraint/i);
  });

  it('should fail when user does not exist', async () => {
    const { incident } = await setupTestData();

    const testInput: CreateIncidentUpdateInput = {
      incident_id: incident.id,
      title: 'Update with invalid user',
      description: 'This should fail',
      status: 'investigating',
      created_by: 99999 // Non-existent user ID
    };

    await expect(createIncidentUpdate(testInput)).rejects.toThrow(/foreign key constraint/i);
  });
});