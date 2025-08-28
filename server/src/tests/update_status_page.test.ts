import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, statusPagesTable } from '../db/schema';
import { type UpdateStatusPageInput } from '../schema';
import { updateStatusPage } from '../handlers/update_status_page';
import { eq } from 'drizzle-orm';

describe('updateStatusPage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testOrganizationId: number;
  let testStatusPageId: number;

  beforeEach(async () => {
    // Create prerequisite test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'owner'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: testUserId
      })
      .returning()
      .execute();
    testOrganizationId = orgResult[0].id;

    // Create test status page
    const statusPageResult = await db.insert(statusPagesTable)
      .values({
        organization_id: testOrganizationId,
        name: 'Original Name',
        slug: 'original-slug',
        description: 'Original description',
        custom_domain: null,
        branding_logo_url: null,
        branding_primary_color: '#000000',
        branding_secondary_color: '#ffffff',
        is_public: true
      })
      .returning()
      .execute();
    testStatusPageId = statusPageResult[0].id;
  });

  it('should update status page with all fields', async () => {
    const updateInput: UpdateStatusPageInput = {
      id: testStatusPageId,
      name: 'Updated Name',
      description: 'Updated description',
      custom_domain: 'status.example.com',
      branding_logo_url: 'https://example.com/logo.png',
      branding_primary_color: '#ff0000',
      branding_secondary_color: '#00ff00',
      is_public: false
    };

    const result = await updateStatusPage(updateInput);

    // Verify returned data
    expect(result.id).toEqual(testStatusPageId);
    expect(result.organization_id).toEqual(testOrganizationId);
    expect(result.name).toEqual('Updated Name');
    expect(result.slug).toEqual('original-slug'); // Slug should not change
    expect(result.description).toEqual('Updated description');
    expect(result.custom_domain).toEqual('status.example.com');
    expect(result.branding_logo_url).toEqual('https://example.com/logo.png');
    expect(result.branding_primary_color).toEqual('#ff0000');
    expect(result.branding_secondary_color).toEqual('#00ff00');
    expect(result.is_public).toEqual(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update status page with partial fields', async () => {
    const updateInput: UpdateStatusPageInput = {
      id: testStatusPageId,
      name: 'Partially Updated Name',
      is_public: false
    };

    const result = await updateStatusPage(updateInput);

    // Verify only specified fields were updated
    expect(result.name).toEqual('Partially Updated Name');
    expect(result.is_public).toEqual(false);
    // Other fields should remain unchanged
    expect(result.description).toEqual('Original description');
    expect(result.branding_primary_color).toEqual('#000000');
    expect(result.branding_secondary_color).toEqual('#ffffff');
  });

  it('should update status page with null values', async () => {
    const updateInput: UpdateStatusPageInput = {
      id: testStatusPageId,
      description: null,
      custom_domain: null,
      branding_logo_url: null
    };

    const result = await updateStatusPage(updateInput);

    // Verify null values were set
    expect(result.description).toBeNull();
    expect(result.custom_domain).toBeNull();
    expect(result.branding_logo_url).toBeNull();
    // Other fields should remain unchanged
    expect(result.name).toEqual('Original Name');
    expect(result.branding_primary_color).toEqual('#000000');
  });

  it('should persist changes to database', async () => {
    const updateInput: UpdateStatusPageInput = {
      id: testStatusPageId,
      name: 'Database Test Name',
      description: 'Database test description'
    };

    await updateStatusPage(updateInput);

    // Verify changes were persisted
    const statusPages = await db.select()
      .from(statusPagesTable)
      .where(eq(statusPagesTable.id, testStatusPageId))
      .execute();

    expect(statusPages).toHaveLength(1);
    expect(statusPages[0].name).toEqual('Database Test Name');
    expect(statusPages[0].description).toEqual('Database test description');
    expect(statusPages[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    // Get original timestamp
    const originalStatusPages = await db.select()
      .from(statusPagesTable)
      .where(eq(statusPagesTable.id, testStatusPageId))
      .execute();
    const originalUpdatedAt = originalStatusPages[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateStatusPageInput = {
      id: testStatusPageId,
      name: 'Timestamp Test'
    };

    const result = await updateStatusPage(updateInput);

    // Verify updated_at was changed
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent status page', async () => {
    const updateInput: UpdateStatusPageInput = {
      id: 99999, // Non-existent ID
      name: 'Should Not Work'
    };

    await expect(updateStatusPage(updateInput)).rejects.toThrow(/Status page with ID 99999 not found/i);
  });

  it('should handle empty update gracefully', async () => {
    const updateInput: UpdateStatusPageInput = {
      id: testStatusPageId
      // No other fields provided
    };

    const result = await updateStatusPage(updateInput);

    // Should return the status page with updated timestamp
    expect(result.id).toEqual(testStatusPageId);
    expect(result.name).toEqual('Original Name'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should preserve original slug when updating', async () => {
    const updateInput: UpdateStatusPageInput = {
      id: testStatusPageId,
      name: 'Completely New Name'
    };

    const result = await updateStatusPage(updateInput);

    // Slug should remain unchanged even when name changes
    expect(result.slug).toEqual('original-slug');
    expect(result.name).toEqual('Completely New Name');
  });
});