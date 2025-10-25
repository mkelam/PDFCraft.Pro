/**
 * 🔍 STABILITY MONITORING SERVICE
 * Real-time monitoring for multi-page conversion stability issues
 *
 * Features:
 * - Real-time failure tracking
 * - Memory usage monitoring
 * - Performance bottleneck detection
 * - Automatic alerting for stability issues
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

interface ConversionMetrics {
  jobId: string;
  filename: string;
  pageCount: number;
  fileSize: number;
  startTime: number;
  endTime?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';
  error?: string;
  memoryUsageMB: number;
  processingTimeMs?: number;
  qualityScore?: number;
  engineUsed?: string;
}

interface StabilityMetrics {
  totalConversions: number;
  successfulConversions: number;
  failedConversions: number;
  timeoutConversions: number;
  averageProcessingTime: number;
  averageMemoryUsage: number;
  successRate: number;
  failuresByPageCount: Map<number, number>;
  memoryLeaks: number;
  stabilityScore: number;
}

interface AlertCondition {
  type: 'failure_rate' | 'memory_leak' | 'timeout' | 'performance';
  threshold: number;
  timeWindowMs: number;
  description: string;
}

export class StabilityMonitorService {
  private conversionMetrics: Map<string, ConversionMetrics> = new Map();
  private historicalMetrics: ConversionMetrics[] = [];
  private alerts: AlertCondition[] = [];
  private monitoringActive = false;
  private logFile: string;
  private baselineMemory: number;

  constructor() {
    this.logFile = path.join(__dirname, '../../monitoring', 'stability-log.jsonl');
    this.baselineMemory = this.getMemoryUsageMB();
    this.setupDefaultAlerts();
    this.ensureMonitoringDirectory();
  }

  private setupDefaultAlerts(): void {
    this.alerts = [
      {
        type: 'failure_rate',
        threshold: 0.2, // 20% failure rate
        timeWindowMs: 30 * 60 * 1000, // 30 minutes
        description: 'High failure rate detected'
      },
      {
        type: 'memory_leak',
        threshold: 100, // 100MB increase
        timeWindowMs: 10 * 60 * 1000, // 10 minutes
        description: 'Memory leak detected'
      },
      {
        type: 'timeout',
        threshold: 3, // 3 timeouts
        timeWindowMs: 15 * 60 * 1000, // 15 minutes
        description: 'Multiple conversion timeouts'
      },
      {
        type: 'performance',
        threshold: 10000, // 10 seconds average
        timeWindowMs: 20 * 60 * 1000, // 20 minutes
        description: 'Performance degradation detected'
      }
    ];
  }

  private ensureMonitoringDirectory(): void {
    const monitoringDir = path.dirname(this.logFile);
    if (!fs.existsSync(monitoringDir)) {
      fs.mkdirSync(monitoringDir, { recursive: true });
    }
  }

  public startMonitoring(): void {
    if (this.monitoringActive) {
      return;
    }

    this.monitoringActive = true;
    console.log('🔍 [STABILITY-MONITOR] Starting stability monitoring...');

    // Start periodic health checks
    setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every minute

    // Start memory monitoring
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Every 30 seconds

    // Start alert checking
    setInterval(() => {
      this.checkAlertConditions();
    }, 120000); // Every 2 minutes
  }

  public stopMonitoring(): void {
    this.monitoringActive = false;
    console.log('🔍 [STABILITY-MONITOR] Stopping stability monitoring...');
  }

  public trackConversionStart(
    jobId: string,
    filename: string,
    pageCount: number,
    fileSize: number
  ): void {
    const metrics: ConversionMetrics = {
      jobId,
      filename,
      pageCount,
      fileSize,
      startTime: Date.now(),
      status: 'pending',
      memoryUsageMB: this.getMemoryUsageMB()
    };

    this.conversionMetrics.set(jobId, metrics);
    this.logMetrics('conversion_start', metrics);

    console.log(`🔍 [STABILITY-MONITOR] Tracking conversion: ${jobId} (${pageCount} pages, ${(fileSize/1024).toFixed(1)}KB)`);
  }

  public trackConversionProgress(jobId: string, status: 'processing'): void {
    const metrics = this.conversionMetrics.get(jobId);
    if (metrics) {
      metrics.status = status;
      metrics.memoryUsageMB = this.getMemoryUsageMB();
      this.logMetrics('conversion_progress', metrics);
    }
  }

  public trackConversionComplete(
    jobId: string,
    qualityScore?: number,
    engineUsed?: string
  ): void {
    const metrics = this.conversionMetrics.get(jobId);
    if (metrics) {
      metrics.endTime = Date.now();
      metrics.status = 'completed';
      metrics.processingTimeMs = metrics.endTime - metrics.startTime;
      metrics.qualityScore = qualityScore;
      metrics.engineUsed = engineUsed;
      metrics.memoryUsageMB = this.getMemoryUsageMB();

      this.historicalMetrics.push(metrics);
      this.conversionMetrics.delete(jobId);
      this.logMetrics('conversion_complete', metrics);

      console.log(`✅ [STABILITY-MONITOR] Conversion completed: ${jobId} (${(metrics.processingTimeMs/1000).toFixed(2)}s)`);

      // Check for performance issues
      if (metrics.processingTimeMs > 15000 && metrics.pageCount >= 3) {
        this.logAlert('performance', `Slow conversion detected: ${jobId} took ${(metrics.processingTimeMs/1000).toFixed(2)}s for ${metrics.pageCount} pages`);
      }
    }
  }

  public trackConversionFailure(jobId: string, error: string): void {
    const metrics = this.conversionMetrics.get(jobId);
    if (metrics) {
      metrics.endTime = Date.now();
      metrics.status = 'failed';
      metrics.error = error;
      metrics.processingTimeMs = metrics.endTime - metrics.startTime;
      metrics.memoryUsageMB = this.getMemoryUsageMB();

      this.historicalMetrics.push(metrics);
      this.conversionMetrics.delete(jobId);
      this.logMetrics('conversion_failed', metrics);

      console.log(`❌ [STABILITY-MONITOR] Conversion failed: ${jobId} - ${error}`);

      // Check for pattern of multi-page failures
      if (metrics.pageCount >= 3) {
        this.logAlert('failure_rate', `Multi-page conversion failure: ${jobId} (${metrics.pageCount} pages) - ${error}`);
      }
    }
  }

  public trackConversionTimeout(jobId: string): void {
    const metrics = this.conversionMetrics.get(jobId);
    if (metrics) {
      metrics.endTime = Date.now();
      metrics.status = 'timeout';
      metrics.processingTimeMs = metrics.endTime - metrics.startTime;
      metrics.memoryUsageMB = this.getMemoryUsageMB();

      this.historicalMetrics.push(metrics);
      this.conversionMetrics.delete(jobId);
      this.logMetrics('conversion_timeout', metrics);

      console.log(`⏰ [STABILITY-MONITOR] Conversion timeout: ${jobId} after ${(metrics.processingTimeMs/1000).toFixed(2)}s`);

      this.logAlert('timeout', `Conversion timeout: ${jobId} (${metrics.pageCount} pages)`);
    }
  }

  public getStabilityMetrics(): StabilityMetrics {
    const recentMetrics = this.getRecentMetrics(60 * 60 * 1000); // Last hour

    const totalConversions = recentMetrics.length;
    const successfulConversions = recentMetrics.filter(m => m.status === 'completed').length;
    const failedConversions = recentMetrics.filter(m => m.status === 'failed').length;
    const timeoutConversions = recentMetrics.filter(m => m.status === 'timeout').length;

    const completedMetrics = recentMetrics.filter(m => m.processingTimeMs);
    const averageProcessingTime = completedMetrics.length > 0 ?
      completedMetrics.reduce((sum, m) => sum + (m.processingTimeMs || 0), 0) / completedMetrics.length : 0;

    const averageMemoryUsage = recentMetrics.length > 0 ?
      recentMetrics.reduce((sum, m) => sum + m.memoryUsageMB, 0) / recentMetrics.length : 0;

    const successRate = totalConversions > 0 ? successfulConversions / totalConversions : 1;

    // Failure by page count analysis
    const failuresByPageCount = new Map<number, number>();
    recentMetrics.filter(m => m.status === 'failed').forEach(m => {
      const pageCount = m.pageCount;
      failuresByPageCount.set(pageCount, (failuresByPageCount.get(pageCount) || 0) + 1);
    });

    // Memory leak detection
    const memoryIncrease = this.getMemoryUsageMB() - this.baselineMemory;
    const memoryLeaks = memoryIncrease > 100 ? 1 : 0;

    // Calculate stability score
    const stabilityScore = this.calculateStabilityScore(successRate, averageProcessingTime, memoryLeaks);

    return {
      totalConversions,
      successfulConversions,
      failedConversions,
      timeoutConversions,
      averageProcessingTime,
      averageMemoryUsage,
      successRate,
      failuresByPageCount,
      memoryLeaks,
      stabilityScore
    };
  }

  private calculateStabilityScore(successRate: number, avgTime: number, memoryLeaks: number): number {
    let score = 100;

    // Success rate impact (0-40 points)
    score *= successRate;

    // Performance impact (deduct up to 20 points)
    if (avgTime > 5000) {
      const performancePenalty = Math.min(20, (avgTime - 5000) / 1000 * 2);
      score -= performancePenalty;
    }

    // Memory leak impact (deduct 30 points per leak)
    score -= memoryLeaks * 30;

    return Math.max(0, Math.round(score));
  }

  private getRecentMetrics(timeWindowMs: number): ConversionMetrics[] {
    const cutoffTime = Date.now() - timeWindowMs;
    return this.historicalMetrics.filter(m => m.startTime >= cutoffTime);
  }

  private performHealthCheck(): void {
    const metrics = this.getStabilityMetrics();

    console.log(`🏥 [STABILITY-MONITOR] Health Check:`);
    console.log(`   Total conversions (1h): ${metrics.totalConversions}`);
    console.log(`   Success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    console.log(`   Avg processing time: ${(metrics.averageProcessingTime / 1000).toFixed(2)}s`);
    console.log(`   Memory usage: ${metrics.averageMemoryUsage.toFixed(1)} MB`);
    console.log(`   Stability score: ${metrics.stabilityScore}/100`);

    // Log health metrics
    this.logMetrics('health_check', {
      stabilityScore: metrics.stabilityScore,
      successRate: metrics.successRate,
      averageProcessingTime: metrics.averageProcessingTime,
      memoryUsage: metrics.averageMemoryUsage,
      timestamp: Date.now()
    });

    // Check for multi-page specific issues
    const multiPageFailures = Array.from(metrics.failuresByPageCount.entries())
      .filter(([pageCount]) => pageCount >= 3);

    if (multiPageFailures.length > 0) {
      console.log(`   ⚠️  Multi-page failures detected:`);
      multiPageFailures.forEach(([pageCount, failures]) => {
        console.log(`      ${pageCount} pages: ${failures} failures`);
      });
    }
  }

  private checkMemoryUsage(): void {
    const currentMemory = this.getMemoryUsageMB();
    const memoryIncrease = currentMemory - this.baselineMemory;

    if (memoryIncrease > 150) { // Over 150MB increase
      this.logAlert('memory_leak', `High memory usage detected: ${currentMemory.toFixed(1)}MB (baseline: ${this.baselineMemory.toFixed(1)}MB)`);
    }
  }

  private checkAlertConditions(): void {
    const now = Date.now();

    for (const alert of this.alerts) {
      const recentMetrics = this.getRecentMetrics(alert.timeWindowMs);

      switch (alert.type) {
        case 'failure_rate':
          const failureRate = recentMetrics.length > 0 ?
            recentMetrics.filter(m => m.status === 'failed').length / recentMetrics.length : 0;
          if (failureRate > alert.threshold) {
            this.logAlert(alert.type, `${alert.description}: ${(failureRate * 100).toFixed(1)}% (threshold: ${(alert.threshold * 100).toFixed(1)}%)`);
          }
          break;

        case 'timeout':
          const timeouts = recentMetrics.filter(m => m.status === 'timeout').length;
          if (timeouts >= alert.threshold) {
            this.logAlert(alert.type, `${alert.description}: ${timeouts} timeouts in ${alert.timeWindowMs / 60000} minutes`);
          }
          break;

        case 'performance':
          const completedMetrics = recentMetrics.filter(m => m.processingTimeMs);
          if (completedMetrics.length > 0) {
            const avgTime = completedMetrics.reduce((sum, m) => sum + (m.processingTimeMs || 0), 0) / completedMetrics.length;
            if (avgTime > alert.threshold) {
              this.logAlert(alert.type, `${alert.description}: ${(avgTime / 1000).toFixed(2)}s average (threshold: ${(alert.threshold / 1000).toFixed(2)}s)`);
            }
          }
          break;
      }
    }
  }

  private getMemoryUsageMB(): number {
    const usage = process.memoryUsage();
    return usage.heapUsed / 1024 / 1024;
  }

  private logMetrics(eventType: string, data: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      data,
      systemInfo: {
        memory: this.getMemoryUsageMB(),
        cpuLoad: os.loadavg()[0],
        uptime: process.uptime()
      }
    };

    try {
      fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write monitoring log:', error);
    }
  }

  private logAlert(alertType: string, message: string): void {
    const alertData = {
      type: alertType,
      message,
      timestamp: Date.now(),
      severity: this.getAlertSeverity(alertType)
    };

    console.log(`🚨 [STABILITY-ALERT] ${alertType.toUpperCase()}: ${message}`);
    this.logMetrics('alert', alertData);
  }

  private getAlertSeverity(alertType: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (alertType) {
      case 'memory_leak': return 'high';
      case 'failure_rate': return 'high';
      case 'timeout': return 'medium';
      case 'performance': return 'medium';
      default: return 'low';
    }
  }

  public generateStabilityReport(): any {
    const metrics = this.getStabilityMetrics();
    const recentAlerts = this.getRecentAlerts(24 * 60 * 60 * 1000); // Last 24 hours

    return {
      timestamp: new Date().toISOString(),
      stabilityScore: metrics.stabilityScore,
      metrics,
      recentAlerts,
      recommendations: this.generateRecommendations(metrics),
      multiPageAnalysis: this.analyzeMultiPagePerformance()
    };
  }

  private getRecentAlerts(timeWindowMs: number): any[] {
    // This would read from the log file in a real implementation
    // For now, return empty array
    return [];
  }

  private generateRecommendations(metrics: StabilityMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.successRate < 0.9) {
      recommendations.push('Investigate high failure rate, especially for multi-page documents');
    }

    if (metrics.averageProcessingTime > 10000) {
      recommendations.push('Optimize processing pipeline for better performance');
    }

    if (metrics.memoryLeaks > 0) {
      recommendations.push('Address memory leaks in conversion pipeline');
    }

    if (metrics.timeoutConversions > 0) {
      recommendations.push('Increase timeout limits for complex documents');
    }

    // Multi-page specific recommendations
    const multiPageFailures = Array.from(metrics.failuresByPageCount.entries())
      .filter(([pageCount]) => pageCount >= 3);

    if (multiPageFailures.length > 0) {
      recommendations.push('Implement specialized handling for multi-page documents');
      recommendations.push('Consider page-based chunking for large documents');
    }

    return recommendations;
  }

  private analyzeMultiPagePerformance(): any {
    const multiPageMetrics = this.historicalMetrics.filter(m => m.pageCount >= 3);

    if (multiPageMetrics.length === 0) {
      return { message: 'No multi-page conversions found for analysis' };
    }

    const pageCountGroups = new Map<number, ConversionMetrics[]>();
    multiPageMetrics.forEach(m => {
      const pageCount = m.pageCount;
      if (!pageCountGroups.has(pageCount)) {
        pageCountGroups.set(pageCount, []);
      }
      pageCountGroups.get(pageCount)!.push(m);
    });

    const analysis: any = {};

    for (const [pageCount, metrics] of pageCountGroups) {
      const successful = metrics.filter(m => m.status === 'completed');
      const failed = metrics.filter(m => m.status === 'failed');
      const timeouts = metrics.filter(m => m.status === 'timeout');

      const avgTime = successful.length > 0 ?
        successful.reduce((sum, m) => sum + (m.processingTimeMs || 0), 0) / successful.length : 0;

      analysis[`${pageCount}_pages`] = {
        totalAttempts: metrics.length,
        successful: successful.length,
        failed: failed.length,
        timeouts: timeouts.length,
        successRate: metrics.length > 0 ? successful.length / metrics.length : 0,
        averageProcessingTime: avgTime,
        failureReasons: failed.map(m => m.error).filter(Boolean)
      };
    }

    return analysis;
  }
}

// Export singleton instance
export const stabilityMonitor = new StabilityMonitorService();