import { promises as fs } from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { MockPDFService } from './mock-pdf.service';
import { EnterprisePDFService } from './enterprise-pdf.service';
import { HighQualityPDFService } from './high-quality-pdf.service';
import { PuppeteerPDFService } from './puppeteer-pdf.service';
import { ImprovedPDFService } from './improved-pdf.service';

const isProduction = process.env.NODE_ENV === 'production';

// Check if LibreOffice is available
const isLibreOfficeAvailable = (): boolean => {
  return process.env.LIBREOFFICE_AVAILABLE === 'true';
};

export class PDFService {
  /**
   * Convert PDF to PowerPoint with Maximum Quality
   * Priority: Content Accuracy > Visual Quality > Speed
   */
  static async convertPDFToPPT(inputPath: string, outputDir: string): Promise<string> {
    // Try engines in order of reliability and quality
    const engines = [
      {
        name: 'Improved PDF Engine (Content-First)',
        emoji: '✨',
        convert: () => ImprovedPDFService.convertPDFToPPT(inputPath, outputDir)
      },
      {
        name: 'High-Quality Engine',
        emoji: '🎯',
        convert: () => HighQualityPDFService.convertPDFToPPT(inputPath, outputDir)
      },
      {
        name: 'Enterprise Engine',
        emoji: '🚀',
        convert: () => EnterprisePDFService.convertPDFToPPT(inputPath, outputDir)
      },
      {
        name: 'Puppeteer (Browser Rendering)',
        emoji: '🎆',
        convert: () => PuppeteerPDFService.convertPDFToPPT(inputPath, outputDir)
      },
      {
        name: 'Mock Service',
        emoji: '🔄',
        convert: () => MockPDFService.convertPDFToPPT(inputPath, outputDir)
      }
    ];

    let lastError: Error | null = null;

    for (const engine of engines) {
      try {
        console.log(`${engine.emoji} Trying ${engine.name}...`);
        const result = await engine.convert();
        console.log(`✅ Success with ${engine.name}`);
        return result;
      } catch (error) {
        console.error(`❌ ${engine.name} failed:`, error instanceof Error ? error.message : error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError || new Error('All conversion engines failed');
  }

  /**
   * Merge multiple PDF files using Enterprise Engine
   */
  static async mergePDFs(inputPaths: string[], outputDir: string): Promise<string> {
    try {
      // Use enterprise PDF service for optimized merging
      return await EnterprisePDFService.mergePDFs(inputPaths, outputDir);
    } catch (error) {
      console.error('❌ Enterprise PDF merge failed, trying fallback:', error);

      // Fallback to mock service
      console.log('🔄 Using mock service as fallback...');
      return MockPDFService.mergePDFs(inputPaths, outputDir);
    }
  }

  /**
   * Validate PDF file
   */
  static async validatePDF(filePath: string): Promise<boolean> {
    return MockPDFService.validatePDF(filePath);
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
    return MockPDFService.getPDFMetadata(filePath);
  }

  /**
   * Clean up temporary files with scheduled retention
   */
  static async cleanupFiles(filePaths: string[], retentionMinutes: number = 30): Promise<void> {
    // Use enterprise scheduled cleanup for better file management
    return EnterprisePDFService.scheduleCleanup(filePaths, retentionMinutes);
  }

  /**
   * Estimate processing time based on file size and page count
   */
  static estimateProcessingTime(type: 'pdf-to-ppt' | 'pdf-merge', fileCount: number, totalSize: number): number {
    return MockPDFService.estimateProcessingTime(type, fileCount, totalSize);
  }
}