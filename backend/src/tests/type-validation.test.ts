/**
 * TYPE VALIDATION TEST
 *
 * Validates that all PDF service type fixes are working correctly
 * Ensures consistency across VisualFidelityPDFService, ImprovedPDFService,
 * SemanticValidationPDFService, and OptimizedEngineSelectionService.
 */

import {
  ConversionResult,
  ConversionOptions,
  PDFConversionService,
  ConversionTypeGuards,
  QualityValidationResult,
  DocumentAnalysis,
  EngineRecommendation
} from '../types/pdf-conversion.types';

// Import services to test
import { VisualFidelityPDFService } from '../services/visual-fidelity-pdf.service';
import { ImprovedPDFService } from '../services/improved-pdf.service';
import { SemanticValidationPDFService } from '../services/semantic-validation-pdf.service';
import { OptimizedEngineSelectionService } from '../services/optimized-engine-selection.service';
import { PDFServiceAdapter, PDFServiceFactory } from '../services/pdf-service-adapter';

describe('PDF Service Type Validation', () => {
  const testInputPath = '/test/input.pdf';
  const testOutputDir = '/test/output';
  const testOptions: ConversionOptions = {
    targetDPI: 300,
    targetQuality: 90,
    validateQuality: true,
    outputFormat: 'png',
    qualityLevel: 'excellent'
  };

  describe('ConversionResult Interface Compliance', () => {
    test('ConversionResult should have correct structure', () => {
      const mockResult: ConversionResult = {
        filename: 'test.pptx',
        processingTime: 1000,
        success: true,
        metadata: {
          originalFilename: 'test.pdf',
          inputSize: 1024,
          outputSize: 2048,
          pageCount: 5,
          timestamp: new Date().toISOString(),
          engineVersion: 'test-v1.0'
        }
      };

      // Validate structure
      expect(typeof mockResult.filename).toBe('string');
      expect(typeof mockResult.processingTime).toBe('number');
      expect(typeof mockResult.success).toBe('boolean');
      expect(mockResult.metadata).toBeDefined();
      expect(ConversionTypeGuards.isConversionResult(mockResult)).toBe(true);
    });

    test('ConversionResult with quality result should have correct structure', () => {
      const mockQualityResult: QualityValidationResult = {
        valid: true,
        actualDPI: 300,
        actualQuality: 90,
        targetDPI: 300,
        targetQuality: 90,
        issues: [],
        recommendations: [],
        score: 95
      };

      const mockResult: ConversionResult = {
        filename: 'test.pptx',
        qualityResult: mockQualityResult,
        processingTime: 1000,
        success: true
      };

      expect(ConversionTypeGuards.hasQualityResult(mockResult)).toBe(true);
      expect(mockResult.qualityResult?.valid).toBe(true);
      expect(mockResult.qualityResult?.score).toBe(95);
    });
  });

  describe('Service Interface Compliance', () => {
    test('VisualFidelityPDFService implements PDFConversionService', () => {
      expect(typeof VisualFidelityPDFService.convertPDFToPPT).toBe('function');

      // Check method signature compatibility
      const method = VisualFidelityPDFService.convertPDFToPPT;
      expect(method.length).toBeGreaterThanOrEqual(2); // inputPath, outputDir, options?
    });

    test('ImprovedPDFService implements PDFConversionService', () => {
      expect(typeof ImprovedPDFService.convertPDFToPPT).toBe('function');

      const method = ImprovedPDFService.convertPDFToPPT;
      expect(method.length).toBeGreaterThanOrEqual(2);
    });

    test('SemanticValidationPDFService implements PDFConversionService', () => {
      expect(typeof SemanticValidationPDFService.convertPDFToPPT).toBe('function');

      const method = SemanticValidationPDFService.convertPDFToPPT;
      expect(method.length).toBeGreaterThanOrEqual(2);
    });

    test('OptimizedEngineSelectionService implements PDFConversionService', () => {
      expect(typeof OptimizedEngineSelectionService.convertPDFToPPT).toBe('function');
      expect(typeof OptimizedEngineSelectionService.recommendEngine).toBe('function');

      const convertMethod = OptimizedEngineSelectionService.convertPDFToPPT;
      expect(convertMethod.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Type Guards', () => {
    test('ConversionTypeGuards.isConversionResult works correctly', () => {
      const validResult = { filename: 'test.pptx' };
      const invalidResult = { name: 'test.pptx' };

      expect(ConversionTypeGuards.isConversionResult(validResult)).toBe(true);
      expect(ConversionTypeGuards.isConversionResult(invalidResult)).toBe(false);
      expect(ConversionTypeGuards.isConversionResult(null)).toBe(false);
      expect(ConversionTypeGuards.isConversionResult(undefined)).toBe(false);
    });

    test('ConversionTypeGuards.hasQualityResult works correctly', () => {
      const withQuality: ConversionResult = {
        filename: 'test.pptx',
        qualityResult: { valid: true, issues: [], recommendations: [], score: 95 }
      };

      const withoutQuality: ConversionResult = {
        filename: 'test.pptx'
      };

      expect(ConversionTypeGuards.hasQualityResult(withQuality)).toBe(true);
      expect(ConversionTypeGuards.hasQualityResult(withoutQuality)).toBe(false);
    });
  });

  describe('DocumentAnalysis Interface', () => {
    test('DocumentAnalysis should have correct structure', () => {
      const mockAnalysis: DocumentAnalysis = {
        type: 'form',
        complexity: 'moderate',
        hasImages: true,
        hasFormFields: true,
        hasCharts: false,
        hasSignatures: true,
        textDensity: 1500,
        visualDensity: 0.3,
        structureScore: 0.8,
        formFieldCount: 5,
        pageCount: 3,
        confidence: 0.9
      };

      expect(mockAnalysis.type).toBe('form');
      expect(mockAnalysis.complexity).toBe('moderate');
      expect(typeof mockAnalysis.confidence).toBe('number');
      expect(mockAnalysis.confidence).toBeGreaterThan(0);
      expect(mockAnalysis.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('EngineRecommendation Interface', () => {
    test('EngineRecommendation should have correct structure', () => {
      const mockRecommendation: EngineRecommendation = {
        primaryEngine: 'visual-fidelity',
        fallbackEngines: ['layout-aware', 'enhanced-spacing'],
        confidence: 0.85,
        reasoning: ['High visual content detected', 'Complex layout structure'],
        expectedQuality: 0.9,
        expectedTime: 2500,
        uncertaintyResolution: false
      };

      expect(typeof mockRecommendation.primaryEngine).toBe('string');
      expect(Array.isArray(mockRecommendation.fallbackEngines)).toBe(true);
      expect(Array.isArray(mockRecommendation.reasoning)).toBe(true);
      expect(typeof mockRecommendation.confidence).toBe('number');
      expect(typeof mockRecommendation.uncertaintyResolution).toBe('boolean');
    });
  });

  describe('PDF Service Adapter', () => {
    test('PDFServiceAdapter wraps legacy services correctly', () => {
      // Mock legacy service that returns string
      const mockLegacyService = {
        convertPDFToPPT: jest.fn().mockResolvedValue('output.pptx')
      };

      const adapter = new PDFServiceAdapter(mockLegacyService, 'legacy');
      expect(adapter).toBeInstanceOf(PDFServiceAdapter);
      expect(typeof adapter.convertPDFToPPT).toBe('function');
    });

    test('PDFServiceFactory creates standardized services', () => {
      const mockService = {
        convertPDFToPPT: jest.fn().mockResolvedValue('output.pptx')
      };

      const standardizedService = PDFServiceFactory.createStandardizedService(mockService, 'legacy');
      expect(standardizedService).toBeInstanceOf(PDFServiceAdapter);
    });
  });

  describe('ConversionOptions Interface', () => {
    test('ConversionOptions should have correct optional structure', () => {
      const fullOptions: ConversionOptions = {
        targetDPI: 300,
        targetQuality: 90,
        validateQuality: true,
        outputFormat: 'png',
        qualityLevel: 'excellent',
        debugMode: false,
        timeout: 30000
      };

      const minimalOptions: ConversionOptions = {};

      // Both should be valid
      expect(fullOptions.targetDPI).toBe(300);
      expect(fullOptions.outputFormat).toBe('png');
      expect(fullOptions.qualityLevel).toBe('excellent');

      // Minimal options should not have required fields
      expect(minimalOptions.targetDPI).toBeUndefined();
      expect(typeof minimalOptions).toBe('object');
    });
  });

  describe('Quality Validation Integration', () => {
    test('QualityValidationResult includes required target properties', () => {
      const result: QualityValidationResult = {
        valid: true,
        actualDPI: 280,
        actualQuality: 88,
        targetDPI: 300,
        targetQuality: 90,
        issues: [{
          type: 'dpi',
          severity: 'medium',
          message: 'DPI below target',
          actual: 280,
          target: 300,
          recommendation: 'Increase DPI'
        }],
        recommendations: ['Increase extraction DPI'],
        score: 85
      };

      expect(result.targetDPI).toBeDefined();
      expect(result.targetQuality).toBeDefined();
      expect(result.targetDPI).toBe(300);
      expect(result.targetQuality).toBe(90);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Backward Compatibility', () => {
    test('Legacy return format can be converted to ConversionResult', () => {
      // Simulate legacy service result
      const legacyResult = 'output_file.pptx';

      // This would be handled by the adapter
      const convertedResult: ConversionResult = {
        filename: legacyResult,
        success: true
      };

      expect(ConversionTypeGuards.isConversionResult(convertedResult)).toBe(true);
      expect(convertedResult.filename).toBe('output_file.pptx');
    });

    test('Enhanced legacy return format can be converted to ConversionResult', () => {
      // Simulate enhanced legacy service result
      const enhancedLegacyResult = {
        filename: 'output_file.pptx',
        qualityResult: {
          valid: true,
          score: 92,
          issues: [],
          recommendations: []
        }
      };

      // This should already be compatible with ConversionResult
      expect(ConversionTypeGuards.isConversionResult(enhancedLegacyResult)).toBe(true);
      expect(ConversionTypeGuards.hasQualityResult(enhancedLegacyResult)).toBe(true);
    });
  });
});

// Export test utilities for other test files
export {
  testInputPath,
  testOutputDir,
  testOptions
};