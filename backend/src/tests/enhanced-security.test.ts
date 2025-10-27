/**
 * ENHANCED SECURITY TEST SUITE - pdflab.pro
 *
 * Comprehensive testing for security hardening addressing BMAD Party-Mode findings:
 * - Network share path validation (\\network-share\malicious.exe) ✅
 * - JavaScript injection prevention (javascript:alert("xss")) ✅
 * - Enhanced Windows path traversal protection ✅
 * - All security attack vectors from BMAD testing ✅
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import {
  EnhancedPathValidator,
  EnhancedContentValidator,
  enhancedPathValidation,
  enhancedFileValidation,
  enhancedRequestSanitization
} from '../middleware/enhanced-security.middleware';
import { AuthenticatedRequest } from '../types/auth.types';

// Mock Express objects
const createMockRequest = (params: any = {}, query: any = {}, body: any = {}, file?: any): AuthenticatedRequest => ({
  params,
  query,
  body,
  file,
  user: { id: 1, email: 'test@example.com', plan: 'free' },
  ip: '127.0.0.1',
  get: (header: string) => header === 'User-Agent' ? 'test-agent' : undefined,
  method: 'POST',
  url: '/test'
} as any);

const createMockResponse = (): Response => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  };
  return res as any;
};

const createMockNext = (): NextFunction => jest.fn();

describe('Enhanced Security Test Suite', () => {

  describe('🛡️ EnhancedPathValidator', () => {

    describe('✅ Path Validation - BMAD Critical Tests', () => {

      test('P0-SEC-001: Should block network share paths (BMAD vulnerability)', () => {
        const maliciousPaths = [
          '\\\\network-share\\malicious.exe',
          '\\\\192.168.1.1\\shared\\virus.exe',
          '//network-share/malicious.exe',
          '\\\\evil.domain.com\\payload\\backdoor.exe'
        ];

        maliciousPaths.forEach(path => {
          const result = EnhancedPathValidator.validatePath(path);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain('forbidden pattern');
        });
      });

      test('P0-SEC-002: Should block JavaScript injection (BMAD vulnerability)', () => {
        const jsInjectionPaths = [
          'javascript:alert("xss")',
          'javascript:eval(maliciousCode)',
          'vbscript:execute(virus)',
          'data:text/html,<script>alert("xss")</script>'
        ];

        jsInjectionPaths.forEach(path => {
          const result = EnhancedPathValidator.validatePath(path);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain('forbidden pattern');
        });
      });

      test('P0-SEC-003: Should block path traversal attacks', () => {
        const traversalPaths = [
          '../../../etc/passwd',
          '..\\..\\..\\windows\\system32\\cmd.exe',
          '/../../etc/shadow',
          'C:\\..\\..\\Windows\\System32\\calc.exe'
        ];

        traversalPaths.forEach(path => {
          const result = EnhancedPathValidator.validatePath(path);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain('forbidden pattern');
        });
      });

      test('P0-SEC-004: Should block system paths', () => {
        const systemPaths = [
          'C:\\Windows\\System32\\cmd.exe',
          'C:\\Program Files\\malware.exe',
          '/etc/passwd',
          '/bin/bash',
          '/usr/bin/python',
          '/root/.ssh/id_rsa'
        ];

        systemPaths.forEach(path => {
          const result = EnhancedPathValidator.validatePath(path);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain('forbidden pattern');
        });
      });

      test('P0-SEC-005: Should block protocol injections', () => {
        const protocolPaths = [
          'file:///etc/passwd',
          'ftp://malicious.com/virus.exe',
          'http://evil.com/payload',
          'https://phishing.site/steal'
        ];

        protocolPaths.forEach(path => {
          const result = EnhancedPathValidator.validatePath(path);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain('forbidden pattern');
        });
      });

      test('P0-SEC-006: Should block null bytes and control characters', () => {
        const maliciousPaths = [
          'innocent.pdf\x00malicious.exe',
          'file\x01.pdf',
          'document\x7f.pdf'
        ];

        maliciousPaths.forEach(path => {
          const result = EnhancedPathValidator.validatePath(path);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain('forbidden pattern');
        });
      });

      test('P1-SEC-001: Should allow legitimate PDF paths', () => {
        const legitimatePaths = [
          'document.pdf',
          'reports/quarterly-report.pdf',
          'uploads/user123/presentation.pdf',
          'temp/converted-file-uuid.pdf'
        ];

        legitimatePaths.forEach(path => {
          const result = EnhancedPathValidator.validatePath(path);
          expect(result.valid).toBe(true);
          expect(result.sanitized).toBeDefined();
        });
      });

    });

    describe('📁 Filename Validation', () => {

      test('Should block reserved Windows names', () => {
        const reservedNames = [
          'CON.pdf',
          'PRN.pdf',
          'AUX.pdf',
          'NUL.pdf',
          'COM1.pdf',
          'LPT1.pdf'
        ];

        reservedNames.forEach(filename => {
          const result = EnhancedPathValidator.validateFilename(filename);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain('reserved system name');
        });
      });

      test('Should block hidden files', () => {
        const hiddenFiles = [
          '.htaccess',
          '.env',
          '.secret.pdf'
        ];

        hiddenFiles.forEach(filename => {
          const result = EnhancedPathValidator.validateFilename(filename);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain('Hidden files not allowed');
        });
      });

      test('Should block multiple extensions', () => {
        const multiExtFiles = [
          'document.pdf.exe',
          'image.jpg.bat',
          'file.pdf.js.pdf'
        ];

        multiExtFiles.forEach(filename => {
          const result = EnhancedPathValidator.validateFilename(filename);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain('Multiple file extensions');
        });
      });

    });

    describe('🧹 Path Sanitization', () => {

      test('Should sanitize paths correctly', () => {
        const testCases = [
          { input: 'document\\file.pdf', expected: 'document/file.pdf' },
          { input: '  spaced-file.pdf  ', expected: 'spaced-file.pdf' },
          { input: 'multiple///slashes.pdf', expected: 'multiple/slashes.pdf' },
          { input: 'control\x01char.pdf', expected: 'controlchar.pdf' }
        ];

        testCases.forEach(({ input, expected }) => {
          const sanitized = EnhancedPathValidator.sanitizePath(input);
          expect(sanitized).toBe(expected);
        });
      });

    });

  });

  describe('🔍 EnhancedContentValidator', () => {

    describe('📄 Content Scanning', () => {

      test('Should detect JavaScript in content', () => {
        const maliciousContent = Buffer.from(`
          %PDF-1.4
          /JavaScript (alert('xss'))
          eval(maliciousCode)
        `);

        const result = EnhancedContentValidator.scanContent(maliciousContent, 'test.pdf');
        expect(result.safe).toBe(false);
        expect(result.threats.length).toBeGreaterThan(0);
      });

      test('Should detect VBScript in content', () => {
        const maliciousContent = Buffer.from('vbscript:execute(payload)');

        const result = EnhancedContentValidator.scanContent(maliciousContent, 'test.pdf');
        expect(result.safe).toBe(false);
        expect(result.threats).toContain(expect.stringMatching(/vbscript/i));
      });

      test('Should detect embedded executables', () => {
        // MZ header (Windows PE)
        const executableContent = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00]);

        const result = EnhancedContentValidator.scanContent(executableContent, 'test.pdf');
        expect(result.safe).toBe(false);
        expect(result.threats).toContain('Embedded executable content detected');
      });

      test('Should allow clean PDF content', () => {
        const cleanContent = Buffer.from(`
          %PDF-1.4
          1 0 obj
          <<
          /Type /Catalog
          /Pages 2 0 R
          >>
          endobj
        `);

        const result = EnhancedContentValidator.scanContent(cleanContent, 'clean.pdf');
        expect(result.safe).toBe(true);
        expect(result.threats).toHaveLength(0);
      });

    });

    describe('📋 PDF Structure Validation', () => {

      test('Should detect JavaScript in PDF', () => {
        const jsContent = Buffer.from('/JavaScript (alert("malicious"))');
        const threats = EnhancedContentValidator.validatePDFStructure(jsContent);
        expect(threats).toContain('PDF contains JavaScript code');
      });

      test('Should detect auto-execution actions', () => {
        const actionContent = Buffer.from('/OpenAction << /Type /Action >>');
        const threats = EnhancedContentValidator.validatePDFStructure(actionContent);
        expect(threats).toContain('PDF contains auto-execution actions');
      });

      test('Should detect embedded files', () => {
        const embeddedContent = Buffer.from('/EmbeddedFile << /F (malicious.exe) >>');
        const threats = EnhancedContentValidator.validatePDFStructure(embeddedContent);
        expect(threats).toContain('PDF contains embedded files');
      });

    });

  });

  describe('🛡️ Security Middleware Integration', () => {

    describe('🔍 Path Validation Middleware', () => {

      test('Should reject requests with malicious path parameters', async () => {
        const req = createMockRequest(
          { file: '..\\..\\windows\\system32\\cmd.exe' },
          { path: 'javascript:alert("xss")' }
        );
        const res = createMockResponse();
        const next = createMockNext();

        enhancedPathValidation(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          success: false,
          code: 'INVALID_PATH_PARAMETER'
        }));
        expect(next).not.toHaveBeenCalled();
      });

      test('Should allow requests with safe path parameters', async () => {
        const req = createMockRequest(
          { file: 'document.pdf' },
          { path: 'uploads/safe-file.pdf' }
        );
        const res = createMockResponse();
        const next = createMockNext();

        enhancedPathValidation(req, res, next);

        expect(res.status).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
      });

    });

    describe('📁 File Validation Middleware', () => {

      test('Should reject files with malicious names', async () => {
        const req = createMockRequest({}, {}, {}, {
          originalname: 'CON.pdf',
          buffer: Buffer.from('%PDF-1.4'),
          size: 1000
        });
        const res = createMockResponse();
        const next = createMockNext();

        enhancedFileValidation(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          success: false,
          code: 'INVALID_FILENAME'
        }));
      });

      test('Should reject files with malicious content', async () => {
        const req = createMockRequest({}, {}, {}, {
          originalname: 'document.pdf',
          buffer: Buffer.from('javascript:alert("xss")'),
          size: 1000
        });
        const res = createMockResponse();
        const next = createMockNext();

        enhancedFileValidation(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          success: false,
          code: 'MALICIOUS_CONTENT_DETECTED'
        }));
      });

      test('Should accept clean PDF files', async () => {
        const req = createMockRequest({}, {}, {}, {
          originalname: 'clean-document.pdf',
          buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>'),
          size: 1000
        });
        const res = createMockResponse();
        const next = createMockNext();

        enhancedFileValidation(req, res, next);

        expect(res.status).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
      });

    });

    describe('🧹 Request Sanitization Middleware', () => {

      test('Should sanitize malicious input', async () => {
        const req = createMockRequest(
          { param: 'value\\with\\backslashes' },
          { query: '  spaced value  ' },
          { field: 'multiple///slashes' }
        );
        const res = createMockResponse();
        const next = createMockNext();

        enhancedRequestSanitization(req, res, next);

        expect(req.params.param).toBe('value/with/backslashes');
        expect(req.query.query).toBe('spaced value');
        expect(req.body.field).toBe('multiple/slashes');
        expect(next).toHaveBeenCalled();
      });

    });

  });

  describe('🚨 Attack Vector Testing (BMAD Scenarios)', () => {

    test('BMAD-P0-SEC-001: Network share attack blocked', () => {
      const attackPaths = [
        '\\\\evil.com\\malware\\virus.exe',
        '\\\\192.168.1.100\\shared\\backdoor.exe',
        '//network-drive/malicious/payload.exe'
      ];

      attackPaths.forEach(path => {
        const result = EnhancedPathValidator.validatePath(path);
        expect(result.valid).toBe(false);
        console.log(`✅ Blocked network share attack: ${path}`);
      });
    });

    test('BMAD-P0-SEC-002: JavaScript injection blocked', () => {
      const jsAttacks = [
        'javascript:alert("xss")',
        'javascript:eval(localStorage.getItem("malware"))',
        'javascript:document.location="http://evil.com"'
      ];

      jsAttacks.forEach(attack => {
        const result = EnhancedPathValidator.validatePath(attack);
        expect(result.valid).toBe(false);
        console.log(`✅ Blocked JavaScript injection: ${attack}`);
      });
    });

    test('BMAD-P0-SEC-003: All forbidden patterns blocked', () => {
      const allAttacks = [
        '../../../etc/passwd',
        'C:\\Windows\\System32\\cmd.exe',
        'javascript:alert("xss")',
        '\\\\network-share\\malicious.exe',
        'file:///etc/shadow',
        'vbscript:execute(payload)',
        'innocent.pdf\x00malicious.exe'
      ];

      allAttacks.forEach(attack => {
        const result = EnhancedPathValidator.validatePath(attack);
        expect(result.valid).toBe(false);
        console.log(`✅ Security hardening successful: ${attack} blocked`);
      });
    });

  });

  describe('📊 Performance & Edge Cases', () => {

    test('Should handle extremely long paths', () => {
      const longPath = 'a'.repeat(5000);
      const result = EnhancedPathValidator.validatePath(longPath);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Path too long');
    });

    test('Should handle null and undefined inputs', () => {
      const nullResult = EnhancedPathValidator.validatePath(null as any);
      const undefinedResult = EnhancedPathValidator.validatePath(undefined as any);

      expect(nullResult.valid).toBe(false);
      expect(undefinedResult.valid).toBe(false);
    });

    test('Should handle binary content safely', () => {
      const binaryContent = Buffer.alloc(1000, 0xFF);
      const result = EnhancedContentValidator.scanContent(binaryContent, 'test.pdf');
      expect(result).toBeDefined();
      expect(typeof result.safe).toBe('boolean');
    });

  });

});

// Helper function for manual testing
export const runSecurityValidationTests = (): void => {
  console.log('\n🛡️ ENHANCED SECURITY VALIDATION TESTS\n');

  const testCases = [
    { path: '\\\\network-share\\malicious.exe', expectBlocked: true },
    { path: 'javascript:alert("xss")', expectBlocked: true },
    { path: '../../../etc/passwd', expectBlocked: true },
    { path: 'C:\\Windows\\System32\\cmd.exe', expectBlocked: true },
    { path: 'legitimate-file.pdf', expectBlocked: false },
    { path: 'uploads/user/document.pdf', expectBlocked: false }
  ];

  testCases.forEach(({ path, expectBlocked }) => {
    const result = EnhancedPathValidator.validatePath(path);
    const status = result.valid ? '✅ ALLOWED' : '🚫 BLOCKED';
    const expected = expectBlocked ? '🚫 BLOCKED' : '✅ ALLOWED';
    const correct = (result.valid === !expectBlocked) ? '✓' : '✗';

    console.log(`${correct} ${status} (Expected: ${expected}) - ${path}`);
    if (!result.valid && result.reason) {
      console.log(`   Reason: ${result.reason}`);
    }
  });

  console.log('\n🎉 Security validation tests completed!\n');
};

export default { runSecurityValidationTests };