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

// Create test app for PDF conversion testing
const createSimpleTestApp = () => {
  const app = express();
  app.use(express.json());

  // Simple file upload configuration
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
      files: 20,
    },
  });

  // Conversion routes
  app.post('/api/convert/pdf-to-ppt',
    upload.array('files', 1),
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

describe('PDF Conversion Controller - Basic Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createSimpleTestApp();
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

  describe('Basic functionality tests', () => {
    it('should handle requests without files', async () => {
      const response = await request(app)
        .post('/api/convert/pdf-to-ppt')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No PDF file provided');
    });

    it('should handle merge requests with insufficient files', async () => {
      const response = await request(app)
        .post('/api/convert/merge')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('At least 2 PDF files required for merging');
    });

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
      // Mock database response for non-existent job
      require('../config/database').getSQLite.mockReturnValue({
        prepare: jest.fn(() => ({
          all: jest.fn(() => [])
        }))
      });

      const response = await request(app)
        .get('/api/job/non-existent-job/status')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Job not found');
    });

    it('should handle missing job ID parameter', async () => {
      const response = await request(app)
        .get('/api/job//status')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Job ID required');
    });

    it('should handle missing filename parameter for download', async () => {
      const response = await request(app)
        .get('/api/download/')
        .expect(404); // Express handles this as route not found
    });

    it('should handle non-existent download file', async () => {
      const response = await request(app)
        .get('/api/download/non-existent-file.pptx')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('File not found or expired');
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
        .get('/api/job/test-job/status')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should include proper job status response format', async () => {
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

      require('../config/database').getSQLite.mockReturnValue({
        prepare: jest.fn(() => ({
          all: jest.fn(() => [mockJob])
        }))
      });

      const response = await request(app)
        .get('/api/job/failed-job-123/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.job.status).toBe('failed');
      expect(response.body.job.errorMessage).toBe('Conversion failed due to corrupted PDF');
    });
  });

  describe('Controller method validation', () => {
    it('should have required controller methods', () => {
      expect(typeof ConvertController.convertToPPT).toBe('function');
      expect(typeof ConvertController.mergePDFs).toBe('function');
      expect(typeof ConvertController.getJobStatus).toBe('function');
      expect(typeof ConvertController.downloadFile).toBe('function');
    });

    it('should handle multiple requests without interference', async () => {
      const promises = Array.from({ length: 3 }, () =>
        request(app)
          .post('/api/convert/pdf-to-ppt')
          .expect(400)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('No PDF file provided');
      });
    });

    it('should validate file count for merge operations', async () => {
      // Test with no files
      const noFilesResponse = await request(app)
        .post('/api/convert/merge')
        .expect(400);

      expect(noFilesResponse.body.message).toBe('At least 2 PDF files required for merging');

      // Note: Testing with actual files requires working around supertest/multer issues
      // For now, we focus on basic validation that doesn't require file uploads
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle malformed job status requests', async () => {
      // Test with empty job ID
      const response = await request(app)
        .get('/api/job/ /status')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate download filename parameter', async () => {
      // Test various invalid filename patterns
      const invalidFilenames = ['../', '../../../etc/passwd', '', ' '];

      for (const filename of invalidFilenames) {
        const response = await request(app)
          .get(`/api/download/${encodeURIComponent(filename)}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('File not found or expired');
      }
    });

    it('should maintain consistent API response structure', async () => {
      const endpoints = [
        { method: 'post', path: '/api/convert/pdf-to-ppt', expectedStatus: 400 },
        { method: 'post', path: '/api/convert/merge', expectedStatus: 400 },
        { method: 'get', path: '/api/job/invalid-job/status', expectedStatus: 404 },
        { method: 'get', path: '/api/download/invalid-file.pdf', expectedStatus: 404 }
      ];

      for (const endpoint of endpoints) {
        let response;
        if (endpoint.method === 'post') {
          response = await request(app).post(endpoint.path).expect(endpoint.expectedStatus);
        } else {
          response = await request(app).get(endpoint.path).expect(endpoint.expectedStatus);
        }

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('message');
        expect(typeof response.body.message).toBe('string');
      }
    });
  });
});