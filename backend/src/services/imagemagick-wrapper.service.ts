import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

/**
 * ImageMagick Wrapper Service
 * Professional-grade image processing for PDFCraft.Pro
 */
export class ImageMagickWrapper {
  private static readonly IMAGEMAGICK_PATHS = [
    process.env.IMAGEMAGICK_PATH,
    'magick.exe',
    'magick',
    'C:\\Program Files\\ImageMagick\\magick.exe'
  ].filter(Boolean);

  private static readonly TIMEOUT = 120000; // 2 minutes

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
   * Create optimized image from PDF page
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
    } = {}
  ): Promise<string> {
    const {
      format = 'png',
      density = 300,
      quality = 95,
      maxWidth = 1920,
      maxHeight = 1080
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

    // Build command for PDF page extraction
    const args = [
      '-density', density.toString(),
      `${inputPath}[${pageNumber - 1}]`, // ImageMagick uses 0-based page indexing
      '-background', 'white',
      '-alpha', 'remove',
      '-resize', `${maxWidth}x${maxHeight}>`, // Maintain aspect ratio, don't upscale
      '-quality', quality.toString(),
      outputPath
    ];

    console.log(`🔧 [IMAGEMAGICK] Extracting PDF page ${pageNumber} as ${format.toUpperCase()}...`);

    try {
      await this.executeImageMagick(magickPath, args);
      console.log(`✅ [IMAGEMAGICK] Page extraction completed: ${outputFilename}`);
      return outputFilename;
    } catch (error) {
      console.error(`❌ [IMAGEMAGICK] Page extraction failed:`, error);
      throw new Error(`PDF page extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      // Set timeout
      const timeoutId = setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error(`ImageMagick process timeout after ${timeout}ms`));
      }, timeout);

      process.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }
}