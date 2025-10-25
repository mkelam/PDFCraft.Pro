import { promises as fs } from 'fs';
import sharp from 'sharp';
import path from 'path';
import { ExtractedImage } from './pdf-image-extraction.service';
import { TransparentImage } from './transparency-handler.service';
import { ColorConversionResult } from './color-space-converter.service';
import { ProcessedImage } from './advanced-image-processor.service';

export interface QualityMetrics {
  overallScore: number;
  imagePreservation: number;
  colorAccuracy: number;
  transparencyHandling: number;
  compressionEfficiency: number;
  coordinateAccuracy: number;
  processingSpeed: number;
  detailedScores: {
    [metric: string]: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  passedChecks: string[];
  failedChecks: string[];
  warnings: string[];
  recommendations: string[];
  metrics: QualityMetrics;
}

export interface ConversionReport {
  totalImages: number;
  successfulExtractions: number;
  failedExtractions: number;
  transparentImages: number;
  colorConversions: number;
  averageQualityScore: number;
  totalProcessingTime: number;
  outputFileSize: number;
  compressionRatio: number;
  issues: string[];
  recommendations: string[];
}

export interface PerformanceBenchmark {
  extractionSpeed: number; // images per second
  processingSpeed: number; // MB per second
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  qualityScore: number;
  timestamp: Date;
}

/**
 * QUALITY METRICS & VALIDATION SERVICE
 *
 * Phase 2 Enhancement - Comprehensive quality assessment and validation
 *
 * Capabilities:
 * - Multi-dimensional quality scoring
 * - Image fidelity assessment
 * - Performance benchmarking
 * - Regression testing support
 * - Automated quality gates
 * - Detailed reporting
 */
export class QualityMetricsValidatorService {

  // Quality thresholds for different grades
  private static readonly QUALITY_THRESHOLDS = {
    A: 90, // Excellent
    B: 80, // Good
    C: 70, // Acceptable
    D: 60, // Poor
    F: 0   // Failed
  };

  // Critical checks that must pass
  private static readonly CRITICAL_CHECKS = [
    'images_extracted',
    'coordinates_preserved',
    'no_corruption',
    'valid_format'
  ];

  /**
   * Comprehensive quality validation of conversion process
   */
  static async validateConversionQuality(
    originalPdfPath: string,
    extractedImages: ExtractedImage[],
    processedImages: ProcessedImage[],
    outputPptxPath: string
  ): Promise<ValidationResult> {
    console.log(`📊 [QUALITY-VALIDATION] Starting comprehensive quality assessment...`);

    try {
      const metrics = await this.calculateQualityMetrics(
        originalPdfPath,
        extractedImages,
        processedImages,
        outputPptxPath
      );

      const checks = await this.performQualityChecks(
        extractedImages,
        processedImages,
        outputPptxPath
      );

      const grade = this.calculateQualityGrade(metrics.overallScore);
      const recommendations = this.generateRecommendations(metrics, checks);

      console.log(`📊 [QUALITY-VALIDATION] Overall Score: ${metrics.overallScore} (Grade: ${grade})`);

      return {
        isValid: checks.passedChecks.length >= this.CRITICAL_CHECKS.length,
        qualityGrade: grade,
        passedChecks: checks.passedChecks,
        failedChecks: checks.failedChecks,
        warnings: checks.warnings,
        recommendations: recommendations,
        metrics: metrics
      };

    } catch (error) {
      console.error(`❌ [QUALITY-VALIDATION] Validation failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive quality metrics
   */
  private static async calculateQualityMetrics(
    originalPdfPath: string,
    extractedImages: ExtractedImage[],
    processedImages: ProcessedImage[],
    outputPptxPath: string
  ): Promise<QualityMetrics> {
    console.log(`📊 [METRICS] Calculating quality metrics...`);

    try {
      // Image preservation score
      const imagePreservation = this.calculateImagePreservationScore(extractedImages, processedImages);

      // Color accuracy score
      const colorAccuracy = this.calculateColorAccuracyScore(processedImages);

      // Transparency handling score
      const transparencyHandling = this.calculateTransparencyScore(extractedImages, processedImages);

      // Compression efficiency score
      const compressionEfficiency = this.calculateCompressionScore(processedImages);

      // Coordinate accuracy score
      const coordinateAccuracy = this.calculateCoordinateAccuracyScore(extractedImages);

      // Processing speed score
      const processingSpeed = this.calculateProcessingSpeedScore(processedImages);

      // Calculate overall score
      const weights = {
        imagePreservation: 0.25,
        colorAccuracy: 0.20,
        transparencyHandling: 0.15,
        compressionEfficiency: 0.15,
        coordinateAccuracy: 0.15,
        processingSpeed: 0.10
      };

      const overallScore = Math.round(
        imagePreservation * weights.imagePreservation +
        colorAccuracy * weights.colorAccuracy +
        transparencyHandling * weights.transparencyHandling +
        compressionEfficiency * weights.compressionEfficiency +
        coordinateAccuracy * weights.coordinateAccuracy +
        processingSpeed * weights.processingSpeed
      );

      return {
        overallScore,
        imagePreservation,
        colorAccuracy,
        transparencyHandling,
        compressionEfficiency,
        coordinateAccuracy,
        processingSpeed,
        detailedScores: {
          'Image Extraction Success Rate': this.calculateExtractionSuccessRate(extractedImages),
          'Average Image Quality': this.calculateAverageImageQuality(processedImages),
          'Transparency Preservation': this.calculateTransparencyPreservation(extractedImages, processedImages),
          'Color Space Conversion Accuracy': this.calculateColorConversionAccuracy(processedImages),
          'Compression Optimization': this.calculateCompressionOptimization(processedImages),
          'Coordinate Transformation Accuracy': this.calculateCoordinateTransformationAccuracy(extractedImages),
          'Processing Efficiency': this.calculateProcessingEfficiency(processedImages)
        }
      };

    } catch (error) {
      console.error(`❌ [METRICS] Metrics calculation failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Perform critical quality checks
   */
  private static async performQualityChecks(
    extractedImages: ExtractedImage[],
    processedImages: ProcessedImage[],
    outputPptxPath: string
  ): Promise<{
    passedChecks: string[];
    failedChecks: string[];
    warnings: string[];
  }> {
    const passedChecks: string[] = [];
    const failedChecks: string[] = [];
    const warnings: string[] = [];

    // Check 1: Images extracted
    if (extractedImages.length > 0) {
      passedChecks.push('images_extracted');
    } else {
      failedChecks.push('images_extracted');
    }

    // Check 2: Coordinates preserved
    const hasValidCoordinates = extractedImages.every(img =>
      img.x >= 0 && img.y >= 0 && img.width > 0 && img.height > 0
    );
    if (hasValidCoordinates) {
      passedChecks.push('coordinates_preserved');
    } else {
      failedChecks.push('coordinates_preserved');
    }

    // Check 3: No corruption
    const hasCorruption = processedImages.some(img => img.qualityScore < 50);
    if (!hasCorruption) {
      passedChecks.push('no_corruption');
    } else {
      failedChecks.push('no_corruption');
    }

    // Check 4: Valid format
    const hasValidFormats = processedImages.every(img =>
      ['jpeg', 'png', 'webp'].includes(img.format)
    );
    if (hasValidFormats) {
      passedChecks.push('valid_format');
    } else {
      failedChecks.push('valid_format');
    }

    // Check 5: Output file exists and is valid
    try {
      const stats = await fs.stat(outputPptxPath);
      if (stats.size > 10000) { // At least 10KB
        passedChecks.push('valid_output_file');
      } else {
        warnings.push('Output file is very small, may be incomplete');
      }
    } catch (error) {
      failedChecks.push('valid_output_file');
    }

    // Check 6: Transparency preservation
    const transparentImages = extractedImages.filter(img => img.hasTransparency);
    const preservedTransparency = processedImages.filter(img =>
      img.format === 'png' && img.originalImage.hasTransparency
    );

    if (transparentImages.length === 0 || preservedTransparency.length === transparentImages.length) {
      passedChecks.push('transparency_preserved');
    } else {
      warnings.push(`${transparentImages.length - preservedTransparency.length} transparent images lost transparency`);
    }

    return { passedChecks, failedChecks, warnings };
  }

  /**
   * Calculate quality grade based on overall score
   */
  private static calculateQualityGrade(overallScore: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (overallScore >= this.QUALITY_THRESHOLDS.A) return 'A';
    if (overallScore >= this.QUALITY_THRESHOLDS.B) return 'B';
    if (overallScore >= this.QUALITY_THRESHOLDS.C) return 'C';
    if (overallScore >= this.QUALITY_THRESHOLDS.D) return 'D';
    return 'F';
  }

  /**
   * Generate recommendations based on metrics and checks
   */
  private static generateRecommendations(
    metrics: QualityMetrics,
    checks: { passedChecks: string[]; failedChecks: string[]; warnings: string[] }
  ): string[] {
    const recommendations: string[] = [];

    // Image preservation recommendations
    if (metrics.imagePreservation < 80) {
      recommendations.push('Consider using higher DPI settings for image extraction');
      recommendations.push('Verify PDF contains embedded images (not just rendered graphics)');
    }

    // Color accuracy recommendations
    if (metrics.colorAccuracy < 75) {
      recommendations.push('Enable ICC profile processing for better color accuracy');
      recommendations.push('Use CMYK to RGB conversion for print-quality PDFs');
    }

    // Transparency handling recommendations
    if (metrics.transparencyHandling < 70) {
      recommendations.push('Implement SMask processing for advanced transparency');
      recommendations.push('Ensure PNG format is used for images with transparency');
    }

    // Compression recommendations
    if (metrics.compressionEfficiency < 60) {
      recommendations.push('Optimize compression settings for different content types');
      recommendations.push('Use JPEG for photos, PNG for graphics and text');
    }

    // Coordinate accuracy recommendations
    if (metrics.coordinateAccuracy < 80) {
      recommendations.push('Verify PDF coordinate system transformation');
      recommendations.push('Check for proper Y-axis flip in coordinate conversion');
    }

    // Processing speed recommendations
    if (metrics.processingSpeed < 70) {
      recommendations.push('Consider batch processing for multiple images');
      recommendations.push('Optimize Sharp.js settings for better performance');
    }

    // Critical failure recommendations
    if (checks.failedChecks.includes('images_extracted')) {
      recommendations.push('CRITICAL: No images extracted - check PDF structure and extraction methods');
    }

    if (checks.failedChecks.includes('coordinates_preserved')) {
      recommendations.push('CRITICAL: Invalid coordinates - verify coordinate transformation logic');
    }

    return recommendations;
  }

  // Individual metric calculation methods

  private static calculateImagePreservationScore(
    extractedImages: ExtractedImage[],
    processedImages: ProcessedImage[]
  ): number {
    if (extractedImages.length === 0) return 0;

    const successRate = processedImages.length / extractedImages.length;
    const avgQuality = processedImages.reduce((sum, img) => sum + img.qualityScore, 0) / processedImages.length;

    return Math.round((successRate * 0.5 + avgQuality * 0.5));
  }

  private static calculateColorAccuracyScore(processedImages: ProcessedImage[]): number {
    if (processedImages.length === 0) return 100;

    // Assume color accuracy based on processing optimizations
    const colorOptimizedImages = processedImages.filter(img =>
      img.optimizations.some(opt => opt.includes('color') || opt.includes('Color'))
    );

    const accuracyRate = colorOptimizedImages.length / processedImages.length;
    return Math.round(70 + (accuracyRate * 30)); // Base 70% + bonus for optimization
  }

  private static calculateTransparencyScore(
    extractedImages: ExtractedImage[],
    processedImages: ProcessedImage[]
  ): number {
    const transparentImages = extractedImages.filter(img => img.hasTransparency);
    if (transparentImages.length === 0) return 100; // No transparency to preserve

    const preservedTransparency = processedImages.filter(img =>
      img.format === 'png' && img.originalImage.hasTransparency
    );

    const preservationRate = preservedTransparency.length / transparentImages.length;
    return Math.round(preservationRate * 100);
  }

  private static calculateCompressionScore(processedImages: ProcessedImage[]): number {
    if (processedImages.length === 0) return 100;

    const avgCompressionRatio = processedImages.reduce((sum, img) => sum + img.compressionRatio, 0) / processedImages.length;

    // Optimal compression ratio is around 0.5-0.8 (50-80% of original size)
    let score = 100;
    if (avgCompressionRatio < 0.3) score -= 20; // Too much compression
    if (avgCompressionRatio > 1.2) score -= 15; // Too little compression

    return Math.max(0, score);
  }

  private static calculateCoordinateAccuracyScore(extractedImages: ExtractedImage[]): number {
    const validCoordinates = extractedImages.filter(img =>
      img.x >= 0 && img.y >= 0 && img.width > 0 && img.height > 0
    );

    if (extractedImages.length === 0) return 100;
    return Math.round((validCoordinates.length / extractedImages.length) * 100);
  }

  private static calculateProcessingSpeedScore(processedImages: ProcessedImage[]): number {
    if (processedImages.length === 0) return 100;

    const avgProcessingTime = processedImages.reduce((sum, img) => sum + img.processingTime, 0) / processedImages.length;

    // Good processing time is under 1000ms per image
    let score = 100;
    if (avgProcessingTime > 1000) score -= 20;
    if (avgProcessingTime > 2000) score -= 30;
    if (avgProcessingTime > 5000) score -= 40;

    return Math.max(0, score);
  }

  // Detailed metric calculations

  private static calculateExtractionSuccessRate(extractedImages: ExtractedImage[]): number {
    // This would ideally compare with known image count from PDF analysis
    return extractedImages.length > 0 ? 100 : 0;
  }

  private static calculateAverageImageQuality(processedImages: ProcessedImage[]): number {
    if (processedImages.length === 0) return 0;
    return Math.round(processedImages.reduce((sum, img) => sum + img.qualityScore, 0) / processedImages.length);
  }

  private static calculateTransparencyPreservation(
    extractedImages: ExtractedImage[],
    processedImages: ProcessedImage[]
  ): number {
    return this.calculateTransparencyScore(extractedImages, processedImages);
  }

  private static calculateColorConversionAccuracy(processedImages: ProcessedImage[]): number {
    return this.calculateColorAccuracyScore(processedImages);
  }

  private static calculateCompressionOptimization(processedImages: ProcessedImage[]): number {
    return this.calculateCompressionScore(processedImages);
  }

  private static calculateCoordinateTransformationAccuracy(extractedImages: ExtractedImage[]): number {
    return this.calculateCoordinateAccuracyScore(extractedImages);
  }

  private static calculateProcessingEfficiency(processedImages: ProcessedImage[]): number {
    return this.calculateProcessingSpeedScore(processedImages);
  }

  /**
   * Generate comprehensive conversion report
   */
  static async generateConversionReport(
    extractedImages: ExtractedImage[],
    processedImages: ProcessedImage[],
    validationResult: ValidationResult,
    outputPptxPath: string
  ): Promise<ConversionReport> {
    console.log(`📊 [REPORT] Generating comprehensive conversion report...`);

    try {
      const stats = await fs.stat(outputPptxPath);
      const totalOriginalSize = extractedImages.reduce((sum, img) =>
        sum + (Buffer.isBuffer(img.data) ? img.data.length : Buffer.from(img.data, 'base64').length), 0
      );

      const transparentImages = extractedImages.filter(img => img.hasTransparency).length;
      const colorConversions = processedImages.filter(img =>
        img.optimizations.some(opt => opt.includes('color') || opt.includes('Color'))
      ).length;

      const totalProcessingTime = processedImages.reduce((sum, img) => sum + img.processingTime, 0);
      const avgCompressionRatio = processedImages.length > 0 ?
        processedImages.reduce((sum, img) => sum + img.compressionRatio, 0) / processedImages.length : 1;

      return {
        totalImages: extractedImages.length,
        successfulExtractions: processedImages.length,
        failedExtractions: extractedImages.length - processedImages.length,
        transparentImages,
        colorConversions,
        averageQualityScore: validationResult.metrics.overallScore,
        totalProcessingTime,
        outputFileSize: stats.size,
        compressionRatio: avgCompressionRatio,
        issues: validationResult.failedChecks,
        recommendations: validationResult.recommendations
      };

    } catch (error) {
      console.error(`❌ [REPORT] Report generation failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Performance benchmarking
   */
  static async benchmarkPerformance(
    extractedImages: ExtractedImage[],
    processedImages: ProcessedImage[]
  ): Promise<PerformanceBenchmark> {
    console.log(`⚡ [BENCHMARK] Running performance benchmark...`);

    try {
      const totalProcessingTime = processedImages.reduce((sum, img) => sum + img.processingTime, 0);
      const totalDataProcessed = processedImages.reduce((sum, img) => sum + img.fileSize, 0);

      // Calculate speeds
      const extractionSpeed = extractedImages.length / (totalProcessingTime / 1000); // images per second
      const processingSpeed = (totalDataProcessed / 1024 / 1024) / (totalProcessingTime / 1000); // MB per second

      // Estimate memory and CPU usage (simplified)
      const estimatedMemoryUsage = (totalDataProcessed / 1024 / 1024) * 2; // Rough estimate
      const estimatedCpuUsage = Math.min(100, totalProcessingTime / 100); // Simplified

      const avgQualityScore = processedImages.length > 0 ?
        processedImages.reduce((sum, img) => sum + img.qualityScore, 0) / processedImages.length : 0;

      return {
        extractionSpeed,
        processingSpeed,
        memoryUsage: estimatedMemoryUsage,
        cpuUsage: estimatedCpuUsage,
        qualityScore: avgQualityScore,
        timestamp: new Date()
      };

    } catch (error) {
      console.error(`❌ [BENCHMARK] Benchmarking failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Save quality report to file
   */
  static async saveQualityReport(
    report: ConversionReport,
    validationResult: ValidationResult,
    benchmark: PerformanceBenchmark,
    outputDir: string
  ): Promise<string> {
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        summary: {
          grade: validationResult.qualityGrade,
          overallScore: validationResult.metrics.overallScore,
          isValid: validationResult.isValid
        },
        conversionReport: report,
        validationResult: validationResult,
        performanceBenchmark: benchmark
      };

      const reportPath = path.join(outputDir, `quality-report-${Date.now()}.json`);
      await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));

      console.log(`📊 [REPORT-SAVED] Quality report saved to: ${reportPath}`);
      return reportPath;

    } catch (error) {
      console.error(`❌ [REPORT-SAVE] Failed to save quality report:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }
}

export default QualityMetricsValidatorService;