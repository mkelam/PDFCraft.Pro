/**
 * User Management Controller (SQLite Version)
 * Admin interface for managing users with full CRUD operations
 */

import { Request, Response } from 'express';
import { UserModel, UpdateUserData } from '../models/User.model';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/auth.types';
import { getSQLiteConnection } from '../config/sqlite';

export class UserManagementController {
  /**
   * Get all users with pagination and filtering
   * GET /api/admin/users?page=1&limit=20&search=email&plan=free&verified=true
   */
  static async getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const db = getSQLiteConnection();

      const {
        page = '1',
        limit = '20',
        search = '',
        plan,
        verified,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Build WHERE clause
      const conditions: string[] = [];
      const params: any[] = [];

      if (search) {
        conditions.push('(email LIKE ? OR full_name LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }

      if (plan) {
        conditions.push('plan = ?');
        params.push(plan);
      }

      if (verified !== undefined) {
        conditions.push('email_verified = ?');
        params.push(verified === 'true' ? 1 : 0);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = db.prepare(`SELECT COUNT(*) as total FROM users ${whereClause}`).get(...params) as any;
      const total = countResult.total;

      // Get users with pagination
      const rows = db.prepare(`
        SELECT
          id, email, full_name, email_verified,
          oauth_provider, avatar_url,
          plan, billing_cycle, subscription_status,
          conversions_used, conversions_limit, file_size_limit,
          usage_reset_date, registration_date, last_login,
          created_at, updated_at
        FROM users
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `).all(...params, limitNum, offset);

      res.status(200).json({
        success: true,
        data: {
          users: rows,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        },
        message: `Retrieved ${rows.length} users successfully`
      });
    } catch (error) {
      logger.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve users',
          code: 'GET_USERS_FAILED'
        }
      });
    }
  }

  /**
   * Get single user by ID
   * GET /api/admin/users/:id
   */
  static async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await UserModel.findById(parseInt(id));

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
        return;
      }

      // Get user statistics (optional - may not exist in all database versions)
      let stats = null;
      try {
        stats = await UserModel.getStatistics(user.id);
      } catch (statsError) {
        logger.warn(`Could not fetch statistics for user ${user.id}:`, statsError);
        // Continue without statistics
      }

      // Remove sensitive data
      const { password_hash, verification_token, password_reset_token, ...safeUser } = user as any;

      res.status(200).json({
        success: true,
        data: {
          user: safeUser,
          statistics: stats
        },
        message: 'User retrieved successfully'
      });
    } catch (error) {
      logger.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve user',
          code: 'GET_USER_FAILED'
        }
      });
    }
  }

  /**
   * Update user
   * PUT /api/admin/users/:id
   */
  static async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateUserData = req.body;

      // Validate user exists
      const existingUser = await UserModel.findById(parseInt(id));
      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
        return;
      }

      // If email is being changed, check it's not already taken
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await UserModel.findByEmail(updateData.email);
        if (emailExists) {
          res.status(409).json({
            success: false,
            error: {
              message: 'Email already in use',
              code: 'EMAIL_EXISTS'
            }
          });
          return;
        }
      }

      // Update user
      const updatedUser = await UserModel.update(parseInt(id), updateData);

      // Remove sensitive data
      const { password_hash, verification_token, password_reset_token, ...safeUser } = updatedUser as any;

      logger.info(`User ${id} updated by admin ${req.user?.id}`);

      res.status(200).json({
        success: true,
        data: { user: safeUser },
        message: 'User updated successfully'
      });
    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update user',
          code: 'UPDATE_USER_FAILED'
        }
      });
    }
  }

  /**
   * Delete user
   * DELETE /api/admin/users/:id
   */
  static async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (req.user && req.user.id === parseInt(id)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Cannot delete your own account',
            code: 'CANNOT_DELETE_SELF'
          }
        });
        return;
      }

      // Validate user exists
      const user = await UserModel.findById(parseInt(id));
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
        return;
      }

      // Delete user
      await UserModel.delete(parseInt(id));

      logger.info(`User ${id} (${user.email}) deleted by admin ${req.user?.id}`);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete user',
          code: 'DELETE_USER_FAILED'
        }
      });
    }
  }

  /**
   * Manually verify user email
   * POST /api/admin/users/:id/verify
   */
  static async verifyUserEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const db = getSQLiteConnection();
      const { id } = req.params;

      const user = await UserModel.findById(parseInt(id));
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
        return;
      }

      if (user.email_verified) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Email already verified',
            code: 'ALREADY_VERIFIED'
          }
        });
        return;
      }

      // Manually verify email
      db.prepare(`
        UPDATE users
        SET email_verified = 1,
            verification_token = NULL,
            verification_token_expires = NULL
        WHERE id = ?
      `).run(id);

      logger.info(`User ${id} (${user.email}) manually verified by admin ${req.user?.id}`);

      res.status(200).json({
        success: true,
        message: 'User email verified successfully'
      });
    } catch (error) {
      logger.error('Verify user email error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to verify user email',
          code: 'VERIFY_EMAIL_FAILED'
        }
      });
    }
  }

  /**
   * Reset user usage
   * POST /api/admin/users/:id/reset-usage
   */
  static async resetUserUsage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await UserModel.findById(parseInt(id));
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
        return;
      }

      await UserModel.resetUsage(parseInt(id));

      logger.info(`Usage reset for user ${id} (${user.email}) by admin ${req.user?.id}`);

      res.status(200).json({
        success: true,
        message: 'User usage reset successfully'
      });
    } catch (error) {
      logger.error('Reset user usage error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to reset user usage',
          code: 'RESET_USAGE_FAILED'
        }
      });
    }
  }

  /**
   * Get user activity/conversion history
   * GET /api/admin/users/:id/activity
   */
  static async getUserActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const db = getSQLiteConnection();
      const { id } = req.params;
      const { limit = '20', offset = '0' } = req.query;

      const user = await UserModel.findById(parseInt(id));
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
        return;
      }

      // Get conversion history
      const conversions = db.prepare(`
        SELECT
          id, type, status, progress,
          input_files, output_file,
          processing_time, created_at, completed_at
        FROM conversion_jobs
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all(id, parseInt(limit as string), parseInt(offset as string));

      // Get total count
      const countResult = db.prepare('SELECT COUNT(*) as total FROM conversion_jobs WHERE user_id = ?').get(id) as any;

      res.status(200).json({
        success: true,
        data: {
          conversions,
          total: countResult.total
        },
        message: 'User activity retrieved successfully'
      });
    } catch (error) {
      logger.error('Get user activity error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve user activity',
          code: 'GET_ACTIVITY_FAILED'
        }
      });
    }
  }

  /**
   * Get dashboard statistics
   * GET /api/admin/stats
   */
  static async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const db = getSQLiteConnection();

      // Total users
      const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;

      // Users by plan
      const usersByPlan = db.prepare('SELECT plan, COUNT(*) as count FROM users GROUP BY plan').all();

      // Verified vs unverified
      const verificationStats = db.prepare(`
        SELECT
          SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) as verified,
          SUM(CASE WHEN email_verified = 0 THEN 1 ELSE 0 END) as unverified
        FROM users
      `).get() as any;

      // New users today
      const newUsersToday = db.prepare("SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE('now')").get() as any;

      // New users this week
      const newUsersWeek = db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= DATE('now', '-7 days')").get() as any;

      // Active users (logged in last 30 days)
      const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE last_login >= DATE('now', '-30 days')").get() as any;

      // Total conversions
      const totalConversions = db.prepare('SELECT COUNT(*) as count FROM conversion_jobs').get() as any;

      // Conversions by status
      const conversionsByStatus = db.prepare('SELECT status, COUNT(*) as count FROM conversion_jobs GROUP BY status').all();

      res.status(200).json({
        success: true,
        data: {
          users: {
            total: totalUsers.count,
            byPlan: usersByPlan,
            verified: verificationStats.verified || 0,
            unverified: verificationStats.unverified || 0,
            newToday: newUsersToday.count,
            newThisWeek: newUsersWeek.count,
            activeLastMonth: activeUsers.count
          },
          conversions: {
            total: totalConversions.count,
            byStatus: conversionsByStatus
          }
        },
        message: 'Dashboard statistics retrieved successfully'
      });
    } catch (error) {
      logger.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve dashboard statistics',
          code: 'GET_STATS_FAILED'
        }
      });
    }
  }
}
