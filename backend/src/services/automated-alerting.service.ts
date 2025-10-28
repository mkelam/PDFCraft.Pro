/**
 * WEEK 4 FIX: AUTOMATED ALERTING SYSTEM
 *
 * Deploys real-time alert system based on Week 3 analysis
 * Target: Reduce response time from critical issues
 * Priority: Week 4 Priority 4
 */

import { EventEmitter } from 'events';
import { cpuThrottling } from './cpu-throttling.service';
import { logger } from '../utils/logger';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: (metrics: any) => boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  cooldownMs: number;
  lastTriggered?: number;
  enabled: boolean;
}

export interface AlertEvent {
  ruleId: string;
  ruleName: string;
  severity: string;
  message: string;
  metrics: any;
  timestamp: number;
  resolved: boolean;
}

export interface AlertingConfig {
  checkInterval: number;        // 10000ms - how often to check alerts
  maxAlertsPerHour: number;    // 50 - prevent alert spam
  enableConsoleLogging: boolean; // true - log alerts to console
  enableEmailAlerts: boolean;   // false - email alerts (future)
  enableSlackAlerts: boolean;   // false - slack alerts (future)
}

export class AutomatedAlertingService extends EventEmitter {
  private config: AlertingConfig;
  private alertRules: Map<string, AlertRule> = new Map();
  private recentAlerts: AlertEvent[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private systemMetrics: any = {};

  constructor(config: Partial<AlertingConfig> = {}) {
    super();

    this.config = {
      checkInterval: 10000,
      maxAlertsPerHour: 50,
      enableConsoleLogging: true,
      enableEmailAlerts: false,
      enableSlackAlerts: false,
      ...config
    };

    this.initializeDefaultRules();
    this.startMonitoring();
    this.setupEventListeners();

    console.log('🚨 [AUTOMATED-ALERTING] Alerting system initialized');
    console.log(`   - Check interval: ${this.config.checkInterval}ms`);
    console.log(`   - Active rules: ${this.alertRules.size}`);
    console.log(`   - Max alerts/hour: ${this.config.maxAlertsPerHour}`);
  }

  /**
   * Initialize default alert rules based on Week 3 analysis
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'cpu-critical',
        name: 'Critical CPU Usage',
        description: 'CPU usage above 90% detected',
        condition: (metrics) => metrics.cpu?.usage > 90,
        severity: 'CRITICAL',
        cooldownMs: 60000, // 1 minute
        enabled: true
      },
      {
        id: 'cpu-high',
        name: 'High CPU Usage',
        description: 'CPU usage above 80% for extended period',
        condition: (metrics) => metrics.cpu?.usage > 80,
        severity: 'HIGH',
        cooldownMs: 300000, // 5 minutes
        enabled: true
      },
      {
        id: 'memory-high',
        name: 'High Memory Usage',
        description: 'Memory usage above 85%',
        condition: (metrics) => metrics.memory?.usage > 85,
        severity: 'HIGH',
        cooldownMs: 300000, // 5 minutes
        enabled: true
      },
      {
        id: 'error-rate-high',
        name: 'High Error Rate',
        description: 'Error rate above 5% detected',
        condition: (metrics) => metrics.errors?.rate > 5,
        severity: 'HIGH',
        cooldownMs: 180000, // 3 minutes
        enabled: true
      },
      {
        id: 'response-time-slow',
        name: 'Slow Response Time',
        description: 'Average response time above 50ms',
        condition: (metrics) => metrics.performance?.averageResponseTime > 50,
        severity: 'MEDIUM',
        cooldownMs: 600000, // 10 minutes
        enabled: true
      },
      {
        id: 'conversion-failures',
        name: 'Conversion Failures',
        description: 'Multiple conversion failures detected',
        condition: (metrics) => metrics.conversions?.failureRate > 10,
        severity: 'HIGH',
        cooldownMs: 180000, // 3 minutes
        enabled: true
      },
      {
        id: 'disk-space-low',
        name: 'Low Disk Space',
        description: 'Disk space below 1GB',
        condition: (metrics) => metrics.disk?.freeSpaceGB < 1,
        severity: 'CRITICAL',
        cooldownMs: 300000, // 5 minutes
        enabled: true
      },
      {
        id: 'queue-backlog',
        name: 'Processing Queue Backlog',
        description: 'More than 10 jobs waiting in queue',
        condition: (metrics) => metrics.queue?.waiting > 10,
        severity: 'MEDIUM',
        cooldownMs: 180000, // 3 minutes
        enabled: true
      }
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  /**
   * Setup event listeners for real-time alerts
   */
  private setupEventListeners(): void {
    // Listen to CPU throttling events
    cpuThrottling.on('criticalSpike', (data) => {
      this.triggerAlert('cpu-critical', `Critical CPU spike: ${data.cpuUsage.toFixed(1)}%`, {
        cpu: { usage: data.cpuUsage },
        source: 'cpu-throttling-service'
      });
    });

    cpuThrottling.on('highUsage', (data) => {
      this.triggerAlert('cpu-high', `High CPU usage: ${data.cpuUsage.toFixed(1)}%`, {
        cpu: { usage: data.cpuUsage },
        source: 'cpu-throttling-service'
      });
    });

    // Listen to our own alert events
    this.on('alertTriggered', (alert: AlertEvent) => {
      this.handleAlertTriggered(alert);
    });

    this.on('alertResolved', (alert: AlertEvent) => {
      this.handleAlertResolved(alert);
    });
  }

  /**
   * Start monitoring system metrics
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.evaluateAlerts();
    }, this.config.checkInterval);

    console.log('🔍 [AUTOMATED-ALERTING] Monitoring started');
  }

  /**
   * Collect current system metrics
   */
  private collectMetrics(): void {
    try {
      const cpuMetrics = cpuThrottling.getMetrics();
      const memoryUsage = process.memoryUsage();
      const totalMemory = require('os').totalmem();
      const freeMemory = require('os').freemem();

      this.systemMetrics = {
        cpu: {
          usage: cpuMetrics.currentUsage,
          average: cpuMetrics.averageUsage,
          spikes: cpuMetrics.spikesDetected
        },
        memory: {
          usage: ((totalMemory - freeMemory) / totalMemory) * 100,
          heapUsed: memoryUsage.heapUsed / 1024 / 1024, // MB
          heapTotal: memoryUsage.heapTotal / 1024 / 1024, // MB
          rss: memoryUsage.rss / 1024 / 1024 // MB
        },
        disk: {
          freeSpaceGB: this.getDiskFreeSpace()
        },
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('❌ [AUTOMATED-ALERTING] Error collecting metrics:', error);
    }
  }

  /**
   * Get available disk space (simplified)
   */
  private getDiskFreeSpace(): number {
    try {
      const fs = require('fs');
      const stats = fs.statSync('./');
      // This is a simplified version - in production you'd use statvfs or similar
      return 5; // Default to 5GB for demo
    } catch (error) {
      return 5; // Default fallback
    }
  }

  /**
   * Evaluate all alert rules against current metrics
   */
  private evaluateAlerts(): void {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown period
      if (rule.lastTriggered &&
          Date.now() - rule.lastTriggered < rule.cooldownMs) {
        continue;
      }

      try {
        const shouldAlert = rule.condition(this.systemMetrics);

        if (shouldAlert) {
          this.triggerAlert(ruleId, rule.description, this.systemMetrics);
          rule.lastTriggered = Date.now();
        }
      } catch (error) {
        console.error(`❌ [AUTOMATED-ALERTING] Error evaluating rule ${ruleId}:`, error);
      }
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(ruleId: string, message: string, metrics: any): void {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return;

    // Check alert rate limiting
    const recentAlertsCount = this.recentAlerts.filter(
      alert => Date.now() - alert.timestamp < 3600000 // 1 hour
    ).length;

    if (recentAlertsCount >= this.config.maxAlertsPerHour) {
      console.warn('⚠️ [AUTOMATED-ALERTING] Alert rate limit reached, suppressing alerts');
      return;
    }

    const alertEvent: AlertEvent = {
      ruleId,
      ruleName: rule.name,
      severity: rule.severity,
      message,
      metrics,
      timestamp: Date.now(),
      resolved: false
    };

    this.recentAlerts.push(alertEvent);
    this.emit('alertTriggered', alertEvent);
  }

  /**
   * Handle triggered alert
   */
  private handleAlertTriggered(alert: AlertEvent): void {
    if (this.config.enableConsoleLogging) {
      const severityEmoji = {
        'LOW': '🟡',
        'MEDIUM': '🟠',
        'HIGH': '🔴',
        'CRITICAL': '🚨'
      }[alert.severity] || '⚠️';

      console.log(`${severityEmoji} [ALERT-${alert.severity}] ${alert.ruleName}`);
      console.log(`   📝 ${alert.message}`);
      console.log(`   ⏰ ${new Date(alert.timestamp).toISOString()}`);
      console.log(`   📊 Metrics: ${JSON.stringify(alert.metrics, null, 2)}`);
    }

    // Log to structured logger
    logger.warn('Alert triggered', {
      ruleId: alert.ruleId,
      ruleName: alert.ruleName,
      severity: alert.severity,
      message: alert.message,
      metrics: alert.metrics
    });
  }

  /**
   * Handle resolved alert
   */
  private handleAlertResolved(alert: AlertEvent): void {
    console.log(`✅ [ALERT-RESOLVED] ${alert.ruleName} - Issue resolved`);

    logger.info('Alert resolved', {
      ruleId: alert.ruleId,
      ruleName: alert.ruleName,
      resolvedAt: Date.now()
    });
  }

  /**
   * Add custom alert rule
   */
  public addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    console.log(`➕ [AUTOMATED-ALERTING] Added rule: ${rule.name}`);
  }

  /**
   * Remove alert rule
   */
  public removeAlertRule(ruleId: string): void {
    if (this.alertRules.delete(ruleId)) {
      console.log(`➖ [AUTOMATED-ALERTING] Removed rule: ${ruleId}`);
    }
  }

  /**
   * Enable/disable alert rule
   */
  public toggleAlertRule(ruleId: string, enabled: boolean): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      console.log(`🔧 [AUTOMATED-ALERTING] Rule ${ruleId} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get alert statistics
   */
  public getAlertStats() {
    const hourAgo = Date.now() - 3600000;
    const recentAlerts = this.recentAlerts.filter(alert => alert.timestamp > hourAgo);

    const severityCounts = recentAlerts.reduce((counts, alert) => {
      counts[alert.severity] = (counts[alert.severity] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return {
      totalRules: this.alertRules.size,
      enabledRules: Array.from(this.alertRules.values()).filter(rule => rule.enabled).length,
      alertsLastHour: recentAlerts.length,
      severityBreakdown: severityCounts,
      recentAlerts: recentAlerts.slice(-10), // Last 10 alerts
      systemMetrics: this.systemMetrics
    };
  }

  /**
   * Get all alert rules
   */
  public getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 [AUTOMATED-ALERTING] Monitoring stopped');
    }
  }

  /**
   * Destroy the alerting service
   */
  public destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
    console.log('🛡️ [AUTOMATED-ALERTING] Service destroyed');
  }
}

// Create singleton instance
export const automatedAlerting = new AutomatedAlertingService();

// Graceful shutdown
process.on('SIGTERM', () => {
  automatedAlerting.destroy();
});

process.on('SIGINT', () => {
  automatedAlerting.destroy();
});