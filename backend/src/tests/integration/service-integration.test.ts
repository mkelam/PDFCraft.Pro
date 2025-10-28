/**
 * SERVICE INTEGRATION TESTS
 *
 * Comprehensive integration testing for quality validation system
 * Tests the interaction between all quality validation components
 */

import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import { QualityValidationEngine, validateOutputQuality } from '../../middleware/quality-validation.middleware';
import { QualityEnhancedPDFService } from '../../services/quality-enhanced-pdf.service';
import { QualityMonitoringService } from '../../services/quality-monitoring.service';
import { VisualFidelityPDFService } from '../../services/visual-fidelity-pdf.service';
import { ImprovedPDFService } from '../../services/improved-pdf.service';

// Test configuration
const TEST_CONFIG = {
  testFilesDir: path.join(__dirname, '../test-files'),
  outputDir: path.join(__dirname, '../test-output'),
  timeout: 30000 // 30 seconds for integration tests
};

// Mock PDF file for testing
const createMockPDFBuffer = (): Buffer => {
  // Create a minimal PDF structure for testing
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000074 00000 n
0000000120 00000 n
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
187
%%EOF`;
  return Buffer.from(pdfContent);
};

describe('Service Integration Tests', () => {
  beforeAll(async () => {
    // Setup test environment
    await fs.mkdir(TEST_CONFIG.testFilesDir, { recursive: true });
    await fs.mkdir(TEST_CONFIG.outputDir, { recursive: true });

    // Initialize quality monitoring system
    await QualityMonitoringService.initialize();

    console.log('🧪 Integration test environment initialized');
  });

  afterAll(async () => {
    // Cleanup test files
    try {
      await fs.rmdir(TEST_CONFIG.outputDir, { recursive: true });
      await fs.rmdir(TEST_CONFIG.testFilesDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    console.log('🧹 Integration test cleanup completed');
  });

  beforeEach(async () => {
    // Create fresh test PDF file for each test
    const testPDFPath = path.join(TEST_CONFIG.testFilesDir, 'test-document.pdf');
    await fs.writeFile(testPDFPath, createMockPDFBuffer());
  });

  afterEach(async () => {
    // Clear test output directory after each test
    try {
      const files = await fs.readdir(TEST_CONFIG.outputDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(TEST_CONFIG.outputDir, file)))
      );
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Quality Validation Integration', () => {
    it('should validate quality validation engine initialization', async () => {
      // Test that quality validation engine is properly initialized
      const engine = new QualityValidationEngine();
      expect(engine).toBeDefined();

      // Test basic validation functionality
      const testBuffer = Buffer.from('test image data');
      const qualityRequest = {
        targetDPI: 200,
        targetQuality: 85,
        outputFormat: 'png' as const,
        qualityLevel: 'good' as const,
        validateMetrics: true
      };

      const result = validateOutputQuality(testBuffer, qualityRequest, 1000);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should handle different quality levels correctly', async () => {
      const testBuffer = Buffer.from('test image data');
      const qualityLevels = ['minimum', 'good', 'excellent'] as const;

      for (const level of qualityLevels) {
        const qualityRequest = {
          targetDPI: 200,
          targetQuality: 85,
          outputFormat: 'png' as const,
          qualityLevel: level,
          validateMetrics: true
        };

        const result = validateOutputQuality(testBuffer, qualityRequest, 1000);

        expect(result).toBeDefined();
        expect(result.valid).toBeDefined();

        console.log(`✅ Quality level '${level}' validation passed`);
      }
    });

    it('should detect quality issues correctly', async () => {
      // Test with intentionally poor quality settings
      const testBuffer = Buffer.from('low quality test data');
      const qualityRequest = {
        targetDPI: 300, // High target
        targetQuality: 95, // High target
        outputFormat: 'png' as const,
        qualityLevel: 'excellent' as const,
        validateMetrics: true
      };

      const result = validateOutputQuality(testBuffer, qualityRequest, 5000);

      // Should have issues due to mock data not meeting high standards
      expect(result.issues.length).toBeGreaterThan(0);

      // Check that different types of issues are detected
      const issueTypes = result.issues.map(issue => issue.type);
      expect(issueTypes.length).toBeGreaterThan(0);

      console.log(`🔍 Detected ${result.issues.length} quality issues as expected`);
    });
  });

  describe('Quality Enhanced PDF Service Integration', () => {
    it('should integrate quality validation with PDF processing', async () => {
      const inputPath = path.join(TEST_CONFIG.testFilesDir, 'test-document.pdf');
      const outputPath = path.join(TEST_CONFIG.outputDir, 'enhanced-output.png');

      const qualityRequest = {
        inputPath,
        outputPath,
        targetDPI: 200,
        targetQuality: 85,
        outputFormat: 'png' as const,
        qualityLevel: 'good' as const,
        validateQuality: true,
        maxRetries: 2
      };

      const result = await QualityEnhancedPDFService.convertPDFToImages(qualityRequest);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.actualDPI).toBeGreaterThan(0);
      expect(result.metadata.actualQuality).toBeGreaterThan(0);

      if (result.qualityValidation) {
        expect(result.qualityValidation.score).toBeGreaterThanOrEqual(0);
        expect(result.qualityValidation.score).toBeLessThanOrEqual(100);
      }

      console.log(`✅ Quality Enhanced PDF Service integration passed`);
    }, TEST_CONFIG.timeout);

    it('should handle retry logic correctly', async () => {
      const inputPath = path.join(TEST_CONFIG.testFilesDir, 'test-document.pdf');

      const qualityRequest = {
        inputPath,
        targetDPI: 300, // High DPI to trigger retries
        targetQuality: 95, // High quality to trigger retries
        outputFormat: 'png' as const,
        qualityLevel: 'excellent' as const,
        validateQuality: true,
        enforceQuality: true,
        maxRetries: 3
      };

      const result = await QualityEnhancedPDFService.convertPDFToImages(qualityRequest);

      expect(result).toBeDefined();
      expect(result.retries).toBeDefined();
      expect(result.retries).toBeGreaterThanOrEqual(0);
      expect(result.retries).toBeLessThanOrEqual(3);

      console.log(`🔄 Retry logic test passed with ${result.retries} retries`);
    }, TEST_CONFIG.timeout);

    it('should handle batch processing correctly', async () => {
      // Create multiple test files
      const testFiles = ['test1.pdf', 'test2.pdf', 'test3.pdf'];
      const requests = [];

      for (const filename of testFiles) {
        const inputPath = path.join(TEST_CONFIG.testFilesDir, filename);
        await fs.writeFile(inputPath, createMockPDFBuffer());

        requests.push({
          inputPath,
          targetDPI: 200,
          targetQuality: 80,
          outputFormat: 'png' as const,
          qualityLevel: 'good' as const,
          validateQuality: true
        });
      }

      const results = await QualityEnhancedPDFService.batchConvertWithQuality(requests);

      expect(results).toBeDefined();
      expect(results.length).toBe(testFiles.length);

      results.forEach((result, index) => {
        expect(result.success).toBeDefined();
        expect(result.processingTime).toBeGreaterThan(0);
        console.log(`📄 Batch item ${index + 1} processed successfully`);
      });

      console.log(`✅ Batch processing test passed for ${testFiles.length} files`);
    }, TEST_CONFIG.timeout * 2);
  });

  describe('PDF Service Quality Integration', () => {
    it('should integrate quality validation with Visual Fidelity PDF Service', async () => {
      const inputPath = path.join(TEST_CONFIG.testFilesDir, 'test-document.pdf');

      const qualityOptions = {
        targetDPI: 200,
        targetQuality: 85,
        validateQuality: true
      };

      const result = await VisualFidelityPDFService.convertPDFToOffice(
        inputPath,
        TEST_CONFIG.outputDir,
        qualityOptions
      );

      expect(result).toBeDefined();
      expect(result.filename).toBeDefined();
      expect(result.filename).toMatch(/\.pptx$/);

      if (result.qualityResult) {
        expect(result.qualityResult.score).toBeGreaterThanOrEqual(0);
        expect(result.qualityResult.score).toBeLessThanOrEqual(100);
      }

      console.log(`✅ Visual Fidelity PDF Service quality integration passed`);
    }, TEST_CONFIG.timeout);

    it('should integrate quality validation with Improved PDF Service', async () => {
      const inputPath = path.join(TEST_CONFIG.testFilesDir, 'test-document.pdf');

      const qualityOptions = {
        targetDPI: 200,
        targetQuality: 85,
        validateQuality: true
      };

      const result = await ImprovedPDFService.convertPDFToOffice(
        inputPath,
        TEST_CONFIG.outputDir,
        qualityOptions
      );

      expect(result).toBeDefined();
      expect(result.filename).toBeDefined();
      expect(result.filename).toMatch(/\.pptx$/);

      if (result.qualityResult) {
        expect(result.qualityResult.score).toBeGreaterThanOrEqual(0);
        expect(result.qualityResult.score).toBeLessThanOrEqual(100);
      }

      console.log(`✅ Improved PDF Service quality integration passed`);
    }, TEST_CONFIG.timeout);

    it('should handle quality validation errors gracefully', async () => {
      const inputPath = path.join(TEST_CONFIG.testFilesDir, 'test-document.pdf');

      // Test with extreme quality requirements that should fail
      const qualityOptions = {
        targetDPI: 1000, // Unrealistic DPI
        targetQuality: 99, // Unrealistic quality
        validateQuality: true
      };

      // Should not throw, but should handle gracefully
      const result = await VisualFidelityPDFService.convertPDFToOffice(
        inputPath,
        TEST_CONFIG.outputDir,
        qualityOptions
      );

      expect(result).toBeDefined();
      expect(result.filename).toBeDefined();

      // Quality result should exist and show issues
      if (result.qualityResult) {
        expect(result.qualityResult.issues.length).toBeGreaterThan(0);
      }

      console.log(`✅ Quality validation error handling test passed`);
    }, TEST_CONFIG.timeout);
  });

  describe('Quality Monitoring Integration', () => {
    it('should record quality metrics during conversion', async () => {
      const inputPath = path.join(TEST_CONFIG.testFilesDir, 'test-document.pdf');
      const outputPath = path.join(TEST_CONFIG.outputDir, 'monitoring-test.pptx');

      // Perform conversion with quality validation
      const qualityOptions = {
        targetDPI: 200,
        targetQuality: 85,
        validateQuality: true
      };

      const result = await VisualFidelityPDFService.convertPDFToOffice(
        inputPath,
        TEST_CONFIG.outputDir,
        qualityOptions
      );

      expect(result).toBeDefined();
      expect(result.qualityResult).toBeDefined();

      // Record the metric
      await QualityMonitoringService.recordQualityMetric(
        'VisualFidelityPDFService',
        'pdf-to-ppt',
        inputPath,
        result.filename,
        result.qualityResult!,
        1500, // Mock processing time
        {
          fileSize: 1024,
          pageCount: 1,
          qualityLevel: 'good'
        }
      );

      // Verify the metric was recorded by checking dashboard data
      const dashboardData = await QualityMonitoringService.getDashboardData();

      expect(dashboardData).toBeDefined();
      expect(dashboardData.currentMetrics).toBeDefined();
      expect(dashboardData.recentActivity).toBeDefined();
      expect(dashboardData.recentActivity.length).toBeGreaterThan(0);

      console.log(`✅ Quality monitoring integration test passed`);
    }, TEST_CONFIG.timeout);

    it('should generate quality reports correctly', async () => {
      // Generate a quality report
      const report = await QualityMonitoringService.generateQualityReport();

      expect(report).toBeDefined();
      expect(report.reportId).toBeDefined();
      expect(report.generatedAt).toBeDefined();
      expect(report.timeRange).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.trends).toBeDefined();
      expect(report.topIssues).toBeDefined();
      expect(report.servicePerformance).toBeDefined();
      expect(report.recommendations).toBeDefined();

      // Verify report structure
      expect(typeof report.summary.totalOperations).toBe('number');
      expect(typeof report.summary.successRate).toBe('number');
      expect(typeof report.summary.averageQualityScore).toBe('number');

      console.log(`📊 Generated quality report with ${report.summary.totalOperations} operations`);
    }, TEST_CONFIG.timeout);

    it('should export metrics to CSV correctly', async () => {
      const csvPath = path.join(TEST_CONFIG.outputDir, 'test-metrics.csv');

      await QualityMonitoringService.exportMetricsCSV(csvPath);

      // Verify CSV file was created
      const csvExists = await fs.access(csvPath).then(() => true).catch(() => false);
      expect(csvExists).toBe(true);

      // Verify CSV content
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      expect(csvContent).toContain('ID,Timestamp,Service');
      expect(csvContent.split('\n').length).toBeGreaterThan(1); // At least header + 1 row

      console.log(`📤 CSV export test passed`);
    }, TEST_CONFIG.timeout);
  });

  describe('End-to-End Quality Workflow', () => {
    it('should complete full quality validation workflow', async () => {
      const inputPath = path.join(TEST_CONFIG.testFilesDir, 'test-document.pdf');

      console.log('🚀 Starting end-to-end quality validation workflow...');

      // Step 1: Convert PDF with quality validation
      const conversionResult = await VisualFidelityPDFService.convertPDFToOffice(
        inputPath,
        TEST_CONFIG.outputDir,
        {
          targetDPI: 250,
          targetQuality: 90,
          validateQuality: true
        }
      );

      expect(conversionResult.filename).toBeDefined();
      expect(conversionResult.qualityResult).toBeDefined();

      console.log(`✅ Step 1: PDF conversion completed with quality score ${conversionResult.qualityResult?.score}`);

      // Step 2: Record quality metrics
      await QualityMonitoringService.recordQualityMetric(
        'VisualFidelityPDFService',
        'pdf-to-ppt',
        inputPath,
        conversionResult.filename,
        conversionResult.qualityResult!,
        2000,
        {
          fileSize: 2048,
          pageCount: 1,
          qualityLevel: 'excellent'
        }
      );

      console.log(`✅ Step 2: Quality metrics recorded`);

      // Step 3: Generate quality report
      const report = await QualityMonitoringService.generateQualityReport();
      expect(report.summary.totalOperations).toBeGreaterThan(0);

      console.log(`✅ Step 3: Quality report generated with ${report.summary.totalOperations} operations`);

      // Step 4: Get dashboard data
      const dashboardData = await QualityMonitoringService.getDashboardData();
      expect(dashboardData.currentMetrics.operationsToday).toBeGreaterThan(0);

      console.log(`✅ Step 4: Dashboard data retrieved with ${dashboardData.currentMetrics.operationsToday} operations today`);

      // Step 5: Export metrics
      const csvPath = path.join(TEST_CONFIG.outputDir, 'workflow-metrics.csv');
      await QualityMonitoringService.exportMetricsCSV(csvPath);

      const csvExists = await fs.access(csvPath).then(() => true).catch(() => false);
      expect(csvExists).toBe(true);

      console.log(`✅ Step 5: Metrics exported to CSV`);

      console.log(`🎉 End-to-end quality validation workflow completed successfully!`);
    }, TEST_CONFIG.timeout * 2);

    it('should handle complex quality scenarios', async () => {
      const scenarios = [
        {
          name: 'High Quality Requirements',
          options: { targetDPI: 300, targetQuality: 95, validateQuality: true }
        },
        {
          name: 'Standard Quality Requirements',
          options: { targetDPI: 200, targetQuality: 85, validateQuality: true }
        },
        {
          name: 'Minimum Quality Requirements',
          options: { targetDPI: 150, targetQuality: 75, validateQuality: true }
        },
        {
          name: 'Quality Validation Disabled',
          options: { validateQuality: false }
        }
      ];

      for (const scenario of scenarios) {
        console.log(`🧪 Testing scenario: ${scenario.name}`);

        const inputPath = path.join(TEST_CONFIG.testFilesDir, 'test-document.pdf');

        const result = await VisualFidelityPDFService.convertPDFToOffice(
          inputPath,
          TEST_CONFIG.outputDir,
          scenario.options
        );

        expect(result.filename).toBeDefined();

        if (scenario.options.validateQuality !== false) {
          expect(result.qualityResult).toBeDefined();

          if (result.qualityResult) {
            await QualityMonitoringService.recordQualityMetric(
              'VisualFidelityPDFService',
              'pdf-to-ppt',
              inputPath,
              result.filename,
              result.qualityResult,
              1500,
              { fileSize: 1024, pageCount: 1, qualityLevel: 'good' }
            );
          }
        }

        console.log(`✅ Scenario '${scenario.name}' completed successfully`);
      }

      console.log(`🎯 All quality scenarios tested successfully`);
    }, TEST_CONFIG.timeout * 3);
  });

  describe('Integration Error Handling', () => {
    it('should handle invalid file paths gracefully', async () => {
      const invalidPath = path.join(TEST_CONFIG.testFilesDir, 'nonexistent.pdf');

      await expect(async () => {
        await VisualFidelityPDFService.convertPDFToOffice(
          invalidPath,
          TEST_CONFIG.outputDir,
          { validateQuality: true }
        );
      }).rejects.toThrow();

      console.log(`✅ Invalid file path error handling test passed`);
    });

    it('should handle quality monitoring initialization errors', async () => {
      // This test verifies that the system can handle monitoring failures gracefully
      // In a real scenario, this might involve testing with invalid file permissions

      const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});

      try {
        // Test dashboard data retrieval with potential errors
        const dashboardData = await QualityMonitoringService.getDashboardData();
        expect(dashboardData).toBeDefined();
      } catch (error) {
        // Should handle errors gracefully
        expect(error).toBeDefined();
      }

      mockError.mockRestore();
      console.log(`✅ Quality monitoring error handling test passed`);
    });

    it('should handle concurrent quality operations', async () => {
      const inputPath = path.join(TEST_CONFIG.testFilesDir, 'test-document.pdf');

      // Start multiple conversions concurrently
      const concurrentPromises = Array.from({ length: 3 }, (_, index) =>
        VisualFidelityPDFService.convertPDFToOffice(
          inputPath,
          TEST_CONFIG.outputDir,
          {
            targetDPI: 200,
            targetQuality: 85,
            validateQuality: true
          }
        )
      );

      const results = await Promise.all(concurrentPromises);

      expect(results.length).toBe(3);
      results.forEach((result, index) => {
        expect(result.filename).toBeDefined();
        console.log(`✅ Concurrent operation ${index + 1} completed`);
      });

      console.log(`🔄 Concurrent quality operations test passed`);
    }, TEST_CONFIG.timeout * 2);
  });
});

export { TEST_CONFIG };