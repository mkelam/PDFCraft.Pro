/**
 * CONVERSION CACHE SERVICE
 *
 * Implements intelligent caching for PDF conversions to improve performance
 * Reduces CloudConvert costs and provides faster responses for repeated conversions
 * Includes cache invalidation, compression, and smart storage management
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ConversionResult, EnhancedConversionResult, QualityMetrics } from '../types/pdf-conversion.types';

export interface CacheEntry {
  key: string;
  inputHash: string;
  outputFilename: string;
  outputPath: string;
  serviceName: string;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  fileSize: number;
  qualityScore: number;
  metadata: {
    originalFilename: string;
    pageCount: number;
    processingTime: number;
    cost?: number;
  };
}

export interface CacheConfig {
  cacheDir: string;
  maxSizeGB: number;
  maxAgeHours: number;
  compressionEnabled: boolean;
  cleanupIntervalHours: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSizeGB: number;
  hitRate: number;
  avgAccessCount: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  topServices: Array<{ serviceName: string; count: number }>;
}

export class ConversionCacheService {
  private config: CacheConfig;
  private cacheIndex: Map<string, CacheEntry> = new Map();
  private cleanupTimer?: NodeJS.Timeout;
  private stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      cacheDir: config?.cacheDir || './data/conversion-cache',
      maxSizeGB: config?.maxSizeGB || 10, // 10GB max cache
      maxAgeHours: config?.maxAgeHours || 168, // 7 days
      compressionEnabled: config?.compressionEnabled ?? true,
      cleanupIntervalHours: config?.cleanupIntervalHours || 24,
      ...config
    };

    this.initialize();
  }

  /**
   * Initialize cache system
   */
  private async initialize(): Promise<void> {
    try {
      // Ensure cache directory exists
      await fs.mkdir(this.config.cacheDir, { recursive: true });
      await fs.mkdir(path.join(this.config.cacheDir, 'files'), { recursive: true });

      // Load existing cache index
      await this.loadCacheIndex();

      // Start cleanup timer
      this.startCleanupTimer();

      console.log(`💾 [CACHE] Initialized with ${this.cacheIndex.size} entries, max size: ${this.config.maxSizeGB}GB`);

    } catch (error) {
      console.error('❌ [CACHE] Failed to initialize cache:', error);
      throw error;
    }
  }

  /**
   * Check if conversion result is cached
   */
  async isCached(inputPath: string, serviceName?: string): Promise<CacheEntry | null> {
    this.stats.totalRequests++;

    try {
      const inputHash = await this.calculateFileHash(inputPath);
      const cacheKey = this.generateCacheKey(inputHash, serviceName);

      const entry = this.cacheIndex.get(cacheKey);
      if (!entry) {
        this.stats.cacheMisses++;
        return null;
      }

      // Check if cache entry is still valid
      const isValid = await this.validateCacheEntry(entry);
      if (!isValid) {
        await this.removeCacheEntry(cacheKey);
        this.stats.cacheMisses++;
        return null;
      }

      // Update access statistics
      entry.lastAccessed = new Date();
      entry.accessCount++;
      await this.updateCacheIndex();

      this.stats.cacheHits++;
      console.log(`💾 [CACHE] Cache HIT for ${path.basename(inputPath)} (${serviceName || 'any'})`);

      return entry;

    } catch (error) {
      console.error('❌ [CACHE] Error checking cache:', error);
      this.stats.cacheMisses++;
      return null;
    }
  }

  /**
   * Store conversion result in cache
   */
  async cacheResult(
    inputPath: string,
    result: ConversionResult,
    serviceName: string,
    cost?: number
  ): Promise<void> {
    try {
      if (!result.success || !result.filename) {
        console.log('📄 [CACHE] Skipping cache for failed conversion');
        return;
      }

      const inputHash = await this.calculateFileHash(inputPath);
      const cacheKey = this.generateCacheKey(inputHash, serviceName);

      // Don't cache if entry already exists
      if (this.cacheIndex.has(cacheKey)) {
        console.log('💾 [CACHE] Entry already cached, skipping');
        return;
      }

      // Copy result file to cache
      const originalOutputPath = path.isAbsolute(result.filename)
        ? result.filename
        : path.join(process.cwd(), result.filename);

      const cachedFilename = `${cacheKey}_${path.basename(result.filename)}`;
      const cachedFilePath = path.join(this.config.cacheDir, 'files', cachedFilename);

      await fs.copyFile(originalOutputPath, cachedFilePath);

      // Get file size
      const stats = await fs.stat(cachedFilePath);
      const fileSize = stats.size;

      // Get quality score from enhanced result or default
      const qualityScore = (result as EnhancedConversionResult).qualityMetrics?.overallScore || 0.7;

      // Create cache entry
      const entry: CacheEntry = {
        key: cacheKey,
        inputHash,
        outputFilename: cachedFilename,
        outputPath: cachedFilePath,
        serviceName,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 1,
        fileSize,
        qualityScore,
        metadata: {
          originalFilename: result.metadata?.originalFilename || path.basename(inputPath),
          pageCount: result.metadata?.pageCount || 1,
          processingTime: result.processingTime || 0,
          cost
        }
      };

      // Add to cache index
      this.cacheIndex.set(cacheKey, entry);
      await this.updateCacheIndex();

      // Check cache size limits
      await this.enforceCacheLimits();

      console.log(`💾 [CACHE] Cached result: ${cachedFilename} (${(fileSize / 1024 / 1024).toFixed(1)}MB)`);

    } catch (error) {
      console.error('❌ [CACHE] Failed to cache result:', error);
    }
  }

  /**
   * Retrieve cached conversion result
   */
  async getCachedResult(cacheEntry: CacheEntry, outputDir: string): Promise<EnhancedConversionResult> {
    try {
      // Copy cached file to output directory
      const outputFilename = `cached_${Date.now()}_${path.basename(cacheEntry.outputFilename)}`;
      const outputPath = path.join(outputDir, outputFilename);

      await fs.copyFile(cacheEntry.outputPath, outputPath);

      console.log(`💾 [CACHE] Retrieved cached result: ${outputFilename}`);

      // Return enhanced conversion result
      const result: EnhancedConversionResult = {
        success: true,
        filename: outputFilename,
        processingTime: 50, // Very fast cache retrieval
        engine: `Cached-${cacheEntry.serviceName}`,
        confidence: cacheEntry.qualityScore,
        metadata: {
          originalFilename: cacheEntry.metadata.originalFilename,
          inputSize: 0, // Not tracked in cache
          outputSize: cacheEntry.fileSize,
          pageCount: cacheEntry.metadata.pageCount,
          timestamp: new Date().toISOString(),
          engineVersion: `Cached-${cacheEntry.serviceName}`
        },
        qualityMetrics: {
          textPreservation: cacheEntry.qualityScore,
          layoutPreservation: cacheEntry.qualityScore,
          visualPreservation: cacheEntry.qualityScore,
          semanticAccuracy: cacheEntry.qualityScore,
          overallScore: cacheEntry.qualityScore,
          confidence: cacheEntry.qualityScore
        }
      };

      return result;

    } catch (error) {
      console.error('❌ [CACHE] Failed to retrieve cached result:', error);
      throw error;
    }
  }

  /**
   * Calculate file hash for cache key generation
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      throw new Error(`Failed to calculate file hash: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(inputHash: string, serviceName?: string): string {
    const service = serviceName || 'any';
    return `${inputHash.substring(0, 16)}_${service}`;
  }

  /**
   * Validate cache entry
   */
  private async validateCacheEntry(entry: CacheEntry): Promise<boolean> {
    try {
      // Check if file still exists
      await fs.access(entry.outputPath);

      // Check age
      const ageHours = (Date.now() - entry.createdAt.getTime()) / (1000 * 60 * 60);
      if (ageHours > this.config.maxAgeHours) {
        console.log(`💾 [CACHE] Entry expired: ${entry.key} (${ageHours.toFixed(1)}h old)`);
        return false;
      }

      return true;

    } catch (error) {
      console.log(`💾 [CACHE] Entry invalid: ${entry.key} (file missing)`);
      return false;
    }
  }

  /**
   * Remove cache entry
   */
  private async removeCacheEntry(cacheKey: string): Promise<void> {
    const entry = this.cacheIndex.get(cacheKey);
    if (!entry) return;

    try {
      // Remove file
      await fs.unlink(entry.outputPath);
    } catch (error) {
      console.warn(`⚠️ [CACHE] Failed to remove cached file: ${entry.outputPath}`);
    }

    // Remove from index
    this.cacheIndex.delete(cacheKey);
    await this.updateCacheIndex();

    console.log(`🗑️ [CACHE] Removed entry: ${cacheKey}`);
  }

  /**
   * Enforce cache size and age limits
   */
  private async enforceCacheLimits(): Promise<void> {
    const stats = await this.getCacheStats();

    // Check size limit
    if (stats.totalSizeGB > this.config.maxSizeGB) {
      console.log(`💾 [CACHE] Size limit exceeded (${stats.totalSizeGB.toFixed(1)}GB), cleaning up...`);
      await this.cleanupOldEntries(0.1); // Remove 10% of entries
    }

    // Check age limit
    const now = Date.now();
    const expiredEntries: string[] = [];

    for (const [key, entry] of this.cacheIndex) {
      const ageHours = (now - entry.createdAt.getTime()) / (1000 * 60 * 60);
      if (ageHours > this.config.maxAgeHours) {
        expiredEntries.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredEntries) {
      await this.removeCacheEntry(key);
    }

    if (expiredEntries.length > 0) {
      console.log(`💾 [CACHE] Removed ${expiredEntries.length} expired entries`);
    }
  }

  /**
   * Cleanup old entries based on access patterns
   */
  private async cleanupOldEntries(percentage: number): Promise<void> {
    const entries = Array.from(this.cacheIndex.entries());

    // Sort by last accessed (oldest first) and access count (least accessed first)
    entries.sort(([, a], [, b]) => {
      const accessScore = a.accessCount - b.accessCount;
      if (accessScore !== 0) return accessScore;
      return a.lastAccessed.getTime() - b.lastAccessed.getTime();
    });

    const toRemove = Math.floor(entries.length * percentage);
    const entriesToRemove = entries.slice(0, toRemove);

    for (const [key] of entriesToRemove) {
      await this.removeCacheEntry(key);
    }

    console.log(`🧹 [CACHE] Cleaned up ${entriesToRemove.length} entries (${(percentage * 100).toFixed(1)}%)`);
  }

  /**
   * Load cache index from disk
   */
  private async loadCacheIndex(): Promise<void> {
    const indexPath = path.join(this.config.cacheDir, 'cache-index.json');

    try {
      const data = await fs.readFile(indexPath, 'utf-8');
      const indexData = JSON.parse(data);

      for (const [key, entryData] of Object.entries(indexData)) {
        const entry = entryData as any;
        entry.createdAt = new Date(entry.createdAt);
        entry.lastAccessed = new Date(entry.lastAccessed);
        this.cacheIndex.set(key, entry as CacheEntry);
      }

      console.log(`💾 [CACHE] Loaded ${this.cacheIndex.size} entries from index`);

    } catch (error) {
      console.log('💾 [CACHE] No existing cache index found, starting fresh');
    }
  }

  /**
   * Update cache index on disk
   */
  private async updateCacheIndex(): Promise<void> {
    const indexPath = path.join(this.config.cacheDir, 'cache-index.json');

    try {
      const indexData = Object.fromEntries(this.cacheIndex);
      await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
    } catch (error) {
      console.error('❌ [CACHE] Failed to update cache index:', error);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    const intervalMs = this.config.cleanupIntervalHours * 60 * 60 * 1000;

    this.cleanupTimer = setInterval(async () => {
      console.log('🧹 [CACHE] Running scheduled cleanup...');
      await this.enforceCacheLimits();
    }, intervalMs);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    let totalSizeBytes = 0;
    let oldestEntry: Date | null = null;
    let newestEntry: Date | null = null;
    const serviceCounts: Record<string, number> = {};
    let totalAccessCount = 0;

    for (const entry of this.cacheIndex.values()) {
      totalSizeBytes += entry.fileSize;
      totalAccessCount += entry.accessCount;

      if (!oldestEntry || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }

      if (!newestEntry || entry.createdAt > newestEntry) {
        newestEntry = entry.createdAt;
      }

      serviceCounts[entry.serviceName] = (serviceCounts[entry.serviceName] || 0) + 1;
    }

    const topServices = Object.entries(serviceCounts)
      .map(([serviceName, count]) => ({ serviceName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalEntries: this.cacheIndex.size,
      totalSizeGB: totalSizeBytes / (1024 ** 3),
      hitRate: this.stats.totalRequests > 0 ? this.stats.cacheHits / this.stats.totalRequests : 0,
      avgAccessCount: this.cacheIndex.size > 0 ? totalAccessCount / this.cacheIndex.size : 0,
      oldestEntry,
      newestEntry,
      topServices
    };
  }

  /**
   * Clear entire cache
   */
  async clearCache(): Promise<void> {
    console.log('🧹 [CACHE] Clearing entire cache...');

    // Remove all cached files
    for (const entry of this.cacheIndex.values()) {
      try {
        await fs.unlink(entry.outputPath);
      } catch (error) {
        console.warn(`⚠️ [CACHE] Failed to remove cached file: ${entry.outputPath}`);
      }
    }

    // Clear index
    this.cacheIndex.clear();
    await this.updateCacheIndex();

    // Reset stats
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    console.log('✅ [CACHE] Cache cleared successfully');
  }

  /**
   * Cleanup and dispose
   */
  async dispose(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    await this.updateCacheIndex();
    console.log('💾 [CACHE] Disposed successfully');
  }
}

// Singleton instance
export const conversionCache = new ConversionCacheService();
export default ConversionCacheService;