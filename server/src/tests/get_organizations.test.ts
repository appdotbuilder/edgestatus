import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, organizationMembersTable } from '../db/schema';
import { getOrganizations } from '../handlers/get_organizations';

describe('getOrganizations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no organizations', async () => {
    // Create a user with no organizations
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'member'
      })
      .returning()
      .execute();

    const result = await getOrganizations(userResult[0].id);

    expect(result).toEqual([]);
  });

  it('should return organizations where user is owner', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Owner',
        last_name: 'User',
        role: 'owner'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create organizations owned by the user
    const orgResult = await db.insert(organizationsTable)
      .values([
        {
          name: 'Owned Org 1',
          slug: 'owned-org-1',
          plan_type: 'free',
          owner_id: userId
        },
        {
          name: 'Owned Org 2',
          slug: 'owned-org-2',
          plan_type: 'pro',
          owner_id: userId
        }
      ])
      .returning()
      .execute();

    const result = await getOrganizations(userId);

    expect(result).toHaveLength(2);
    
    // Sort by name for predictable testing
    const sortedResult = result.sort((a, b) => a.name.localeCompare(b.name));
    
    expect(sortedResult[0].name).toEqual('Owned Org 1');
    expect(sortedResult[0].owner_id).toEqual(userId);
    expect(sortedResult[0].plan_type).toEqual('free');
    expect(sortedResult[1].name).toEqual('Owned Org 2');
    expect(sortedResult[1].owner_id).toEqual(userId);
    expect(sortedResult[1].plan_type).toEqual('pro');
  });

  it('should return organizations where user is member', async () => {
    // Create users
    const userResults = await db.insert(usersTable)
      .values([
        {
          email: 'owner@example.com',
          password_hash: 'hashedpassword',
          first_name: 'Owner',
          last_name: 'User',
          role: 'owner'
        },
        {
          email: 'member@example.com',
          password_hash: 'hashedpassword',
          first_name: 'Member',
          last_name: 'User',
          role: 'member'
        }
      ])
      .returning()
      .execute();

    const ownerId = userResults[0].id;
    const memberId = userResults[1].id;

    // Create organization owned by first user
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Member Org',
        slug: 'member-org',
        plan_type: 'plus',
        owner_id: ownerId
      })
      .returning()
      .execute();

    const orgId = orgResult[0].id;

    // Add second user as member
    await db.insert(organizationMembersTable)
      .values({
        organization_id: orgId,
        user_id: memberId,
        role: 'member'
      })
      .execute();

    const result = await getOrganizations(memberId);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Member Org');
    expect(result[0].owner_id).toEqual(ownerId);
    expect(result[0].plan_type).toEqual('plus');
    expect(result[0].id).toEqual(orgId);
  });

  it('should return organizations where user is both owner and member without duplicates', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'ownerMember@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Owner',
        last_name: 'Member',
        role: 'owner'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create organization owned by the user
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Dual Role Org',
        slug: 'dual-role-org',
        plan_type: 'enterprise',
        owner_id: userId
      })
      .returning()
      .execute();

    const orgId = orgResult[0].id;

    // Also add user as explicit member (this could happen in edge cases)
    await db.insert(organizationMembersTable)
      .values({
        organization_id: orgId,
        user_id: userId,
        role: 'admin'
      })
      .execute();

    const result = await getOrganizations(userId);

    // Should return only one organization (no duplicates)
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Dual Role Org');
    expect(result[0].owner_id).toEqual(userId);
    expect(result[0].plan_type).toEqual('enterprise');
    expect(result[0].id).toEqual(orgId);
  });

  it('should return mixed owned and member organizations', async () => {
    // Create users
    const userResults = await db.insert(usersTable)
      .values([
        {
          email: 'mixedUser@example.com',
          password_hash: 'hashedpassword',
          first_name: 'Mixed',
          last_name: 'User',
          role: 'admin'
        },
        {
          email: 'otherOwner@example.com',
          password_hash: 'hashedpassword',
          first_name: 'Other',
          last_name: 'Owner',
          role: 'owner'
        }
      ])
      .returning()
      .execute();

    const mixedUserId = userResults[0].id;
    const otherOwnerId = userResults[1].id;

    // Create organizations
    const orgResults = await db.insert(organizationsTable)
      .values([
        {
          name: 'Owned by Mixed User',
          slug: 'owned-by-mixed',
          plan_type: 'pro',
          owner_id: mixedUserId
        },
        {
          name: 'Member of This Org',
          slug: 'member-of-this',
          plan_type: 'free',
          owner_id: otherOwnerId
        }
      ])
      .returning()
      .execute();

    // Add mixed user as member of second org
    await db.insert(organizationMembersTable)
      .values({
        organization_id: orgResults[1].id,
        user_id: mixedUserId,
        role: 'viewer'
      })
      .execute();

    const result = await getOrganizations(mixedUserId);

    expect(result).toHaveLength(2);
    
    // Sort by name for predictable testing
    const sortedResult = result.sort((a, b) => a.name.localeCompare(b.name));
    
    expect(sortedResult[0].name).toEqual('Member of This Org');
    expect(sortedResult[0].owner_id).toEqual(otherOwnerId);
    expect(sortedResult[0].plan_type).toEqual('free');
    
    expect(sortedResult[1].name).toEqual('Owned by Mixed User');
    expect(sortedResult[1].owner_id).toEqual(mixedUserId);
    expect(sortedResult[1].plan_type).toEqual('pro');
  });

  it('should return correct organization fields', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'fieldTest@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Field',
        last_name: 'Test',
        role: 'owner'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create organization with all fields
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Field Test Org',
        slug: 'field-test-org',
        plan_type: 'enterprise',
        owner_id: userId
      })
      .returning()
      .execute();

    const result = await getOrganizations(userId);

    expect(result).toHaveLength(1);
    const org = result[0];
    
    expect(org.id).toBeDefined();
    expect(typeof org.id).toEqual('number');
    expect(org.name).toEqual('Field Test Org');
    expect(org.slug).toEqual('field-test-org');
    expect(org.plan_type).toEqual('enterprise');
    expect(org.owner_id).toEqual(userId);
    expect(org.created_at).toBeInstanceOf(Date);
    expect(org.updated_at).toBeInstanceOf(Date);
  });

  it('should not return organizations user has no access to', async () => {
    // Create users
    const userResults = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          password_hash: 'hashedpassword',
          first_name: 'User',
          last_name: 'One',
          role: 'member'
        },
        {
          email: 'user2@example.com',
          password_hash: 'hashedpassword',
          first_name: 'User',
          last_name: 'Two',
          role: 'owner'
        }
      ])
      .returning()
      .execute();

    const user1Id = userResults[0].id;
    const user2Id = userResults[1].id;

    // Create organization owned by user2
    await db.insert(organizationsTable)
      .values({
        name: 'Private Org',
        slug: 'private-org',
        plan_type: 'pro',
        owner_id: user2Id
      })
      .execute();

    // User1 should not see user2's organization
    const result = await getOrganizations(user1Id);

    expect(result).toEqual([]);
  });
});