import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AuthenticatedRequest, User } from '../types/auth.types';
import { findUserById } from '../services/auth.service';

/**
 * Authentication middleware to verify JWT tokens
 * Attaches user object to request if token is valid
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Access token required',
          code: 'AUTH_TOKEN_MISSING',
        },
      });
      return;
    }

    // Check for Bearer token format
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token format. Use Bearer <token>',
          code: 'AUTH_TOKEN_INVALID_FORMAT',
        },
      });
      return;
    }

    const token = tokenParts[1];

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Your session has expired. Please login again to continue.',
          code: 'AUTH_TOKEN_EXPIRED',
          action: 'LOGIN_REQUIRED'
        },
      });
      return;
    }

    // Check token expiration time and add warning if expires soon
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - currentTime;
    const hoursUntilExpiry = timeUntilExpiry / 3600;

    let expiryWarning = null;
    if (hoursUntilExpiry <= 24) {
      expiryWarning = {
        message: `Your session will expire in ${Math.round(hoursUntilExpiry)} hours. Please save your work and login again soon.`,
        expiresIn: timeUntilExpiry,
        action: 'LOGIN_SOON'
      };
    }

    // Fetch user from database using payload.userId
    const user = await findUserById(payload.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'AUTH_USER_NOT_FOUND',
        },
      });
      return;
    }

    // Attach user to request object
    req.user = user;

    // Add expiry warning to response headers if token expires soon
    if (expiryWarning) {
      res.setHeader('X-Token-Warning', JSON.stringify(expiryWarning));
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Authentication error',
        code: 'AUTH_INTERNAL_ERROR',
      },
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // No token provided, continue without user context
    next();
    return;
  }

  // If token is provided, validate it
  await authenticateToken(req, res, next);
};

// Note: Usage checking middleware will be implemented in Story 2.3

/**
 * Authorization middleware to check user permissions
 * Requires authentication middleware to run first
 */
export const requirePlan = (requiredPlan: 'starter' | 'pro' | 'enterprise') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
      });
      return;
    }

    const planHierarchy = {
      free: 0,
      starter: 1,
      pro: 2,
      enterprise: 3,
    };

    const userPlanLevel = planHierarchy[req.user.plan];
    const requiredPlanLevel = planHierarchy[requiredPlan];

    if (userPlanLevel < requiredPlanLevel) {
      res.status(403).json({
        success: false,
        error: {
          message: `${requiredPlan} plan required for this feature`,
          code: 'AUTH_INSUFFICIENT_PLAN',
        },
      });
      return;
    }

    next();
  };
};

// Export JWT utilities for backward compatibility
export { generateToken } from '../utils/jwt';