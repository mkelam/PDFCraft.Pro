import { Request, Response } from 'express';
import { createUser, authenticateUser, findUserById } from '../services/auth.service';
import { validatePasswordStrength } from '../utils/password';
import { AuthenticatedRequest } from '../types/auth.types';
import { verifyRefreshToken, generateTokenPair } from '../utils/jwt';
import { EmailQueue } from '../workers/email.worker';
import { logger } from '../utils/logger';

export class AuthController {
  /**
   * Register new user
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Additional password strength validation
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          error: {
            message: passwordValidation.message,
            code: 'WEAK_PASSWORD',
          },
        });
        return;
      }

      // Create user
      const result = await createUser({ email, password });

      // Send welcome email
      try {
        const userName = result.user.email.split('@')[0]; // Use email prefix as name
        await EmailQueue.sendWelcomeEmail(result.user.email, userName);
        logger.info(`📧 Welcome email queued for: ${result.user.email}`);
      } catch (emailError) {
        logger.warn('Failed to queue welcome email:', emailError);
        // Don't fail registration if email fails
      }

      res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully',
      });
    } catch (error) {
      // Handle duplicate email error
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: {
            message: 'An account with this email already exists',
            code: 'EMAIL_ALREADY_EXISTS',
          },
        });
        return;
      }

      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create user account',
          code: 'REGISTRATION_FAILED',
        },
      });
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Authenticate user
      const result = await authenticateUser({ email, password });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error) {
      // Handle authentication errors
      if (error instanceof Error && error.message.includes('Invalid email or password')) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
          },
        });
        return;
      }

      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Login failed',
          code: 'LOGIN_FAILED',
        },
      });
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      // For JWT-based auth, logout is primarily handled client-side
      // by removing the token. In a production environment, we could:
      // 1. Add token to a blacklist in Redis
      // 2. Use short-lived tokens with refresh tokens
      // 3. Clear httpOnly cookies if using cookie-based tokens

      // For now, we'll log the logout event for security monitoring
      const authHeader = req.headers.authorization;
      if (authHeader) {
        console.log('User logout detected with token:', authHeader.substring(0, 20) + '...');
      }

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Logout failed',
          code: 'LOGOUT_FAILED',
        },
      });
    }
  }

  /**
   * Get current user information
   */
  static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Not authenticated',
            code: 'NOT_AUTHENTICATED',
          },
        });
        return;
      }

      // Fetch fresh user data from database to ensure it's current
      const user = await findUserById(req.user.id);
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { user },
        message: 'User data retrieved successfully',
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve user data',
          code: 'GET_USER_FAILED',
        },
      });
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Refresh token is required',
            code: 'REFRESH_TOKEN_MISSING',
          },
        });
        return;
      }

      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);
      if (!payload) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Invalid or expired refresh token',
            code: 'INVALID_REFRESH_TOKEN',
          },
        });
        return;
      }

      // Check if user still exists
      const user = await findUserById(payload.userId);
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND',
          },
        });
        return;
      }

      // Generate new token pair
      const tokens = generateTokenPair(user.id, user.email);

      res.status(200).json({
        success: true,
        data: {
          user,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
        message: 'Tokens refreshed successfully',
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to refresh tokens',
          code: 'REFRESH_TOKEN_FAILED',
        },
      });
    }
  }
}