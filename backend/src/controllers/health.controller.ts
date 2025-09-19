import { Request, Response } from 'express';
import { getConnection, getSQLite } from '../config/database';
import { conversionQueue } from '../config/redis';
import { logger } from '../utils/logger';
import os from 'os';
import { promises as fs } from 'fs';

export class HealthController {
  static async getHealth(req: Request, res: Response): Promise<void> {
    const checks: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg(),
      },
      services: {
        database: 'unknown',
        redis: 'unknown',
        queue: 'unknown',
        storage: 'unknown',
      },
    };

    // Check database connection
    try {
      if (process.env.NODE_ENV === 'production') {
        const connection = getConnection();
        await connection.execute('SELECT 1');
        checks.services.database = 'healthy';
      } else {
        const db = getSQLite();
        db.prepare('SELECT 1').get();
        checks.services.database = 'healthy';
      }
    } catch (error) {
      checks.services.database = 'unhealthy';
      checks.status = 'degraded';
      logger.error('Database health check failed:', error);
    }

    // Check Redis/Queue connection
    try {
      if (conversionQueue) {
        // Type-safe queue status check
        const queueStats = await (async () => {
          if ('waiting' in conversionQueue && typeof conversionQueue.waiting === 'function') {
            // Real Bull queue
            const waiting = await conversionQueue.waiting();
            const active = await conversionQueue.active();
            const completed = await conversionQueue.completed();
            const failed = await conversionQueue.failed();
            return {
              waiting: waiting.length,
              active: active.length,
              completed: completed.length,
              failed: failed.length,
            };
          } else {
            // Mock queue - return default stats
            return {
              waiting: 0,
              active: 0,
              completed: 0,
              failed: 0,
            };
          }
        })();

        checks.services.redis = 'healthy';
        checks.services.queue = 'healthy';
        checks.queue = queueStats;
      } else {
        checks.services.redis = 'degraded';
        checks.services.queue = 'degraded';
        checks.status = 'degraded';
      }
    } catch (error) {
      checks.services.redis = 'unhealthy';
      checks.services.queue = 'unhealthy';
      checks.status = 'degraded';
      logger.error('Redis/Queue health check failed:', error);
    }

    // Check storage access
    try {
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const tempDir = process.env.TEMP_DIR || './temp';

      await fs.access(uploadDir);
      await fs.access(tempDir);

      const uploadStats = await fs.stat(uploadDir);
      const tempStats = await fs.stat(tempDir);

      checks.services.storage = 'healthy';
      checks.storage = {
        uploadDir: {
          path: uploadDir,
          accessible: true,
          lastModified: uploadStats.mtime,
        },
        tempDir: {
          path: tempDir,
          accessible: true,
          lastModified: tempStats.mtime,
        },
      };
    } catch (error) {
      checks.services.storage = 'unhealthy';
      checks.status = 'degraded';
      logger.error('Storage health check failed:', error);
    }

    // Check LibreOffice availability (production only)
    if (process.env.NODE_ENV === 'production') {
      try {
        const { execSync } = require('child_process');
        execSync('libreoffice --version', { timeout: 5000 });
        checks.services.libreoffice = 'healthy';
      } catch (error) {
        checks.services.libreoffice = 'unhealthy';
        checks.status = 'degraded';
        logger.error('LibreOffice health check failed:', error);
      }
    }

    // Determine overall status
    const httpStatus = checks.status === 'healthy' ? 200 :
                      checks.status === 'degraded' ? 200 : 503;

    res.status(httpStatus).json({
      success: checks.status !== 'unhealthy',
      ...checks,
    });
  }

  // Simple health check for load balancer
  static async getSimpleHealth(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  }

  // Readiness probe for Kubernetes
  static async getReadiness(req: Request, res: Response): Promise<void> {
    try {
      // Check critical services only
      if (process.env.NODE_ENV === 'production') {
        const connection = getConnection();
        await connection.execute('SELECT 1');
      } else {
        const db = getSQLite();
        db.prepare('SELECT 1').get();
      }

      res.json({
        success: true,
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Readiness check failed:', error);
      res.status(503).json({
        success: false,
        status: 'not-ready',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Liveness probe for Kubernetes
  static async getLiveness(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
}