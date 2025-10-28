/**
 * Advanced Cache Manager
 * Implements multi-tier caching with Redis and in-memory cache
 * Features: TTL management, cache warming, invalidation strategies
 */

import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { Injectable, Service } from '../di/decorators';
import { ServiceToken } from '../di/container';

// Cache configuration types
export interface CacheConfig {
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };
  memory?: {
    max: number;
    ttl: number;
    updateAgeOnGet?: boolean;
    checkPeriod?: number;
  };
  defaults?: {
    ttl: number;
    compress?: boolean;
    serialize?: 'json' | 'msgpack' | 'custom';
  };
}

// Cache entry metadata
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl?: number;
  createdAt: number;
  accessedAt: number;
  hits: number;
  size: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

// Cache statistics
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  memoryUsage: number;
  keyCount: number;
  hitRate: number;
  avgResponseTime: number;
}

// Cache storage interface
export interface CacheStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
  ttl(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<boolean>;
  size(): Promise<number>;
}

// In-memory LRU cache implementation
class MemoryCache implements CacheStorage {
  private cache = new Map<string, CacheEntry>();
  private timers = new Map<string, NodeJS.Timeout>();
  private maxSize: number;
  private defaultTTL: number;
  private checkPeriod: number;
  private lastCheck: number = Date.now();

  constructor(config: CacheConfig['memory']) {
    this.maxSize = config?.max || 1000;
    this.defaultTTL = config?.ttl || 3600000; // 1 hour
    this.checkPeriod = config?.checkPeriod || 60000; // 1 minute

    // Start periodic cleanup
    this.startCleanup();
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      await this.delete(key);
      return null;
    }

    // Update access time and hit count
    entry.accessedAt = Date.now();
    entry.hits++;

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const effectiveTTL = ttl || this.defaultTTL;

    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      ttl: effectiveTTL,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      hits: 0,
      size: this.estimateSize(value)
    };

    this.cache.set(key, entry);

    // Set expiration timer
    this.setExpirationTimer(key, effectiveTTL);
  }

  async delete(key: string): Promise<boolean> {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    return this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      await this.delete(key);
      return false;
    }

    return true;
  }

  async clear(): Promise<void> {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
  }

  async keys(pattern?: string): Promise<string[]> {
    const keys: string[] = [];
    const regex = pattern ? new RegExp(pattern.replace('*', '.*')) : null;

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isExpired(entry) && (!regex || regex.test(key))) {
        keys.push(key);
      }
    }

    return keys;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return -1;

    const remaining = (entry.createdAt + (entry.ttl || 0)) - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.ttl = ttl * 1000;
    this.setExpirationTimer(key, ttl * 1000);

    return true;
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() > entry.createdAt + entry.ttl;
  }

  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.delete(firstKey);
    }
  }

  private setExpirationTimer(key: string, ttl: number): void {
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  private estimateSize(value: any): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  }

  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, entry] of this.cache.entries()) {
        if (this.isExpired(entry)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => this.delete(key));
    }, this.checkPeriod);
  }
}

// Redis cache implementation
class RedisCache implements CacheStorage {
  private client: Redis;
  private keyPrefix: string;

  constructor(config: CacheConfig['redis']) {
    this.client = new Redis({
      host: config?.host || 'localhost',
      port: config?.port || 6379,
      password: config?.password,
      db: config?.db || 0
    });

    this.keyPrefix = config?.keyPrefix || 'cache:';
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(this.getKey(key));
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return data as any;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const data = typeof value === 'string' ? value : JSON.stringify(value);

    if (ttl) {
      await this.client.setex(this.getKey(key), ttl, data);
    } else {
      await this.client.set(this.getKey(key), data);
    }
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.client.del(this.getKey(key));
    return result > 0;
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(this.getKey(key));
    return result > 0;
  }

  async clear(): Promise<void> {
    const keys = await this.keys('*');
    if (keys.length > 0) {
      await this.client.del(...keys.map(k => this.getKey(k)));
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    const searchPattern = this.getKey(pattern || '*');
    const keys = await this.client.keys(searchPattern);
    return keys.map(k => k.replace(this.keyPrefix, ''));
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(this.getKey(key));
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    const result = await this.client.expire(this.getKey(key), ttl);
    return result === 1;
  }

  async size(): Promise<number> {
    const keys = await this.keys('*');
    return keys.length;
  }

  disconnect(): void {
    this.client.disconnect();
  }
}

/**
 * Advanced Cache Manager with multi-tier caching
 */
@Service({ name: 'CacheManager' })
export class CacheManager extends EventEmitter {
  private memoryCache: MemoryCache;
  private redisCache?: RedisCache;
  private stats: CacheStats;
  private warmupStrategies = new Map<string, () => Promise<void>>();

  constructor(private config: CacheConfig = {}) {
    super();

    // Initialize memory cache
    this.memoryCache = new MemoryCache(config.memory);

    // Initialize Redis cache if configured
    if (config.redis) {
      this.redisCache = new RedisCache(config.redis);
    }

    // Initialize statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memoryUsage: 0,
      keyCount: 0,
      hitRate: 0,
      avgResponseTime: 0
    };

    // Start statistics collection
    this.startStatsCollection();
  }

  /**
   * Get value from cache (checks memory first, then Redis)
   */
  async get<T>(key: string, options?: {
    skipMemory?: boolean;
    skipRedis?: boolean;
  }): Promise<T | null> {
    const startTime = Date.now();

    // Check memory cache first
    if (!options?.skipMemory) {
      const memoryValue = await this.memoryCache.get<T>(key);
      if (memoryValue !== null) {
        this.recordHit(Date.now() - startTime);
        this.emit('cache:hit', { key, source: 'memory' });
        return memoryValue;
      }
    }

    // Check Redis cache
    if (!options?.skipRedis && this.redisCache) {
      const redisValue = await this.redisCache.get<T>(key);
      if (redisValue !== null) {
        // Populate memory cache
        if (!options?.skipMemory) {
          await this.memoryCache.set(key, redisValue);
        }

        this.recordHit(Date.now() - startTime);
        this.emit('cache:hit', { key, source: 'redis' });
        return redisValue;
      }
    }

    this.recordMiss(Date.now() - startTime);
    this.emit('cache:miss', { key });
    return null;
  }

  /**
   * Set value in cache (sets in both memory and Redis)
   */
  async set<T>(key: string, value: T, options?: {
    ttl?: number;
    skipMemory?: boolean;
    skipRedis?: boolean;
    tags?: string[];
  }): Promise<void> {
    const ttl = options?.ttl || this.config.defaults?.ttl;

    // Set in memory cache
    if (!options?.skipMemory) {
      await this.memoryCache.set(key, value, ttl);
    }

    // Set in Redis cache
    if (!options?.skipRedis && this.redisCache) {
      await this.redisCache.set(key, value, ttl);
    }

    this.stats.sets++;
    this.emit('cache:set', { key, ttl, tags: options?.tags });
  }

  /**
   * Delete value from cache
   */
  async delete(key: string | string[]): Promise<boolean> {
    const keys = Array.isArray(key) ? key : [key];
    let deleted = false;

    for (const k of keys) {
      const memoryDeleted = await this.memoryCache.delete(k);
      const redisDeleted = this.redisCache ? await this.redisCache.delete(k) : false;

      if (memoryDeleted || redisDeleted) {
        deleted = true;
        this.stats.deletes++;
        this.emit('cache:delete', { key: k });
      }
    }

    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      const keys = await this.keys(pattern);
      await this.delete(keys);
    } else {
      await this.memoryCache.clear();
      if (this.redisCache) {
        await this.redisCache.clear();
      }
      this.emit('cache:clear');
    }
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern?: string): Promise<string[]> {
    const memoryKeys = await this.memoryCache.keys(pattern);
    const redisKeys = this.redisCache ? await this.redisCache.keys(pattern) : [];

    return [...new Set([...memoryKeys, ...redisKeys])];
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    // This would require maintaining a tag index
    // For now, it's a placeholder
    this.emit('cache:invalidate', { tags });
  }

  /**
   * Warm up cache with predefined strategies
   */
  async warmup(strategy?: string): Promise<void> {
    const strategies = strategy
      ? [this.warmupStrategies.get(strategy)]
      : Array.from(this.warmupStrategies.values());

    for (const strategyFn of strategies) {
      if (strategyFn) {
        await strategyFn();
      }
    }

    this.emit('cache:warmup', { strategy });
  }

  /**
   * Register cache warmup strategy
   */
  registerWarmupStrategy(name: string, strategy: () => Promise<void>): void {
    this.warmupStrategies.set(name, strategy);
  }

  /**
   * Get or set with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: {
      ttl?: number;
      skipMemory?: boolean;
      skipRedis?: boolean;
    }
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Generate value
    const value = await factory();

    // Store in cache
    await this.set(key, value, options);

    return value;
  }

  /**
   * Memoize a function
   */
  memoize<T extends (...args: any[]) => any>(
    fn: T,
    options?: {
      ttl?: number;
      keyGenerator?: (...args: Parameters<T>) => string;
      skipMemory?: boolean;
      skipRedis?: boolean;
    }
  ): T {
    const self = this;

    return (async function memoized(...args: Parameters<T>): Promise<ReturnType<T>> {
      const key = options?.keyGenerator
        ? options.keyGenerator(...args)
        : `memoize:${fn.name}:${createHash('sha256').update(JSON.stringify(args)).digest('hex')}`;

      return await self.getOrSet(
        key,
        () => fn(...args),
        options
      );
    }) as T;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memoryUsage: 0,
      keyCount: 0,
      hitRate: 0,
      avgResponseTime: 0
    };
  }

  private recordHit(responseTime: number): void {
    this.stats.hits++;
    this.updateAvgResponseTime(responseTime);
  }

  private recordMiss(responseTime: number): void {
    this.stats.misses++;
    this.updateAvgResponseTime(responseTime);
  }

  private updateAvgResponseTime(responseTime: number): void {
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.avgResponseTime =
      (this.stats.avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
  }

  private async startStatsCollection(): Promise<void> {
    setInterval(async () => {
      this.stats.keyCount = await this.memoryCache.size();

      if (this.redisCache) {
        this.stats.keyCount += await this.redisCache.size();
      }
    }, 10000); // Update every 10 seconds
  }

  /**
   * Disconnect cache connections
   */
  disconnect(): void {
    if (this.redisCache) {
      (this.redisCache as any).disconnect();
    }
  }
}

// Export cache manager token for DI
export const CACHE_MANAGER_TOKEN = new ServiceToken<CacheManager>('CacheManager');