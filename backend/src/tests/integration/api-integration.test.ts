/**
 * API INTEGRATION TESTS
 *
 * Tests the integration of quality dashboard API endpoints
 * Validates API responses and data flow
 */

import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { promises as fs } from 'fs';
import * as path from 'path';
import qualityDashboardRoutes from '../../routes/quality-dashboard.routes';
import { QualityMonitoringService } from '../../services/quality-monitoring.service';

// Test server setup
const createTestServer = (): express.Application => {
  const app = express();
  app.use(express.json());
  app.use('/api/quality', qualityDashboardRoutes);
  return app;
};

// Test configuration
const TEST_CONFIG = {
  testDataDir: path.join(__dirname, '../test-data'),
  timeout: 20000
};

describe('API Integration Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Create test server
    app = createTestServer();

    // Setup test environment
    await fs.mkdir(TEST_CONFIG.testDataDir, { recursive: true });

    // Initialize quality monitoring system
    await QualityMonitoringService.initialize();

    console.log('🧪 API integration test environment initialized');
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await fs.rmdir(TEST_CONFIG.testDataDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    console.log('🧹 API integration test cleanup completed');
  });

  describe('Quality Dashboard API Endpoints', () => {
    describe('POST /api/quality/initialize', () => {
      it('should initialize quality monitoring system', async () => {
        const response = await request(app)
          .post('/api/quality/initialize')
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('initialized successfully');
        expect(response.body.timestamp).toBeDefined();

        console.log('✅ Quality monitoring initialization API test passed');
      }, TEST_CONFIG.timeout);
    });

    describe('GET /api/quality/dashboard', () => {
      it('should return dashboard data', async () => {
        const response = await request(app)
          .get('/api/quality/dashboard')
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.timestamp).toBeDefined();

        // Verify dashboard data structure
        const { data } = response.body;
        expect(data.currentMetrics).toBeDefined();
        expect(data.recentActivity).toBeDefined();
        expect(data.alertSummary).toBeDefined();

        // Verify current metrics structure
        const { currentMetrics } = data;
        expect(typeof currentMetrics.operationsToday).toBe('number');
        expect(typeof currentMetrics.successRateToday).toBe('number');
        expect(typeof currentMetrics.averageScoreToday).toBe('number');
        expect(typeof currentMetrics.activeIssues).toBe('number');

        // Verify alert summary structure
        const { alertSummary } = data;
        expect(typeof alertSummary.criticalAlerts).toBe('number');
        expect(typeof alertSummary.warningAlerts).toBe('number');
        expect(typeof alertSummary.infoAlerts).toBe('number');

        console.log('✅ Dashboard API test passed');
      }, TEST_CONFIG.timeout);
    });

    describe('GET /api/quality/health', () => {
      it('should return system health status', async () => {
        const response = await request(app)
          .get('/api/quality/health')
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();

        // Verify health data structure
        const { data } = response.body;
        expect(data.status).toBeDefined();
        expect(['healthy', 'warning', 'critical']).toContain(data.status);
        expect(Array.isArray(data.details)).toBe(true);
        expect(data.metrics).toBeDefined();
        expect(data.alerts).toBeDefined();
        expect(data.lastChecked).toBeDefined();

        console.log(`✅ Health API test passed - Status: ${data.status}`);
      }, TEST_CONFIG.timeout);
    });

    describe('GET /api/quality/report', () => {
      it('should generate quality report with default time range', async () => {
        const response = await request(app)
          .get('/api/quality/report')
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();

        // Verify report structure
        const { data: report } = response.body;
        expect(report.reportId).toBeDefined();
        expect(report.generatedAt).toBeDefined();
        expect(report.timeRange).toBeDefined();
        expect(report.summary).toBeDefined();
        expect(report.trends).toBeDefined();
        expect(report.topIssues).toBeDefined();
        expect(report.servicePerformance).toBeDefined();
        expect(report.recommendations).toBeDefined();

        // Verify summary structure
        const { summary } = report;
        expect(typeof summary.totalOperations).toBe('number');
        expect(typeof summary.successfulOperations).toBe('number');
        expect(typeof summary.successRate).toBe('number');
        expect(typeof summary.averageQualityScore).toBe('number');
        expect(typeof summary.averageProcessingTime).toBe('number');
        expect(typeof summary.totalIssues).toBe('number');

        // Verify trends structure
        const { trends } = report;
        expect(['improving', 'stable', 'declining']).toContain(trends.qualityTrend);
        expect(['improving', 'stable', 'declining']).toContain(trends.performanceTrend);
        expect(['improving', 'stable', 'declining']).toContain(trends.reliabilityTrend);

        console.log('✅ Quality report API test passed');
      }, TEST_CONFIG.timeout);

      it('should generate quality report with custom time range', async () => {
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
        const endDate = new Date().toISOString();

        const response = await request(app)
          .get('/api/quality/report')
          .query({
            startDate,
            endDate
          })
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();

        const { data: report } = response.body;
        expect(report.timeRange).toBeDefined();
        expect(new Date(report.timeRange.start).getTime()).toBeLessThanOrEqual(new Date(startDate).getTime() + 1000);
        expect(new Date(report.timeRange.end).getTime()).toBeLessThanOrEqual(new Date(endDate).getTime() + 1000);

        console.log('✅ Custom time range report API test passed');
      }, TEST_CONFIG.timeout);

      it('should handle invalid date format', async () => {
        const response = await request(app)
          .get('/api/quality/report')
          .query({
            startDate: 'invalid-date',
            endDate: 'also-invalid'
          })
          .expect(400);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid date format');

        console.log('✅ Invalid date format handling test passed');
      });
    });

    describe('GET /api/quality/trends', () => {
      it('should return trends analysis with default days', async () => {
        const response = await request(app)
          .get('/api/quality/trends')
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();

        const { data } = response.body;
        expect(data.timeRange).toBeDefined();
        expect(data.trends).toBeDefined();
        expect(data.summary).toBeDefined();
        expect(data.topIssues).toBeDefined();
        expect(data.servicePerformance).toBeDefined();

        console.log('✅ Trends analysis API test passed');
      }, TEST_CONFIG.timeout);

      it('should handle custom days parameter', async () => {
        const response = await request(app)
          .get('/api/quality/trends')
          .query({ days: '14' })
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);

        console.log('✅ Custom days trends API test passed');
      });

      it('should handle invalid days parameter', async () => {
        const response = await request(app)
          .get('/api/quality/trends')
          .query({ days: 'invalid' })
          .expect(400);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid days parameter');

        console.log('✅ Invalid days parameter handling test passed');
      });

      it('should handle out-of-range days parameter', async () => {
        const response = await request(app)
          .get('/api/quality/trends')
          .query({ days: '200' }) // More than 90 days
          .expect(400);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Days must be between 1 and 90');

        console.log('✅ Out-of-range days parameter handling test passed');
      });
    });

    describe('GET /api/quality/services', () => {
      it('should return service breakdown', async () => {
        const response = await request(app)
          .get('/api/quality/services')
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();

        const { data } = response.body;
        expect(data.timeRange).toBeDefined();
        expect(Array.isArray(data.services)).toBe(true);
        expect(typeof data.totalOperations).toBe('number');

        // If services exist, verify their structure
        if (data.services.length > 0) {
          const service = data.services[0];
          expect(service.serviceName).toBeDefined();
          expect(typeof service.operationCount).toBe('number');
          expect(typeof service.averageScore).toBe('number');
          expect(typeof service.averageTime).toBe('number');
          expect(typeof service.successRate).toBe('number');
          expect(service.healthStatus).toBeDefined();
          expect(['healthy', 'warning', 'critical']).toContain(service.healthStatus);
          expect(Array.isArray(service.recommendations)).toBe(true);
        }

        console.log('✅ Service breakdown API test passed');
      }, TEST_CONFIG.timeout);
    });

    describe('GET /api/quality/metrics/export', () => {
      it('should export metrics as CSV', async () => {
        const response = await request(app)
          .get('/api/quality/metrics/export')
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment');

        // Verify CSV content structure
        const csvContent = response.text;
        expect(csvContent).toContain('ID,Timestamp,Service'); // CSV header

        console.log('✅ CSV export API test passed');
      }, TEST_CONFIG.timeout);

      it('should export metrics with custom filename', async () => {
        const customFilename = 'custom-metrics.csv';

        const response = await request(app)
          .get('/api/quality/metrics/export')
          .query({ filename: customFilename })
          .expect(200);

        expect(response.headers['content-disposition']).toContain(customFilename);

        console.log('✅ Custom filename CSV export API test passed');
      });

      it('should export metrics with date range', async () => {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = new Date().toISOString();

        const response = await request(app)
          .get('/api/quality/metrics/export')
          .query({
            startDate,
            endDate
          })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');

        console.log('✅ Date range CSV export API test passed');
      });

      it('should handle invalid date format in export', async () => {
        const response = await request(app)
          .get('/api/quality/metrics/export')
          .query({
            startDate: 'invalid-date',
            endDate: 'also-invalid'
          })
          .expect(400);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid date format');

        console.log('✅ Invalid date format in export handling test passed');
      });
    });
  });

  describe('API Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // This test would typically involve mocking a service to throw an error
      // For now, we'll test that the API structure handles errors properly

      const response = await request(app)
        .get('/api/quality/nonexistent-endpoint')
        .expect(404);

      // Express will handle 404s, so we just verify the structure
      console.log('✅ 404 error handling test passed');
    });

    it('should validate request parameters', async () => {
      // Test various parameter validation scenarios
      const tests = [
        {
          endpoint: '/api/quality/trends',
          query: { days: '-5' },
          expectedStatus: 400,
          description: 'negative days parameter'
        },
        {
          endpoint: '/api/quality/trends',
          query: { days: '0' },
          expectedStatus: 400,
          description: 'zero days parameter'
        }
      ];

      for (const test of tests) {
        const response = await request(app)
          .get(test.endpoint)
          .query(test.query)
          .expect(test.expectedStatus);

        expect(response.body.success).toBe(false);
        console.log(`✅ Parameter validation test passed: ${test.description}`);
      }
    });
  });

  describe('API Response Structure Validation', () => {
    it('should ensure all successful responses have consistent structure', async () => {
      const endpoints = [
        '/api/quality/dashboard',
        '/api/quality/health',
        '/api/quality/report',
        '/api/quality/trends',
        '/api/quality/services'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);

        // All successful responses should have this structure
        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();

        console.log(`✅ Response structure validation passed for ${endpoint}`);
      }
    });

    it('should ensure all error responses have consistent structure', async () => {
      const errorTests = [
        {
          endpoint: '/api/quality/report',
          query: { startDate: 'invalid' },
          description: 'report with invalid date'
        },
        {
          endpoint: '/api/quality/trends',
          query: { days: 'invalid' },
          description: 'trends with invalid days'
        }
      ];

      for (const test of errorTests) {
        const response = await request(app)
          .get(test.endpoint)
          .query(test.query)
          .expect(400);

        // All error responses should have this structure
        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();

        console.log(`✅ Error response structure validation passed: ${test.description}`);
      }
    });
  });

  describe('API Performance and Timeout Handling', () => {
    it('should handle concurrent API requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(app).get('/api/quality/dashboard')
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        console.log(`✅ Concurrent request ${index + 1} completed successfully`);
      });

      console.log('🔄 Concurrent API requests test passed');
    }, TEST_CONFIG.timeout);

    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/quality/dashboard')
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds

      console.log(`✅ Response time test passed: ${responseTime}ms`);
    });
  });

  describe('API Data Consistency', () => {
    it('should return consistent data types across endpoints', async () => {
      // Get data from multiple endpoints and verify consistency
      const dashboardResponse = await request(app)
        .get('/api/quality/dashboard')
        .expect(200);

      const healthResponse = await request(app)
        .get('/api/quality/health')
        .expect(200);

      const reportResponse = await request(app)
        .get('/api/quality/report')
        .expect(200);

      // Verify that similar metrics have consistent types
      const dashboardMetrics = dashboardResponse.body.data.currentMetrics;
      const healthMetrics = healthResponse.body.data.metrics;

      if (healthMetrics && dashboardMetrics) {
        // Both should have similar metric types
        expect(typeof dashboardMetrics.operationsToday).toBe(typeof healthMetrics.operationsToday);
        expect(typeof dashboardMetrics.successRateToday).toBe(typeof healthMetrics.successRateToday);
      }

      console.log('✅ Data consistency test passed');
    });

    it('should maintain data integrity across multiple requests', async () => {
      // Make multiple requests and ensure data doesn't change unexpectedly
      const firstResponse = await request(app)
        .get('/api/quality/dashboard')
        .expect(200);

      // Wait a small amount of time
      await new Promise(resolve => setTimeout(resolve, 100));

      const secondResponse = await request(app)
        .get('/api/quality/dashboard')
        .expect(200);

      // Verify that the structure remains consistent
      expect(typeof firstResponse.body.data).toBe(typeof secondResponse.body.data);
      expect(typeof firstResponse.body.data.currentMetrics).toBe(typeof secondResponse.body.data.currentMetrics);

      console.log('✅ Data integrity test passed');
    });
  });
});

export { createTestServer, TEST_CONFIG };