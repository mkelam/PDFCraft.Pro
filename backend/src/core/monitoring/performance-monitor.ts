/**
 * Advanced Performance Monitoring System
 * Tracks metrics, analyzes performance, and provides optimization recommendations
 */

import { EventEmitter } from 'events';
import { performance, PerformanceObserver } from 'perf_hooks';
import * as os from 'os';
import { Service, Injectable } from '../di/decorators';
import { ServiceToken } from '../di/container';

// Metric types
export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  unit?: string;
}

export interface PerformanceMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    used: number;
    free: number;
    total: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  response: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    mean: number;
    count: number;
  };
  throughput: {
    requestsPerSecond: number;
    bytesPerSecond: number;
  };
  errors: {
    rate: number;
    count: number;
    types: Record<string, number>;
  };
}

// Transaction tracking
export interface Transaction {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'started' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  spans: Span[];
}

export interface Span {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags?: Record<string, string>;
  logs?: Array<{ timestamp: number; message: string }>;
}

// Alert configuration
export interface AlertRule {
  name: string;
  metric: string;
  condition: 'above' | 'below' | 'equals';
  threshold: number;
  duration?: number;
  action?: (metric: Metric) => void;
}

/**
 * Performance Monitor Service
 */
@Service({ name: 'PerformanceMonitor' })
export class PerformanceMonitor extends EventEmitter {
  private metrics: Map<string, Metric[]> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private responseTimes: number[] = [];
  private errorCount = 0;
  private requestCount = 0;
  private alertRules: AlertRule[] = [];
  private collectionInterval?: NodeJS.Timer;
  private performanceObserver?: PerformanceObserver;

  constructor(
    private config: {
      collectionInterval?: number;
      retentionPeriod?: number;
      enableAutoCollection?: boolean;
      enableAlerts?: boolean;
    } = {}
  ) {
    super();

    if (config.enableAutoCollection !== false) {
      this.startAutoCollection();
    }

    this.setupPerformanceObserver();
  }

  /**
   * Record a metric
   */
  recordMetric(metric: Metric): void {
    const { name } = metric;

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push(metric);

    // Cleanup old metrics
    const retentionPeriod = this.config.retentionPeriod || 3600000; // 1 hour
    const cutoff = Date.now() - retentionPeriod;
    const filtered = metrics.filter(m => m.timestamp > cutoff);

    if (filtered.length !== metrics.length) {
      this.metrics.set(name, filtered);
    }

    // Check alerts
    if (this.config.enableAlerts !== false) {
      this.checkAlerts(metric);
    }

    this.emit('metric:recorded', metric);
  }

  /**
   * Record multiple metrics
   */
  recordMetrics(metrics: Metric[]): void {
    metrics.forEach(metric => this.recordMetric(metric));
  }

  /**
   * Start a transaction
   */
  startTransaction(name: string, metadata?: Record<string, any>): Transaction {
    const id = this.generateId();
    const transaction: Transaction = {
      id,
      name,
      startTime: performance.now(),
      status: 'started',
      metadata,
      spans: []
    };

    this.transactions.set(id, transaction);
    this.emit('transaction:started', transaction);

    return transaction;
  }

  /**
   * End a transaction
   */
  endTransaction(transactionId: string, status: 'completed' | 'failed' = 'completed'): void {
    const transaction = this.transactions.get(transactionId);

    if (!transaction) {
      return;
    }

    transaction.endTime = performance.now();
    transaction.duration = transaction.endTime - transaction.startTime;
    transaction.status = status;

    // Record response time
    if (status === 'completed') {
      this.responseTimes.push(transaction.duration);
      this.requestCount++;

      // Keep only recent response times
      if (this.responseTimes.length > 1000) {
        this.responseTimes = this.responseTimes.slice(-1000);
      }
    } else {
      this.errorCount++;
    }

    this.emit('transaction:ended', transaction);

    // Clean up after a delay
    setTimeout(() => {
      this.transactions.delete(transactionId);
    }, 60000);
  }

  /**
   * Add a span to a transaction
   */
  addSpan(transactionId: string, spanName: string, tags?: Record<string, string>): Span {
    const transaction = this.transactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const span: Span = {
      id: this.generateId(),
      name: spanName,
      startTime: performance.now(),
      tags,
      logs: []
    };

    transaction.spans.push(span);

    return span;
  }

  /**
   * End a span
   */
  endSpan(transactionId: string, spanId: string): void {
    const transaction = this.transactions.get(transactionId);

    if (!transaction) {
      return;
    }

    const span = transaction.spans.find(s => s.id === spanId);

    if (span && !span.endTime) {
      span.endTime = performance.now();
      span.duration = span.endTime - span.startTime;
    }
  }

  /**
   * Record response time
   */
  recordResponseTime(duration: number): void {
    this.responseTimes.push(duration);
    this.requestCount++;

    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    this.recordMetric({
      name: 'response_time',
      value: duration,
      timestamp: Date.now(),
      unit: 'ms'
    });
  }

  /**
   * Record error
   */
  recordError(error: Error, type?: string): void {
    this.errorCount++;

    this.recordMetric({
      name: 'error',
      value: 1,
      timestamp: Date.now(),
      tags: {
        type: type || error.constructor.name,
        message: error.message
      }
    });

    this.emit('error:recorded', { error, type });
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const memUsage = process.memoryUsage();

    return {
      cpu: {
        usage: this.getCPUUsage(),
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      memory: {
        used: os.totalmem() - os.freemem(),
        free: os.freemem(),
        total: os.totalmem(),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      },
      response: this.calculateResponseTimeStats(),
      throughput: this.calculateThroughput(),
      errors: this.calculateErrorStats()
    };
  }

  /**
   * Get metric history
   */
  getMetricHistory(name: string, duration?: number): Metric[] {
    const metrics = this.metrics.get(name) || [];

    if (duration) {
      const cutoff = Date.now() - duration;
      return metrics.filter(m => m.timestamp > cutoff);
    }

    return metrics;
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(name: string): void {
    this.alertRules = this.alertRules.filter(r => r.name !== name);
  }

  /**
   * Create performance mark
   */
  mark(name: string): void {
    performance.mark(name);
  }

  /**
   * Measure between marks
   */
  measure(name: string, startMark: string, endMark: string): number {
    performance.measure(name, startMark, endMark);
    const measure = performance.getEntriesByName(name)[0];
    return measure ? measure.duration : 0;
  }

  /**
   * Time a function execution
   */
  async time<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      this.recordMetric({
        name: `function.${name}`,
        value: duration,
        timestamp: Date.now(),
        unit: 'ms'
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.recordMetric({
        name: `function.${name}.error`,
        value: duration,
        timestamp: Date.now(),
        unit: 'ms'
      });

      throw error;
    }
  }

  /**
   * Get performance report
   */
  getReport(): string {
    const metrics = this.getMetrics();

    return `
Performance Report
==================

CPU Usage: ${metrics.cpu.usage.toFixed(2)}%
Load Average: ${metrics.cpu.loadAverage.map(l => l.toFixed(2)).join(', ')}
CPU Cores: ${metrics.cpu.cores}

Memory:
- Used: ${this.formatBytes(metrics.memory.used)}
- Free: ${this.formatBytes(metrics.memory.free)}
- Total: ${this.formatBytes(metrics.memory.total)}
- Heap Used: ${this.formatBytes(metrics.memory.heapUsed)}
- Heap Total: ${this.formatBytes(metrics.memory.heapTotal)}
- RSS: ${this.formatBytes(metrics.memory.rss)}

Response Times:
- P50: ${metrics.response.p50.toFixed(2)}ms
- P90: ${metrics.response.p90.toFixed(2)}ms
- P95: ${metrics.response.p95.toFixed(2)}ms
- P99: ${metrics.response.p99.toFixed(2)}ms
- Mean: ${metrics.response.mean.toFixed(2)}ms
- Count: ${metrics.response.count}

Throughput:
- Requests/sec: ${metrics.throughput.requestsPerSecond.toFixed(2)}
- Bytes/sec: ${this.formatBytes(metrics.throughput.bytesPerSecond)}

Errors:
- Rate: ${(metrics.errors.rate * 100).toFixed(2)}%
- Count: ${metrics.errors.count}
`;
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];
    const timestamp = Date.now();

    // Add metric entries
    for (const [name, metrics] of this.metrics) {
      const latest = metrics[metrics.length - 1];
      if (latest) {
        const metricName = name.replace(/[^a-zA-Z0-9_]/g, '_');
        const tags = latest.tags
          ? Object.entries(latest.tags)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')
          : '';

        lines.push(`# TYPE ${metricName} gauge`);
        lines.push(`${metricName}${tags ? `{${tags}}` : ''} ${latest.value} ${timestamp}`);
      }
    }

    return lines.join('\n');
  }

  private startAutoCollection(): void {
    const interval = this.config.collectionInterval || 10000; // 10 seconds

    this.collectionInterval = setInterval(() => {
      // Collect CPU usage
      this.recordMetric({
        name: 'cpu.usage',
        value: this.getCPUUsage(),
        timestamp: Date.now(),
        unit: 'percent'
      });

      // Collect memory usage
      const memUsage = process.memoryUsage();
      this.recordMetric({
        name: 'memory.heapUsed',
        value: memUsage.heapUsed,
        timestamp: Date.now(),
        unit: 'bytes'
      });

      this.recordMetric({
        name: 'memory.rss',
        value: memUsage.rss,
        timestamp: Date.now(),
        unit: 'bytes'
      });

      // Collect event loop lag
      const start = performance.now();
      setImmediate(() => {
        const lag = performance.now() - start;
        this.recordMetric({
          name: 'eventloop.lag',
          value: lag,
          timestamp: Date.now(),
          unit: 'ms'
        });
      });
    }, interval);
  }

  private setupPerformanceObserver(): void {
    this.performanceObserver = new PerformanceObserver(items => {
      items.getEntries().forEach(entry => {
        if (entry.entryType === 'measure') {
          this.recordMetric({
            name: `performance.${entry.name}`,
            value: entry.duration,
            timestamp: Date.now(),
            unit: 'ms'
          });
        }
      });
    });

    this.performanceObserver.observe({ entryTypes: ['measure'] });
  }

  private getCPUUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    });

    return 100 - (100 * totalIdle / totalTick);
  }

  private calculateResponseTimeStats(): PerformanceMetrics['response'] {
    if (this.responseTimes.length === 0) {
      return {
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        mean: 0,
        count: 0
      };
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      p50: sorted[Math.floor(count * 0.5)],
      p90: sorted[Math.floor(count * 0.9)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
      mean: sorted.reduce((a, b) => a + b, 0) / count,
      count
    };
  }

  private calculateThroughput(): PerformanceMetrics['throughput'] {
    const timeWindow = 60000; // 1 minute
    const now = Date.now();
    const recentRequests = this.getMetricHistory('response_time', timeWindow).length;

    return {
      requestsPerSecond: recentRequests / (timeWindow / 1000),
      bytesPerSecond: 0 // Would need to track bytes
    };
  }

  private calculateErrorStats(): PerformanceMetrics['errors'] {
    return {
      rate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
      count: this.errorCount,
      types: {} // Would need to track error types
    };
  }

  private checkAlerts(metric: Metric): void {
    for (const rule of this.alertRules) {
      if (metric.name === rule.metric) {
        let triggered = false;

        switch (rule.condition) {
          case 'above':
            triggered = metric.value > rule.threshold;
            break;
          case 'below':
            triggered = metric.value < rule.threshold;
            break;
          case 'equals':
            triggered = metric.value === rule.threshold;
            break;
        }

        if (triggered) {
          this.emit('alert:triggered', { rule, metric });

          if (rule.action) {
            rule.action(metric);
          }
        }
      }
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

// Export performance monitor token for DI
export const PERFORMANCE_MONITOR_TOKEN = new ServiceToken<PerformanceMonitor>('PerformanceMonitor');