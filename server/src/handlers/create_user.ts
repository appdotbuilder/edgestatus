import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Hash the password using Bun's built-in password hashing
    const password_hash = await Bun.password.hash(input.password, {
      algorithm: "bcrypt",
      cost: 10
    });

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash,
        first_name: input.first_name,
        last_name: input.last_name,
        role: input.role
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};