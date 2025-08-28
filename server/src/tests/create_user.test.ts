import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'securepassword123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'member'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with hashed password', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('member');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Password should be hashed, not plain text
    expect(result.password_hash).not.toEqual('securepassword123');
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash.length).toBeGreaterThan(20);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].first_name).toEqual('John');
    expect(users[0].last_name).toEqual('Doe');
    expect(users[0].role).toEqual('member');
    expect(users[0].is_active).toEqual(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle role field correctly with default value', async () => {
    // The handler receives parsed input where defaults are already applied
    // This tests that the default role 'member' works correctly
    const inputWithDefaultRole: CreateUserInput = {
      email: 'default@example.com',
      password: 'password123',
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'member' // This would be the default applied by Zod parsing
    };

    const result = await createUser(inputWithDefaultRole);

    expect(result.role).toEqual('member');
    expect(result.email).toEqual('default@example.com');
  });

  it('should handle different user roles', async () => {
    const adminInput: CreateUserInput = {
      ...testInput,
      email: 'admin@example.com',
      role: 'admin'
    };

    const result = await createUser(adminInput);

    expect(result.role).toEqual('admin');
    expect(result.email).toEqual('admin@example.com');
  });

  it('should create users with unique emails', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create second user with same email should fail
    const duplicateInput: CreateUserInput = {
      ...testInput,
      first_name: 'Different',
      last_name: 'User'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should hash passwords securely', async () => {
    const input1: CreateUserInput = {
      ...testInput,
      email: 'user1@example.com',
      password: 'samepassword123'
    };

    const input2: CreateUserInput = {
      ...testInput,
      email: 'user2@example.com',
      password: 'samepassword123'
    };

    const result1 = await createUser(input1);
    const result2 = await createUser(input2);

    // Same passwords should generate different hashes (due to salt)
    expect(result1.password_hash).not.toEqual(result2.password_hash);
    
    // Verify passwords can be verified correctly
    const isValid1 = await Bun.password.verify('samepassword123', result1.password_hash);
    const isValid2 = await Bun.password.verify('samepassword123', result2.password_hash);
    
    expect(isValid1).toBe(true);
    expect(isValid2).toBe(true);
  });

  it('should set timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createUser(testInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});