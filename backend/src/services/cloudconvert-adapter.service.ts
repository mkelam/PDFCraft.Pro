/**
 * CLOUDCONVERT ADAPTER SERVICE
 *
 * Adapts CloudConvert service to work with the unified PDF conversion interface
 * Provides standardized ConversionResult format and integrates with service container
 */

import { CloudConvertPDFService, ConversionResult as CloudResult } from './cloudconvert-pdf.service';
import {
  PDFConversionService,
  ConversionResult,
  EnhancedConversionResult,
  ConversionOptions,
  ConversionMetadata,
  OfficeOutputFormat
} from '../types/pdf-conversion.types';
import { promises as fs } from 'fs';
import path from 'path';

export class CloudConvertAdapter implements PDFConversionService {
  private cloudConvertService: CloudConvertPDFService;
  private readonly serviceType = 'cloud-api';
  private readonly version = '1.0.0';

  constructor() {
    this.cloudConvertService = new CloudConvertPDFService({
      apiKey: process.env.CLOUDCONVERT_API_KEY!,
      sandboxMode: process.env.CLOUDCONVERT_SANDBOX === 'true'
    });
  }

  /**
   * Convert PDF to Office format (PPTX, DOCX, or XLSX)
   * This is the new standardized method name
   */
  async convertPDFToOffice(
    inputPath: string,
    outputDir: string,
    options?: ConversionOptions & { requestedOutputFormat?: OfficeOutputFormat }
  ): Promise<EnhancedConversionResult> {
    const startTime = Date.now();

    try {
      // Determine output format (default to pptx if not specified)
      const outputFormat: OfficeOutputFormat = options?.requestedOutputFormat || 'pptx';

      console.log(`🌐 [CLOUDCONVERT-ADAPTER] Starting cloud conversion to ${outputFormat}...`);

      // Validate input file
      await this.validateInput(inputPath);

      // Extract filename for CloudConvert
      const originalFilename = options?.originalFilename || path.basename(inputPath);

      // Call CloudConvert service with output format
      const cloudResult = await this.cloudConvertService.convertPDFToOffice(
        inputPath,
        outputDir,
        outputFormat,
        originalFilename
      );

      // ✅ CRITICAL: Validate output format matches request
      if (cloudResult.success && cloudResult.outputPath) {
        await this.validateOutputFormat(cloudResult.outputPath, outputFormat);
      }

      // Convert to standardized result format
      const result = await this.normalizeResult(
        cloudResult,
        inputPath,
        outputDir,
        Date.now() - startTime,
        options
      );

      console.log(`✅ [CLOUDCONVERT-ADAPTER] Conversion completed: ${result.filename}`);
      return result;

    } catch (error) {
      console.error('❌ [CLOUDCONVERT-ADAPTER] Conversion failed:', error);

      const errorResult: EnhancedConversionResult = {
        success: false,
        filename: '',
        engine: 'CloudConvert',
        confidence: 0,
        processingTime: Date.now() - startTime,
        metadata: await this.createErrorMetadata(inputPath, options)
      };

      return errorResult;
    }
  }

  /**
   * Validate input file before processing
   */
  private async validateInput(inputPath: string): Promise<void> {
    try {
      const stats = await fs.stat(inputPath);
      const maxSize = 100 * 1024 * 1024; // 100MB CloudConvert limit

      if (stats.size > maxSize) {
        throw new Error(`File size ${(stats.size / 1024 / 1024).toFixed(1)}MB exceeds CloudConvert limit of 100MB`);
      }

      const ext = path.extname(inputPath).toLowerCase();
      if (ext !== '.pdf') {
        throw new Error(`Invalid file type: ${ext}. Only PDF files supported.`);
      }

    } catch (error) {
      throw new Error(`Input validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate that output file matches requested format
   * CRITICAL: Ensures CloudConvert returned the correct format
   */
  private async validateOutputFormat(
    outputPath: string,
    expectedFormat: OfficeOutputFormat
  ): Promise<void> {
    try {
      // Extract actual file extension
      const ext = path.extname(outputPath).toLowerCase().replace('.', '');

      // Verify format matches
      if (ext !== expectedFormat) {
        throw new Error(
          `❌ FORMAT MISMATCH: Expected ${expectedFormat} but got ${ext}. ` +
          `File: ${path.basename(outputPath)}. This indicates CloudConvert returned wrong format.`
        );
      }

      // Verify file exists and has content
      const stats = await fs.stat(outputPath);
      if (stats.size === 0) {
        throw new Error(
          `❌ EMPTY FILE: Output file has zero bytes: ${path.basename(outputPath)}. ` +
          `CloudConvert may have failed silently.`
        );
      }

      // Verify minimum file size (Office files have minimum structure)
      const minSize = 1024; // 1KB minimum for valid Office file
      if (stats.size < minSize) {
        throw new Error(
          `❌ SUSPICIOUSLY SMALL: Output file is only ${stats.size} bytes: ${path.basename(outputPath)}. ` +
          `Valid ${expectedFormat.toUpperCase()} files are typically larger.`
        );
      }

      console.log(
        `✅ [CLOUDCONVERT-ADAPTER] Format validation PASSED: ` +
        `format=${expectedFormat}, size=${(stats.size / 1024).toFixed(1)}KB, ` +
        `file=${path.basename(outputPath)}`
      );

    } catch (error) {
      // Re-throw with enhanced error context
      if (error instanceof Error) {
        throw new Error(`Output format validation failed: ${error.message}`);
      }
      throw new Error(`Output format validation failed: Unknown error`);
    }
  }

  /**
   * Convert CloudConvert result to standardized format
   */
  private async normalizeResult(
    cloudResult: CloudResult,
    inputPath: string,
    outputDir: string,
    processingTime: number,
    options?: ConversionOptions & { originalFilename?: string; pageCount?: number; fileSize?: number }
  ): Promise<EnhancedConversionResult> {

    if (!cloudResult.success || !cloudResult.outputPath) {
      throw new Error(cloudResult.error || 'CloudConvert failed without error message');
    }

    const filename = path.basename(cloudResult.outputPath);
    const outputPath = path.join(outputDir, filename);

    // Get file statistics
    const [inputStats, outputStats] = await Promise.all([
      fs.stat(inputPath).catch(() => ({ size: 0 })),
      fs.stat(outputPath).catch(() => ({ size: 0 }))
    ]);

    // Create metadata
    const metadata: ConversionMetadata = {
      originalFilename: path.basename(inputPath),
      inputSize: inputStats.size,
      outputSize: outputStats.size,
      pageCount: options?.pageCount || 1,
      timestamp: new Date().toISOString(),
      engineVersion: `CloudConvert-${this.version}`
    };

    const result: EnhancedConversionResult = {
      success: true,
      filename,
      processingTime,
      engine: 'CloudConvert',
      confidence: 0.95,
      metadata,
      qualityMetrics: {
        textPreservation: 0.95,
        layoutPreservation: 0.90,
        visualPreservation: 0.90,
        semanticAccuracy: 0.85,
        overallScore: 0.92,
        confidence: 0.95
      }
    };

    return result;
  }

  /**
   * Create metadata for error cases
   */
  private async createErrorMetadata(
    inputPath: string,
    options?: ConversionOptions & { originalFilename?: string; pageCount?: number; fileSize?: number }
  ): Promise<ConversionMetadata> {
    const inputStats = await fs.stat(inputPath).catch(() => ({ size: 0 }));

    return {
      originalFilename: path.basename(inputPath),
      inputSize: inputStats.size,
      outputSize: 0,
      pageCount: options?.pageCount || 0,
      timestamp: new Date().toISOString(),
      engineVersion: `CloudConvert-${this.version}`
    };
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      // Check if API key is configured
      if (!process.env.CLOUDCONVERT_API_KEY) {
        return {
          status: 'unhealthy',
          details: { error: 'API key not configured' }
        };
      }

      // TODO: Implement actual CloudConvert API health check
      // For now, assume healthy if API key exists
      return {
        status: 'healthy',
        details: {
          apiKey: '***configured***',
          sandbox: process.env.CLOUDCONVERT_SANDBOX === 'true',
          version: this.version
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Get service capabilities
   */
  getCapabilities(): string[] {
    return [
      'pdf-to-ppt',
      'cloud-processing',
      'high-accuracy',
      'large-files',
      'scalable',
      'api-based'
    ];
  }

  /**
   * Check if service can handle specific conversion
   */
  canHandle(inputPath: string, options?: ConversionOptions & { fileSize?: number }): boolean {
    try {
      // Check file extension
      const ext = path.extname(inputPath).toLowerCase();
      if (ext !== '.pdf') return false;

      // Check if API key is configured
      if (!process.env.CLOUDCONVERT_API_KEY) return false;

      // Check file size constraint
      if (options?.fileSize && options.fileSize > 100 * 1024 * 1024) {
        return false; // CloudConvert 100MB limit
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Estimate processing time for given input
   */
  estimateProcessingTime(inputPath: string, options?: ConversionOptions & { fileSize?: number; pageCount?: number }): number {
    const fileSize = options?.fileSize || 0;
    const pageCount = options?.pageCount || 1;

    // CloudConvert typically processes faster than local services
    // Base time: 10 seconds + 2 seconds per page + file size factor
    const baseTime = 10000; // 10 seconds
    const pageTime = pageCount * 2000; // 2 seconds per page
    const sizeTime = Math.floor(fileSize / (1024 * 1024)) * 500; // 0.5 seconds per MB

    return baseTime + pageTime + sizeTime;
  }

  /**
   * Get cost estimate for conversion
   */
  getCostEstimate(inputPath: string, options?: ConversionOptions & { pageCount?: number }): {
    estimatedCost: number;
    currency: string;
    factors: string[];
  } {
    const pageCount = options?.pageCount || 1;

    // CloudConvert pricing model (approximate)
    const baseCost = 0.01; // $0.01 base cost
    const pageCost = pageCount * 0.005; // $0.005 per page

    return {
      estimatedCost: baseCost + pageCost,
      currency: 'USD',
      factors: [
        `Base cost: $${baseCost}`,
        `Pages (${pageCount}): $${pageCost.toFixed(3)}`,
        'API-based processing'
      ]
    };
  }

  /**
   * @deprecated Use convertPDFToOffice instead. This method is kept for backward compatibility.
   * Convert PDF to PowerPoint presentation
   */
  async convertPDFToPPT(
    inputPath: string,
    outputDir: string,
    options?: ConversionOptions
  ): Promise<EnhancedConversionResult> {
    console.warn('⚠️ [CLOUDCONVERT-ADAPTER] convertPDFToPPT is deprecated. Use convertPDFToOffice instead.');
    // Default to PPTX format for backward compatibility
    return this.convertPDFToOffice(inputPath, outputDir, { ...options, requestedOutputFormat: 'pptx' });
  }
}

export default CloudConvertAdapter;