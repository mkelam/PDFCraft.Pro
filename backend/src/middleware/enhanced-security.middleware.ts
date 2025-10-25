/**
 * ENHANCED SECURITY MIDDLEWARE - PDFCraft.Pro
 *
 * Addresses critical vulnerabilities identified in BMAD Party-Mode testing:
 * - Network share path validation (\\network-share\malicious.exe)
 * - JavaScript injection prevention (javascript:alert("xss"))
 * - Enhanced Windows path traversal protection
 * - Comprehensive file sanitization
 *
 * Security Level: PRODUCTION GRADE
 */

import { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import { promises as fs } from 'fs';
import { AuthenticatedRequest } from '../types/auth.types';

// Enhanced security configuration
const ENHANCED_SECURITY_CONFIG = {
  // File system security
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: ['application/pdf'],
  allowedExtensions: ['.pdf'],

  // Path security patterns
  forbiddenPathPatterns: [
    // Path traversal (Unix & Windows)
    /\.\./g,
    /\.\.\\|\.\.\/|\.\.\\/g,

    // Network shares (Windows UNC paths)
    /^\\\\[^\\]*\\[^\\]*/g,
    /\\\\[\w\-\.]+\\/g,

    // Protocol injection
    /^javascript:/gi,
    /^vbscript:/gi,
    /^data:/gi,
    /^file:\/\//gi,
    /^ftp:\/\//gi,
    /^http:\/\//gi,
    /^https:\/\//gi,

    // System paths (Windows)
    /^[a-zA-Z]:\\windows\\/gi,
    /^[a-zA-Z]:\\system32\\/gi,
    /^[a-zA-Z]:\\program files/gi,
    /^[a-zA-Z]:\\users\\/gi,

    // System paths (Unix)
    /^\/etc\//gi,
    /^\/bin\//gi,
    /^\/sbin\//gi,
    /^\/usr\/bin\//gi,
    /^\/root\//gi,
    /^\/home\//gi,

    // Null bytes and control characters
    /\x00/g,
    /[\x01-\x1f]/g,
    /[\x7f-\x9f]/g,

    // Invalid filename characters
    /[<>:"|?*]/g,

    // Command injection patterns
    /[;&|`$(){}[\]]/g,

    // Script tags and dangerous content
    /<script/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,

    // SQL injection patterns in paths
    /['";\-\-]/g,
    /(union|select|insert|update|delete|drop)\s/gi,
  ],

  // Content security patterns
  maliciousContentPatterns: [
    // JavaScript execution
    /javascript\s*:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /function\s*\(/gi,

    // VBScript
    /vbscript\s*:/gi,

    // ActiveX and dangerous objects
    /activex/gi,
    /clsid:/gi,

    // Command execution
    /cmd\.exe/gi,
    /powershell/gi,
    /bash/gi,
    /sh\s/gi,

    // File system access
    /file\s*:/gi,
    /fopen/gi,
    /fwrite/gi,

    // Network access
    /xmlhttprequest/gi,
    /fetch\s*\(/gi,
  ],

  // Filename security
  maxFilenameLength: 255,
  reservedNames: [
    // Windows reserved names
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',

    // System files
    'passwd', 'shadow', 'hosts', 'fstab',
    'config.sys', 'autoexec.bat', 'boot.ini',
  ]
};

/**
 * ENHANCED PATH VALIDATION
 * Validates file paths against comprehensive security patterns
 */
export class EnhancedPathValidator {

  /**
   * Validate if a path is safe for file operations
   */
  static validatePath(inputPath: string): { valid: boolean; reason?: string; sanitized?: string } {
    if (!inputPath || typeof inputPath !== 'string') {
      return { valid: false, reason: 'Path is required and must be a string' };
    }

    // Length validation
    if (inputPath.length > 4096) {
      return { valid: false, reason: 'Path too long (maximum 4096 characters)' };
    }

    // Check against forbidden patterns
    for (const pattern of ENHANCED_SECURITY_CONFIG.forbiddenPathPatterns) {
      if (pattern.test(inputPath)) {
        return {
          valid: false,
          reason: `Path contains forbidden pattern: ${pattern.toString()}`
        };
      }
    }

    // Extract filename for additional validation
    const filename = path.basename(inputPath);
    const filenameValidation = this.validateFilename(filename);
    if (!filenameValidation.valid) {
      return filenameValidation;
    }

    // Normalize and sanitize path
    const sanitized = this.sanitizePath(inputPath);

    return { valid: true, sanitized };
  }

  /**
   * Validate filename for security issues
   */
  static validateFilename(filename: string): { valid: boolean; reason?: string } {
    if (!filename || filename.length === 0) {
      return { valid: false, reason: 'Filename cannot be empty' };
    }

    if (filename.length > ENHANCED_SECURITY_CONFIG.maxFilenameLength) {
      return { valid: false, reason: 'Filename too long' };
    }

    // Check reserved names
    const nameWithoutExt = path.parse(filename).name.toUpperCase();
    if (ENHANCED_SECURITY_CONFIG.reservedNames.includes(nameWithoutExt)) {
      return { valid: false, reason: 'Filename is a reserved system name' };
    }

    // Check for hidden files (starting with dot)
    if (filename.startsWith('.')) {
      return { valid: false, reason: 'Hidden files not allowed' };
    }

    // Check for multiple extensions (potential disguise attempt)
    const parts = filename.split('.');
    if (parts.length > 2) {
      return { valid: false, reason: 'Multiple file extensions not allowed' };
    }

    return { valid: true };
  }

  /**
   * Sanitize path by removing/escaping dangerous characters
   */
  static sanitizePath(inputPath: string): string {
    let sanitized = inputPath;

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x1f\x7f-\x9f]/g, '');

    // Replace backslashes with forward slashes for consistency
    sanitized = sanitized.replace(/\\/g, '/');

    // Remove multiple consecutive slashes
    sanitized = sanitized.replace(/\/+/g, '/');

    // Remove leading/trailing whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }

  /**
   * Check if path is attempting directory traversal
   */
  static isDirectoryTraversal(inputPath: string): boolean {
    const normalized = path.normalize(inputPath);
    return normalized.includes('..');
  }

  /**
   * Check if path is a network share (UNC path)
   */
  static isNetworkShare(inputPath: string): boolean {
    return /^\\\\[^\\]*\\/.test(inputPath) || /^\/\/[^\/]*\//.test(inputPath);
  }

  /**
   * Check if path contains protocol injection
   */
  static hasProtocolInjection(inputPath: string): boolean {
    const protocolPatterns = [
      /^javascript:/gi,
      /^vbscript:/gi,
      /^data:/gi,
      /^file:/gi,
      /^ftp:/gi,
      /^http:/gi,
      /^https:/gi
    ];

    return protocolPatterns.some(pattern => pattern.test(inputPath));
  }
}

/**
 * ENHANCED CONTENT VALIDATOR
 * Validates file content for malicious patterns
 */
export class EnhancedContentValidator {

  /**
   * Scan buffer content for malicious patterns
   */
  static scanContent(buffer: Buffer, filename: string): { safe: boolean; threats: string[] } {
    const threats: string[] = [];

    try {
      // Convert buffer to string for pattern matching
      const content = buffer.toString('ascii', 0, Math.min(buffer.length, 1024 * 1024)); // First 1MB

      // Check for malicious content patterns
      for (const pattern of ENHANCED_SECURITY_CONFIG.maliciousContentPatterns) {
        if (pattern.test(content)) {
          threats.push(`Malicious pattern detected: ${pattern.toString()}`);
        }
      }

      // Check for embedded files (potential polyglot attack)
      if (this.hasEmbeddedExecutables(buffer)) {
        threats.push('Embedded executable content detected');
      }

      // Check for suspicious PDF structures
      if (filename.toLowerCase().endsWith('.pdf')) {
        const pdfThreats = this.validatePDFStructure(buffer);
        threats.push(...pdfThreats);
      }

    } catch (error) {
      threats.push('Content scanning failed - potential obfuscation');
    }

    return {
      safe: threats.length === 0,
      threats
    };
  }

  /**
   * Check for embedded executables in file
   */
  static hasEmbeddedExecutables(buffer: Buffer): boolean {
    // Check for common executable signatures
    const executableSignatures = [
      Buffer.from([0x4D, 0x5A]), // MZ (Windows PE)
      Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF (Linux)
      Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), // Mach-O (macOS)
      Buffer.from([0xFE, 0xED, 0xFA, 0xCE]), // Mach-O (macOS)
    ];

    for (const signature of executableSignatures) {
      if (buffer.includes(signature)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate PDF structure for security issues
   */
  static validatePDFStructure(buffer: Buffer): string[] {
    const threats: string[] = [];

    try {
      const content = buffer.toString('ascii');

      // Check for JavaScript in PDF
      if (/\/JavaScript|\/JS/gi.test(content)) {
        threats.push('PDF contains JavaScript code');
      }

      // Check for suspicious actions
      if (/\/Action|\/OpenAction/gi.test(content)) {
        threats.push('PDF contains auto-execution actions');
      }

      // Check for form submission actions
      if (/\/SubmitForm|\/ImportData/gi.test(content)) {
        threats.push('PDF contains form submission actions');
      }

      // Check for external references
      if (/\/URI|\/Launch/gi.test(content)) {
        threats.push('PDF contains external references');
      }

      // Check for embedded files
      if (/\/EmbeddedFile|\/FileAttachment/gi.test(content)) {
        threats.push('PDF contains embedded files');
      }

    } catch (error) {
      threats.push('PDF structure validation failed');
    }

    return threats;
  }
}

/**
 * ENHANCED SECURITY MIDDLEWARE
 */

/**
 * Enhanced path validation middleware
 */
export const enhancedPathValidation = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Check all string parameters for path injection
    const paramsToCheck = [
      ...Object.values(req.params),
      ...Object.values(req.query),
      ...(req.body ? Object.values(req.body).filter(v => typeof v === 'string') : [])
    ] as string[];

    for (const param of paramsToCheck) {
      if (typeof param === 'string') {
        const validation = EnhancedPathValidator.validatePath(param);
        if (!validation.valid) {
          res.status(400).json({
            success: false,
            error: 'Invalid path parameter detected',
            code: 'INVALID_PATH_PARAMETER',
            details: validation.reason
          });
          return;
        }
      }
    }

    next();
  } catch (error) {
    console.error('[ENHANCED-SECURITY] Path validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Path validation failed',
      code: 'PATH_VALIDATION_ERROR'
    });
  }
};

/**
 * Enhanced file validation middleware
 */
export const enhancedFileValidation = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
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

    // Validate filename
    const filenameValidation = EnhancedPathValidator.validateFilename(file.originalname);
    if (!filenameValidation.valid) {
      res.status(400).json({
        success: false,
        error: 'Invalid filename',
        code: 'INVALID_FILENAME',
        details: filenameValidation.reason
      });
      return;
    }

    // Validate file content
    const contentValidation = EnhancedContentValidator.scanContent(file.buffer, file.originalname);
    if (!contentValidation.safe) {
      console.warn('[ENHANCED-SECURITY] Malicious content detected:', {
        filename: file.originalname,
        threats: contentValidation.threats,
        userId: req.user?.id
      });

      res.status(400).json({
        success: false,
        error: 'File contains potentially malicious content',
        code: 'MALICIOUS_CONTENT_DETECTED',
        threats: contentValidation.threats
      });
      return;
    }

    // Enhanced PDF signature validation
    if (file.originalname.toLowerCase().endsWith('.pdf')) {
      const pdfSignature = file.buffer.slice(0, 5);
      if (!pdfSignature.toString().startsWith('%PDF-')) {
        res.status(400).json({
          success: false,
          error: 'Invalid PDF file signature',
          code: 'INVALID_PDF_SIGNATURE'
        });
        return;
      }
    }

    next();
  } catch (error) {
    console.error('[ENHANCED-SECURITY] File validation error:', error);
    res.status(500).json({
      success: false,
      error: 'File validation failed',
      code: 'FILE_VALIDATION_ERROR'
    });
  }
};

/**
 * Enhanced request sanitization middleware
 */
export const enhancedRequestSanitization = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Sanitize all string inputs
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return EnhancedPathValidator.sanitizePath(obj);
      } else if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      } else if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    };

    // Sanitize request parameters
    if (req.params) req.params = sanitizeObject(req.params);
    if (req.query) req.query = sanitizeObject(req.query);
    if (req.body) req.body = sanitizeObject(req.body);

    next();
  } catch (error) {
    console.error('[ENHANCED-SECURITY] Request sanitization error:', error);
    res.status(500).json({
      success: false,
      error: 'Request sanitization failed',
      code: 'SANITIZATION_ERROR'
    });
  }
};

/**
 * Security audit middleware for enhanced monitoring
 */
export const enhancedSecurityAudit = (action: string, resource: string) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    // Log security-relevant request details
    const securityContext = {
      timestamp: new Date().toISOString(),
      action,
      resource,
      userId: req.user?.id || 'anonymous',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.url,
      hasFile: !!req.file,
      fileSize: req.file?.size,
      filename: req.file?.originalname
    };

    console.log('[ENHANCED-SECURITY-AUDIT] Request:', securityContext);

    // Override response to capture results
    const originalSend = res.send;
    res.send = function(data) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const success = res.statusCode < 400;

      console.log('[ENHANCED-SECURITY-AUDIT] Response:', {
        ...securityContext,
        success,
        statusCode: res.statusCode,
        duration,
        responseSize: typeof data === 'string' ? data.length : 0
      });

      // Alert on security failures
      if (!success && res.statusCode === 400) {
        console.error('[ENHANCED-SECURITY-ALERT] Security violation detected:', {
          ...securityContext,
          statusCode: res.statusCode,
          response: typeof data === 'string' ? JSON.parse(data) : data
        });
      }

      return originalSend.call(this, data);
    };

    next();
  };

/**
 * Complete enhanced security middleware stack
 */
export const createEnhancedSecurityStack = () => ({
  // Path validation (applied to all routes)
  pathValidation: enhancedPathValidation,

  // Request sanitization (applied before processing)
  requestSanitization: enhancedRequestSanitization,

  // File validation (applied to upload routes)
  fileValidation: enhancedFileValidation,

  // Security audit (applied to sensitive routes)
  securityAudit: enhancedSecurityAudit,

  // Utility validators
  validators: {
    path: EnhancedPathValidator,
    content: EnhancedContentValidator
  }
});

export default createEnhancedSecurityStack;