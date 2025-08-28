import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { statusPagesTable, organizationsTable, usersTable } from '../db/schema';
import { type CreateStatusPageInput } from '../schema';
import { createStatusPage } from '../handlers/create_status_page';
import { eq } from 'drizzle-orm';

describe('createStatusPage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test organization
  const createTestOrganization = async (planType: 'free' | 'pro' | 'plus' | 'enterprise' = 'free') => {
    // First create a user to be the owner
    const user = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Owner',
        role: 'owner'
      })
      .returning()
      .execute();

    // Then create organization
    const org = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        slug: 'test-org',
        plan_type: planType,
        owner_id: user[0].id
      })
      .returning()
      .execute();

    return org[0];
  };

  const testInput: CreateStatusPageInput = {
    organization_id: 1,
    name: 'Test Status Page',
    slug: 'test-status',
    description: 'A test status page',
    custom_domain: 'status.example.com',
    branding_logo_url: 'https://example.com/logo.png',
    branding_primary_color: '#007bff',
    branding_secondary_color: '#6c757d',
    is_public: true
  };

  it('should create a status page successfully', async () => {
    const org = await createTestOrganization();
    const input = { ...testInput, organization_id: org.id };

    const result = await createStatusPage(input);

    // Verify returned data
    expect(result.id).toBeDefined();
    expect(result.organization_id).toEqual(org.id);
    expect(result.name).toEqual('Test Status Page');
    expect(result.slug).toEqual('test-status');
    expect(result.description).toEqual('A test status page');
    expect(result.custom_domain).toEqual('status.example.com');
    expect(result.branding_logo_url).toEqual('https://example.com/logo.png');
    expect(result.branding_primary_color).toEqual('#007bff');
    expect(result.branding_secondary_color).toEqual('#6c757d');
    expect(result.is_public).toEqual(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save status page to database', async () => {
    const org = await createTestOrganization();
    const input = { ...testInput, organization_id: org.id };

    const result = await createStatusPage(input);

    // Verify data was saved to database
    const statusPages = await db.select()
      .from(statusPagesTable)
      .where(eq(statusPagesTable.id, result.id))
      .execute();

    expect(statusPages).toHaveLength(1);
    expect(statusPages[0].name).toEqual('Test Status Page');
    expect(statusPages[0].organization_id).toEqual(org.id);
    expect(statusPages[0].slug).toEqual('test-status');
    expect(statusPages[0].is_public).toEqual(true);
  });

  it('should handle nullable fields correctly', async () => {
    const org = await createTestOrganization();
    const input = {
      organization_id: org.id,
      name: 'Minimal Status Page',
      slug: 'minimal-status',
      description: null,
      custom_domain: null,
      branding_logo_url: null,
      branding_primary_color: null,
      branding_secondary_color: null,
      is_public: false
    };

    const result = await createStatusPage(input);

    expect(result.name).toEqual('Minimal Status Page');
    expect(result.description).toBeNull();
    expect(result.custom_domain).toBeNull();
    expect(result.branding_logo_url).toBeNull();
    expect(result.branding_primary_color).toBeNull();
    expect(result.branding_secondary_color).toBeNull();
    expect(result.is_public).toEqual(false);
  });

  it('should throw error when organization does not exist', async () => {
    const input = { ...testInput, organization_id: 999 };

    expect(createStatusPage(input)).rejects.toThrow(/organization not found/i);
  });

  describe('plan limit validation', () => {
    it('should allow creation within free plan limit (1 status page)', async () => {
      const org = await createTestOrganization('free');
      const input = { ...testInput, organization_id: org.id };

      const result = await createStatusPage(input);
      expect(result.id).toBeDefined();
    });

    it('should reject creation exceeding free plan limit', async () => {
      const org = await createTestOrganization('free');
      const input = { ...testInput, organization_id: org.id };

      // Create first status page (should succeed)
      await createStatusPage(input);

      // Attempt to create second status page (should fail)
      const input2 = { ...input, name: 'Second Page', slug: 'second-page' };
      expect(createStatusPage(input2)).rejects.toThrow(/plan limit exceeded.*free plan allows maximum 1/i);
    });

    it('should allow creation within pro plan limit (3 status pages)', async () => {
      const org = await createTestOrganization('pro');
      const baseInput = { ...testInput, organization_id: org.id };

      // Create 3 status pages (should all succeed)
      await createStatusPage({ ...baseInput, name: 'Page 1', slug: 'page-1' });
      await createStatusPage({ ...baseInput, name: 'Page 2', slug: 'page-2' });
      const result3 = await createStatusPage({ ...baseInput, name: 'Page 3', slug: 'page-3' });
      
      expect(result3.id).toBeDefined();
    });

    it('should reject creation exceeding pro plan limit', async () => {
      const org = await createTestOrganization('pro');
      const baseInput = { ...testInput, organization_id: org.id };

      // Create 3 status pages first
      await createStatusPage({ ...baseInput, name: 'Page 1', slug: 'page-1' });
      await createStatusPage({ ...baseInput, name: 'Page 2', slug: 'page-2' });
      await createStatusPage({ ...baseInput, name: 'Page 3', slug: 'page-3' });

      // Attempt to create fourth status page (should fail)
      const input4 = { ...baseInput, name: 'Page 4', slug: 'page-4' };
      expect(createStatusPage(input4)).rejects.toThrow(/plan limit exceeded.*pro plan allows maximum 3/i);
    });

    it('should allow creation within plus plan limit (12 status pages)', async () => {
      const org = await createTestOrganization('plus');
      const baseInput = { ...testInput, organization_id: org.id };

      // Create 12 status pages (should all succeed)
      for (let i = 1; i <= 12; i++) {
        await createStatusPage({ 
          ...baseInput, 
          name: `Page ${i}`, 
          slug: `page-${i}` 
        });
      }

      // Verify we can query the last one
      const statusPages = await db.select()
        .from(statusPagesTable)
        .where(eq(statusPagesTable.organization_id, org.id))
        .execute();

      expect(statusPages).toHaveLength(12);
    });

    it('should reject creation exceeding plus plan limit', async () => {
      const org = await createTestOrganization('plus');
      const baseInput = { ...testInput, organization_id: org.id };

      // Create 12 status pages first
      for (let i = 1; i <= 12; i++) {
        await createStatusPage({ 
          ...baseInput, 
          name: `Page ${i}`, 
          slug: `page-${i}` 
        });
      }

      // Attempt to create 13th status page (should fail)
      const input13 = { ...baseInput, name: 'Page 13', slug: 'page-13' };
      expect(createStatusPage(input13)).rejects.toThrow(/plan limit exceeded.*plus plan allows maximum 12/i);
    });

    it('should allow creation within enterprise plan limit (100 status pages)', async () => {
      const org = await createTestOrganization('enterprise');
      const baseInput = { ...testInput, organization_id: org.id };

      // Create several status pages to test enterprise limit handling
      for (let i = 1; i <= 5; i++) {
        await createStatusPage({ 
          ...baseInput, 
          name: `Enterprise Page ${i}`, 
          slug: `enterprise-page-${i}` 
        });
      }

      const statusPages = await db.select()
        .from(statusPagesTable)
        .where(eq(statusPagesTable.organization_id, org.id))
        .execute();

      expect(statusPages).toHaveLength(5);
      expect(statusPages[4].name).toEqual('Enterprise Page 5');
    });
  });
});