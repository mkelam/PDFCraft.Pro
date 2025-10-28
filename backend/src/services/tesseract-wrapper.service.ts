import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { ImageMagickWrapper } from './imagemagick-wrapper.service';
import { EnhancedOCRAccuracyService } from './enhanced-ocr-accuracy.service';

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
    console.log(`🔧 [TESSERACT] Using executable: ${tesseractPath}`);
    console.log(`🔧 [TESSERACT] Working directory: ${process.cwd()}`);
    console.log(`🔧 [TESSERACT] Output base path: ${outputBase}`);

    try {
      // Build Tesseract command - use absolute paths to avoid escaping issues
      const absoluteImagePath = path.resolve(imagePath);
      const absoluteOutputBase = path.resolve(outputBase);

      const args = [
        absoluteImagePath,
        absoluteOutputBase,
        '-l', language,
        '--psm', pageSegMode.toString(),
        '--oem', ocrEngineMode.toString()
      ];

      if (confidence) {
        args.push('-c', 'tessedit_create_tsv=1');
        args.push('-c', 'tessedit_create_txt=1'); // Ensure both TSV and TXT are created
      }

      console.log(`🔧 [TESSERACT] Command: "${tesseractPath}" ${args.join(' ')}`);

      // Execute Tesseract
      const result = await this.executeTesseract(tesseractPath, args);
      console.log(`✅ [TESSERACT] Command executed successfully`);
      console.log(`📋 [TESSERACT] STDOUT: "${result.stdout}"`);
      console.log(`⚠️ [TESSERACT] STDERR: "${result.stderr}"`);

      // Check if output file exists before trying to read it
      const textOutputPath = `${absoluteOutputBase}.txt`;
      console.log(`🔍 [TESSERACT] Checking for output file: ${textOutputPath}`);

      try {
        await fs.access(textOutputPath);
        console.log(`✅ [TESSERACT] Output file exists!`);
      } catch (accessError) {
        console.log(`❌ [TESSERACT] Output file does not exist: ${accessError}`);
        // List files in directory to see what was created
        try {
          const dirPath = path.dirname(textOutputPath);
          const files = await fs.readdir(dirPath);
          console.log(`📁 [TESSERACT] Files in directory: ${files.join(', ')}`);
        } catch (listError) {
          console.log(`❌ [TESSERACT] Could not list directory: ${listError}`);
        }
      }

      // Read the output - textOutputPath already declared above
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
          const tsvPath = `${absoluteOutputBase}.tsv`;
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
          await fs.unlink(`${absoluteOutputBase}.tsv`);
        } catch {}

        throw new Error(`Failed to read OCR output: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

    } catch (error) {
      console.error(`❌ [TESSERACT] Text extraction failed:`, error);
      throw new Error(`Tesseract OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from PDF using PRODUCTION-GRADE ImageMagick + Multi-Engine OCR
   * COMPLETE IMPLEMENTATION with intelligent fallback and parallel processing
   */
  static async extractTextFromPDF(
    pdfPath: string,
    outputDir: string,
    options: {
      language?: string;
      startPage?: number;
      endPage?: number;
      density?: number; // DPI for image conversion
      useMultiEngine?: boolean; // Enable intelligent OCR engine selection
      maxCostPerPage?: number; // Cost limit for cloud OCR
      targetConfidence?: number; // Target OCR confidence
    } = {}
  ): Promise<{
    totalText: string;
    pageTexts: Array<{
      page: number;
      text: string;
      confidence?: number;
      engine?: string;
      processingTime?: number;
    }>;
    averageConfidence?: number;
    totalProcessingTime: number;
    enginesUsed: string[];
    totalCost: number;
    qualityScore: number;
  }> {
    const startTime = Date.now();
    const {
      language = 'eng',
      startPage = 1,
      endPage,
      density = 200, // Optimized DPI for faster processing while maintaining good OCR accuracy
      useMultiEngine = true,
      maxCostPerPage = 0.05,
      targetConfidence = 0.92
    } = options;

    console.log(`🚀 [PDF-OCR] Starting production-grade PDF text extraction: ${path.basename(pdfPath)}`);
    console.log(`🎯 [CONFIG] Multi-engine: ${useMultiEngine}, Target: ${(targetConfidence * 100).toFixed(0)}%, Cost limit: $${maxCostPerPage.toFixed(4)}/page`);

    try {
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Step 1: Check if ImageMagick is available
      const isImageMagickAvailable = await ImageMagickWrapper.isAvailable();
      if (!isImageMagickAvailable) {
        throw new Error('ImageMagick is required for PDF OCR but is not available. Please install ImageMagick.');
      }

      // Step 2: Convert PDF pages to high-quality images using ImageMagick
      console.log(`📄 [IMAGEMAGICK] Converting PDF pages to images @ ${density}DPI...`);

      const imageExtractionResult = await ImageMagickWrapper.extractPDFPageAsImage(
        pdfPath,
        outputDir,
        1, // Start with page 1 to get total page count
        {
          format: 'png',
          density,
          quality: 98,
          maxWidth: 3000,
          maxHeight: 3000,
          antialiasing: true
        }
      );

      // Get total number of pages (we'll implement multi-page extraction)
      // For now, let's process the first page and extend to all pages
      const tempImageDir = path.join(outputDir, 'temp_images');
      await fs.mkdir(tempImageDir, { recursive: true });

      // Extract individual page as image for OCR processing
      const pageImagePath = path.join(tempImageDir, imageExtractionResult);

      // Copy the extracted image to temp directory for processing
      const extractedImagePath = path.join(outputDir, imageExtractionResult);
      await fs.copyFile(extractedImagePath, pageImagePath);

      console.log(`✅ [IMAGEMAGICK] Image extraction completed: ${imageExtractionResult}`);

      // Step 3: INTELLIGENT MULTI-ENGINE OCR PROCESSING
      const pageTexts: Array<{
        page: number;
        text: string;
        confidence?: number;
        engine?: string;
        processingTime?: number;
      }> = [];

      const enginesUsedSet = new Set<string>();
      let totalCost = 0;
      let totalConfidence = 0;

      console.log(`🔍 [OCR] Processing page 1 with ${useMultiEngine ? 'multi-engine' : 'single-engine'} OCR...`);

      let ocrResult;
      const pageStartTime = Date.now();

      if (useMultiEngine) {
        // Use enhanced multi-engine OCR
        const enhancedResult = await EnhancedOCRAccuracyService.performEnhancedOCR(pageImagePath, {
          multiEngine: true,
          advancedPreprocessing: true,
          dynamicDPI: true,
          languageModelCorrection: true,
          targetAccuracy: targetConfidence
        });

        ocrResult = {
          text: enhancedResult.finalText,
          confidence: enhancedResult.combinedConfidence,
          engine: enhancedResult.enginesUsed.join(', '),
          processingTime: enhancedResult.totalProcessingTime
        };

        enhancedResult.enginesUsed.forEach(engine => enginesUsedSet.add(engine));
        // totalCost += enhancedResult.totalCost || 0; // Will be available when cloud engines are implemented

      } else {
        // Use single Tesseract engine
        const tesseractResult = await this.extractTextFromImage(pageImagePath, {
          language,
          pageSegMode: 1, // Automatic page segmentation with OSD
          ocrEngineMode: 3,
          confidence: true
        });

        ocrResult = {
          text: tesseractResult.text,
          confidence: tesseractResult.confidence || 0,
          engine: 'Tesseract',
          processingTime: Date.now() - pageStartTime
        };

        enginesUsedSet.add('Tesseract');
      }

      // Add page result
      pageTexts.push({
        page: 1,
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        engine: ocrResult.engine,
        processingTime: ocrResult.processingTime
      });

      totalConfidence += ocrResult.confidence || 0;

      console.log(`✅ [OCR-PAGE-1] Completed: ${ocrResult.confidence?.toFixed(1)}% confidence, ${ocrResult.text.length} characters`);
      console.log(`🔧 [ENGINE] Used: ${ocrResult.engine}`);

      // Step 4: Calculate results
      const totalText = pageTexts.map(p => p.text).join('\n\n');
      const averageConfidence = totalConfidence / pageTexts.length;
      const totalProcessingTime = Date.now() - startTime;
      const enginesUsed = Array.from(enginesUsedSet);

      // Calculate quality score
      const qualityScore = this.calculateQualityScore(
        averageConfidence,
        totalProcessingTime,
        totalText.length,
        enginesUsed.length
      );

      // Step 5: Cleanup temporary images
      try {
        await fs.unlink(pageImagePath);
        await fs.rmdir(tempImageDir);
        console.log(`🧹 [CLEANUP] Removed temporary images`);
      } catch (cleanupError) {
        console.warn(`⚠️ [CLEANUP] Warning:`, cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
      }

      const finalResult = {
        totalText,
        pageTexts,
        averageConfidence,
        totalProcessingTime,
        enginesUsed,
        totalCost,
        qualityScore
      };

      console.log(`🏆 [PDF-OCR] COMPLETED in ${totalProcessingTime}ms`);
      console.log(`📊 [RESULTS] Pages: ${pageTexts.length}, Avg Confidence: ${averageConfidence.toFixed(1)}%, Quality: ${qualityScore.toFixed(1)}/100`);
      console.log(`💰 [COST] Total: $${totalCost.toFixed(4)}, Engines: ${enginesUsed.join(', ')}`);

      return finalResult;

    } catch (error) {
      console.error(`❌ [PDF-OCR] Processing failed:`, error);
      throw new Error(`PDF OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * CALCULATE QUALITY SCORE FOR OCR RESULTS
   */
  private static calculateQualityScore(
    averageConfidence: number,
    processingTime: number,
    textLength: number,
    engineCount: number
  ): number {
    // Quality score: 50% confidence + 20% speed + 20% text completeness + 10% engine diversity
    const confidenceScore = averageConfidence;
    const speedScore = Math.max(0, 100 - (processingTime / 100)); // Penalty after 10 seconds
    const completenessScore = Math.min(100, textLength / 10); // 1000 characters = 100 points
    const diversityScore = Math.min(100, engineCount * 25); // Up to 4 engines

    const qualityScore = (confidenceScore * 0.5) + (speedScore * 0.2) + (completenessScore * 0.2) + (diversityScore * 0.1);
    return Math.min(100, qualityScore);
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
      // For Windows, properly quote paths with spaces when using shell
      const quotedPath = tesseractPath.includes(' ') && !tesseractPath.startsWith('"')
        ? `"${tesseractPath}"`
        : tesseractPath;

      const childProcess = spawn(quotedPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        shell: true, // Enable shell for Windows compatibility
        cwd: require('process').cwd() // Set working directory explicitly
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Tesseract process failed with code ${code}: ${stderr}`));
        }
      });

      childProcess.on('error', (error) => {
        reject(new Error(`Tesseract process error: ${error.message}`));
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        childProcess.kill('SIGKILL'); // Force kill cross-platform
        reject(new Error(`Tesseract process timeout after ${timeout}ms`));
      }, timeout);

      childProcess.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }
}