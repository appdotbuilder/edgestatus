import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new user with hashed password and persisting it in the database.
    return Promise.resolve({
        id: 0, // Placeholder ID
        email: input.email,
        password_hash: 'hashed_password_placeholder', // Should hash the input.password
        first_name: input.first_name,
        last_name: input.last_name,
        role: input.role,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
    } as User);
};