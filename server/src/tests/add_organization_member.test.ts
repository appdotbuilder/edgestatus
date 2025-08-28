import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, organizationMembersTable } from '../db/schema';
import { addOrganizationMember } from '../handlers/add_organization_member';
import { eq, and } from 'drizzle-orm';

describe('addOrganizationMember', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testMember: any;
  let testOrganization: any;

  beforeEach(async () => {
    // Create test user (owner)
    const users = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Owner',
        role: 'owner'
      })
      .returning()
      .execute();
    testUser = users[0];

    // Create test member to add
    const members = await db.insert(usersTable)
      .values({
        email: 'member@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Member',
        role: 'member'
      })
      .returning()
      .execute();
    testMember = members[0];

    // Create test organization
    const organizations = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        slug: 'test-org',
        plan_type: 'free',
        owner_id: testUser.id
      })
      .returning()
      .execute();
    testOrganization = organizations[0];
  });

  it('should add a member to an organization', async () => {
    const result = await addOrganizationMember(testOrganization.id, testMember.id, 'member');

    // Verify return value
    expect(result.organization_id).toEqual(testOrganization.id);
    expect(result.user_id).toEqual(testMember.id);
    expect(result.role).toEqual('member');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save member to database', async () => {
    const result = await addOrganizationMember(testOrganization.id, testMember.id, 'admin');

    // Verify in database
    const members = await db.select()
      .from(organizationMembersTable)
      .where(eq(organizationMembersTable.id, result.id))
      .execute();

    expect(members).toHaveLength(1);
    expect(members[0].organization_id).toEqual(testOrganization.id);
    expect(members[0].user_id).toEqual(testMember.id);
    expect(members[0].role).toEqual('admin');
    expect(members[0].created_at).toBeInstanceOf(Date);
  });

  it('should use default role when not specified', async () => {
    const result = await addOrganizationMember(testOrganization.id, testMember.id);

    expect(result.role).toEqual('member');
  });

  it('should throw error for non-existent organization', async () => {
    await expect(addOrganizationMember(99999, testMember.id)).rejects.toThrow(/organization not found/i);
  });

  it('should throw error for non-existent user', async () => {
    await expect(addOrganizationMember(testOrganization.id, 99999)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when user is already a member', async () => {
    // Add member first time
    await addOrganizationMember(testOrganization.id, testMember.id);

    // Try to add same member again
    await expect(addOrganizationMember(testOrganization.id, testMember.id)).rejects.toThrow(/already a member/i);
  });

  it('should enforce free plan member limit', async () => {
    // Create 7 users (free plan limit)
    const userPromises = [];
    for (let i = 0; i < 7; i++) {
      userPromises.push(
        db.insert(usersTable)
          .values({
            email: `user${i}@test.com`,
            password_hash: 'hashedpassword',
            first_name: 'User',
            last_name: `${i}`,
            role: 'member'
          })
          .returning()
          .execute()
      );
    }

    const users = await Promise.all(userPromises);

    // Add 7 members to reach limit
    for (let i = 0; i < 7; i++) {
      await addOrganizationMember(testOrganization.id, users[i][0].id);
    }

    // Try to add 8th member (should fail)
    await expect(addOrganizationMember(testOrganization.id, testMember.id)).rejects.toThrow(/reached the member limit.*free.*7/i);
  });

  it('should enforce pro plan member limit', async () => {
    // Update organization to pro plan
    await db.update(organizationsTable)
      .set({ plan_type: 'pro' })
      .where(eq(organizationsTable.id, testOrganization.id))
      .execute();

    // Create 35 users (pro plan limit)
    const userPromises = [];
    for (let i = 0; i < 35; i++) {
      userPromises.push(
        db.insert(usersTable)
          .values({
            email: `user${i}@test.com`,
            password_hash: 'hashedpassword',
            first_name: 'User',
            last_name: `${i}`,
            role: 'member'
          })
          .returning()
          .execute()
      );
    }

    const users = await Promise.all(userPromises);

    // Add 35 members to reach limit
    for (let i = 0; i < 35; i++) {
      await addOrganizationMember(testOrganization.id, users[i][0].id);
    }

    // Try to add 36th member (should fail)
    await expect(addOrganizationMember(testOrganization.id, testMember.id)).rejects.toThrow(/reached the member limit.*pro.*35/i);
  });

  it('should enforce plus plan member limit', async () => {
    // Update organization to plus plan
    await db.update(organizationsTable)
      .set({ plan_type: 'plus' })
      .where(eq(organizationsTable.id, testOrganization.id))
      .execute();

    // Create 50 users (plus plan limit)
    const userPromises = [];
    for (let i = 0; i < 50; i++) {
      userPromises.push(
        db.insert(usersTable)
          .values({
            email: `user${i}@test.com`,
            password_hash: 'hashedpassword',
            first_name: 'User',
            last_name: `${i}`,
            role: 'member'
          })
          .returning()
          .execute()
      );
    }

    const users = await Promise.all(userPromises);

    // Add 50 members to reach limit
    for (let i = 0; i < 50; i++) {
      await addOrganizationMember(testOrganization.id, users[i][0].id);
    }

    // Try to add 51st member (should fail)
    await expect(addOrganizationMember(testOrganization.id, testMember.id)).rejects.toThrow(/reached the member limit.*plus.*50/i);
  });

  it('should allow unlimited members for enterprise plan', async () => {
    // Update organization to enterprise plan
    await db.update(organizationsTable)
      .set({ plan_type: 'enterprise' })
      .where(eq(organizationsTable.id, testOrganization.id))
      .execute();

    // Create many users to test no limit
    const userPromises = [];
    for (let i = 0; i < 100; i++) {
      userPromises.push(
        db.insert(usersTable)
          .values({
            email: `user${i}@test.com`,
            password_hash: 'hashedpassword',
            first_name: 'User',
            last_name: `${i}`,
            role: 'member'
          })
          .returning()
          .execute()
      );
    }

    const users = await Promise.all(userPromises);

    // Add 100 members (should succeed on enterprise)
    for (let i = 0; i < 100; i++) {
      const result = await addOrganizationMember(testOrganization.id, users[i][0].id);
      expect(result.organization_id).toEqual(testOrganization.id);
    }

    // Should still be able to add more
    const result = await addOrganizationMember(testOrganization.id, testMember.id);
    expect(result.organization_id).toEqual(testOrganization.id);
  });

  it('should handle different user roles correctly', async () => {
    const roles = ['member', 'admin', 'viewer', 'owner'] as const;

    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      // Create a new user for each role test with unique email
      const users = await db.insert(usersTable)
        .values({
          email: `${role}${i}@test.com`,
          password_hash: 'hashedpassword',
          first_name: 'Test',
          last_name: role,
          role: 'member'
        })
        .returning()
        .execute();

      const result = await addOrganizationMember(testOrganization.id, users[0].id, role);
      expect(result.role).toEqual(role);
    }
  });
});