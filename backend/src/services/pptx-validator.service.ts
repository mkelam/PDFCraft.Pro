import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { AdvancedPPTXValidator } from './advanced-pptx-validator.service';
import { AutomatedQualityScorer } from './automated-quality-scorer.service';
import { VisualFidelityValidator } from './visual-fidelity-validator.service';

/**
 * PowerPoint Validation Service
 * Validates PPTX files for quality, content, and corruption
 */
export class PPTXValidatorService {

  /**
   * Comprehensive PowerPoint validation
   */
  static async validatePowerPointFile(filePath: string): Promise<ValidationResult> {
    const startTime = Date.now();
    console.log(`🔍 [VALIDATOR] Starting validation of: ${path.basename(filePath)}`);

    const result: ValidationResult = {
      isValid: false,
      hasContent: false,
      slideCount: 0,
      fileSize: 0,
      issues: [],
      warnings: [],
      quality: {
        hasImages: false,
        hasText: false,
        hasNotes: false,
        avgContentPerSlide: 0
      },
      validationTime: 0
    };

    try {
      // 1. Basic file existence and size check
      const stats = await fs.stat(filePath);
      result.fileSize = stats.size;

      if (stats.size === 0) {
        result.issues.push('File is empty (0 bytes)');
        return result;
      }

      if (stats.size < 1000) {
        result.issues.push('File is suspiciously small (< 1KB) - likely corrupted');
        return result;
      }

      // 2. Read and validate ZIP structure
      const fileBuffer = await fs.readFile(filePath);
      let zip: JSZip;

      try {
        zip = await JSZip.loadAsync(fileBuffer);
      } catch (zipError) {
        result.issues.push('File is not a valid ZIP/PPTX format');
        return result;
      }

      // 3. Validate PowerPoint structure
      const structureValidation = await this.validatePPTXStructure(zip);
      if (!structureValidation.isValid) {
        result.issues.push(...structureValidation.issues);
        return result;
      }

      // 4. Count slides and validate content
      const contentValidation = await this.validateSlideContent(zip);
      result.slideCount = contentValidation.slideCount;
      result.hasContent = contentValidation.hasContent;
      result.quality = contentValidation.quality;
      result.warnings.push(...contentValidation.warnings);

      if (result.slideCount === 0) {
        result.issues.push('No slides found in presentation');
        return result;
      }

      if (!result.hasContent) {
        result.issues.push('All slides appear to be blank - no meaningful content detected');
        return result;
      }

      // 5. Additional quality checks
      const qualityChecks = await this.performQualityChecks(zip, result);
      result.warnings.push(...qualityChecks.warnings);

      // If we got here, the file is valid
      result.isValid = true;
      result.validationTime = Date.now() - startTime;

      console.log(`✅ [VALIDATOR] File is valid - ${result.slideCount} slides, ${this.formatFileSize(result.fileSize)}`);

      return result;

    } catch (error) {
      result.issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.validationTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Validate basic PPTX file structure
   */
  private static async validatePPTXStructure(zip: JSZip): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check for required PPTX files
    const requiredFiles = [
      '[Content_Types].xml',
      '_rels/.rels',
      'ppt/presentation.xml'
    ];

    for (const requiredFile of requiredFiles) {
      if (!zip.files[requiredFile]) {
        issues.push(`Missing required file: ${requiredFile}`);
      }
    }

    // Check for slides directory
    const hasSlideFiles = Object.keys(zip.files).some(filename =>
      filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')
    );

    if (!hasSlideFiles) {
      issues.push('No slide files found in ppt/slides/ directory');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Validate slide content quality
   */
  private static async validateSlideContent(zip: JSZip): Promise<ContentValidation> {
    const slideFiles = Object.keys(zip.files).filter(filename =>
      filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')
    );

    const result: ContentValidation = {
      slideCount: slideFiles.length,
      hasContent: false,
      warnings: [],
      quality: {
        hasImages: false,
        hasText: false,
        hasNotes: false,
        avgContentPerSlide: 0
      }
    };

    if (slideFiles.length === 0) {
      return result;
    }

    let totalContentItems = 0;
    let slidesWithContent = 0;
    let totalTextLength = 0;

    for (const slideFile of slideFiles) {
      try {
        const slideXML = await zip.files[slideFile].async('text');
        const slideNumber = this.extractSlideNumber(slideFile);

        // Check for images
        if (slideXML.includes('<a:blip') || slideXML.includes('<pic:pic') || slideXML.includes('r:embed')) {
          result.quality.hasImages = true;
          totalContentItems++;
        }

        // Check for text content
        const textMatches = slideXML.match(/<a:t[^>]*>([^<]*)</g);
        if (textMatches && textMatches.length > 0) {
          result.quality.hasText = true;
          const slideTextLength = textMatches.join('').length;
          totalTextLength += slideTextLength;

          if (slideTextLength > 10) { // Meaningful text threshold
            totalContentItems++;
            slidesWithContent++;
          }
        }

        // Check for minimal content (just page numbers, etc.)
        const meaningfulContent = this.hasMeaningfulContent(slideXML);
        if (!meaningfulContent) {
          result.warnings.push(`Slide ${slideNumber} appears to have minimal content`);
        }

      } catch (error) {
        result.warnings.push(`Failed to analyze slide: ${slideFile}`);
      }
    }

    // Check for notes
    const notesFiles = Object.keys(zip.files).filter(filename =>
      filename.startsWith('ppt/notesSlides/') && filename.endsWith('.xml')
    );
    result.quality.hasNotes = notesFiles.length > 0;

    // Calculate metrics
    result.quality.avgContentPerSlide = totalContentItems / slideFiles.length;
    result.hasContent = slidesWithContent > 0 || result.quality.hasImages;

    // Quality warnings
    if (result.quality.avgContentPerSlide < 0.5) {
      result.warnings.push('Low content density - many slides appear to be empty or minimal');
    }

    if (totalTextLength < 100 && !result.quality.hasImages) {
      result.warnings.push('Very little text content and no images detected');
    }

    return result;
  }

  /**
   * Perform additional quality checks
   */
  private static async performQualityChecks(zip: JSZip, result: ValidationResult): Promise<{ warnings: string[] }> {
    const warnings: string[] = [];

    // Check file size vs slide count ratio
    const bytesPerSlide = result.fileSize / result.slideCount;

    if (bytesPerSlide < 5000) { // Less than 5KB per slide
      warnings.push('File size is very small relative to slide count - may indicate poor quality conversion');
    }

    // Check for embedded media
    const mediaFiles = Object.keys(zip.files).filter(filename =>
      filename.startsWith('ppt/media/') &&
      (filename.includes('.png') || filename.includes('.jpg') || filename.includes('.jpeg'))
    );

    if (mediaFiles.length === 0 && result.quality.hasImages) {
      warnings.push('Images detected but no media files found - images may be corrupted');
    }

    // Check for theme and layout files
    const hasTheme = Object.keys(zip.files).some(filename => filename.includes('theme'));
    if (!hasTheme) {
      warnings.push('No theme files found - presentation may have formatting issues');
    }

    return { warnings };
  }

  /**
   * Extract slide number from filename
   */
  private static extractSlideNumber(filename: string): number {
    const match = filename.match(/slide(\d+)\.xml/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Check if slide has meaningful content
   */
  private static hasMeaningfulContent(slideXML: string): boolean {
    // Remove common minimal content
    const cleanedXML = slideXML
      .replace(/<a:t[^>]*>\d+<\/a:t>/g, '') // Page numbers
      .replace(/<a:t[^>]*>Page \d+<\/a:t>/g, '') // "Page X" text
      .replace(/<a:t[^>]*>Slide \d+<\/a:t>/g, '') // "Slide X" text
      .replace(/<a:t[^>]*>\s*<\/a:t>/g, ''); // Empty text elements

    // Check for remaining text content
    const textMatches = cleanedXML.match(/<a:t[^>]*>([^<]+)</g);
    const meaningfulTextLength = textMatches ? textMatches.join('').length : 0;

    // Check for images or shapes
    const hasImages = slideXML.includes('<a:blip') || slideXML.includes('<pic:pic');
    const hasShapes = slideXML.includes('<p:sp') && slideXML.includes('<a:prstGeom');

    return meaningfulTextLength > 20 || hasImages || hasShapes;
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Quick validation for basic checks
   */
  static async quickValidate(filePath: string): Promise<boolean> {
    try {
      const result = await this.validatePowerPointFile(filePath);
      return result.isValid && result.hasContent && result.slideCount > 0;
    } catch {
      return false;
    }
  }

  /**
   * Enhanced validation with advanced quality metrics
   */
  static async validateWithAdvancedMetrics(
    filePath: string,
    originalPdfPath?: string
  ): Promise<AdvancedValidationResult> {
    console.log(`🔍 [ADVANCED-VALIDATOR] Starting enhanced validation: ${path.basename(filePath)}`);

    // Run basic validation first
    const basic = await this.validatePowerPointFile(filePath);

    if (!basic.isValid) {
      return {
        ...basic,
        advancedMetrics: null,
        qualityScore: 0,
        grade: 'F',
        recommendations: ['File validation failed - cannot perform advanced analysis']
      };
    }

    try {
      // Run advanced analysis
      const [structural, slideContent] = await Promise.all([
        AdvancedPPTXValidator.validatePPTXStructure(filePath),
        AdvancedPPTXValidator.extractSlideContent(filePath, 1)
      ]);

      // Calculate advanced quality score
      let qualityScore = 0;
      const recommendations: string[] = [];

      // Structural quality (30% weight)
      const structuralScore = structural.structuralIntegrity;
      qualityScore += structuralScore * 0.3;

      if (structuralScore < 80) {
        recommendations.push('Improve PPTX structure and OOXML compliance');
      }

      // Content quality (40% weight)
      const contentScore = this.calculateContentQuality(basic, slideContent);
      qualityScore += contentScore * 0.4;

      if (contentScore < 70) {
        recommendations.push('Enhance content organization and readability');
      }

      // Presentation quality (30% weight)
      const presentationScore = this.calculatePresentationQuality(basic, slideContent);
      qualityScore += presentationScore * 0.3;

      if (presentationScore < 75) {
        recommendations.push('Optimize for better presentation experience');
      }

      qualityScore = Math.round(qualityScore);
      const grade = this.calculateGrade(qualityScore);

      console.log(`   📊 Advanced validation complete:`);
      console.log(`      Quality score: ${qualityScore}% (Grade: ${grade})`);
      console.log(`      Structural: ${structuralScore}%`);
      console.log(`      Content: ${contentScore}%`);
      console.log(`      Presentation: ${presentationScore}%`);

      return {
        ...basic,
        advancedMetrics: {
          structuralIntegrity: structural,
          contentQuality: {
            score: contentScore,
            textElements: slideContent.textElements.length,
            imageElements: slideContent.imageElements.length,
            hasBalancedContent: slideContent.textElements.length > 0 && slideContent.textElements.length <= 5
          },
          presentationQuality: {
            score: presentationScore,
            usabilityFactors: {
              fileSize: basic.fileSize,
              slideCount: basic.slideCount,
              contentDensity: basic.quality.avgContentPerSlide
            }
          },
          accessibility: this.assessAccessibility(slideContent)
        },
        qualityScore,
        grade,
        recommendations: recommendations.length > 0 ? recommendations : ['Excellent quality achieved']
      };

    } catch (error) {
      console.error(`❌ [ADVANCED-VALIDATOR] Enhanced validation failed:`, error);
      return {
        ...basic,
        advancedMetrics: null,
        qualityScore: basic.isValid ? 60 : 0,
        grade: basic.isValid ? 'C' : 'F',
        recommendations: [`Advanced analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Comprehensive quality validation with PDF comparison
   */
  static async validateConversionQuality(
    pptxPath: string,
    originalPdfPath: string,
    options: {
      strictMode?: boolean;
      enableVisualAnalysis?: boolean;
    } = {}
  ): Promise<ConversionQualityResult> {
    const { strictMode = false, enableVisualAnalysis = true } = options;

    console.log(`🎯 [CONVERSION-VALIDATOR] Validating conversion quality...`);
    console.log(`   📄 Original PDF: ${path.basename(originalPdfPath)}`);
    console.log(`   📊 Converted PPTX: ${path.basename(pptxPath)}`);

    try {
      // Run comprehensive quality analysis
      const qualityResult = await AutomatedQualityScorer.calculateOverallQuality(
        originalPdfPath,
        pptxPath,
        {
          strictMode,
          enableDetailed: true
        }
      );

      // Run basic PPTX validation
      const pptxValidation = await this.validatePowerPointFile(pptxPath);

      return {
        conversionSuccess: pptxValidation.isValid && qualityResult.passed,
        overallScore: qualityResult.overallScore,
        grade: qualityResult.grade,
        categoryScores: qualityResult.categoryScores,
        pptxValidation,
        qualityAnalysis: qualityResult,
        recommendations: qualityResult.recommendations,
        criticalIssues: qualityResult.criticalIssues,
        processingTime: qualityResult.processingTime
      };

    } catch (error) {
      console.error(`❌ [CONVERSION-VALIDATOR] Conversion quality validation failed:`, error);

      // Fallback to basic validation
      const basicValidation = await this.validatePowerPointFile(pptxPath);

      return {
        conversionSuccess: false,
        overallScore: 0,
        grade: 'F',
        categoryScores: {
          structuralIntegrity: 0,
          contentPreservation: 0,
          visualFidelity: 0,
          usabilityScore: 0
        },
        pptxValidation: basicValidation,
        qualityAnalysis: null,
        recommendations: ['Conversion quality validation failed'],
        criticalIssues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        processingTime: 0
      };
    }
  }

  /**
   * Calculate content quality score
   */
  private static calculateContentQuality(basic: ValidationResult, slideContent: any): number {
    let score = 60; // Base score

    // Text content evaluation
    if (basic.quality.hasText) {
      score += 20;

      // Quality of text content
      const textElements = slideContent.textElements || [];
      if (textElements.length > 0) {
        const avgTextLength = textElements.reduce((sum: number, el: any) => sum + (el.text?.length || 0), 0) / textElements.length;
        if (avgTextLength > 50) score += 10; // Substantial text content
        if (textElements.length <= 5) score += 5; // Not overwhelming
      }
    }

    // Image content evaluation
    if (basic.quality.hasImages) {
      score += 10;
    }

    // Content balance
    if (basic.quality.hasText && basic.quality.hasImages) {
      score += 5; // Balanced content
    }

    // Content density
    if (basic.quality.avgContentPerSlide > 0.7) {
      score += 5; // Good content density
    }

    return Math.min(100, score);
  }

  /**
   * Calculate presentation quality score
   */
  private static calculatePresentationQuality(basic: ValidationResult, slideContent: any): number {
    let score = 65; // Base score

    // File size optimization
    const sizeKB = basic.fileSize / 1024;
    if (sizeKB < 5000) score += 15; // Under 5MB
    else if (sizeKB < 10000) score += 10; // Under 10MB
    else if (sizeKB > 25000) score -= 10; // Over 25MB

    // Slide count appropriateness
    if (basic.slideCount > 0 && basic.slideCount <= 20) {
      score += 10; // Reasonable number of slides
    } else if (basic.slideCount > 50) {
      score -= 5; // Too many slides
    }

    // Content organization
    if (basic.quality.avgContentPerSlide > 0.5) {
      score += 10; // Good content distribution
    }

    return Math.min(100, score);
  }

  /**
   * Assess accessibility features
   */
  private static assessAccessibility(slideContent: any): {
    score: number;
    hasAltText: boolean;
    hasStructuredContent: boolean;
    readabilityScore: number;
  } {
    let score = 70; // Base accessibility score

    // Check for structured content
    const hasStructuredContent = slideContent.textElements && slideContent.textElements.length > 0;
    if (hasStructuredContent) score += 15;

    // Simulated alt text check (would require deeper PPTX analysis)
    const hasAltText = slideContent.imageElements && slideContent.imageElements.some((img: any) => img.properties?.description);
    if (hasAltText) score += 15;

    // Basic readability assessment
    const readabilityScore = hasStructuredContent ? 75 : 50;

    return {
      score: Math.min(100, score),
      hasAltText,
      hasStructuredContent,
      readabilityScore
    };
  }

  /**
   * Calculate grade from score
   */
  private static calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * TRUE VISUAL FIDELITY VALIDATION
   * Compare actual visual appearance between original PDF and converted PPTX
   */
  static async validateTrueVisualFidelity(
    originalPdfPath: string,
    convertedPptxPath: string,
    options: {
      strictMode?: boolean;
      tempDir?: string;
      maxPages?: number;
    } = {}
  ): Promise<TrueQualityValidationResult> {
    const {
      strictMode = false,
      tempDir = path.join(process.cwd(), 'temp', 'visual-validation'),
      maxPages = 5
    } = options;

    console.log(`🎯 [TRUE-QUALITY] Starting visual fidelity validation...`);
    console.log(`   📄 Original PDF: ${path.basename(originalPdfPath)}`);
    console.log(`   📊 Converted PPTX: ${path.basename(convertedPptxPath)}`);

    const startTime = Date.now();

    try {
      // Step 1: Basic PPTX validation first
      console.log(`   ✅ Running basic PPTX validation...`);
      const basicValidation = await this.validatePowerPointFile(convertedPptxPath);

      if (!basicValidation.isValid) {
        return {
          isValid: false,
          overallScore: 0,
          grade: 'F',
          basicValidation,
          visualFidelity: null,
          issues: ['PPTX file failed basic validation', ...basicValidation.issues],
          recommendations: ['Fix basic PPTX structure issues before assessing visual quality'],
          processingTime: Date.now() - startTime
        };
      }

      // Step 2: Visual fidelity comparison
      console.log(`   🔍 Performing visual fidelity analysis...`);
      const visualFidelity = await VisualFidelityValidator.validateVisualFidelity(
        originalPdfPath,
        convertedPptxPath,
        tempDir,
        {
          density: 300, // High quality comparison
          imageFormat: 'png',
          quality: 98,
          compareAlgorithm: 'ssim', // Structural similarity
          thresholds: strictMode
            ? { excellent: 95, good: 90, acceptable: 85 }
            : { excellent: 90, good: 80, acceptable: 70 }
        }
      );

      // Step 3: Calculate true quality score
      const trueQualityScore = this.calculateTrueQualityScore(
        basicValidation,
        visualFidelity,
        strictMode
      );

      // Step 4: Generate quality recommendations
      const recommendations = this.generateQualityRecommendations(
        basicValidation,
        visualFidelity,
        trueQualityScore
      );

      const finalGrade = this.calculateGrade(trueQualityScore);
      const isValid = trueQualityScore >= (strictMode ? 85 : 70);

      console.log(`   📊 TRUE QUALITY RESULTS:`);
      console.log(`      Basic validation: ${basicValidation.isValid ? 'PASS' : 'FAIL'}`);
      console.log(`      Visual similarity: ${visualFidelity.visualSimilarity}%`);
      console.log(`      Layout accuracy: ${visualFidelity.layoutAccuracy}%`);
      console.log(`      Color fidelity: ${visualFidelity.colorFidelity}%`);
      console.log(`      Overall score: ${trueQualityScore}%`);
      console.log(`      Grade: ${finalGrade}`);

      return {
        isValid,
        overallScore: trueQualityScore,
        grade: finalGrade,
        basicValidation,
        visualFidelity,
        issues: this.compileQualityIssues(basicValidation, visualFidelity, trueQualityScore),
        recommendations,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error(`❌ [TRUE-QUALITY] Visual fidelity validation failed:`, error);

      return {
        isValid: false,
        overallScore: 0,
        grade: 'F',
        basicValidation: await this.validatePowerPointFile(convertedPptxPath).catch(() => ({
          isValid: false,
          hasContent: false,
          slideCount: 0,
          fileSize: 0,
          issues: ['Basic validation failed'],
          warnings: [],
          quality: { hasImages: false, hasText: false, hasNotes: false, avgContentPerSlide: 0 },
          validationTime: 0
        })),
        visualFidelity: null,
        issues: [`Visual validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: ['Unable to perform visual quality assessment'],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Calculate true quality score combining basic validation and visual fidelity
   */
  private static calculateTrueQualityScore(
    basicValidation: ValidationResult,
    visualFidelity: any,
    strictMode: boolean
  ): number {
    // Weight factors for true quality
    const weights = {
      basicStructure: 0.20,    // File structure and content existence
      visualSimilarity: 0.35,  // Overall visual similarity
      layoutAccuracy: 0.25,    // Layout preservation
      colorFidelity: 0.20      // Color consistency
    };

    // Basic structure score (from existing validation)
    const basicScore = basicValidation.isValid && basicValidation.hasContent ? 100 : 0;

    // Calculate weighted overall score
    const overallScore =
      (basicScore * weights.basicStructure) +
      (visualFidelity.visualSimilarity * weights.visualSimilarity) +
      (visualFidelity.layoutAccuracy * weights.layoutAccuracy) +
      (visualFidelity.colorFidelity * weights.colorFidelity);

    // Apply strict mode penalty
    const finalScore = strictMode ? Math.round(overallScore * 0.9) : Math.round(overallScore);

    return Math.max(0, Math.min(100, finalScore));
  }

  /**
   * Generate quality improvement recommendations
   */
  private static generateQualityRecommendations(
    basicValidation: ValidationResult,
    visualFidelity: any,
    overallScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (!basicValidation.isValid) {
      recommendations.push('Fix basic PPTX structure and content issues');
    }

    if (visualFidelity.visualSimilarity < 80) {
      recommendations.push('Improve overall visual similarity to original PDF');
    }

    if (visualFidelity.layoutAccuracy < 75) {
      recommendations.push('Enhance layout preservation - check coordinate mapping and positioning');
    }

    if (visualFidelity.colorFidelity < 85) {
      recommendations.push('Improve color consistency - verify color space handling');
    }

    if (overallScore >= 95) {
      recommendations.push('Exceptional quality achieved! 🏆');
    } else if (overallScore >= 85) {
      recommendations.push('Excellent quality - minor refinements possible');
    } else if (overallScore >= 70) {
      recommendations.push('Good quality - focus on visual fidelity improvements');
    } else {
      recommendations.push('Significant quality improvements needed');
    }

    return recommendations;
  }

  /**
   * Compile all quality issues
   */
  private static compileQualityIssues(
    basicValidation: ValidationResult,
    visualFidelity: any,
    overallScore: number
  ): string[] {
    const issues: string[] = [];

    // Basic validation issues
    issues.push(...basicValidation.issues);

    // Visual fidelity issues
    if (visualFidelity.detailedResults) {
      visualFidelity.detailedResults.forEach((result: any) => {
        if (result.issues && result.issues.length > 0) {
          issues.push(...result.issues.map((issue: string) => `Page ${result.pageIndex}: ${issue}`));
        }
      });
    }

    // Overall quality issues
    if (overallScore < 50) {
      issues.push('Overall quality below acceptable standards');
    }

    return issues;
  }
}

// Type definitions
export interface ValidationResult {
  isValid: boolean;
  hasContent: boolean;
  slideCount: number;
  fileSize: number;
  issues: string[];
  warnings: string[];
  quality: QualityMetrics;
  validationTime: number;
}

export interface AdvancedValidationResult extends ValidationResult {
  advancedMetrics: {
    structuralIntegrity: any;
    contentQuality: {
      score: number;
      textElements: number;
      imageElements: number;
      hasBalancedContent: boolean;
    };
    presentationQuality: {
      score: number;
      usabilityFactors: {
        fileSize: number;
        slideCount: number;
        contentDensity: number;
      };
    };
    accessibility: {
      score: number;
      hasAltText: boolean;
      hasStructuredContent: boolean;
      readabilityScore: number;
    };
  } | null;
  qualityScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}

export interface ConversionQualityResult {
  conversionSuccess: boolean;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  categoryScores: {
    structuralIntegrity: number;
    contentPreservation: number;
    visualFidelity: number;
    usabilityScore: number;
  };
  pptxValidation: ValidationResult;
  qualityAnalysis: any;
  recommendations: string[];
  criticalIssues: string[];
  processingTime: number;
}

interface ContentValidation {
  slideCount: number;
  hasContent: boolean;
  warnings: string[];
  quality: QualityMetrics;
}

interface QualityMetrics {
  hasImages: boolean;
  hasText: boolean;
  hasNotes: boolean;
  avgContentPerSlide: number;
}

export interface TrueQualityValidationResult {
  isValid: boolean;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  basicValidation: ValidationResult;
  visualFidelity: any | null;
  issues: string[];
  recommendations: string[];
  processingTime: number;
}