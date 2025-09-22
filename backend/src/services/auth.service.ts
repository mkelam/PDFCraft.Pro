import { hashPassword, comparePassword } from '../utils/password';
import { generateTokenPair } from '../utils/jwt';
import { User, LoginData } from '../types/auth.types';
import { getOptimizedConnection } from '../config/database';
import { logger } from '../utils/logger';

export interface CreateUserData {
  email: string;
  password: string;
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';
}

export interface AuthResult {
  user: Omit<User, 'password'>;
  token: string;
  refreshToken?: string;
}

/**
 * Create a new user account
 */
export const createUser = async (userData: CreateUserData): Promise<AuthResult> => {
  const { email, password, plan = 'free' } = userData;
  const db = getOptimizedConnection();

  try {
    // Check if user already exists
    const existingUsers = await db.executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    ) as any[];

    if (existingUsers.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Set conversion limits based on plan
    const conversionsLimit = plan === 'free' ? 3 : plan === 'starter' ? 100 : -1;

    // Create user in database
    const result = await db.executeQuery(
      'INSERT INTO users (email, password, plan, conversions_used, conversions_limit) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, plan, 0, conversionsLimit]
    );

    // Handle different return types for SQLite vs MySQL
    let userId: number;
    if (Array.isArray(result) && result.length > 0 && result[0]) {
      userId = (result[0] as any).insertId || (result[0] as any).lastInsertRowid || 1;
    } else {
      userId = (result as any).insertId || (result as any).lastInsertRowid || 1;
    }

    if (!userId || userId === 1) {
      // Fallback: Get the user we just created
      const createdUsers = await db.executeQuery(
        'SELECT id FROM users WHERE email = ?',
        [email]
      ) as any[];
      userId = createdUsers[0]?.id || 1;
    }

    // Generate JWT tokens
    const tokens = generateTokenPair(userId, email);

    // Create user object without password
    const userWithoutPassword = {
      id: userId,
      email,
      plan,
      conversions_used: 0,
      conversions_limit: conversionsLimit,
      created_at: new Date(),
      updated_at: new Date(),
    };

    logger.info(`New user created: ${email} with plan: ${plan}`);

    return {
      user: userWithoutPassword,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Authenticate user login
 */
export const authenticateUser = async (loginData: LoginData): Promise<AuthResult> => {
  const { email, password } = loginData;
  const db = getOptimizedConnection();

  try {
    // Find user by email
    const users = await db.executeQuery(
      'SELECT * FROM users WHERE email = ?',
      [email]
    ) as User[];

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT tokens
    const tokens = generateTokenPair(user.id, user.email);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    logger.info(`User authenticated: ${email}`);

    return {
      user: userWithoutPassword,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch (error) {
    logger.error('Error authenticating user:', error);
    throw error;
  }
};

/**
 * Find user by email
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const db = getOptimizedConnection();

  try {
    const users = await db.executeQuery(
      'SELECT * FROM users WHERE email = ?',
      [email]
    ) as User[];

    return users.length > 0 ? users[0] : null;
  } catch (error) {
    logger.error('Error finding user by email:', error);
    return null;
  }
};

/**
 * Find user by ID
 */
export const findUserById = async (id: number): Promise<Omit<User, 'password'> | null> => {
  const db = getOptimizedConnection();

  try {
    const users = await db.executeQuery(
      'SELECT * FROM users WHERE id = ?',
      [id]
    ) as User[];

    if (users.length === 0) return null;

    const { password: _, ...userWithoutPassword } = users[0];
    return userWithoutPassword;
  } catch (error) {
    logger.error('Error finding user by ID:', error);
    return null;
  }
};

/**
 * Update user's conversion usage
 */
export const updateUserConversions = async (userId: number, increment: number = 1): Promise<void> => {
  const db = getOptimizedConnection();

  try {
    await db.executeQuery(
      'UPDATE users SET conversions_used = conversions_used + ?, updated_at = NOW() WHERE id = ?',
      [increment, userId]
    );

    logger.info(`Updated conversion count for user ${userId} by ${increment}`);
  } catch (error) {
    logger.error('Error updating user conversions:', error);
    throw error;
  }
};