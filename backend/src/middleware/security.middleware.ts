/**
 * COMPREHENSIVE SECURITY FRAMEWORK
 *
 * Built on ImprovedPDFService stable foundation (100% success rate)
 * Implements production-grade security for PDF processing
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { AuthenticatedRequest } from '../types/auth.types';
// Security configuration
const SECURITY_CONFIG = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: ['application/pdf'],
  allowedExtensions: ['.pdf'],
  tempFileExpiry: 3600000, // 1 hour
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  bcryptRounds: 12,
  rateLimits: {
    free: { windowMs: 24 * 60 * 60 * 1000, max: 3 }, // 3 per day
    starter: { windowMs: 30 * 24 * 60 * 60 * 1000, max: 100 }, // 100 per month
    pro: { windowMs: 60 * 60 * 1000, max: 1000 }, // 1000 per hour
    enterprise: { windowMs: 60 * 60 * 1000, max: 10000 }, // 10000 per hour
  }
};

/**
 * SECURITY LAYER 1: HTTP Security Headers
 */
export const httpSecurityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
];

/**
 * SECURITY LAYER 2: Authentication & Authorization
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_TOKEN_MISSING'
      });
      return;
    }

    const decoded = jwt.verify(token, SECURITY_CONFIG.jwtSecret) as any;

    // In production, fetch user from database
    // For now, decode from JWT payload
    const now = new Date();
    const rawId = typeof decoded.id !== 'undefined' ? decoded.id : decoded.userId;
    const userId = typeof rawId === 'number' ? rawId : Number(rawId || 0);

    req.user = {
      id: Number.isNaN(userId) ? 0 : userId,
      email: decoded.email || '',
      plan: decoded.plan || 'free',
      conversions_used: decoded.conversions_used ?? decoded.conversionsUsed ?? 0,
      conversions_limit: decoded.conversions_limit ?? decoded.conversionsLimit ?? 3,
      stripe_customer_id: decoded.stripe_customer_id,
      subscription_status: decoded.subscription_status,
      created_at: decoded.created_at ? new Date(decoded.created_at) : now,
      updated_at: decoded.updated_at ? new Date(decoded.updated_at) : now,
    };

    next();
  } catch (error) {
    console.error('[SECURITY] Authentication failed:', error);
    res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'AUTH_TOKEN_INVALID'
    });
  }
};

/**
 * SECURITY LAYER 3: Rate Limiting
 */
export const createRateLimiter = (plan: 'free' | 'starter' | 'pro' | 'enterprise' = 'free') => {
  const limits = SECURITY_CONFIG.rateLimits[plan];

  return rateLimit({
    windowMs: limits.windowMs,
    max: limits.max,
    message: {
      success: false,
      error: `Rate limit exceeded for ${plan} plan`,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: limits.windowMs / 1000
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const authRequest = req as AuthenticatedRequest;
      const id = authRequest.user?.id;
      if (typeof id !== 'undefined' && id !== null) {
        return String(id);
      }
      return req.ip || 'anonymous';
    },
  });
};

export const dynamicRateLimit = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const userPlan = req.user?.plan || 'free';
  const rateLimiter = createRateLimiter(userPlan);
  rateLimiter(req, res, next);
};

/**
 * SECURITY LAYER 4: File Upload Security
 */
export const secureFileStorage = multer.memoryStorage();

export const secureFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  try {
    // Check MIME type
    if (!SECURITY_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      cb(new Error(`Invalid file type. Only PDF files allowed. Got: ${file.mimetype}`));
      return;
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!SECURITY_CONFIG.allowedExtensions.includes(ext)) {
      cb(new Error(`Invalid file extension. Only .pdf files allowed. Got: ${ext}`));
      return;
    }

    // Validate filename
    if (!file.originalname || file.originalname.length > 255) {
      cb(new Error('Invalid filename length'));
      return;
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [/\.\./g, /[<>:"\\|?*]/g, /\x00/g];
    if (suspiciousPatterns.some(pattern => pattern.test(file.originalname))) {
      cb(new Error('Filename contains invalid characters'));
      return;
    }

    cb(null, true);
  } catch (error) {
    cb(new Error('File validation failed'));
  }
};

export const secureUpload = multer({
  storage: secureFileStorage,
  fileFilter: secureFileFilter,
  limits: {
    fileSize: SECURITY_CONFIG.maxFileSize,
    files: 1,
    fields: 5,
    fieldNameSize: 50,
    fieldSize: 1024,
  },
});

/**
 * SECURITY LAYER 5: PDF Content Validation
 */
export const validatePDFContent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
        code: 'FILE_MISSING'
      });
      return;
    }

    const file = req.file;

    // Basic PDF signature validation
    const pdfSignature = file.buffer.slice(0, 4);
    if (pdfSignature.toString() !== '%PDF') {
      res.status(400).json({
        success: false,
        error: 'Invalid PDF file structure',
        code: 'INVALID_PDF_SIGNATURE'
      });
      return;
    }

    // Check for minimum viable PDF size
    if (file.buffer.length < 100) {
      res.status(400).json({
        success: false,
        error: 'PDF file too small to be valid',
        code: 'INVALID_PDF_SIZE'
      });
      return;
    }

    // Basic malware pattern detection (simple patterns)
    const suspiciousPatterns = [
      /javascript/gi,
      /action/gi,
      /<script/gi,
      /eval\(/gi,
    ];

    const contentString = file.buffer.toString('ascii');
    const suspiciousFound = suspiciousPatterns.some(pattern =>
      pattern.test(contentString)
    );

    if (suspiciousFound) {
      console.warn('[SECURITY] Suspicious content detected in PDF:', {
        filename: file.originalname,
        size: file.size,
        userId: req.user?.id
      });

      res.status(400).json({
        success: false,
        error: 'PDF contains potentially malicious content',
        code: 'SUSPICIOUS_CONTENT'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[SECURITY] PDF validation failed:', error);
    res.status(500).json({
      success: false,
      error: 'PDF validation failed',
      code: 'VALIDATION_ERROR'
    });
  }
};

/**
 * SECURITY LAYER 6: Usage Quota Validation
 */
export const validateUsageQuota = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const { conversions_limit, conversions_used, plan } = req.user;
    const used = conversions_used ?? 0;
    const limit = conversions_limit ?? 0;

    if (limit !== -1 && used >= limit) {
      res.status(429).json({
        success: false,
        error: `Conversion limit exceeded for ${plan} plan`,
        code: 'QUOTA_EXCEEDED',
        usage: {
          used,
          limit,
          plan
        }
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[SECURITY] Quota validation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Usage validation failed',
      code: 'QUOTA_VALIDATION_ERROR'
    });
  }
};

/**
 * SECURITY LAYER 7: Secure Temporary File Management
 */
export class SecureTempFileManager {
  private static tempDir = path.join(process.cwd(), 'temp');
  private static fileRegistry = new Map<string, { path: string; createdAt: Date; userId: string }>();

  static async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      console.log('[SECURITY] Secure temp directory initialized');

      // Start cleanup interval
      setInterval(() => this.cleanupExpiredFiles(), 60000); // Every minute
    } catch (error) {
      console.error('[SECURITY] Failed to initialize temp directory:', error);
    }
  }

  static async createSecureFile(
    buffer: Buffer,
    originalName: string,
    userId: string
  ): Promise<string> {
    try {
      const fileId = uuidv4();
      const extension = path.extname(originalName).toLowerCase();
      const filename = `${fileId}${extension}`;
      const filepath = path.join(this.tempDir, filename);

      await fs.writeFile(filepath, buffer);

      this.fileRegistry.set(fileId, {
        path: filepath,
        createdAt: new Date(),
        userId: userId
      });

      console.log('[SECURITY] Secure temp file created:', {
        fileId,
        originalName,
        userId,
        size: buffer.length
      });

      return filepath;
    } catch (error) {
      console.error('[SECURITY] Failed to create secure temp file:', error);
      throw new Error('Failed to create temporary file');
    }
  }

  static async deleteSecureFile(fileId: string, userId: string): Promise<void> {
    try {
      const fileInfo = this.fileRegistry.get(fileId);
      if (!fileInfo) {
        console.warn('[SECURITY] Attempted to delete non-existent file:', fileId);
        return;
      }

      if (fileInfo.userId !== userId) {
        console.warn('[SECURITY] Unauthorized file deletion attempt:', {
          fileId,
          requestedBy: userId,
          owner: fileInfo.userId
        });
        throw new Error('Unauthorized file access');
      }

      await fs.unlink(fileInfo.path);
      this.fileRegistry.delete(fileId);

      console.log('[SECURITY] Secure temp file deleted:', fileId);
    } catch (error) {
      console.error('[SECURITY] Failed to delete secure temp file:', error);
    }
  }

  private static async cleanupExpiredFiles(): Promise<void> {
    const now = new Date();
    const expiredFiles: string[] = [];

    for (const [fileId, fileInfo] of this.fileRegistry.entries()) {
      const age = now.getTime() - fileInfo.createdAt.getTime();
      if (age > SECURITY_CONFIG.tempFileExpiry) {
        expiredFiles.push(fileId);
      }
    }

    for (const fileId of expiredFiles) {
      try {
        const fileInfo = this.fileRegistry.get(fileId);
        if (fileInfo) {
          await fs.unlink(fileInfo.path);
          this.fileRegistry.delete(fileId);
          console.log('[SECURITY] Expired temp file cleaned up:', fileId);
        }
      } catch (error) {
        console.error('[SECURITY] Failed to cleanup expired file:', fileId, error);
      }
    }

    if (expiredFiles.length > 0) {
      console.log(`[SECURITY] Cleaned up ${expiredFiles.length} expired temp files`);
    }
  }
}

/**
 * SECURITY LAYER 8: Audit Logging
 */
export interface SecurityAuditLog {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  success: boolean;
  ip: string;
  userAgent: string;
  details?: any;
}

export class SecurityAuditor {
  private static logs: SecurityAuditLog[] = [];
  private static maxLogs = 10000;

  static log(
    req: AuthenticatedRequest,
    action: string,
    resource: string,
    success: boolean,
    details?: any
  ): void {
    const auditLog: SecurityAuditLog = {
      timestamp: new Date(),
      userId: req.user ? String(req.user.id) : 'anonymous',
      action,
      resource,
      success,
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      details
    };

    this.logs.push(auditLog);

    // Keep only recent logs in memory
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log security events
    const logLevel = success ? 'info' : 'warn';
    console[logLevel]('[SECURITY AUDIT]', {
      action,
      resource,
      success,
      userId: auditLog.userId,
      ip: auditLog.ip
    });

    // In production, send to external logging service
    if (!success) {
      console.error('[SECURITY ALERT]', auditLog);
    }
  }

  static getRecentLogs(userId?: string, limit = 100): SecurityAuditLog[] {
    let filteredLogs = this.logs;

    if (userId) {
      filteredLogs = this.logs.filter(log => log.userId === userId);
    }

    return filteredLogs
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}

/**
 * SECURITY MIDDLEWARE COMPOSITION
 */
export const createSecurityLayer = () => ({
  // HTTP Security
  httpSecurity: httpSecurityMiddleware,

  // Authentication
  authenticate: authenticateToken,

  // Rate Limiting
  rateLimit: dynamicRateLimit,

  // File Upload
  uploadSingle: secureUpload.single('pdf'),
  uploadMultiple: secureUpload.array('pdfs', 20),

  // Content Validation
  validatePDF: validatePDFContent,

  // Usage Quota
  validateQuota: validateUsageQuota,

  // Audit Logging
  auditLog: (action: string, resource: string) =>
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      res.send = function(data) {
        const success = res.statusCode < 400;
        SecurityAuditor.log(req, action, resource, success, { statusCode: res.statusCode });
        return originalSend.call(this, data);
      };
      next();
    }
});

// Initialize secure temp file manager
SecureTempFileManager.initialize().catch(console.error);

export default createSecurityLayer;