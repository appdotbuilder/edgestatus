import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, statusPagesTable, incidentsTable } from '../db/schema';
import { getIncidents } from '../handlers/get_incidents';

describe('getIncidents', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return incidents for a specific status page ordered by created_at DESC', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'member'
      })
      .returning()
      .execute();

    // Create test organization
    const [organization] = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: user.id
      })
      .returning()
      .execute();

    // Create test status page
    const [statusPage] = await db.insert(statusPagesTable)
      .values({
        organization_id: organization.id,
        name: 'Test Status Page',
        slug: 'test-status',
        description: 'Test status page description',
        is_public: true
      })
      .returning()
      .execute();

    // Create multiple incidents with different timestamps
    const incident1Data = {
      status_page_id: statusPage.id,
      title: 'First Incident',
      description: 'First incident description',
      status: 'investigating' as const,
      created_by: user.id
    };

    const incident2Data = {
      status_page_id: statusPage.id,
      title: 'Second Incident',
      description: 'Second incident description',
      status: 'resolved' as const,
      created_by: user.id
    };

    const incident3Data = {
      status_page_id: statusPage.id,
      title: 'Third Incident',
      description: 'Third incident description',
      status: 'monitoring' as const,
      created_by: user.id
    };

    // Insert incidents with slight delays to ensure different timestamps
    const [incident1] = await db.insert(incidentsTable)
      .values(incident1Data)
      .returning()
      .execute();

    // Small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const [incident2] = await db.insert(incidentsTable)
      .values(incident2Data)
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const [incident3] = await db.insert(incidentsTable)
      .values(incident3Data)
      .returning()
      .execute();

    // Fetch incidents using the handler
    const results = await getIncidents(statusPage.id);

    // Verify all incidents are returned
    expect(results).toHaveLength(3);

    // Verify incidents are ordered by created_at DESC (newest first)
    expect(results[0].title).toBe('Third Incident');
    expect(results[1].title).toBe('Second Incident');
    expect(results[2].title).toBe('First Incident');

    // Verify all fields are properly returned
    results.forEach(incident => {
      expect(incident.id).toBeDefined();
      expect(incident.status_page_id).toBe(statusPage.id);
      expect(incident.title).toBeDefined();
      expect(incident.description).toBeDefined();
      expect(incident.status).toBeDefined();
      expect(incident.created_by).toBe(user.id);
      expect(incident.created_at).toBeInstanceOf(Date);
      expect(incident.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array when no incidents exist for status page', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'member'
      })
      .returning()
      .execute();

    // Create test organization
    const [organization] = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: user.id
      })
      .returning()
      .execute();

    // Create test status page
    const [statusPage] = await db.insert(statusPagesTable)
      .values({
        organization_id: organization.id,
        name: 'Test Status Page',
        slug: 'test-status',
        description: 'Test status page description',
        is_public: true
      })
      .returning()
      .execute();

    // Fetch incidents for status page with no incidents
    const results = await getIncidents(statusPage.id);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should only return incidents for the specified status page', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'member'
      })
      .returning()
      .execute();

    // Create test organization
    const [organization] = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: user.id
      })
      .returning()
      .execute();

    // Create two different status pages
    const [statusPage1] = await db.insert(statusPagesTable)
      .values({
        organization_id: organization.id,
        name: 'First Status Page',
        slug: 'first-status',
        description: 'First status page',
        is_public: true
      })
      .returning()
      .execute();

    const [statusPage2] = await db.insert(statusPagesTable)
      .values({
        organization_id: organization.id,
        name: 'Second Status Page',
        slug: 'second-status',
        description: 'Second status page',
        is_public: true
      })
      .returning()
      .execute();

    // Create incidents for both status pages
    await db.insert(incidentsTable)
      .values({
        status_page_id: statusPage1.id,
        title: 'Incident for Status Page 1',
        description: 'Incident description',
        status: 'investigating',
        created_by: user.id
      })
      .execute();

    await db.insert(incidentsTable)
      .values({
        status_page_id: statusPage2.id,
        title: 'Incident for Status Page 2',
        description: 'Incident description',
        status: 'resolved',
        created_by: user.id
      })
      .execute();

    // Fetch incidents for first status page only
    const results = await getIncidents(statusPage1.id);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Incident for Status Page 1');
    expect(results[0].status_page_id).toBe(statusPage1.id);
  });

  it('should handle different incident statuses correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'member'
      })
      .returning()
      .execute();

    // Create test organization
    const [organization] = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: user.id
      })
      .returning()
      .execute();

    // Create test status page
    const [statusPage] = await db.insert(statusPagesTable)
      .values({
        organization_id: organization.id,
        name: 'Test Status Page',
        slug: 'test-status',
        description: 'Test status page description',
        is_public: true
      })
      .returning()
      .execute();

    // Create incidents with all possible statuses
    const statuses = ['investigating', 'identified', 'monitoring', 'resolved'] as const;
    
    for (const status of statuses) {
      await db.insert(incidentsTable)
        .values({
          status_page_id: statusPage.id,
          title: `${status} Incident`,
          description: `Incident with ${status} status`,
          status: status,
          created_by: user.id
        })
        .execute();
    }

    const results = await getIncidents(statusPage.id);

    expect(results).toHaveLength(4);
    
    // Verify all statuses are represented
    const resultStatuses = results.map(incident => incident.status);
    expect(resultStatuses).toContain('investigating');
    expect(resultStatuses).toContain('identified');
    expect(resultStatuses).toContain('monitoring');
    expect(resultStatuses).toContain('resolved');
  });

  it('should return empty array for non-existent status page', async () => {
    const nonExistentStatusPageId = 999999;
    
    const results = await getIncidents(nonExistentStatusPageId);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });
});