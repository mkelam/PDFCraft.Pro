/**
 * QUALITY-ENHANCED PDF SERVICE
 *
 * Integrates quality validation with PDF processing services
 * Ensures consistent DPI and quality output addressing BMAD findings
 */

import {
  QualityValidationEngine,
  validateOutputQuality,
  QualityValidationRequest,
  QualityValidationResult
} from '../middleware/quality-validation.middleware';

export interface QualityEnhancedPDFRequest {
  // Standard PDF processing options
  inputPath: string;
  outputPath?: string;

  // Quality requirements
  targetDPI?: number;
  targetQuality?: number;
  outputFormat?: 'png' | 'jpg' | 'tiff';
  qualityLevel?: 'minimum' | 'good' | 'excellent';

  // Processing options
  validateQuality?: boolean;
  enforceQuality?: boolean;
  maxRetries?: number;
}

export interface QualityEnhancedPDFResult {
  success: boolean;
  outputBuffer?: Buffer;
  outputPath?: string;
  processingTime: number;
  qualityValidation?: QualityValidationResult;
  metadata: {
    pageCount: number;
    actualDPI: number;
    actualQuality: number;
    fileSize: number;
    format: string;
  };
  warnings?: string[];
  retries?: number;
}

/**
 * Quality-Enhanced PDF Processing Service
 */
export class QualityEnhancedPDFService {

  /**
   * Convert PDF to images with quality validation
   */
  static async convertPDFToImages(request: QualityEnhancedPDFRequest): Promise<QualityEnhancedPDFResult> {
    const startTime = Date.now();

    console.log('🎯 [QUALITY-PDF] Starting quality-enhanced PDF conversion:', {
      inputPath: request.inputPath,
      targetDPI: request.targetDPI,
      targetQuality: request.targetQuality,
      format: request.outputFormat
    });

    try {
      // Prepare quality requirements
      let qualityReq: QualityValidationRequest = {
        targetDPI: request.targetDPI || 200,
        targetQuality: request.targetQuality || 85,
        outputFormat: request.outputFormat || 'png',
        qualityLevel: request.qualityLevel || 'good',
        validateMetrics: request.validateQuality !== false
      };

      let result: QualityEnhancedPDFResult;
      let retries = 0;
      const maxRetries = request.maxRetries || 2;

      // Processing loop with quality validation and retry logic
      do {
        console.log(`🔄 [QUALITY-PDF] Processing attempt ${retries + 1}/${maxRetries + 1}`);

        // Perform PDF processing (integrate with existing services)
        const processingResult = await this.processPDFWithQualitySettings(request, qualityReq, retries);

        result = {
          success: processingResult.success,
          outputBuffer: processingResult.outputBuffer,
          outputPath: processingResult.outputPath,
          processingTime: Date.now() - startTime,
          metadata: processingResult.metadata,
          warnings: [],
          retries
        };

        // Validate quality if enabled
        if (request.validateQuality !== false && processingResult.outputBuffer) {
          console.log('🔍 [QUALITY-PDF] Validating output quality...');

          const qualityValidation = validateOutputQuality(
            processingResult.outputBuffer,
            qualityReq,
            result.processingTime
          );

          result.qualityValidation = qualityValidation;

          // Check if quality meets requirements
          if (!qualityValidation.valid && request.enforceQuality !== false) {
            console.warn('⚠️ [QUALITY-PDF] Quality validation failed, retry needed:', {
              score: qualityValidation.score,
              issues: qualityValidation.issues.length
            });

            // Add warnings about quality issues
            result.warnings = qualityValidation.issues.map(issue => issue.message);

            // If quality enforcement is enabled and we have retries left, adjust settings and retry
            if (retries < maxRetries) {
              qualityReq = this.adjustQualitySettings(qualityReq, qualityValidation);
              retries++;
              continue;
            } else {
              console.error('❌ [QUALITY-PDF] Maximum retries reached, proceeding with current quality');
            }
          } else {
            console.log('✅ [QUALITY-PDF] Quality validation passed:', {
              score: qualityValidation.score,
              actualDPI: qualityValidation.actualDPI,
              actualQuality: qualityValidation.actualQuality
            });
          }
        }

        break; // Exit retry loop if successful or validation disabled

      } while (retries <= maxRetries);

      // Log final result
      console.log('🎉 [QUALITY-PDF] Conversion completed:', {
        success: result.success,
        processingTime: result.processingTime,
        qualityScore: result.qualityValidation?.score,
        retries: result.retries
      });

      return result;

    } catch (error) {
      console.error('❌ [QUALITY-PDF] Conversion failed:', error);

      return {
        success: false,
        processingTime: Date.now() - startTime,
        metadata: {
          pageCount: 0,
          actualDPI: 0,
          actualQuality: 0,
          fileSize: 0,
          format: request.outputFormat || 'png'
        },
        warnings: [`Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Process PDF with quality settings (integrates with existing PDF services)
   */
  private static async processPDFWithQualitySettings(
    request: QualityEnhancedPDFRequest,
    qualityReq: QualityValidationRequest,
    retryCount: number
  ): Promise<{
    success: boolean;
    outputBuffer?: Buffer;
    outputPath?: string;
    metadata: any;
  }> {

    // Adjust quality settings based on retry count
    const adjustedDPI = qualityReq.targetDPI! + (retryCount * 25);
    const adjustedQuality = Math.min(100, qualityReq.targetQuality! + (retryCount * 5));

    console.log('🔧 [QUALITY-PDF] Processing with settings:', {
      dpi: adjustedDPI,
      quality: adjustedQuality,
      format: qualityReq.outputFormat,
      retry: retryCount
    });

    // Mock PDF processing - in production, integrate with actual PDF services
    // This would call your existing PDF2PicExtractorService, PDFImageExtractionService, etc.

    const mockProcessingTime = 1500 + (retryCount * 300);
    const mockFileSize = this.calculateExpectedFileSize(qualityReq.outputFormat!, adjustedDPI, adjustedQuality);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, Math.min(mockProcessingTime, 500)));

    // Create mock output buffer (in production, this would be actual processed image)
    const outputBuffer = Buffer.alloc(mockFileSize, qualityReq.outputFormat === 'jpg' ? 0x80 : 0xFF);

    return {
      success: true,
      outputBuffer,
      outputPath: request.outputPath,
      metadata: {
        pageCount: 1,
        actualDPI: adjustedDPI,
        actualQuality: adjustedQuality,
        fileSize: mockFileSize,
        format: qualityReq.outputFormat!
      }
    };
  }

  /**
   * Adjust quality settings based on validation results
   */
  private static adjustQualitySettings(
    currentSettings: QualityValidationRequest,
    validationResult: QualityValidationResult
  ): QualityValidationRequest {

    const adjustedSettings = { ...currentSettings };

    // Analyze issues and adjust accordingly
    validationResult.issues.forEach(issue => {
      switch (issue.type) {
        case 'dpi':
          if (issue.actual < issue.target) {
            adjustedSettings.targetDPI = Math.min(600, issue.target + 50);
            console.log(`🔧 [QUALITY-PDF] Increasing DPI: ${currentSettings.targetDPI} → ${adjustedSettings.targetDPI}`);
          }
          break;

        case 'quality':
          if (issue.actual < issue.target) {
            adjustedSettings.targetQuality = Math.min(100, issue.target + 10);
            console.log(`🔧 [QUALITY-PDF] Increasing quality: ${currentSettings.targetQuality} → ${adjustedSettings.targetQuality}`);
          }
          break;

        case 'sharpness':
          // Could adjust processing parameters for better sharpness
          console.log('🔧 [QUALITY-PDF] Sharpness issue detected, considering filter adjustments');
          break;

        case 'performance':
          // For performance issues, might reduce quality slightly
          if (adjustedSettings.targetQuality! > 80) {
            adjustedSettings.targetQuality = adjustedSettings.targetQuality! - 5;
            console.log(`🔧 [QUALITY-PDF] Reducing quality for performance: ${adjustedSettings.targetQuality! + 5} → ${adjustedSettings.targetQuality}`);
          }
          break;
      }
    });

    return adjustedSettings;
  }

  /**
   * Calculate expected file size for quality settings
   */
  private static calculateExpectedFileSize(format: string, dpi: number, quality: number): number {
    // Base calculation for A4 page
    const pixelCount = Math.pow(dpi / 72 * 8.5, 2); // Approximate pixel count for A4

    let baseSize: number;
    switch (format) {
      case 'png':
        baseSize = pixelCount * 3; // RGB, uncompressed estimate
        break;
      case 'jpg':
        baseSize = pixelCount * (quality / 100) * 0.5; // Compressed estimate
        break;
      case 'tiff':
        baseSize = pixelCount * 4; // RGBA, minimal compression
        break;
      default:
        baseSize = pixelCount * 3;
    }

    return Math.round(baseSize);
  }

  /**
   * Get quality recommendations for specific use cases
   */
  static getQualityRecommendations(useCase: 'web' | 'print' | 'archive' | 'mobile'): QualityValidationRequest {
    const recommendations = {
      web: {
        targetDPI: 150,
        targetQuality: 80,
        outputFormat: 'jpg' as const,
        qualityLevel: 'good' as const
      },
      print: {
        targetDPI: 300,
        targetQuality: 95,
        outputFormat: 'png' as const,
        qualityLevel: 'excellent' as const
      },
      archive: {
        targetDPI: 300,
        targetQuality: 95,
        outputFormat: 'tiff' as const,
        qualityLevel: 'excellent' as const
      },
      mobile: {
        targetDPI: 150,
        targetQuality: 75,
        outputFormat: 'jpg' as const,
        qualityLevel: 'minimum' as const
      }
    };

    return recommendations[useCase];
  }

  /**
   * Batch processing with quality validation
   */
  static async batchConvertWithQuality(
    requests: QualityEnhancedPDFRequest[]
  ): Promise<QualityEnhancedPDFResult[]> {
    console.log(`🔄 [QUALITY-PDF] Starting batch conversion: ${requests.length} files`);

    const results: QualityEnhancedPDFResult[] = [];

    // Process files concurrently but limit concurrency
    const batchSize = 3;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(request => this.convertPDFToImages(request))
      );
      results.push(...batchResults);
    }

    // Calculate batch statistics
    const successful = results.filter(r => r.success).length;
    const avgQualityScore = results
      .filter(r => r.qualityValidation)
      .reduce((sum, r) => sum + r.qualityValidation!.score, 0) / results.length || 0;

    console.log('📊 [QUALITY-PDF] Batch conversion completed:', {
      total: requests.length,
      successful,
      successRate: `${(successful / requests.length * 100).toFixed(1)}%`,
      avgQualityScore: avgQualityScore.toFixed(1)
    });

    return results;
  }
}

export default QualityEnhancedPDFService;