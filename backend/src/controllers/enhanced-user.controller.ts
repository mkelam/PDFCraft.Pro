/**
 * Enhanced User Controller - PDFCraft.Pro
 * Advanced user management with OCR Overlay conversion tracking
 * Provides comprehensive analytics and subscription management
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import { getConnection, getSQLite } from '../config/database';

export interface UserStats {
  totalConversions: number;
  ocrOverlayConversions: number;
  totalProcessingTime: number;
  averageQualityScore: number;
  filesProcessed: number;
  totalFileSize: number;
  subscriptionStatus: string;
  usageThisMonth: number;
  usageLimit: number;
  favoritePerformanceMode: string;
  enhancementUsageRate: number;
}

export interface ConversionHistory {
  id: string;
  type: string;
  status: string;
  fileName: string;
  fileSize: number;
  processingTime: number;
  qualityMetrics: {
    textAccuracy: number;
    imagePreservation: number;
    overallQuality: number;
  };
  performanceMode: string;
  enhancementsUsed: boolean;
  createdAt: string;
  completedAt: string;
}

export interface UsageAnalytics {
  conversionsPerDay: Array<{ date: string; count: number; ocrOverlay: number }>;
  performanceModeDistribution: Record<string, number>;
  qualityTrends: Array<{ date: string; avgQuality: number }>;
  processingTimesTrends: Array<{ date: string; avgTime: number }>;
  enhancementAdoption: {
    totalWithEnhancements: number;
    totalWithoutEnhancements: number;
    adoptionRate: number;
  };
  topFileTypes: Array<{ type: string; count: number }>;
}

export class EnhancedUserController {
  /**
   * Get comprehensive user statistics
   */
  static async getUserStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      const userId = req.user.id;
      const stats = await EnhancedUserController.calculateUserStats(userId);

      res.json({
        success: true,
        data: { stats },
        message: 'User statistics retrieved successfully'
      });

    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user statistics'
      });
    }
  }

  /**
   * Get detailed conversion history
   */
  static async getConversionHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      const userId = req.user.id;
      const { page = 1, limit = 20, type, status } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const history = await EnhancedUserController.getConversionHistoryData(
        userId,
        Number(limit),
        offset,
        type as string,
        status as string
      );

      res.json({
        success: true,
        data: {
          history: history.items,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: history.total,
            pages: Math.ceil(history.total / Number(limit))
          }
        },
        message: 'Conversion history retrieved successfully'
      });

    } catch (error) {
      console.error('Get conversion history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversion history'
      });
    }
  }

  /**
   * Get usage analytics for dashboard
   */
  static async getUsageAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      const userId = req.user.id;
      const { period = '30d' } = req.query;

      const analytics = await EnhancedUserController.calculateUsageAnalytics(userId, period as string);

      res.json({
        success: true,
        data: { analytics },
        message: 'Usage analytics retrieved successfully'
      });

    } catch (error) {
      console.error('Get usage analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve usage analytics'
      });
    }
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      const userId = req.user.id;
      const {
        defaultPerformanceMode,
        enableEnhancementsByDefault,
        emailNotifications,
        qualityThreshold
      } = req.body;

      // Update user preferences
      const updateQuery = `
        UPDATE users
        SET
          default_performance_mode = ?,
          enable_enhancements_default = ?,
          email_notifications = ?,
          quality_threshold = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `;

      await EnhancedUserController.executeQuery(updateQuery, [
        defaultPerformanceMode || 'balanced',
        enableEnhancementsByDefault !== undefined ? enableEnhancementsByDefault : true,
        emailNotifications !== undefined ? emailNotifications : true,
        qualityThreshold || 80,
        userId
      ]);

      res.json({
        success: true,
        message: 'User preferences updated successfully'
      });

    } catch (error) {
      console.error('Update user preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user preferences'
      });
    }
  }

  /**
   * Get user subscription details
   */
  static async getSubscriptionDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      const userId = req.user.id;

      // Get user subscription info
      const userQuery = `
        SELECT
          plan,
          conversions_used,
          conversions_limit,
          subscription_expires,
          stripe_customer_id,
          stripe_subscription_id
        FROM users
        WHERE id = ?
      `;

      const users = await EnhancedUserController.executeQuery(userQuery, [userId]);
      const user = users[0];

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Calculate usage percentage
      const usagePercentage = user.conversions_limit > 0
        ? (user.conversions_used / user.conversions_limit) * 100
        : 0;

      // Get plan details
      const planDetails = EnhancedUserController.getPlanDetails(user.plan);

      res.json({
        success: true,
        data: {
          subscription: {
            plan: user.plan,
            conversionsUsed: user.conversions_used,
            conversionsLimit: user.conversions_limit,
            usagePercentage,
            expiresAt: user.subscription_expires,
            isActive: new Date(user.subscription_expires || 0) > new Date(),
            planDetails
          }
        },
        message: 'Subscription details retrieved successfully'
      });

    } catch (error) {
      console.error('Get subscription details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve subscription details'
      });
    }
  }

  /**
   * Calculate comprehensive user statistics
   */
  private static async calculateUserStats(userId: number): Promise<UserStats> {
    const statsQuery = `
      SELECT
        COUNT(*) as total_conversions,
        COUNT(CASE WHEN type LIKE '%ocr-overlay%' THEN 1 END) as ocr_overlay_conversions,
        SUM(CASE WHEN processing_time IS NOT NULL THEN processing_time ELSE 0 END) as total_processing_time,
        AVG(CASE WHEN overall_quality IS NOT NULL THEN overall_quality ELSE 0 END) as avg_quality_score,
        SUM(CASE WHEN file_size IS NOT NULL THEN file_size ELSE 0 END) as total_file_size,
        GROUP_CONCAT(performance_mode) as performance_modes,
        AVG(CASE WHEN enhancement_enabled = 1 THEN 1.0 ELSE 0.0 END) as enhancement_usage_rate
      FROM conversion_jobs
      WHERE user_id = ? AND status = 'completed'
    `;

    const userQuery = `
      SELECT
        plan,
        conversions_used,
        conversions_limit
      FROM users
      WHERE id = ?
    `;

    const [statsResult, userResult] = await Promise.all([
      EnhancedUserController.executeQuery(statsQuery, [userId]),
      EnhancedUserController.executeQuery(userQuery, [userId])
    ]);

    const stats = statsResult[0] || {};
    const user = userResult[0] || {};

    // Calculate favorite performance mode
    const performanceModes = stats.performance_modes ? stats.performance_modes.split(',') : [];
    const modeCount = performanceModes.reduce((acc: Record<string, number>, mode: string) => {
      acc[mode] = (acc[mode] || 0) + 1;
      return acc;
    }, {});

    const favoriteMode = Object.entries(modeCount).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'balanced';

    return {
      totalConversions: stats.total_conversions || 0,
      ocrOverlayConversions: stats.ocr_overlay_conversions || 0,
      totalProcessingTime: stats.total_processing_time || 0,
      averageQualityScore: Math.round(stats.avg_quality_score || 0),
      filesProcessed: stats.total_conversions || 0,
      totalFileSize: stats.total_file_size || 0,
      subscriptionStatus: user.plan || 'free',
      usageThisMonth: user.conversions_used || 0,
      usageLimit: user.conversions_limit || 3,
      favoritePerformanceMode: favoriteMode,
      enhancementUsageRate: Math.round((stats.enhancement_usage_rate || 0) * 100)
    };
  }

  /**
   * Get detailed conversion history data
   */
  private static async getConversionHistoryData(
    userId: number,
    limit: number,
    offset: number,
    type?: string,
    status?: string
  ): Promise<{ items: ConversionHistory[]; total: number }> {

    let whereClause = 'WHERE user_id = ?';
    const params: any[] = [userId];

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM conversion_jobs ${whereClause}`;
    const countResult = await EnhancedUserController.executeQuery(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get paginated results
    const historyQuery = `
      SELECT
        id,
        type,
        status,
        input_files,
        file_size,
        processing_time,
        text_accuracy,
        image_preservation,
        overall_quality,
        performance_mode,
        enhancement_enabled,
        created_at,
        completed_at
      FROM conversion_jobs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const historyResult = await EnhancedUserController.executeQuery(historyQuery, [...params, limit, offset]);

    const items: ConversionHistory[] = historyResult.map((row: any) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      fileName: EnhancedUserController.extractFileName(row.input_files),
      fileSize: row.file_size || 0,
      processingTime: row.processing_time || 0,
      qualityMetrics: {
        textAccuracy: row.text_accuracy || 0,
        imagePreservation: row.image_preservation || 0,
        overallQuality: row.overall_quality || 0
      },
      performanceMode: row.performance_mode || 'balanced',
      enhancementsUsed: Boolean(row.enhancement_enabled),
      createdAt: row.created_at,
      completedAt: row.completed_at
    }));

    return { items, total };
  }

  /**
   * Calculate usage analytics
   */
  private static async calculateUsageAnalytics(userId: number, period: string): Promise<UsageAnalytics> {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

    // Conversions per day
    const dailyQuery = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        COUNT(CASE WHEN type LIKE '%ocr-overlay%' THEN 1 END) as ocr_overlay
      FROM conversion_jobs
      WHERE user_id = ? AND created_at >= datetime('now', '-${days} days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Performance mode distribution
    const modeQuery = `
      SELECT
        performance_mode,
        COUNT(*) as count
      FROM conversion_jobs
      WHERE user_id = ? AND created_at >= datetime('now', '-${days} days') AND status = 'completed'
      GROUP BY performance_mode
    `;

    // Quality trends
    const qualityQuery = `
      SELECT
        DATE(created_at) as date,
        AVG(overall_quality) as avg_quality
      FROM conversion_jobs
      WHERE user_id = ? AND created_at >= datetime('now', '-${days} days') AND overall_quality IS NOT NULL
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Enhancement adoption
    const enhancementQuery = `
      SELECT
        enhancement_enabled,
        COUNT(*) as count
      FROM conversion_jobs
      WHERE user_id = ? AND created_at >= datetime('now', '-${days} days') AND status = 'completed'
      GROUP BY enhancement_enabled
    `;

    const [dailyResult, modeResult, qualityResult, enhancementResult] = await Promise.all([
      EnhancedUserController.executeQuery(dailyQuery, [userId]),
      EnhancedUserController.executeQuery(modeQuery, [userId]),
      EnhancedUserController.executeQuery(qualityQuery, [userId]),
      EnhancedUserController.executeQuery(enhancementQuery, [userId])
    ]);

    // Process results
    const conversionsPerDay = dailyResult.map((row: any) => ({
      date: row.date,
      count: row.count,
      ocrOverlay: row.ocr_overlay
    }));

    const performanceModeDistribution = modeResult.reduce((acc: Record<string, number>, row: any) => {
      acc[row.performance_mode || 'unknown'] = row.count;
      return acc;
    }, {});

    const qualityTrends = qualityResult.map((row: any) => ({
      date: row.date,
      avgQuality: Math.round(row.avg_quality || 0)
    }));

    const enhancementStats = enhancementResult.reduce((acc: any, row: any) => {
      if (row.enhancement_enabled) {
        acc.totalWithEnhancements = row.count;
      } else {
        acc.totalWithoutEnhancements = row.count;
      }
      return acc;
    }, { totalWithEnhancements: 0, totalWithoutEnhancements: 0 });

    const totalEnhancementConversions = enhancementStats.totalWithEnhancements + enhancementStats.totalWithoutEnhancements;
    enhancementStats.adoptionRate = totalEnhancementConversions > 0
      ? Math.round((enhancementStats.totalWithEnhancements / totalEnhancementConversions) * 100)
      : 0;

    return {
      conversionsPerDay,
      performanceModeDistribution,
      qualityTrends,
      processingTimesTrends: [], // Would calculate from processing times
      enhancementAdoption: enhancementStats,
      topFileTypes: [{ type: 'PDF', count: conversionsPerDay.reduce((sum, day) => sum + day.count, 0) }]
    };
  }

  /**
   * Get plan details by plan name
   */
  private static getPlanDetails(planName: string): any {
    const plans = {
      free: {
        name: 'Free',
        conversionsPerMonth: 3,
        maxFileSize: '10MB',
        features: ['Basic conversion', 'Standard quality'],
        price: 0
      },
      starter: {
        name: 'Starter',
        conversionsPerMonth: 100,
        maxFileSize: '25MB',
        features: ['OCR Overlay conversion', 'Enhanced quality', 'Priority support'],
        price: 7
      },
      pro: {
        name: 'Pro',
        conversionsPerMonth: -1, // Unlimited
        maxFileSize: '100MB',
        features: ['All features', 'Unlimited conversions', 'API access', 'Premium support'],
        price: 19
      }
    };

    return plans[planName as keyof typeof plans] || plans.free;
  }

  /**
   * Extract filename from input_files JSON
   */
  private static extractFileName(inputFiles: string): string {
    try {
      const files = JSON.parse(inputFiles || '[]');
      return files[0] || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Execute database query (supports both MySQL and SQLite)
   */
  private static async executeQuery(query: string, params: any[]): Promise<any[]> {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      const connection = getConnection();
      const [rows] = await connection.execute(query, params);
      return rows as any[];
    } else {
      // Use SQLite in development
      const db = getSQLite();

      if (query.toLowerCase().includes('insert')) {
        const stmt = db.prepare(query);
        const result = stmt.run(...params);
        return [{ insertId: result.lastInsertRowid, affectedRows: result.changes }];
      } else if (query.toLowerCase().includes('update')) {
        const stmt = db.prepare(query);
        const result = stmt.run(...params);
        return [{ affectedRows: result.changes }];
      } else {
        // SELECT query
        const stmt = db.prepare(query);
        const rows = stmt.all(...params);
        return rows;
      }
    }
  }
}

export default EnhancedUserController;