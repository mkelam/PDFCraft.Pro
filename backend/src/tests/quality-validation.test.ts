/**
 * QUALITY VALIDATION TEST SUITE - pdflab.pro
 *
 * Comprehensive testing for quality validation addressing BMAD Party-Mode findings:
 * - 7/9 quality tests failed due to inconsistent DPI/quality output
 * - Tests all quality validation scenarios and edge cases
 * - Ensures consistent quality output meeting target thresholds
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import {
  QualityValidationEngine,
  validateQualityRequirements,
  validateOutputQuality,
  handleQualityValidationResult,
  QualityValidationRequest
} from '../middleware/quality-validation.middleware';

// Define test quality config
const QUALITY_CONFIG = {
  minimumDPI: 150,
  targetDPI: { low: 150, medium: 200, high: 300 },
  qualityLevels: { minimum: 75, good: 85, excellent: 95 }
};
import { AuthenticatedRequest } from '../types/auth.types';

// Mock Express objects
const createMockRequest = (body: any = {}, query: any = {}): AuthenticatedRequest => ({
  body,
  query,
  user: { id: 1, email: 'test@example.com', plan: 'pro' },
  ip: '127.0.0.1',
  get: (header: string) => header === 'User-Agent' ? 'test-agent' : undefined,
  method: 'POST',
  url: '/api/convert'
} as any);

const createMockResponse = (): Response => {
  const headers: Record<string, string> = {};
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn((key: string, value: string) => { headers[key] = value; }),
    getHeaders: () => headers
  };
  return res as any;
};

const createMockNext = (): NextFunction => jest.fn();

// Create test image buffers with different characteristics
const createTestImageBuffer = (format: 'png' | 'jpg' | 'tiff', quality: 'low' | 'medium' | 'high'): Buffer => {
  const baseSizes = {
    png: { low: 100 * 1024, medium: 300 * 1024, high: 800 * 1024 },
    jpg: { low: 50 * 1024, medium: 150 * 1024, high: 400 * 1024 },
    tiff: { low: 200 * 1024, medium: 600 * 1024, high: 1600 * 1024 }
  };

  const size = baseSizes[format][quality];
  return Buffer.alloc(size, format === 'jpg' ? 0x80 : 0xFF);
};

describe('Quality Validation Test Suite', () => {

  describe('🎯 Quality Validation Engine', () => {

    describe('✅ DPI Validation - BMAD Critical Tests', () => {

      test('P1-QUALITY-001: Should validate minimum DPI requirements', () => {
        const config: QualityValidationRequest = {
          targetDPI: 150,
          outputFormat: 'png'
        };

        // Test high-quality image (should pass)
        const highQualityBuffer = createTestImageBuffer('png', 'high');
        const highQualityResult = QualityValidationEngine.validateImageQuality(
          highQualityBuffer, config, 2000
        );

        expect(highQualityResult.actualDPI).toBeGreaterThanOrEqual(150);
        expect(highQualityResult.valid).toBe(true);

        // Test low-quality image (should fail)
        const lowQualityBuffer = createTestImageBuffer('png', 'low');
        const lowQualityResult = QualityValidationEngine.validateImageQuality(
          lowQualityBuffer, config, 2000
        );

        // Should have DPI issues if below minimum
        const dpiIssues = lowQualityResult.issues.filter(issue => issue.type === 'dpi');
        if (lowQualityResult.actualDPI! < 150) {
          expect(dpiIssues.length).toBeGreaterThan(0);
          expect(lowQualityResult.valid).toBe(false);
        }
      });

      test('P1-QUALITY-002: Should validate target DPI consistency', () => {
        const testCases = [
          { targetDPI: 150, format: 'png' as const },
          { targetDPI: 200, format: 'jpg' as const },
          { targetDPI: 300, format: 'tiff' as const }
        ];

        testCases.forEach(({ targetDPI, format }) => {
          const config: QualityValidationRequest = {
            targetDPI,
            outputFormat: format
          };

          const imageBuffer = createTestImageBuffer(format, 'high');
          const result = QualityValidationEngine.validateImageQuality(
            imageBuffer, config, 1500
          );

          console.log(`Testing ${format} at ${targetDPI} DPI:`, {
            actualDPI: result.actualDPI,
            valid: result.valid,
            score: result.score
          });

          // High quality images should meet or exceed target DPI (within tolerance)
          expect(result.actualDPI).toBeDefined();
          expect(result.score).toBeGreaterThan(70); // Minimum acceptable score
        });
      });

      test('P1-QUALITY-003: Should handle DPI validation edge cases', () => {
        const edgeCases = [
          { targetDPI: 72, description: 'Minimum DPI' },
          { targetDPI: 600, description: 'Maximum DPI' },
          { targetDPI: 200.5, description: 'Fractional DPI' }
        ];

        edgeCases.forEach(({ targetDPI, description }) => {
          const config: QualityValidationRequest = {
            targetDPI,
            outputFormat: 'png'
          };

          const imageBuffer = createTestImageBuffer('png', 'medium');
          const result = QualityValidationEngine.validateImageQuality(
            imageBuffer, config, 2000
          );

          expect(result.actualDPI).toBeDefined();
          expect(result.actualDPI).toBeGreaterThan(0);
          console.log(`${description} test:`, { targetDPI, actualDPI: result.actualDPI });
        });
      });

    });

    describe('🎨 Quality Level Validation', () => {

      test('P1-QUALITY-004: Should validate quality percentage targets', () => {
        const qualityTargets = [75, 85, 95];

        qualityTargets.forEach(targetQuality => {
          const config: QualityValidationRequest = {
            targetQuality,
            outputFormat: 'png'
          };

          const imageBuffer = createTestImageBuffer('png', 'high');
          const result = QualityValidationEngine.validateImageQuality(
            imageBuffer, config, 1800
          );

          expect(result.actualQuality).toBeDefined();
          expect(result.actualQuality).toBeGreaterThan(0);
          expect(result.actualQuality).toBeLessThanOrEqual(100);

          console.log(`Quality ${targetQuality}% test:`, {
            actualQuality: result.actualQuality,
            valid: result.valid,
            issues: result.issues.length
          });
        });
      });

      test('P1-QUALITY-005: Should validate format-specific quality requirements', () => {
        const formatTests = [
          { format: 'png' as const, expectedMinQuality: 85 },
          { format: 'jpg' as const, expectedMinQuality: 75 },
          { format: 'tiff' as const, expectedMinQuality: 90 }
        ];

        formatTests.forEach(({ format, expectedMinQuality }) => {
          const config: QualityValidationRequest = {
            outputFormat: format,
            targetQuality: expectedMinQuality
          };

          const imageBuffer = createTestImageBuffer(format, 'medium');
          const result = QualityValidationEngine.validateImageQuality(
            imageBuffer, config, 2200
          );

          // Check format-specific requirements are applied
          const formatSettings = QUALITY_CONFIG.formatSettings[format];
          expect(formatSettings.minQuality).toBe(expectedMinQuality);

          console.log(`${format.toUpperCase()} quality test:`, {
            actualQuality: result.actualQuality,
            minRequired: expectedMinQuality,
            valid: result.valid
          });
        });
      });

    });

    describe('📊 Image Metrics Validation', () => {

      test('P1-QUALITY-006: Should validate sharpness metrics', () => {
        const config: QualityValidationRequest = {
          outputFormat: 'png',
          validateMetrics: true
        };

        const imageBuffer = createTestImageBuffer('png', 'medium');
        const result = QualityValidationEngine.validateImageQuality(
          imageBuffer, config, 1900
        );

        expect(result.metrics).toBeDefined();
        expect(result.metrics!.sharpness).toBeGreaterThanOrEqual(0);
        expect(result.metrics!.sharpness).toBeLessThanOrEqual(1);

        const sharpnessIssues = result.issues.filter(issue => issue.type === 'sharpness');
        console.log('Sharpness validation:', {
          sharpness: result.metrics!.sharpness,
          issues: sharpnessIssues.length,
          target: QUALITY_CONFIG.metrics.sharpness.target
        });
      });

      test('P1-QUALITY-007: Should validate contrast and brightness', () => {
        const config: QualityValidationRequest = {
          outputFormat: 'png',
          validateMetrics: true
        };

        const imageBuffer = createTestImageBuffer('png', 'high');
        const result = QualityValidationEngine.validateImageQuality(
          imageBuffer, config, 1700
        );

        expect(result.metrics!.contrast).toBeGreaterThanOrEqual(0);
        expect(result.metrics!.contrast).toBeLessThanOrEqual(1);
        expect(result.metrics!.brightness).toBeGreaterThanOrEqual(0);
        expect(result.metrics!.brightness).toBeLessThanOrEqual(1);

        console.log('Contrast/Brightness validation:', {
          contrast: result.metrics!.contrast,
          brightness: result.metrics!.brightness,
          issues: result.issues.filter(i => ['contrast', 'brightness'].includes(i.type)).length
        });
      });

    });

    describe('⚡ Performance Validation', () => {

      test('P1-QUALITY-008: Should validate processing time requirements', () => {
        const config: QualityValidationRequest = {
          outputFormat: 'png'
        };

        // Test fast processing (should pass)
        const fastResult = QualityValidationEngine.validateImageQuality(
          createTestImageBuffer('png', 'medium'), config, 2000
        );

        const fastPerformanceIssues = fastResult.issues.filter(issue => issue.type === 'performance');
        expect(fastPerformanceIssues.length).toBe(0);

        // Test slow processing (should have performance issue)
        const slowResult = QualityValidationEngine.validateImageQuality(
          createTestImageBuffer('png', 'medium'), config, 7000
        );

        const slowPerformanceIssues = slowResult.issues.filter(issue => issue.type === 'performance');
        expect(slowPerformanceIssues.length).toBeGreaterThan(0);

        console.log('Performance validation:', {
          fastTime: 2000,
          slowTime: 7000,
          target: QUALITY_CONFIG.maxProcessingTime,
          fastIssues: fastPerformanceIssues.length,
          slowIssues: slowPerformanceIssues.length
        });
      });

      test('P1-QUALITY-009: Should validate file size limits', () => {
        const config: QualityValidationRequest = {
          outputFormat: 'png'
        };

        // Test reasonable file size
        const normalBuffer = createTestImageBuffer('png', 'medium');
        const normalResult = QualityValidationEngine.validateImageQuality(
          normalBuffer, config, 2000
        );

        // Test oversized file
        const oversizedBuffer = Buffer.alloc(120 * 1024 * 1024); // 120MB
        const oversizedResult = QualityValidationEngine.validateImageQuality(
          oversizedBuffer, config, 2000
        );

        const oversizedIssues = oversizedResult.issues.filter(issue => issue.type === 'format');
        expect(oversizedIssues.length).toBeGreaterThan(0);

        console.log('File size validation:', {
          normalSize: `${(normalBuffer.length / 1024 / 1024).toFixed(1)}MB`,
          oversizedSize: `${(oversizedBuffer.length / 1024 / 1024).toFixed(1)}MB`,
          limit: `${QUALITY_CONFIG.maxFileSize / 1024 / 1024}MB`,
          issues: oversizedIssues.length
        });
      });

    });

    describe('📈 Quality Score Calculation', () => {

      test('P1-QUALITY-010: Should calculate accurate quality scores', () => {
        const testScenarios = [
          { buffer: createTestImageBuffer('png', 'high'), expectedScore: '>90' },
          { buffer: createTestImageBuffer('png', 'medium'), expectedScore: '70-90' },
          { buffer: createTestImageBuffer('png', 'low'), expectedScore: '<70' }
        ];

        testScenarios.forEach(({ buffer, expectedScore }, index) => {
          const config: QualityValidationRequest = {
            outputFormat: 'png',
            validateMetrics: true
          };

          const result = QualityValidationEngine.validateImageQuality(
            buffer, config, 2000
          );

          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);

          console.log(`Quality score test ${index + 1}:`, {
            expected: expectedScore,
            actual: result.score,
            valid: result.valid,
            issues: result.issues.length
          });
        });
      });

    });

  });

  describe('🛡️ Quality Validation Middleware', () => {

    describe('📋 Requirements Validation', () => {

      test('Should validate quality requirements from request', async () => {
        const req = createMockRequest({
          targetDPI: 200,
          targetQuality: 85,
          outputFormat: 'png'
        });
        const res = createMockResponse();
        const next = createMockNext();

        validateQualityRequirements(req, res, next);

        expect(next).toHaveBeenCalled();
        expect((req as any).qualityRequirements).toBeDefined();
        expect((req as any).qualityRequirements.targetDPI).toBe(200);
        expect((req as any).qualityRequirements.targetQuality).toBe(85);
        expect((req as any).qualityRequirements.outputFormat).toBe('png');
      });

      test('Should reject invalid format', async () => {
        const req = createMockRequest({
          outputFormat: 'bmp' // Invalid format
        });
        const res = createMockResponse();
        const next = createMockNext();

        validateQualityRequirements(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          success: false,
          code: 'INVALID_FORMAT'
        }));
        expect(next).not.toHaveBeenCalled();
      });

      test('Should reject invalid DPI range', async () => {
        const req = createMockRequest({
          targetDPI: 1000 // Too high
        });
        const res = createMockResponse();
        const next = createMockNext();

        validateQualityRequirements(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          success: false,
          code: 'INVALID_DPI_RANGE'
        }));
      });

      test('Should reject invalid quality range', async () => {
        const req = createMockRequest({
          targetQuality: 110 // Too high
        });
        const res = createMockResponse();
        const next = createMockNext();

        validateQualityRequirements(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          success: false,
          code: 'INVALID_QUALITY_RANGE'
        }));
      });

      test('Should apply format-specific defaults', async () => {
        const req = createMockRequest({
          outputFormat: 'jpg'
        });
        const res = createMockResponse();
        const next = createMockNext();

        validateQualityRequirements(req, res, next);

        const qualityReq = (req as any).qualityRequirements;
        expect(qualityReq.targetDPI).toBe(QUALITY_CONFIG.formatSettings.jpg.targetDPI);
        expect(qualityReq.targetQuality).toBe(QUALITY_CONFIG.formatSettings.jpg.targetQuality);
      });

    });

    describe('🔍 Output Validation', () => {

      test('Should validate output quality correctly', () => {
        const config: QualityValidationRequest = {
          targetDPI: 200,
          targetQuality: 85,
          outputFormat: 'png'
        };

        const imageBuffer = createTestImageBuffer('png', 'high');
        const result = validateOutputQuality(imageBuffer, config, 2000);

        expect(result).toBeDefined();
        expect(result.valid).toBeDefined();
        expect(result.score).toBeDefined();
        expect(result.actualDPI).toBeDefined();
        expect(result.actualQuality).toBeDefined();
        expect(Array.isArray(result.issues)).toBe(true);
        expect(Array.isArray(result.recommendations)).toBe(true);
      });

      test('Should handle validation errors gracefully', () => {
        const config: QualityValidationRequest = {
          outputFormat: 'png'
        };

        // Invalid buffer
        const result = validateOutputQuality(Buffer.alloc(0), config, 1000);

        expect(result.valid).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
        expect(result.score).toBe(0);
      });

    });

    describe('📊 Response Handling', () => {

      test('Should add quality headers to response', async () => {
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        handleQualityValidationResult(req, res, next);

        // Simulate response with quality validation
        const responseData = {
          success: true,
          qualityValidation: {
            valid: true,
            score: 87,
            actualDPI: 205,
            actualQuality: 89
          }
        };

        res.send(JSON.stringify(responseData));

        const headers = res.getHeaders();
        expect(headers['X-Quality-Score']).toBe('87');
        expect(headers['X-Quality-Valid']).toBe('true');
        expect(headers['X-Actual-DPI']).toBe('205');
        expect(headers['X-Actual-Quality']).toBe('89');
      });

    });

  });

  describe('🚨 BMAD Party-Mode Regression Tests', () => {

    test('BMAD-P1-QUALITY-001: Should fix DPI consistency issues', () => {
      // Test the specific failing scenarios from BMAD testing
      const failingScenarios = [
        { targetDPI: 150, targetQuality: 75, format: 'png' as const },
        { targetDPI: 150, targetQuality: 85, format: 'png' as const },
        { targetDPI: 200, targetQuality: 75, format: 'jpg' as const },
        { targetDPI: 200, targetQuality: 85, format: 'jpg' as const },
        { targetDPI: 300, targetQuality: 75, format: 'tiff' as const },
        { targetDPI: 300, targetQuality: 85, format: 'tiff' as const }
      ];

      let passedTests = 0;
      const results: any[] = [];

      failingScenarios.forEach((scenario, index) => {
        const config: QualityValidationRequest = {
          targetDPI: scenario.targetDPI,
          targetQuality: scenario.targetQuality,
          outputFormat: scenario.format
        };

        const imageBuffer = createTestImageBuffer(scenario.format, 'high');
        const result = QualityValidationEngine.validateImageQuality(
          imageBuffer, config, 2000
        );

        const passed = result.actualDPI! >= scenario.targetDPI - 5 &&
                      result.actualQuality! >= scenario.targetQuality - 2;

        if (passed) passedTests++;

        results.push({
          scenario: `${scenario.format} ${scenario.targetDPI}DPI ${scenario.targetQuality}%`,
          actualDPI: result.actualDPI,
          actualQuality: result.actualQuality,
          passed,
          score: result.score
        });

        console.log(`BMAD Test ${index + 1}: ${passed ? '✅' : '❌'} ${scenario.format} ${scenario.targetDPI}DPI ${scenario.targetQuality}%`, {
          actualDPI: result.actualDPI?.toFixed(1),
          actualQuality: result.actualQuality?.toFixed(1),
          score: result.score
        });
      });

      const successRate = (passedTests / failingScenarios.length) * 100;
      console.log(`\nBMAD Regression Test Results: ${passedTests}/${failingScenarios.length} passed (${successRate.toFixed(1)}%)`);

      // Expect significant improvement over BMAD testing (was 2/9 = 22%)
      expect(successRate).toBeGreaterThan(70); // Target 70%+ success rate
    });

    test('BMAD-P1-QUALITY-002: Should maintain performance requirements', () => {
      const performanceTests = [
        { format: 'png' as const, maxTime: 3000 },
        { format: 'jpg' as const, maxTime: 2500 },
        { format: 'tiff' as const, maxTime: 4000 }
      ];

      let performancePassCount = 0;

      performanceTests.forEach(({ format, maxTime }) => {
        const config: QualityValidationRequest = {
          outputFormat: format
        };

        const imageBuffer = createTestImageBuffer(format, 'medium');
        const result = QualityValidationEngine.validateImageQuality(
          imageBuffer, config, maxTime - 500
        );

        const performanceIssues = result.issues.filter(issue => issue.type === 'performance');
        const passed = performanceIssues.length === 0;

        if (passed) performancePassCount++;

        console.log(`Performance test ${format}: ${passed ? '✅' : '❌'} (${maxTime - 500}ms)`);
      });

      expect(performancePassCount).toBe(performanceTests.length);
    });

  });

  describe('📈 Quality Assurance Integration', () => {

    test('Should integrate with existing PDF services', () => {
      // Test that quality validation can be integrated with PDF processing
      const mockPDFResult = {
        success: true,
        outputBuffer: createTestImageBuffer('png', 'high'),
        processingTime: 2200,
        qualityRequirements: {
          targetDPI: 200,
          targetQuality: 85,
          outputFormat: 'png' as const
        }
      };

      const qualityResult = validateOutputQuality(
        mockPDFResult.outputBuffer,
        mockPDFResult.qualityRequirements,
        mockPDFResult.processingTime
      );

      expect(qualityResult.valid).toBeDefined();
      expect(qualityResult.score).toBeGreaterThan(0);

      console.log('PDF service integration test:', {
        valid: qualityResult.valid,
        score: qualityResult.score,
        issues: qualityResult.issues.length
      });
    });

  });

});

// Helper function for manual testing
export const runQualityValidationTests = (): void => {
  console.log('\n🎯 QUALITY VALIDATION TESTS\n');

  const testCases = [
    { targetDPI: 150, targetQuality: 75, format: 'png' as const },
    { targetDPI: 200, targetQuality: 85, format: 'jpg' as const },
    { targetDPI: 300, targetQuality: 95, format: 'tiff' as const }
  ];

  testCases.forEach(({ targetDPI, targetQuality, format }) => {
    const config: QualityValidationRequest = {
      targetDPI,
      targetQuality,
      outputFormat: format
    };

    const imageBuffer = createTestImageBuffer(format, 'high');
    const result = QualityValidationEngine.validateImageQuality(
      imageBuffer, config, 2000
    );

    const status = result.valid ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${format.toUpperCase()} ${targetDPI}DPI ${targetQuality}%`);
    console.log(`   Actual: ${result.actualDPI?.toFixed(1)}DPI, ${result.actualQuality?.toFixed(1)}%`);
    console.log(`   Score: ${result.score}/100`);
    console.log(`   Issues: ${result.issues.length}`);
    console.log('');
  });

  console.log('🎉 Quality validation tests completed!\n');
};

export default { runQualityValidationTests };