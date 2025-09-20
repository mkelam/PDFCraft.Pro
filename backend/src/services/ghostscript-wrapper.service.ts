import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

/**
 * Ghostscript Wrapper Service
 * Advanced PDF processing capabilities for PDFCraft.Pro
 */
export class GhostscriptWrapper {
  private static readonly GHOSTSCRIPT_PATHS = [
    process.env.GHOSTSCRIPT_PATH,
    'C:\\Program Files\\gs\\gs10.03.0\\bin\\gswin64c.exe',
    'C:\\Program Files (x86)\\gs\\gs10.03.0\\bin\\gswin32c.exe',
    'C:\\gs\\gs10.03.0\\bin\\gswin64c.exe',
    'gswin64c.exe', // If in PATH
    'gswin32c.exe', // If in PATH
    'gs.exe'        // If in PATH
  ].filter(Boolean);

  private static readonly TIMEOUT = 60000; // 60 seconds

  /**
   * Check if Ghostscript is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const gsPath = await this.findGhostscript();
      return !!gsPath;
    } catch {
      return false;
    }
  }

  /**
   * Get Ghostscript installation info
   */
  static async getInstallationInfo(): Promise<{
    available: boolean;
    path?: string;
    version?: string;
    error?: string;
  }> {
    try {
      const gsPath = await this.findGhostscript();

      if (!gsPath) {
        return {
          available: false,
          error: 'Ghostscript not found. Please install from https://www.ghostscript.com/download/gsdnld.html'
        };
      }

      // Get version
      try {
        const version = await this.getVersion(gsPath);
        return {
          available: true,
          path: gsPath,
          version: version || 'Version detection failed'
        };
      } catch (error) {
        return {
          available: true,
          path: gsPath,
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
   * Convert PDF to high-quality images
   */
  static async convertPDFToImages(
    inputPath: string,
    outputDir: string,
    options: {
      format?: 'png' | 'jpeg' | 'tiff';
      resolution?: number;
      quality?: number;
      startPage?: number;
      endPage?: number;
    } = {}
  ): Promise<string[]> {
    const {
      format = 'png',
      resolution = 300,
      quality = 95,
      startPage,
      endPage
    } = options;

    const gsPath = await this.findGhostscript();
    if (!gsPath) {
      throw new Error('Ghostscript not available');
    }

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const outputBasename = path.basename(inputPath, '.pdf');
    const outputPattern = path.join(outputDir, `${outputBasename}_%03d.${format}`);

    // Build Ghostscript command
    const args = [
      '-dNOPAUSE',
      '-dBATCH',
      '-dSAFER',
      `-sDEVICE=${format === 'png' ? 'png16m' : format === 'jpeg' ? 'jpeg' : 'tiff24nc'}`,
      `-r${resolution}`,
      `-sOutputFile=${outputPattern}`
    ];

    if (format === 'jpeg') {
      args.push(`-dJPEGQ=${quality}`);
    }

    if (startPage) {
      args.push(`-dFirstPage=${startPage}`);
    }

    if (endPage) {
      args.push(`-dLastPage=${endPage}`);
    }

    args.push(inputPath);

    console.log(`🔧 [GHOSTSCRIPT] Converting PDF to ${format.toUpperCase()} images...`);
    console.log(`🔧 [GHOSTSCRIPT] Command: "${gsPath}" ${args.join(' ')}`);

    try {
      await this.executeGhostscript(gsPath, args);

      // Find generated files
      const files = await fs.readdir(outputDir);
      const generatedFiles = files
        .filter(file => file.startsWith(outputBasename) && file.endsWith(`.${format}`))
        .map(file => path.join(outputDir, file));

      console.log(`✅ [GHOSTSCRIPT] Generated ${generatedFiles.length} image files`);
      return generatedFiles;

    } catch (error) {
      console.error(`❌ [GHOSTSCRIPT] Conversion failed:`, error);
      throw new Error(`Ghostscript conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize PDF for faster processing
   */
  static async optimizePDF(inputPath: string, outputPath: string): Promise<void> {
    const gsPath = await this.findGhostscript();
    if (!gsPath) {
      throw new Error('Ghostscript not available');
    }

    const args = [
      '-dNOPAUSE',
      '-dBATCH',
      '-dSAFER',
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      '-dPDFSETTINGS=/prepress',
      '-dEmbedAllFonts=true',
      '-dSubsetFonts=true',
      '-dColorImageDownsampleType=/Bicubic',
      '-dColorImageResolution=300',
      '-dGrayImageDownsampleType=/Bicubic',
      '-dGrayImageResolution=300',
      '-dMonoImageDownsampleType=/Bicubic',
      '-dMonoImageResolution=1200',
      `-sOutputFile=${outputPath}`,
      inputPath
    ];

    console.log(`🔧 [GHOSTSCRIPT] Optimizing PDF for processing...`);

    try {
      await this.executeGhostscript(gsPath, args);
      console.log(`✅ [GHOSTSCRIPT] PDF optimization completed`);
    } catch (error) {
      console.error(`❌ [GHOSTSCRIPT] Optimization failed:`, error);
      throw new Error(`PDF optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get PDF information
   */
  static async getPDFInfo(inputPath: string): Promise<{
    pageCount: number;
    title?: string;
    author?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
  }> {
    const gsPath = await this.findGhostscript();
    if (!gsPath) {
      throw new Error('Ghostscript not available');
    }

    const args = [
      '-dNODISPLAY',
      '-dBATCH',
      '-dSAFER',
      '-q',
      '-c',
      '(' + inputPath + ') (r) file runpdfbegin pdfpagecount = quit'
    ];

    try {
      const result = await this.executeGhostscript(gsPath, args);
      const pageCount = parseInt(result.stdout.trim(), 10) || 0;

      return {
        pageCount,
        // Additional metadata extraction would go here
      };
    } catch (error) {
      console.error(`❌ [GHOSTSCRIPT] Info extraction failed:`, error);
      throw new Error(`PDF info extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find Ghostscript executable
   */
  private static async findGhostscript(): Promise<string | null> {
    for (const gsPath of this.GHOSTSCRIPT_PATHS) {
      if (!gsPath) continue;

      try {
        // Check if file exists (for absolute paths)
        if (path.isAbsolute(gsPath)) {
          await fs.access(gsPath);
          return gsPath;
        } else {
          // For relative paths, try to execute to see if in PATH
          await this.executeGhostscript(gsPath, ['--version'], 5000);
          return gsPath;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Get Ghostscript version
   */
  private static async getVersion(gsPath: string): Promise<string | null> {
    try {
      const result = await this.executeGhostscript(gsPath, ['--version'], 5000);
      return result.stdout.trim();
    } catch {
      return null;
    }
  }

  /**
   * Execute Ghostscript command
   */
  private static async executeGhostscript(
    gsPath: string,
    args: string[],
    timeout: number = this.TIMEOUT
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const process = spawn(gsPath, args, {
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
          reject(new Error(`Ghostscript process failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Ghostscript process error: ${error.message}`));
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error(`Ghostscript process timeout after ${timeout}ms`));
      }, timeout);

      process.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }
}