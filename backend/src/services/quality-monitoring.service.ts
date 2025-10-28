/**
 * QUALITY MONITORING SERVICE
 *
 * Comprehensive quality monitoring and reporting system
 * Tracks quality metrics across all PDF processing operations
 * Provides dashboards and analytics for quality improvement
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { QualityValidationResult } from '../middleware/quality-validation.middleware';

export interface QualityMetric {
  id: string;
  timestamp: Date;
  serviceName: string;
  operationType: 'pdf-to-ppt' | 'pdf-merge' | 'image-extraction';
  inputFile: string;
  outputFile: string;
  processingTime: number;
  qualityScore: number;
  isValid: boolean;
  targetDPI: number;
  actualDPI: number;
  targetQuality: number;
  actualQuality: number;
  issueCount: number;
  issueTypes: string[];
  fileSize: number;
  pageCount: number;
  qualityLevel: 'minimum' | 'good' | 'excellent';
}

export interface QualityReport {
  reportId: string;
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalOperations: number;
    successfulOperations: number;
    successRate: number;
    averageQualityScore: number;
    averageProcessingTime: number;
    totalIssues: number;
  };
  trends: {
    qualityTrend: 'improving' | 'stable' | 'declining';
    performanceTrend: 'improving' | 'stable' | 'declining';
    reliabilityTrend: 'improving' | 'stable' | 'declining';
  };
  topIssues: Array<{
    type: string;
    count: number;
    percentage: number;
    impact: 'low' | 'medium' | 'high';
  }>;
  servicePerformance: Array<{
    serviceName: string;
    operationCount: number;
    averageScore: number;
    averageTime: number;
    successRate: number;
  }>;
  recommendations: string[];
}

export class QualityMonitoringService {
  private static readonly METRICS_FILE = path.join(process.cwd(), 'data', 'quality-metrics.json');
  private static readonly REPORTS_DIR = path.join(process.cwd(), 'data', 'quality-reports');

  /**
   * Initialize quality monitoring system
   */
  static async initialize(): Promise<void> {
    console.log('🔧 [QUALITY-MONITOR] Initializing quality monitoring system...');

    try {
      // Ensure data directories exist
      await fs.mkdir(path.dirname(this.METRICS_FILE), { recursive: true });
      await fs.mkdir(this.REPORTS_DIR, { recursive: true });

      // Initialize metrics file if it doesn't exist
      try {
        await fs.access(this.METRICS_FILE);
      } catch {
        await fs.writeFile(this.METRICS_FILE, JSON.stringify([], null, 2));
        console.log('📄 Created new quality metrics file');
      }

      console.log('✅ [QUALITY-MONITOR] Initialization complete');
    } catch (error) {
      console.error('❌ [QUALITY-MONITOR] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Record a quality metric from a conversion operation
   */
  static async recordQualityMetric(
    serviceName: string,
    operationType: 'pdf-to-ppt' | 'pdf-merge' | 'image-extraction',
    inputFile: string,
    outputFile: string,
    qualityResult: QualityValidationResult,
    processingTime: number,
    additionalData?: {
      fileSize?: number;
      pageCount?: number;
      qualityLevel?: 'minimum' | 'good' | 'excellent';
    }
  ): Promise<void> {
    console.log('📊 [QUALITY-MONITOR] Recording quality metric...');

    try {
      const metric: QualityMetric = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        serviceName,
        operationType,
        inputFile: path.basename(inputFile),
        outputFile: path.basename(outputFile),
        processingTime,
        qualityScore: qualityResult.score,
        isValid: qualityResult.valid,
        targetDPI: qualityResult.targetDPI || 0,
        actualDPI: qualityResult.actualDPI || 0,
        targetQuality: qualityResult.targetQuality || 0,
        actualQuality: qualityResult.actualQuality || 0,
        issueCount: qualityResult.issues.length,
        issueTypes: qualityResult.issues.map(issue => issue.type),
        fileSize: additionalData?.fileSize || 0,
        pageCount: additionalData?.pageCount || 1,
        qualityLevel: additionalData?.qualityLevel || 'good'
      };

      // Load existing metrics
      const existingMetrics = await this.loadMetrics();
      existingMetrics.push(metric);

      // Keep only last 10,000 metrics (about 6 months of data)
      if (existingMetrics.length > 10000) {
        existingMetrics.splice(0, existingMetrics.length - 10000);
      }

      // Save updated metrics
      await fs.writeFile(this.METRICS_FILE, JSON.stringify(existingMetrics, null, 2));

      console.log('✅ [QUALITY-MONITOR] Metric recorded:', {
        service: serviceName,
        score: qualityResult.score,
        valid: qualityResult.valid,
        issues: qualityResult.issues.length
      });

      // Check for quality alerts
      await this.checkQualityAlerts(metric, existingMetrics);

    } catch (error) {
      console.error('❌ [QUALITY-MONITOR] Failed to record metric:', error);
    }
  }

  /**
   * Generate comprehensive quality report
   */
  static async generateQualityReport(
    timeRange?: { start: Date; end: Date }
  ): Promise<QualityReport> {
    console.log('📋 [QUALITY-MONITOR] Generating quality report...');

    const now = new Date();
    const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    const range = timeRange || {
      start: defaultStart,
      end: now
    };

    try {
      const metrics = await this.loadMetrics();
      const filteredMetrics = metrics.filter(m =>
        new Date(m.timestamp) >= range.start && new Date(m.timestamp) <= range.end
      );

      console.log(`📊 Analyzing ${filteredMetrics.length} metrics from ${range.start.toISOString()} to ${range.end.toISOString()}`);

      // Calculate summary statistics
      const summary = this.calculateSummary(filteredMetrics);
      const trends = this.analyzeTrends(filteredMetrics);
      const topIssues = this.analyzeTopIssues(filteredMetrics);
      const servicePerformance = this.analyzeServicePerformance(filteredMetrics);
      const recommendations = this.generateRecommendations(filteredMetrics, summary, topIssues);

      const report: QualityReport = {
        reportId: `report-${Date.now()}`,
        generatedAt: now,
        timeRange: range,
        summary,
        trends,
        topIssues,
        servicePerformance,
        recommendations
      };

      // Save report
      const reportPath = path.join(this.REPORTS_DIR, `${report.reportId}.json`);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

      console.log('✅ [QUALITY-MONITOR] Report generated:', {
        operations: summary.totalOperations,
        successRate: `${summary.successRate.toFixed(1)}%`,
        avgScore: summary.averageQualityScore.toFixed(1),
        issues: summary.totalIssues
      });

      return report;

    } catch (error) {
      console.error('❌ [QUALITY-MONITOR] Report generation failed:', error);
      throw error;
    }
  }

  /**
   * Get real-time quality dashboard data
   */
  static async getDashboardData(): Promise<{
    currentMetrics: {
      operationsToday: number;
      successRateToday: number;
      averageScoreToday: number;
      activeIssues: number;
    };
    recentActivity: QualityMetric[];
    alertSummary: {
      criticalAlerts: number;
      warningAlerts: number;
      infoAlerts: number;
    };
  }> {
    try {
      const metrics = await this.loadMetrics();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayMetrics = metrics.filter(m => new Date(m.timestamp) >= today);
      const recentMetrics = metrics.slice(-20); // Last 20 operations

      const operationsToday = todayMetrics.length;
      const successfulToday = todayMetrics.filter(m => m.isValid).length;
      const successRateToday = operationsToday > 0 ? (successfulToday / operationsToday) * 100 : 0;
      const averageScoreToday = operationsToday > 0
        ? todayMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / operationsToday
        : 0;
      const activeIssues = todayMetrics.reduce((sum, m) => sum + m.issueCount, 0);

      return {
        currentMetrics: {
          operationsToday,
          successRateToday,
          averageScoreToday,
          activeIssues
        },
        recentActivity: recentMetrics,
        alertSummary: {
          criticalAlerts: 0,
          warningAlerts: activeIssues,
          infoAlerts: 0
        }
      };

    } catch (error) {
      console.error('❌ [QUALITY-MONITOR] Dashboard data failed:', error);
      throw error;
    }
  }

  /**
   * Export quality metrics to CSV for external analysis
   */
  static async exportMetricsCSV(outputPath: string, timeRange?: { start: Date; end: Date }): Promise<void> {
    console.log('📤 [QUALITY-MONITOR] Exporting metrics to CSV...');

    try {
      const metrics = await this.loadMetrics();
      const filteredMetrics = timeRange
        ? metrics.filter(m =>
            new Date(m.timestamp) >= timeRange.start && new Date(m.timestamp) <= timeRange.end
          )
        : metrics;

      // CSV headers
      const headers = [
        'ID', 'Timestamp', 'Service', 'Operation', 'Input File', 'Output File',
        'Processing Time (ms)', 'Quality Score', 'Is Valid', 'Target DPI', 'Actual DPI',
        'Target Quality', 'Actual Quality', 'Issue Count', 'Issue Types', 'File Size',
        'Page Count', 'Quality Level'
      ].join(',');

      // CSV rows
      const rows = filteredMetrics.map(m => [
        m.id,
        m.timestamp,
        m.serviceName,
        m.operationType,
        m.inputFile,
        m.outputFile,
        m.processingTime,
        m.qualityScore,
        m.isValid,
        m.targetDPI,
        m.actualDPI,
        m.targetQuality,
        m.actualQuality,
        m.issueCount,
        `"${m.issueTypes.join('; ')}"`,
        m.fileSize,
        m.pageCount,
        m.qualityLevel
      ].join(','));

      const csvContent = [headers, ...rows].join('\n');
      await fs.writeFile(outputPath, csvContent);

      console.log(`✅ [QUALITY-MONITOR] Exported ${filteredMetrics.length} metrics to ${outputPath}`);

    } catch (error) {
      console.error('❌ [QUALITY-MONITOR] CSV export failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private static async loadMetrics(): Promise<QualityMetric[]> {
    try {
      const data = await fs.readFile(this.METRICS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private static calculateSummary(metrics: QualityMetric[]) {
    const total = metrics.length;
    const successful = metrics.filter(m => m.isValid).length;
    const totalIssues = metrics.reduce((sum, m) => sum + m.issueCount, 0);

    return {
      totalOperations: total,
      successfulOperations: successful,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageQualityScore: total > 0 ? metrics.reduce((sum, m) => sum + m.qualityScore, 0) / total : 0,
      averageProcessingTime: total > 0 ? metrics.reduce((sum, m) => sum + m.processingTime, 0) / total : 0,
      totalIssues
    };
  }

  private static analyzeTrends(metrics: QualityMetric[]) {
    if (metrics.length < 10) {
      return {
        qualityTrend: 'stable' as const,
        performanceTrend: 'stable' as const,
        reliabilityTrend: 'stable' as const
      };
    }

    const half = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, half);
    const secondHalf = metrics.slice(half);

    const firstHalfAvgScore = firstHalf.reduce((sum, m) => sum + m.qualityScore, 0) / firstHalf.length;
    const secondHalfAvgScore = secondHalf.reduce((sum, m) => sum + m.qualityScore, 0) / secondHalf.length;

    const firstHalfAvgTime = firstHalf.reduce((sum, m) => sum + m.processingTime, 0) / firstHalf.length;
    const secondHalfAvgTime = secondHalf.reduce((sum, m) => sum + m.processingTime, 0) / secondHalf.length;

    const firstHalfSuccessRate = firstHalf.filter(m => m.isValid).length / firstHalf.length;
    const secondHalfSuccessRate = secondHalf.filter(m => m.isValid).length / secondHalf.length;

    return {
      qualityTrend: this.determineTrend(firstHalfAvgScore, secondHalfAvgScore, 2),
      performanceTrend: this.determineTrend(firstHalfAvgTime, secondHalfAvgTime, -100), // Lower time is better
      reliabilityTrend: this.determineTrend(firstHalfSuccessRate, secondHalfSuccessRate, 0.02)
    };
  }

  private static determineTrend(oldValue: number, newValue: number, threshold: number): 'improving' | 'stable' | 'declining' {
    const diff = newValue - oldValue;
    if (Math.abs(diff) < Math.abs(threshold)) return 'stable';
    return diff > 0 ? 'improving' : 'declining';
  }

  private static analyzeTopIssues(metrics: QualityMetric[]) {
    const issueCounts: Record<string, number> = {};
    let totalIssues = 0;

    metrics.forEach(m => {
      m.issueTypes.forEach(type => {
        issueCounts[type] = (issueCounts[type] || 0) + 1;
        totalIssues++;
      });
    });

    return Object.entries(issueCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / totalIssues) * 100,
        impact: this.determineIssueImpact(type, count, totalIssues)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 issues
  }

  private static determineIssueImpact(type: string, count: number, total: number): 'low' | 'medium' | 'high' {
    const percentage = (count / total) * 100;

    // Critical issue types
    if (['dpi', 'quality', 'performance'].includes(type.toLowerCase())) {
      if (percentage > 20) return 'high';
      if (percentage > 10) return 'medium';
    }

    // General thresholds
    if (percentage > 30) return 'high';
    if (percentage > 15) return 'medium';
    return 'low';
  }

  private static analyzeServicePerformance(metrics: QualityMetric[]) {
    const serviceStats: Record<string, {
      operations: QualityMetric[];
      totalScore: number;
      totalTime: number;
      successCount: number;
    }> = {};

    metrics.forEach(m => {
      if (!serviceStats[m.serviceName]) {
        serviceStats[m.serviceName] = {
          operations: [],
          totalScore: 0,
          totalTime: 0,
          successCount: 0
        };
      }

      const stats = serviceStats[m.serviceName];
      stats.operations.push(m);
      stats.totalScore += m.qualityScore;
      stats.totalTime += m.processingTime;
      if (m.isValid) stats.successCount++;
    });

    return Object.entries(serviceStats).map(([serviceName, stats]) => ({
      serviceName,
      operationCount: stats.operations.length,
      averageScore: stats.totalScore / stats.operations.length,
      averageTime: stats.totalTime / stats.operations.length,
      successRate: (stats.successCount / stats.operations.length) * 100
    }));
  }

  private static generateRecommendations(
    metrics: QualityMetric[],
    summary: any,
    topIssues: any[]
  ): string[] {
    const recommendations: string[] = [];

    // Success rate recommendations
    if (summary.successRate < 90) {
      recommendations.push('🚨 Success rate below 90% - investigate quality validation thresholds');
    }

    // Quality score recommendations
    if (summary.averageQualityScore < 80) {
      recommendations.push('📈 Average quality score below 80 - consider adjusting conversion parameters');
    }

    // Performance recommendations
    if (summary.averageProcessingTime > 10000) { // 10 seconds
      recommendations.push('⚡ Processing time above 10s - optimize conversion pipeline');
    }

    // Issue-specific recommendations
    topIssues.forEach(issue => {
      if (issue.impact === 'high') {
        switch (issue.type.toLowerCase()) {
          case 'dpi':
            recommendations.push('🔍 High DPI issues detected - review image resolution settings');
            break;
          case 'quality':
            recommendations.push('📊 Quality issues detected - adjust compression settings');
            break;
          case 'performance':
            recommendations.push('⚡ Performance issues detected - optimize processing algorithms');
            break;
          case 'sharpness':
            recommendations.push('🎯 Sharpness issues detected - review image enhancement filters');
            break;
        }
      }
    });

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('✅ Quality metrics are performing well - continue current practices');
    }

    return recommendations;
  }

  private static async checkQualityAlerts(metric: QualityMetric, allMetrics: QualityMetric[]): Promise<void> {
    // Check for immediate quality issues
    if (!metric.isValid && metric.qualityScore < 60) {
      console.warn('🚨 [QUALITY-ALERT] Critical quality failure detected:', {
        service: metric.serviceName,
        file: metric.inputFile,
        score: metric.qualityScore,
        issues: metric.issueCount
      });
    }

    // Check for performance degradation
    if (metric.processingTime > 15000) { // 15 seconds
      console.warn('⚡ [PERFORMANCE-ALERT] Slow processing detected:', {
        service: metric.serviceName,
        file: metric.inputFile,
        time: metric.processingTime
      });
    }

    // Check for trending issues (last 10 operations)
    const recentMetrics = allMetrics.slice(-10);
    const recentFailures = recentMetrics.filter(m => !m.isValid).length;

    if (recentFailures >= 3) {
      console.warn('📉 [QUALITY-TREND-ALERT] Multiple recent failures detected:', {
        failures: recentFailures,
        total: recentMetrics.length
      });
    }
  }
}

export default QualityMonitoringService;