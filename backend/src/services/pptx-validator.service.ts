import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';

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