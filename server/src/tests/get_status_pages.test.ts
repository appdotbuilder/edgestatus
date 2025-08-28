import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, statusPagesTable } from '../db/schema';
import { type CreateUserInput, type CreateOrganizationInput, type CreateStatusPageInput } from '../schema';
import { getStatusPages } from '../handlers/get_status_pages';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User',
  role: 'owner'
};

const testOrganization: CreateOrganizationInput = {
  name: 'Test Organization',
  slug: 'test-org',
  plan_type: 'free',
  owner_id: 1 // Will be set after user creation
};

const testStatusPage1: CreateStatusPageInput = {
  organization_id: 1, // Will be set after organization creation
  name: 'Main Status Page',
  slug: 'main-status',
  description: 'Primary status page for our services',
  custom_domain: 'status.example.com',
  branding_logo_url: 'https://example.com/logo.png',
  branding_primary_color: '#007bff',
  branding_secondary_color: '#6c757d',
  is_public: true
};

const testStatusPage2: CreateStatusPageInput = {
  organization_id: 1, // Will be set after organization creation
  name: 'Internal Status Page',
  slug: 'internal-status',
  description: 'Internal status page for employees',
  custom_domain: null,
  branding_logo_url: null,
  branding_primary_color: null,
  branding_secondary_color: null,
  is_public: false
};

describe('getStatusPages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return status pages for a valid organization', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: testOrganization.name,
        slug: testOrganization.slug,
        plan_type: testOrganization.plan_type,
        owner_id: userId
      })
      .returning()
      .execute();

    const organizationId = orgResult[0].id;

    // Create test status pages
    await db.insert(statusPagesTable)
      .values([
        {
          ...testStatusPage1,
          organization_id: organizationId
        },
        {
          ...testStatusPage2,
          organization_id: organizationId
        }
      ])
      .execute();

    // Test the handler
    const result = await getStatusPages(organizationId);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Main Status Page');
    expect(result[0].organization_id).toEqual(organizationId);
    expect(result[0].slug).toEqual('main-status');
    expect(result[0].description).toEqual('Primary status page for our services');
    expect(result[0].custom_domain).toEqual('status.example.com');
    expect(result[0].branding_logo_url).toEqual('https://example.com/logo.png');
    expect(result[0].branding_primary_color).toEqual('#007bff');
    expect(result[0].branding_secondary_color).toEqual('#6c757d');
    expect(result[0].is_public).toEqual(true);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].name).toEqual('Internal Status Page');
    expect(result[1].organization_id).toEqual(organizationId);
    expect(result[1].slug).toEqual('internal-status');
    expect(result[1].description).toEqual('Internal status page for employees');
    expect(result[1].custom_domain).toBeNull();
    expect(result[1].branding_logo_url).toBeNull();
    expect(result[1].branding_primary_color).toBeNull();
    expect(result[1].branding_secondary_color).toBeNull();
    expect(result[1].is_public).toEqual(false);
    expect(result[1].id).toBeDefined();
    expect(result[1].created_at).toBeInstanceOf(Date);
    expect(result[1].updated_at).toBeInstanceOf(Date);
  });

  it('should return empty array when organization has no status pages', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test organization without status pages
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: testOrganization.name,
        slug: testOrganization.slug,
        plan_type: testOrganization.plan_type,
        owner_id: userId
      })
      .returning()
      .execute();

    const organizationId = orgResult[0].id;

    // Test the handler
    const result = await getStatusPages(organizationId);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should throw error when organization does not exist', async () => {
    const nonExistentOrganizationId = 999;

    await expect(getStatusPages(nonExistentOrganizationId))
      .rejects.toThrow(/organization with id 999 not found/i);
  });

  it('should not return status pages from other organizations', async () => {
    // Create first test user and organization
    const userResult1 = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'One',
        role: 'owner'
      })
      .returning()
      .execute();

    const userId1 = userResult1[0].id;

    const orgResult1 = await db.insert(organizationsTable)
      .values({
        name: 'Organization One',
        slug: 'org-one',
        plan_type: 'free',
        owner_id: userId1
      })
      .returning()
      .execute();

    const organizationId1 = orgResult1[0].id;

    // Create second test user and organization
    const userResult2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'Two',
        role: 'owner'
      })
      .returning()
      .execute();

    const userId2 = userResult2[0].id;

    const orgResult2 = await db.insert(organizationsTable)
      .values({
        name: 'Organization Two',
        slug: 'org-two',
        plan_type: 'pro',
        owner_id: userId2
      })
      .returning()
      .execute();

    const organizationId2 = orgResult2[0].id;

    // Create status pages for both organizations
    await db.insert(statusPagesTable)
      .values([
        {
          organization_id: organizationId1,
          name: 'Org 1 Status Page',
          slug: 'org1-status',
          description: 'Status page for organization 1',
          custom_domain: null,
          branding_logo_url: null,
          branding_primary_color: null,
          branding_secondary_color: null,
          is_public: true
        },
        {
          organization_id: organizationId2,
          name: 'Org 2 Status Page',
          slug: 'org2-status',
          description: 'Status page for organization 2',
          custom_domain: null,
          branding_logo_url: null,
          branding_primary_color: null,
          branding_secondary_color: null,
          is_public: true
        }
      ])
      .execute();

    // Test that each organization only gets its own status pages
    const result1 = await getStatusPages(organizationId1);
    expect(result1).toHaveLength(1);
    expect(result1[0].name).toEqual('Org 1 Status Page');
    expect(result1[0].organization_id).toEqual(organizationId1);

    const result2 = await getStatusPages(organizationId2);
    expect(result2).toHaveLength(1);
    expect(result2[0].name).toEqual('Org 2 Status Page');
    expect(result2[0].organization_id).toEqual(organizationId2);
  });

  it('should verify status pages are saved correctly in database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: testOrganization.name,
        slug: testOrganization.slug,
        plan_type: testOrganization.plan_type,
        owner_id: userId
      })
      .returning()
      .execute();

    const organizationId = orgResult[0].id;

    // Create test status page
    await db.insert(statusPagesTable)
      .values({
        ...testStatusPage1,
        organization_id: organizationId
      })
      .execute();

    // Get status pages through handler
    const result = await getStatusPages(organizationId);

    // Verify the status page exists in database
    const statusPagesFromDb = await db.select()
      .from(statusPagesTable)
      .where(eq(statusPagesTable.id, result[0].id))
      .execute();

    expect(statusPagesFromDb).toHaveLength(1);
    expect(statusPagesFromDb[0].name).toEqual('Main Status Page');
    expect(statusPagesFromDb[0].organization_id).toEqual(organizationId);
    expect(statusPagesFromDb[0].slug).toEqual('main-status');
    expect(statusPagesFromDb[0].is_public).toEqual(true);
    expect(statusPagesFromDb[0].created_at).toBeInstanceOf(Date);
    expect(statusPagesFromDb[0].updated_at).toBeInstanceOf(Date);
  });
});