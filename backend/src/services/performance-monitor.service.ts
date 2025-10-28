import { promises as fs } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

/**
 * Performance Monitoring Service
 * Real-time tracking and analysis of OCR processing performance
 * Phase 2 OCR Optimization - Week 2 Tuesday-Wednesday
 */
export class PerformanceMonitor extends EventEmitter {

  private static instance: PerformanceMonitor;
  private readonly metrics: Map<string, ProcessingMetrics> = new Map();
  private readonly sessionMetrics: SessionMetrics = {
    totalProcessed: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
    successRate: 0,
    engineUsage: new Map(),
    qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
    startTime: Date.now()
  };

  private readonly performanceThresholds = {
    FAST_PROCESSING: 3000,      // < 3 seconds is considered fast
    SLOW_PROCESSING: 10000,     // > 10 seconds is considered slow
    MIN_SUCCESS_RATE: 0.90,     // 90% minimum success rate
    MAX_MEMORY_USAGE: 512 * 1024 * 1024, // 512MB memory limit
    WARNING_QUEUE_SIZE: 10      // Warn if queue exceeds 10 items
  };

  private constructor() {
    super();
    this.startPerformanceTracking();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Record the start of an OCR operation
   */
  startOperation(operationId: string, metadata: {
    fileName: string;
    fileSize: number;
    documentType: 'text' | 'mixed' | 'handwritten' | 'form' | 'table';
    imageCount?: number;
    estimatedPages?: number;
  }): ProcessingMetrics {
    const metrics: ProcessingMetrics = {
      operationId,
      fileName: metadata.fileName,
      fileSize: metadata.fileSize,
      documentType: metadata.documentType,
      imageCount: metadata.imageCount || 1,
      estimatedPages: metadata.estimatedPages || 1,
      startTime: Date.now(),
      endTime: null,
      processingTime: 0,
      status: 'processing',
      stages: {
        preprocessing: { startTime: 0, endTime: 0, duration: 0 },
        qualityAnalysis: { startTime: 0, endTime: 0, duration: 0 },
        dpiSelection: { startTime: 0, endTime: 0, duration: 0 },
        engineSelection: { startTime: 0, endTime: 0, duration: 0 },
        ocrProcessing: { startTime: 0, endTime: 0, duration: 0 },
        postprocessing: { startTime: 0, endTime: 0, duration: 0 }
      },
      qualityMetrics: {
        inputQuality: 0,
        outputQuality: 0,
        confidenceScore: 0,
        accuracyScore: 0
      },
      resourceUsage: {
        memoryPeak: 0,
        cpuTime: 0,
        diskIO: { read: 0, write: 0 }
      },
      engineUsed: '',
      fallbackCount: 0,
      errorCount: 0,
      warnings: []
    };

    this.metrics.set(operationId, metrics);
    console.log(`📊 [PERF-MONITOR] Started tracking operation: ${operationId}`);

    return metrics;
  }

  /**
   * Record the completion of a processing stage
   */
  recordStage(
    operationId: string,
    stage: keyof ProcessingStages,
    success: boolean = true,
    additionalData?: any
  ): void {
    const metrics = this.metrics.get(operationId);
    if (!metrics) {
      console.warn(`⚠️  [PERF-MONITOR] No metrics found for operation: ${operationId}`);
      return;
    }

    const now = Date.now();
    const stageMetrics = metrics.stages[stage];

    if (stageMetrics.startTime === 0) {
      stageMetrics.startTime = now;
    } else {
      stageMetrics.endTime = now;
      stageMetrics.duration = now - stageMetrics.startTime;

      console.log(`⏱️  [PERF-MONITOR] ${stage} completed in ${stageMetrics.duration}ms (${operationId})`);

      // Record additional stage-specific data
      if (additionalData) {
        this.recordStageSpecificData(operationId, stage, additionalData);
      }

      // Emit stage completion event
      this.emit('stage-complete', { operationId, stage, duration: stageMetrics.duration, success });
    }
  }

  /**
   * Complete an OCR operation
   */
  completeOperation(
    operationId: string,
    result: {
      success: boolean;
      extractedText?: string;
      engineUsed: string;
      qualityScore?: number;
      confidenceScore?: number;
      errorMessage?: string;
    }
  ): ProcessingMetrics | null {
    const metrics = this.metrics.get(operationId);
    if (!metrics) {
      console.warn(`⚠️  [PERF-MONITOR] No metrics found for operation: ${operationId}`);
      return null;
    }

    const now = Date.now();
    metrics.endTime = now;
    metrics.processingTime = now - metrics.startTime;
    metrics.status = result.success ? 'completed' : 'failed';
    metrics.engineUsed = result.engineUsed;

    if (result.qualityScore) {
      metrics.qualityMetrics.outputQuality = result.qualityScore;
    }
    if (result.confidenceScore) {
      metrics.qualityMetrics.confidenceScore = result.confidenceScore;
    }

    // Update session metrics
    this.updateSessionMetrics(metrics, result);

    // Check for performance alerts
    this.checkPerformanceAlerts(metrics);

    console.log(`✅ [PERF-MONITOR] Operation completed: ${operationId} (${metrics.processingTime}ms)`);

    // Emit completion event
    this.emit('operation-complete', metrics);

    return metrics;
  }

  /**
   * Get real-time performance statistics
   */
  getPerformanceStats(): {
    session: SessionMetrics;
    recent: ProcessingMetrics[];
    alerts: PerformanceAlert[];
    recommendations: string[];
  } {
    const recentOperations = Array.from(this.metrics.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, 10);

    const alerts = this.generatePerformanceAlerts();
    const recommendations = this.generateRecommendations();

    return {
      session: { ...this.sessionMetrics },
      recent: recentOperations,
      alerts,
      recommendations
    };
  }

  /**
   * Get detailed metrics for a specific operation
   */
  getOperationMetrics(operationId: string): ProcessingMetrics | null {
    return this.metrics.get(operationId) || null;
  }

  /**
   * Export performance data for analysis
   */
  async exportMetrics(outputPath?: string): Promise<string> {
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      sessionMetrics: this.sessionMetrics,
      operations: Array.from(this.metrics.values()),
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    const filename = outputPath || path.join(
      process.cwd(),
      'performance-data',
      `performance-export-${Date.now()}.json`
    );

    try {
      await fs.mkdir(path.dirname(filename), { recursive: true });
      await fs.writeFile(filename, JSON.stringify(exportData, null, 2));

      console.log(`📤 [PERF-MONITOR] Metrics exported: ${filename}`);
      return filename;
    } catch (error) {
      console.error(`❌ [PERF-MONITOR] Export failed:`, error);
      throw new Error(`Failed to export metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Record resource usage during operation
   */
  recordResourceUsage(operationId: string, usage: {
    memoryUsage?: number;
    cpuTime?: number;
    diskRead?: number;
    diskWrite?: number;
  }): void {
    const metrics = this.metrics.get(operationId);
    if (!metrics) return;

    if (usage.memoryUsage && usage.memoryUsage > metrics.resourceUsage.memoryPeak) {
      metrics.resourceUsage.memoryPeak = usage.memoryUsage;
    }
    if (usage.cpuTime) {
      metrics.resourceUsage.cpuTime += usage.cpuTime;
    }
    if (usage.diskRead) {
      metrics.resourceUsage.diskIO.read += usage.diskRead;
    }
    if (usage.diskWrite) {
      metrics.resourceUsage.diskIO.write += usage.diskWrite;
    }

    // Check memory threshold
    if (usage.memoryUsage && usage.memoryUsage > this.performanceThresholds.MAX_MEMORY_USAGE) {
      this.emit('performance-alert', {
        type: 'HIGH_MEMORY_USAGE',
        operationId,
        value: usage.memoryUsage,
        threshold: this.performanceThresholds.MAX_MEMORY_USAGE,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Start system-level performance tracking
   */
  private startPerformanceTracking(): void {
    // Track memory usage every 30 seconds
    const memoryInterval = setInterval(() => {
      const usage = process.memoryUsage();
      this.emit('system-metrics', {
        timestamp: Date.now(),
        memory: usage,
        uptime: process.uptime()
      });
    }, 30000);

    // Clean up old metrics (keep last 1000 operations)
    const cleanupInterval = setInterval(() => {
      const operations = Array.from(this.metrics.entries())
        .sort(([, a], [, b]) => b.startTime - a.startTime);

      if (operations.length > 1000) {
        const toRemove = operations.slice(1000);
        toRemove.forEach(([id]) => this.metrics.delete(id));
        console.log(`🧹 [PERF-MONITOR] Cleaned up ${toRemove.length} old metrics`);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    // Handle process exit
    process.on('SIGINT', () => {
      clearInterval(memoryInterval);
      clearInterval(cleanupInterval);
    });
  }

  /**
   * Record stage-specific data
   */
  private recordStageSpecificData(
    operationId: string,
    stage: keyof ProcessingStages,
    data: any
  ): void {
    const metrics = this.metrics.get(operationId);
    if (!metrics) return;

    switch (stage) {
      case 'qualityAnalysis':
        if (data.qualityScore) {
          metrics.qualityMetrics.inputQuality = data.qualityScore;
        }
        break;
      case 'engineSelection':
        if (data.selectedEngine) {
          metrics.engineUsed = data.selectedEngine;
        }
        if (data.fallbackUsed) {
          metrics.fallbackCount++;
        }
        break;
      case 'ocrProcessing':
        if (data.confidence) {
          metrics.qualityMetrics.confidenceScore = data.confidence;
        }
        break;
    }
  }

  /**
   * Update session-level metrics
   */
  private updateSessionMetrics(metrics: ProcessingMetrics, result: any): void {
    this.sessionMetrics.totalProcessed++;
    this.sessionMetrics.totalProcessingTime += metrics.processingTime;
    this.sessionMetrics.averageProcessingTime =
      this.sessionMetrics.totalProcessingTime / this.sessionMetrics.totalProcessed;

    // Update success rate
    const successfulOps = Array.from(this.metrics.values())
      .filter(m => m.status === 'completed').length;
    this.sessionMetrics.successRate = successfulOps / this.sessionMetrics.totalProcessed;

    // Update engine usage
    const engineCount = this.sessionMetrics.engineUsage.get(metrics.engineUsed) || 0;
    this.sessionMetrics.engineUsage.set(metrics.engineUsed, engineCount + 1);

    // Update quality distribution
    const qualityLevel = this.getQualityLevel(metrics.qualityMetrics.outputQuality);
    this.sessionMetrics.qualityDistribution[qualityLevel]++;
  }

  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts(metrics: ProcessingMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Slow processing alert
    if (metrics.processingTime > this.performanceThresholds.SLOW_PROCESSING) {
      alerts.push({
        type: 'SLOW_PROCESSING',
        operationId: metrics.operationId,
        value: metrics.processingTime,
        threshold: this.performanceThresholds.SLOW_PROCESSING,
        timestamp: Date.now(),
        message: `Processing took ${(metrics.processingTime / 1000).toFixed(1)}s (threshold: ${this.performanceThresholds.SLOW_PROCESSING / 1000}s)`
      });
    }

    // Low success rate alert
    if (this.sessionMetrics.successRate < this.performanceThresholds.MIN_SUCCESS_RATE) {
      alerts.push({
        type: 'LOW_SUCCESS_RATE',
        operationId: metrics.operationId,
        value: this.sessionMetrics.successRate,
        threshold: this.performanceThresholds.MIN_SUCCESS_RATE,
        timestamp: Date.now(),
        message: `Success rate dropped to ${(this.sessionMetrics.successRate * 100).toFixed(1)}%`
      });
    }

    alerts.forEach(alert => this.emit('performance-alert', alert));
  }

  /**
   * Generate performance alerts
   */
  private generatePerformanceAlerts(): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    // Check for recent slow operations
    const recentOps = Array.from(this.metrics.values())
      .filter(m => m.endTime && (Date.now() - m.endTime) < 5 * 60 * 1000); // Last 5 minutes

    const slowOps = recentOps.filter(m =>
      m.processingTime > this.performanceThresholds.SLOW_PROCESSING
    );

    if (slowOps.length > 0) {
      alerts.push({
        type: 'SLOW_PROCESSING',
        operationId: 'multiple',
        value: slowOps.length,
        threshold: 0,
        timestamp: Date.now(),
        message: `${slowOps.length} slow operations detected in last 5 minutes`
      });
    }

    return alerts;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Analyze average processing time
    if (this.sessionMetrics.averageProcessingTime > this.performanceThresholds.FAST_PROCESSING) {
      recommendations.push('Consider optimizing preprocessing pipeline to reduce average processing time');
    }

    // Analyze success rate
    if (this.sessionMetrics.successRate < this.performanceThresholds.MIN_SUCCESS_RATE) {
      recommendations.push('Low success rate detected - review image quality thresholds and fallback mechanisms');
    }

    // Analyze engine distribution
    const totalEngineUsage = Array.from(this.sessionMetrics.engineUsage.values())
      .reduce((sum, count) => sum + count, 0);

    if (totalEngineUsage > 0) {
      const tesseractUsage = (this.sessionMetrics.engineUsage.get('tesseract') || 0) / totalEngineUsage;
      if (tesseractUsage > 0.8) {
        recommendations.push('Consider integrating cloud OCR engines for better accuracy on complex documents');
      }
    }

    // Default recommendation if none generated
    if (recommendations.length === 0) {
      recommendations.push('System performing within optimal parameters');
    }

    return recommendations;
  }

  /**
   * Get quality level from score
   */
  private getQualityLevel(score: number): keyof QualityDistribution {
    if (score >= 0.9) return 'excellent';
    if (score >= 0.75) return 'good';
    if (score >= 0.6) return 'fair';
    return 'poor';
  }
}

/**
 * Type definitions for performance monitoring
 */
interface ProcessingMetrics {
  operationId: string;
  fileName: string;
  fileSize: number;
  documentType: 'text' | 'mixed' | 'handwritten' | 'form' | 'table';
  imageCount: number;
  estimatedPages: number;
  startTime: number;
  endTime: number | null;
  processingTime: number;
  status: 'processing' | 'completed' | 'failed';
  stages: ProcessingStages;
  qualityMetrics: QualityMetrics;
  resourceUsage: ResourceUsage;
  engineUsed: string;
  fallbackCount: number;
  errorCount: number;
  warnings: string[];
}

interface ProcessingStages {
  preprocessing: StageMetrics;
  qualityAnalysis: StageMetrics;
  dpiSelection: StageMetrics;
  engineSelection: StageMetrics;
  ocrProcessing: StageMetrics;
  postprocessing: StageMetrics;
}

interface StageMetrics {
  startTime: number;
  endTime: number;
  duration: number;
}

interface QualityMetrics {
  inputQuality: number;
  outputQuality: number;
  confidenceScore: number;
  accuracyScore: number;
}

interface ResourceUsage {
  memoryPeak: number;
  cpuTime: number;
  diskIO: { read: number; write: number };
}

interface SessionMetrics {
  totalProcessed: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  successRate: number;
  engineUsage: Map<string, number>;
  qualityDistribution: QualityDistribution;
  startTime: number;
}

interface QualityDistribution {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
}

interface PerformanceAlert {
  type: 'SLOW_PROCESSING' | 'HIGH_MEMORY_USAGE' | 'LOW_SUCCESS_RATE' | 'ENGINE_FAILURE';
  operationId: string;
  value: number;
  threshold: number;
  timestamp: number;
  message?: string;
}

export default PerformanceMonitor;