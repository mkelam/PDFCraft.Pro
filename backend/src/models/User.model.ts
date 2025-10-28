/**
 * User Model - Database Queries and Business Logic
 * Handles all user-related database operations
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getSQLiteConnection } from '../config/sqlite';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface User {
  id: number;
  email: string;
  password_hash?: string | null;
  full_name?: string | null;

  // Authentication
  email_verified: boolean;
  verification_token?: string | null;
  verification_token_expires?: Date | null;
  password_reset_token?: string | null;
  password_reset_expires?: Date | null;

  // OAuth
  oauth_provider: 'google' | 'local';
  oauth_id?: string | null;
  avatar_url?: string | null;

  // Subscription
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  billing_cycle: 'monthly' | 'yearly';
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing';

  // Usage Tracking
  registration_date: Date;
  usage_reset_date: Date;
  conversions_used: number;
  conversions_limit: number;
  file_size_limit: number;

  // PayFast
  payfast_subscription_token?: string | null;
  payfast_customer_id?: string | null;

  // Security
  last_login?: Date | null;
  login_attempts: number;
  locked_until?: Date | null;

  // Metadata
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  password?: string;
  full_name?: string;
  oauth_provider?: 'google' | 'local';
  oauth_id?: string;
  avatar_url?: string;
}

export interface UpdateUserData {
  full_name?: string;
  email?: string;
  avatar_url?: string;
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';
  billing_cycle?: 'monthly' | 'yearly';
  subscription_status?: 'active' | 'canceled' | 'past_due' | 'trialing';
  conversions_used?: number;
  conversions_limit?: number;
  file_size_limit?: number;
  payfast_subscription_token?: string;
  payfast_customer_id?: string;
}

export interface UserStatistics {
  id: number;
  email: string;
  plan: string;
  conversions_used: number;
  conversions_limit: number;
  usage_percentage: number;
  days_until_reset: number;
  total_conversions: number;
  successful_conversions: number;
  failed_conversions: number;
  avg_processing_time_ms: number;
  registration_date: Date;
  last_login: Date | null;
}

// ============================================================================
// USER MODEL CLASS
// ============================================================================

export class UserModel {

  // ==========================================================================
  // CREATE OPERATIONS
  // ==========================================================================

  /**
   * Create a new user with email/password
   */
  static async create(userData: CreateUserData): Promise<User> {
    const { email, password, full_name, oauth_provider = 'local', oauth_id, avatar_url } = userData;

    // Hash password if provided
    let password_hash: string | null = null;
    if (password) {
      password_hash = await bcrypt.hash(password, 12);
    }

    // Generate verification token
    const verification_token = crypto.randomBytes(32).toString('hex');
    const verification_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Set usage reset date (30 days from now)
    const usage_reset_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const db = getSQLiteConnection();
    const result = db.prepare(
      `INSERT INTO users (
        email, password_hash, full_name,
        oauth_provider, oauth_id, avatar_url,
        verification_token, verification_token_expires,
        usage_reset_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      email,
      password_hash,
      full_name || null,
      oauth_provider,
      oauth_id || null,
      avatar_url || null,
      verification_token,
      verification_token_expires.toISOString(),
      usage_reset_date.toISOString()
    );

    const user = await this.findById(result.lastInsertRowid as number);
    if (!user) {
      throw new Error('Failed to create user');
    }

    return user;
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<User | null> {
    const db = getSQLiteConnection();
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!row) return null;
    return row as User;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const db = getSQLiteConnection();
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

    if (!row) return null;
    return row as User;
  }

  /**
   * Find user by verification token
   */
  static async findByVerificationToken(token: string): Promise<User | null> {
    const db = getSQLiteConnection();
    const row = db.prepare(
      'SELECT * FROM users WHERE verification_token = ? AND verification_token_expires > datetime(\'now\')'
    ).get(token);

    if (!row) return null;
    return row as User;
  }

  /**
   * Find user by password reset token
   */
  static async findByPasswordResetToken(token: string): Promise<User | null> {
    const db = getSQLiteConnection();
    const row = db.prepare(
      'SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > datetime(\'now\')'
    ).get(token);

    if (!row) return null;
    return row as User;
  }

  /**
   * Find user by OAuth ID
   */
  static async findByOAuthId(provider: 'google' | 'local', oauthId: string): Promise<User | null> {
    const db = getSQLiteConnection();
    const row = db.prepare(
      'SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?'
    ).get(provider, oauthId);

    if (!row) return null;
    return row as User;
  }

  /**
   * Get user statistics (from view)
   */
  static async getStatistics(userId: number): Promise<UserStatistics | null> {
    const db = getSQLiteConnection();
    const row = db.prepare(
      'SELECT * FROM user_statistics WHERE id = ?'
    ).get(userId);

    if (!row) return null;
    return row as UserStatistics;
  }

  // ==========================================================================
  // UPDATE OPERATIONS
  // ==========================================================================

  /**
   * Update user data
   */
  static async update(id: number, data: UpdateUserData): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const db = getSQLiteConnection();
    db.prepare(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`
    ).run(...values);

    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found after update');
    }

    return user;
  }

  /**
   * Verify user email
   */
  static async verifyEmail(token: string): Promise<User> {
    const user = await this.findByVerificationToken(token);
    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    const db = getSQLiteConnection();
    db.prepare(
      `UPDATE users
       SET email_verified = 1,
           verification_token = NULL,
           verification_token_expires = NULL
       WHERE id = ?`
    ).run(user.id);

    const updatedUser = await this.findById(user.id);
    if (!updatedUser) {
      throw new Error('User not found after verification');
    }

    return updatedUser;
  }

  /**
   * Generate password reset token
   */
  static async generatePasswordResetToken(email: string): Promise<{ user: User; token: string }> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const db = getSQLiteConnection();
    db.prepare(
      `UPDATE users
       SET password_reset_token = ?,
           password_reset_expires = ?
       WHERE id = ?`
    ).run(token, expires.toISOString(), user.id);

    return { user, token };
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<User> {
    const user = await this.findByPasswordResetToken(token);
    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    const password_hash = await bcrypt.hash(newPassword, 12);

    const db = getSQLiteConnection();
    db.prepare(
      `UPDATE users
       SET password_hash = ?,
           password_reset_token = NULL,
           password_reset_expires = NULL,
           login_attempts = 0,
           locked_until = NULL
       WHERE id = ?`
    ).run(password_hash, user.id);

    const updatedUser = await this.findById(user.id);
    if (!updatedUser) {
      throw new Error('User not found after password reset');
    }

    return updatedUser;
  }

  /**
   * Update password (authenticated user)
   */
  static async updatePassword(userId: number, oldPassword: string, newPassword: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.password_hash) {
      throw new Error('Cannot update password for OAuth users');
    }

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, 12);

    const db = getSQLiteConnection();
    db.prepare(
      'UPDATE users SET password_hash = ? WHERE id = ?'
    ).run(password_hash, userId);

    const updatedUser = await this.findById(userId);
    if (!updatedUser) {
      throw new Error('User not found after password update');
    }

    return updatedUser;
  }

  /**
   * Increment conversion usage
   */
  static async incrementUsage(userId: number): Promise<User> {
    const db = getSQLiteConnection();
    db.prepare(
      'UPDATE users SET conversions_used = conversions_used + 1 WHERE id = ?'
    ).run(userId);

    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found after usage increment');
    }

    return user;
  }

  /**
   * Reset usage (called by cron or manually)
   */
  static async resetUsage(userId: number): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const new_reset_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const db = getSQLiteConnection();
    db.prepare(
      `UPDATE users
       SET conversions_used = 0,
           usage_reset_date = ?
       WHERE id = ?`
    ).run(new_reset_date.toISOString(), userId);

    const updatedUser = await this.findById(userId);
    if (!updatedUser) {
      throw new Error('User not found after usage reset');
    }

    return updatedUser;
  }

  /**
   * Update login timestamp
   */
  static async updateLastLogin(userId: number): Promise<void> {
    const db = getSQLiteConnection();
    db.prepare(
      'UPDATE users SET last_login = datetime(\'now\') WHERE id = ?'
    ).run(userId);
  }

  /**
   * Handle failed login attempt
   */
  static async incrementLoginAttempts(email: string): Promise<void> {
    const db = getSQLiteConnection();
    db.prepare(
      `UPDATE users
       SET login_attempts = login_attempts + 1,
           locked_until = CASE
             WHEN login_attempts >= 4 THEN datetime('now', '+15 minutes')
             ELSE locked_until
           END
       WHERE email = ?`
    ).run(email);
  }

  /**
   * Reset login attempts after successful login
   */
  static async resetLoginAttempts(userId: number): Promise<void> {
    const db = getSQLiteConnection();
    db.prepare(
      'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?'
    ).run(userId);
  }

  /**
   * Check if user account is locked
   */
  static async isAccountLocked(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (!user) return false;

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return true;
    }

    // If lock expired, reset attempts
    if (user.locked_until && new Date(user.locked_until) <= new Date()) {
      await this.resetLoginAttempts(user.id);
    }

    return false;
  }

  // ==========================================================================
  // DELETE OPERATIONS
  // ==========================================================================

  /**
   * Delete user account (soft delete - could be implemented)
   */
  static async delete(userId: number): Promise<void> {
    const db = getSQLiteConnection();
    db.prepare(
      'DELETE FROM users WHERE id = ?'
    ).run(userId);
  }

  // ==========================================================================
  // AUTHENTICATION HELPERS
  // ==========================================================================

  /**
   * Verify password
   */
  static async verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.password_hash) {
      return false;
    }
    return bcrypt.compare(password, user.password_hash);
  }

  /**
   * Check if user can convert (has remaining conversions)
   */
  static async canConvert(userId: number): Promise<{ allowed: boolean; reason?: string }> {
    const user = await this.findById(userId);
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // Check if email is verified
    if (!user.email_verified) {
      return { allowed: false, reason: 'Email verification required' };
    }

    // Pro/Enterprise have unlimited
    if (user.plan === 'pro' || user.plan === 'enterprise') {
      return { allowed: true };
    }

    // Check if usage period expired (should be handled by cron, but double-check)
    if (new Date() >= new Date(user.usage_reset_date)) {
      await this.resetUsage(userId);
      return { allowed: true };
    }

    // Check if under limit
    if (user.conversions_used < user.conversions_limit) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Usage limit exceeded (${user.conversions_used}/${user.conversions_limit})`
    };
  }

  /**
   * Regenerate verification token
   */
  static async regenerateVerificationToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const db = getSQLiteConnection();
    db.prepare(
      `UPDATE users
       SET verification_token = ?,
           verification_token_expires = ?
       WHERE id = ?`
    ).run(token, expires.toISOString(), userId);

    return token;
  }
}
