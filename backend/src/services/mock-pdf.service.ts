import { promises as fs } from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock PDF Service for local development without LibreOffice
 * This simulates PDF conversion and merging for testing purposes
 */
export class MockPDFService {
  /**
   * Mock PDF to PowerPoint conversion
   */
  static async convertPDFToPPT(inputPath: string, outputDir: string): Promise<string> {
    try {
      const startTime = Date.now();
      console.log(`🔄 [MOCK] Starting PDF→PPT conversion: ${path.basename(inputPath)}`);

      // Check if input file exists
      try {
        await fs.access(inputPath);
      } catch (error) {
        throw new Error(`Input file not found: ${inputPath}`);
      }

      // Create output directory if it doesn't exist
      await fs.mkdir(outputDir, { recursive: true });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock PowerPoint file content
      const mockPPTContent = this.generateMockPPTContent(inputPath);

      // Generate output filename
      const outputFilename = `${uuidv4()}.pptx`;
      const outputPath = path.join(outputDir, outputFilename);

      // Write mock PPTX file
      await fs.writeFile(outputPath, mockPPTContent);

      const processingTime = Date.now() - startTime;
      console.log(`✅ [MOCK] PDF→PPT conversion completed in ${processingTime}ms`);

      return outputFilename;
    } catch (error) {
      console.error('❌ [MOCK] PDF→PPT conversion failed:', error);
      throw new Error(`Mock conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mock PDF merging (uses real pdf-lib)
   */
  static async mergePDFs(inputPaths: string[], outputDir: string): Promise<string> {
    try {
      const startTime = Date.now();
      console.log(`🔄 [MOCK] Starting PDF merge: ${inputPaths.length} files`);

      // Validate input
      if (!inputPaths || inputPaths.length === 0) {
        throw new Error('No input files provided for merging');
      }

      // Create output directory if it doesn't exist
      await fs.mkdir(outputDir, { recursive: true });

      // Create a new PDF document
      const mergedPdf = await PDFDocument.create();

      // Process each input PDF (this part is real)
      for (const inputPath of inputPaths) {
        try {
          const pdfBuffer = await fs.readFile(inputPath);
          const pdf = await PDFDocument.load(pdfBuffer);
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

          // Add each page to the merged PDF
          pages.forEach((page) => mergedPdf.addPage(page));
        } catch (error) {
          console.warn(`⚠️ [MOCK] Failed to process ${path.basename(inputPath)}, skipping...`);
        }
      }

      // Generate output filename
      const outputFilename = `merged_${uuidv4()}.pdf`;
      const outputPath = path.join(outputDir, outputFilename);

      // Save the merged PDF
      const pdfBytes = await mergedPdf.save();
      await fs.writeFile(outputPath, pdfBytes);

      const processingTime = Date.now() - startTime;
      console.log(`✅ [MOCK] PDF merge completed in ${processingTime}ms`);

      return outputFilename;
    } catch (error) {
      console.error('❌ [MOCK] PDF merge failed:', error);
      throw new Error(`Mock merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate PDF file (real validation)
   */
  static async validatePDF(filePath: string): Promise<boolean> {
    try {
      const buffer = await fs.readFile(filePath);

      // Check file signature (PDF starts with %PDF)
      const header = buffer.slice(0, 4).toString();
      if (header !== '%PDF') {
        throw new Error('Invalid PDF file signature');
      }

      // Try to load with pdf-lib to verify structure
      await PDFDocument.load(buffer);

      return true;
    } catch (error) {
      console.error('❌ [MOCK] PDF validation failed:', error);
      return false;
    }
  }

  /**
   * Get PDF metadata (real)
   */
  static async getPDFMetadata(filePath: string): Promise<{
    pages: number;
    size: number;
    title?: string;
    author?: string;
  }> {
    try {
      const buffer = await fs.readFile(filePath);
      const pdf = await PDFDocument.load(buffer);

      const stats = await fs.stat(filePath);

      return {
        pages: pdf.getPageCount(),
        size: stats.size,
        title: pdf.getTitle() || undefined,
        author: pdf.getAuthor() || undefined,
      };
    } catch (error) {
      console.error('❌ [MOCK] Failed to get PDF metadata:', error);
      throw new Error('Failed to read PDF metadata');
    }
  }

  /**
   * Clean up temporary files (real)
   */
  static async cleanupFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        console.log(`🗑️ [MOCK] Cleaned up: ${path.basename(filePath)}`);
      } catch (error) {
        console.warn(`⚠️ [MOCK] Failed to cleanup: ${path.basename(filePath)}`);
      }
    }
  }

  /**
   * Estimate processing time (real)
   */
  static estimateProcessingTime(type: 'pdf-to-ppt' | 'pdf-merge', fileCount: number, totalSize: number): number {
    // Base processing time in seconds
    let baseTime = 0;

    if (type === 'pdf-to-ppt') {
      // Mock conversion: 2 seconds base + 0.1 seconds per MB (much faster than real LibreOffice)
      baseTime = 2 + (totalSize / (1024 * 1024)) * 0.1;
    } else if (type === 'pdf-merge') {
      // 1 second base + 0.2 seconds per file + 0.1 seconds per MB
      baseTime = 1 + (fileCount * 0.2) + (totalSize / (1024 * 1024)) * 0.1;
    }

    // Round to nearest second, minimum 1 second
    return Math.max(1, Math.round(baseTime));
  }

  /**
   * Generate mock PowerPoint content
   */
  private static generateMockPPTContent(inputPath: string): Buffer {
    // This creates a minimal "PowerPoint-like" file for testing
    // In reality, this would be much more complex
    const mockContent = {
      mockPPTX: true,
      originalFile: path.basename(inputPath),
      convertedAt: new Date().toISOString(),
      note: 'This is a mock PowerPoint file created for testing purposes.',
      message: 'Install LibreOffice to enable real PDF→PowerPoint conversion.'
    };

    return Buffer.from(JSON.stringify(mockContent, null, 2));
  }
}