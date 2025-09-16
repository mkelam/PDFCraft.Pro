import { promises as fs } from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import libre from 'libreoffice-convert';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { config } from '@/config';

const libreConvert = promisify(libre.convert);

export class PDFService {
  /**
   * Convert PDF to PowerPoint
   */
  static async convertPDFToPPT(inputPath: string, outputDir: string): Promise<string> {
    try {
      const startTime = Date.now();
      console.log(`🔄 Starting PDF→PPT conversion: ${path.basename(inputPath)}`);

      // Read the PDF file
      const pdfBuffer = await fs.readFile(inputPath);

      // Convert using LibreOffice
      const pptBuffer = await libreConvert(pdfBuffer, '.pptx', undefined);

      // Generate output filename
      const outputFilename = `${uuidv4()}.pptx`;
      const outputPath = path.join(outputDir, outputFilename);

      // Write the converted file
      await fs.writeFile(outputPath, pptBuffer);

      const processingTime = Date.now() - startTime;
      console.log(`✅ PDF→PPT conversion completed in ${processingTime}ms`);

      return outputFilename;
    } catch (error) {
      console.error('❌ PDF→PPT conversion failed:', error);
      throw new Error(`Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Merge multiple PDF files into one
   */
  static async mergePDFs(inputPaths: string[], outputDir: string): Promise<string> {
    try {
      const startTime = Date.now();
      console.log(`🔄 Starting PDF merge: ${inputPaths.length} files`);

      // Create a new PDF document
      const mergedPdf = await PDFDocument.create();

      // Process each input PDF
      for (const inputPath of inputPaths) {
        const pdfBuffer = await fs.readFile(inputPath);
        const pdf = await PDFDocument.load(pdfBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

        // Add each page to the merged PDF
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      // Generate output filename
      const outputFilename = `merged_${uuidv4()}.pdf`;
      const outputPath = path.join(outputDir, outputFilename);

      // Save the merged PDF
      const pdfBytes = await mergedPdf.save();
      await fs.writeFile(outputPath, pdfBytes);

      const processingTime = Date.now() - startTime;
      console.log(`✅ PDF merge completed in ${processingTime}ms`);

      return outputFilename;
    } catch (error) {
      console.error('❌ PDF merge failed:', error);
      throw new Error(`Merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate PDF file
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
      console.error('❌ PDF validation failed:', error);
      return false;
    }
  }

  /**
   * Get PDF metadata
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
      console.error('❌ Failed to get PDF metadata:', error);
      throw new Error('Failed to read PDF metadata');
    }
  }

  /**
   * Clean up temporary files
   */
  static async cleanupFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        console.log(`🗑️ Cleaned up: ${path.basename(filePath)}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup: ${path.basename(filePath)}`);
      }
    }
  }

  /**
   * Estimate processing time based on file size and page count
   */
  static estimateProcessingTime(type: 'pdf-to-ppt' | 'pdf-merge', fileCount: number, totalSize: number): number {
    // Base processing time in seconds
    let baseTime = 0;

    if (type === 'pdf-to-ppt') {
      // 2 seconds base + 0.5 seconds per MB
      baseTime = 2 + (totalSize / (1024 * 1024)) * 0.5;
    } else if (type === 'pdf-merge') {
      // 1 second base + 0.5 seconds per file + 0.2 seconds per MB
      baseTime = 1 + (fileCount * 0.5) + (totalSize / (1024 * 1024)) * 0.2;
    }

    // Round to nearest second, minimum 1 second
    return Math.max(1, Math.round(baseTime));
  }
}