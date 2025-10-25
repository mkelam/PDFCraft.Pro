/**
 * Production Monitoring Service for PDFCraft.Pro
 * Comprehensive real-time monitoring for production environment
 */

import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import winston from 'winston';
import os from 'os';
import { performance } from 'perf_hooks';

export interface ProductionMetrics {
  // System metrics
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
    loadAverage: number[];
  };

  // Application metrics
  applicationHealth: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    activeConnections: number;
    queueLength: number;
  };

  // Conversion metrics
  conversionMetrics: {
    totalConversions: number;
    successfulConversions: number;
    failedConversions: number;
    averageConversionTime: number;
    pdfToPptConversions: number;
    pdfMergeOperations: number;
  };

  // Error tracking
  errorTracking: {
    criticalErrors: number;
    warnings: number;
    uniqueErrorTypes: Set<string>;
    recentErrors: ProductionError[];
  };

  timestamp: Date;
}

export interface ProductionError {
  id: string;
  timestamp: Date;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  category: string;
  message: string;
  stack?: string;
  context: any;
  userId?: string;
  requestId?: string;
  resolved: boolean;
}

export interface AlertRule {
  name: string;
  condition: (metrics: ProductionMetrics) => boolean;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  cooldownMinutes: number;
  lastTriggered?: Date;
}

export interface ProductionAlert {
  id: string;
  timestamp: Date;
  rule: AlertRule;
  metrics: ProductionMetrics;
  acknowledged: boolean;
  resolvedAt?: Date;
}

/**
 * Production Monitoring Service
 * Provides comprehensive monitoring for production environment
 */
export class ProductionMonitoringService extends EventEmitter {
  private static instance: ProductionMonitoringService;
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private alertCheckInterval: NodeJS.Timeout | null = null;
  private currentMetrics: ProductionMetrics;
  private errors: Map<string, ProductionError> = new Map();
  private alerts: Map<string, ProductionAlert> = new Map();
  private isMonitoring: boolean = false;

  // Alert rules for production monitoring
  private alertRules: AlertRule[] = [
    {
      name: 'HIGH_CPU_USAGE',
      condition: (metrics) => metrics.systemHealth.cpuUsage > 80,
      severity: 'CRITICAL',
      message: 'CPU usage is critically high',
      cooldownMinutes: 5
    },
    {
      name: 'HIGH_MEMORY_USAGE',
      condition: (metrics) => metrics.systemHealth.memoryUsage > 85,
      severity: 'CRITICAL',
      message: 'Memory usage is critically high',
      cooldownMinutes: 5
    },
    {
      name: 'HIGH_ERROR_RATE',
      condition: (metrics) => {
        const errorRate = metrics.applicationHealth.totalRequests > 0
          ? (metrics.applicationHealth.failedRequests / metrics.applicationHealth.totalRequests) * 100
          : 0;
        return errorRate > 10;
      },
      severity: 'CRITICAL',
      message: 'Error rate is critically high',
      cooldownMinutes: 2
    },
    {
      name: 'SLOW_RESPONSE_TIME',
      condition: (metrics) => metrics.applicationHealth.averageResponseTime > 5000,
      severity: 'WARNING',
      message: 'Response time is slower than expected',
      cooldownMinutes: 3
    },
    {
      name: 'HIGH_QUEUE_LENGTH',
      condition: (metrics) => metrics.applicationHealth.queueLength > 50,
      severity: 'WARNING',
      message: 'Processing queue is backing up',
      cooldownMinutes: 2
    },
    {
      name: 'LOW_CONVERSION_SUCCESS_RATE',
      condition: (metrics) => {
        const successRate = metrics.conversionMetrics.totalConversions > 0
          ? (metrics.conversionMetrics.successfulConversions / metrics.conversionMetrics.totalConversions) * 100
          : 100;
        return successRate < 95 && metrics.conversionMetrics.totalConversions > 10;
      },
      severity: 'CRITICAL',
      message: 'Conversion success rate is below 95%',
      cooldownMinutes: 5
    }
  ];

  constructor() {
    super();
    this.initializeMetrics();
  }

  public static getInstance(): ProductionMonitoringService {
    if (!ProductionMonitoringService.instance) {
      ProductionMonitoringService.instance = new ProductionMonitoringService();
    }
    return ProductionMonitoringService.instance;
  }

  private initializeMetrics(): void {
    this.currentMetrics = {
      systemHealth: {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        uptime: 0,
        loadAverage: []
      },
      applicationHealth: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        activeConnections: 0,
        queueLength: 0
      },
      conversionMetrics: {
        totalConversions: 0,
        successfulConversions: 0,
        failedConversions: 0,
        averageConversionTime: 0,
        pdfToPptConversions: 0,
        pdfMergeOperations: 0
      },
      errorTracking: {
        criticalErrors: 0,
        warnings: 0,
        uniqueErrorTypes: new Set(),
        recentErrors: []
      },
      timestamp: new Date()
    };
  }

  /**
   * Start production monitoring
   */
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      winston.warn('Production monitoring is already running');
      return;
    }

    this.isMonitoring = true;

    // Collect metrics every 30 seconds
    this.metricsCollectionInterval = setInterval(() => {
      this.collectMetrics();
    }, 30000);

    // Check alerts every 60 seconds
    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts();
    }, 60000);

    // Initial metrics collection
    await this.collectMetrics();

    winston.info('🔍 Production monitoring started');
    this.emit('monitoring-started');
  }

  /**
   * Stop production monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }

    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = null;
    }

    this.isMonitoring = false;
    winston.info('🔍 Production monitoring stopped');
    this.emit('monitoring-stopped');
  }

  /**
   * Collect system and application metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      // System metrics
      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      this.currentMetrics.systemHealth = {
        cpuUsage: await this.getCPUUsage(),
        memoryUsage: (usedMem / totalMem) * 100,
        diskUsage: await this.getDiskUsage(),
        uptime: os.uptime(),
        loadAverage: os.loadavg()
      };

      // Application metrics (these would be updated by middleware)
      // Note: In production, these should be updated by request middleware

      this.currentMetrics.timestamp = new Date();

      // Emit metrics update
      this.emit('metrics-updated', this.currentMetrics);

      // Save metrics to file for historical analysis
      await this.saveMetricsToFile();

    } catch (error) {
      winston.error('Error collecting metrics:', error);
      this.recordError({
        type: 'CRITICAL',
        category: 'MONITORING',
        message: 'Failed to collect system metrics',
        context: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  /**
   * Get CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startTime = process.hrtime();
      const startUsage = process.cpuUsage();

      setTimeout(() => {
        const delta = process.hrtime(startTime);
        const deltaCpu = process.cpuUsage(startUsage);

        const totalTime = delta[0] * 1e6 + delta[1] / 1e3; // microseconds
        const totalCpu = deltaCpu.user + deltaCpu.system; // microseconds

        const cpuPercent = (totalCpu / totalTime) * 100;
        resolve(Math.min(cpuPercent, 100));
      }, 100);
    });
  }

  /**
   * Get disk usage percentage
   */
  private async getDiskUsage(): Promise<number> {
    try {
      const stats = fs.statSync(process.cwd());
      // This is a simplified implementation
      // In production, you might want to use a library like 'node-disk-info'
      return 0; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  /**
   * Record an error in the system
   */
  public recordError(errorData: {
    type: 'CRITICAL' | 'WARNING' | 'INFO';
    category: string;
    message: string;
    stack?: string;
    context?: any;
    userId?: string;
    requestId?: string;
  }): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const error: ProductionError = {
      id: errorId,
      timestamp: new Date(),
      type: errorData.type,
      category: errorData.category,
      message: errorData.message,
      stack: errorData.stack,
      context: errorData.context,
      userId: errorData.userId,
      requestId: errorData.requestId,
      resolved: false
    };

    this.errors.set(errorId, error);

    // Update metrics
    if (errorData.type === 'CRITICAL') {
      this.currentMetrics.errorTracking.criticalErrors++;
    } else if (errorData.type === 'WARNING') {
      this.currentMetrics.errorTracking.warnings++;
    }

    this.currentMetrics.errorTracking.uniqueErrorTypes.add(errorData.category);
    this.currentMetrics.errorTracking.recentErrors.unshift(error);

    // Keep only recent 50 errors in memory
    if (this.currentMetrics.errorTracking.recentErrors.length > 50) {
      this.currentMetrics.errorTracking.recentErrors =
        this.currentMetrics.errorTracking.recentErrors.slice(0, 50);
    }

    winston.error(`Production Error [${errorData.type}] ${errorData.category}: ${errorData.message}`, {
      errorId,
      context: errorData.context
    });

    this.emit('error-recorded', error);

    return errorId;
  }

  /**
   * Update application metrics (called by middleware)
   */
  public updateApplicationMetrics(update: {
    requestCompleted?: boolean;
    requestFailed?: boolean;
    responseTime?: number;
    activeConnections?: number;
    queueLength?: number;
  }): void {
    if (update.requestCompleted) {
      this.currentMetrics.applicationHealth.totalRequests++;
      this.currentMetrics.applicationHealth.successfulRequests++;
    }

    if (update.requestFailed) {
      this.currentMetrics.applicationHealth.totalRequests++;
      this.currentMetrics.applicationHealth.failedRequests++;
    }

    if (update.responseTime !== undefined) {
      const current = this.currentMetrics.applicationHealth.averageResponseTime;
      const total = this.currentMetrics.applicationHealth.totalRequests;
      this.currentMetrics.applicationHealth.averageResponseTime =
        total > 1 ? ((current * (total - 1)) + update.responseTime) / total : update.responseTime;
    }

    if (update.activeConnections !== undefined) {
      this.currentMetrics.applicationHealth.activeConnections = update.activeConnections;
    }

    if (update.queueLength !== undefined) {
      this.currentMetrics.applicationHealth.queueLength = update.queueLength;
    }
  }

  /**
   * Update conversion metrics
   */
  public updateConversionMetrics(update: {
    conversionCompleted?: boolean;
    conversionFailed?: boolean;
    conversionTime?: number;
    type?: 'pdf-to-ppt' | 'pdf-merge';
  }): void {
    if (update.conversionCompleted) {
      this.currentMetrics.conversionMetrics.totalConversions++;
      this.currentMetrics.conversionMetrics.successfulConversions++;
    }

    if (update.conversionFailed) {
      this.currentMetrics.conversionMetrics.totalConversions++;
      this.currentMetrics.conversionMetrics.failedConversions++;
    }

    if (update.conversionTime !== undefined) {
      const current = this.currentMetrics.conversionMetrics.averageConversionTime;
      const total = this.currentMetrics.conversionMetrics.totalConversions;
      this.currentMetrics.conversionMetrics.averageConversionTime =
        total > 1 ? ((current * (total - 1)) + update.conversionTime) / total : update.conversionTime;
    }

    if (update.type === 'pdf-to-ppt') {
      this.currentMetrics.conversionMetrics.pdfToPptConversions++;
    } else if (update.type === 'pdf-merge') {
      this.currentMetrics.conversionMetrics.pdfMergeOperations++;
    }
  }

  /**
   * Check alert rules and trigger alerts if needed
   */
  private checkAlerts(): void {
    for (const rule of this.alertRules) {
      try {
        // Check cooldown
        if (rule.lastTriggered) {
          const cooldownMs = rule.cooldownMinutes * 60 * 1000;
          if (Date.now() - rule.lastTriggered.getTime() < cooldownMs) {
            continue;
          }
        }

        // Check condition
        if (rule.condition(this.currentMetrics)) {
          this.triggerAlert(rule);
        }
      } catch (error) {
        winston.error(`Error checking alert rule ${rule.name}:`, error);
      }
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(rule: AlertRule): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert: ProductionAlert = {
      id: alertId,
      timestamp: new Date(),
      rule: { ...rule },
      metrics: JSON.parse(JSON.stringify(this.currentMetrics)),
      acknowledged: false
    };

    this.alerts.set(alertId, alert);
    rule.lastTriggered = new Date();

    winston.error(`🚨 PRODUCTION ALERT [${rule.severity}]: ${rule.message}`, {
      alertId,
      metrics: this.currentMetrics
    });

    this.emit('alert-triggered', alert);

    // Auto-acknowledge INFO alerts after 5 minutes
    if (rule.severity === 'INFO') {
      setTimeout(() => {
        this.acknowledgeAlert(alertId);
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      winston.info(`Alert acknowledged: ${alertId}`);
      this.emit('alert-acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      winston.info(`Alert resolved: ${alertId}`);
      this.emit('alert-resolved', alert);
      return true;
    }
    return false;
  }

  /**
   * Save metrics to file for historical analysis
   */
  private async saveMetricsToFile(): Promise<void> {
    try {
      const metricsDir = path.join(process.cwd(), 'logs', 'metrics');

      // Ensure directory exists
      if (!fs.existsSync(metricsDir)) {
        fs.mkdirSync(metricsDir, { recursive: true });
      }

      const today = new Date().toISOString().split('T')[0];
      const metricsFile = path.join(metricsDir, `metrics-${today}.jsonl`);

      // Convert Set to Array for JSON serialization
      const metricsToSave = {
        ...this.currentMetrics,
        errorTracking: {
          ...this.currentMetrics.errorTracking,
          uniqueErrorTypes: Array.from(this.currentMetrics.errorTracking.uniqueErrorTypes)
        }
      };

      const metricsLine = JSON.stringify(metricsToSave) + '\n';
      fs.appendFileSync(metricsFile, metricsLine);

    } catch (error) {
      winston.error('Error saving metrics to file:', error);
    }
  }

  /**
   * Get current metrics
   */
  public getCurrentMetrics(): ProductionMetrics {
    return JSON.parse(JSON.stringify({
      ...this.currentMetrics,
      errorTracking: {
        ...this.currentMetrics.errorTracking,
        uniqueErrorTypes: Array.from(this.currentMetrics.errorTracking.uniqueErrorTypes)
      }
    }));
  }

  /**
   * Get recent alerts
   */
  public getRecentAlerts(limit: number = 10): ProductionAlert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get recent errors
   */
  public getRecentErrors(limit: number = 20): ProductionError[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get health status
   */
  public getHealthStatus(): {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    issues: string[];
    uptime: number;
    lastCheck: Date;
  } {
    const issues: string[] = [];
    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';

    // Check critical conditions
    if (this.currentMetrics.systemHealth.cpuUsage > 90) {
      issues.push('Critical CPU usage');
      status = 'CRITICAL';
    }

    if (this.currentMetrics.systemHealth.memoryUsage > 90) {
      issues.push('Critical memory usage');
      status = 'CRITICAL';
    }

    const errorRate = this.currentMetrics.applicationHealth.totalRequests > 0
      ? (this.currentMetrics.applicationHealth.failedRequests / this.currentMetrics.applicationHealth.totalRequests) * 100
      : 0;

    if (errorRate > 15) {
      issues.push('High error rate');
      status = 'CRITICAL';
    } else if (errorRate > 5) {
      issues.push('Elevated error rate');
      if (status !== 'CRITICAL') status = 'WARNING';
    }

    // Check recent critical errors
    const recentCriticalErrors = this.currentMetrics.errorTracking.recentErrors.filter(
      e => e.type === 'CRITICAL' && Date.now() - e.timestamp.getTime() < 300000 // 5 minutes
    );

    if (recentCriticalErrors.length > 0) {
      issues.push(`${recentCriticalErrors.length} recent critical errors`);
      if (status !== 'CRITICAL') status = 'WARNING';
    }

    return {
      status,
      issues,
      uptime: this.currentMetrics.systemHealth.uptime,
      lastCheck: this.currentMetrics.timestamp
    };
  }

  /**
   * Generate monitoring report
   */
  public generateReport(periodHours: number = 24): any {
    const now = Date.now();
    const periodMs = periodHours * 60 * 60 * 1000;

    const recentErrors = Array.from(this.errors.values()).filter(
      e => now - e.timestamp.getTime() < periodMs
    );

    const recentAlerts = Array.from(this.alerts.values()).filter(
      a => now - a.timestamp.getTime() < periodMs
    );

    return {
      reportGenerated: new Date(),
      periodHours,
      currentMetrics: this.getCurrentMetrics(),
      summary: {
        totalErrors: recentErrors.length,
        criticalErrors: recentErrors.filter(e => e.type === 'CRITICAL').length,
        totalAlerts: recentAlerts.length,
        unresolvedAlerts: recentAlerts.filter(a => !a.resolvedAt).length,
        healthStatus: this.getHealthStatus()
      },
      recentErrors: recentErrors.slice(0, 20),
      recentAlerts: recentAlerts.slice(0, 10)
    };
  }
}

// Export singleton instance
export const productionMonitoring = ProductionMonitoringService.getInstance();