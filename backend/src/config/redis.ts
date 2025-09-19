import Redis from 'ioredis';
import Queue from 'bull';
import { RedisConfig } from '../types';
import { MockRedis, MockQueue } from './mock-redis';

let redisClient: Redis | MockRedis;
export let conversionQueue: Queue.Queue | MockQueue;

const isProduction = process.env.NODE_ENV === 'production';

export const connectRedis = (config?: RedisConfig): void => {
  try {
    if (isProduction && config) {
      // Use real Redis in production
      const redisOptions: any = {
        host: config.host,
        port: config.port,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      };

      if (config.password) {
        redisOptions.password = config.password;
      }

      redisClient = new Redis(redisOptions);

      redisClient.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      redisClient.on('error', (err) => {
        console.error('❌ Redis connection error:', err);
      });

      // Create Bull queue for job processing
      const queueRedisOptions: any = {
        host: config.host,
        port: config.port,
      };

      if (config.password) {
        queueRedisOptions.password = config.password;
      }

      conversionQueue = new Queue('pdf conversion', {
        redis: queueRedisOptions,
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 20,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      console.log('✅ Bull queue initialized');
    } else {
      // Use mock Redis for local development
      redisClient = new MockRedis();

      redisClient.on('connect', () => {
        console.log('✅ Mock Redis connected successfully (local development)');
      });

      // Create mock queue for local development
      conversionQueue = new MockQueue('pdf conversion', {
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 20,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      console.log('✅ Mock Bull queue initialized (local development)');
    }
  } catch (error) {
    console.error('❌ Redis initialization failed:', error);
    throw error;
  }
};

export const getRedisClient = (): Redis | MockRedis => {
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