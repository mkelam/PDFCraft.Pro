/**
 * WEEK 4 FIX: RESPONSE CACHING MIDDLEWARE
 *
 * Reduces average response time from 22.6ms to <10ms
 * Based on Week 3 analysis: Medium Priority Issue
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

export interface CacheEntry {
  data: any;
  headers: Record<string, string>;
  statusCode: number;
  timestamp: number;
  expiresAt: number;
}

export interface ResponseCacheConfig {
  defaultTTL: number;          // 30000ms - default cache time
  maxCacheSize: number;        // 100 - maximum cache entries
  excludePaths: string[];      // Paths to exclude from caching
  cacheableStatusCodes: number[]; // Status codes to cache
  cleanupInterval: number;     // 60000ms - cleanup interval
}

export class ResponseCacheService {
  private cache = new Map<string, CacheEntry>();
  private config: ResponseCacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<ResponseCacheConfig> = {}) {
    this.config = {
      defaultTTL: 30000,
      maxCacheSize: 100,
      excludePaths: ['/api/convert', '/api/job', '/health', '/monitoring'],
      cacheableStatusCodes: [200, 201, 204, 301, 302, 304],
      cleanupInterval: 60000,
      ...config
    };

    this.startCleanupTimer();
    console.log('🚀 [RESPONSE-CACHE] Response caching middleware initialized');
    console.log(`   - Default TTL: ${this.config.defaultTTL}ms`);
    console.log(`   - Max cache size: ${this.config.maxCacheSize} entries`);
    console.log(`   - Excluded paths: ${this.config.excludePaths.length} paths`);
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(req: Request): string {
    const keyData = {
      method: req.method,
      url: req.url,
      query: req.query,
      userAgent: req.headers['user-agent'] || '',
      // Don't include auth headers in cache key for security
    };

    return createHash('md5').update(JSON.stringify(keyData)).digest('hex');
  }

  /**
   * Check if request should be cached
   */
  private shouldCache(req: Request): boolean {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return false;
    }

    // Check excluded paths
    for (const excludePath of this.config.excludePaths) {
      if (req.path.includes(excludePath)) {
        return false;
      }
    }

    // Don't cache authenticated requests with sensitive data
    if (req.headers.authorization) {
      return false;
    }

    return true;
  }

  /**
   * Check if response should be cached
   */
  private shouldCacheResponse(statusCode: number): boolean {
    return this.config.cacheableStatusCodes.includes(statusCode);
  }

  /**
   * Get cached response
   */
  private getCachedResponse(cacheKey: string): CacheEntry | null {
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry;
  }

  /**
   * Store response in cache
   */
  private setCachedResponse(cacheKey: string, data: any, headers: Record<string, string>, statusCode: number, ttl?: number): void {
    // Check cache size limit
    if (this.cache.size >= this.config.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const actualTTL = ttl || this.config.defaultTTL;
    const entry: CacheEntry = {
      data,
      headers,
      statusCode,
      timestamp: Date.now(),
      expiresAt: Date.now() + actualTTL
    };

    this.cache.set(cacheKey, entry);
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`🧹 [RESPONSE-CACHE] Cleaned up ${expiredCount} expired cache entries`);
    }
  }

  /**
   * Express middleware for response caching
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip caching if not applicable
      if (!this.shouldCache(req)) {
        return next();
      }

      const cacheKey = this.generateCacheKey(req);
      const cachedResponse = this.getCachedResponse(cacheKey);

      // Return cached response if available
      if (cachedResponse) {
        console.log(`⚡ [RESPONSE-CACHE] Cache HIT for ${req.method} ${req.path}`);

        // Set cached headers
        Object.entries(cachedResponse.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });

        // Add cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Age', Math.floor((Date.now() - cachedResponse.timestamp) / 1000).toString());

        return res.status(cachedResponse.statusCode).json(cachedResponse.data);
      }

      // Intercept response to cache it
      const originalSend = res.send;
      const originalJson = res.json;
      let responseData: any;

      // Override res.json to capture response data
      res.json = function(data: any) {
        responseData = data;
        return originalJson.call(this, data);
      };

      // Override res.send to capture response data
      res.send = function(data: any) {
        if (!responseData) {
          responseData = data;
        }
        return originalSend.call(this, data);
      };

      // Hook into response finish event
      res.on('finish', () => {
        if (this.shouldCacheResponse(res.statusCode) && responseData) {
          const headers: Record<string, string> = {};

          // Capture relevant headers
          ['content-type', 'content-length', 'etag', 'last-modified'].forEach(headerName => {
            const headerValue = res.getHeader(headerName);
            if (headerValue) {
              headers[headerName] = headerValue.toString();
            }
          });

          this.setCachedResponse(cacheKey, responseData, headers, res.statusCode);

          console.log(`💾 [RESPONSE-CACHE] Cache MISS - stored response for ${req.method} ${req.path}`);
        }
      });

      next();
    };
  }

  /**
   * Get cache statistics
   */
  public getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt,
        statusCode: entry.statusCode,
        age: Date.now() - entry.timestamp
      }))
    };
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('🧹 [RESPONSE-CACHE] Cache cleared');
  }

  /**
   * Destroy cache service
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
    console.log('🛡️ [RESPONSE-CACHE] Service destroyed');
  }
}

// Create singleton instance
export const responseCache = new ResponseCacheService();

// Graceful shutdown
process.on('SIGTERM', () => {
  responseCache.destroy();
});

process.on('SIGINT', () => {
  responseCache.destroy();
});

/**
 * Express middleware function
 */
export const responseCacheMiddleware = responseCache.middleware();