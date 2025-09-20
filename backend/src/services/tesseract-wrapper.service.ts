import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

/**
 * Tesseract OCR Wrapper Service
 * Advanced text extraction from scanned PDFs and images
 */
export class TesseractWrapper {
  private static readonly TESSERACT_PATHS = [
    process.env.TESSERACT_PATH,
    'tesseract.exe',
    'tesseract',
    'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'
  ].filter(Boolean);

  private static readonly TIMEOUT = 180000; // 3 minutes for OCR

  /**
   * Check if Tesseract is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const tesseractPath = await this.findTesseract();
      return !!tesseractPath;
    } catch {
      return false;
    }
  }

  /**
   * Get Tesseract installation info
   */
  static async getInstallationInfo(): Promise<{
    available: boolean;
    path?: string;
    version?: string;
    languages?: string[];
    error?: string;
  }> {
    try {
      const tesseractPath = await this.findTesseract();

      if (!tesseractPath) {
        return {
          available: false,
          error: 'Tesseract not found. Please install from https://github.com/tesseract-ocr/tesseract'
        };
      }

      // Get version and languages
      try {
        const version = await this.getVersion(tesseractPath);
        const languages = await this.getAvailableLanguages(tesseractPath);

        return {
          available: true,
          path: tesseractPath,
          version: version || 'Version detection failed',
          languages: languages || ['eng']
        };
      } catch (error) {
        return {
          available: true,
          path: tesseractPath,
          error: `Version/language detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
   * Extract text from image using OCR
   */
  static async extractTextFromImage(
    imagePath: string,
    options: {
      language?: string;
      pageSegMode?: number; // Page segmentation mode (0-13)
      ocrEngineMode?: number; // OCR Engine mode (0-3)
      confidence?: boolean; // Include confidence scores
      outputFormat?: 'txt' | 'hocr' | 'pdf' | 'tsv';
    } = {}
  ): Promise<{
    text: string;
    confidence?: number;
    wordData?: Array<{
      word: string;
      confidence: number;
      bbox: { x: number; y: number; width: number; height: number };
    }>;
  }> {
    const {
      language = 'eng',
      pageSegMode = 1, // Automatic page segmentation with OSD
      ocrEngineMode = 3, // Default, based on what is available
      confidence = false,
      outputFormat = 'txt'
    } = options;

    const tesseractPath = await this.findTesseract();
    if (!tesseractPath) {
      throw new Error('Tesseract not available');
    }

    // Validate input file
    try {
      await fs.access(imagePath);
    } catch {
      throw new Error(`Input image not found: ${imagePath}`);
    }

    // Create temporary output file
    const outputBasename = path.basename(imagePath, path.extname(imagePath));
    const tempDir = path.dirname(imagePath);
    const outputBase = path.join(tempDir, `${outputBasename}_ocr`);

    console.log(`🔧 [TESSERACT] Extracting text from: ${path.basename(imagePath)}`);

    try {
      // Build Tesseract command
      const args = [
        imagePath,
        outputBase,
        '-l', language,
        '--psm', pageSegMode.toString(),
        '--oem', ocrEngineMode.toString()
      ];

      if (confidence) {
        args.push('-c', 'tessedit_create_tsv=1');
      }

      // Execute Tesseract
      await this.executeTesseract(tesseractPath, args);

      // Read the output
      const textOutputPath = `${outputBase}.txt`;
      let text = '';
      let wordData: Array<{
        word: string;
        confidence: number;
        bbox: { x: number; y: number; width: number; height: number };
      }> = [];

      try {
        text = await fs.readFile(textOutputPath, 'utf8');
        text = text.trim();

        // Clean up output file
        await fs.unlink(textOutputPath);

        // If confidence requested, parse TSV output
        if (confidence) {
          const tsvPath = `${outputBase}.tsv`;
          try {
            const tsvContent = await fs.readFile(tsvPath, 'utf8');
            wordData = this.parseTSVOutput(tsvContent);
            await fs.unlink(tsvPath);
          } catch {
            // TSV parsing failed, continue without word data
          }
        }

        const avgConfidence = wordData.length > 0
          ? Math.round(wordData.reduce((sum, word) => sum + word.confidence, 0) / wordData.length)
          : undefined;

        console.log(`✅ [TESSERACT] Text extraction completed: ${text.length} characters`);
        if (avgConfidence !== undefined) {
          console.log(`📊 [TESSERACT] Average confidence: ${avgConfidence}%`);
        }

        return {
          text,
          confidence: avgConfidence,
          wordData: confidence ? wordData : undefined
        };

      } catch (error) {
        // Clean up any remaining files
        try {
          await fs.unlink(textOutputPath);
        } catch {}
        try {
          await fs.unlink(`${outputBase}.tsv`);
        } catch {}

        throw new Error(`Failed to read OCR output: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

    } catch (error) {
      console.error(`❌ [TESSERACT] Text extraction failed:`, error);
      throw new Error(`Tesseract OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from PDF using combined ImageMagick + Tesseract approach
   */
  static async extractTextFromPDF(
    pdfPath: string,
    outputDir: string,
    options: {
      language?: string;
      startPage?: number;
      endPage?: number;
      density?: number; // DPI for image conversion
    } = {}
  ): Promise<{
    totalText: string;
    pageTexts: Array<{ page: number; text: string; confidence?: number }>;
    averageConfidence?: number;
  }> {
    const {
      language = 'eng',
      startPage = 1,
      endPage,
      density = 300
    } = options;

    console.log(`🔧 [TESSERACT] Starting PDF text extraction: ${path.basename(pdfPath)}`);

    // This would typically use ImageMagick to convert PDF pages to images first
    // For now, we'll return a placeholder implementation
    try {
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // TODO: Implement PDF page to image conversion using ImageMagick
      // TODO: Then run OCR on each page image
      // For now, return a basic response

      console.log(`⚠️ [TESSERACT] PDF OCR not yet fully implemented - requires ImageMagick integration`);

      return {
        totalText: '',
        pageTexts: [],
        averageConfidence: undefined
      };

    } catch (error) {
      console.error(`❌ [TESSERACT] PDF text extraction failed:`, error);
      throw new Error(`PDF OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available languages
   */
  static async getAvailableLanguages(tesseractPath?: string): Promise<string[]> {
    const tPath = tesseractPath || await this.findTesseract();
    if (!tPath) {
      return ['eng']; // Default fallback
    }

    try {
      const result = await this.executeTesseract(tPath, ['--list-langs'], 10000);
      const lines = result.stdout.split('\n').filter(line => line.trim().length > 0);

      // Remove the header line and return language codes
      const languages = lines.slice(1).map(line => line.trim()).filter(lang => lang.length > 0);
      return languages.length > 0 ? languages : ['eng'];

    } catch {
      return ['eng']; // Fallback to English
    }
  }

  /**
   * Parse TSV output for word-level data
   */
  private static parseTSVOutput(tsvContent: string): Array<{
    word: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number };
  }> {
    const lines = tsvContent.split('\n');
    const wordData: Array<{
      word: string;
      confidence: number;
      bbox: { x: number; y: number; width: number; height: number };
    }> = [];

    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split('\t');
      if (columns.length >= 12) {
        const level = parseInt(columns[0]);
        const word = columns[11];
        const confidence = parseInt(columns[10]);
        const left = parseInt(columns[6]);
        const top = parseInt(columns[7]);
        const width = parseInt(columns[8]);
        const height = parseInt(columns[9]);

        // Only include word-level data (level 5)
        if (level === 5 && word && word.trim().length > 0 && confidence >= 0) {
          wordData.push({
            word: word.trim(),
            confidence,
            bbox: { x: left, y: top, width, height }
          });
        }
      }
    }

    return wordData;
  }

  /**
   * Find Tesseract executable
   */
  private static async findTesseract(): Promise<string | null> {
    for (const tesseractPath of this.TESSERACT_PATHS) {
      if (!tesseractPath) continue;

      try {
        // For relative paths, try to execute to see if in PATH
        if (!path.isAbsolute(tesseractPath)) {
          await this.executeTesseract(tesseractPath, ['--version'], 5000);
          return tesseractPath;
        } else {
          // For absolute paths, check if file exists
          await fs.access(tesseractPath);
          return tesseractPath;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Get Tesseract version
   */
  private static async getVersion(tesseractPath: string): Promise<string | null> {
    try {
      const result = await this.executeTesseract(tesseractPath, ['--version'], 5000);
      const lines = result.stdout.split('\n');
      const versionLine = lines.find(line => line.includes('tesseract'));
      return versionLine ? versionLine.trim() : result.stdout.split('\n')[0].trim();
    } catch {
      return null;
    }
  }

  /**
   * Execute Tesseract command
   */
  private static async executeTesseract(
    tesseractPath: string,
    args: string[],
    timeout: number = this.TIMEOUT
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const process = spawn(tesseractPath, args, {
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
          reject(new Error(`Tesseract process failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Tesseract process error: ${error.message}`));
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error(`Tesseract process timeout after ${timeout}ms`));
      }, timeout);

      process.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }
}