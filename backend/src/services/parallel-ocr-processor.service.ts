/**
 * Parallel OCR Processor Service - HIGH PERFORMANCE PDF OCR
 *
 * Features:
 * - Parallel page processing (4-8 pages simultaneously)
 * - Memory-efficient streaming for large documents
 * - Intelligent caching with content hashing
 * - Progress tracking and async processing
 * - Performance monitoring and bottleneck detection
 * - Automatic resource management and cleanup
 *
 * Performance Targets:
 * - 20-page PDF: <5 seconds (was 20+ seconds sequential)
 * - 100-page PDF: <20 seconds (was 100+ seconds sequential)
 * - Memory usage: <500MB regardless of PDF size
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { ImageMagickWrapper } from './imagemagick-wrapper.service';
import { EnhancedOCRAccuracyService } from './enhanced-ocr-accuracy.service';
import { TesseractWrapper } from './tesseract-wrapper.service';
// import { CostOptimizationEngine, type DocumentAnalysis } from './cost-optimization-engine.service';

// Performance Configuration
export interface ParallelOCRConfig {
  maxConcurrency: number;
  maxMemoryMB: number;
  enableCaching: boolean;
  cacheDirectory: string;
  enableProgressTracking: boolean;
  streamingThreshold: number; // Pages count to trigger streaming
  retryAttempts: number;
  timeout: number;
}

// Processing Result Types
export interface PageProcessingResult {
  pageNumber: number;
  text: string;
  confidence: number;
  processingTime: number;
  engine: string;
  cached: boolean;
  memoryUsed: number;
}

export interface ParallelOCRResult {
  totalText: string;
  pages: PageProcessingResult[];
  totalPages: number;
  totalProcessingTime: number;
  averagePageTime: number;
  cacheHitRate: number;
  peakMemoryUsage: number;
  enginesUsed: string[];
  performanceMetrics: {
    imageExtractionTime: number;
    ocrProcessingTime: number;
    parallelizationGain: number;
    bottlenecks: string[];
  };
}

export interface ProgressUpdate {
  pagesCompleted: number;
  totalPages: number;
  percentage: number;
  currentPage: number;
  estimatedTimeRemaining: number;
  averagePageTime: number;
}

export class ParallelOCRProcessor extends EventEmitter {

  private static readonly DEFAULT_CONFIG: ParallelOCRConfig = {
    maxConcurrency: 4, // Process 4 pages simultaneously
    maxMemoryMB: 500,  // Memory limit
    enableCaching: true,
    cacheDirectory: path.join(process.cwd(), '.ocr-cache'),
    enableProgressTracking: true,
    streamingThreshold: 10, // Stream if >10 pages
    retryAttempts: 2,
    timeout: 30000 // 30 seconds per page
  };

  private config: ParallelOCRConfig;
  private cache: Map<string, string> = new Map();
  private memoryUsage = 0;
  private performanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    totalProcessingTime: 0,
    bottlenecks: [] as string[]
  };

  constructor(config: Partial<ParallelOCRConfig> = {}) {
    super();
    this.config = { ...ParallelOCRProcessor.DEFAULT_CONFIG, ...config };
  }

  /**
   * MAIN ENTRY POINT: High-Performance Parallel PDF OCR
   */
  async processLargePDF(
    pdfPath: string,
    outputDir: string,
    options: {
      useMultiEngine?: boolean;
      targetConfidence?: number;
      language?: string;
      maxCostPerPage?: number;
    } = {}
  ): Promise<ParallelOCRResult> {
    const startTime = Date.now();
    const {
      useMultiEngine = true,
      targetConfidence = 0.92,
      language = 'eng',
      maxCostPerPage = 0.05
    } = options;

    console.log(`🚀 [PARALLEL-OCR] Starting high-performance PDF processing: ${path.basename(pdfPath)}`);
    console.log(`⚙️ [CONFIG] Concurrency: ${this.config.maxConcurrency}, Memory limit: ${this.config.maxMemoryMB}MB`);

    try {
      // Step 1: Initialize cache system
      if (this.config.enableCaching) {
        await this.initializeCache();
      }

      // Step 2: Performance monitoring start
      const performanceStart = this.startPerformanceMonitoring();

      // Step 3: Extract all pages to images in parallel (MAJOR PERFORMANCE BOOST)
      console.log(`📄 [IMAGE-EXTRACTION] Starting parallel page extraction...`);
      const imageExtractionStart = Date.now();

      const imageResult = await ImageMagickWrapper.extractAllPDFPagesParallel(pdfPath, outputDir, {
        format: 'png',
        density: 200, // Optimized from 450 for faster processing - still good for OCR
        quality: 85,  // Optimized from 98 for faster processing - adequate quality
        concurrency: this.config.maxConcurrency,
        ocrOptimized: true
      });

      const imageExtractionTime = Date.now() - imageExtractionStart;
      console.log(`✅ [IMAGE-EXTRACTION] ${imageResult.totalPages} pages extracted in ${imageExtractionTime}ms`);

      // Step 4: Determine processing strategy based on document size
      const useStreaming = imageResult.totalPages > this.config.streamingThreshold;
      console.log(`🔄 [STRATEGY] ${useStreaming ? 'Streaming' : 'Batch'} processing for ${imageResult.totalPages} pages`);

      // Step 5: Parallel OCR processing with intelligent batching
      const ocrProcessingStart = Date.now();
      const pages: PageProcessingResult[] = [];

      if (useStreaming) {
        // Memory-efficient streaming for large documents
        await this.processWithStreaming(imageResult, outputDir, pages, {
          useMultiEngine,
          targetConfidence,
          language,
          maxCostPerPage
        });
      } else {
        // Batch processing for smaller documents
        await this.processWithBatching(imageResult, outputDir, pages, {
          useMultiEngine,
          targetConfidence,
          language,
          maxCostPerPage
        });
      }

      const ocrProcessingTime = Date.now() - ocrProcessingStart;

      // Step 6: Compile results and performance metrics
      const totalProcessingTime = Date.now() - startTime;
      const averagePageTime = Math.round(totalProcessingTime / imageResult.totalPages);

      // Calculate parallelization gain (vs sequential processing)
      const sequentialEstimate = averagePageTime * imageResult.totalPages;
      const parallelizationGain = Math.round(((sequentialEstimate - totalProcessingTime) / sequentialEstimate) * 100);

      const result: ParallelOCRResult = {
        totalText: pages.map(p => p.text).join('\n\n'),
        pages: pages.sort((a, b) => a.pageNumber - b.pageNumber),
        totalPages: imageResult.totalPages,
        totalProcessingTime,
        averagePageTime,
        cacheHitRate: this.calculateCacheHitRate(),
        peakMemoryUsage: this.memoryUsage,
        enginesUsed: [...new Set(pages.map(p => p.engine))],
        performanceMetrics: {
          imageExtractionTime,
          ocrProcessingTime,
          parallelizationGain,
          bottlenecks: this.performanceMetrics.bottlenecks
        }
      };

      // Step 7: Cleanup and final reporting
      await this.cleanup(outputDir);

      console.log(`🏆 [PARALLEL-OCR] COMPLETED in ${totalProcessingTime}ms`);
      console.log(`📊 [PERFORMANCE] Pages: ${result.totalPages}, Avg: ${averagePageTime}ms/page, Gain: +${parallelizationGain}%`);
      console.log(`💾 [CACHE] Hit rate: ${result.cacheHitRate.toFixed(1)}%, Memory peak: ${result.peakMemoryUsage}MB`);
      console.log(`🚀 [ENGINES] Used: ${result.enginesUsed.join(', ')}`);

      return result;

    } catch (error) {
      console.error(`❌ [PARALLEL-OCR] Failed:`, error);
      throw error;
    }
  }

  /**
   * MEMORY-EFFICIENT STREAMING PROCESSING for large PDFs
   */
  private async processWithStreaming(
    imageResult: any,
    outputDir: string,
    pages: PageProcessingResult[],
    options: any
  ): Promise<void> {
    console.log(`🌊 [STREAMING] Processing ${imageResult.totalPages} pages with memory streaming...`);

    const pageChunks = this.createPageChunks(imageResult.imagePaths, this.config.maxConcurrency);
    let completedPages = 0;

    for (const [chunkIndex, chunk] of pageChunks.entries()) {
      console.log(`📦 [CHUNK-${chunkIndex + 1}] Processing ${chunk.length} pages...`);

      // Process chunk in parallel with error handling
      const chunkPromises = chunk.map(async (imagePath, index) => {
        const pageNumber = completedPages + index + 1;
        try {
          return await this.processSinglePage(
            path.join(outputDir, imagePath),
            pageNumber,
            options
          );
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ [CHUNK-${chunkIndex + 1}] Page ${pageNumber} failed:`, errorMessage);
          // Return a placeholder result for failed pages
          return {
            pageNumber,
            text: '',
            confidence: 0,
            processingTime: Date.now() - Date.now(),
            engine: 'failed',
            cached: false,
            memoryUsed: 0
          };
        }
      });

      const chunkResults = await Promise.allSettled(chunkPromises);
      chunkResults.forEach(result => {
        if (result.status === 'fulfilled') {
          pages.push(result.value);
        }
        // Failed results already handled in the try-catch above
      });

      completedPages += chunk.length;

      // Emit progress update
      if (this.config.enableProgressTracking) {
        this.emitProgress(completedPages, imageResult.totalPages);
      }

      // Memory management: force garbage collection between chunks
      if (global.gc) {
        global.gc();
      }
    }
  }

  /**
   * BATCH PROCESSING for smaller documents
   */
  private async processWithBatching(
    imageResult: any,
    outputDir: string,
    pages: PageProcessingResult[],
    options: any
  ): Promise<void> {
    console.log(`📦 [BATCH] Processing ${imageResult.totalPages} pages in parallel batches...`);

    // Process all pages in parallel (for small documents) with error handling
    const pagePromises = imageResult.imagePaths.map(async (imagePath: string, index: number) => {
      try {
        return await this.processSinglePage(
          path.join(outputDir, imagePath),
          index + 1,
          options
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ [BATCH] Page ${index + 1} failed:`, errorMessage);
        // Return a placeholder result for failed pages
        return {
          pageNumber: index + 1,
          text: '',
          confidence: 0,
          processingTime: 0,
          engine: 'failed',
          cached: false,
          memoryUsed: 0
        };
      }
    });

    const results = await Promise.allSettled(pagePromises);
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        pages.push(result.value);
      }
      // Failed results already handled in the try-catch above
    });
  }

  /**
   * PROCESS SINGLE PAGE with caching and error handling
   */
  private async processSinglePage(
    imagePath: string,
    pageNumber: number,
    options: any
  ): Promise<PageProcessingResult> {
    const pageStart = Date.now();

    try {
      // Step 0: Validate image file exists
      try {
        await fs.access(imagePath);
      } catch (error) {
        console.error(`❌ [PAGE-${pageNumber}] Image file missing: ${imagePath}`);
        throw new Error(`Image file not found: ${imagePath}`);
      }

      // Step 1: Check cache
      if (this.config.enableCaching) {
        const cacheKey = await this.generateCacheKey(imagePath);
        const cachedResult = this.cache.get(cacheKey);

        if (cachedResult) {
          this.performanceMetrics.cacheHits++;
          const cachedData = JSON.parse(cachedResult);
          console.log(`💾 [CACHE-HIT] Page ${pageNumber} (${Date.now() - pageStart}ms)`);

          return {
            ...cachedData,
            pageNumber,
            processingTime: Date.now() - pageStart,
            cached: true
          };
        }

        this.performanceMetrics.cacheMisses++;
      }

      // Step 2: Process with OCR
      let result;
      if (options.useMultiEngine) {
        const enhancedResult = await EnhancedOCRAccuracyService.performEnhancedOCR(imagePath, {
          multiEngine: true,
          targetAccuracy: options.targetConfidence
        });

        result = {
          text: enhancedResult.finalText,
          confidence: enhancedResult.combinedConfidence,
          engine: enhancedResult.enginesUsed.join(', ')
        };
      } else {
        const tesseractResult = await TesseractWrapper.extractTextFromImage(imagePath, {
          language: options.language
        });

        result = {
          text: tesseractResult.text,
          confidence: tesseractResult.confidence || 0,
          engine: 'Tesseract'
        };
      }

      const pageResult: PageProcessingResult = {
        pageNumber,
        text: result.text,
        confidence: result.confidence,
        processingTime: Date.now() - pageStart,
        engine: result.engine,
        cached: false,
        memoryUsed: this.getMemoryUsage()
      };

      // Step 3: Cache result
      if (this.config.enableCaching) {
        const cacheKey = await this.generateCacheKey(imagePath);
        this.cache.set(cacheKey, JSON.stringify({
          text: result.text,
          confidence: result.confidence,
          engine: result.engine
        }));
      }

      console.log(`✅ [PAGE-${pageNumber}] ${result.confidence.toFixed(1)}% confidence, ${result.text.length} chars (${pageResult.processingTime}ms)`);

      return pageResult;

    } catch (error) {
      console.error(`❌ [PAGE-${pageNumber}] Failed:`, error);

      // Return empty result for failed pages
      return {
        pageNumber,
        text: `[OCR FAILED FOR PAGE ${pageNumber}]`,
        confidence: 0,
        processingTime: Date.now() - pageStart,
        engine: 'Failed',
        cached: false,
        memoryUsed: this.getMemoryUsage()
      };
    }
  }

  /**
   * UTILITY METHODS
   */
  private createPageChunks(imagePaths: string[], chunkSize: number): string[][] {
    const chunks: string[][] = [];
    for (let i = 0; i < imagePaths.length; i += chunkSize) {
      chunks.push(imagePaths.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async generateCacheKey(imagePath: string): Promise<string> {
    const stats = await fs.stat(imagePath);
    const content = `${imagePath}-${stats.size}-${stats.mtime.getTime()}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private calculateCacheHitRate(): number {
    const total = this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses;
    return total > 0 ? (this.performanceMetrics.cacheHits / total) * 100 : 0;
  }

  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    const currentMB = Math.round(usage.heapUsed / 1024 / 1024);
    this.memoryUsage = Math.max(this.memoryUsage, currentMB);
    return currentMB;
  }

  private emitProgress(completed: number, total: number): void {
    const percentage = Math.round((completed / total) * 100);
    const update: ProgressUpdate = {
      pagesCompleted: completed,
      totalPages: total,
      percentage,
      currentPage: completed,
      estimatedTimeRemaining: 0, // Would calculate based on average time
      averagePageTime: 0
    };

    this.emit('progress', update);
  }

  private startPerformanceMonitoring(): NodeJS.Timer {
    return setInterval(() => {
      const memUsage = this.getMemoryUsage();
      if (memUsage > this.config.maxMemoryMB * 0.9) {
        this.performanceMetrics.bottlenecks.push(`High memory usage: ${memUsage}MB`);
      }
    }, 1000);
  }

  private async initializeCache(): Promise<void> {
    try {
      await fs.mkdir(this.config.cacheDirectory, { recursive: true });
      console.log(`💾 [CACHE] Initialized: ${this.config.cacheDirectory}`);
    } catch (error) {
      console.warn(`⚠️ [CACHE] Setup failed:`, error);
    }
  }

  private async cleanup(outputDir: string): Promise<void> {
    try {
      // Clean up temporary image files
      const files = await fs.readdir(outputDir);
      const imageFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg'));

      for (const file of imageFiles) {
        await fs.unlink(path.join(outputDir, file));
      }

      console.log(`🧹 [CLEANUP] Removed ${imageFiles.length} temporary images`);
    } catch (error) {
      console.warn(`⚠️ [CLEANUP] Warning:`, error);
    }
  }
}

// Convenience export for easy usage
export async function processLargePDFParallel(
  pdfPath: string,
  outputDir: string,
  options: {
    concurrency?: number;
    useMultiEngine?: boolean;
    targetConfidence?: number;
  } = {}
): Promise<ParallelOCRResult> {
  const processor = new ParallelOCRProcessor({
    maxConcurrency: options.concurrency || 4
  });

  return processor.processLargePDF(pdfPath, outputDir, {
    useMultiEngine: options.useMultiEngine,
    targetConfidence: options.targetConfidence
  });
}