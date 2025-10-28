/**
 * WEEK 4 FIX: CPU THROTTLING SERVICE
 *
 * Prevents CPU spikes above 90% by implementing intelligent throttling
 * Based on Week 3 analysis: 2 CPU spikes to 100% detected
 */

import os from 'os';
import { EventEmitter } from 'events';

export interface CPUThrottlingConfig {
  maxCPUThreshold: number;      // 80% - throttle when CPU exceeds this
  criticalCPUThreshold: number; // 90% - block new requests when CPU exceeds this
  checkInterval: number;        // 5000ms - how often to check CPU usage
  throttleDuration: number;     // 10000ms - how long to throttle after spike
  backoffFactor: number;        // 1.5 - exponential backoff multiplier
}

export interface CPUMetrics {
  currentUsage: number;
  averageUsage: number;
  isThrottled: boolean;
  spikesDetected: number;
  lastSpike: Date | null;
  throttleUntil: Date | null;
}

export class CPUThrottlingService extends EventEmitter {
  private config: CPUThrottlingConfig;
  private metrics: CPUMetrics;
  private cpuHistory: number[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastCPUUsage: number = 0;

  constructor(config: Partial<CPUThrottlingConfig> = {}) {
    super();

    this.config = {
      maxCPUThreshold: 80,
      criticalCPUThreshold: 90,
      checkInterval: 5000,
      throttleDuration: 10000,
      backoffFactor: 1.5,
      ...config
    };

    this.metrics = {
      currentUsage: 0,
      averageUsage: 0,
      isThrottled: false,
      spikesDetected: 0,
      lastSpike: null,
      throttleUntil: null
    };

    this.startMonitoring();
  }

  /**
   * Start CPU monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.checkCPUUsage();
    }, this.config.checkInterval);

    console.log('🛡️ [CPU-THROTTLING] CPU throttling service started');
    console.log(`   - Max CPU threshold: ${this.config.maxCPUThreshold}%`);
    console.log(`   - Critical CPU threshold: ${this.config.criticalCPUThreshold}%`);
    console.log(`   - Check interval: ${this.config.checkInterval}ms`);
  }

  /**
   * Stop CPU monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛡️ [CPU-THROTTLING] CPU monitoring stopped');
    }
  }

  /**
   * Get current CPU usage percentage
   */
  private getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const cpus = os.cpus();

      // Calculate average CPU usage across all cores
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = 100 - ~~(100 * idle / total);

      resolve(Math.max(0, Math.min(100, usage)));
    });
  }

  /**
   * Check CPU usage and apply throttling if needed
   */
  private async checkCPUUsage(): Promise<void> {
    try {
      const cpuUsage = await this.getCPUUsage();
      this.metrics.currentUsage = cpuUsage;

      // Add to history (keep last 12 samples = 1 minute of data)
      this.cpuHistory.push(cpuUsage);
      if (this.cpuHistory.length > 12) {
        this.cpuHistory.shift();
      }

      // Calculate average usage
      this.metrics.averageUsage = this.cpuHistory.reduce((sum, usage) => sum + usage, 0) / this.cpuHistory.length;

      // Check if throttling should be lifted
      if (this.metrics.isThrottled && this.metrics.throttleUntil && new Date() > this.metrics.throttleUntil) {
        this.liftThrottling();
      }

      // Detect CPU spikes and apply throttling
      if (cpuUsage >= this.config.criticalCPUThreshold && !this.metrics.isThrottled) {
        this.applyCriticalThrottling(cpuUsage);
      } else if (cpuUsage >= this.config.maxCPUThreshold && !this.metrics.isThrottled) {
        this.applyPreventiveThrottling(cpuUsage);
      }

    } catch (error) {
      console.error('❌ [CPU-THROTTLING] Error checking CPU usage:', error);
    }
  }

  /**
   * Apply critical throttling for CPU spikes above 90%
   */
  private applyCriticalThrottling(cpuUsage: number): void {
    this.metrics.spikesDetected++;
    this.metrics.lastSpike = new Date();
    this.metrics.isThrottled = true;

    // Calculate throttle duration with exponential backoff
    const throttleDuration = this.config.throttleDuration * Math.pow(this.config.backoffFactor, this.metrics.spikesDetected - 1);
    this.metrics.throttleUntil = new Date(Date.now() + throttleDuration);

    console.log(`🚨 [CPU-THROTTLING] CRITICAL CPU spike detected: ${cpuUsage.toFixed(1)}%`);
    console.log(`   - Spike #${this.metrics.spikesDetected}`);
    console.log(`   - Throttling for ${throttleDuration}ms`);
    console.log(`   - Throttle until: ${this.metrics.throttleUntil.toISOString()}`);

    this.emit('criticalSpike', {
      cpuUsage,
      spikesDetected: this.metrics.spikesDetected,
      throttleDuration,
      throttleUntil: this.metrics.throttleUntil
    });
  }

  /**
   * Apply preventive throttling for CPU usage above 80%
   */
  private applyPreventiveThrottling(cpuUsage: number): void {
    this.metrics.isThrottled = true;
    this.metrics.throttleUntil = new Date(Date.now() + this.config.throttleDuration);

    console.log(`⚠️ [CPU-THROTTLING] High CPU usage detected: ${cpuUsage.toFixed(1)}%`);
    console.log(`   - Applying preventive throttling for ${this.config.throttleDuration}ms`);

    this.emit('highUsage', {
      cpuUsage,
      throttleDuration: this.config.throttleDuration,
      throttleUntil: this.metrics.throttleUntil
    });
  }

  /**
   * Lift throttling when CPU usage normalizes
   */
  private liftThrottling(): void {
    this.metrics.isThrottled = false;
    this.metrics.throttleUntil = null;

    console.log(`✅ [CPU-THROTTLING] Throttling lifted - CPU normalized to ${this.metrics.currentUsage.toFixed(1)}%`);

    this.emit('throttlingLifted', {
      cpuUsage: this.metrics.currentUsage,
      averageUsage: this.metrics.averageUsage
    });
  }

  /**
   * Check if requests should be throttled
   */
  public shouldThrottleRequest(): boolean {
    return this.metrics.isThrottled && this.metrics.throttleUntil && new Date() < this.metrics.throttleUntil;
  }

  /**
   * Check if new heavy operations should be blocked
   */
  public shouldBlockHeavyOperations(): boolean {
    return this.metrics.currentUsage >= this.config.criticalCPUThreshold ||
           (this.metrics.isThrottled && this.metrics.currentUsage >= this.config.maxCPUThreshold);
  }

  /**
   * Get current CPU metrics
   */
  public getMetrics(): CPUMetrics {
    return { ...this.metrics };
  }

  /**
   * Get throttling configuration
   */
  public getConfig(): CPUThrottlingConfig {
    return { ...this.config };
  }

  /**
   * Get CPU usage history
   */
  public getCPUHistory(): number[] {
    return [...this.cpuHistory];
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<CPUThrottlingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 [CPU-THROTTLING] Configuration updated:', newConfig);
  }

  /**
   * Reset metrics (useful for testing)
   */
  public resetMetrics(): void {
    this.metrics = {
      currentUsage: 0,
      averageUsage: 0,
      isThrottled: false,
      spikesDetected: 0,
      lastSpike: null,
      throttleUntil: null
    };
    this.cpuHistory = [];
    console.log('🔄 [CPU-THROTTLING] Metrics reset');
  }

  /**
   * Cleanup when shutting down
   */
  public destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
    console.log('🛡️ [CPU-THROTTLING] Service destroyed');
  }
}

// Create singleton instance
export const cpuThrottling = new CPUThrottlingService();

// Graceful shutdown
process.on('SIGTERM', () => {
  cpuThrottling.destroy();
});

process.on('SIGINT', () => {
  cpuThrottling.destroy();
});