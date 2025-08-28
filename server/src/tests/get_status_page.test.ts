import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { statusPagesTable, organizationsTable, usersTable } from '../db/schema';
import { getStatusPage } from '../handlers/get_status_page';
import { eq } from 'drizzle-orm';

describe('getStatusPage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a status page by id', async () => {
    // Create prerequisite user and organization
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Doe',
        role: 'owner'
      })
      .returning()
      .execute();

    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        slug: 'test-org',
        plan_type: 'pro',
        owner_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create status page
    const statusPageResult = await db.insert(statusPagesTable)
      .values({
        organization_id: orgResult[0].id,
        name: 'Test Status Page',
        slug: 'test-status',
        description: 'A test status page',
        custom_domain: 'status.example.com',
        branding_logo_url: 'https://example.com/logo.png',
        branding_primary_color: '#3B82F6',
        branding_secondary_color: '#64748B',
        is_public: true
      })
      .returning()
      .execute();

    const result = await getStatusPage(statusPageResult[0].id);

    // Verify all fields
    expect(result).toBeDefined();
    expect(result!.id).toEqual(statusPageResult[0].id);
    expect(result!.organization_id).toEqual(orgResult[0].id);
    expect(result!.name).toEqual('Test Status Page');
    expect(result!.slug).toEqual('test-status');
    expect(result!.description).toEqual('A test status page');
    expect(result!.custom_domain).toEqual('status.example.com');
    expect(result!.branding_logo_url).toEqual('https://example.com/logo.png');
    expect(result!.branding_primary_color).toEqual('#3B82F6');
    expect(result!.branding_secondary_color).toEqual('#64748B');
    expect(result!.is_public).toEqual(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent status page', async () => {
    const result = await getStatusPage(999);
    expect(result).toBeNull();
  });

  it('should handle status page with nullable fields', async () => {
    // Create prerequisite user and organization
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Doe',
        role: 'owner'
      })
      .returning()
      .execute();

    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create status page with minimal fields (nullables left as null)
    const statusPageResult = await db.insert(statusPagesTable)
      .values({
        organization_id: orgResult[0].id,
        name: 'Minimal Status Page',
        slug: 'minimal-status',
        description: null,
        custom_domain: null,
        branding_logo_url: null,
        branding_primary_color: null,
        branding_secondary_color: null,
        is_public: false
      })
      .returning()
      .execute();

    const result = await getStatusPage(statusPageResult[0].id);

    expect(result).toBeDefined();
    expect(result!.name).toEqual('Minimal Status Page');
    expect(result!.slug).toEqual('minimal-status');
    expect(result!.description).toBeNull();
    expect(result!.custom_domain).toBeNull();
    expect(result!.branding_logo_url).toBeNull();
    expect(result!.branding_primary_color).toBeNull();
    expect(result!.branding_secondary_color).toBeNull();
    expect(result!.is_public).toEqual(false);
  });

  it('should verify database persistence', async () => {
    // Create prerequisite user and organization
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Doe',
        role: 'owner'
      })
      .returning()
      .execute();

    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        slug: 'test-org',
        plan_type: 'enterprise',
        owner_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create status page
    const statusPageResult = await db.insert(statusPagesTable)
      .values({
        organization_id: orgResult[0].id,
        name: 'Persistent Status Page',
        slug: 'persistent-status',
        description: 'Testing persistence',
        is_public: true
      })
      .returning()
      .execute();

    // Use handler to get status page
    const handlerResult = await getStatusPage(statusPageResult[0].id);

    // Verify directly from database
    const dbResult = await db.select()
      .from(statusPagesTable)
      .where(eq(statusPagesTable.id, statusPageResult[0].id))
      .execute();

    expect(dbResult).toHaveLength(1);
    expect(handlerResult!.id).toEqual(dbResult[0].id);
    expect(handlerResult!.name).toEqual(dbResult[0].name);
    expect(handlerResult!.slug).toEqual(dbResult[0].slug);
    expect(handlerResult!.description).toEqual(dbResult[0].description);
    expect(handlerResult!.is_public).toEqual(dbResult[0].is_public);
  });

  it('should handle public and private status pages correctly', async () => {
    // Create prerequisite user and organization
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Doe',
        role: 'owner'
      })
      .returning()
      .execute();

    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        slug: 'test-org',
        plan_type: 'plus',
        owner_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create public status page
    const publicStatusPageResult = await db.insert(statusPagesTable)
      .values({
        organization_id: orgResult[0].id,
        name: 'Public Status Page',
        slug: 'public-status',
        is_public: true
      })
      .returning()
      .execute();

    // Create private status page
    const privateStatusPageResult = await db.insert(statusPagesTable)
      .values({
        organization_id: orgResult[0].id,
        name: 'Private Status Page',
        slug: 'private-status',
        is_public: false
      })
      .returning()
      .execute();

    // Test retrieving public status page
    const publicResult = await getStatusPage(publicStatusPageResult[0].id);
    expect(publicResult).toBeDefined();
    expect(publicResult!.is_public).toEqual(true);
    expect(publicResult!.name).toEqual('Public Status Page');

    // Test retrieving private status page
    const privateResult = await getStatusPage(privateStatusPageResult[0].id);
    expect(privateResult).toBeDefined();
    expect(privateResult!.is_public).toEqual(false);
    expect(privateResult!.name).toEqual('Private Status Page');
  });
});