import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';

/**
 * LibreOffice Wrapper Service for Windows
 * Handles direct LibreOffice executable calls for PDF conversion
 */
export class LibreOfficeWrapper {
  private static readonly LIBREOFFICE_PATH = process.env.LIBREOFFICE_PATH || 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
  private static readonly TIMEOUT = 30000; // 30 seconds

  /**
   * Convert PDF to PowerPoint using LibreOffice headless mode
   */
  static async convertPDFToPPT(inputPath: string, outputDir: string): Promise<string> {
    console.log(`🔄 [LIBREOFFICE-WRAPPER] Starting conversion: ${path.basename(inputPath)}`);

    // Validate input file exists
    try {
      await fs.access(inputPath);
    } catch (error) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate output filename
    const inputBasename = path.basename(inputPath, '.pdf');
    const outputFilename = `${inputBasename}_converted.pptx`;
    const expectedOutputPath = path.join(outputDir, outputFilename);

    try {
      // LibreOffice headless conversion command
      const args = [
        '--headless',
        '--convert-to', 'pptx',
        '--outdir', outputDir,
        inputPath
      ];

      console.log(`🔧 [LIBREOFFICE] Command: "${this.LIBREOFFICE_PATH}" ${args.join(' ')}`);

      // Execute LibreOffice conversion
      await this.executeLibreOffice(args);

      // LibreOffice creates file with original name + .pptx
      const libreOfficeOutputPath = path.join(outputDir, `${inputBasename}.pptx`);

      // Check if conversion succeeded
      try {
        await fs.access(libreOfficeOutputPath);

        // Rename to our expected filename if different
        if (libreOfficeOutputPath !== expectedOutputPath) {
          await fs.rename(libreOfficeOutputPath, expectedOutputPath);
        }

        console.log(`✅ [LIBREOFFICE-WRAPPER] Conversion completed: ${outputFilename}`);
        return outputFilename;

      } catch (error) {
        throw new Error(`LibreOffice conversion failed - output file not created: ${libreOfficeOutputPath}`);
      }

    } catch (error) {
      console.error(`❌ [LIBREOFFICE-WRAPPER] Conversion failed:`, error);
      throw new Error(`LibreOffice conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test LibreOffice installation
   */
  static async testInstallation(): Promise<{ available: boolean; version?: string; error?: string }> {
    try {
      console.log(`🧪 [LIBREOFFICE] Testing installation: ${this.LIBREOFFICE_PATH}`);

      // Check if executable exists
      try {
        await fs.access(this.LIBREOFFICE_PATH);
      } catch (error) {
        return {
          available: false,
          error: `LibreOffice executable not found at: ${this.LIBREOFFICE_PATH}`
        };
      }

      // Try to get version
      const version = await this.getVersion();

      return {
        available: true,
        version: version || 'Version detection failed'
      };

    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get LibreOffice version
   */
  private static async getVersion(): Promise<string | null> {
    try {
      const result = await this.executeLibreOffice(['--version'], 5000); // 5 second timeout for version
      return result.stdout.trim();
    } catch (error) {
      console.warn('Could not get LibreOffice version:', error);
      return null;
    }
  }

  /**
   * Execute LibreOffice command with timeout
   */
  private static async executeLibreOffice(args: string[], timeout: number = this.TIMEOUT): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      console.log(`🔧 [LIBREOFFICE] Executing: ${this.LIBREOFFICE_PATH} ${args.join(' ')}`);

      const process = spawn(this.LIBREOFFICE_PATH, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true, // Hide window on Windows
        shell: false
      });

      let stdout = '';
      let stderr = '';

      // Handle output
      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle completion
      process.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ [LIBREOFFICE] Process completed successfully`);
          resolve({ stdout, stderr });
        } else {
          console.error(`❌ [LIBREOFFICE] Process failed with code ${code}`);
          console.error(`❌ [LIBREOFFICE] STDERR: ${stderr}`);
          reject(new Error(`LibreOffice process failed with code ${code}: ${stderr}`));
        }
      });

      // Handle errors
      process.on('error', (error) => {
        console.error(`❌ [LIBREOFFICE] Process error:`, error);
        reject(new Error(`LibreOffice process error: ${error.message}`));
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        console.error(`⏰ [LIBREOFFICE] Process timeout after ${timeout}ms`);
        process.kill('SIGTERM');
        reject(new Error(`LibreOffice process timeout after ${timeout}ms`));
      }, timeout);

      // Clear timeout on completion
      process.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }

  /**
   * Check if LibreOffice is available and configured
   */
  static async isAvailable(): Promise<boolean> {
    const test = await this.testInstallation();
    return test.available;
  }
}