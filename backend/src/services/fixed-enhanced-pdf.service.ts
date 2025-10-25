import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import PptxGenJS from 'pptxgenjs';
import { PDFDocument } from 'pdf-lib';
import pdf from 'pdf-parse';
import pdf2pic from 'pdf2pic';

/**
 * FIXED ENHANCED PDF TO POWERPOINT SERVICE
 *
 * Fixes:
 * 1. Uses pdf2pic instead of ImageMagick (no Ghostscript dependency)
 * 2. Preserves original PDF filename in output
 * 3. Ensures images are included in PowerPoint output
 */
export class FixedEnhancedPDFService {

  /**
   * Quality Profiles for Different Content Types
   */
  private static readonly QUALITY_PROFILES = {
    text_heavy: {
      density: 200,          // DPI for pdf2pic
      format: 'png' as const,
      quality: 90
    },
    image_heavy: {
      density: 300,          // Higher DPI for images
      format: 'png' as const,
      quality: 95
    },
    mixed: {
      density: 250,          // Balanced DPI
      format: 'png' as const,
      quality: 92
    },
    presentation: {
      density: 200,          // Standard presentation DPI
      format: 'png' as const,
      quality: 90
    },
    document: {
      density: 200,          // Standard document DPI
      format: 'png' as const,
      quality: 90
    }
  };

  /**
   * Convert PDF to PowerPoint with FIXED IMPLEMENTATION
   */
  static async convertPDFToPPTEnhanced(inputPath: string, outputDir: string, originalFilename?: string): Promise<string> {
    const startTime = Date.now();
    const jobId = uuidv4();

    // Extract original PDF name without extension
    const originalPdfName = originalFilename ? path.basename(originalFilename, '.pdf') : path.basename(inputPath, '.pdf');
    console.log(`🚀 [FIXED-ENHANCED] Converting: ${originalPdfName}.pdf`);

    try {
      // Create temporary directory for processing
      const tempDir = path.join(outputDir, `temp_${jobId}`);
      await fs.mkdir(tempDir, { recursive: true });

      // Step 1: Analyze PDF content
      const pdfBuffer = await fs.readFile(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pdfTextData = await pdf(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();

      console.log(`📊 [FIXED-ENHANCED] PDF Analysis: ${pageCount} pages, ${pdfTextData.text.length} characters`);

      // Step 2: Determine content type and quality profile
      const contentType = this.analyzeContentType(pdfTextData);
      const qualityProfile = this.QUALITY_PROFILES[contentType];

      console.log(`🧠 [FIXED-ENHANCED] Content Type: ${contentType.toUpperCase()}`);
      console.log(`⚙️ [FIXED-ENHANCED] Quality Profile: ${qualityProfile.density}DPI, ${qualityProfile.format}, Q${qualityProfile.quality}`);

      // Step 3: Extract page images using pdf2pic (with enhanced error handling)
      console.log(`🖼️ [FIXED-ENHANCED] Extracting page images using pdf2pic...`);

      const pageImages: { [pageNum: number]: string } = {};
      let pdf2picSupported = true;

      try {
        // Test pdf2pic availability with a quick check
        const testOptions = {
          density: 150,
          saveFilename: 'test',
          savePath: tempDir,
          format: qualityProfile.format,
          width: 800,
          height: 600
        };

        const testConvert = pdf2pic.fromPath(inputPath, testOptions);
        await testConvert(1, { responseType: 'image' });
        console.log(`✅ [FIXED-ENHANCED] pdf2pic is working correctly`);

        // If test passed, proceed with full quality extraction
        const pdf2picOptions = {
          density: qualityProfile.density,
          saveFilename: 'page',
          savePath: tempDir,
          format: qualityProfile.format,
          width: 1920,
          height: 1080
        };

        const convert = pdf2pic.fromPath(inputPath, pdf2picOptions);

        // Convert all pages to images
        for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
          const pageNum = pageIndex + 1;
          try {
            console.log(`🔄 [FIXED-ENHANCED] Processing page ${pageNum}/${pageCount}...`);
            const result = await convert(pageNum, { responseType: 'image' });

            if (result && result.path) {
              pageImages[pageNum] = result.path;
              console.log(`✅ [FIXED-ENHANCED] Page ${pageNum} extracted: ${path.basename(result.path)}`);
            } else {
              console.warn(`⚠️ [FIXED-ENHANCED] Page ${pageNum} extraction returned null result`);
            }
          } catch (pageError) {
            console.warn(`⚠️ [FIXED-ENHANCED] Failed to extract page ${pageNum}:`, pageError instanceof Error ? pageError.message : pageError);
          }
        }

      } catch (pdf2picError) {
        console.error(`❌ [FIXED-ENHANCED] pdf2pic not available or failed:`, pdf2picError instanceof Error ? pdf2picError.message : pdf2picError);
        console.log(`🔄 [FIXED-ENHANCED] Falling back to text-only conversion...`);
        pdf2picSupported = false;

        // Clean up any partial files
        try {
          const files = await fs.readdir(tempDir);
          for (const file of files) {
            await fs.unlink(path.join(tempDir, file));
          }
        } catch (cleanupError) {
          console.warn(`⚠️ [FIXED-ENHANCED] Cleanup warning:`, cleanupError);
        }
      }

      // Step 4: Create PowerPoint presentation
      console.log(`📋 [FIXED-ENHANCED] Creating PowerPoint presentation...`);
      const ppt = new PptxGenJS();

      // CRITICAL: Configure for maximum quality (no compression)
      (ppt as any).compression = false;

      // Set presentation properties
      ppt.author = 'PDFCraft.Pro';
      ppt.company = 'PDFCraft.Pro';
      ppt.title = `${originalPdfName} - Converted`;
      ppt.subject = `PDF to PowerPoint Conversion ${pdf2picSupported ? 'with Images' : 'Text-Only'}`;

      // Extract text by pages
      const pageTexts = this.extractTextByPages(pdfTextData.text, pageCount);

      // Create slides with intelligent layout based on available content
      let slidesCreated = 0;
      const hasImages = Object.keys(pageImages).length > 0;

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        const pageNum = pageIndex + 1;
        const slide = ppt.addSlide();
        const pageText = pageTexts[pageIndex] || '';

        // Add page image if available
        const imagePath = pageImages[pageNum];
        const imageAdded = imagePath && await this.fileExists(imagePath);

        if (imageAdded) {
          try {
            slide.addImage({
              path: imagePath,
              x: 0.2,
              y: 0.2,
              w: 9.6,
              h: 6.0,
              rounding: false, // Prevent auto-rounding that reduces quality
              sizing: { type: 'contain', w: 9.6, h: 6.0 }
            });
            console.log(`🖼️ [FIXED-ENHANCED] Added image for page ${pageNum}`);

            // Add text below image
            if (pageText.trim()) {
              slide.addText(pageText.trim().substring(0, 200), {
                x: 0.2,
                y: 6.4,
                w: 9.6,
                h: 1.2,
                fontSize: 10,
                color: '555555',
                fontFace: 'Arial',
                valign: 'top',
                wrap: true
              });
            }
          } catch (error) {
            console.warn(`⚠️ [FIXED-ENHANCED] Failed to add image for page ${pageNum}:`, error instanceof Error ? error.message : error);
            // Fallback to text-only slide
            FixedEnhancedPDFService.createTextOnlySlide(slide, pageNum, pageText);
          }
        } else {
          // Create enhanced text-only slide
          FixedEnhancedPDFService.createTextOnlySlide(slide, pageNum, pageText);
        }

        // Always add full text to slide notes for searchability
        if (pageText.trim()) {
          slide.addNotes(`Page ${pageNum} - Full Content:\n\n${pageText.trim()}\n\n--- Fixed Enhanced Service ${pdf2picSupported ? '(with images)' : '(text-only)'} ---`);
        }

        slidesCreated++;
      }

      // Step 5: Save with original filename
      const outputFilename = `${originalPdfName}.pptx`;
      const outputPath = path.join(outputDir, outputFilename);

      await ppt.writeFile({
        fileName: outputPath,
        compression: false // CRITICAL: Ensure no compression for maximum quality
      });

      // Step 6: Cleanup temporary files
      try {
        await fs.rmdir(tempDir, { recursive: true });
        console.log(`🧹 [FIXED-ENHANCED] Cleaned up temp directory`);
      } catch (error) {
        console.warn(`⚠️ [FIXED-ENHANCED] Cleanup warning:`, error instanceof Error ? error.message : error);
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ [FIXED-ENHANCED] Conversion completed: ${outputFilename}`);
      console.log(`📊 [FIXED-ENHANCED] Stats: ${slidesCreated} slides, ${Object.keys(pageImages).length} images, ${processingTime}ms`);

      return outputFilename;

    } catch (error) {
      console.error(`❌ [FIXED-ENHANCED] Conversion failed:`, error instanceof Error ? error.message : error);

      // Cleanup on error
      try {
        const tempDir = path.join(outputDir, `temp_${jobId}`);
        await fs.rmdir(tempDir, { recursive: true });
      } catch {}

      throw new Error(`Fixed Enhanced PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze content type based on text characteristics
   */
  private static analyzeContentType(pdfTextData: any): keyof typeof FixedEnhancedPDFService.QUALITY_PROFILES {
    const text = pdfTextData.text || '';
    const textLength = text.length;

    if (textLength === 0) {
      return 'image_heavy';
    }

    if (textLength < 500) {
      return 'presentation';
    }

    if (textLength > 2000) {
      return 'document';
    }

    // Check for presentation-like characteristics
    const slideMarkers = text.match(/slide|page \d+|chapter|section/gi);
    if (slideMarkers && slideMarkers.length > 2) {
      return 'presentation';
    }

    return 'mixed';
  }

  /**
   * Extract text content divided by estimated pages
   */
  private static extractTextByPages(text: string, pageCount: number): string[] {
    if (!text || pageCount <= 0) {
      return [];
    }

    const textPerPage = Math.ceil(text.length / pageCount);
    const pages: string[] = [];

    for (let i = 0; i < pageCount; i++) {
      const start = i * textPerPage;
      const end = Math.min((i + 1) * textPerPage, text.length);
      pages.push(text.substring(start, end));
    }

    return pages;
  }

  /**
   * Check if file exists
   */
  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create enhanced text-only slide
   */
  private static createTextOnlySlide(slide: any, pageNum: number, pageText: string): void {
    slide.background = { color: 'FFFFFF' };

    // Add page title
    slide.addText(`Page ${pageNum}`, {
      x: 0.5,
      y: 0.4,
      w: 9,
      h: 0.8,
      fontSize: 22,
      bold: true,
      color: '2C3E50',
      align: 'left'
    });

    if (pageText.trim()) {
      // Split text into readable chunks
      const chunks = FixedEnhancedPDFService.splitTextIntoChunks(pageText.trim(), 600);

      let yPosition = 1.4;
      chunks.slice(0, 4).forEach((chunk, index) => {
        slide.addText(chunk, {
          x: 0.5,
          y: yPosition + (index * 1.2),
          w: 9,
          h: 1.1,
          fontSize: 12,
          color: '34495E',
          wrap: true,
          lineSpacing: 16,
          valign: 'top'
        });
      });

      if (chunks.length > 4) {
        slide.addText(`... (${chunks.length - 4} more sections - see slide notes)`, {
          x: 0.5,
          y: 6.2,
          w: 9,
          h: 0.4,
          fontSize: 10,
          color: '7F8C8D',
          italic: true
        });
      }
    } else {
      slide.addText('No readable text content found on this page', {
        x: 0.5,
        y: 3,
        w: 9,
        h: 1,
        fontSize: 14,
        color: '999999',
        align: 'center',
        italic: true
      });
    }
  }

  /**
   * Split text into readable chunks
   */
  private static splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();

      if (currentChunk.length + trimmedSentence.length + 1 <= maxChunkSize) {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        currentChunk = trimmedSentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + (currentChunk.endsWith('.') ? '' : '.'));
    }

    return chunks;
  }
}