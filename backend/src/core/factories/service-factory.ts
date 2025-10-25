/**
 * Service Factory Pattern Implementation
 * Creates and configures services based on environment and requirements
 */

import { DIContainer, ServiceToken, ServiceProvider } from '../di/container';
import { Injectable, Service } from '../di/decorators';
import { CacheManager } from '../cache/cache-manager';
import { PerformanceMonitor } from '../monitoring/performance-monitor';

// Service configuration interface
export interface ServiceConfig {
  type: string;
  options?: Record<string, any>;
  dependencies?: string[];
  singleton?: boolean;
  lazy?: boolean;
}

// Abstract factory interface
export interface IServiceFactory<T> {
  create(config?: ServiceConfig): T | Promise<T>;
  createMany(configs: ServiceConfig[]): (T | Promise<T>)[];
}

/**
 * Base Service Factory
 */
@Injectable()
export abstract class BaseServiceFactory<T> implements IServiceFactory<T> {
  constructor(protected container: DIContainer) {}

  abstract create(config?: ServiceConfig): T | Promise<T>;

  createMany(configs: ServiceConfig[]): (T | Promise<T>)[] {
    return configs.map(config => this.create(config));
  }

  protected resolveDependencies(dependencies?: string[]): any[] {
    if (!dependencies) return [];

    return dependencies.map(dep => {
      const token = new ServiceToken(dep);
      return this.container.get(token);
    });
  }
}

/**
 * PDF Service Factory
 */
@Service({ name: 'PDFServiceFactory' })
export class PDFServiceFactory extends BaseServiceFactory<any> {
  private serviceMap = new Map<string, any>();

  constructor(container: DIContainer) {
    super(container);
    this.registerServices();
  }

  private registerServices(): void {
    // Register different PDF service implementations
    // These would be actual service classes in your application
    this.serviceMap.set('cloudconvert', 'CloudConvertPDFService');
    this.serviceMap.set('libreoffice', 'LibreOfficePDFService');
    this.serviceMap.set('puppeteer', 'PuppeteerPDFService');
    this.serviceMap.set('enhanced', 'EnhancedPDFService');
    this.serviceMap.set('fallback', 'FallbackPDFService');
  }

  create(config?: ServiceConfig): any {
    const type = config?.type || 'fallback';
    const ServiceClass = this.serviceMap.get(type);

    if (!ServiceClass) {
      throw new Error(`Unknown PDF service type: ${type}`);
    }

    // In a real implementation, you would instantiate the actual class
    // For now, we'll return a mock object
    return {
      type,
      convertPDFToPPT: async (input: string, output: string) => {
        console.log(`Converting ${input} to PPT using ${type} service`);
        return { success: true, output };
      },
      convertPDFToWord: async (input: string, output: string) => {
        console.log(`Converting ${input} to Word using ${type} service`);
        return { success: true, output };
      },
      convertPDFToExcel: async (input: string, output: string) => {
        console.log(`Converting ${input} to Excel using ${type} service`);
        return { success: true, output };
      }
    };
  }

  /**
   * Create service with automatic fallback chain
   */
  createWithFallback(primaryType: string, fallbackTypes: string[]): any {
    const services = [primaryType, ...fallbackTypes].map(type =>
      this.create({ type })
    );

    return {
      async convert(input: string, output: string, format: string): Promise<any> {
        for (const service of services) {
          try {
            const result = await service[`convertPDFTo${format}`](input, output);
            if (result.success) {
              return result;
            }
          } catch (error) {
            console.error(`Service ${service.type} failed:`, error);
          }
        }
        throw new Error('All services failed');
      }
    };
  }
}

/**
 * Cache Service Factory
 */
@Service({ name: 'CacheServiceFactory' })
export class CacheServiceFactory extends BaseServiceFactory<CacheManager> {
  create(config?: ServiceConfig): CacheManager {
    const cacheConfig = {
      redis: config?.options?.redis,
      memory: config?.options?.memory || {
        max: 1000,
        ttl: 3600000
      },
      defaults: config?.options?.defaults || {
        ttl: 3600
      }
    };

    return new CacheManager(cacheConfig);
  }

  /**
   * Create specialized cache instances
   */
  createSessionCache(): CacheManager {
    return this.create({
      type: 'session',
      options: {
        memory: { max: 10000, ttl: 86400000 }, // 24 hours
        defaults: { ttl: 86400 }
      }
    });
  }

  createAPICache(): CacheManager {
    return this.create({
      type: 'api',
      options: {
        memory: { max: 5000, ttl: 300000 }, // 5 minutes
        defaults: { ttl: 300 }
      }
    });
  }

  createFileCache(): CacheManager {
    return this.create({
      type: 'file',
      options: {
        memory: { max: 100, ttl: 3600000 }, // 1 hour
        defaults: { ttl: 3600 }
      }
    });
  }
}

/**
 * Database Service Factory
 */
@Service({ name: 'DatabaseServiceFactory' })
export class DatabaseServiceFactory extends BaseServiceFactory<any> {
  create(config?: ServiceConfig): any {
    const type = config?.type || 'sqlite';

    switch (type) {
      case 'mysql':
        return this.createMySQLConnection(config?.options);
      case 'postgres':
        return this.createPostgreSQLConnection(config?.options);
      case 'mongodb':
        return this.createMongoDBConnection(config?.options);
      case 'sqlite':
      default:
        return this.createSQLiteConnection(config?.options);
    }
  }

  private createMySQLConnection(options?: any): any {
    // Mock implementation
    return {
      type: 'mysql',
      query: async (sql: string, params?: any[]) => {
        console.log(`MySQL Query: ${sql}`);
        return [];
      }
    };
  }

  private createPostgreSQLConnection(options?: any): any {
    // Mock implementation
    return {
      type: 'postgres',
      query: async (sql: string, params?: any[]) => {
        console.log(`PostgreSQL Query: ${sql}`);
        return [];
      }
    };
  }

  private createMongoDBConnection(options?: any): any {
    // Mock implementation
    return {
      type: 'mongodb',
      find: async (collection: string, query: any) => {
        console.log(`MongoDB Find: ${collection}`, query);
        return [];
      }
    };
  }

  private createSQLiteConnection(options?: any): any {
    // Mock implementation
    return {
      type: 'sqlite',
      query: async (sql: string, params?: any[]) => {
        console.log(`SQLite Query: ${sql}`);
        return [];
      }
    };
  }
}

/**
 * Queue Service Factory
 */
@Service({ name: 'QueueServiceFactory' })
export class QueueServiceFactory extends BaseServiceFactory<any> {
  create(config?: ServiceConfig): any {
    const type = config?.type || 'memory';

    switch (type) {
      case 'redis':
        return this.createRedisQueue(config?.options);
      case 'rabbitmq':
        return this.createRabbitMQQueue(config?.options);
      case 'sqs':
        return this.createSQSQueue(config?.options);
      case 'memory':
      default:
        return this.createMemoryQueue(config?.options);
    }
  }

  private createRedisQueue(options?: any): any {
    return {
      type: 'redis',
      add: async (job: any) => {
        console.log('Adding job to Redis queue:', job);
        return { id: Math.random().toString(36) };
      },
      process: async (handler: any) => {
        console.log('Processing Redis queue');
      }
    };
  }

  private createRabbitMQQueue(options?: any): any {
    return {
      type: 'rabbitmq',
      publish: async (message: any) => {
        console.log('Publishing to RabbitMQ:', message);
      },
      consume: async (handler: any) => {
        console.log('Consuming from RabbitMQ');
      }
    };
  }

  private createSQSQueue(options?: any): any {
    return {
      type: 'sqs',
      sendMessage: async (message: any) => {
        console.log('Sending to SQS:', message);
      },
      receiveMessages: async () => {
        console.log('Receiving from SQS');
        return [];
      }
    };
  }

  private createMemoryQueue(options?: any): any {
    const queue: any[] = [];

    return {
      type: 'memory',
      add: async (job: any) => {
        queue.push(job);
        return { id: Math.random().toString(36) };
      },
      process: async (handler: any) => {
        while (queue.length > 0) {
          const job = queue.shift();
          await handler(job);
        }
      },
      size: () => queue.length
    };
  }
}

/**
 * Monitoring Service Factory
 */
@Service({ name: 'MonitoringServiceFactory' })
export class MonitoringServiceFactory extends BaseServiceFactory<PerformanceMonitor> {
  create(config?: ServiceConfig): PerformanceMonitor {
    const monitorConfig = {
      collectionInterval: config?.options?.collectionInterval || 10000,
      retentionPeriod: config?.options?.retentionPeriod || 3600000,
      enableAutoCollection: config?.options?.enableAutoCollection !== false,
      enableAlerts: config?.options?.enableAlerts !== false
    };

    const monitor = new PerformanceMonitor(monitorConfig);

    // Add default alert rules if specified
    if (config?.options?.alerts) {
      config.options.alerts.forEach((alert: any) => {
        monitor.addAlertRule(alert);
      });
    }

    return monitor;
  }

  /**
   * Create specialized monitors
   */
  createAPIMonitor(): PerformanceMonitor {
    return this.create({
      type: 'api',
      options: {
        collectionInterval: 5000,
        alerts: [
          {
            name: 'high_response_time',
            metric: 'response_time',
            condition: 'above',
            threshold: 1000
          },
          {
            name: 'high_error_rate',
            metric: 'error_rate',
            condition: 'above',
            threshold: 0.05
          }
        ]
      }
    });
  }

  createSystemMonitor(): PerformanceMonitor {
    return this.create({
      type: 'system',
      options: {
        collectionInterval: 30000,
        alerts: [
          {
            name: 'high_memory',
            metric: 'memory.usage',
            condition: 'above',
            threshold: 0.9
          },
          {
            name: 'high_cpu',
            metric: 'cpu.usage',
            condition: 'above',
            threshold: 0.8
          }
        ]
      }
    });
  }
}

/**
 * Abstract Factory for creating related services
 */
@Injectable()
export class AbstractServiceFactory {
  constructor(
    private pdfFactory: PDFServiceFactory,
    private cacheFactory: CacheServiceFactory,
    private dbFactory: DatabaseServiceFactory,
    private queueFactory: QueueServiceFactory,
    private monitorFactory: MonitoringServiceFactory
  ) {}

  /**
   * Create a complete service suite for a specific environment
   */
  createServiceSuite(environment: 'development' | 'staging' | 'production'): {
    pdf: any;
    cache: CacheManager;
    database: any;
    queue: any;
    monitor: PerformanceMonitor;
  } {
    switch (environment) {
      case 'production':
        return {
          pdf: this.pdfFactory.createWithFallback('cloudconvert', ['enhanced', 'fallback']),
          cache: this.cacheFactory.create({
            type: 'production',
            options: {
              redis: { host: 'redis-prod', port: 6379 },
              memory: { max: 10000, ttl: 3600000 }
            }
          }),
          database: this.dbFactory.create({
            type: 'mysql',
            options: { host: 'mysql-prod', database: 'pdfcraft' }
          }),
          queue: this.queueFactory.create({
            type: 'redis',
            options: { host: 'redis-prod', port: 6379 }
          }),
          monitor: this.monitorFactory.create({
            type: 'production',
            options: {
              collectionInterval: 5000,
              enableAlerts: true
            }
          })
        };

      case 'staging':
        return {
          pdf: this.pdfFactory.createWithFallback('enhanced', ['fallback']),
          cache: this.cacheFactory.create({
            type: 'staging',
            options: {
              memory: { max: 5000, ttl: 1800000 }
            }
          }),
          database: this.dbFactory.create({
            type: 'mysql',
            options: { host: 'mysql-staging', database: 'pdfcraft_staging' }
          }),
          queue: this.queueFactory.create({
            type: 'memory'
          }),
          monitor: this.monitorFactory.create({
            type: 'staging',
            options: {
              collectionInterval: 10000,
              enableAlerts: true
            }
          })
        };

      case 'development':
      default:
        return {
          pdf: this.pdfFactory.create({ type: 'fallback' }),
          cache: this.cacheFactory.create({
            type: 'development',
            options: {
              memory: { max: 1000, ttl: 600000 }
            }
          }),
          database: this.dbFactory.create({
            type: 'sqlite',
            options: { filename: './dev.db' }
          }),
          queue: this.queueFactory.create({
            type: 'memory'
          }),
          monitor: this.monitorFactory.create({
            type: 'development',
            options: {
              collectionInterval: 30000,
              enableAlerts: false
            }
          })
        };
    }
  }
}

/**
 * Service Provider for registering all factories
 */
export class FactoryServiceProvider implements ServiceProvider {
  register(container: DIContainer): void {
    // Register all factory services
    container.register(
      new ServiceToken('PDFServiceFactory'),
      PDFServiceFactory,
      { scope: 'singleton' }
    );

    container.register(
      new ServiceToken('CacheServiceFactory'),
      CacheServiceFactory,
      { scope: 'singleton' }
    );

    container.register(
      new ServiceToken('DatabaseServiceFactory'),
      DatabaseServiceFactory,
      { scope: 'singleton' }
    );

    container.register(
      new ServiceToken('QueueServiceFactory'),
      QueueServiceFactory,
      { scope: 'singleton' }
    );

    container.register(
      new ServiceToken('MonitoringServiceFactory'),
      MonitoringServiceFactory,
      { scope: 'singleton' }
    );

    container.register(
      new ServiceToken('AbstractServiceFactory'),
      AbstractServiceFactory,
      { scope: 'singleton' }
    );
  }
}