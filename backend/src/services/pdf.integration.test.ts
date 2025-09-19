import { promises as fs } from 'fs';
import path from 'path';
import { PDFService } from './pdf.service';
import { MockPDFService } from './mock-pdf.service';

describe('PDF Service Integration Tests', () => {
  let testPDFPath: string;
  let testPDF2Path: string;
  let testPDFBuffer: Buffer;
  let outputDir: string;

  beforeAll(async () => {
    // Create test directory
    outputDir = path.join(process.cwd(), 'test-output');
    await fs.mkdir(outputDir, { recursive: true });

    // Create test PDF files using pdf-lib
    const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

    // Create first test PDF
    const pdfDoc1 = await PDFDocument.create();
    const helveticaFont = await pdfDoc1.embedFont(StandardFonts.Helvetica);

    const page1 = pdfDoc1.addPage();
    const { width, height } = page1.getSize();

    page1.drawText('PDFCraft.Pro Test Document #1', {
      x: 50,
      y: height - 100,
      size: 24,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    page1.drawText('This is the first test document for PDF processing.', {
      x: 50,
      y: height - 150,
      size: 14,
      font: helveticaFont,
      color: rgb(0.2, 0.2, 0.2),
    });

    page1.drawText('Features to test:', {
      x: 50,
      y: height - 200,
      size: 16,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    page1.drawText('• PDF to PowerPoint conversion', {
      x: 70,
      y: height - 230,
      size: 12,
      font: helveticaFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    page1.drawText('• PDF merging functionality', {
      x: 70,
      y: height - 250,
      size: 12,
      font: helveticaFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    page1.drawText('• File validation and metadata extraction', {
      x: 70,
      y: height - 270,
      size: 12,
      font: helveticaFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Add a second page to test multi-page documents
    const page2 = pdfDoc1.addPage();
    page2.drawText('Second Page', {
      x: 50,
      y: height - 100,
      size: 20,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    page2.drawText('This PDF has multiple pages to test conversion accuracy.', {
      x: 50,
      y: height - 150,
      size: 12,
      font: helveticaFont,
      color: rgb(0.2, 0.2, 0.2),
    });

    const pdf1Buffer = await pdfDoc1.save();
    testPDFPath = path.join(outputDir, 'test-document-1.pdf');
    await fs.writeFile(testPDFPath, pdf1Buffer);
    testPDFBuffer = pdf1Buffer;

    // Create second test PDF
    const pdfDoc2 = await PDFDocument.create();
    const page3 = pdfDoc2.addPage();

    page3.drawText('PDFCraft.Pro Test Document #2', {
      x: 50,
      y: height - 100,
      size: 24,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    page3.drawText('This is the second test document for merge testing.', {
      x: 50,
      y: height - 150,
      size: 14,
      font: helveticaFont,
      color: rgb(0.2, 0.2, 0.2),
    });

    const pdf2Buffer = await pdfDoc2.save();
    testPDF2Path = path.join(outputDir, 'test-document-2.pdf');
    await fs.writeFile(testPDF2Path, pdf2Buffer);
  });

  afterAll(async () => {
    // Cleanup test files and directory
    try {
      const files = await fs.readdir(outputDir);
      for (const file of files) {
        await fs.unlink(path.join(outputDir, file));
      }
      await fs.rmdir(outputDir);
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  describe('PDF Validation', () => {
    it('should validate correct PDF files', async () => {
      const isValid = await PDFService.validatePDF(testPDFPath);
      expect(isValid).toBe(true);
    });

    it('should reject invalid PDF files', async () => {
      const invalidPDFPath = path.join(outputDir, 'invalid.pdf');
      await fs.writeFile(invalidPDFPath, Buffer.from('This is not a PDF file'));

      const isValid = await PDFService.validatePDF(invalidPDFPath);
      expect(isValid).toBe(false);

      // Cleanup
      await fs.unlink(invalidPDFPath);
    });

    it('should reject non-existent files', async () => {
      const isValid = await PDFService.validatePDF('/non/existent/file.pdf');
      expect(isValid).toBe(false);
    });
  });

  describe('PDF Metadata Extraction', () => {
    it('should extract correct metadata from PDF', async () => {
      const metadata = await PDFService.getPDFMetadata(testPDFPath);

      expect(metadata).toHaveProperty('pages');
      expect(metadata).toHaveProperty('size');
      expect(metadata.pages).toBe(2); // Our test PDF has 2 pages
      expect(metadata.size).toBeGreaterThan(0);
      expect(typeof metadata.size).toBe('number');
    });

    it('should handle PDFs with title and author', async () => {
      // Create a PDF with metadata
      const { PDFDocument, StandardFonts } = require('pdf-lib');

      const pdfDoc = await PDFDocument.create();
      pdfDoc.setTitle('Test PDF Title');
      pdfDoc.setAuthor('PDFCraft.Pro Test Suite');

      const page = pdfDoc.addPage();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText('PDF with metadata', { x: 50, y: 500, font });

      const pdfWithMetadata = await pdfDoc.save();
      const metadataPDFPath = path.join(outputDir, 'pdf-with-metadata.pdf');
      await fs.writeFile(metadataPDFPath, pdfWithMetadata);

      const metadata = await PDFService.getPDFMetadata(metadataPDFPath);

      expect(metadata.pages).toBe(1);
      expect(metadata.title).toBe('Test PDF Title');
      expect(metadata.author).toBe('PDFCraft.Pro Test Suite');

      // Cleanup
      await fs.unlink(metadataPDFPath);
    });

    it('should fail gracefully for invalid PDFs', async () => {
      const invalidPDFPath = path.join(outputDir, 'invalid-metadata.pdf');
      await fs.writeFile(invalidPDFPath, Buffer.from('Invalid PDF content'));

      await expect(PDFService.getPDFMetadata(invalidPDFPath)).rejects.toThrow();

      // Cleanup
      await fs.unlink(invalidPDFPath);
    });
  });

  describe('PDF to PowerPoint Conversion', () => {
    it('should convert PDF to PowerPoint (mock mode)', async () => {
      const startTime = Date.now();
      const outputFilename = await PDFService.convertPDFToPPT(testPDFPath, outputDir);
      const endTime = Date.now();

      expect(outputFilename).toBeTruthy();
      expect(outputFilename).toMatch(/\.pptx$/);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify output file exists
      const outputPath = path.join(outputDir, outputFilename);
      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);

      // Verify it's a mock PowerPoint file (in development mode)
      const content = await fs.readFile(outputPath, 'utf8');
      const mockData = JSON.parse(content);
      expect(mockData.mockPPTX).toBe(true);
      expect(mockData.originalFile).toBe('test-document-1.pdf');

      // Cleanup
      await fs.unlink(outputPath);
    });

    it('should handle conversion errors gracefully', async () => {
      const nonExistentPath = '/non/existent/file.pdf';

      await expect(PDFService.convertPDFToPPT(nonExistentPath, outputDir))
        .rejects.toThrow();
    });

    it('should generate unique output filenames', async () => {
      const filename1 = await PDFService.convertPDFToPPT(testPDFPath, outputDir);
      const filename2 = await PDFService.convertPDFToPPT(testPDFPath, outputDir);

      expect(filename1).not.toBe(filename2);
      expect(filename1).toMatch(/\.pptx$/);
      expect(filename2).toMatch(/\.pptx$/);

      // Cleanup
      await fs.unlink(path.join(outputDir, filename1));
      await fs.unlink(path.join(outputDir, filename2));
    });
  });

  describe('PDF Merging', () => {
    it('should merge multiple PDF files successfully', async () => {
      const inputPaths = [testPDFPath, testPDF2Path];
      const startTime = Date.now();
      const outputFilename = await PDFService.mergePDFs(inputPaths, outputDir);
      const endTime = Date.now();

      expect(outputFilename).toBeTruthy();
      expect(outputFilename).toMatch(/merged_.*\.pdf$/);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds

      // Verify output file exists
      const outputPath = path.join(outputDir, outputFilename);
      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);

      // Verify merged PDF has correct number of pages
      const metadata = await PDFService.getPDFMetadata(outputPath);
      expect(metadata.pages).toBe(3); // 2 pages from first PDF + 1 page from second PDF

      // Cleanup
      await fs.unlink(outputPath);
    });

    it('should handle single file merge', async () => {
      const outputFilename = await PDFService.mergePDFs([testPDFPath], outputDir);

      expect(outputFilename).toBeTruthy();

      const outputPath = path.join(outputDir, outputFilename);
      const metadata = await PDFService.getPDFMetadata(outputPath);
      expect(metadata.pages).toBe(2); // Same as original

      // Cleanup
      await fs.unlink(outputPath);
    });

    it('should handle empty input array', async () => {
      await expect(PDFService.mergePDFs([], outputDir))
        .rejects.toThrow();
    });

    it('should skip invalid PDF files during merge', async () => {
      const invalidPDFPath = path.join(outputDir, 'invalid-merge.pdf');
      await fs.writeFile(invalidPDFPath, Buffer.from('Invalid PDF'));

      const inputPaths = [testPDFPath, invalidPDFPath, testPDF2Path];
      const outputFilename = await PDFService.mergePDFs(inputPaths, outputDir);

      const outputPath = path.join(outputDir, outputFilename);
      const metadata = await PDFService.getPDFMetadata(outputPath);

      // Should have pages from valid PDFs only (2 + 1 = 3 pages)
      expect(metadata.pages).toBe(3);

      // Cleanup
      await fs.unlink(invalidPDFPath);
      await fs.unlink(outputPath);
    });

    it('should generate unique merge output filenames', async () => {
      const inputPaths = [testPDFPath, testPDF2Path];

      const filename1 = await PDFService.mergePDFs(inputPaths, outputDir);
      const filename2 = await PDFService.mergePDFs(inputPaths, outputDir);

      expect(filename1).not.toBe(filename2);
      expect(filename1).toMatch(/merged_.*\.pdf$/);
      expect(filename2).toMatch(/merged_.*\.pdf$/);

      // Cleanup
      await fs.unlink(path.join(outputDir, filename1));
      await fs.unlink(path.join(outputDir, filename2));
    });
  });

  describe('File Cleanup', () => {
    it('should clean up specified files', async () => {
      // Create test files for cleanup
      const file1 = path.join(outputDir, 'cleanup-test-1.txt');
      const file2 = path.join(outputDir, 'cleanup-test-2.txt');

      await fs.writeFile(file1, 'Test file 1');
      await fs.writeFile(file2, 'Test file 2');

      // Verify files exist
      expect((await fs.stat(file1)).isFile()).toBe(true);
      expect((await fs.stat(file2)).isFile()).toBe(true);

      // Clean up files
      await PDFService.cleanupFiles([file1, file2]);

      // Verify files are deleted
      await expect(fs.stat(file1)).rejects.toThrow();
      await expect(fs.stat(file2)).rejects.toThrow();
    });

    it('should handle cleanup of non-existent files gracefully', async () => {
      const nonExistentFiles = [
        '/non/existent/file1.pdf',
        '/non/existent/file2.pdf'
      ];

      // Should not throw error
      await expect(PDFService.cleanupFiles(nonExistentFiles)).resolves.not.toThrow();
    });

    it('should handle mixed existing and non-existent files', async () => {
      const existingFile = path.join(outputDir, 'existing-cleanup.txt');
      await fs.writeFile(existingFile, 'Test file');

      const filesToCleanup = [
        existingFile,
        '/non/existent/file.pdf'
      ];

      await PDFService.cleanupFiles(filesToCleanup);

      // Existing file should be deleted
      await expect(fs.stat(existingFile)).rejects.toThrow();
    });
  });

  describe('Processing Time Estimation', () => {
    it('should estimate reasonable time for PDF to PowerPoint conversion', async () => {
      const fileSize = 1024 * 1024; // 1MB
      const estimatedTime = PDFService.estimateProcessingTime('pdf-to-ppt', 1, fileSize);

      expect(estimatedTime).toBeGreaterThan(0);
      expect(estimatedTime).toBeLessThan(60); // Should be under 1 minute for 1MB file
    });

    it('should estimate reasonable time for PDF merging', async () => {
      const totalSize = 2 * 1024 * 1024; // 2MB total
      const fileCount = 3;
      const estimatedTime = PDFService.estimateProcessingTime('pdf-merge', fileCount, totalSize);

      expect(estimatedTime).toBeGreaterThan(0);
      expect(estimatedTime).toBeLessThan(30); // Should be under 30 seconds for small merge
    });

    it('should scale estimation with file size', async () => {
      const smallFileTime = PDFService.estimateProcessingTime('pdf-to-ppt', 1, 1024 * 1024); // 1MB
      const largeFileTime = PDFService.estimateProcessingTime('pdf-to-ppt', 1, 10 * 1024 * 1024); // 10MB

      expect(largeFileTime).toBeGreaterThan(smallFileTime);
    });

    it('should scale estimation with file count for merging', async () => {
      const fewFilesTime = PDFService.estimateProcessingTime('pdf-merge', 2, 2 * 1024 * 1024);
      const manyFilesTime = PDFService.estimateProcessingTime('pdf-merge', 10, 2 * 1024 * 1024);

      expect(manyFilesTime).toBeGreaterThan(fewFilesTime);
    });

    it('should return minimum 1 second for any operation', async () => {
      const verySmallFileTime = PDFService.estimateProcessingTime('pdf-to-ppt', 1, 100); // 100 bytes

      expect(verySmallFileTime).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Mock Service Functionality', () => {
    it('should provide same interface as real service', () => {
      // Verify MockPDFService has all required methods
      expect(typeof MockPDFService.convertPDFToPPT).toBe('function');
      expect(typeof MockPDFService.mergePDFs).toBe('function');
      expect(typeof MockPDFService.validatePDF).toBe('function');
      expect(typeof MockPDFService.getPDFMetadata).toBe('function');
      expect(typeof MockPDFService.cleanupFiles).toBe('function');
      expect(typeof MockPDFService.estimateProcessingTime).toBe('function');
    });

    it('should produce consistent mock PowerPoint files', async () => {
      const outputFilename = await MockPDFService.convertPDFToPPT(testPDFPath, outputDir);
      const outputPath = path.join(outputDir, outputFilename);

      const content = await fs.readFile(outputPath, 'utf8');
      const mockData = JSON.parse(content);

      expect(mockData.mockPPTX).toBe(true);
      expect(mockData.originalFile).toBe('test-document-1.pdf');
      expect(mockData.convertedAt).toBeTruthy();
      expect(mockData.note).toContain('mock PowerPoint file');

      // Cleanup
      await fs.unlink(outputPath);
    });

    it('should simulate realistic processing time', async () => {
      const startTime = Date.now();
      await MockPDFService.convertPDFToPPT(testPDFPath, outputDir);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeGreaterThan(1500); // Should take at least ~2 seconds (simulated)
      expect(processingTime).toBeLessThan(3000); // But not too long
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle output directory creation', async () => {
      const newOutputDir = path.join(outputDir, 'new-subdir');

      // Directory doesn't exist yet
      await expect(fs.stat(newOutputDir)).rejects.toThrow();

      // Service should create it
      const outputFilename = await PDFService.convertPDFToPPT(testPDFPath, newOutputDir);
      const outputPath = path.join(newOutputDir, outputFilename);

      // Verify directory and file exist
      expect((await fs.stat(newOutputDir)).isDirectory()).toBe(true);
      expect((await fs.stat(outputPath)).isFile()).toBe(true);

      // Cleanup
      await fs.unlink(outputPath);
      await fs.rmdir(newOutputDir);
    });

    it('should handle concurrent operations', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        PDFService.convertPDFToPPT(testPDFPath, outputDir)
      );

      const results = await Promise.all(promises);

      // All should succeed with unique filenames
      expect(results.length).toBe(5);
      const uniqueFilenames = new Set(results);
      expect(uniqueFilenames.size).toBe(5);

      // Cleanup
      for (const filename of results) {
        await fs.unlink(path.join(outputDir, filename));
      }
    });

    it('should handle very small PDF files', async () => {
      // Create minimal PDF
      const { PDFDocument } = require('pdf-lib');
      const minimalPDF = await PDFDocument.create();
      minimalPDF.addPage();

      const minimalBuffer = await minimalPDF.save();
      const minimalPath = path.join(outputDir, 'minimal.pdf');
      await fs.writeFile(minimalPath, minimalBuffer);

      const outputFilename = await PDFService.convertPDFToPPT(minimalPath, outputDir);
      expect(outputFilename).toBeTruthy();

      // Cleanup
      await fs.unlink(minimalPath);
      await fs.unlink(path.join(outputDir, outputFilename));
    });
  });
});