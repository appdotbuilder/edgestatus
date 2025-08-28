import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  organizationsTable, 
  statusPagesTable, 
  componentsTable, 
  incidentsTable, 
  incidentAffectedComponentsTable 
} from '../db/schema';
import { type CreateIncidentInput } from '../schema';
import { createIncident } from '../handlers/create_incident';
import { eq } from 'drizzle-orm';

describe('createIncident', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testOrganization: any;
  let testStatusPage: any;
  let testComponent1: any;
  let testComponent2: any;

  beforeEach(async () => {
    // Create prerequisite data
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
    testUser = userResult[0];

    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        slug: 'test-org',
        plan_type: 'pro',
        owner_id: testUser.id
      })
      .returning()
      .execute();
    testOrganization = orgResult[0];

    const statusPageResult = await db.insert(statusPagesTable)
      .values({
        organization_id: testOrganization.id,
        name: 'Test Status Page',
        slug: 'test-status',
        description: 'Test status page',
        is_public: true
      })
      .returning()
      .execute();
    testStatusPage = statusPageResult[0];

    const component1Result = await db.insert(componentsTable)
      .values({
        status_page_id: testStatusPage.id,
        name: 'API Service',
        description: 'Main API service',
        status: 'operational',
        position: 1
      })
      .returning()
      .execute();
    testComponent1 = component1Result[0];

    const component2Result = await db.insert(componentsTable)
      .values({
        status_page_id: testStatusPage.id,
        name: 'Database',
        description: 'Primary database',
        status: 'operational',
        position: 2
      })
      .returning()
      .execute();
    testComponent2 = component2Result[0];
  });

  it('should create an incident with required fields only', async () => {
    const testInput: CreateIncidentInput = {
      status_page_id: testStatusPage.id,
      title: 'API Service Outage',
      description: 'The API service is experiencing issues',
      status: 'investigating',
      created_by: testUser.id,
      affected_component_ids: []
    };

    const result = await createIncident(testInput);

    // Validate returned incident
    expect(result.title).toEqual('API Service Outage');
    expect(result.description).toEqual('The API service is experiencing issues');
    expect(result.status).toEqual('investigating');
    expect(result.status_page_id).toEqual(testStatusPage.id);
    expect(result.created_by).toEqual(testUser.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.resolved_at).toBeNull();
  });

  it('should save incident to database', async () => {
    const testInput: CreateIncidentInput = {
      status_page_id: testStatusPage.id,
      title: 'Database Performance Issues',
      description: 'Database queries are running slowly',
      status: 'identified',
      created_by: testUser.id,
      affected_component_ids: []
    };

    const result = await createIncident(testInput);

    // Query database to verify incident was saved
    const incidents = await db.select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, result.id))
      .execute();

    expect(incidents).toHaveLength(1);
    expect(incidents[0].title).toEqual('Database Performance Issues');
    expect(incidents[0].description).toEqual('Database queries are running slowly');
    expect(incidents[0].status).toEqual('identified');
    expect(incidents[0].status_page_id).toEqual(testStatusPage.id);
    expect(incidents[0].created_by).toEqual(testUser.id);
    expect(incidents[0].created_at).toBeInstanceOf(Date);
  });

  it('should create incident with affected components', async () => {
    const testInput: CreateIncidentInput = {
      status_page_id: testStatusPage.id,
      title: 'Multiple Service Outage',
      description: 'Both API and database are affected',
      status: 'investigating',
      created_by: testUser.id,
      affected_component_ids: [testComponent1.id, testComponent2.id]
    };

    const result = await createIncident(testInput);

    // Verify incident was created
    expect(result.id).toBeDefined();
    expect(result.title).toEqual('Multiple Service Outage');

    // Verify affected components were linked
    const affectedComponents = await db.select()
      .from(incidentAffectedComponentsTable)
      .where(eq(incidentAffectedComponentsTable.incident_id, result.id))
      .execute();

    expect(affectedComponents).toHaveLength(2);
    
    const componentIds = affectedComponents.map(ac => ac.component_id).sort();
    expect(componentIds).toEqual([testComponent1.id, testComponent2.id].sort());
    
    // Verify all affected components have the correct incident_id
    affectedComponents.forEach(ac => {
      expect(ac.incident_id).toEqual(result.id);
      expect(ac.created_at).toBeInstanceOf(Date);
    });
  });

  it('should create incident with single affected component', async () => {
    const testInput: CreateIncidentInput = {
      status_page_id: testStatusPage.id,
      title: 'API Service Maintenance',
      description: 'Scheduled maintenance on API service',
      status: 'monitoring',
      created_by: testUser.id,
      affected_component_ids: [testComponent1.id]
    };

    const result = await createIncident(testInput);

    // Verify affected component relationship
    const affectedComponents = await db.select()
      .from(incidentAffectedComponentsTable)
      .where(eq(incidentAffectedComponentsTable.incident_id, result.id))
      .execute();

    expect(affectedComponents).toHaveLength(1);
    expect(affectedComponents[0].component_id).toEqual(testComponent1.id);
    expect(affectedComponents[0].incident_id).toEqual(result.id);
  });

  it('should handle empty affected_component_ids array', async () => {
    const testInput: CreateIncidentInput = {
      status_page_id: testStatusPage.id,
      title: 'General System Notice',
      description: 'System-wide notification',
      status: 'resolved',
      created_by: testUser.id,
      affected_component_ids: []
    };

    const result = await createIncident(testInput);

    // Verify incident was created
    expect(result.id).toBeDefined();
    expect(result.title).toEqual('General System Notice');

    // Verify no affected components were created
    const affectedComponents = await db.select()
      .from(incidentAffectedComponentsTable)
      .where(eq(incidentAffectedComponentsTable.incident_id, result.id))
      .execute();

    expect(affectedComponents).toHaveLength(0);
  });

  it('should handle various incident statuses', async () => {
    const statuses = ['investigating', 'identified', 'monitoring', 'resolved'] as const;

    for (const status of statuses) {
      const testInput: CreateIncidentInput = {
        status_page_id: testStatusPage.id,
        title: `Test Incident - ${status}`,
        description: `Testing ${status} status`,
        status: status,
        created_by: testUser.id,
        affected_component_ids: []
      };

      const result = await createIncident(testInput);

      expect(result.status).toEqual(status);
      expect(result.title).toEqual(`Test Incident - ${status}`);
    }
  });

  it('should throw error for invalid status_page_id', async () => {
    const testInput: CreateIncidentInput = {
      status_page_id: 99999, // Non-existent status page
      title: 'Invalid Status Page Test',
      description: 'This should fail',
      status: 'investigating',
      created_by: testUser.id,
      affected_component_ids: []
    };

    expect(createIncident(testInput)).rejects.toThrow(/violates foreign key constraint|foreign key/i);
  });

  it('should throw error for invalid created_by user', async () => {
    const testInput: CreateIncidentInput = {
      status_page_id: testStatusPage.id,
      title: 'Invalid User Test',
      description: 'This should fail',
      status: 'investigating',
      created_by: 99999, // Non-existent user
      affected_component_ids: []
    };

    expect(createIncident(testInput)).rejects.toThrow(/violates foreign key constraint|foreign key/i);
  });

  it('should throw error for invalid component_id in affected_component_ids', async () => {
    const testInput: CreateIncidentInput = {
      status_page_id: testStatusPage.id,
      title: 'Invalid Component Test',
      description: 'This should fail when creating affected components',
      status: 'investigating',
      created_by: testUser.id,
      affected_component_ids: [99999] // Non-existent component
    };

    expect(createIncident(testInput)).rejects.toThrow(/violates foreign key constraint|foreign key/i);
  });
});