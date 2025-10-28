import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '../utils/logger';

// Helper function for error message extraction
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export interface PuppeteerInstance {
  browser: Browser;
  page: Page;
  inUse: boolean;
  lastUsed: number;
}

export class PuppeteerPoolService {
  private static instance: PuppeteerPoolService;
  private pool: PuppeteerInstance[] = [];
  private readonly maxInstances = 2; // Limit to 2 concurrent browsers
  private readonly idleTimeout = 300000; // 5 minutes idle timeout
  private cleanupInterval?: NodeJS.Timeout;

  private constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleInstances();
    }, 60000); // Check every minute
  }

  static getInstance(): PuppeteerPoolService {
    if (!PuppeteerPoolService.instance) {
      PuppeteerPoolService.instance = new PuppeteerPoolService();
    }
    return PuppeteerPoolService.instance;
  }

  async acquireInstance(): Promise<PuppeteerInstance> {
    try {
      // Look for available instance
      const available = this.pool.find(instance => !instance.inUse);

      if (available) {
        available.inUse = true;
        available.lastUsed = Date.now();
        logger.info('Reusing existing Puppeteer instance');
        return available;
      }

      // Create new instance if under limit
      if (this.pool.length < this.maxInstances) {
        const instance = await this.createInstance();
        this.pool.push(instance);
        logger.info(`Created new Puppeteer instance (${this.pool.length}/${this.maxInstances})`);
        return instance;
      }

      // Wait for an instance to become available
      logger.info('Waiting for Puppeteer instance to become available...');
      return await this.waitForAvailableInstance();

    } catch (error) {
      logger.error('Failed to acquire Puppeteer instance', { error: getErrorMessage(error) });
      throw error;
    }
  }

  async releaseInstance(instance: PuppeteerInstance): Promise<void> {
    try {
      instance.inUse = false;
      instance.lastUsed = Date.now();

      // Clear any existing content
      await instance.page.goto('about:blank');

      logger.info('Released Puppeteer instance back to pool');
    } catch (error) {
      logger.warn('Error releasing Puppeteer instance', { error: getErrorMessage(error) });
      // Remove problematic instance from pool
      this.removeInstance(instance);
    }
  }

  private async createInstance(): Promise<PuppeteerInstance> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // Important for Windows stability
        '--disable-extensions'
      ]
    });

    const page = await browser.newPage();

    // Optimize page for PDF processing
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setDefaultTimeout(30000);

    return {
      browser,
      page,
      inUse: true,
      lastUsed: Date.now()
    };
  }

  private async waitForAvailableInstance(): Promise<PuppeteerInstance> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const available = this.pool.find(instance => !instance.inUse);

        if (available) {
          clearInterval(checkInterval);
          available.inUse = true;
          available.lastUsed = Date.now();
          resolve(available);
        }
      }, 1000); // Check every second

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout waiting for Puppeteer instance'));
      }, 30000);
    });
  }

  private removeInstance(instance: PuppeteerInstance): void {
    const index = this.pool.indexOf(instance);
    if (index > -1) {
      this.pool.splice(index, 1);

      // Clean up browser
      instance.browser.close().catch(error => {
        logger.warn('Error closing browser during cleanup', { error: getErrorMessage(error) });
      });

      logger.info(`Removed Puppeteer instance from pool (${this.pool.length}/${this.maxInstances})`);
    }
  }

  private async cleanupIdleInstances(): Promise<void> {
    const now = Date.now();
    const idleInstances = this.pool.filter(
      instance => !instance.inUse && (now - instance.lastUsed) > this.idleTimeout
    );

    for (const instance of idleInstances) {
      logger.info('Cleaning up idle Puppeteer instance');
      this.removeInstance(instance);
    }
  }

  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all instances
    const closePromises = this.pool.map(instance =>
      instance.browser.close().catch(error => {
        logger.warn('Error closing browser during shutdown', { error: getErrorMessage(error) });
      })
    );

    await Promise.all(closePromises);
    this.pool = [];

    logger.info('Puppeteer pool shutdown complete');
  }

  getStats(): { total: number; inUse: number; available: number } {
    const inUse = this.pool.filter(instance => instance.inUse).length;
    return {
      total: this.pool.length,
      inUse,
      available: this.pool.length - inUse
    };
  }
}

export default PuppeteerPoolService.getInstance();