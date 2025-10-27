/**
 * Real-time Log Monitoring Service for E2E Testing
 * pdflab.pro - Intelligent log analysis during test execution
 */

import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import winston from 'winston';

export interface LogPattern {
  name: string;
  pattern: RegExp;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'PERFORMANCE';
  action: 'ALERT' | 'LOG' | 'METRIC' | 'INVESTIGATE';
  threshold?: number;
}

export interface LogAlert {
  timestamp: Date;
  pattern: LogPattern;
  match: string;
  context: string;
  severity: string;
  recommendation?: string;
}

export interface LogMetrics {
  totalEntries: number;
  criticalIssues: number;
  warnings: number;
  performanceEvents: number;
  avgProcessingTime?: number;
  errorRate: number;
  uniqueErrors: Set<string>;
}

/**
 * Real-time Log Monitoring Service
 * Provides intelligent log analysis during E2E test execution
 */
export class LogMonitoringService extends EventEmitter {
  private static instance: LogMonitoringService;
  private monitoringActive: boolean = false;
  private logWatchers: Map<string, fs.FSWatcher> = new Map();
  private logPositions: Map<string, number> = new Map();
  private alerts: LogAlert[] = [];
  private metrics: LogMetrics;
  private testSession: string | null = null;

  // Predefined critical patterns for pdflab.pro
  private patterns: LogPattern[] = [
    {
      name: 'PDF_CONVERSION_FAILURE',
      pattern: /LibreOffice.*failed|ImageMagick.*error|pdf2pic.*timeout|conversion.*failed/i,
      severity: 'CRITICAL',
      action: 'ALERT'
    },
    {
      name: 'MEMORY_LEAK',
      pattern: /memory.*exceeded|heap.*overflow|out.*memory|allocation.*failed/i,
      severity: 'CRITICAL',
      action: 'ALERT'
    },
    {
      name: 'AUTHENTICATION_FAILURE',
      pattern: /PayFast.*Invalid key|authentication.*failed|unauthorized|token.*invalid/i,
      severity: 'CRITICAL',
      action: 'ALERT'
    },
    {
      name: 'FILE_UPLOAD_ERROR',
      pattern: /Only PDF files are allowed|Unexpected field|Unexpected end of form/i,
      severity: 'WARNING',
      action: 'INVESTIGATE'
    },
    {
      name: 'QUEUE_PROCESSING_ISSUE',
      pattern: /queue.*failed|worker.*crashed|redis.*connection|bull.*error/i,
      severity: 'CRITICAL',
      action: 'ALERT'
    },
    {
      name: 'SLOW_PROCESSING',
      pattern: /processing time.*([5-9]\d{3,}|[1-9]\d{4,})ms/i, // >5 seconds
      severity: 'WARNING',
      action: 'METRIC'
    },
    {
      name: 'HIGH_PROCESSING_TIME',
      pattern: /processing time.*(\d+)ms/i,
      severity: 'PERFORMANCE',
      action: 'METRIC'
    },
    {
      name: 'EMAIL_SERVICE_ISSUE',
      pattern: /email.*failed|notification.*error|smtp.*error/i,
      severity: 'WARNING',
      action: 'LOG'
    }
  ];

  constructor() {
    super();
    this.initializeMetrics();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): LogMonitoringService {
    if (!LogMonitoringService.instance) {
      LogMonitoringService.instance = new LogMonitoringService();
    }
    return LogMonitoringService.instance;
  }

  /**
   * Initialize metrics tracking
   */
  private initializeMetrics(): void {
    this.metrics = {
      totalEntries: 0,
      criticalIssues: 0,
      warnings: 0,
      performanceEvents: 0,
      errorRate: 0,
      uniqueErrors: new Set()
    };
  }

  /**
   * Start monitoring logs for a test session
   */
  public async startMonitoring(testSessionId: string): Promise<void> {
    if (this.monitoringActive) {
      throw new Error('Log monitoring is already active');
    }

    this.testSession = testSessionId;
    this.monitoringActive = true;
    this.initializeMetrics();
    this.alerts = [];

    const logPaths = [
      path.join(process.cwd(), 'logs', 'combined.log'),
      path.join(process.cwd(), 'logs', 'error.log'),
      path.join(process.cwd(), 'backend.log')
    ];

    for (const logPath of logPaths) {
      if (fs.existsSync(logPath)) {
        await this.initializeLogWatcher(logPath);
      }
    }

    winston.info(`📊 Log monitoring started for session: ${testSessionId}`);
    this.emit('monitoring-started', { sessionId: testSessionId });
  }

  /**
   * Initialize file watcher for a log file
   */
  private async initializeLogWatcher(logPath: string): Promise<void> {
    try {
      // Get initial file position
      const stats = fs.statSync(logPath);
      this.logPositions.set(logPath, stats.size);

      // Create file watcher
      const watcher = fs.watch(logPath, (eventType) => {
        if (eventType === 'change') {
          this.processLogChanges(logPath);
        }
      });

      this.logWatchers.set(logPath, watcher);
      winston.info(`👁️  Watching log file: ${logPath}`);
    } catch (error) {
      winston.error(`Failed to initialize log watcher for ${logPath}:`, error);
    }
  }

  /**
   * Process changes in a log file
   */
  private async processLogChanges(logPath: string): Promise<void> {
    try {
      const currentStats = fs.statSync(logPath);
      const lastPosition = this.logPositions.get(logPath) || 0;

      if (currentStats.size > lastPosition) {
        // Read new content
        const newContent = await this.readLogRange(logPath, lastPosition, currentStats.size);

        // Update position
        this.logPositions.set(logPath, currentStats.size);

        // Analyze new content
        await this.analyzeLogContent(newContent, logPath);
      }
    } catch (error) {
      winston.error(`Error processing log changes for ${logPath}:`, error);
    }
  }

  /**
   * Read specific range from log file
   */
  private async readLogRange(filePath: string, start: number, end: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath, { start, end: end - 1 });
      let content = '';

      stream.on('data', (chunk) => {
        content += chunk.toString();
      });

      stream.on('end', () => {
        resolve(content);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Analyze log content for patterns
   */
  private async analyzeLogContent(content: string, logPath: string): Promise<void> {
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      this.metrics.totalEntries++;

      // Check each pattern
      for (const pattern of this.patterns) {
        const match = line.match(pattern.pattern);
        if (match) {
          await this.handlePatternMatch(pattern, match[0], line, logPath);
        }
      }

      // Track performance metrics
      this.extractPerformanceMetrics(line);
    }

    // Update error rate
    this.updateErrorRate();
  }

  /**
   * Handle when a pattern is matched
   */
  private async handlePatternMatch(
    pattern: LogPattern,
    match: string,
    context: string,
    logPath: string
  ): Promise<void> {
    const alert: LogAlert = {
      timestamp: new Date(),
      pattern,
      match,
      context: context.substring(0, 200), // Limit context length
      severity: pattern.severity,
      recommendation: this.generateRecommendation(pattern)
    };

    this.alerts.push(alert);

    // Update metrics
    if (pattern.severity === 'CRITICAL') {
      this.metrics.criticalIssues++;
    } else if (pattern.severity === 'WARNING') {
      this.metrics.warnings++;
    } else if (pattern.severity === 'PERFORMANCE') {
      this.metrics.performanceEvents++;
    }

    // Track unique errors
    if (pattern.severity === 'CRITICAL' || pattern.severity === 'WARNING') {
      this.metrics.uniqueErrors.add(pattern.name);
    }

    // Emit alert
    this.emit('pattern-detected', alert);

    // Take action based on pattern
    await this.executePatternAction(pattern, alert);

    winston.warn(`🔍 Pattern detected: ${pattern.name} - ${match}`);
  }

  /**
   * Extract performance metrics from log lines
   */
  private extractPerformanceMetrics(line: string): void {
    // Extract processing times
    const processingTimeMatch = line.match(/processing time.*?(\d+)ms/i);
    if (processingTimeMatch) {
      const time = parseInt(processingTimeMatch[1]);

      if (!this.metrics.avgProcessingTime) {
        this.metrics.avgProcessingTime = time;
      } else {
        // Running average
        this.metrics.avgProcessingTime =
          (this.metrics.avgProcessingTime + time) / 2;
      }
    }
  }

  /**
   * Update error rate calculation
   */
  private updateErrorRate(): void {
    const totalErrors = this.metrics.criticalIssues + this.metrics.warnings;
    this.metrics.errorRate = this.metrics.totalEntries > 0
      ? (totalErrors / this.metrics.totalEntries) * 100
      : 0;
  }

  /**
   * Generate recommendation for a pattern
   */
  private generateRecommendation(pattern: LogPattern): string {
    const recommendations: Record<string, string> = {
      'PDF_CONVERSION_FAILURE': 'Check LibreOffice installation and ImageMagick configuration. Verify PDF file integrity.',
      'MEMORY_LEAK': 'Monitor system resources. Consider implementing memory cleanup routines.',
      'AUTHENTICATION_FAILURE': 'Verify PayFast API keys and authentication configuration.',
      'FILE_UPLOAD_ERROR': 'Check file upload validation and multipart form handling.',
      'QUEUE_PROCESSING_ISSUE': 'Verify Redis connection and Bull queue configuration.',
      'SLOW_PROCESSING': 'Investigate processing bottlenecks. Consider performance optimization.',
      'EMAIL_SERVICE_ISSUE': 'Check email service configuration and SMTP settings.'
    };

    return recommendations[pattern.name] || 'Investigate the issue and check related system components.';
  }

  /**
   * Execute action based on pattern detection
   */
  private async executePatternAction(pattern: LogPattern, alert: LogAlert): Promise<void> {
    switch (pattern.action) {
      case 'ALERT':
        // Emit critical alert
        this.emit('critical-alert', alert);
        winston.error(`🚨 CRITICAL ALERT: ${alert.pattern.name} - ${alert.match}`);
        break;

      case 'INVESTIGATE':
        // Log for investigation
        winston.warn(`🔍 INVESTIGATION REQUIRED: ${alert.pattern.name} - ${alert.match}`);
        break;

      case 'METRIC':
        // Track as metric
        this.emit('metric-collected', {
          name: alert.pattern.name,
          value: alert.match,
          timestamp: alert.timestamp
        });
        break;

      case 'LOG':
        // Simple logging
        winston.info(`📝 LOG EVENT: ${alert.pattern.name} - ${alert.match}`);
        break;
    }
  }

  /**
   * Stop monitoring and generate report
   */
  public async stopMonitoring(): Promise<LogMonitoringReport> {
    if (!this.monitoringActive) {
      throw new Error('Log monitoring is not active');
    }

    // Stop all watchers
    for (const [logPath, watcher] of this.logWatchers.entries()) {
      watcher.close();
    }

    this.logWatchers.clear();
    this.logPositions.clear();
    this.monitoringActive = false;

    const report = this.generateMonitoringReport();

    winston.info(`📊 Log monitoring stopped for session: ${this.testSession}`);
    this.emit('monitoring-stopped', { report });

    return report;
  }

  /**
   * Generate comprehensive monitoring report
   */
  private generateMonitoringReport(): LogMonitoringReport {
    const criticalAlerts = this.alerts.filter(a => a.severity === 'CRITICAL');
    const warningAlerts = this.alerts.filter(a => a.severity === 'WARNING');

    return {
      sessionId: this.testSession!,
      duration: Date.now(),
      metrics: { ...this.metrics },
      alerts: this.alerts,
      summary: {
        totalAlerts: this.alerts.length,
        criticalAlerts: criticalAlerts.length,
        warningAlerts: warningAlerts.length,
        performanceEvents: this.metrics.performanceEvents,
        riskLevel: this.calculateRiskLevel(),
        recommendations: this.generateSessionRecommendations()
      }
    };
  }

  /**
   * Calculate overall risk level
   */
  private calculateRiskLevel(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalCount = this.metrics.criticalIssues;
    const warningCount = this.metrics.warnings;
    const errorRate = this.metrics.errorRate;

    if (criticalCount > 0 || errorRate > 10) {
      return 'CRITICAL';
    } else if (warningCount > 5 || errorRate > 5) {
      return 'HIGH';
    } else if (warningCount > 2 || errorRate > 2) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Generate session-specific recommendations
   */
  private generateSessionRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.criticalIssues > 0) {
      recommendations.push('Address critical issues immediately before production deployment');
    }

    if (this.metrics.avgProcessingTime && this.metrics.avgProcessingTime > 10000) {
      recommendations.push('Optimize processing performance - current average exceeds 10 seconds');
    }

    if (this.metrics.errorRate > 5) {
      recommendations.push('High error rate detected - investigate error patterns and implement fixes');
    }

    if (this.metrics.uniqueErrors.size > 3) {
      recommendations.push('Multiple unique error types detected - perform comprehensive system review');
    }

    if (recommendations.length === 0) {
      recommendations.push('System appears stable - continue monitoring in production');
    }

    return recommendations;
  }

  /**
   * Get current metrics
   */
  public getCurrentMetrics(): LogMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent alerts
   */
  public getRecentAlerts(limit: number = 10): LogAlert[] {
    return this.alerts.slice(-limit);
  }
}

export interface LogMonitoringReport {
  sessionId: string;
  duration: number;
  metrics: LogMetrics;
  alerts: LogAlert[];
  summary: {
    totalAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    performanceEvents: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendations: string[];
  };
}

// Export singleton instance
export const logMonitoring = LogMonitoringService.getInstance();