import { Request, Response } from 'express';
import { createUser, authenticateUser, findUserById } from '../services/auth.service';
import { validatePasswordStrength } from '../utils/password';
import { AuthenticatedRequest } from '../types/auth.types';
import { verifyRefreshToken, generateTokenPair } from '../utils/jwt';
import { EmailQueue } from '../workers/email.worker';
import { logger } from '../utils/logger';
import { UserModel } from '../models/User.model';
import { EmailService } from '../services/email.service';

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

      // Create user (email verification sent inside createUser)
      const result = await createUser({ email, password });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful! Please check your email to verify your account.',
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

  /**
   * Verify email with token
   * GET /api/auth/verify-email/:token
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Verification token is required',
            code: 'TOKEN_MISSING',
          },
        });
        return;
      }

      // Verify email using User model
      const user = await UserModel.verifyEmail(token);

      logger.info(`✅ Email verified for user: ${user.email}`);

      // Send welcome email after verification
      try {
        const userName = user.full_name || user.email.split('@')[0];
        await EmailService.sendWelcomeEmail(user.email, userName);
      } catch (emailError) {
        logger.warn('Failed to send welcome email:', emailError);
      }

      res.status(200).json({
        success: true,
        data: { user },
        message: 'Email verified successfully! You can now start converting PDFs.',
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      res.status(400).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Invalid or expired verification token',
          code: 'VERIFICATION_FAILED',
        },
      });
    }
  }

  /**
   * Resend verification email
   * POST /api/auth/resend-verification
   */
  static async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Email address is required',
            code: 'EMAIL_MISSING',
          },
        });
        return;
      }

      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists (prevent email enumeration)
        res.status(200).json({
          success: true,
          message: 'If an account exists with this email, a verification link has been sent.',
        });
        return;
      }

      // Check if already verified
      if (user.email_verified) {
        res.status(400).json({
          success: false,
          error: {
            message: 'This email address has already been verified',
            code: 'ALREADY_VERIFIED',
          },
        });
        return;
      }

      // Generate new verification token
      const newToken = await UserModel.regenerateVerificationToken(user.id);

      // Send verification email
      await EmailService.sendVerificationEmail(
        { ...user, verification_token: newToken },
        newToken
      );

      logger.info(`📧 Verification email resent to: ${email}`);

      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully. Please check your inbox.',
      });
    } catch (error) {
      logger.error('Resend verification error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to resend verification email',
          code: 'RESEND_FAILED',
        },
      });
    }
  }

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Email address is required',
            code: 'EMAIL_MISSING',
          },
        });
        return;
      }

      try {
        // Generate password reset token
        const { user, token } = await UserModel.generatePasswordResetToken(email);

        // Send password reset email
        await EmailService.sendPasswordResetEmail(user.email, token);

        logger.info(`📧 Password reset email sent to: ${email}`);
      } catch (error) {
        // User not found - but don't reveal this (prevent email enumeration)
        logger.info(`Password reset requested for non-existent email: ${email}`);
      }

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to process password reset request',
          code: 'FORGOT_PASSWORD_FAILED',
        },
      });
    }
  }

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Token and new password are required',
            code: 'MISSING_FIELDS',
          },
        });
        return;
      }

      // Validate password strength
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

      // Reset password
      const user = await UserModel.resetPassword(token, password);

      logger.info(`✅ Password reset successful for user: ${user.email}`);

      res.status(200).json({
        success: true,
        data: { user },
        message: 'Password reset successful! You can now log in with your new password.',
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(400).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Invalid or expired reset token',
          code: 'RESET_PASSWORD_FAILED',
        },
      });
    }
  }

  /**
   * Update password (for authenticated users)
   * POST /api/auth/update-password
   */
  static async updatePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Both old and new password are required',
            code: 'MISSING_FIELDS',
          },
        });
        return;
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(newPassword);
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

      // Update password
      const user = await UserModel.updatePassword(req.user.id, oldPassword, newPassword);

      logger.info(`✅ Password updated for user: ${user.email}`);

      res.status(200).json({
        success: true,
        message: 'Password updated successfully',
      });
    } catch (error) {
      logger.error('Update password error:', error);
      res.status(400).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to update password',
          code: 'UPDATE_PASSWORD_FAILED',
        },
      });
    }
  }
}