/**
 * Usage Tracking Service - pdflab.pro
 * CRITICAL FIX: Atomic usage tracking to prevent race conditions
 * Prevents revenue loss from unlimited free tier abuse
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger';

interface UsageResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  resetDate: Date;
  timeUntilReset: number;
}

interface UserPlan {
  planId: string;
  conversionsLimit: number;
  isUnlimited: boolean;
}

export class UsageTrackingService {
  private redis: Redis;
  private lockTimeout = 5000; // 5 seconds
  private lockRetryDelay = 100; // 100ms
  private maxRetryAttempts = 10;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
    });
  }

  /**
   * CRITICAL FIX: Atomic usage increment with distributed locking
   * Prevents race condition that allowed unlimited free tier usage
   */
  async incrementUsageAtomic(userId: string, userPlan: UserPlan): Promise<UsageResult> {
    const lockKey = `usage_lock:${userId}`;
    const usageKey = `usage:${userId}`;
    const lockValue = `${Date.now()}_${Math.random()}`;

    let attempt = 0;

    while (attempt < this.maxRetryAttempts) {
      try {
        // Acquire distributed lock with timeout
        const lockAcquired = await this.redis.set(
          lockKey,
          lockValue,
          'PX',
          this.lockTimeout,
          'NX'
        );

        if (!lockAcquired) {
          // Lock not acquired, wait and retry
          await this.sleep(this.lockRetryDelay * (attempt + 1));
          attempt++;
          continue;
        }

        try {
          // Inside the lock - perform atomic operations
          const result = await this.performAtomicUsageCheck(userId, userPlan);

          if (result.allowed) {
            // Increment usage atomically
            await this.incrementUsageCounter(userId);
            result.currentUsage += 1;

            // Log successful usage increment
            logger.info('Usage incremented atomically', {
              userId,
              currentUsage: result.currentUsage,
              limit: result.limit,
              planId: userPlan.planId
            });
          } else {
            // Log usage limit reached
            logger.warn('Usage limit reached', {
              userId,
              currentUsage: result.currentUsage,
              limit: result.limit,
              planId: userPlan.planId
            });
          }

          return result;

        } finally {
          // Always release the lock
          await this.releaseLock(lockKey, lockValue);
        }

      } catch (error) {
        logger.error('Error in atomic usage increment', {
          userId,
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Release lock on error
        await this.releaseLock(lockKey, lockValue);

        if (attempt === this.maxRetryAttempts - 1) {
          throw new Error('Failed to acquire usage tracking lock after maximum attempts');
        }

        attempt++;
        await this.sleep(this.lockRetryDelay * (attempt + 1));
      }
    }

    throw new Error('Failed to process usage tracking after maximum attempts');
  }

  /**
   * Perform atomic usage check within distributed lock
   */
  private async performAtomicUsageCheck(userId: string, userPlan: UserPlan): Promise<UsageResult> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageKey = `usage:${userId}:${currentMonth}`;

    // Get current usage atomically
    const currentUsage = await this.getCurrentUsageAtomic(usageKey);

    // Calculate reset date (first day of next month)
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const timeUntilReset = resetDate.getTime() - now.getTime();

    // Check if usage is allowed
    const isUnlimited = userPlan.isUnlimited || userPlan.conversionsLimit === -1;
    const allowed = isUnlimited || currentUsage < userPlan.conversionsLimit;

    return {
      allowed,
      currentUsage,
      limit: userPlan.conversionsLimit,
      resetDate,
      timeUntilReset
    };
  }

  /**
   * Get current usage with atomic read
   */
  private async getCurrentUsageAtomic(usageKey: string): Promise<number> {
    const usage = await this.redis.get(usageKey);
    return usage ? parseInt(usage, 10) : 0;
  }

  /**
   * Increment usage counter atomically
   */
  private async incrementUsageCounter(userId: string): Promise<number> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageKey = `usage:${userId}:${currentMonth}`;

    // Atomic increment with expiration
    const pipeline = this.redis.pipeline();
    pipeline.incr(usageKey);
    pipeline.expire(usageKey, 60 * 60 * 24 * 32); // 32 days expiration

    const results = await pipeline.exec();
    return results?.[0]?.[1] as number || 1;
  }

  /**
   * Release distributed lock safely
   */
  private async releaseLock(lockKey: string, lockValue: string): Promise<void> {
    try {
      // Use Lua script to ensure we only release our own lock
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      await this.redis.eval(luaScript, 1, lockKey, lockValue);
    } catch (error) {
      logger.error('Error releasing lock', {
        lockKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user usage without incrementing
   */
  async getUserUsage(userId: string, userPlan: UserPlan): Promise<UsageResult> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageKey = `usage:${userId}:${currentMonth}`;

    const currentUsage = await this.getCurrentUsageAtomic(usageKey);
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const timeUntilReset = resetDate.getTime() - now.getTime();

    const isUnlimited = userPlan.isUnlimited || userPlan.conversionsLimit === -1;
    const allowed = isUnlimited || currentUsage < userPlan.conversionsLimit;

    return {
      allowed,
      currentUsage,
      limit: userPlan.conversionsLimit,
      resetDate,
      timeUntilReset
    };
  }

  /**
   * Reset usage for a specific user (admin function)
   */
  async resetUserUsage(userId: string): Promise<void> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageKey = `usage:${userId}:${currentMonth}`;

    await this.redis.del(usageKey);

    logger.info('User usage reset', { userId });
  }

  /**
   * Reset usage for all users (monthly cron job)
   */
  async resetAllUsageForNewMonth(): Promise<void> {
    const pattern = 'usage:*';
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
      logger.info('All user usage reset for new month', { keysDeleted: keys.length });
    }
  }

  /**
   * Get usage statistics for monitoring
   */
  async getUsageStatistics(): Promise<{
    totalActiveUsers: number;
    averageUsage: number;
    usersAtLimit: number;
  }> {
    const pattern = 'usage:*';
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) {
      return {
        totalActiveUsers: 0,
        averageUsage: 0,
        usersAtLimit: 0
      };
    }

    const usageValues = await this.redis.mget(...keys);
    const usages = usageValues
      .filter(val => val !== null)
      .map(val => parseInt(val!, 10))
      .filter(val => !isNaN(val));

    const totalActiveUsers = usages.length;
    const averageUsage = usages.reduce((sum, usage) => sum + usage, 0) / totalActiveUsers;

    // Note: Can't determine usersAtLimit without plan information
    // This would need to be calculated elsewhere with user plan data

    return {
      totalActiveUsers,
      averageUsage: Math.round(averageUsage * 100) / 100,
      usersAtLimit: 0 // Would need additional logic with plan data
    };
  }

  /**
   * Check if user can perform action without incrementing
   */
  async canUserPerformAction(userId: string, userPlan: UserPlan): Promise<boolean> {
    const usage = await this.getUserUsage(userId, userPlan);
    return usage.allowed;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for usage tracking service
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      await this.redis.ping();

      const stats = await this.getUsageStatistics();

      return {
        status: 'healthy',
        details: {
          redisConnected: true,
          ...stats
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Cleanup expired usage keys (maintenance function)
   */
  async cleanupExpiredUsage(): Promise<number> {
    const pattern = 'usage:*';
    const keys = await this.redis.keys(pattern);
    let deletedCount = 0;

    for (const key of keys) {
      const ttl = await this.redis.ttl(key);

      // If key has no expiration (-1) or is expired (-2), clean it up
      if (ttl === -1 || ttl === -2) {
        await this.redis.del(key);
        deletedCount++;
      }
    }

    logger.info('Cleanup expired usage keys', { deletedCount });
    return deletedCount;
  }
}

export default new UsageTrackingService();