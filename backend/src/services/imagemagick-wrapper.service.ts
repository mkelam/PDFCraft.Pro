import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

/**
 * ImageMagick Wrapper Service
 * Professional-grade image processing for pdflab.pro
 */
export class ImageMagickWrapper {
  private static readonly IMAGEMAGICK_PATHS = [
    process.env.IMAGEMAGICK_PATH,
    'magick.exe',
    'magick',
    'C:\\Program Files\\ImageMagick\\magick.exe'
  ].filter(Boolean);

  private static readonly TIMEOUT = 30000; // 30 seconds - more reasonable for simple operations

  /**
   * Check if ImageMagick is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const magickPath = await this.findImageMagick();
      return !!magickPath;
    } catch {
      return false;
    }
  }

  /**
   * Get ImageMagick installation info
   */
  static async getInstallationInfo(): Promise<{
    available: boolean;
    path?: string;
    version?: string;
    error?: string;
  }> {
    try {
      const magickPath = await this.findImageMagick();

      if (!magickPath) {
        return {
          available: false,
          error: 'ImageMagick not found. Please install from https://imagemagick.org/script/download.php'
        };
      }

      // Get version
      try {
        const version = await this.getVersion(magickPath);
        return {
          available: true,
          path: magickPath,
          version: version || 'Version detection failed'
        };
      } catch (error) {
        return {
          available: true,
          path: magickPath,
          error: `Version detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }

    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert image format with quality optimization
   */
  static async convertImage(
    inputPath: string,
    outputPath: string,
    options: {
      format?: 'png' | 'jpeg' | 'webp' | 'tiff';
      quality?: number;
      resize?: { width?: number; height?: number; maintainAspect?: boolean };
      optimize?: boolean;
    } = {}
  ): Promise<void> {
    const {
      format = 'png',
      quality = 95,
      resize,
      optimize = true
    } = options;

    const magickPath = await this.findImageMagick();
    if (!magickPath) {
      throw new Error('ImageMagick not available');
    }

    // Build ImageMagick command
    const args = [inputPath];

    // Add resize if specified
    if (resize) {
      const { width, height, maintainAspect = true } = resize;
      if (width && height) {
        args.push('-resize', maintainAspect ? `${width}x${height}>` : `${width}x${height}!`);
      } else if (width) {
        args.push('-resize', `${width}x`);
      } else if (height) {
        args.push('-resize', `x${height}`);
      }
    }

    // Add quality settings
    if (format === 'jpeg') {
      args.push('-quality', quality.toString());
    } else if (format === 'png' && optimize) {
      args.push('-define', 'png:compression-filter=5');
      args.push('-define', 'png:compression-level=9');
      args.push('-define', 'png:compression-strategy=1');
    } else if (format === 'webp') {
      args.push('-quality', quality.toString());
      args.push('-define', 'webp:lossless=false');
    }

    // Add optimization
    if (optimize) {
      args.push('-strip'); // Remove metadata
      args.push('-interlace', 'Plane'); // Progressive loading
    }

    args.push(outputPath);

    console.log(`🔧 [IMAGEMAGICK] Converting image: ${path.basename(inputPath)} → ${format.toUpperCase()}`);

    try {
      await this.executeImageMagick(magickPath, args);
      console.log(`✅ [IMAGEMAGICK] Conversion completed: ${path.basename(outputPath)}`);
    } catch (error) {
      console.error(`❌ [IMAGEMAGICK] Conversion failed:`, error);
      throw new Error(`ImageMagick conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create optimized high-DPI image from PDF page with advanced settings
   */
  static async extractPDFPageAsImage(
    inputPath: string,
    outputDir: string,
    pageNumber: number,
    options: {
      format?: 'png' | 'jpeg';
      density?: number;
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      colorSpace?: string;
      antialiasing?: boolean;
      sharpening?: boolean;
    } = {}
  ): Promise<string> {
    const {
      format = 'png',
      density = 300,
      quality = 95,
      maxWidth = 1920,
      maxHeight = 1080,
      colorSpace = 'sRGB',
      antialiasing = true,
      sharpening = false
    } = options;

    const magickPath = await this.findImageMagick();
    if (!magickPath) {
      throw new Error('ImageMagick not available');
    }

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const outputBasename = path.basename(inputPath, '.pdf');
    const outputFilename = `${outputBasename}_page_${pageNumber}.${format}`;
    const outputPath = path.join(outputDir, outputFilename);

    // Build enhanced command for publication-quality PDF page extraction
    const args = [
      '-density', density.toString(),
      '-colorspace', colorSpace,
      `${inputPath}[${pageNumber - 1}]`, // ImageMagick uses 0-based page indexing
      '-background', 'white',
      '-alpha', 'remove'
    ];

    // Add anti-aliasing for crisp text
    if (antialiasing) {
      args.push('-antialias');
    }

    // Add sharpening for enhanced detail
    if (sharpening) {
      args.push('-unsharp', '0x1+1.0+0.05');
    }

    // High-quality resize with aspect ratio preservation
    args.push('-resize', `${maxWidth}x${maxHeight}>`);

    // Format-specific optimizations
    if (format === 'png') {
      // PNG optimization for publication quality
      args.push('-define', 'png:compression-filter=5');
      args.push('-define', 'png:compression-level=9');
      args.push('-define', 'png:compression-strategy=1');
      args.push('-strip'); // Remove metadata for smaller file size
    } else if (format === 'jpeg') {
      // JPEG optimization
      args.push('-strip');
      args.push('-interlace', 'Plane'); // Progressive JPEG
    }

    args.push('-quality', quality.toString());
    args.push(outputPath);

    console.log(`🔧 [IMAGEMAGICK] Extracting HIGH-DPI PDF page ${pageNumber} @ ${density}DPI (${format.toUpperCase()}, ${colorSpace})...`);

    try {
      await this.executeImageMagick(magickPath, args);
      console.log(`✅ [IMAGEMAGICK] High-DPI extraction completed: ${outputFilename} (${density}DPI)`);
      return outputFilename;
    } catch (error) {
      console.error(`❌ [IMAGEMAGICK] High-DPI extraction failed:`, error);
      throw new Error(`PDF page extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * PARALLEL PROCESSING: Extract ALL pages from PDF simultaneously
   * Processes 4-8 pages concurrently for maximum performance
   */
  static async extractAllPDFPagesParallel(
    inputPath: string,
    outputDir: string,
    options: {
      format?: 'png' | 'jpeg';
      density?: number;
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      concurrency?: number;
      ocrOptimized?: boolean;
    } = {}
  ): Promise<{
    imagePaths: string[];
    totalPages: number;
    processingTime: number;
    concurrencyUsed: number;
    averagePageTime: number;
  }> {
    const startTime = Date.now();
    const {
      format = 'png',
      density = 200, // Reduced from 450 for faster processing - still good for OCR
      quality = 85,  // Reduced from 98 for faster processing - adequate quality
      maxWidth = 2000, // Reduced from 3000 for faster processing
      maxHeight = 2000, // Reduced from 3000 for faster processing
      concurrency = 4, // Process 4 pages simultaneously
      ocrOptimized = true
    } = options;

    const magickPath = await this.findImageMagick();
    if (!magickPath) {
      throw new Error('ImageMagick not available');
    }

    await fs.mkdir(outputDir, { recursive: true });

    console.log(`🚀 [PARALLEL-IMAGEMAGICK] Starting parallel PDF page extraction @ ${density}DPI (${concurrency} concurrent)...`);

    try {
      // Step 1: Get total page count efficiently
      const pageCountResult = await this.executeImageMagick(magickPath, [
        '-ping',
        inputPath,
        '-format', '%n\n',
        'info:'
      ]);

      const totalPages = parseInt(pageCountResult.stdout.trim()) || 1;
      console.log(`📄 [PARALLEL] Detected ${totalPages} pages - processing with ${concurrency} concurrent workers`);

      const outputBasename = path.basename(inputPath, '.pdf');
      const imagePaths: string[] = [];

      // Step 2: Create page processing chunks for parallel execution
      const pageChunks: number[][] = [];
      for (let i = 0; i < totalPages; i += concurrency) {
        const chunk = Array.from(
          { length: Math.min(concurrency, totalPages - i) },
          (_, index) => i + index + 1 // 1-based page numbers
        );
        pageChunks.push(chunk);
      }

      console.log(`🔀 [PARALLEL] Processing ${pageChunks.length} chunks of ${concurrency} pages each`);

      // Step 3: Process chunks in parallel
      const chunkPromises = pageChunks.map(async (chunk, chunkIndex) => {
        const chunkStartTime = Date.now();
        console.log(`📦 [CHUNK-${chunkIndex + 1}] Processing pages: ${chunk.join(', ')}`);

        const chunkImagePaths: string[] = [];

        // Process each page in the chunk concurrently
        const pagePromises = chunk.map(async (pageNum) => {
          const pageStartTime = Date.now();
          const outputFilename = `${outputBasename}_page_${pageNum}.${format}`;
          const outputPath = path.join(outputDir, outputFilename);

          // Build optimized command for single page with memory limits
          const args = [
            '-limit', 'memory', '256MB', // Limit memory usage
            '-limit', 'map', '512MB',    // Limit memory map
            '-density', density.toString(),
            '-colorspace', 'sRGB',
            `${inputPath}[${pageNum - 1}]`, // 0-based indexing for ImageMagick
            '-background', 'white',
            '-alpha', 'remove',
            '-flatten'
          ];

          if (ocrOptimized) {
            args.push('-contrast-stretch', '0.15x0.05%');
            args.push('-sharpen', '0x1');
          }

          args.push('-antialias');
          args.push('-resize', `${maxWidth}x${maxHeight}>`);

          if (format === 'png') {
            args.push('-define', 'png:compression-filter=5');
            args.push('-define', 'png:compression-level=9');
            args.push('-strip');
          } else {
            args.push('-quality', quality.toString());
            args.push('-strip');
          }

          args.push(outputPath);

          try {
            await this.executeImageMagick(magickPath, args);
            const pageTime = Date.now() - pageStartTime;
            console.log(`  ✅ [PAGE-${pageNum}] Completed in ${pageTime}ms`);
            return outputFilename;
          } catch (error) {
            console.error(`  ❌ [PAGE-${pageNum}] Failed:`, error);
            throw new Error(`Page ${pageNum} extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        // Wait for all pages in chunk to complete with error handling
        const chunkResults = await Promise.allSettled(pagePromises);
        const successfulPaths: string[] = [];

        chunkResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successfulPaths.push((result as PromiseFulfilledResult<string>).value);
          } else {
            const pageNum = chunk[index];
            console.error(`❌ [CHUNK-${chunkIndex + 1}] Page ${pageNum} failed:`, result.reason?.message);
          }
        });

        chunkImagePaths.push(...successfulPaths);

        const chunkTime = Date.now() - chunkStartTime;
        console.log(`✅ [CHUNK-${chunkIndex + 1}] Completed ${successfulPaths.length}/${chunk.length} pages in ${chunkTime}ms (${Math.round(chunkTime / Math.max(chunk.length, 1))}ms/page)`);

        return chunkImagePaths;
      });

      // Wait for all chunks to complete with error handling
      const allChunkResults = await Promise.allSettled(chunkPromises);
      allChunkResults.forEach(result => {
        if (result.status === 'fulfilled') {
          imagePaths.push(...(result as PromiseFulfilledResult<string[]>).value);
        } else {
          console.error(`❌ [PARALLEL] Chunk failed:`, result.reason?.message);
        }
      });

      // Step 4: Verify all images were created
      const verifiedPaths: string[] = [];
      for (const imagePath of imagePaths) {
        const fullPath = path.join(outputDir, imagePath);
        try {
          await fs.access(fullPath);
          verifiedPaths.push(imagePath);
        } catch {
          console.warn(`⚠️ [VERIFICATION] Missing: ${imagePath}`);
        }
      }

      const totalProcessingTime = Date.now() - startTime;
      const averagePageTime = Math.round(totalProcessingTime / totalPages);

      console.log(`🏆 [PARALLEL-COMPLETE] Extracted ${verifiedPaths.length}/${totalPages} pages in ${totalProcessingTime}ms`);
      console.log(`⚡ [PERFORMANCE] Average: ${averagePageTime}ms/page with ${concurrency}x parallelization`);

      return {
        imagePaths: verifiedPaths,
        totalPages,
        processingTime: totalProcessingTime,
        concurrencyUsed: concurrency,
        averagePageTime
      };

    } catch (error) {
      console.error(`❌ [PARALLEL-IMAGEMAGICK] Failed:`, error);
      throw new Error(`Parallel PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize image for web/presentation use
   */
  static async optimizeForPresentation(
    inputPath: string,
    outputPath: string,
    maxSizeKB: number = 500
  ): Promise<void> {
    const magickPath = await this.findImageMagick();
    if (!magickPath) {
      throw new Error('ImageMagick not available');
    }

    // Start with high quality and reduce if needed
    let quality = 95;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const tempPath = `${outputPath}.tmp`;

      const args = [
        inputPath,
        '-resize', '1920x1080>', // Max presentation size
        '-quality', quality.toString(),
        '-strip',
        '-interlace', 'Plane',
        tempPath
      ];

      try {
        await this.executeImageMagick(magickPath, args);

        // Check file size
        const stats = await fs.stat(tempPath);
        const sizeKB = stats.size / 1024;

        if (sizeKB <= maxSizeKB || quality <= 60) {
          // Size is acceptable or we've reached minimum quality
          await fs.rename(tempPath, outputPath);
          console.log(`✅ [IMAGEMAGICK] Optimized to ${Math.round(sizeKB)}KB (quality: ${quality})`);
          return;
        }

        // Remove temp file and try with lower quality
        await fs.unlink(tempPath);
        quality -= 10;
        attempts++;

      } catch (error) {
        // Clean up temp file if it exists
        try {
          await fs.unlink(tempPath);
        } catch {}
        throw error;
      }
    }

    throw new Error(`Could not optimize image to under ${maxSizeKB}KB`);
  }

  /**
   * Find ImageMagick executable
   */
  private static async findImageMagick(): Promise<string | null> {
    for (const magickPath of this.IMAGEMAGICK_PATHS) {
      if (!magickPath) continue;

      try {
        // For relative paths, try to execute to see if in PATH
        if (!path.isAbsolute(magickPath)) {
          await this.executeImageMagick(magickPath, ['--version'], 5000);
          return magickPath;
        } else {
          // For absolute paths, check if file exists
          await fs.access(magickPath);
          return magickPath;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Get ImageMagick version
   */
  private static async getVersion(magickPath: string): Promise<string | null> {
    try {
      const result = await this.executeImageMagick(magickPath, ['--version'], 5000);
      const lines = result.stdout.split('\n');
      const versionLine = lines.find(line => line.includes('Version:'));
      return versionLine ? versionLine.trim() : result.stdout.split('\n')[0].trim();
    } catch {
      return null;
    }
  }

  /**
   * Execute ImageMagick command
   */
  static async executeImageMagick(
    magickPath: string,
    args: string[],
    timeout: number = this.TIMEOUT
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      let isResolved = false;
      let timeoutId: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      const safeResolve = (result: { stdout: string; stderr: string }) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve(result);
        }
      };

      const safeReject = (error: Error) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(error);
        }
      };

      console.log(`🔧 [IMAGEMAGICK] Executing: ${magickPath} ${args.join(' ')}`);
      console.log(`⏰ [IMAGEMAGICK] Process timeout: ${timeout}ms`);

      const process = spawn(magickPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        shell: false
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        console.log(`🔧 [IMAGEMAGICK] Process closed with code: ${code}`);
        if (code === 0) {
          safeResolve({ stdout, stderr });
        } else {
          safeReject(new Error(`ImageMagick process failed with code ${code}: ${stderr || 'No stderr output'}`));
        }
      });

      process.on('error', (error) => {
        console.error(`❌ [IMAGEMAGICK] Process error:`, error.message);
        safeReject(new Error(`ImageMagick process error: ${error.message}`));
      });

      process.on('exit', (code, signal) => {
        console.log(`🔧 [IMAGEMAGICK] Process exited with code: ${code}, signal: ${signal}`);
      });

      // Set timeout with forced cleanup
      timeoutId = setTimeout(() => {
        console.warn(`⏰ [IMAGEMAGICK] Process timeout after ${timeout}ms, killing...`);

        // First try graceful termination
        process.kill('SIGTERM');

        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (!process.killed) {
            console.warn(`🔪 [IMAGEMAGICK] Force killing process...`);
            process.kill('SIGKILL');
          }
        }, 5000);

        safeReject(new Error(`ImageMagick process timeout after ${timeout}ms`));
      }, timeout);

      // Handle early process termination
      process.on('spawn', () => {
        console.log(`🚀 [IMAGEMAGICK] Process spawned successfully`);
      });
    });
  }
}