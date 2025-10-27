/**
 * Production Monitoring Middleware for pdflab.pro
 * Integrates monitoring into Express request/response cycle
 */

import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { productionMonitoring } from '../services/production-monitoring.service';
import winston from 'winston';
import { ConversionType } from '../types/conversion.types';

// Extend Request type to include monitoring data
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      requestId?: string;
      monitoringData?: {
        userId?: string;
        operationType?: string;
        fileSize?: number;
      };
    }
  }
}

/**
 * Request monitoring middleware
 * Tracks request metrics and response times
 */
export const requestMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate unique request ID
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.startTime = performance.now();

  // Track request start
  productionMonitoring.updateApplicationMetrics({
    activeConnections: 1 // This would be managed by connection tracking
  });

  // Override res.end to capture response data
  const originalEnd = res.end;
  res.end = function(this: Response, ...args: any[]) {
    const responseTime = performance.now() - (req.startTime || 0);
    const success = res.statusCode >= 200 && res.statusCode < 400;

    // Update metrics
    productionMonitoring.updateApplicationMetrics({
      requestCompleted: success,
      requestFailed: !success,
      responseTime
    });

    // Log request details
    winston.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: Math.round(responseTime),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Record errors for non-success responses
    if (!success) {
      productionMonitoring.recordError({
        type: res.statusCode >= 500 ? 'CRITICAL' : 'WARNING',
        category: 'HTTP_ERROR',
        message: `HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`,
        context: {
          requestId: req.requestId,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          responseTime,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        },
        requestId: req.requestId
      });
    }

    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Error monitoring middleware
 * Captures and records application errors
 */
export const errorMonitoringMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const responseTime = req.startTime ? performance.now() - req.startTime : 0;

  // Record the error
  const errorId = productionMonitoring.recordError({
    type: 'CRITICAL',
    category: 'APPLICATION_ERROR',
    message: error.message,
    stack: error.stack,
    context: {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      body: req.body,
      params: req.params,
      query: req.query
    },
    requestId: req.requestId,
    userId: req.monitoringData?.userId
  });

  // Update failure metrics
  productionMonitoring.updateApplicationMetrics({
    requestFailed: true,
    responseTime
  });

  winston.error('Application error caught by monitoring middleware', {
    errorId,
    requestId: req.requestId,
    error: error.message,
    stack: error.stack
  });

  // Send error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    errorId,
    requestId: req.requestId
  });
};

/**
 * Conversion monitoring middleware
 * Specifically tracks PDF conversion operations
 *
 * @param operationType - The type of conversion being performed (centralized type from conversion.types.ts)
 */
export const conversionMonitoringMiddleware = (
  operationType: ConversionType
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Initialize monitoring data
    req.monitoringData = {
      ...req.monitoringData,
      operationType
    };

    // Extract file size if available
    if (req.file) {
      req.monitoringData.fileSize = req.file.size;
    } else if (req.files && Array.isArray(req.files)) {
      req.monitoringData.fileSize = req.files.reduce((total, file) => total + file.size, 0);
    }

    // Override res.json to capture conversion results
    const originalJson = res.json;
    res.json = function(this: Response, data: any) {
      const responseTime = req.startTime ? performance.now() - req.startTime : 0;

      if (data.success) {
        // Successful conversion
        productionMonitoring.updateConversionMetrics({
          conversionCompleted: true,
          conversionTime: responseTime,
          type: operationType
        });

        winston.info('Conversion completed successfully', {
          requestId: req.requestId,
          operationType,
          responseTime: Math.round(responseTime),
          fileSize: req.monitoringData?.fileSize
        });
      } else {
        // Failed conversion
        productionMonitoring.updateConversionMetrics({
          conversionFailed: true,
          conversionTime: responseTime,
          type: operationType
        });

        productionMonitoring.recordError({
          type: 'CRITICAL',
          category: 'CONVERSION_FAILURE',
          message: `${operationType} conversion failed: ${data.error || 'Unknown error'}`,
          context: {
            requestId: req.requestId,
            operationType,
            responseTime,
            fileSize: req.monitoringData?.fileSize,
            errorDetails: data.error
          },
          requestId: req.requestId,
          userId: req.monitoringData?.userId
        });

        winston.error('Conversion failed', {
          requestId: req.requestId,
          operationType,
          error: data.error,
          responseTime: Math.round(responseTime),
          fileSize: req.monitoringData?.fileSize
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Queue monitoring middleware
 * Tracks background job queue metrics
 */
export const queueMonitoringMiddleware = (queueLength: number) => {
  productionMonitoring.updateApplicationMetrics({
    queueLength
  });
};

/**
 * Health check endpoint middleware
 * Provides health status for load balancers and monitoring systems
 */
export const healthCheckMiddleware = (req: Request, res: Response) => {
  const healthStatus = productionMonitoring.getHealthStatus();
  const currentMetrics = productionMonitoring.getCurrentMetrics();

  const response = {
    status: healthStatus.status,
    timestamp: new Date().toISOString(),
    uptime: healthStatus.uptime,
    issues: healthStatus.issues,
    metrics: {
      system: {
        cpuUsage: Math.round(currentMetrics.systemHealth.cpuUsage * 100) / 100,
        memoryUsage: Math.round(currentMetrics.systemHealth.memoryUsage * 100) / 100,
        uptime: currentMetrics.systemHealth.uptime
      },
      application: {
        totalRequests: currentMetrics.applicationHealth.totalRequests,
        successRate: currentMetrics.applicationHealth.totalRequests > 0
          ? Math.round((currentMetrics.applicationHealth.successfulRequests / currentMetrics.applicationHealth.totalRequests) * 10000) / 100
          : 100,
        averageResponseTime: Math.round(currentMetrics.applicationHealth.averageResponseTime),
        activeConnections: currentMetrics.applicationHealth.activeConnections,
        queueLength: currentMetrics.applicationHealth.queueLength
      },
      conversions: {
        totalConversions: currentMetrics.conversionMetrics.totalConversions,
        successRate: currentMetrics.conversionMetrics.totalConversions > 0
          ? Math.round((currentMetrics.conversionMetrics.successfulConversions / currentMetrics.conversionMetrics.totalConversions) * 10000) / 100
          : 100,
        averageConversionTime: Math.round(currentMetrics.conversionMetrics.averageConversionTime)
      }
    }
  };

  // Set appropriate status code
  const statusCode = healthStatus.status === 'HEALTHY' ? 200 :
                    healthStatus.status === 'WARNING' ? 200 : 503;

  res.status(statusCode).json(response);
};

/**
 * Metrics endpoint middleware
 * Provides detailed metrics for monitoring dashboards
 */
export const metricsEndpointMiddleware = (req: Request, res: Response) => {
  const currentMetrics = productionMonitoring.getCurrentMetrics();
  const recentAlerts = productionMonitoring.getRecentAlerts(10);
  const recentErrors = productionMonitoring.getRecentErrors(20);

  res.json({
    timestamp: new Date().toISOString(),
    metrics: currentMetrics,
    alerts: recentAlerts.map(alert => ({
      id: alert.id,
      timestamp: alert.timestamp,
      severity: alert.rule.severity,
      message: alert.rule.message,
      acknowledged: alert.acknowledged,
      resolved: !!alert.resolvedAt
    })),
    errors: recentErrors.map(error => ({
      id: error.id,
      timestamp: error.timestamp,
      type: error.type,
      category: error.category,
      message: error.message,
      resolved: error.resolved
    }))
  });
};

/**
 * Dashboard endpoint middleware
 * Provides monitoring dashboard data
 */
export const dashboardEndpointMiddleware = (req: Request, res: Response) => {
  const periodHours = parseInt(req.query.period as string) || 24;
  const report = productionMonitoring.generateReport(periodHours);

  res.json(report);
};

/**
 * Initialize production monitoring
 * Sets up monitoring service and starts collection
 */
export const initializeProductionMonitoring = async () => {
  try {
    await productionMonitoring.startMonitoring();
    winston.info('🔍 Production monitoring initialized successfully');
  } catch (error) {
    winston.error('Failed to initialize production monitoring:', error);
    throw error;
  }
};

/**
 * Cleanup monitoring on application shutdown
 */
export const cleanupProductionMonitoring = () => {
  productionMonitoring.stopMonitoring();
  winston.info('🔍 Production monitoring cleanup completed');
};