import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, statusPagesTable, incidentsTable, incidentUpdatesTable } from '../db/schema';
import { getIncidentUpdates } from '../handlers/get_incident_updates';

describe('getIncidentUpdates', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return incident updates ordered by created_at DESC', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'owner'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

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

    const statusPageResult = await db.insert(statusPagesTable)
      .values({
        organization_id: orgId,
        name: 'Test Status Page',
        slug: 'test-status-page',
        description: 'Test status page',
        is_public: true
      })
      .returning()
      .execute();
    const statusPageId = statusPageResult[0].id;

    const incidentResult = await db.insert(incidentsTable)
      .values({
        status_page_id: statusPageId,
        title: 'Test Incident',
        description: 'Test incident description',
        status: 'investigating',
        created_by: userId
      })
      .returning()
      .execute();
    const incidentId = incidentResult[0].id;

    // Create multiple incident updates with slight time differences
    const update1Result = await db.insert(incidentUpdatesTable)
      .values({
        incident_id: incidentId,
        title: 'First Update',
        description: 'First update description',
        status: 'investigating',
        created_by: userId
      })
      .returning()
      .execute();

    // Add a small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const update2Result = await db.insert(incidentUpdatesTable)
      .values({
        incident_id: incidentId,
        title: 'Second Update',
        description: 'Second update description',
        status: 'identified',
        created_by: userId
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const update3Result = await db.insert(incidentUpdatesTable)
      .values({
        incident_id: incidentId,
        title: 'Third Update',
        description: 'Third update description',
        status: 'resolved',
        created_by: userId
      })
      .returning()
      .execute();

    // Get incident updates
    const result = await getIncidentUpdates(incidentId);

    // Verify results
    expect(result).toHaveLength(3);
    
    // Verify ordering - newest first (DESC order)
    expect(result[0].title).toEqual('Third Update');
    expect(result[1].title).toEqual('Second Update');
    expect(result[2].title).toEqual('First Update');

    // Verify all updates belong to the correct incident
    result.forEach(update => {
      expect(update.incident_id).toEqual(incidentId);
    });

    // Verify field types and values
    expect(result[0].id).toBeDefined();
    expect(result[0].status).toEqual('resolved');
    expect(result[0].created_by).toEqual(userId);
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].status).toEqual('identified');
    expect(result[2].status).toEqual('investigating');
  });

  it('should return empty array for incident with no updates', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'owner'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

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

    const statusPageResult = await db.insert(statusPagesTable)
      .values({
        organization_id: orgId,
        name: 'Test Status Page',
        slug: 'test-status-page',
        description: 'Test status page',
        is_public: true
      })
      .returning()
      .execute();
    const statusPageId = statusPageResult[0].id;

    const incidentResult = await db.insert(incidentsTable)
      .values({
        status_page_id: statusPageId,
        title: 'Test Incident',
        description: 'Test incident description',
        status: 'investigating',
        created_by: userId
      })
      .returning()
      .execute();
    const incidentId = incidentResult[0].id;

    // Get updates for incident with no updates
    const result = await getIncidentUpdates(incidentId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent incident', async () => {
    const nonExistentIncidentId = 999999;
    
    const result = await getIncidentUpdates(nonExistentIncidentId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return updates for the specified incident', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'owner'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

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

    const statusPageResult = await db.insert(statusPagesTable)
      .values({
        organization_id: orgId,
        name: 'Test Status Page',
        slug: 'test-status-page',
        description: 'Test status page',
        is_public: true
      })
      .returning()
      .execute();
    const statusPageId = statusPageResult[0].id;

    // Create two different incidents
    const incident1Result = await db.insert(incidentsTable)
      .values({
        status_page_id: statusPageId,
        title: 'First Incident',
        description: 'First incident description',
        status: 'investigating',
        created_by: userId
      })
      .returning()
      .execute();
    const incident1Id = incident1Result[0].id;

    const incident2Result = await db.insert(incidentsTable)
      .values({
        status_page_id: statusPageId,
        title: 'Second Incident',
        description: 'Second incident description',
        status: 'investigating',
        created_by: userId
      })
      .returning()
      .execute();
    const incident2Id = incident2Result[0].id;

    // Create updates for both incidents
    await db.insert(incidentUpdatesTable)
      .values({
        incident_id: incident1Id,
        title: 'Update for Incident 1',
        description: 'Update for first incident',
        status: 'investigating',
        created_by: userId
      })
      .execute();

    await db.insert(incidentUpdatesTable)
      .values({
        incident_id: incident1Id,
        title: 'Another update for Incident 1',
        description: 'Another update for first incident',
        status: 'identified',
        created_by: userId
      })
      .execute();

    await db.insert(incidentUpdatesTable)
      .values({
        incident_id: incident2Id,
        title: 'Update for Incident 2',
        description: 'Update for second incident',
        status: 'investigating',
        created_by: userId
      })
      .execute();

    // Get updates for incident 1 only
    const result = await getIncidentUpdates(incident1Id);

    expect(result).toHaveLength(2);
    result.forEach(update => {
      expect(update.incident_id).toEqual(incident1Id);
      expect(update.title).toMatch(/Incident 1/);
    });
  });

  it('should handle correct date ordering with multiple updates', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'owner'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

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

    const statusPageResult = await db.insert(statusPagesTable)
      .values({
        organization_id: orgId,
        name: 'Test Status Page',
        slug: 'test-status-page',
        description: 'Test status page',
        is_public: true
      })
      .returning()
      .execute();
    const statusPageId = statusPageResult[0].id;

    const incidentResult = await db.insert(incidentsTable)
      .values({
        status_page_id: statusPageId,
        title: 'Test Incident',
        description: 'Test incident description',
        status: 'investigating',
        created_by: userId
      })
      .returning()
      .execute();
    const incidentId = incidentResult[0].id;

    // Create updates with known order
    const updates = [];
    for (let i = 1; i <= 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      const updateResult = await db.insert(incidentUpdatesTable)
        .values({
          incident_id: incidentId,
          title: `Update ${i}`,
          description: `Update number ${i}`,
          status: 'investigating',
          created_by: userId
        })
        .returning()
        .execute();
      updates.push(updateResult[0]);
    }

    const result = await getIncidentUpdates(incidentId);

    expect(result).toHaveLength(5);
    
    // Verify descending order by created_at (newest first)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at.getTime()).toBeGreaterThanOrEqual(result[i + 1].created_at.getTime());
    }

    // Verify the order matches expectation (newest first)
    expect(result[0].title).toEqual('Update 5');
    expect(result[4].title).toEqual('Update 1');
  });
});