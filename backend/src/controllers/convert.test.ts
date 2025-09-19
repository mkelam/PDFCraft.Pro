import request from 'supertest';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { Readable } from 'stream';
import { ConvertController } from './convert.controller';
import { optionalAuth } from '../middleware/auth';
import { _resetMockDatabase } from '../services/auth.service';

// Mock the database and Redis for testing
jest.mock('../config/database', () => {
  const mockGetConnection = jest.fn();
  const mockGetSQLite = jest.fn();

  return {
    getConnection: mockGetConnection,
    getSQLite: mockGetSQLite,
    connectDatabase: jest.fn().mockResolvedValue(undefined),
    closeConnection: jest.fn().mockResolvedValue(undefined)
  };
});

// Initialize mock Redis before importing modules that use it
const { connectRedis } = require('../config/redis');
connectRedis(); // Initialize mock Redis

// Create test app for PDF conversion testing
const createConvertTestApp = () => {
  const app = express();
  app.use(express.json());

  // File upload configuration for testing (more permissive than production)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
      files: 20,
    },
    // Remove fileFilter to let controller handle validation for better error responses
  });

  // Conversion routes
  app.post('/api/convert/pdf-to-ppt',
    upload.array('files', 5), // Allow multiple files so controller can validate properly
    optionalAuth,
    ConvertController.convertToPPT
  );

  app.post('/api/convert/merge',
    upload.array('files', 20),
    optionalAuth,
    ConvertController.mergePDFs
  );

  app.get('/api/job/:jobId/status', ConvertController.getJobStatus);
  app.get('/api/download/:filename', ConvertController.downloadFile);

  return app;
};

// Helper function to create a readable stream from buffer
function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

describe('PDF Conversion Functionality', () => {
  let app: express.Application;
  let testPDFBuffer: Buffer;
  let testPDFPath: string;
  let testPDFPath2: string;
  let testPDFPath3: string;
  let largePDFPath: string;
  let textFilePath: string;

  beforeAll(async () => {
    // Create a simple test PDF using pdf-lib
    const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    page.drawText('Test PDF for PDFCraft.Pro', {
      x: 50,
      y: height - 100,
      size: 20,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('This is a test document for conversion testing.', {
      x: 50,
      y: height - 150,
      size: 12,
      font: helveticaFont,
      color: rgb(0.2, 0.2, 0.2),
    });

    testPDFBuffer = await pdfDoc.save();

    // Create test directories
    await fs.mkdir('uploads', { recursive: true });
    await fs.mkdir('temp', { recursive: true });

    // Save test PDF files
    testPDFPath = path.join(process.cwd(), 'test.pdf');
    testPDFPath2 = path.join(process.cwd(), 'test2.pdf');
    testPDFPath3 = path.join(process.cwd(), 'test3.pdf');
    largePDFPath = path.join(process.cwd(), 'large-test.pdf');
    textFilePath = path.join(process.cwd(), 'test.txt');

    await fs.writeFile(testPDFPath, testPDFBuffer);
    await fs.writeFile(testPDFPath2, testPDFBuffer);
    await fs.writeFile(testPDFPath3, testPDFBuffer);
    await fs.writeFile(largePDFPath, testPDFBuffer); // For simplicity, using same PDF
    await fs.writeFile(textFilePath, 'This is a text file, not a PDF');
  });

  beforeEach(() => {
    app = createConvertTestApp();
    _resetMockDatabase();

    // Clear mocks first
    jest.clearAllMocks();

    // Then set up default mock implementations
    const { getConnection, getSQLite } = require('../config/database');

    getConnection.mockReturnValue({
      execute: jest.fn().mockResolvedValue([[], {}])
    });

    getSQLite.mockReturnValue({
      prepare: jest.fn(() => ({
        run: jest.fn(() => ({ lastInsertRowid: 1, changes: 1 })),
        get: jest.fn(() => ({ id: 1 })),
        all: jest.fn(() => [{ id: 'mock-job-id', status: 'pending', progress: 0 }])
      }))
    });
  });

  afterAll(async () => {
    // Cleanup test files
    try {
      await fs.unlink(testPDFPath).catch(() => {});
      await fs.unlink(testPDFPath2).catch(() => {});
      await fs.unlink(testPDFPath3).catch(() => {});
      await fs.unlink(largePDFPath).catch(() => {});
      await fs.unlink(textFilePath).catch(() => {});
      await fs.rmdir('uploads').catch(() => {});
      await fs.rmdir('temp').catch(() => {});
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/convert/pdf-to-ppt', () => {
    it('should successfully initiate PDF to PowerPoint conversion', async () => {
      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', testPDFPath)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('PDF conversion started');
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('estimatedTime');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('pages');
      expect(response.body.metadata).toHaveProperty('size');
    });

    it('should reject non-PDF files', async () => {
      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', textFilePath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Only PDF files are allowed');
    });

    it('should reject requests without files', async () => {
      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No PDF file provided');
    });

    it('should reject multiple files for conversion', async () => {
      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', testPDFPath)
        .attach('files', testPDFPath2)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Only one PDF file allowed for conversion');
    });

    it('should validate PDF file integrity', async () => {
      const invalidPDF = Buffer.from('Invalid PDF content');

      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', invalidPDF, 'invalid.pdf')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or corrupted PDF file');
    });

    it('should include metadata in conversion response', async () => {
      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', testPDFPath)
        .expect(202);

      expect(response.body.metadata.pages).toBe(1);
      expect(response.body.metadata.size).toBeGreaterThan(0);
      expect(response.body.estimatedTime).toBeGreaterThan(0);
    });
  });

  describe('POST /api/convert/merge', () => {
    it('should successfully initiate PDF merging', async () => {
      const response = await request(app)
        .post('/api/convert/merge')
        .attach('files', testPDFPath)
        .attach('files', testPDFPath2)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('PDF merge started');
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('estimatedTime');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata.fileCount).toBe(2);
      expect(response.body.metadata.totalSize).toBeGreaterThan(0);
    });

    it('should reject merge with only one file', async () => {
      const response = await request(app)
        .post('/api/convert/merge')
        .attach('files', testPDFPath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('At least 2 PDF files required for merging');
    });

    it('should reject merge with too many files', async () => {
      const request_builder = request(app).post('/api/convert/merge');

      // Add 11 files (exceeds limit of 10) - using same test files repeatedly
      for (let i = 1; i <= 11; i++) {
        const filePath = i % 3 === 0 ? testPDFPath3 : i % 2 === 0 ? testPDFPath2 : testPDFPath;
        request_builder.attach('files', filePath);
      }

      const response = await request_builder.expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Maximum 10 files allowed for merging');
    });

    it('should reject non-PDF files in merge', async () => {
      const response = await request(app)
        .post('/api/convert/merge')
        .attach('files', testPDFPath)
        .attach('files', textFilePath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('File 2 is not a PDF');
    });

    it('should validate all PDF files in merge', async () => {
      const invalidPDF = Buffer.from('Invalid PDF');

      const response = await request(app)
        .post('/api/convert/merge')
        .attach('files', testPDFPath)
        .attach('files', invalidPDF, 'invalid.pdf')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('File 2 is not a valid PDF');
    });

    it('should handle multiple valid PDF files', async () => {
      const response = await request(app)
        .post('/api/convert/merge')
        .attach('files', testPDFPath)
        .attach('files', testPDFPath2)
        .attach('files', testPDFPath3)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.metadata.fileCount).toBe(3);
    });
  });

  describe('GET /api/job/:jobId/status', () => {
    it('should return job status for valid job ID', async () => {
      // Mock database response for existing job
      const mockJob = {
        id: 'test-job-123',
        type: 'pdf-to-ppt',
        status: 'processing',
        progress: 50,
        created_at: new Date(),
        completed_at: null as any,
        processing_time: null as any
      };

      // Mock SQLite path (test environment uses SQLite, not MySQL)
      require('../config/database').getSQLite.mockReturnValue({
        prepare: jest.fn(() => ({
          all: jest.fn(() => [mockJob])
        }))
      });

      const response = await request(app)
        .get('/api/job/test-job-123/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.job.id).toBe('test-job-123');
      expect(response.body.job.type).toBe('pdf-to-ppt');
      expect(response.body.job.status).toBe('processing');
      expect(response.body.job.progress).toBe(50);
    });

    it('should return 404 for non-existent job', async () => {
      // Mock database response for non-existent job (empty result)
      require('../config/database').getSQLite.mockReturnValue({
        prepare: jest.fn(() => ({
          all: jest.fn(() => []) // No results
        }))
      });

      const response = await request(app)
        .get('/api/job/non-existent-job/status')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Job not found');
    });

    it('should include download URL for completed jobs', async () => {
      const mockJob = {
        id: 'completed-job-123',
        type: 'pdf-to-ppt',
        status: 'completed',
        progress: 100,
        output_file: 'converted-file.pptx',
        created_at: new Date(),
        completed_at: new Date(),
        processing_time: 3000
      };

      require('../config/database').getConnection.mockReturnValue({
        execute: jest.fn().mockResolvedValue([[mockJob], {}])
      });

      const response = await request(app)
        .get('/api/job/completed-job-123/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.job.status).toBe('completed');
      expect(response.body.job.downloadUrl).toBe('/api/download/converted-file.pptx');
      expect(response.body.job.processingTime).toBe(3000);
    });

    it('should include error message for failed jobs', async () => {
      const mockJob = {
        id: 'failed-job-123',
        type: 'pdf-to-ppt',
        status: 'failed',
        progress: 0,
        error_message: 'Conversion failed due to corrupted PDF',
        created_at: new Date(),
        completed_at: new Date(),
        processing_time: null as any
      };

      require('../config/database').getConnection.mockReturnValue({
        execute: jest.fn().mockResolvedValue([[mockJob], {}])
      });

      const response = await request(app)
        .get('/api/job/failed-job-123/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.job.status).toBe('failed');
      expect(response.body.job.errorMessage).toBe('Conversion failed due to corrupted PDF');
    });
  });

  describe('GET /api/download/:filename', () => {
    let testOutputFile: string;

    beforeEach(async () => {
      // Create a test output file
      testOutputFile = path.join(process.cwd(), 'temp', 'test-output.pptx');
      await fs.mkdir(path.dirname(testOutputFile), { recursive: true });
      await fs.writeFile(testOutputFile, Buffer.from('Mock PowerPoint content'));
    });

    afterEach(async () => {
      // Cleanup test file
      try {
        await fs.unlink(testOutputFile);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should download existing file', async () => {
      const response = await request(app)
        .get('/api/download/test-output.pptx')
        .expect(200);

      expect(response.headers['content-disposition']).toContain('attachment; filename="test-output.pptx"');
      expect(response.body).toBeTruthy();
    });

    it('should return 404 for non-existent file', async () => {
      const response = await request(app)
        .get('/api/download/non-existent-file.pptx')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('File not found or expired');
    });

    it('should set correct content type for PowerPoint files', async () => {
      const response = await request(app)
        .get('/api/download/test-output.pptx')
        .expect(200);

      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    });

    it('should handle missing filename parameter', async () => {
      const response = await request(app)
        .get('/api/download/')
        .expect(404); // Express handles this as route not found
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle multer file upload errors', async () => {
      // Create a very large buffer to trigger size limit
      const largePDF = Buffer.alloc(200 * 1024 * 1024); // 200MB

      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', largePDF, 'large.pdf')
        .expect(413); // Payload too large

      // Note: Multer error handling is in server.js global error handler
    });

    it('should provide consistent error response format', async () => {
      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    });

    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      require('../config/database').getConnection.mockReturnValue({
        execute: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      });

      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', testPDFPath)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should handle Redis queue errors gracefully', async () => {
      // Mock queue error
      require('../config/redis').conversionQueue.add.mockRejectedValue(new Error('Redis connection failed'));

      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', testPDFPath)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('Performance and scalability', () => {
    it('should handle multiple concurrent conversion requests', async () => {
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/convert/pdf-to-ppt')
          .attach('files', testPDFPath)
          .expect(202)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('jobId');
      });

      // Verify all job IDs are unique
      const jobIds = responses.map(r => r.body.jobId);
      const uniqueJobIds = new Set(jobIds);
      expect(uniqueJobIds.size).toBe(jobIds.length);
    });

    it('should provide reasonable time estimates', async () => {
      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', testPDFPath)
        .expect(202);

      expect(response.body.estimatedTime).toBeGreaterThan(0);
      expect(response.body.estimatedTime).toBeLessThan(60); // Should be under 60 seconds
    });

    it('should handle large PDF files efficiently', async () => {
      // Create a larger test PDF (still within limits)
      const { PDFDocument, StandardFonts } = require('pdf-lib');

      const largePDF = await PDFDocument.create();
      const font = await largePDF.embedFont(StandardFonts.Helvetica);

      // Add 10 pages
      for (let i = 1; i <= 10; i++) {
        const page = largePDF.addPage();
        page.drawText(`Page ${i} - Test content for large PDF`, {
          x: 50,
          y: 500,
          size: 20,
          font,
        });
      }

      const largePDFBuffer = await largePDF.save();

      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', largePDFPath)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.metadata.pages).toBe(10);
      expect(response.body.estimatedTime).toBeGreaterThan(1); // Should take longer for more pages
    });
  });
});