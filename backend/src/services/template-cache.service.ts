/**
 * Template Cache Service - PDFCraft.Pro
 * CRITICAL FIX: Memory leak prevention in PowerPoint template caching
 * Implements proper cache management with automatic cleanup
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

interface TemplateData {
  id: string;
  name: string;
  data: any;
  size: number;
  accessCount: number;
  lastAccessed: Date;
  created: Date;
  references: WeakSet<object>;
}

interface CacheStats {
  totalTemplates: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  hitRate: number;
  averageAccessCount: number;
  oldestTemplate: Date | null;
  memoryPressure: 'low' | 'medium' | 'high';
}

interface CacheOptions {
  maxSizeBytes: number;
  maxTemplates: number;
  ttlMs: number;
  cleanupIntervalMs: number;
  memoryThresholdBytes: number;
}

export class TemplateCacheService extends EventEmitter {
  private cache = new Map<string, TemplateData>();
  private accessLog = new Map<string, number>();
  private totalHits = 0;
  private totalMisses = 0;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private memoryCheckTimer: NodeJS.Timeout | null = null;

  private readonly options: CacheOptions;

  constructor(options?: Partial<CacheOptions>) {
    super();

    this.options = {
      maxSizeBytes: 50 * 1024 * 1024, // 50MB default
      maxTemplates: 100,
      ttlMs: 60 * 60 * 1000, // 1 hour
      cleanupIntervalMs: 10 * 60 * 1000, // 10 minutes
      memoryThresholdBytes: 100 * 1024 * 1024, // 100MB warning threshold
      ...options
    };

    this.startCleanupTimer();
    this.startMemoryMonitoring();

    // Listen for process events to cleanup on exit
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
    process.on('beforeExit', () => this.shutdown());
  }

  /**
   * CRITICAL FIX: Get template with proper reference tracking
   */
  async getTemplate(templateId: string, loader?: () => Promise<any>): Promise<any> {
    const cached = this.cache.get(templateId);

    if (cached) {
      // Update access statistics
      cached.accessCount++;
      cached.lastAccessed = new Date();
      this.totalHits++;

      logger.debug('Template cache hit', {
        templateId,
        accessCount: cached.accessCount,
        cacheSize: this.cache.size
      });

      return this.cloneTemplate(cached.data);
    }

    this.totalMisses++;

    if (!loader) {
      logger.debug('Template cache miss - no loader', { templateId });
      return null;
    }

    // Load template and cache it
    try {
      const templateData = await loader();
      await this.setTemplate(templateId, templateData);

      logger.debug('Template loaded and cached', {
        templateId,
        cacheSize: this.cache.size
      });

      return this.cloneTemplate(templateData);

    } catch (error) {
      logger.error('Failed to load template', {
        templateId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * CRITICAL FIX: Set template with memory management
   */
  async setTemplate(templateId: string, data: any, name?: string): Promise<void> {
    // Calculate data size
    const serialized = JSON.stringify(data);
    const size = Buffer.byteLength(serialized, 'utf8');

    // Check if adding this template would exceed limits
    if (size > this.options.maxSizeBytes) {
      logger.warn('Template too large for cache', {
        templateId,
        sizeMB: Math.round(size / (1024 * 1024)),
        maxSizeMB: Math.round(this.options.maxSizeBytes / (1024 * 1024))
      });
      return;
    }

    // Ensure we have space
    await this.ensureSpace(size);

    // Remove existing entry if it exists
    if (this.cache.has(templateId)) {
      this.removeTemplate(templateId);
    }

    // Create template entry with proper cleanup tracking
    const template: TemplateData = {
      id: templateId,
      name: name || templateId,
      data: this.cloneTemplate(data), // Store a deep copy
      size,
      accessCount: 1,
      lastAccessed: new Date(),
      created: new Date(),
      references: new WeakSet()
    };

    this.cache.set(templateId, template);

    logger.info('Template cached', {
      templateId,
      sizeMB: Math.round(size / (1024 * 1024)),
      totalCacheSize: this.getTotalSizeBytes(),
      totalTemplates: this.cache.size
    });

    // Emit cache update event
    this.emit('templateCached', { templateId, size });
  }

  /**
   * Remove template from cache with proper cleanup
   */
  removeTemplate(templateId: string): boolean {
    const template = this.cache.get(templateId);
    if (!template) {
      return false;
    }

    // Force garbage collection of template data
    this.cleanupTemplateData(template);

    this.cache.delete(templateId);

    logger.debug('Template removed from cache', {
      templateId,
      sizeMB: Math.round(template.size / (1024 * 1024)),
      remainingTemplates: this.cache.size
    });

    this.emit('templateRemoved', { templateId, size: template.size });
    return true;
  }

  /**
   * CRITICAL FIX: Proper template data cleanup
   */
  private cleanupTemplateData(template: TemplateData): void {
    try {
      // Clear all properties
      if (template.data && typeof template.data === 'object') {
        // Recursively null out properties
        this.deepNullify(template.data);
      }

      // Clear the data reference
      template.data = null;

      // Clear other references
      template.references = new WeakSet();

    } catch (error) {
      logger.warn('Error cleaning up template data', {
        templateId: template.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Deep nullify object properties to help garbage collection
   */
  private deepNullify(obj: any): void {
    if (obj === null || typeof obj !== 'object') {
      return;
    }

    if (Array.isArray(obj)) {
      obj.splice(0, obj.length);
      return;
    }

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          this.deepNullify(obj[key]);
        }
        obj[key] = null;
      }
    }
  }

  /**
   * Ensure enough space in cache for new template
   */
  private async ensureSpace(requiredSize: number): Promise<void> {
    const currentSize = this.getTotalSizeBytes();

    // Check if we need to free up space
    while (
      (currentSize + requiredSize > this.options.maxSizeBytes) ||
      (this.cache.size >= this.options.maxTemplates)
    ) {
      const evicted = this.evictLeastRecentlyUsed();
      if (!evicted) {
        // Unable to free space
        break;
      }
    }

    // Force aggressive cleanup if we're still over limits
    if (currentSize + requiredSize > this.options.maxSizeBytes) {
      await this.aggressiveCleanup();
    }
  }

  /**
   * Evict least recently used template
   */
  private evictLeastRecentlyUsed(): boolean {
    if (this.cache.size === 0) {
      return false;
    }

    let lruTemplate: TemplateData | null = null;
    let lruTemplateId = '';

    for (const [id, template] of this.cache) {
      if (!lruTemplate || template.lastAccessed < lruTemplate.lastAccessed) {
        lruTemplate = template;
        lruTemplateId = id;
      }
    }

    if (lruTemplateId) {
      logger.debug('Evicting LRU template', {
        templateId: lruTemplateId,
        lastAccessed: lruTemplate!.lastAccessed,
        accessCount: lruTemplate!.accessCount
      });

      this.removeTemplate(lruTemplateId);
      return true;
    }

    return false;
  }

  /**
   * Aggressive cleanup for memory pressure situations
   */
  private async aggressiveCleanup(): Promise<void> {
    const targetSize = this.options.maxSizeBytes * 0.5; // Clear to 50% capacity
    let freedBytes = 0;

    // Sort templates by score (access count / age)
    const templates = Array.from(this.cache.entries()).map(([id, template]) => {
      const ageMs = Date.now() - template.created.getTime();
      const score = template.accessCount / (ageMs / 1000 / 60); // access per minute
      return { id, template, score };
    });

    // Sort by score (ascending - lowest first)
    templates.sort((a, b) => a.score - b.score);

    for (const { id, template } of templates) {
      if (freedBytes >= targetSize) {
        break;
      }

      freedBytes += template.size;
      this.removeTemplate(id);
    }

    logger.warn('Aggressive cache cleanup performed', {
      templatesRemoved: templates.length,
      freedMB: Math.round(freedBytes / (1024 * 1024)),
      remainingTemplates: this.cache.size
    });

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Start cleanup timer for expired templates
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredTemplates();
    }, this.options.cleanupIntervalMs);
  }

  /**
   * Cleanup expired templates
   */
  private cleanupExpiredTemplates(): void {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, template] of this.cache) {
      if (now - template.lastAccessed.getTime() > this.options.ttlMs) {
        expiredIds.push(id);
      }
    }

    if (expiredIds.length > 0) {
      logger.debug('Cleaning up expired templates', {
        expiredCount: expiredIds.length,
        totalTemplates: this.cache.size
      });

      expiredIds.forEach(id => this.removeTemplate(id));
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryCheckTimer = setInterval(() => {
      this.checkMemoryPressure();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check for memory pressure and react accordingly
   */
  private checkMemoryPressure(): void {
    const memUsage = process.memoryUsage();
    const cacheSize = this.getTotalSizeBytes();

    if (memUsage.heapUsed > this.options.memoryThresholdBytes) {
      logger.warn('High memory usage detected', {
        heapUsedMB: Math.round(memUsage.heapUsed / (1024 * 1024)),
        cacheSizeMB: Math.round(cacheSize / (1024 * 1024)),
        templatesCount: this.cache.size
      });

      // Trigger aggressive cleanup
      this.aggressiveCleanup();
    }
  }

  /**
   * Deep clone template data to prevent memory leaks
   */
  private cloneTemplate(data: any): any {
    try {
      // Use structured cloning for deep copy
      return JSON.parse(JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to clone template data', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return data; // Return original on error
    }
  }

  /**
   * Get total cache size in bytes
   */
  getTotalSizeBytes(): number {
    let total = 0;
    for (const template of this.cache.values()) {
      total += template.size;
    }
    return total;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalSize = this.getTotalSizeBytes();
    const templates = Array.from(this.cache.values());

    let totalAccessCount = 0;
    let oldestTemplate: Date | null = null;

    for (const template of templates) {
      totalAccessCount += template.accessCount;

      if (!oldestTemplate || template.created < oldestTemplate) {
        oldestTemplate = template.created;
      }
    }

    const totalRequests = this.totalHits + this.totalMisses;
    const hitRate = totalRequests > 0 ? this.totalHits / totalRequests : 0;

    // Determine memory pressure
    let memoryPressure: 'low' | 'medium' | 'high' = 'low';
    const sizeRatio = totalSize / this.options.maxSizeBytes;

    if (sizeRatio > 0.8) {
      memoryPressure = 'high';
    } else if (sizeRatio > 0.6) {
      memoryPressure = 'medium';
    }

    return {
      totalTemplates: this.cache.size,
      totalSizeBytes: totalSize,
      totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
      hitRate: Math.round(hitRate * 100) / 100,
      averageAccessCount: templates.length > 0 ? totalAccessCount / templates.length : 0,
      oldestTemplate,
      memoryPressure
    };
  }

  /**
   * Clear all templates from cache
   */
  clear(): void {
    logger.info('Clearing template cache', {
      templatesRemoved: this.cache.size,
      sizeMB: Math.round(this.getTotalSizeBytes() / (1024 * 1024))
    });

    // Cleanup all template data
    for (const template of this.cache.values()) {
      this.cleanupTemplateData(template);
    }

    this.cache.clear();
    this.accessLog.clear();
    this.totalHits = 0;
    this.totalMisses = 0;

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    this.emit('cacheCleared');
  }

  /**
   * Health check for template cache
   */
  healthCheck(): { status: string; details: CacheStats } {
    const stats = this.getStats();

    const status = stats.memoryPressure === 'high' ? 'warning' : 'healthy';

    return {
      status,
      details: stats
    };
  }

  /**
   * Shutdown template cache and cleanup resources
   */
  shutdown(): void {
    logger.info('Shutting down template cache service');

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.memoryCheckTimer) {
      clearInterval(this.memoryCheckTimer);
      this.memoryCheckTimer = null;
    }

    this.clear();
    this.removeAllListeners();
  }
}

// Singleton instance
export default new TemplateCacheService();