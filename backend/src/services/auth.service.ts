import { hashPassword, comparePassword } from '../utils/password';
import { generateTokenPair } from '../utils/jwt';
import { User, LoginData } from '../types/auth.types';
import { getOptimizedConnection } from '../config/database';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import { EmailService } from './email.service';

export interface CreateUserData {
  email: string;
  password: string;
  full_name?: string;
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';
}

export interface AuthResult {
  user: Omit<User, 'password'>;
  token: string;
  refreshToken?: string;
}

/**
 * Create a new user account with email verification
 */
export const createUser = async (userData: CreateUserData): Promise<AuthResult> => {
  const { email, password, full_name, plan = 'free' } = userData;
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

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Set conversion limits based on plan
    const conversionsLimit = plan === 'free' ? 3 : plan === 'starter' ? 100 : 999999;

    // Calculate usage reset date (30 days from now)
    const usageResetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Set file size limit based on plan
    const fileSizeLimit = plan === 'free' ? 10485760 : plan === 'starter' ? 26214400 : 104857600; // 10MB, 25MB, 100MB

    // Create user in database with all auth fields
    const result = await db.executeQuery(
      `INSERT INTO users (
        email, password, full_name,
        email_verified, verification_token, verification_token_expires,
        plan, conversions_used, conversions_limit,
        registration_date, usage_reset_date, file_size_limit,
        login_attempts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email,
        hashedPassword,
        full_name || null,
        0, // email_verified = false (0 in SQLite)
        verificationToken,
        verificationExpires.toISOString(),
        plan,
        0, // conversions_used
        conversionsLimit,
        new Date().toISOString(), // registration_date
        usageResetDate.toISOString(),
        fileSizeLimit,
        0 // login_attempts
      ]
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

    // Send verification email
    try {
      await EmailService.sendVerificationEmail(
        { email, full_name },
        verificationToken
      );
      logger.info(`📧 Verification email sent to: ${email}`);
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    // Generate JWT tokens
    const tokens = generateTokenPair(userId, email);

    // Create user object without password
    const userWithoutPassword = {
      id: userId,
      email,
      full_name,
      email_verified: false,
      plan,
      conversions_used: 0,
      conversions_limit: conversionsLimit,
      file_size_limit: fileSizeLimit,
      registration_date: new Date(),
      usage_reset_date: usageResetDate,
      created_at: new Date(),
      updated_at: new Date(),
    };

    logger.info(`✅ New user created: ${email} with plan: ${plan} (email verification required)`);

    return {
      user: userWithoutPassword as any,
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