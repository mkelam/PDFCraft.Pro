/**
 * Enhanced User Routes - PDFCraft.Pro
 * Advanced user management with OCR Overlay analytics
 * Provides comprehensive user dashboard and subscription management
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { EnhancedUserController } from '../controllers/enhanced-user.controller';

const router = Router();

/**
 * @route GET /api/users/enhanced/stats
 * @desc Get comprehensive user statistics including OCR Overlay metrics
 * @access Private
 * @returns User statistics including:
 *   - Total conversions (basic and OCR Overlay)
 *   - Processing time analytics
 *   - Quality score averages
 *   - File processing metrics
 *   - Subscription status
 *   - Usage patterns
 */
router.get('/stats', authenticateToken, EnhancedUserController.getUserStats);

/**
 * @route GET /api/users/enhanced/history
 * @desc Get detailed conversion history with filtering and pagination
 * @access Private
 * @query
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20)
 *   - type: Filter by conversion type
 *   - status: Filter by status (completed, failed, etc.)
 * @returns Paginated conversion history with:
 *   - Conversion details
 *   - Quality metrics
 *   - Processing times
 *   - Enhancement usage
 */
router.get('/history', authenticateToken, EnhancedUserController.getConversionHistory);

/**
 * @route GET /api/users/enhanced/analytics
 * @desc Get usage analytics for dashboard visualization
 * @access Private
 * @query
 *   - period: Analytics period (7d, 30d, 90d)
 * @returns Analytics data including:
 *   - Daily conversion trends
 *   - Performance mode distribution
 *   - Quality score trends
 *   - Enhancement adoption rates
 */
router.get('/analytics', authenticateToken, EnhancedUserController.getUsageAnalytics);

/**
 * @route PUT /api/users/enhanced/preferences
 * @desc Update user preferences and default settings
 * @access Private
 * @body
 *   - defaultPerformanceMode: Default performance mode preference
 *   - enableEnhancementsByDefault: Auto-enable Week 2 enhancements
 *   - emailNotifications: Email notification preferences
 *   - qualityThreshold: Minimum quality threshold alerts
 */
router.put('/preferences', authenticateToken, EnhancedUserController.updateUserPreferences);

/**
 * @route GET /api/users/enhanced/subscription
 * @desc Get detailed subscription information
 * @access Private
 * @returns Subscription details including:
 *   - Current plan details
 *   - Usage statistics
 *   - Billing information
 *   - Feature access levels
 */
router.get('/subscription', authenticateToken, EnhancedUserController.getSubscriptionDetails);

/**
 * Error handling middleware for enhanced user routes
 */
router.use((error: any, req: any, res: any, next: any) => {
  console.error('Enhanced user route error:', error);

  // Handle authentication errors
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication required for enhanced user features',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }

  // Handle database errors
  if (error.code === 'SQLITE_ERROR' || error.code?.startsWith('ER_')) {
    return res.status(500).json({
      success: false,
      message: 'Database error in user management system',
      code: 'DATABASE_ERROR'
    });
  }

  // Generic error response
  res.status(500).json({
    success: false,
    message: 'Internal server error in enhanced user system',
    code: 'INTERNAL_ERROR'
  });
});

export default router;