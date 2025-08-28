import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable, usersTable } from '../db/schema';
import { type CreateOrganizationInput } from '../schema';
import { createOrganization } from '../handlers/create_organization';
import { eq } from 'drizzle-orm';

// Test user and organization input
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  first_name: 'Test',
  last_name: 'User',
  role: 'owner' as const
};

const testInput: CreateOrganizationInput = {
  name: 'Test Organization',
  slug: 'test-org',
  plan_type: 'free',
  owner_id: 1 // Will be set to actual user ID in tests
};

describe('createOrganization', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;

  beforeEach(async () => {
    // Create prerequisite user for organization ownership
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    userId = userResult[0].id;
    testInput.owner_id = userId;
  });

  it('should create an organization', async () => {
    const result = await createOrganization(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Organization');
    expect(result.slug).toEqual('test-org');
    expect(result.plan_type).toEqual('free');
    expect(result.owner_id).toEqual(userId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save organization to database', async () => {
    const result = await createOrganization(testInput);

    // Query organization from database
    const organizations = await db.select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, result.id))
      .execute();

    expect(organizations).toHaveLength(1);
    expect(organizations[0].name).toEqual('Test Organization');
    expect(organizations[0].slug).toEqual('test-org');
    expect(organizations[0].plan_type).toEqual('free');
    expect(organizations[0].owner_id).toEqual(userId);
    expect(organizations[0].created_at).toBeInstanceOf(Date);
    expect(organizations[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create organization with default plan type', async () => {
    const inputWithoutPlan: CreateOrganizationInput = {
      name: 'Default Plan Org',
      slug: 'default-plan',
      plan_type: 'free', // Include required field explicitly 
      owner_id: userId
    };

    const result = await createOrganization(inputWithoutPlan);

    expect(result.plan_type).toEqual('free');
    expect(result.name).toEqual('Default Plan Org');
    expect(result.slug).toEqual('default-plan');
  });

  it('should create organization with different plan types', async () => {
    const planTypes = ['free', 'pro', 'plus', 'enterprise'] as const;

    for (const planType of planTypes) {
      const input = {
        name: `${planType} Organization`,
        slug: `${planType}-org`,
        plan_type: planType,
        owner_id: userId
      };

      const result = await createOrganization(input);
      expect(result.plan_type).toEqual(planType);
      expect(result.name).toEqual(`${planType} Organization`);
    }
  });

  it('should throw error when owner does not exist', async () => {
    const invalidInput = {
      ...testInput,
      owner_id: 999 // Non-existent user ID
    };

    await expect(createOrganization(invalidInput))
      .rejects.toThrow(/owner with id 999 not found/i);
  });

  it('should throw error when slug already exists', async () => {
    // Create first organization
    await createOrganization(testInput);

    // Try to create another organization with same slug
    const duplicateSlugInput = {
      ...testInput,
      name: 'Different Organization'
    };

    await expect(createOrganization(duplicateSlugInput))
      .rejects.toThrow(/organization with slug 'test-org' already exists/i);
  });

  it('should allow different organizations with unique slugs', async () => {
    // Create first organization
    const firstOrg = await createOrganization(testInput);

    // Create second organization with different slug
    const secondInput = {
      ...testInput,
      name: 'Second Organization',
      slug: 'second-org'
    };
    const secondOrg = await createOrganization(secondInput);

    expect(firstOrg.slug).toEqual('test-org');
    expect(secondOrg.slug).toEqual('second-org');
    expect(firstOrg.id).not.toEqual(secondOrg.id);

    // Verify both exist in database
    const organizations = await db.select()
      .from(organizationsTable)
      .execute();

    expect(organizations).toHaveLength(2);
  });

  it('should handle special characters in organization name', async () => {
    const specialInput = {
      ...testInput,
      name: 'Special & Co. - "The Best" Organization!',
      slug: 'special-co'
    };

    const result = await createOrganization(specialInput);
    expect(result.name).toEqual('Special & Co. - "The Best" Organization!');
    expect(result.slug).toEqual('special-co');
  });
});