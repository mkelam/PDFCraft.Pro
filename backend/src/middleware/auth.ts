import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/config/database';
import { config, PLAN_LIMITS } from '@/config';
import { AuthRequest, User } from '@/types';

/**
 * JWT Authentication Middleware
 */
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: number };

    // Get user from database
    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE id = ?',
      [decoded.userId]
    );

    const users = rows as any[];
    if (users.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
      return;
    }

    // Attach user to request
    req.user = users[0] as User;
    next();

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Optional Authentication Middleware
 * Adds user to request if token is valid, but doesn't require it
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: number };

    // Get user from database
    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE id = ?',
      [decoded.userId]
    );

    const users = rows as any[];
    if (users.length > 0) {
      req.user = users[0] as User;
    }

    next();

  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

/**
 * Check usage limits based on user plan
 */
export const checkUsageLimits = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // If no user (free anonymous usage), apply free tier limits
    if (!req.user) {
      // For anonymous users, we'll track by IP (simple implementation)
      // In production, consider using Redis for IP-based rate limiting
      next();
      return;
    }

    const user = req.user;
    const planLimits = PLAN_LIMITS[user.plan];

    // Check file size limits
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        if (file.size > planLimits.maxFileSize) {
          res.status(413).json({
            success: false,
            message: `File size exceeds ${planLimits.maxFileSize / (1024 * 1024)}MB limit for ${user.plan} plan`,
            upgrade: user.plan === 'free' ? 'starter' : 'pro'
          });
          return;
        }
      }

      // Check merge file count limits
      if (req.path.includes('merge') && req.files.length > planLimits.maxFilesPerMerge) {
        res.status(413).json({
          success: false,
          message: `Maximum ${planLimits.maxFilesPerMerge} files allowed for ${user.plan} plan`,
          upgrade: user.plan === 'free' ? 'starter' : 'pro'
        });
        return;
      }
    }

    // Check conversion limits
    if (user.plan === 'free') {
      // Check daily limit for free users
      const connection = getConnection();
      const [rows] = await connection.execute(`
        SELECT COUNT(*) as today_count
        FROM conversion_jobs
        WHERE user_id = ? AND DATE(created_at) = CURDATE()
      `, [user.id]);

      const todayCount = (rows as any[])[0].today_count;

      if (todayCount >= planLimits.conversionsPerDay) {
        res.status(429).json({
          success: false,
          message: `Daily limit of ${planLimits.conversionsPerDay} conversions reached`,
          upgrade: 'starter',
          resetTime: 'midnight'
        });
        return;
      }
    } else if (user.plan === 'starter') {
      // Check monthly limit for starter users
      const connection = getConnection();
      const [rows] = await connection.execute(`
        SELECT COUNT(*) as month_count
        FROM conversion_jobs
        WHERE user_id = ? AND YEAR(created_at) = YEAR(NOW()) AND MONTH(created_at) = MONTH(NOW())
      `, [user.id]);

      const monthCount = (rows as any[])[0].month_count;

      if (monthCount >= planLimits.conversionsPerMonth) {
        res.status(429).json({
          success: false,
          message: `Monthly limit of ${planLimits.conversionsPerMonth} conversions reached`,
          upgrade: 'pro',
          resetTime: 'next month'
        });
        return;
      }
    }
    // Pro and enterprise have unlimited conversions

    next();

  } catch (error) {
    console.error('Usage limits middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Require specific plan level
 */
export const requirePlan = (minPlan: 'free' | 'starter' | 'pro' | 'enterprise') => {
  const planHierarchy = { free: 0, starter: 1, pro: 2, enterprise: 3 };

  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const userPlanLevel = planHierarchy[req.user.plan];
    const requiredPlanLevel = planHierarchy[minPlan];

    if (userPlanLevel < requiredPlanLevel) {
      res.status(403).json({
        success: false,
        message: `${minPlan} plan or higher required`,
        currentPlan: req.user.plan,
        upgrade: minPlan
      });
      return;
    }

    next();
  };
};

/**
 * Generate JWT token for user
 */
export const generateToken = (userId: number): string => {
  return jwt.sign(
    { userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};