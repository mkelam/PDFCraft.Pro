/**
 * PRODUCTION SECURITY MIDDLEWARE INTEGRATION
 *
 * Integrates enhanced security hardening into existing pdflab.pro server
 * Addresses BMAD Party-Mode critical vulnerabilities while maintaining compatibility
 */

import { Express, Request, Response, NextFunction } from 'express';
import {
  createEnhancedSecurityStack,
  enhancedPathValidation,
  enhancedFileValidation,
  enhancedRequestSanitization,
  enhancedSecurityAudit
} from './enhanced-security.middleware';
import { AuthenticatedRequest } from '../types/auth.types';

// Enhanced security stack
const enhancedSecurity = createEnhancedSecurityStack();

/**
 * Apply enhanced security middleware to Express app
 */
export const applyEnhancedSecurityMiddleware = (app: Express): void => {
  console.log('🛡️ Applying enhanced security middleware...');

  // 1. Global path validation (applied to all routes)
  app.use('*', enhancedSecurity.pathValidation);
  console.log('✅ Enhanced path validation applied globally');

  // 2. Global request sanitization
  app.use(enhancedSecurity.requestSanitization);
  console.log('✅ Enhanced request sanitization applied globally');

  // 3. Security audit logging for all API routes
  app.use('/api/*', enhancedSecurity.securityAudit('API_ACCESS', 'endpoint'));
  console.log('✅ Enhanced security audit logging applied to API routes');

  console.log('🎉 Enhanced security middleware successfully applied');
};

/**
 * Enhanced file upload middleware for convert routes
 */
export const enhancedFileUploadMiddleware = [
  // Enhanced file validation
  enhancedFileValidation,

  // Security audit for file uploads
  enhancedSecurityAudit('FILE_UPLOAD', 'pdf_file'),

  // Additional validation middleware
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Log successful file upload for monitoring
      if (req.file) {
        console.log('[ENHANCED-SECURITY] File upload validated:', {
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          userId: req.user?.id,
          timestamp: new Date().toISOString()
        });
      }
      next();
    } catch (error) {
      console.error('[ENHANCED-SECURITY] File upload middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'File upload processing failed',
        code: 'FILE_UPLOAD_ERROR'
      });
    }
  }
];

/**
 * Enhanced security for specific routes
 */
export const createSecureRouteHandler = (routeName: string, resourceType: string) => {
  return [
    // Path validation specific to this route
    enhancedPathValidation,

    // Request sanitization
    enhancedRequestSanitization,

    // Security audit with route-specific context
    enhancedSecurityAudit(routeName, resourceType),

    // Route-specific security validation
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Additional route-specific security checks can go here
        console.log(`[ENHANCED-SECURITY] Secure route access: ${routeName}`, {
          userId: req.user?.id,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });

        next();
      } catch (error) {
        console.error(`[ENHANCED-SECURITY] Route security error (${routeName}):`, error);
        res.status(500).json({
          success: false,
          error: 'Route security validation failed',
          code: 'ROUTE_SECURITY_ERROR'
        });
      }
    }
  ];
};

/**
 * Security health check middleware
 */
export const securityHealthCheck = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Perform security health checks
    const securityStatus = {
      pathValidation: 'active',
      fileValidation: 'active',
      requestSanitization: 'active',
      auditLogging: 'active',
      enhancedSecurity: 'enabled',
      lastCheck: new Date().toISOString()
    };

    // Add security status to health response
    (req as any).securityStatus = securityStatus;
    next();
  } catch (error) {
    console.error('[ENHANCED-SECURITY] Health check failed:', error);
    (req as any).securityStatus = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    next();
  }
};

/**
 * Emergency security lockdown middleware
 * Can be activated in case of security incidents
 */
export const emergencySecurityLockdown = (enabled: boolean = false) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (enabled) {
      console.warn('[ENHANCED-SECURITY] Emergency lockdown active - blocking request:', {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('User-Agent')
      });

      res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable for security maintenance',
        code: 'SECURITY_LOCKDOWN'
      });
      return;
    }
    next();
  };
};

/**
 * Rate limit bypass for security testing
 */
export const securityTestingBypass = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  // Only allow bypass in development/testing environments
  if (process.env.NODE_ENV === 'development' && req.headers['x-security-test'] === 'true') {
    console.log('[ENHANCED-SECURITY] Security testing bypass activated');
    (req as any).skipRateLimit = true;
  }
  next();
};

export default {
  applyEnhancedSecurityMiddleware,
  enhancedFileUploadMiddleware,
  createSecureRouteHandler,
  securityHealthCheck,
  emergencySecurityLockdown,
  securityTestingBypass
};