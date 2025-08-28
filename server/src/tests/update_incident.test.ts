import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, statusPagesTable, incidentsTable } from '../db/schema';
import { type UpdateIncidentInput } from '../schema';
import { updateIncident } from '../handlers/update_incident';
import { eq } from 'drizzle-orm';

describe('updateIncident', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testOrganizationId: number;
  let testStatusPageId: number;
  let testIncidentId: number;

  beforeEach(async () => {
    // Create prerequisite data for testing
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
    testUserId = userResult[0].id;

    const organizationResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        slug: 'test-org',
        plan_type: 'pro',
        owner_id: testUserId
      })
      .returning()
      .execute();
    testOrganizationId = organizationResult[0].id;

    const statusPageResult = await db.insert(statusPagesTable)
      .values({
        organization_id: testOrganizationId,
        name: 'Test Status Page',
        slug: 'test-status',
        description: 'A test status page',
        is_public: true
      })
      .returning()
      .execute();
    testStatusPageId = statusPageResult[0].id;

    const incidentResult = await db.insert(incidentsTable)
      .values({
        status_page_id: testStatusPageId,
        title: 'Original Incident Title',
        description: 'Original incident description',
        status: 'investigating',
        created_by: testUserId
      })
      .returning()
      .execute();
    testIncidentId = incidentResult[0].id;
  });

  it('should update incident title', async () => {
    const input: UpdateIncidentInput = {
      id: testIncidentId,
      title: 'Updated Incident Title'
    };

    const result = await updateIncident(input);

    expect(result.id).toBe(testIncidentId);
    expect(result.title).toBe('Updated Incident Title');
    expect(result.description).toBe('Original incident description'); // Should remain unchanged
    expect(result.status).toBe('investigating'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update incident description', async () => {
    const input: UpdateIncidentInput = {
      id: testIncidentId,
      description: 'Updated incident description'
    };

    const result = await updateIncident(input);

    expect(result.id).toBe(testIncidentId);
    expect(result.title).toBe('Original Incident Title'); // Should remain unchanged
    expect(result.description).toBe('Updated incident description');
    expect(result.status).toBe('investigating'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update incident status', async () => {
    const input: UpdateIncidentInput = {
      id: testIncidentId,
      status: 'identified'
    };

    const result = await updateIncident(input);

    expect(result.id).toBe(testIncidentId);
    expect(result.title).toBe('Original Incident Title'); // Should remain unchanged
    expect(result.description).toBe('Original incident description'); // Should remain unchanged
    expect(result.status).toBe('identified');
    expect(result.resolved_at).toBeNull(); // Should still be null for non-resolved status
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateIncidentInput = {
      id: testIncidentId,
      title: 'Completely Updated Title',
      description: 'Completely updated description',
      status: 'monitoring'
    };

    const result = await updateIncident(input);

    expect(result.id).toBe(testIncidentId);
    expect(result.title).toBe('Completely Updated Title');
    expect(result.description).toBe('Completely updated description');
    expect(result.status).toBe('monitoring');
    expect(result.resolved_at).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set resolved_at timestamp when status changes to resolved', async () => {
    const input: UpdateIncidentInput = {
      id: testIncidentId,
      status: 'resolved'
    };

    const result = await updateIncident(input);

    expect(result.id).toBe(testIncidentId);
    expect(result.status).toBe('resolved');
    expect(result.resolved_at).toBeInstanceOf(Date);
    expect(result.resolved_at).not.toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should clear resolved_at when status changes from resolved to another status', async () => {
    // First, set incident to resolved
    await db.update(incidentsTable)
      .set({
        status: 'resolved',
        resolved_at: new Date()
      })
      .where(eq(incidentsTable.id, testIncidentId))
      .execute();

    // Then update status back to investigating
    const input: UpdateIncidentInput = {
      id: testIncidentId,
      status: 'investigating'
    };

    const result = await updateIncident(input);

    expect(result.id).toBe(testIncidentId);
    expect(result.status).toBe('investigating');
    expect(result.resolved_at).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated incident to database', async () => {
    const input: UpdateIncidentInput = {
      id: testIncidentId,
      title: 'Database Updated Title',
      description: 'Database updated description',
      status: 'resolved'
    };

    await updateIncident(input);

    // Verify the change was persisted to database
    const incidents = await db.select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, testIncidentId))
      .execute();

    expect(incidents).toHaveLength(1);
    const incident = incidents[0];
    expect(incident.title).toBe('Database Updated Title');
    expect(incident.description).toBe('Database updated description');
    expect(incident.status).toBe('resolved');
    expect(incident.resolved_at).toBeInstanceOf(Date);
    expect(incident.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when incident does not exist', async () => {
    const input: UpdateIncidentInput = {
      id: 99999, // Non-existent ID
      title: 'Should Not Update'
    };

    await expect(updateIncident(input)).rejects.toThrow(/Incident with id 99999 not found/i);
  });

  it('should update only the updated_at field when no other fields are provided', async () => {
    const originalIncident = await db.select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, testIncidentId))
      .execute();

    const input: UpdateIncidentInput = {
      id: testIncidentId
    };

    const result = await updateIncident(input);

    expect(result.id).toBe(testIncidentId);
    expect(result.title).toBe(originalIncident[0].title); // Should remain unchanged
    expect(result.description).toBe(originalIncident[0].description); // Should remain unchanged
    expect(result.status).toBe(originalIncident[0].status); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalIncident[0].updated_at).toBe(true); // Should be more recent
  });
});