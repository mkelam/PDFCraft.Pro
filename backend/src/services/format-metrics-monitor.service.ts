/**
 * FORMAT-SPECIFIC METRICS MONITORING SERVICE
 *
 * Tracks and monitors metrics for all Office format conversions (PPTX, DOCX, XLSX)
 * Provides real-time reliability tracking and format-specific analytics
 *
 * Features:
 * - Format-specific conversion tracking (PDF→PPTX, PDF→DOCX, PDF→XLSX)
 * - Real-time success/failure rates per format
 * - Service-level performance metrics
 * - Trend analysis and alerting
 * - Historical data retention and reporting
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { OfficeOutputFormat } from '../types/pdf-conversion.types';

/**
 * Format-specific conversion metric
 */
export interface FormatConversionMetric {
  // Identification
  id: string;
  timestamp: Date;

  // Format details
  sourceFormat: 'pdf';
  targetFormat: OfficeOutputFormat;

  // Service information
  serviceName: string;
  engineUsed: 'cloudconvert' | 'libreoffice' | 'local' | 'hybrid';

  // File details
  inputFilename: string;
  outputFilename: string;
  inputSize: number;  // bytes
  outputSize: number; // bytes
  pageCount?: number;

  // Performance metrics
  processingTime: number;  // milliseconds
  queueTime?: number;      // milliseconds
  totalTime: number;       // milliseconds

  // Success metrics
  success: boolean;
  errorMessage?: string;
  errorCode?: string;

  // Quality metrics
  qualityScore?: number;   // 0-100
  confidence?: number;     // 0-100
  validationPassed: boolean;

  // User context
  userId?: string;
  userTier?: 'free' | 'starter' | 'pro' | 'enterprise';

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Format-specific performance statistics
 */
export interface FormatPerformanceStats {
  format: OfficeOutputFormat;
  timeRange: {
    start: Date;
    end: Date;
  };

  // Volume metrics
  totalConversions: number;
  successfulConversions: number;
  failedConversions: number;
  successRate: number;  // percentage

  // Performance metrics
  averageProcessingTime: number;
  medianProcessingTime: number;
  p95ProcessingTime: number;   // 95th percentile
  p99ProcessingTime: number;   // 99th percentile

  // Quality metrics
  averageQualityScore: number;
  averageConfidence: number;
  validationPassRate: number;

  // Size metrics
  averageInputSize: number;
  averageOutputSize: number;
  compressionRatio: number;

  // Service distribution
  serviceDistribution: Record<string, number>;  // { serviceName: count }
  engineDistribution: Record<string, number>;   // { engineName: count }

  // Error analysis
  topErrors: Array<{
    code: string;
    message: string;
    count: number;
    percentage: number;
  }>;

  // Trends
  trends: {
    successRateTrend: 'improving' | 'stable' | 'declining';
    performanceTrend: 'improving' | 'stable' | 'declining';
    qualityTrend: 'improving' | 'stable' | 'declining';
  };
}

/**
 * Real-time reliability dashboard data
 */
export interface ReliabilityDashboard {
  timestamp: Date;

  // Overall metrics (last 24 hours)
  overall: {
    totalConversions: number;
    successRate: number;
    averageTime: number;
    activeFailures: number;
  };

  // Per-format metrics
  formatMetrics: {
    pptx: FormatMetricSummary;
    docx: FormatMetricSummary;
    xlsx: FormatMetricSummary;
  };

  // Service health
  serviceHealth: Array<{
    serviceName: string;
    status: 'healthy' | 'degraded' | 'down';
    successRate: number;
    averageTime: number;
    recentErrors: number;
  }>;

  // Recent activity
  recentConversions: FormatConversionMetric[];

  // Alerts
  activeAlerts: Array<{
    severity: 'critical' | 'warning' | 'info';
    format: OfficeOutputFormat;
    message: string;
    timestamp: Date;
  }>;
}

/**
 * Summary metrics for a specific format
 */
interface FormatMetricSummary {
  conversions: number;
  successRate: number;
  averageTime: number;
  status: 'healthy' | 'degraded' | 'down';
}

/**
 * Format Metrics Monitor Service
 */
export class FormatMetricsMonitorService {
  private static readonly METRICS_FILE = path.join(process.cwd(), 'data', 'format-metrics.json');
  private static readonly DASHBOARD_FILE = path.join(process.cwd(), 'data', 'format-dashboard.json');
  private static readonly MAX_METRICS = 50000;  // ~3 months of high-volume data
  private static readonly METRICS_RETENTION_DAYS = 90;

  /**
   * Initialize the format metrics monitoring system
   */
  static async initialize(): Promise<void> {
    console.log('📊 [FORMAT-METRICS] Initializing format metrics monitoring...');

    try {
      // Ensure data directory exists
      await fs.mkdir(path.dirname(this.METRICS_FILE), { recursive: true });

      // Initialize metrics file if it doesn't exist
      try {
        await fs.access(this.METRICS_FILE);
      } catch {
        await fs.writeFile(this.METRICS_FILE, JSON.stringify([], null, 2));
        console.log('📄 [FORMAT-METRICS] Created new metrics file');
      }

      // Initialize dashboard file
      try {
        await fs.access(this.DASHBOARD_FILE);
      } catch {
        const initialDashboard = await this.generateDashboard();
        await fs.writeFile(this.DASHBOARD_FILE, JSON.stringify(initialDashboard, null, 2));
        console.log('📊 [FORMAT-METRICS] Created initial dashboard');
      }

      console.log('✅ [FORMAT-METRICS] Initialization complete');
    } catch (error) {
      console.error('❌ [FORMAT-METRICS] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Record a format conversion metric
   */
  static async recordConversion(metric: Omit<FormatConversionMetric, 'id' | 'timestamp'>): Promise<void> {
    const fullMetric: FormatConversionMetric = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...metric
    };

    try {
      // Load existing metrics
      const metrics = await this.loadMetrics();

      // Add new metric
      metrics.push(fullMetric);

      // Maintain size limit
      if (metrics.length > this.MAX_METRICS) {
        metrics.splice(0, metrics.length - this.MAX_METRICS);
      }

      // Save metrics
      await fs.writeFile(this.METRICS_FILE, JSON.stringify(metrics, null, 2));

      console.log(`✅ [FORMAT-METRICS] Recorded ${fullMetric.targetFormat} conversion:`, {
        success: fullMetric.success,
        time: fullMetric.processingTime,
        service: fullMetric.serviceName
      });

      // Update dashboard asynchronously
      this.updateDashboard().catch(err =>
        console.error('❌ [FORMAT-METRICS] Dashboard update failed:', err)
      );

      // Check for alerts
      await this.checkAlerts(fullMetric, metrics);

    } catch (error) {
      console.error('❌ [FORMAT-METRICS] Failed to record metric:', error);
    }
  }

  /**
   * Get format-specific performance statistics
   */
  static async getFormatStats(
    format: OfficeOutputFormat,
    timeRange?: { start: Date; end: Date }
  ): Promise<FormatPerformanceStats> {
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    const range = timeRange || { start: defaultStart, end: now };

    try {
      const metrics = await this.loadMetrics();
      const filteredMetrics = metrics.filter(m =>
        m.targetFormat === format &&
        new Date(m.timestamp) >= range.start &&
        new Date(m.timestamp) <= range.end
      );

      if (filteredMetrics.length === 0) {
        return this.getEmptyStats(format, range);
      }

      return this.calculateFormatStats(format, filteredMetrics, range);

    } catch (error) {
      console.error(`❌ [FORMAT-METRICS] Failed to get stats for ${format}:`, error);
      throw error;
    }
  }

  /**
   * Get real-time reliability dashboard
   */
  static async getDashboard(): Promise<ReliabilityDashboard> {
    try {
      const data = await fs.readFile(this.DASHBOARD_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      // Generate fresh dashboard if file doesn't exist
      return await this.generateDashboard();
    }
  }

  /**
   * Generate comprehensive dashboard data
   */
  private static async generateDashboard(): Promise<ReliabilityDashboard> {
    const metrics = await this.loadMetrics();
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentMetrics = metrics.filter(m => new Date(m.timestamp) >= last24h);

    // Overall metrics
    const totalConversions = recentMetrics.length;
    const successfulConversions = recentMetrics.filter(m => m.success).length;
    const successRate = totalConversions > 0 ? (successfulConversions / totalConversions) * 100 : 0;
    const averageTime = totalConversions > 0
      ? recentMetrics.reduce((sum, m) => sum + m.processingTime, 0) / totalConversions
      : 0;
    const activeFailures = recentMetrics.filter(m => !m.success).length;

    // Per-format metrics
    const formatMetrics = {
      pptx: this.getFormatSummary(recentMetrics, 'pptx'),
      docx: this.getFormatSummary(recentMetrics, 'docx'),
      xlsx: this.getFormatSummary(recentMetrics, 'xlsx')
    };

    // Service health
    const serviceHealth = this.calculateServiceHealth(recentMetrics);

    // Recent conversions (last 20)
    const recentConversions = metrics.slice(-20);

    // Active alerts
    const activeAlerts = await this.getActiveAlerts(recentMetrics);

    return {
      timestamp: now,
      overall: {
        totalConversions,
        successRate,
        averageTime,
        activeFailures
      },
      formatMetrics,
      serviceHealth,
      recentConversions,
      activeAlerts
    };
  }

  /**
   * Update dashboard with latest metrics
   */
  private static async updateDashboard(): Promise<void> {
    const dashboard = await this.generateDashboard();
    await fs.writeFile(this.DASHBOARD_FILE, JSON.stringify(dashboard, null, 2));
  }

  /**
   * Get summary metrics for a specific format
   */
  private static getFormatSummary(
    metrics: FormatConversionMetric[],
    format: OfficeOutputFormat
  ): FormatMetricSummary {
    const formatMetrics = metrics.filter(m => m.targetFormat === format);
    const conversions = formatMetrics.length;

    if (conversions === 0) {
      return {
        conversions: 0,
        successRate: 0,
        averageTime: 0,
        status: 'healthy'
      };
    }

    const successful = formatMetrics.filter(m => m.success).length;
    const successRate = (successful / conversions) * 100;
    const averageTime = formatMetrics.reduce((sum, m) => sum + m.processingTime, 0) / conversions;

    // Determine status
    let status: 'healthy' | 'degraded' | 'down';
    if (successRate >= 95) {
      status = 'healthy';
    } else if (successRate >= 80) {
      status = 'degraded';
    } else {
      status = 'down';
    }

    return {
      conversions,
      successRate,
      averageTime,
      status
    };
  }

  /**
   * Calculate service health metrics
   */
  private static calculateServiceHealth(metrics: FormatConversionMetric[]) {
    const serviceStats: Record<string, {
      total: number;
      successful: number;
      totalTime: number;
      errors: number;
    }> = {};

    metrics.forEach(m => {
      if (!serviceStats[m.serviceName]) {
        serviceStats[m.serviceName] = {
          total: 0,
          successful: 0,
          totalTime: 0,
          errors: 0
        };
      }

      const stats = serviceStats[m.serviceName];
      stats.total++;
      if (m.success) stats.successful++;
      stats.totalTime += m.processingTime;
      if (!m.success) stats.errors++;
    });

    return Object.entries(serviceStats).map(([serviceName, stats]) => {
      const successRate = (stats.successful / stats.total) * 100;
      const averageTime = stats.totalTime / stats.total;

      let status: 'healthy' | 'degraded' | 'down';
      if (successRate >= 98) {
        status = 'healthy';
      } else if (successRate >= 90) {
        status = 'degraded';
      } else {
        status = 'down';
      }

      return {
        serviceName,
        status,
        successRate,
        averageTime,
        recentErrors: stats.errors
      };
    });
  }

  /**
   * Get active alerts based on recent metrics
   */
  private static async getActiveAlerts(metrics: FormatConversionMetric[]): Promise<Array<{
    severity: 'critical' | 'warning' | 'info';
    format: OfficeOutputFormat;
    message: string;
    timestamp: Date;
  }>> {
    const alerts: any[] = [];
    const formats: OfficeOutputFormat[] = ['pptx', 'docx', 'xlsx'];

    for (const format of formats) {
      const formatMetrics = metrics.filter(m => m.targetFormat === format);

      if (formatMetrics.length === 0) continue;

      const successful = formatMetrics.filter(m => m.success).length;
      const successRate = (successful / formatMetrics.length) * 100;

      // Critical alert: success rate below 80%
      if (successRate < 80) {
        alerts.push({
          severity: 'critical',
          format,
          message: `${format.toUpperCase()} conversion success rate critically low: ${successRate.toFixed(1)}%`,
          timestamp: new Date()
        });
      }
      // Warning alert: success rate below 95%
      else if (successRate < 95) {
        alerts.push({
          severity: 'warning',
          format,
          message: `${format.toUpperCase()} conversion success rate degraded: ${successRate.toFixed(1)}%`,
          timestamp: new Date()
        });
      }

      // Performance alert: average time > 10s
      const avgTime = formatMetrics.reduce((sum, m) => sum + m.processingTime, 0) / formatMetrics.length;
      if (avgTime > 10000) {
        alerts.push({
          severity: 'warning',
          format,
          message: `${format.toUpperCase()} conversion performance degraded: ${(avgTime / 1000).toFixed(1)}s average`,
          timestamp: new Date()
        });
      }
    }

    return alerts;
  }

  /**
   * Calculate comprehensive format statistics
   */
  private static calculateFormatStats(
    format: OfficeOutputFormat,
    metrics: FormatConversionMetric[],
    timeRange: { start: Date; end: Date }
  ): FormatPerformanceStats {
    const total = metrics.length;
    const successful = metrics.filter(m => m.success).length;
    const failed = total - successful;

    // Processing time statistics
    const times = metrics.map(m => m.processingTime).sort((a, b) => a - b);
    const averageTime = times.reduce((sum, t) => sum + t, 0) / total;
    const medianTime = times[Math.floor(total / 2)];
    const p95Time = times[Math.floor(total * 0.95)];
    const p99Time = times[Math.floor(total * 0.99)];

    // Quality metrics
    const qualityScores = metrics.filter(m => m.qualityScore !== undefined).map(m => m.qualityScore!);
    const averageQualityScore = qualityScores.length > 0
      ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length
      : 0;

    const confidenceScores = metrics.filter(m => m.confidence !== undefined).map(m => m.confidence!);
    const averageConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length
      : 0;

    const validationPassed = metrics.filter(m => m.validationPassed).length;
    const validationPassRate = (validationPassed / total) * 100;

    // Size metrics
    const averageInputSize = metrics.reduce((sum, m) => sum + m.inputSize, 0) / total;
    const averageOutputSize = metrics.reduce((sum, m) => sum + m.outputSize, 0) / total;
    const compressionRatio = averageInputSize > 0 ? averageOutputSize / averageInputSize : 1;

    // Service distribution
    const serviceDistribution: Record<string, number> = {};
    const engineDistribution: Record<string, number> = {};

    metrics.forEach(m => {
      serviceDistribution[m.serviceName] = (serviceDistribution[m.serviceName] || 0) + 1;
      engineDistribution[m.engineUsed] = (engineDistribution[m.engineUsed] || 0) + 1;
    });

    // Error analysis
    const errorCounts: Record<string, { code: string; message: string; count: number }> = {};
    metrics.filter(m => !m.success).forEach(m => {
      const key = m.errorCode || 'UNKNOWN';
      if (!errorCounts[key]) {
        errorCounts[key] = {
          code: m.errorCode || 'UNKNOWN',
          message: m.errorMessage || 'Unknown error',
          count: 0
        };
      }
      errorCounts[key].count++;
    });

    const topErrors = Object.values(errorCounts)
      .map(e => ({
        ...e,
        percentage: (e.count / failed) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Trend analysis
    const trends = this.analyzeTrends(metrics);

    return {
      format,
      timeRange,
      totalConversions: total,
      successfulConversions: successful,
      failedConversions: failed,
      successRate: (successful / total) * 100,
      averageProcessingTime: averageTime,
      medianProcessingTime: medianTime,
      p95ProcessingTime: p95Time,
      p99ProcessingTime: p99Time,
      averageQualityScore,
      averageConfidence,
      validationPassRate,
      averageInputSize,
      averageOutputSize,
      compressionRatio,
      serviceDistribution,
      engineDistribution,
      topErrors,
      trends
    };
  }

  /**
   * Analyze performance trends
   */
  private static analyzeTrends(metrics: FormatConversionMetric[]) {
    if (metrics.length < 20) {
      return {
        successRateTrend: 'stable' as const,
        performanceTrend: 'stable' as const,
        qualityTrend: 'stable' as const
      };
    }

    const half = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, half);
    const secondHalf = metrics.slice(half);

    // Success rate trend
    const firstSuccessRate = firstHalf.filter(m => m.success).length / firstHalf.length;
    const secondSuccessRate = secondHalf.filter(m => m.success).length / secondHalf.length;

    // Performance trend (lower is better)
    const firstAvgTime = firstHalf.reduce((sum, m) => sum + m.processingTime, 0) / firstHalf.length;
    const secondAvgTime = secondHalf.reduce((sum, m) => sum + m.processingTime, 0) / secondHalf.length;

    // Quality trend
    const firstQualityScores = firstHalf.filter(m => m.qualityScore !== undefined).map(m => m.qualityScore!);
    const secondQualityScores = secondHalf.filter(m => m.qualityScore !== undefined).map(m => m.qualityScore!);

    const firstAvgQuality = firstQualityScores.length > 0
      ? firstQualityScores.reduce((sum, q) => sum + q, 0) / firstQualityScores.length
      : 0;
    const secondAvgQuality = secondQualityScores.length > 0
      ? secondQualityScores.reduce((sum, q) => sum + q, 0) / secondQualityScores.length
      : 0;

    return {
      successRateTrend: this.determineTrend(firstSuccessRate, secondSuccessRate, 0.02),
      performanceTrend: this.determineTrend(firstAvgTime, secondAvgTime, -200), // Negative because lower is better
      qualityTrend: this.determineTrend(firstAvgQuality, secondAvgQuality, 2)
    };
  }

  /**
   * Determine if a metric is improving, stable, or declining
   */
  private static determineTrend(
    oldValue: number,
    newValue: number,
    threshold: number
  ): 'improving' | 'stable' | 'declining' {
    const diff = newValue - oldValue;
    if (Math.abs(diff) < Math.abs(threshold)) return 'stable';
    return diff > 0 ? 'improving' : 'declining';
  }

  /**
   * Check for alerts based on new metric
   */
  private static async checkAlerts(
    metric: FormatConversionMetric,
    allMetrics: FormatConversionMetric[]
  ): Promise<void> {
    // Check for critical failure
    if (!metric.success) {
      console.warn(`🚨 [FORMAT-METRICS] ${metric.targetFormat.toUpperCase()} conversion failed:`, {
        file: metric.inputFilename,
        error: metric.errorMessage,
        service: metric.serviceName
      });
    }

    // Check for slow processing
    if (metric.processingTime > 15000) {
      console.warn(`⚡ [FORMAT-METRICS] Slow ${metric.targetFormat.toUpperCase()} conversion:`, {
        file: metric.inputFilename,
        time: metric.processingTime,
        service: metric.serviceName
      });
    }

    // Check for recent failure pattern (last 10 conversions for this format)
    const recentFormatMetrics = allMetrics
      .filter(m => m.targetFormat === metric.targetFormat)
      .slice(-10);

    if (recentFormatMetrics.length >= 5) {
      const recentFailures = recentFormatMetrics.filter(m => !m.success).length;
      const failureRate = recentFailures / recentFormatMetrics.length;

      if (failureRate > 0.3) { // More than 30% failures
        console.warn(`📉 [FORMAT-METRICS] High failure rate for ${metric.targetFormat.toUpperCase()}:`, {
          failures: recentFailures,
          total: recentFormatMetrics.length,
          rate: `${(failureRate * 100).toFixed(1)}%`
        });
      }
    }
  }

  /**
   * Get empty statistics structure
   */
  private static getEmptyStats(
    format: OfficeOutputFormat,
    timeRange: { start: Date; end: Date }
  ): FormatPerformanceStats {
    return {
      format,
      timeRange,
      totalConversions: 0,
      successfulConversions: 0,
      failedConversions: 0,
      successRate: 0,
      averageProcessingTime: 0,
      medianProcessingTime: 0,
      p95ProcessingTime: 0,
      p99ProcessingTime: 0,
      averageQualityScore: 0,
      averageConfidence: 0,
      validationPassRate: 0,
      averageInputSize: 0,
      averageOutputSize: 0,
      compressionRatio: 1,
      serviceDistribution: {},
      engineDistribution: {},
      topErrors: [],
      trends: {
        successRateTrend: 'stable',
        performanceTrend: 'stable',
        qualityTrend: 'stable'
      }
    };
  }

  /**
   * Load metrics from storage
   */
  private static async loadMetrics(): Promise<FormatConversionMetric[]> {
    try {
      const data = await fs.readFile(this.METRICS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Clean up old metrics (older than retention period)
   */
  static async cleanupOldMetrics(): Promise<void> {
    try {
      const metrics = await this.loadMetrics();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.METRICS_RETENTION_DAYS);

      const filteredMetrics = metrics.filter(m => new Date(m.timestamp) >= cutoffDate);

      if (filteredMetrics.length < metrics.length) {
        await fs.writeFile(this.METRICS_FILE, JSON.stringify(filteredMetrics, null, 2));
        console.log(`🧹 [FORMAT-METRICS] Cleaned up ${metrics.length - filteredMetrics.length} old metrics`);
      }
    } catch (error) {
      console.error('❌ [FORMAT-METRICS] Cleanup failed:', error);
    }
  }
}

export default FormatMetricsMonitorService;
