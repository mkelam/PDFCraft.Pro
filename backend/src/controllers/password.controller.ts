import { Request, Response } from 'express';
import { EmailQueue } from '../workers/email.worker';
import { logger } from '../utils/logger';
import { getConnection, getSQLite } from '../config/database';
import { generateResetToken, verifyResetToken } from '../utils/jwt';
import bcrypt from 'bcryptjs';

export class PasswordController {
  /**
   * Request password reset
   */
  static async requestReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
        });
        return;
      }

      // Check if user exists
      const user = await getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        res.status(200).json({
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.',
        });
        return;
      }

      // Generate reset token
      const resetToken = generateResetToken(user.id, email);

      // Store reset token in database (expires in 1 hour)
      await storeResetToken(user.id, resetToken);

      // Send password reset email
      try {
        await EmailQueue.sendPasswordResetEmail(email, resetToken);
        logger.info(`📧 Password reset email queued for: ${email}`);
      } catch (emailError) {
        logger.error('Failed to queue password reset email:', emailError);
        res.status(500).json({
          success: false,
          message: 'Failed to send password reset email',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.',
      });

    } catch (error) {
      logger.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Token and new password are required',
        });
        return;
      }

      // Verify reset token
      const payload = verifyResetToken(token);
      if (!payload) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
        });
        return;
      }

      // Check if token exists in database and hasn't been used
      const isValidToken = await validateResetToken(payload.userId, token);
      if (!isValidToken) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
        });
        return;
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password in database
      await updateUserPassword(payload.userId, hashedPassword);

      // Invalidate the reset token
      await invalidateResetToken(payload.userId);

      logger.info(`🔐 Password reset completed for user: ${payload.userId}`);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });

    } catch (error) {
      logger.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
}

// Helper functions for database operations
async function getUserByEmail(email: string): Promise<any> {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT id, email FROM users WHERE email = ?',
      [email]
    );
    const users = rows as any[];
    return users.length > 0 ? users[0] : null;
  } else {
    const db = getSQLite();
    const stmt = db.prepare('SELECT id, email FROM users WHERE email = ?');
    return stmt.get(email) || null;
  }
}

async function storeResetToken(userId: number, token: string): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour

  if (isProduction) {
    const connection = getConnection();
    await connection.execute(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = ?, expires_at = ?',
      [userId, token, expiresAt, token, expiresAt]
    );
  } else {
    const db = getSQLite();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO password_resets (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(userId, token, expiresAt.toISOString());
  }
}

async function validateResetToken(userId: number, token: string): Promise<boolean> {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT id FROM password_resets WHERE user_id = ? AND token = ? AND expires_at > NOW() AND used_at IS NULL',
      [userId, token]
    );
    const tokens = rows as any[];
    return tokens.length > 0;
  } else {
    const db = getSQLite();
    const stmt = db.prepare(
      'SELECT id FROM password_resets WHERE user_id = ? AND token = ? AND expires_at > datetime("now") AND used_at IS NULL'
    );
    const result = stmt.get(userId, token);
    return !!result;
  }
}

async function updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const connection = getConnection();
    await connection.execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, userId]
    );
  } else {
    const db = getSQLite();
    const stmt = db.prepare(
      'UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?'
    );
    stmt.run(hashedPassword, userId);
  }
}

async function invalidateResetToken(userId: number): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const connection = getConnection();
    await connection.execute(
      'UPDATE password_resets SET used_at = NOW() WHERE user_id = ?',
      [userId]
    );
  } else {
    const db = getSQLite();
    const stmt = db.prepare(
      'UPDATE password_resets SET used_at = datetime("now") WHERE user_id = ?'
    );
    stmt.run(userId);
  }
}