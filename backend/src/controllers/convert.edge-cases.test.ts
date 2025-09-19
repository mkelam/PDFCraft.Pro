import request from 'supertest';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
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

// Create test app for edge case testing
const createEdgeCaseTestApp = () => {
  const app = express();
  app.use(express.json());

  // File upload configuration
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
      files: 20,
    },
  });

  // Conversion routes
  app.post('/api/convert/pdf-to-ppt',
    upload.array('files', 5),
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

describe('PDF Conversion Edge Cases', () => {
  let app: express.Application;
  let testPDFPath: string;
  let corruptedPDFPath: string;
  let largePDFPath: string;
  let emptyFilePath: string;

  beforeAll(async () => {
    // Create test files for edge cases
    const { PDFDocument, StandardFonts } = require('pdf-lib');

    // Create valid PDF
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.addPage();
    page.drawText('Edge Case Test PDF', {
      x: 50,
      y: 750,
      size: 30,
      font: helveticaFont,
    });
    const testPDFBuffer = await pdfDoc.save();
    testPDFPath = path.join(process.cwd(), 'edge-case-test.pdf');
    await fs.writeFile(testPDFPath, testPDFBuffer);

    // Create corrupted PDF (invalid content)
    corruptedPDFPath = path.join(process.cwd(), 'corrupted.pdf');
    await fs.writeFile(corruptedPDFPath, 'This is not a valid PDF file');

    // Create large PDF (simulate large file)
    const largePDF = await PDFDocument.create();
    for (let i = 0; i < 100; i++) {
      const page = largePDF.addPage();
      page.drawText(`Page ${i + 1}`, { x: 50, y: 750, size: 20 });
    }
    const largePDFBuffer = await largePDF.save();
    largePDFPath = path.join(process.cwd(), 'large-test.pdf');
    await fs.writeFile(largePDFPath, largePDFBuffer);

    // Create empty file
    emptyFilePath = path.join(process.cwd(), 'empty.pdf');
    await fs.writeFile(emptyFilePath, '');
  });

  beforeEach(() => {
    app = createEdgeCaseTestApp();
    _resetMockDatabase();

    // Clear mocks first
    jest.clearAllMocks();

    // Set up default mock implementations
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
      await fs.unlink(corruptedPDFPath).catch(() => {});
      await fs.unlink(largePDFPath).catch(() => {});
      await fs.unlink(emptyFilePath).catch(() => {});
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('File Size and Type Edge Cases', () => {
    it('should handle empty PDF files gracefully', async () => {
      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', emptyFilePath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should handle corrupted PDF files', async () => {
      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', corruptedPDFPath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should handle large PDF files within limits', async () => {
      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', largePDFPath)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
    });

    it('should reject files without .pdf extension but valid PDF content', async () => {
      // Create a PDF file with wrong extension
      const validPDFPath = path.join(process.cwd(), 'valid-content.txt');
      await fs.copyFile(testPDFPath, validPDFPath);

      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', validPDFPath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Only PDF files are allowed');

      // Cleanup
      await fs.unlink(validPDFPath).catch(() => {});
    });
  });

  describe('Merge Edge Cases', () => {
    it('should handle merge with identical files', async () => {
      const response = await request(app)
        .post('/api/convert/merge')
        .attach('files', testPDFPath)
        .attach('files', testPDFPath)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.metadata.fileCount).toBe(2);
    });

    it('should handle merge with different file sizes', async () => {
      const response = await request(app)
        .post('/api/convert/merge')
        .attach('files', testPDFPath)
        .attach('files', largePDFPath)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.metadata.fileCount).toBe(2);
    });

    it('should reject merge with corrupted files', async () => {
      const response = await request(app)
        .post('/api/convert/merge')
        .attach('files', testPDFPath)
        .attach('files', corruptedPDFPath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('File 2 is not a PDF');
    });

    it('should handle maximum number of files (edge of limit)', async () => {
      const request_builder = request(app).post('/api/convert/merge');

      // Add exactly 10 files (at the limit)
      for (let i = 0; i < 10; i++) {
        request_builder.attach('files', testPDFPath);
      }

      const response = await request_builder.expect(202);
      expect(response.body.success).toBe(true);
      expect(response.body.metadata.fileCount).toBe(10);
    });
  });

  describe('Job Status Edge Cases', () => {
    it('should handle job status with special characters in job ID', async () => {
      const specialJobId = 'job-with-special-chars-!@#$%';

      require('../config/database').getSQLite.mockReturnValue({
        prepare: jest.fn(() => ({
          all: jest.fn(() => [])
        }))
      });

      const response = await request(app)
        .get(`/api/job/${encodeURIComponent(specialJobId)}/status`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Job not found');
    });

    it('should handle extremely long job IDs', async () => {
      const longJobId = 'a'.repeat(1000);

      require('../config/database').getSQLite.mockReturnValue({
        prepare: jest.fn(() => ({
          all: jest.fn(() => [])
        }))
      });

      const response = await request(app)
        .get(`/api/job/${longJobId}/status`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Job not found');
    });

    it('should handle job status for completed job with missing output file', async () => {
      const mockJob = {
        id: 'completed-job-123',
        type: 'pdf-to-ppt',
        status: 'completed',
        progress: 100,
        output_file: 'non-existent-file.pptx',
        created_at: new Date(),
        completed_at: new Date()
      };

      require('../config/database').getSQLite.mockReturnValue({
        prepare: jest.fn(() => ({
          all: jest.fn(() => [mockJob])
        }))
      });

      const response = await request(app)
        .get('/api/job/completed-job-123/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.job.status).toBe('completed');
      expect(response.body.downloadUrl).toBeDefined();
    });
  });

  describe('Download Edge Cases', () => {
    it('should handle download requests with path traversal attempts', async () => {
      const maliciousFilename = '../../../etc/passwd';

      const response = await request(app)
        .get(`/api/download/${encodeURIComponent(maliciousFilename)}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('File not found or expired');
    });

    it('should handle download requests with null bytes', async () => {
      const maliciousFilename = 'test.pdf%00.txt';

      const response = await request(app)
        .get(`/api/download/${maliciousFilename}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('File not found or expired');
    });

    it('should handle download of very long filenames', async () => {
      const longFilename = 'a'.repeat(300) + '.pdf';

      const response = await request(app)
        .get(`/api/download/${longFilename}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('File not found or expired');
    });
  });

  describe('Concurrent Request Edge Cases', () => {
    it('should handle multiple simultaneous conversion requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/convert/pdf-to-ppt')
          .attach('files', testPDFPath)
      );

      const responses = await Promise.allSettled(requests);

      // All requests should be processed
      expect(responses).toHaveLength(5);
      responses.forEach((result) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.status).toBe(202);
        }
      });
    });

    it('should handle mixed operation types simultaneously', async () => {
      const conversionRequest = request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', testPDFPath);

      const mergeRequest = request(app)
        .post('/api/convert/merge')
        .attach('files', testPDFPath)
        .attach('files', testPDFPath);

      const [conversionResponse, mergeResponse] = await Promise.all([
        conversionRequest,
        mergeRequest
      ]);

      expect(conversionResponse.status).toBe(202);
      expect(mergeResponse.status).toBe(202);
      expect(conversionResponse.body.jobId).not.toBe(mergeResponse.body.jobId);
    });
  });

  describe('Memory and Resource Edge Cases', () => {
    it('should handle conversion of PDF with many pages', async () => {
      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', largePDFPath)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.metadata.pages).toBeGreaterThan(10);
      expect(response.body.estimatedTime).toBeGreaterThan(1000); // Should take longer
    });

    it('should provide realistic time estimates for different file sizes', async () => {
      const smallResponse = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', testPDFPath)
        .expect(202);

      const largeResponse = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', largePDFPath)
        .expect(202);

      expect(largeResponse.body.estimatedTime).toBeGreaterThan(smallResponse.body.estimatedTime);
    });
  });
});