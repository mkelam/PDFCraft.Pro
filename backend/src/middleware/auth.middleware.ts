/**
 * Authentication Middleware
 * Handles JWT verification and user authentication
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel, User } from '../models/User.model';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: number;
    }
  }
}

// ============================================================================
// JWT HELPER FUNCTIONS
// ============================================================================

export interface JWTPayload {
  userId: number;
  email: string;
  plan: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    plan: user.plan
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    plan: user.plan
  };

  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    ) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    return jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production'
    ) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Main authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
      return;
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    let decoded: JWTPayload;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Token verification failed'
      });
      return;
    }

    // Fetch user from database
    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      res.status(401).json({
        error: 'User not found',
        message: 'Token is valid but user does not exist'
      });
      return;
    }

    // Check if account is locked
    const isLocked = await UserModel.isAccountLocked(user.email);
    if (isLocked) {
      res.status(403).json({
        error: 'Account locked',
        message: 'Account is temporarily locked due to multiple failed login attempts'
      });
      return;
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication check failed'
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't block request
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');

      try {
        const decoded = verifyAccessToken(token);
        const user = await UserModel.findById(decoded.userId);

        if (user) {
          req.user = user;
          req.userId = user.id;
        }
      } catch (error) {
        // Silent fail - optional auth
      }
    }

    next();
  } catch (error) {
    next();
  }
}

/**
 * Email verification middleware
 * Ensures user has verified their email before proceeding
 */
export function requireEmailVerified(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to continue'
    });
    return;
  }

  if (!req.user.email_verified) {
    res.status(403).json({
      error: 'Email verification required',
      message: 'Please verify your email address before converting files',
      action: 'resend_verification_email',
      user_id: req.user.id
    });
    return;
  }

  next();
}

/**
 * Plan-based access control
 * Restricts access to certain plans
 */
export function requirePlan(allowedPlans: Array<'free' | 'starter' | 'pro' | 'enterprise'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required'
      });
      return;
    }

    if (!allowedPlans.includes(req.user.plan)) {
      res.status(403).json({
        error: 'Upgrade required',
        message: `This feature requires ${allowedPlans.join(' or ')} plan`,
        current_plan: req.user.plan,
        upgrade_url: '/pricing'
      });
      return;
    }

    next();
  };
}

/**
 * Admin-only access
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required'
    });
    return;
  }

  if (req.user.plan !== 'enterprise' && req.user.email !== 'admin@pdflab.pro') {
    res.status(403).json({
      error: 'Admin access required'
    });
    return;
  }

  next();
}

// ============================================================================
// RATE LIMITING (IP-based)
// ============================================================================

const loginAttempts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    const attempt = loginAttempts.get(ip);

    if (attempt) {
      if (now < attempt.resetTime) {
        if (attempt.count >= maxAttempts) {
          const minutesRemaining = Math.ceil((attempt.resetTime - now) / 60000);
          res.status(429).json({
            error: 'Too many requests',
            message: `Too many attempts. Please try again in ${minutesRemaining} minutes`
          });
          return;
        }
        attempt.count++;
      } else {
        loginAttempts.set(ip, { count: 1, resetTime: now + windowMs });
      }
    } else {
      loginAttempts.set(ip, { count: 1, resetTime: now + windowMs });
    }

    next();
  };
}

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, attempt] of loginAttempts.entries()) {
    if (now > attempt.resetTime) {
      loginAttempts.delete(ip);
    }
  }
}, 60 * 60 * 1000);
