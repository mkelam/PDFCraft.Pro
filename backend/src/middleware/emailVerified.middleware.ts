/**
 * Email Verification Enforcement Middleware
 * Blocks unverified users from accessing conversion endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import { logger } from '../utils/logger';

/**
 * Require email verification middleware
 * MUST be used after authMiddleware (requires req.user to exist)
 */
export function requireEmailVerified(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'NOT_AUTHENTICATED',
        },
      });
      return;
    }

    // Check if email is verified
    if (!req.user.email_verified) {
      logger.warn(`Unverified user attempted conversion: ${req.user.email}`);

      res.status(403).json({
        success: false,
        error: {
          message: 'Email verification required before converting files',
          code: 'EMAIL_NOT_VERIFIED',
          details: {
            email: req.user.email,
            action_required: 'verify_email',
            message: 'Please check your inbox for the verification email. Click the link to verify your account.',
          },
        },
        actions: {
          resend_verification: {
            method: 'POST',
            endpoint: '/api/auth/resend-verification',
            body: { email: req.user.email },
          },
        },
      });
      return;
    }

    // Email is verified, proceed
    next();
  } catch (error) {
    logger.error('Email verification check error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to verify email status',
        code: 'VERIFICATION_CHECK_FAILED',
      },
    });
  }
}

/**
 * Optional email verification check
 * Returns verification status but doesn't block request
 */
export function checkEmailVerified(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    if (req.user && !req.user.email_verified) {
      // Add warning header but don't block
      res.setHeader('X-Email-Verification-Required', 'true');
      res.setHeader('X-Email-Verification-Email', req.user.email);
    }
    next();
  } catch (error) {
    // Silent fail for optional check
    next();
  }
}
