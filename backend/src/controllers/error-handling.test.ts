import request from 'supertest';
import express from 'express';
import multer from 'multer';
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

const createErrorTestApp = () => {
  const app = express();
  app.use(express.json());

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024,
      files: 20,
    },
  });

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

describe('Error Handling Edge Cases', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createErrorTestApp();
    _resetMockDatabase();
    jest.clearAllMocks();

    const { getConnection, getSQLite } = require('../config/database');

    getConnection.mockReturnValue({
      execute: jest.fn().mockResolvedValue([[], {}])
    });

    getSQLite.mockReturnValue({
      prepare: jest.fn(() => ({
        run: jest.fn(() => ({ lastInsertRowid: 1, changes: 1 })),
        get: jest.fn(() => ({ id: 1 })),
        all: jest.fn(() => [])
      }))
    });
  });

  describe('Database Error Scenarios', () => {
    it('should handle database connection failures gracefully', async () => {
      // Mock database error
      require('../config/database').getSQLite.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/job/test-job/status')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should handle database query timeouts', async () => {
      // Mock timeout error
      require('../config/database').getSQLite.mockReturnValue({
        prepare: jest.fn(() => ({
          all: jest.fn(() => {
            throw new Error('Query timeout');
          })
        }))
      });

      const response = await request(app)
        .get('/api/job/timeout-job/status')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should handle malformed database responses', async () => {
      // Mock malformed response
      require('../config/database').getSQLite.mockReturnValue({
        prepare: jest.fn(() => ({
          all: jest.fn(() => [{ invalid: 'data', missing: 'required_fields' }])
        }))
      });

      const response = await request(app)
        .get('/api/job/malformed-job/status')
        .expect(200);

      // Should still return a response, but with default values
      expect(response.body.success).toBe(true);
      expect(response.body.job).toBeDefined();
    });
  });

  describe('Redis Queue Error Scenarios', () => {
    it('should handle Redis connection failures during job creation', async () => {
      // Mock Redis queue error
      require('../config/redis').conversionQueue = {
        add: jest.fn().mockRejectedValue(new Error('Redis connection failed'))
      };

      const { PDFDocument, StandardFonts } = require('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      page.drawText('Test', { x: 50, y: 750, size: 30 });
      const pdfBuffer = await pdfDoc.save();

      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', Buffer.from(pdfBuffer), 'test.pdf')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should handle Redis queue being unavailable', async () => {
      // Mock Redis queue as null/undefined
      require('../config/redis').conversionQueue = null;

      const { PDFDocument, StandardFonts } = require('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      page.drawText('Test', { x: 50, y: 750, size: 30 });
      const pdfBuffer = await pdfDoc.save();

      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', Buffer.from(pdfBuffer), 'test.pdf')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('File System Error Scenarios', () => {
    it('should handle file system permission errors', async () => {
      // Mock fs operations that might fail
      jest.doMock('fs', () => ({
        promises: {
          mkdir: jest.fn().mockRejectedValue(new Error('Permission denied')),
          writeFile: jest.fn().mockRejectedValue(new Error('Permission denied')),
          access: jest.fn().mockRejectedValue(new Error('Permission denied')),
          stat: jest.fn().mockRejectedValue(new Error('Permission denied'))
        }
      }));

      const { PDFDocument } = require('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      page.drawText('Test', { x: 50, y: 750, size: 30 });
      const pdfBuffer = await pdfDoc.save();

      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', Buffer.from(pdfBuffer), 'test.pdf')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should handle disk space exhaustion', async () => {
      // Mock disk space error
      jest.doMock('fs', () => ({
        promises: {
          writeFile: jest.fn().mockRejectedValue(new Error('ENOSPC: no space left on device'))
        }
      }));

      const { PDFDocument } = require('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      page.drawText('Test', { x: 50, y: 750, size: 30 });
      const pdfBuffer = await pdfDoc.save();

      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', Buffer.from(pdfBuffer), 'test.pdf')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('Malformed Request Scenarios', () => {
    it('should handle requests with invalid content-type', async () => {
      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .set('Content-Type', 'application/json')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No PDF file provided');
    });

    it('should handle requests with corrupted multipart data', async () => {
      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .set('Content-Type', 'multipart/form-data; boundary=corrupted')
        .send('--corrupted\r\nCorrupted data\r\n--corrupted--')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle requests with missing required headers', async () => {
      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .send('raw data without proper headers')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No PDF file provided');
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle job IDs with SQL injection attempts', async () => {
      const maliciousJobId = "'; DROP TABLE conversion_jobs; --";

      const response = await request(app)
        .get(`/api/job/${encodeURIComponent(maliciousJobId)}/status`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Job not found');
    });

    it('should handle filenames with script injection attempts', async () => {
      const maliciousFilename = '<script>alert("xss")</script>.pdf';

      const response = await request(app)
        .get(`/api/download/${encodeURIComponent(maliciousFilename)}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('File not found or expired');
    });

    it('should handle extremely large payloads', async () => {
      // Create a large buffer (beyond reasonable limits)
      const largeBuffer = Buffer.alloc(200 * 1024 * 1024); // 200MB

      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', largeBuffer, 'huge.pdf')
        .expect(413); // Payload too large

      // Should be rejected by middleware before reaching controller
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle memory pressure during PDF processing', async () => {
      // Simulate memory pressure
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 1024 * 1024 * 1024, // 1GB
        heapTotal: 512 * 1024 * 1024, // 512MB
        heapUsed: 500 * 1024 * 1024, // 500MB (high usage)
        external: 0,
        arrayBuffers: 0
      });

      const { PDFDocument } = require('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      page.drawText('Memory Test', { x: 50, y: 750, size: 30 });
      const pdfBuffer = await pdfDoc.save();

      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', Buffer.from(pdfBuffer), 'memory-test.pdf')
        .expect(202); // Should still work but might be slower

      expect(response.body.success).toBe(true);

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should handle CPU-intensive operations gracefully', async () => {
      // Create multiple concurrent requests to simulate CPU pressure
      const { PDFDocument } = require('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      page.drawText('CPU Test', { x: 50, y: 750, size: 30 });
      const pdfBuffer = await pdfDoc.save();

      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/convert/pdf-to-ppt')
          .attach('files', Buffer.from(pdfBuffer), 'cpu-test.pdf')
      );

      const responses = await Promise.allSettled(requests);

      // Most requests should succeed
      const successfulResponses = responses.filter(r =>
        r.status === 'fulfilled' && r.value.status === 202
      );

      expect(successfulResponses.length).toBeGreaterThan(7); // At least 70% success rate
    });
  });

  describe('Cleanup and Recovery Scenarios', () => {
    it('should handle cleanup failures gracefully', async () => {
      // Mock cleanup failure but ensure main operation succeeds
      const mockPDFService = require('../services/pdf.service').PDFService;
      const originalCleanup = mockPDFService.cleanupFiles;
      mockPDFService.cleanupFiles = jest.fn().mockRejectedValue(new Error('Cleanup failed'));

      const { PDFDocument } = require('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      page.drawText('Cleanup Test', { x: 50, y: 750, size: 30 });
      const pdfBuffer = await pdfDoc.save();

      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .attach('files', Buffer.from(pdfBuffer), 'cleanup-test.pdf')
        .expect(202);

      expect(response.body.success).toBe(true);

      // Restore original function
      mockPDFService.cleanupFiles = originalCleanup;
    });

    it('should recover from temporary service unavailability', async () => {
      // First request fails
      let callCount = 0;
      require('../config/database').getSQLite.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Service temporarily unavailable');
        }
        return {
          prepare: jest.fn(() => ({
            run: jest.fn(() => ({ lastInsertRowid: 1, changes: 1 })),
            all: jest.fn(() => [])
          }))
        };
      });

      // First request should fail
      const firstResponse = await request(app)
        .get('/api/job/recovery-test/status')
        .expect(500);

      expect(firstResponse.body.success).toBe(false);

      // Second request should succeed (service recovered)
      const secondResponse = await request(app)
        .get('/api/job/recovery-test/status')
        .expect(404); // 404 because job doesn't exist, but service is working

      expect(secondResponse.body.success).toBe(false);
      expect(secondResponse.body.message).toBe('Job not found');
    });
  });
});