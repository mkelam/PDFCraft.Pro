import Redis from 'ioredis';
import Queue from 'bull';
import { RedisConfig } from '@/types';

let redisClient: Redis;
export let conversionQueue: Queue.Queue;

export const connectRedis = (config: RedisConfig): void => {
  try {
    redisClient = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
    });

    // Create Bull queue for job processing
    conversionQueue = new Queue('pdf conversion', {
      redis: {
        host: config.host,
        port: config.port,
        password: config.password,
      },
      defaultJobOptions: {
        removeOnComplete: 50, // Keep last 50 completed jobs
        removeOnFail: 20,     // Keep last 20 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    console.log('✅ Bull queue initialized');
  } catch (error) {
    console.error('❌ Redis initialization failed:', error);
    throw error;
  }
};

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    throw new Error('Redis not connected');
  }
  return redisClient;
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    console.log('Redis connection closed');
  }
  if (conversionQueue) {
    await conversionQueue.close();
    console.log('Bull queue closed');
  }
};