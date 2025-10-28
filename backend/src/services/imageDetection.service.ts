import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.js';
import { logger } from '../utils/logger';

// Helper function for error message extraction
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

// Configure PDF.js worker
// GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.js';

export interface ImageDetectionResult {
  hasImages: boolean;
  imageCount: number;
  pageCount: number;
  complexity: 'simple' | 'moderate' | 'complex';
  recommendsImageProcessing: boolean;
  details: {
    pagesWithImages: number[];
    averageImagesPerPage: number;
    estimatedFileType: 'text-heavy' | 'mixed-content' | 'image-heavy';
  };
}

export class ImageDetectionService {
  private readonly logger = logger;

  async analyzeForImages(pdfBuffer: Buffer): Promise<ImageDetectionResult> {
    try {
      this.logger.info('Starting image detection analysis');

      // Basic file size analysis
      const fileSize = pdfBuffer.length;
      const fileSizeMB = fileSize / (1024 * 1024);

      // Quick heuristics before detailed analysis
      if (fileSizeMB < 0.5) {
        return this.createSimpleResult(false, 0, 1, 'text-heavy');
      }

      // Try detailed PDF analysis
      try {
        return await this.detailedPDFAnalysis(pdfBuffer);
      } catch (pdfError) {
        this.logger.warn('Detailed PDF analysis failed, using heuristics', {
          error: getErrorMessage(pdfError)
        });

        return this.heuristicAnalysis(pdfBuffer);
      }

    } catch (error) {
      this.logger.error('Image detection failed', { error: getErrorMessage(error) });

      // Fallback: assume it might have images if it's a reasonable size
      const fileSizeMB = pdfBuffer.length / (1024 * 1024);
      return this.createSimpleResult(fileSizeMB > 1, 0, 1, 'mixed-content');
    }
  }

  private async detailedPDFAnalysis(pdfBuffer: Buffer): Promise<ImageDetectionResult> {
    try {
      // Load PDF document with PDF.js
      const uint8Array = new Uint8Array(pdfBuffer);
      const loadingTask = getDocument({
        data: uint8Array,
        verbosity: 0 // Suppress warnings
      });

      const pdfDoc = await loadingTask.promise;
      const pageCount = pdfDoc.numPages;

      let totalImages = 0;
      const pagesWithImages: number[] = [];

      // Analyze each page for images
      for (let pageNum = 1; pageNum <= Math.min(pageCount, 10); pageNum++) { // Limit to first 10 pages for performance
        try {
          const page = await pdfDoc.getPage(pageNum);
          const pageImages = await this.countImagesInPage(page);

          if (pageImages > 0) {
            totalImages += pageImages;
            pagesWithImages.push(pageNum);
          }
        } catch (pageError) {
          this.logger.warn(`Failed to analyze page ${pageNum}`, {
            error: getErrorMessage(pageError)
          });
        }
      }

      // Extrapolate for remaining pages if we limited analysis
      if (pageCount > 10 && pagesWithImages.length > 0) {
        const averageImagesPerAnalyzedPage = totalImages / 10;
        const estimatedTotalImages = Math.round(averageImagesPerAnalyzedPage * pageCount);
        totalImages = estimatedTotalImages;
      }

      const hasImages = totalImages > 0;
      const averageImagesPerPage = pageCount > 0 ? totalImages / pageCount : 0;

      // Determine complexity and file type
      let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
      let estimatedFileType: 'text-heavy' | 'mixed-content' | 'image-heavy' = 'text-heavy';

      if (totalImages === 0) {
        complexity = 'simple';
        estimatedFileType = 'text-heavy';
      } else if (totalImages <= 5 || averageImagesPerPage <= 0.5) {
        complexity = 'moderate';
        estimatedFileType = 'mixed-content';
      } else {
        complexity = 'complex';
        estimatedFileType = 'image-heavy';
      }

      const result: ImageDetectionResult = {
        hasImages,
        imageCount: totalImages,
        pageCount,
        complexity,
        recommendsImageProcessing: hasImages,
        details: {
          pagesWithImages,
          averageImagesPerPage,
          estimatedFileType
        }
      };

      this.logger.info('Image detection completed', {
        hasImages,
        imageCount: totalImages,
        pageCount,
        complexity,
        estimatedFileType
      });

      return result;

    } catch (error) {
      this.logger.error('Detailed PDF analysis failed', { error: getErrorMessage(error) });
      throw error;
    }
  }

  private async countImagesInPage(page: any): Promise<number> {
    try {
      // Get page resources
      const operatorList = await page.getOperatorList();
      let imageCount = 0;

      // Count image operations
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        const fn = operatorList.fnArray[i];

        // Look for image painting operations
        // OPS.paintImageXObject is typically 87, but we'll check multiple possibilities
        if (fn === 87 || fn === 88 || fn === 89) { // Common image operation codes
          imageCount++;
        }
      }

      // Alternative method: check resources directly
      if (imageCount === 0) {
        try {
          const resources = page.resourcesPromise ? await page.resourcesPromise : page.resources;
          if (resources && resources.XObject) {
            const xObjects = Object.keys(resources.XObject);
            // Filter for likely image objects
            imageCount = xObjects.filter(key => {
              const obj = resources.XObject[key];
              return obj && (obj.Subtype === 'Image' || obj.Type === 'XObject');
            }).length;
          }
        } catch (resourceError) {
          // Ignore resource access errors
        }
      }

      return imageCount;

    } catch (error) {
      this.logger.warn('Failed to count images in page', { error: getErrorMessage(error) });
      return 0;
    }
  }

  private heuristicAnalysis(pdfBuffer: Buffer): ImageDetectionResult {
    const fileSize = pdfBuffer.length;
    const fileSizeMB = fileSize / (1024 * 1024);

    // Simple heuristics based on file size and content patterns
    let hasImages = false;
    let imageCount = 0;
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    let estimatedFileType: 'text-heavy' | 'mixed-content' | 'image-heavy' = 'text-heavy';

    if (fileSizeMB > 10) {
      hasImages = true;
      imageCount = Math.round(fileSizeMB / 2); // Rough estimate
      complexity = 'complex';
      estimatedFileType = 'image-heavy';
    } else if (fileSizeMB > 2) {
      hasImages = true;
      imageCount = Math.round(fileSizeMB);
      complexity = 'moderate';
      estimatedFileType = 'mixed-content';
    }

    // Check for image-related byte patterns (very basic)
    const bufferString = pdfBuffer.toString('binary', 0, Math.min(pdfBuffer.length, 10000));
    const hasImageHeaders = bufferString.includes('/Image') ||
                           bufferString.includes('JFIF') ||
                           bufferString.includes('PNG') ||
                           bufferString.includes('/XObject');

    if (hasImageHeaders && !hasImages) {
      hasImages = true;
      imageCount = 1;
      complexity = 'moderate';
      estimatedFileType = 'mixed-content';
    }

    return this.createSimpleResult(
      hasImages,
      imageCount,
      Math.max(1, Math.round(fileSizeMB / 0.5)), // Estimate pages
      estimatedFileType
    );
  }

  private createSimpleResult(
    hasImages: boolean,
    imageCount: number,
    pageCount: number,
    fileType: 'text-heavy' | 'mixed-content' | 'image-heavy'
  ): ImageDetectionResult {
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';

    if (fileType === 'image-heavy') {
      complexity = 'complex';
    } else if (fileType === 'mixed-content') {
      complexity = 'moderate';
    }

    return {
      hasImages,
      imageCount,
      pageCount,
      complexity,
      recommendsImageProcessing: hasImages,
      details: {
        pagesWithImages: hasImages ? Array.from({ length: Math.min(pageCount, imageCount) }, (_, i) => i + 1) : [],
        averageImagesPerPage: pageCount > 0 ? imageCount / pageCount : 0,
        estimatedFileType: fileType
      }
    };
  }

  // Quick check method for engine selection
  async shouldUseImageProcessing(pdfBuffer: Buffer): Promise<boolean> {
    try {
      const result = await this.analyzeForImages(pdfBuffer);
      return result.recommendsImageProcessing;
    } catch (error) {
      this.logger.warn('Quick image check failed, defaulting to image processing', {
        error: getErrorMessage(error)
      });
      return true; // Default to using image processing when uncertain
    }
  }

  // Method to get processing recommendations
  async getProcessingRecommendations(pdfBuffer: Buffer): Promise<{
    preferredEngine: string;
    fallbackEngines: string[];
    processingMode: 'text-only' | 'hybrid' | 'image-focused';
    estimatedProcessingTime: number;
  }> {
    try {
      const analysis = await this.analyzeForImages(pdfBuffer);

      let preferredEngine = 'ImprovedPDFService';
      let fallbackEngines = ['WorkingPDFService', 'EnhancedFallbackPDFService'];
      let processingMode: 'text-only' | 'hybrid' | 'image-focused' = 'text-only';
      let estimatedProcessingTime = 3; // seconds

      if (analysis.hasImages) {
        if (analysis.complexity === 'complex') {
          preferredEngine = 'QuickImageFixService';
          fallbackEngines = ['VisualFidelityPDFService', 'EnterprisePDFService'];
          processingMode = 'image-focused';
          estimatedProcessingTime = 8;
        } else if (analysis.complexity === 'moderate') {
          preferredEngine = 'VisualFidelityPDFService';
          fallbackEngines = ['QuickImageFixService', 'EnterprisePDFService'];
          processingMode = 'hybrid';
          estimatedProcessingTime = 5;
        }
      }

      return {
        preferredEngine,
        fallbackEngines,
        processingMode,
        estimatedProcessingTime
      };

    } catch (error) {
      this.logger.error('Failed to get processing recommendations', {
        error: getErrorMessage(error)
      });

      return {
        preferredEngine: 'QuickImageFixService',
        fallbackEngines: ['ImprovedPDFService'],
        processingMode: 'hybrid',
        estimatedProcessingTime: 6
      };
    }
  }
}

export default new ImageDetectionService();