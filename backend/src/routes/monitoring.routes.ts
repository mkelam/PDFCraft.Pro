/**
 * Production Monitoring Routes for pdflab.pro
 * API endpoints for monitoring dashboard and health checks
 */

import express from 'express';
import path from 'path';
import {
  healthCheckMiddleware,
  metricsEndpointMiddleware,
  dashboardEndpointMiddleware
} from '../middleware/production-monitoring.middleware';
import { productionMonitoring } from '../services/production-monitoring.service';
import winston from 'winston';

const router = express.Router();

/**
 * Monitoring dashboard UI
 * GET /api/monitoring/
 * Serves HTML dashboard for monitoring
 */
router.get('/', (req, res) => {
  const dashboardPath = path.join(__dirname, '..', 'views', 'monitoring-dashboard.html');
  res.sendFile(dashboardPath);
});

/**
 * Health check endpoint
 * GET /api/monitoring/health
 * Used by load balancers and external monitoring systems
 */
router.get('/health', healthCheckMiddleware);

/**
 * Detailed metrics endpoint
 * GET /api/monitoring/metrics
 * Provides current system and application metrics
 */
router.get('/metrics', metricsEndpointMiddleware);

/**
 * Monitoring dashboard data
 * GET /api/monitoring/dashboard?period=24
 * Provides comprehensive monitoring report for dashboard
 */
router.get('/dashboard', dashboardEndpointMiddleware);

/**
 * Recent alerts endpoint
 * GET /api/monitoring/alerts?limit=20
 */
router.get('/alerts', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const alerts = productionMonitoring.getRecentAlerts(limit);

  res.json({
    success: true,
    data: alerts.map(alert => ({
      id: alert.id,
      timestamp: alert.timestamp,
      rule: {
        name: alert.rule.name,
        severity: alert.rule.severity,
        message: alert.rule.message
      },
      acknowledged: alert.acknowledged,
      resolvedAt: alert.resolvedAt
    }))
  });
});

/**
 * Recent errors endpoint
 * GET /api/monitoring/errors?limit=50&type=CRITICAL
 */
router.get('/errors', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const type = req.query.type as string;

  let errors = productionMonitoring.getRecentErrors(limit);

  // Filter by type if specified
  if (type) {
    errors = errors.filter(error => error.type === type);
  }

  res.json({
    success: true,
    data: errors.map(error => ({
      id: error.id,
      timestamp: error.timestamp,
      type: error.type,
      category: error.category,
      message: error.message,
      resolved: error.resolved,
      userId: error.userId,
      requestId: error.requestId
    }))
  });
});

/**
 * Acknowledge alert endpoint
 * POST /api/monitoring/alerts/:alertId/acknowledge
 */
router.post('/alerts/:alertId/acknowledge', (req, res) => {
  const { alertId } = req.params;
  const success = productionMonitoring.acknowledgeAlert(alertId);

  if (success) {
    winston.info(`Alert ${alertId} acknowledged via API`);
    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Alert not found or already acknowledged'
    });
  }
});

/**
 * Resolve alert endpoint
 * POST /api/monitoring/alerts/:alertId/resolve
 */
router.post('/alerts/:alertId/resolve', (req, res) => {
  const { alertId } = req.params;
  const success = productionMonitoring.resolveAlert(alertId);

  if (success) {
    winston.info(`Alert ${alertId} resolved via API`);
    res.json({
      success: true,
      message: 'Alert resolved successfully'
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Alert not found'
    });
  }
});

/**
 * System status summary endpoint
 * GET /api/monitoring/status
 */
router.get('/status', (req, res) => {
  const healthStatus = productionMonitoring.getHealthStatus();
  const currentMetrics = productionMonitoring.getCurrentMetrics();

  // Calculate key performance indicators
  const errorRate = currentMetrics.applicationHealth.totalRequests > 0
    ? (currentMetrics.applicationHealth.failedRequests / currentMetrics.applicationHealth.totalRequests) * 100
    : 0;

  const conversionSuccessRate = currentMetrics.conversionMetrics.totalConversions > 0
    ? (currentMetrics.conversionMetrics.successfulConversions / currentMetrics.conversionMetrics.totalConversions) * 100
    : 100;

  res.json({
    success: true,
    data: {
      overall: {
        status: healthStatus.status,
        uptime: healthStatus.uptime,
        issues: healthStatus.issues,
        lastCheck: healthStatus.lastCheck
      },
      performance: {
        cpuUsage: Math.round(currentMetrics.systemHealth.cpuUsage * 100) / 100,
        memoryUsage: Math.round(currentMetrics.systemHealth.memoryUsage * 100) / 100,
        averageResponseTime: Math.round(currentMetrics.applicationHealth.averageResponseTime),
        averageConversionTime: Math.round(currentMetrics.conversionMetrics.averageConversionTime)
      },
      reliability: {
        errorRate: Math.round(errorRate * 100) / 100,
        conversionSuccessRate: Math.round(conversionSuccessRate * 100) / 100,
        criticalErrors: currentMetrics.errorTracking.criticalErrors,
        warnings: currentMetrics.errorTracking.warnings
      },
      activity: {
        totalRequests: currentMetrics.applicationHealth.totalRequests,
        totalConversions: currentMetrics.conversionMetrics.totalConversions,
        activeConnections: currentMetrics.applicationHealth.activeConnections,
        queueLength: currentMetrics.applicationHealth.queueLength
      }
    }
  });
});

/**
 * Export configuration for monitoring (for external tools)
 * GET /api/monitoring/config
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      endpoints: {
        health: '/api/monitoring/health',
        metrics: '/api/monitoring/metrics',
        dashboard: '/api/monitoring/dashboard',
        alerts: '/api/monitoring/alerts',
        errors: '/api/monitoring/errors',
        status: '/api/monitoring/status'
      },
      thresholds: {
        cpu: {
          warning: 70,
          critical: 90
        },
        memory: {
          warning: 80,
          critical: 90
        },
        errorRate: {
          warning: 5,
          critical: 15
        },
        responseTime: {
          warning: 3000,
          critical: 10000
        },
        conversionTime: {
          warning: 10000,
          critical: 30000
        }
      },
      alertRules: [
        'HIGH_CPU_USAGE',
        'HIGH_MEMORY_USAGE',
        'HIGH_ERROR_RATE',
        'SLOW_RESPONSE_TIME',
        'HIGH_QUEUE_LENGTH',
        'LOW_CONVERSION_SUCCESS_RATE'
      ]
    }
  });
});

/**
 * Record manual error endpoint (for testing or external integrations)
 * POST /api/monitoring/errors
 */
router.post('/errors', (req, res) => {
  const { type, category, message, context, userId } = req.body;

  if (!type || !category || !message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: type, category, message'
    });
  }

  const errorId = productionMonitoring.recordError({
    type,
    category,
    message,
    context,
    userId
  });

  winston.info(`Manual error recorded via API: ${errorId}`);

  res.json({
    success: true,
    data: {
      errorId,
      message: 'Error recorded successfully'
    }
  });
});

/**
 * Metrics history endpoint
 * GET /api/monitoring/history?hours=24&metric=cpu
 */
router.get('/history', (req, res) => {
  // This would require reading from stored metrics files
  // For now, return current metrics as placeholder
  const hours = parseInt(req.query.hours as string) || 1;
  const metric = req.query.metric as string;

  res.json({
    success: true,
    data: {
      period: `${hours} hours`,
      metric: metric || 'all',
      message: 'Historical metrics endpoint - implementation pending',
      note: 'This would read from stored metrics files for historical data'
    }
  });
});

export default router;