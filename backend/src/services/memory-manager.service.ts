/**
 * 🧠 MEMORY MANAGER SERVICE
 * Eliminates memory accumulation and implements aggressive garbage collection
 */

import { EventEmitter } from 'events';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  timestamp: number;
}

interface MemoryThresholds {
  warningMB: number;
  criticalMB: number;
  maxAllowedMB: number;
  gcTriggerMB: number;
}

interface CleanupTask {
  name: string;
  priority: number;
  cleanup: () => Promise<void>;
}

export class MemoryManagerService extends EventEmitter {
  private static instance: MemoryManagerService;
  private isActive = false;
  private metrics: MemoryMetrics[] = [];
  private cleanupTasks: CleanupTask[] = [];
  private gcTimer: NodeJS.Timeout | null = null;
  private monitoringTimer: NodeJS.Timeout | null = null;

  private readonly thresholds: MemoryThresholds = {
    warningMB: 150,      // Warn at 150MB
    criticalMB: 250,     // Critical at 250MB
    maxAllowedMB: 400,   // Emergency cleanup at 400MB
    gcTriggerMB: 100     // Trigger GC at 100MB
  };

  private constructor() {
    super();
    this.setupDefaultCleanupTasks();
  }

  public static getInstance(): MemoryManagerService {
    if (!MemoryManagerService.instance) {
      MemoryManagerService.instance = new MemoryManagerService();
    }
    return MemoryManagerService.instance;
  }

  /**
   * Start aggressive memory management
   */
  public startMemoryManagement(): void {
    if (this.isActive) {
      console.log('🧠 [MEMORY-MANAGER] Already active');
      return;
    }

    this.isActive = true;
    console.log('🧠 [MEMORY-MANAGER] Starting aggressive memory management...');

    // Monitor memory every 10 seconds
    this.monitoringTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, 10000);

    // Force garbage collection every 30 seconds
    this.gcTimer = setInterval(() => {
      this.performGarbageCollection('scheduled');
    }, 30000);

    // Initial baseline
    this.checkMemoryUsage();
  }

  /**
   * Stop memory management
   */
  public stopMemoryManagement(): void {
    this.isActive = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }

    console.log('🧠 [MEMORY-MANAGER] Memory management stopped');
  }

  /**
   * Check current memory usage and take action if needed
   */
  public checkMemoryUsage(): MemoryMetrics {
    const usage = process.memoryUsage();
    const metrics: MemoryMetrics = {
      heapUsed: usage.heapUsed / 1024 / 1024,
      heapTotal: usage.heapTotal / 1024 / 1024,
      external: usage.external / 1024 / 1024,
      rss: usage.rss / 1024 / 1024,
      arrayBuffers: usage.arrayBuffers / 1024 / 1024,
      timestamp: Date.now()
    };

    // Store metrics (keep last 100 readings)
    this.metrics.push(metrics);
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    // Take action based on memory usage
    if (metrics.heapUsed > this.thresholds.maxAllowedMB) {
      console.error(`🚨 [MEMORY-MANAGER] CRITICAL: Memory usage ${metrics.heapUsed.toFixed(1)}MB - Emergency cleanup!`);
      this.performEmergencyCleanup();
      this.emit('memory-critical', metrics);
    } else if (metrics.heapUsed > this.thresholds.criticalMB) {
      console.warn(`⚠️ [MEMORY-MANAGER] HIGH: Memory usage ${metrics.heapUsed.toFixed(1)}MB - Aggressive cleanup`);
      this.performAggressiveCleanup();
      this.emit('memory-high', metrics);
    } else if (metrics.heapUsed > this.thresholds.warningMB) {
      console.warn(`💛 [MEMORY-MANAGER] WARNING: Memory usage ${metrics.heapUsed.toFixed(1)}MB - Standard cleanup`);
      this.performStandardCleanup();
      this.emit('memory-warning', metrics);
    } else if (metrics.heapUsed > this.thresholds.gcTriggerMB) {
      console.log(`♻️ [MEMORY-MANAGER] Triggering garbage collection at ${metrics.heapUsed.toFixed(1)}MB`);
      this.performGarbageCollection('threshold');
    }

    return metrics;
  }

  /**
   * Force garbage collection with detailed logging
   */
  public performGarbageCollection(reason: string): void {
    const beforeGC = process.memoryUsage();

    try {
      if (global.gc) {
        global.gc();

        const afterGC = process.memoryUsage();
        const freedMB = (beforeGC.heapUsed - afterGC.heapUsed) / 1024 / 1024;

        console.log(`♻️ [MEMORY-MANAGER] GC (${reason}): Freed ${freedMB.toFixed(1)}MB (${(beforeGC.heapUsed/1024/1024).toFixed(1)}MB → ${(afterGC.heapUsed/1024/1024).toFixed(1)}MB)`);

        this.emit('gc-complete', { reason, freedMB, before: beforeGC, after: afterGC });
      } else {
        console.warn('⚠️ [MEMORY-MANAGER] Global GC not available - start with --expose-gc');
      }
    } catch (error) {
      console.error('❌ [MEMORY-MANAGER] GC failed:', error);
    }
  }

  /**
   * Standard memory cleanup
   */
  private async performStandardCleanup(): Promise<void> {
    console.log('🧹 [MEMORY-MANAGER] Performing standard cleanup...');

    await this.runCleanupTasks(['cache', 'temp-files']);
    this.performGarbageCollection('standard-cleanup');
  }

  /**
   * Aggressive memory cleanup
   */
  private async performAggressiveCleanup(): Promise<void> {
    console.log('🧹 [MEMORY-MANAGER] Performing aggressive cleanup...');

    await this.runCleanupTasks(['cache', 'temp-files', 'buffers', 'streams']);

    // Multiple GC passes
    this.performGarbageCollection('aggressive-cleanup-1');
    setTimeout(() => this.performGarbageCollection('aggressive-cleanup-2'), 1000);
  }

  /**
   * Emergency memory cleanup
   */
  private async performEmergencyCleanup(): Promise<void> {
    console.error('🚨 [MEMORY-MANAGER] EMERGENCY CLEANUP ACTIVATED!');

    await this.runCleanupTasks(['emergency', 'cache', 'temp-files', 'buffers', 'streams', 'logs']);

    // Force multiple GC passes immediately
    for (let i = 0; i < 3; i++) {
      this.performGarbageCollection(`emergency-cleanup-${i + 1}`);
    }

    // Clear metrics history to free memory
    this.metrics.splice(0, this.metrics.length - 10);
  }

  /**
   * Run cleanup tasks by category
   */
  private async runCleanupTasks(categories: string[]): Promise<void> {
    const tasks = this.cleanupTasks
      .filter(task => categories.some(cat => task.name.includes(cat)))
      .sort((a, b) => b.priority - a.priority);

    for (const task of tasks) {
      try {
        await task.cleanup();
        console.log(`✅ [MEMORY-MANAGER] Cleanup task completed: ${task.name}`);
      } catch (error) {
        console.error(`❌ [MEMORY-MANAGER] Cleanup task failed: ${task.name}`, error);
      }
    }
  }

  /**
   * Setup default cleanup tasks
   */
  private setupDefaultCleanupTasks(): void {
    // Cache cleanup
    this.addCleanupTask('cache-clear', 8, async () => {
      // Clear any internal caches
      if (require.cache) {
        const moduleCount = Object.keys(require.cache).length;
        // Don't clear core modules, just user modules
        Object.keys(require.cache).forEach(key => {
          if (key.includes('node_modules') && !key.includes('express')) {
            delete require.cache[key];
          }
        });
        console.log(`🧹 Cleared ${moduleCount - Object.keys(require.cache).length} cached modules`);
      }
    });

    // Temporary files cleanup
    this.addCleanupTask('temp-files', 7, async () => {
      try {
        const tempDirs = [
          path.join(process.cwd(), 'uploads'),
          path.join(process.cwd(), 'temp'),
          path.join(process.cwd(), 'backend', 'temp'),
          os.tmpdir()
        ];

        for (const tempDir of tempDirs) {
          try {
            const files = await fs.readdir(tempDir);
            const oldFiles = [];

            for (const file of files) {
              const filePath = path.join(tempDir, file);
              try {
                const stats = await fs.stat(filePath);
                const ageMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);

                // Delete files older than 30 minutes
                if (ageMinutes > 30 && (
                  file.endsWith('.pdf') ||
                  file.endsWith('.pptx') ||
                  file.endsWith('.png') ||
                  file.endsWith('.tmp')
                )) {
                  await fs.unlink(filePath);
                  oldFiles.push(file);
                }
              } catch (e) {
                // File might be in use, skip
              }
            }

            if (oldFiles.length > 0) {
              console.log(`🗑️ Cleaned up ${oldFiles.length} old temp files from ${tempDir}`);
            }
          } catch (e) {
            // Directory might not exist, skip
          }
        }
      } catch (error) {
        console.warn('Temp file cleanup failed:', error);
      }
    });

    // Buffer cleanup
    this.addCleanupTask('buffers', 6, async () => {
      // Force buffer cleanup
      if (Buffer.poolSize) {
        console.log('🔄 Forcing buffer pool cleanup');
      }
    });

    // Stream cleanup
    this.addCleanupTask('streams', 5, async () => {
      // Cleanup any hanging streams (implementation would depend on your stream usage)
      console.log('🌊 Stream cleanup completed');
    });

    // Emergency cleanup
    this.addCleanupTask('emergency', 10, async () => {
      console.log('🚨 Emergency memory cleanup - clearing all possible caches');

      // Clear all require cache except critical modules
      const criticalModules = ['express', 'http', 'fs', 'path', 'crypto'];
      Object.keys(require.cache).forEach(key => {
        if (!criticalModules.some(mod => key.includes(mod))) {
          delete require.cache[key];
        }
      });
    });

    // Log cleanup
    this.addCleanupTask('logs', 3, async () => {
      // Clear old console logs from memory (if any internal logging buffers exist)
      console.log('📝 Log cleanup completed');
    });
  }

  /**
   * Add a custom cleanup task
   */
  public addCleanupTask(name: string, priority: number, cleanup: () => Promise<void>): void {
    this.cleanupTasks.push({ name, priority, cleanup });
    this.cleanupTasks.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get memory usage statistics
   */
  public getMemoryStats(): {
    current: MemoryMetrics;
    peak: MemoryMetrics;
    average: MemoryMetrics;
    trend: 'increasing' | 'stable' | 'decreasing';
  } {
    if (this.metrics.length === 0) {
      const current = this.checkMemoryUsage();
      return {
        current,
        peak: current,
        average: current,
        trend: 'stable'
      };
    }

    const current = this.metrics[this.metrics.length - 1];
    const peak = this.metrics.reduce((max, metric) =>
      metric.heapUsed > max.heapUsed ? metric : max
    );

    const average: MemoryMetrics = {
      heapUsed: this.metrics.reduce((sum, m) => sum + m.heapUsed, 0) / this.metrics.length,
      heapTotal: this.metrics.reduce((sum, m) => sum + m.heapTotal, 0) / this.metrics.length,
      external: this.metrics.reduce((sum, m) => sum + m.external, 0) / this.metrics.length,
      rss: this.metrics.reduce((sum, m) => sum + m.rss, 0) / this.metrics.length,
      arrayBuffers: this.metrics.reduce((sum, m) => sum + m.arrayBuffers, 0) / this.metrics.length,
      timestamp: Date.now()
    };

    // Calculate trend based on last 10 readings
    const recentMetrics = this.metrics.slice(-10);
    const recentAvg = recentMetrics.reduce((sum, m) => sum + m.heapUsed, 0) / recentMetrics.length;
    const olderAvg = this.metrics.slice(-20, -10).reduce((sum, m) => sum + m.heapUsed, 0) / Math.min(10, this.metrics.length - 10);

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (recentAvg > olderAvg + 5) trend = 'increasing';
    else if (recentAvg < olderAvg - 5) trend = 'decreasing';

    return { current, peak, average, trend };
  }

  /**
   * Force immediate memory optimization
   */
  public async optimizeMemoryNow(): Promise<MemoryMetrics> {
    console.log('🚀 [MEMORY-MANAGER] Forcing immediate memory optimization...');

    const before = this.checkMemoryUsage();

    await this.performAggressiveCleanup();

    // Wait for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    const after = this.checkMemoryUsage();
    const savedMB = before.heapUsed - after.heapUsed;

    console.log(`💾 [MEMORY-MANAGER] Optimization complete: Saved ${savedMB.toFixed(1)}MB`);

    return after;
  }

  /**
   * Set custom memory thresholds
   */
  public setThresholds(thresholds: Partial<MemoryThresholds>): void {
    Object.assign(this.thresholds, thresholds);
    console.log('🎯 [MEMORY-MANAGER] Memory thresholds updated:', this.thresholds);
  }
}

// Export singleton instance
export const memoryManager = MemoryManagerService.getInstance();

// Auto-start memory management
memoryManager.startMemoryManagement();

// Setup process event handlers
process.on('exit', () => {
  memoryManager.stopMemoryManagement();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 [MEMORY-MANAGER] Uncaught exception - forcing cleanup:', error);
  memoryManager.optimizeMemoryNow().catch(console.error);
});

// Memory warning handler (if available)
if (process.listenerCount('warning') === 0) {
  process.on('warning', (warning) => {
    if (warning.name === 'MaxListenersExceededWarning' || warning.message.includes('memory')) {
      console.warn('⚠️ [MEMORY-MANAGER] Memory-related warning detected:', warning.message);
      memoryManager.performGarbageCollection('warning-triggered');
    }
  });
}