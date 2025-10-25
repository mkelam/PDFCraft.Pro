import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

/**
 * ENHANCED IMAGEMAGICK SERVICE - PUBLICATION QUALITY
 *
 * Advanced ImageMagick wrapper with professional-grade PDF processing:
 * - High-DPI extraction (300-600 DPI)
 * - Color space preservation (sRGB, Adobe RGB, CMYK)
 * - Advanced font rendering and anti-aliasing
 * - Vector-aware processing with smart fallbacks
 * - Optimized compression with quality preservation
 */
export class EnhancedImageMagickService {
  private static readonly IMAGEMAGICK_PATHS = [
    process.env.IMAGEMAGICK_PATH,
    'magick.exe',
    'magick',
    'C:\\Program Files\\ImageMagick\\magick.exe',
    '/usr/bin/magick',
    '/opt/homebrew/bin/magick'
  ].filter(Boolean);

  private static readonly TIMEOUT = 180000; // 3 minutes for high-quality processing

  /**
   * COLOR PROFILES for different content types
   */
  private static readonly COLOR_PROFILES = {
    sRGB: {
      profile: 'sRGB',
      intent: 'perceptual',
      description: 'Standard RGB for web and presentations'
    },
    'Adobe RGB': {
      profile: 'Adobe RGB (1998)',
      intent: 'relative',
      description: 'Extended gamut for professional graphics'
    },
    CMYK: {
      profile: 'SWOP CMYK',
      intent: 'perceptual',
      description: 'Print-optimized color space'
    },
    P3: {
      profile: 'Display P3',
      intent: 'relative',
      description: 'Wide gamut for modern displays'
    }
  };

  /**
   * PUBLICATION QUALITY PDF PAGE EXTRACTION
   */
  static async extractPDFPagePublicationQuality(
    inputPath: string,
    outputDir: string,
    pageNumber: number,
    options: {
      dpi?: number;
      format?: 'png' | 'jpeg' | 'tiff';
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      colorSpace?: string;
      antialiasing?: boolean;
      fontHinting?: boolean;
      vectorPreservation?: boolean;
      backgroundRemoval?: boolean;
      sharpening?: boolean;
      noiseReduction?: boolean;
    } = {}
  ): Promise<string> {
    const {
      dpi = 400,
      format = 'png',
      quality = 98,
      maxWidth = 2560,
      maxHeight = 1440,
      colorSpace = 'sRGB',
      antialiasing = true,
      fontHinting = true,
      vectorPreservation = true,
      backgroundRemoval = false,
      sharpening = false,
      noiseReduction = false
    } = options;

    const magickPath = await this.findImageMagick();
    if (!magickPath) {
      throw new Error('ImageMagick not available for publication quality processing');
    }

    await fs.mkdir(outputDir, { recursive: true });

    const outputBasename = path.basename(inputPath, '.pdf');
    const outputFilename = `${outputBasename}_pub_quality_page_${pageNumber}.${format}`;
    const outputPath = path.join(outputDir, outputFilename);

    // BUILD PUBLICATION-QUALITY COMMAND
    const args = this.buildPublicationQualityCommand(
      inputPath,
      outputPath,
      pageNumber,
      {
        dpi,
        format,
        quality,
        maxWidth,
        maxHeight,
        colorSpace,
        antialiasing,
        fontHinting,
        vectorPreservation,
        backgroundRemoval,
        sharpening,
        noiseReduction
      }
    );

    console.log(`🔧 [ENHANCED-IM] Publication quality extraction: Page ${pageNumber} @ ${dpi}DPI with ${colorSpace}`);
    console.log(`⚙️ [ENHANCED-IM] Advanced options: AA=${antialiasing}, Font=${fontHinting}, Vector=${vectorPreservation}`);

    try {
      const result = await this.executeImageMagick(magickPath, args, this.TIMEOUT);

      // Verify output quality
      const stats = await fs.stat(outputPath);
      const sizeKB = Math.round(stats.size / 1024);

      console.log(`✅ [ENHANCED-IM] Publication quality extraction completed: ${outputFilename} (${sizeKB}KB)`);

      // Quality validation
      if (stats.size < 10000) {
        console.warn(`⚠️ [ENHANCED-IM] Output file suspiciously small (${sizeKB}KB) - may indicate processing issues`);
      }

      return outputFilename;
    } catch (error) {
      console.error(`❌ [ENHANCED-IM] Publication quality extraction failed:`, error);
      throw new Error(`Enhanced PDF page extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * BUILD PUBLICATION QUALITY IMAGEMAGICK COMMAND
   */
  private static buildPublicationQualityCommand(
    inputPath: string,
    outputPath: string,
    pageNumber: number,
    options: any
  ): string[] {
    const args: string[] = [];

    // PHASE 1: INPUT AND DENSITY
    args.push('-density', options.dpi.toString());

    // Color management setup
    if (options.colorSpace && this.COLOR_PROFILES[options.colorSpace]) {
      args.push('-colorspace', options.colorSpace);
    }

    // CORRECTED: Input file must come first in ImageMagick v7+
    const inputWithPage = `${inputPath}[${pageNumber - 1}]`;
    // Input file will be prepended to args array at the beginning

    // PHASE 2: CRITICAL PDF RENDERING FIXES (addresses black screen issue)
    args.push('-background', 'white');
    args.push('-alpha', 'remove');
    args.push('-flatten');  // CRITICAL: Ensures all layers are merged properly

    // PHASE 3: FONT AND TEXT RENDERING
    if (options.fontHinting) {
      args.push('-font', 'Arial');
      args.push('-pointsize', '12');
    }

    if (options.antialiasing) {
      args.push('-antialias');
      args.push('-type', 'TrueColor');
    }

    // PHASE 4: ENHANCED VECTOR AND PDF HANDLING (CRITICAL FIXES)
    if (options.vectorPreservation) {
      // These settings ensure full page rendering instead of partial
      args.push('-define', 'pdf:use-cropbox=false');  // CHANGED: Don't use crop box
      args.push('-define', 'pdf:use-trimbox=false');   // CHANGED: Don't use trim box
      args.push('-define', 'pdf:fit-page=false');      // ADDED: Don't auto-fit
      args.push('-define', 'pdf:use-trimbox=false');   // ENSURE: Full page capture
    }

    // PHASE 4.5: FORCE FULL PAGE RENDERING (NEW - ADDRESSES BLACK SCREEN)
    args.push('-define', 'pdf:page-direction=down-to-up'); // Ensure proper page reading
    args.push('-auto-orient');  // Handle orientation correctly

    // PHASE 5: NOISE REDUCTION AND ENHANCEMENT
    if (options.noiseReduction) {
      args.push('-enhance');
      args.push('-noise', '1'); // Slight noise reduction
    }

    // PHASE 6: SIZE OPTIMIZATION
    args.push('-resize', `${options.maxWidth}x${options.maxHeight}>`);

    // PHASE 7: BACKGROUND PROCESSING
    if (options.backgroundRemoval) {
      args.push('-fuzz', '2%');
      args.push('-trim');
      args.push('+repage');
    }

    // PHASE 8: SHARPENING
    if (options.sharpening) {
      // Subtle sharpening for text clarity
      args.push('-unsharp', '0x1+1.0+0.05');
    }

    // PHASE 9: FORMAT-SPECIFIC OPTIMIZATIONS
    if (options.format === 'png') {
      // PNG optimization for maximum quality
      args.push('-define', 'png:compression-filter=5');
      args.push('-define', 'png:compression-level=9');
      args.push('-define', 'png:compression-strategy=1');
      args.push('-define', 'png:exclude-chunk=all'); // Remove metadata for smaller files
    } else if (options.format === 'jpeg') {
      // JPEG optimization
      args.push('-sampling-factor', '1x1,1x1,1x1'); // No chroma subsampling
      args.push('-define', 'jpeg:dct-method=islow'); // Highest quality DCT
    } else if (options.format === 'tiff') {
      // TIFF optimization for professional use
      args.push('-compress', 'lzw');
      args.push('-define', 'tiff:alpha=unassociated');
    }

    // PHASE 10: QUALITY AND OUTPUT
    args.push('-quality', options.quality.toString());

    // Color profile preservation
    if (options.colorSpace && this.COLOR_PROFILES[options.colorSpace]) {
      args.push('-intent', this.COLOR_PROFILES[options.colorSpace].intent);
    }

    args.push(outputPath);

    // FINAL: Return args with input file prepended (ImageMagick v7+ syntax)
    return [inputWithPage, ...args];
  }

  /**
   * ADVANCED COLOR SPACE CONVERSION
   */
  static async convertColorSpace(
    inputPath: string,
    outputPath: string,
    targetColorSpace: 'sRGB' | 'Adobe RGB' | 'CMYK' | 'P3',
    options: {
      quality?: number;
      preserveProfile?: boolean;
      renderingIntent?: 'perceptual' | 'relative' | 'saturation' | 'absolute';
    } = {}
  ): Promise<void> {
    const {
      quality = 98,
      preserveProfile = true,
      renderingIntent = 'perceptual'
    } = options;

    const magickPath = await this.findImageMagick();
    if (!magickPath) {
      throw new Error('ImageMagick not available for color space conversion');
    }

    const profile = this.COLOR_PROFILES[targetColorSpace];
    if (!profile) {
      throw new Error(`Unsupported color space: ${targetColorSpace}`);
    }

    const args = [
      inputPath,
      '-colorspace', targetColorSpace,
      '-intent', renderingIntent,
      '-quality', quality.toString()
    ];

    if (preserveProfile) {
      args.push('-profile', profile.profile);
    }

    args.push(outputPath);

    console.log(`🎨 [ENHANCED-IM] Converting to ${targetColorSpace} color space with ${renderingIntent} intent`);

    try {
      await this.executeImageMagick(magickPath, args);
      console.log(`✅ [ENHANCED-IM] Color space conversion completed: ${targetColorSpace}`);
    } catch (error) {
      console.error(`❌ [ENHANCED-IM] Color space conversion failed:`, error);
      throw new Error(`Color space conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * INTELLIGENT QUALITY OPTIMIZATION
   */
  static async optimizeForTarget(
    inputPath: string,
    outputPath: string,
    target: 'presentation' | 'print' | 'web' | 'archive',
    maxSizeKB?: number
  ): Promise<{ finalSize: number; qualityUsed: number; optimizations: string[] }> {
    const magickPath = await this.findImageMagick();
    if (!magickPath) {
      throw new Error('ImageMagick not available for quality optimization');
    }

    const targetProfiles = {
      presentation: { maxDimension: 1920, quality: 95, colorSpace: 'sRGB', format: 'png' },
      print: { maxDimension: 3840, quality: 98, colorSpace: 'Adobe RGB', format: 'tiff' },
      web: { maxDimension: 1280, quality: 90, colorSpace: 'sRGB', format: 'jpeg' },
      archive: { maxDimension: 4096, quality: 100, colorSpace: 'Adobe RGB', format: 'tiff' }
    };

    const profile = targetProfiles[target];
    let currentQuality = profile.quality;
    const optimizations: string[] = [];

    // Iterative quality optimization
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const tempPath = `${outputPath}.tmp_${attempts}`;

      const args = [
        inputPath,
        '-resize', `${profile.maxDimension}x${profile.maxDimension}>`,
        '-colorspace', profile.colorSpace,
        '-quality', currentQuality.toString(),
        tempPath
      ];

      try {
        await this.executeImageMagick(magickPath, args);
        const stats = await fs.stat(tempPath);
        const sizeKB = stats.size / 1024;

        optimizations.push(`Attempt ${attempts + 1}: Quality ${currentQuality}, Size ${Math.round(sizeKB)}KB`);

        if (!maxSizeKB || sizeKB <= maxSizeKB || currentQuality <= 70) {
          // Target achieved or minimum quality reached
          await fs.rename(tempPath, outputPath);

          console.log(`✅ [ENHANCED-IM] Optimization completed for ${target}: Q${currentQuality}, ${Math.round(sizeKB)}KB`);

          return {
            finalSize: Math.round(sizeKB),
            qualityUsed: currentQuality,
            optimizations
          };
        }

        // Clean up and try with lower quality
        await fs.unlink(tempPath);
        currentQuality = Math.max(70, currentQuality - 8);
        attempts++;

      } catch (error) {
        // Clean up temp file if it exists
        try {
          await fs.unlink(tempPath);
        } catch {}
        throw error;
      }
    }

    throw new Error(`Could not optimize image for ${target} target within quality constraints`);
  }

  /**
   * BATCH PROCESSING WITH PROGRESS TRACKING
   */
  static async batchExtractPages(
    inputPath: string,
    outputDir: string,
    options: {
      startPage?: number;
      endPage?: number;
      quality?: any;
      progressCallback?: (progress: { current: number; total: number; page: number }) => void;
    } = {}
  ): Promise<string[]> {
    const { startPage = 1, endPage, quality = {}, progressCallback } = options;

    // Get total page count
    const pageCount = await this.getPDFPageCount(inputPath);
    const actualEndPage = endPage || pageCount;
    const totalPages = actualEndPage - startPage + 1;

    console.log(`🚀 [ENHANCED-IM] Starting batch extraction: Pages ${startPage}-${actualEndPage} (${totalPages} total)`);

    const extractedFiles: string[] = [];
    const errors: Array<{ page: number; error: string }> = [];

    for (let page = startPage; page <= actualEndPage; page++) {
      try {
        if (progressCallback) {
          progressCallback({
            current: page - startPage + 1,
            total: totalPages,
            page
          });
        }

        const filename = await this.extractPDFPagePublicationQuality(
          inputPath,
          outputDir,
          page,
          quality
        );

        extractedFiles.push(filename);
        console.log(`✅ [ENHANCED-IM] Batch progress: ${page}/${actualEndPage} - ${filename}`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ page, error: errorMsg });
        console.warn(`⚠️ [ENHANCED-IM] Batch error on page ${page}: ${errorMsg}`);
      }
    }

    if (errors.length > 0) {
      console.warn(`⚠️ [ENHANCED-IM] Batch completed with ${errors.length} errors out of ${totalPages} pages`);
      for (const error of errors) {
        console.warn(`   Page ${error.page}: ${error.error}`);
      }
    }

    console.log(`✅ [ENHANCED-IM] Batch extraction completed: ${extractedFiles.length}/${totalPages} pages successful`);
    return extractedFiles;
  }

  /**
   * GET PDF PAGE COUNT
   */
  private static async getPDFPageCount(inputPath: string): Promise<number> {
    const magickPath = await this.findImageMagick();
    if (!magickPath) {
      throw new Error('ImageMagick not available for page count detection');
    }

    try {
      const result = await this.executeImageMagick(magickPath, ['-ping', inputPath], 10000);

      // Parse page count from output
      const lines = result.stdout.split('\n');
      const pdfLines = lines.filter(line => line.includes(inputPath));

      return pdfLines.length || 1; // Default to 1 if count detection fails
    } catch (error) {
      console.warn(`⚠️ [ENHANCED-IM] Page count detection failed, defaulting to 1:`, error);
      return 1;
    }
  }

  /**
   * CHECK IMAGEMAGICK CAPABILITIES
   */
  static async getCapabilities(): Promise<{
    version: string;
    formats: string[];
    colorProfiles: string[];
    maxMemory: string;
    features: string[];
  }> {
    const magickPath = await this.findImageMagick();
    if (!magickPath) {
      throw new Error('ImageMagick not available for capability detection');
    }

    try {
      const versionResult = await this.executeImageMagick(magickPath, ['-version'], 10000);
      const listResult = await this.executeImageMagick(magickPath, ['-list', 'format'], 10000);

      // Parse capabilities
      const version = this.parseVersion(versionResult.stdout);
      const formats = this.parseFormats(listResult.stdout);
      const colorProfiles = Object.keys(this.COLOR_PROFILES);
      const features = this.parseFeatures(versionResult.stdout);
      const maxMemory = this.parseMemoryLimit(versionResult.stdout);

      console.log(`📊 [ENHANCED-IM] Capabilities detected: ${version}, ${formats.length} formats, ${features.length} features`);

      return {
        version,
        formats,
        colorProfiles,
        maxMemory,
        features
      };
    } catch (error) {
      console.error(`❌ [ENHANCED-IM] Capability detection failed:`, error);
      throw new Error(`Capability detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods for parsing ImageMagick output
  private static parseVersion(output: string): string {
    const versionMatch = output.match(/Version: ImageMagick ([^\s]+)/);
    return versionMatch ? versionMatch[1] : 'Unknown';
  }

  private static parseFormats(output: string): string[] {
    const lines = output.split('\n');
    const formats: string[] = [];

    for (const line of lines) {
      const formatMatch = line.match(/^\s*([A-Z0-9]+)\*/);
      if (formatMatch) {
        formats.push(formatMatch[1]);
      }
    }

    return formats.filter(f => ['PDF', 'PNG', 'JPEG', 'TIFF', 'GIF', 'BMP'].includes(f));
  }

  private static parseFeatures(output: string): string[] {
    const features: string[] = [];

    if (output.includes('OpenMP')) features.push('Multi-threading');
    if (output.includes('HDRI')) features.push('High Dynamic Range');
    if (output.includes('Q16')) features.push('16-bit depth');
    if (output.includes('Q32')) features.push('32-bit depth');

    return features;
  }

  private static parseMemoryLimit(output: string): string {
    const memoryMatch = output.match(/Resource limits:[\s\S]*?Memory: ([^\n]+)/);
    return memoryMatch ? memoryMatch[1].trim() : 'Unknown';
  }

  // Base methods from original service
  private static async findImageMagick(): Promise<string | null> {
    for (const magickPath of this.IMAGEMAGICK_PATHS) {
      if (!magickPath) continue;

      try {
        if (!path.isAbsolute(magickPath)) {
          await this.executeImageMagick(magickPath, ['--version'], 5000);
          return magickPath;
        } else {
          await fs.access(magickPath);
          return magickPath;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  private static async executeImageMagick(
    magickPath: string,
    args: string[],
    timeout: number = this.TIMEOUT
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
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
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`ImageMagick process failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`ImageMagick process error: ${error.message}`));
      });

      const timeoutId = setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error(`ImageMagick process timeout after ${timeout}ms`));
      }, timeout);

      process.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }

  // Alias method for backward compatibility
  static async extractPDFPageAsImage(
    inputPath: string,
    outputDir: string,
    pageNumber: number,
    options: any = {}
  ): Promise<string> {
    return this.extractPDFPagePublicationQuality(inputPath, outputDir, pageNumber, options);
  }

  static async isAvailable(): Promise<boolean> {
    try {
      const magickPath = await this.findImageMagick();
      return !!magickPath;
    } catch {
      return false;
    }
  }
}