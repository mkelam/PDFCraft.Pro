import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/auth.types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-for-development';
const JWT_EXPIRATION = '15m'; // 15 minutes
const JWT_REFRESH_EXPIRATION = '7d'; // 7 days

/**
 * Generate JWT token for authenticated user
 * @param userId - User ID
 * @param email - User email
 * @returns Signed JWT token
 */
export const generateToken = (userId: number, email: string): string => {
  const payload: JWTPayload = {
    userId,
    email,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
    issuer: 'pdfcraft-pro',
    audience: 'pdfcraft-users',
  });
};

/**
 * Verify and decode JWT token
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'pdfcraft-pro',
      audience: 'pdfcraft-users',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    // Token is invalid, expired, or malformed
    return null;
  }
};

/**
 * Generate refresh token for session persistence
 * @param userId - User ID
 * @param email - User email
 * @returns Signed refresh token
 */
export const generateRefreshToken = (userId: number, email: string): string => {
  const payload: JWTPayload = {
    userId,
    email,
    type: 'refresh',
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRATION,
    issuer: 'pdfcraft-pro',
    audience: 'pdfcraft-users',
  });
};

/**
 * Verify and decode refresh token
 * @param token - Refresh token string
 * @returns Decoded payload or null if invalid
 */
export const verifyRefreshToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'pdfcraft-pro',
      audience: 'pdfcraft-users',
    }) as JWTPayload;

    // Ensure it's a refresh token
    if (decoded.type !== 'refresh') {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Generate both access and refresh tokens
 * @param userId - User ID
 * @param email - User email
 * @returns Object with access and refresh tokens
 */
export const generateTokenPair = (userId: number, email: string) => {
  return {
    accessToken: generateToken(userId, email),
    refreshToken: generateRefreshToken(userId, email),
  };
};

/**
 * Generate password reset token
 * @param userId - User ID
 * @param email - User email
 * @returns Signed password reset token
 */
export const generateResetToken = (userId: number, email: string): string => {
  const payload: JWTPayload = {
    userId,
    email,
    type: 'reset',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1h', // 1 hour for password reset
    issuer: 'pdfcraft-pro',
    audience: 'pdfcraft-users',
  });
};

/**
 * Verify and decode password reset token
 * @param token - Password reset token string
 * @returns Decoded payload or null if invalid
 */
export const verifyResetToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'pdfcraft-pro',
      audience: 'pdfcraft-users',
    }) as JWTPayload;

    // Ensure it's a reset token
    if (decoded.type !== 'reset') {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Decode JWT token without verification (for debugging)
 * @param token - JWT token string
 * @returns Decoded payload or null
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};