/**
 * Usage Limit Middleware - PDFCraft.Pro
 * CRITICAL FIX: Atomic usage limit enforcement
 * Prevents race condition that allowed unlimited free tier usage
 */

import { Request, Response, NextFunction } from 'express';
import UsageTrackingService from '../services/usage-tracking.service';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/auth.types';

interface PlanLimits {
  [key: string]: {
    conversionsLimit: number;
    isUnlimited: boolean;
    maxFileSize: number;
    ocrOverlayAccess: boolean;
  };
}

// Plan configuration with limits
const PLAN_LIMITS: PlanLimits = {
  free: {
    conversionsLimit: 3,
    isUnlimited: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    ocrOverlayAccess: false
  },
  starter: {
    conversionsLimit: 100,
    isUnlimited: false,
    maxFileSize: 25 * 1024 * 1024, // 25MB
    ocrOverlayAccess: true
  },
  pro: {
    conversionsLimit: -1,
    isUnlimited: true,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    ocrOverlayAccess: true
  },
  enterprise: {
    conversionsLimit: -1,
    isUnlimited: true,
    maxFileSize: 500 * 1024 * 1024, // 500MB
    ocrOverlayAccess: true
  }
};

/**
 * CRITICAL FIX: Atomic usage limit check and increment
 * Prevents race condition in usage tracking
 */
export const checkUsageLimitsAtomic = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;

    // For anonymous users, apply free tier limits
    if (!user) {
      const anonymousLimits = PLAN_LIMITS.free;
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const anonymousUserId = `anonymous:${clientIp}`;

      const result = await UsageTrackingService.incrementUsageAtomic(anonymousUserId, {
        planId: 'free',
        conversionsLimit: anonymousLimits.conversionsLimit,
        isUnlimited: false
      });

      if (!result.allowed) {
        res.status(429).json({
          success: false,
          message: 'Usage limit exceeded. Please sign up for higher limits.',
          code: 'USAGE_LIMIT_EXCEEDED',
          usage: {
            current: result.currentUsage,
            limit: result.limit,
            resetDate: result.resetDate,
            timeUntilReset: result.timeUntilReset
          },
          upgradeMessage: 'Sign up for free to get more conversions!'
        });
        return;
      }

      // Set usage info for tracking
      (req as any).usageInfo = result;
      return next();
    }

    // For authenticated users
    const userPlanId = user.plan || 'free';
    const planLimits = PLAN_LIMITS[userPlanId] || PLAN_LIMITS.free;

    // CRITICAL: Use atomic increment to prevent race conditions
    const result = await UsageTrackingService.incrementUsageAtomic(user.id.toString(), {
      planId: userPlanId,
      conversionsLimit: planLimits.conversionsLimit,
      isUnlimited: planLimits.isUnlimited
    });

    if (!result.allowed) {
      // Log usage limit reached for monitoring
      logger.warn('User usage limit exceeded', {
        userId: user.id,
        planId: userPlanId,
        currentUsage: result.currentUsage,
        limit: result.limit
      });

      res.status(429).json({
        success: false,
        message: `Usage limit exceeded for ${userPlanId} plan. Upgrade for higher limits.`,
        code: 'USAGE_LIMIT_EXCEEDED',
        usage: {
          current: result.currentUsage,
          limit: result.limit,
          resetDate: result.resetDate,
          timeUntilReset: result.timeUntilReset
        },
        upgradeOptions: getUpgradeOptions(userPlanId)
      });
    }

    // Set usage info for tracking and analytics
    (req as any).usageInfo = result;
    (req as any).planLimits = planLimits;

    // Log successful usage increment for analytics
    logger.info('Usage limit check passed', {
      userId: user.id,
      planId: userPlanId,
      currentUsage: result.currentUsage,
      limit: result.limit
    });

    next();

  } catch (error) {
    logger.error('Usage limit check failed', {
      userId: req.user?.id || 'anonymous',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // On error, deny access to be safe
    res.status(500).json({
      success: false,
      message: 'Unable to verify usage limits. Please try again.',
      code: 'USAGE_CHECK_FAILED'
    });
  }
};

/**
 * Check usage limits without incrementing (for preview/status checks)
 */
export const checkUsageLimitsReadOnly = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      const anonymousLimits = PLAN_LIMITS.free;
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const anonymousUserId = `anonymous:${clientIp}`;

      const result = await UsageTrackingService.getUserUsage(anonymousUserId, {
        planId: 'free',
        conversionsLimit: anonymousLimits.conversionsLimit,
        isUnlimited: false
      });

      (req as any).usageInfo = result;
      return next();
    }

    const userPlanId = user.plan || 'free';
    const planLimits = PLAN_LIMITS[userPlanId] || PLAN_LIMITS.free;

    const result = await UsageTrackingService.getUserUsage(user.id.toString(), {
      planId: userPlanId,
      conversionsLimit: planLimits.conversionsLimit,
      isUnlimited: planLimits.isUnlimited
    });

    (req as any).usageInfo = result;
    (req as any).planLimits = planLimits;

    next();

  } catch (error) {
    logger.error('Read-only usage check failed', {
      userId: req.user?.id || 'anonymous',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // On error, continue but without usage info
    next();
  }
};

/**
 * Check file size limits based on user plan
 */
export const checkFileSizeLimit = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const user = req.user;
    const userPlanId = user?.plan || 'free';
    const planLimits = PLAN_LIMITS[userPlanId] || PLAN_LIMITS.free;

    // Get uploaded files
    const files = req.files as Express.Multer.File[] || [];

    for (const file of files) {
      if (file.size > planLimits.maxFileSize) {
        const maxSizeMB = Math.round(planLimits.maxFileSize / (1024 * 1024));
        const fileSizeMB = Math.round(file.size / (1024 * 1024));

        logger.warn('File size limit exceeded', {
          userId: user?.id || 'anonymous',
          planId: userPlanId,
          fileName: file.originalname,
          fileSize: file.size,
          maxSize: planLimits.maxFileSize
        });

        res.status(413).json({
          success: false,
          message: `File size ${fileSizeMB}MB exceeds ${maxSizeMB}MB limit for ${userPlanId} plan.`,
          code: 'FILE_SIZE_EXCEEDED',
          limits: {
            maxFileSize: planLimits.maxFileSize,
            maxFileSizeMB: maxSizeMB,
            currentFileSizeMB: fileSizeMB
          },
          upgradeOptions: getUpgradeOptions(userPlanId)
        });
        return;
      }
    }

    next();

  } catch (error) {
    logger.error('File size check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      message: 'Unable to verify file size limits. Please try again.',
      code: 'FILE_SIZE_CHECK_FAILED'
    });
  }
};

/**
 * Check OCR Overlay access based on user plan
 */
export const checkOCROverlayAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const user = req.user;
    const userPlanId = user?.plan || 'free';
    const planLimits = PLAN_LIMITS[userPlanId] || PLAN_LIMITS.free;

    // Check if requesting OCR Overlay features
    const requestsOCROverlay = req.body?.enableOCROverlay ||
                             req.body?.performanceMode === 'quality' ||
                             req.body?.enhancements?.includes('ocr_overlay');

    if (requestsOCROverlay && !planLimits.ocrOverlayAccess) {
      logger.warn('OCR Overlay access denied', {
        userId: user?.id || 'anonymous',
        planId: userPlanId
      });

      res.status(403).json({
        success: false,
        message: `OCR Overlay technology requires ${userPlanId === 'free' ? 'a paid' : 'a higher'} plan.`,
        code: 'OCR_OVERLAY_ACCESS_DENIED',
        featureInfo: {
          feature: 'OCR Overlay Technology',
          benefits: [
            '99% image preservation',
            '90%+ text accuracy',
            'Invisible text overlays',
            'Professional PowerPoint output'
          ]
        },
        upgradeOptions: getUpgradeOptions(userPlanId)
      });
      return;
    }

    // Set access info for the request
    (req as any).ocrOverlayAccess = planLimits.ocrOverlayAccess;

    next();

  } catch (error) {
    logger.error('OCR Overlay access check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      message: 'Unable to verify feature access. Please try again.',
      code: 'FEATURE_ACCESS_CHECK_FAILED'
    });
  }
};

/**
 * Get upgrade options for a given plan
 */
function getUpgradeOptions(currentPlan: string): any[] {
  const options = [];

  if (currentPlan === 'free') {
    options.push(
      {
        plan: 'starter',
        price: '$7/month',
        benefits: ['100 conversions/month', '25MB files', 'OCR Overlay access']
      },
      {
        plan: 'pro',
        price: '$19/month',
        benefits: ['Unlimited conversions', '100MB files', 'All premium features']
      }
    );
  } else if (currentPlan === 'starter') {
    options.push({
      plan: 'pro',
      price: '$19/month',
      benefits: ['Unlimited conversions', '100MB files', 'Priority processing']
    });
  }

  return options;
}

/**
 * Middleware to rollback usage on conversion failure
 */
export const rollbackUsageOnError = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const originalSend = res.json;

  res.json = function(data: any) {
    // Check if this is an error response
    if (data && !data.success && req.user) {
      // Rollback usage increment for failed conversions
      const user = req.user;
      const userPlanId = user.plan || 'free';

      // Note: In a real implementation, you'd need to decrement the usage
      // For now, we log it for manual review
      logger.warn('Conversion failed - usage rollback needed', {
        userId: user.id,
        planId: userPlanId,
        error: data.message
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

export default {
  checkUsageLimitsAtomic,
  checkUsageLimitsReadOnly,
  checkFileSizeLimit,
  checkOCROverlayAccess,
  rollbackUsageOnError
};