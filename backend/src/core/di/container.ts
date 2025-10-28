/**
 * Advanced Dependency Injection Container
 * Implements IoC (Inversion of Control) pattern for better maintainability
 * Features: Singleton management, lazy loading, circular dependency detection
 */

import 'reflect-metadata';
import { EventEmitter } from 'events';

// Service metadata types
export type ServiceScope = 'singleton' | 'transient' | 'scoped';
export type ServiceFactory<T = any> = (container: DIContainer) => T | Promise<T>;
export type ServiceConstructor<T = any> = new (...args: any[]) => T;

// Metadata keys for decorators
const METADATA_KEYS = {
  INJECTABLE: 'custom:injectable',
  INJECT: 'custom:inject',
  INJECT_ALL: 'custom:inject:all',
  DEPENDENCIES: 'design:paramtypes',
  SERVICE_SCOPE: 'custom:scope',
  SERVICE_TOKEN: 'custom:token',
  LAZY: 'custom:lazy',
  OPTIONAL: 'custom:optional',
  QUALIFIER: 'custom:qualifier'
} as const;

// Service registration interface
export interface ServiceRegistration<T = any> {
  token: ServiceToken<T>;
  factory?: ServiceFactory<T>;
  constructor?: ServiceConstructor<T>;
  instance?: T;
  scope: ServiceScope;
  dependencies?: ServiceToken[];
  metadata?: Map<string, any>;
  lazy?: boolean;
  qualifier?: string;
}

// Service token for type-safe dependency injection
export class ServiceToken<T = any> {
  constructor(
    public readonly name: string,
    public readonly type?: any
  ) {}

  toString(): string {
    return `ServiceToken(${this.name})`;
  }
}

// Service provider interface
export interface ServiceProvider {
  register(container: DIContainer): void;
}

// Scoped container for request-scoped services
export class ScopedContainer {
  private instances = new Map<string, any>();

  constructor(
    private parent: DIContainer,
    public readonly scopeId: string = Math.random().toString(36).substring(7)
  ) {}

  get<T>(token: ServiceToken<T>): T {
    const key = this.getKey(token);

    if (this.instances.has(key)) {
      return this.instances.get(key);
    }

    const registration = this.parent.getRegistration(token);
    if (registration && registration.scope === 'scoped') {
      const instance = this.parent.createInstance(registration, this);
      this.instances.set(key, instance);
      return instance;
    }

    return this.parent.get(token);
  }

  private getKey(token: ServiceToken): string {
    return token.name;
  }

  dispose(): void {
    // Clean up scoped instances
    for (const [key, instance] of this.instances) {
      if (typeof instance?.dispose === 'function') {
        instance.dispose();
      }
    }
    this.instances.clear();
  }
}

// Main Dependency Injection Container
export class DIContainer extends EventEmitter {
  private services = new Map<string, ServiceRegistration>();
  private singletons = new Map<string, any>();
  private resolving = new Set<string>();
  private providers = new Map<string, ServiceProvider>();
  private middlewares: Array<(registration: ServiceRegistration) => void> = [];

  constructor() {
    super();
    this.registerSelf();
  }

  private registerSelf(): void {
    // Register the container itself for injection
    this.registerInstance(new ServiceToken<DIContainer>('DIContainer'), this);
  }

  /**
   * Register a service with the container
   */
  register<T>(
    token: ServiceToken<T>,
    factoryOrConstructor: ServiceFactory<T> | ServiceConstructor<T>,
    options: Partial<ServiceRegistration<T>> = {}
  ): this {
    const registration: ServiceRegistration<T> = {
      token,
      scope: options.scope || 'singleton',
      metadata: new Map(),
      ...options
    };

    // Determine if it's a factory or constructor
    if (typeof factoryOrConstructor === 'function') {
      if (factoryOrConstructor.prototype) {
        registration.constructor = factoryOrConstructor as ServiceConstructor<T>;
        registration.dependencies = this.extractDependencies(factoryOrConstructor);
      } else {
        registration.factory = factoryOrConstructor as ServiceFactory<T>;
      }
    }

    const key = this.getKey(token, options.qualifier);
    this.services.set(key, registration);

    // Apply middlewares
    this.middlewares.forEach(middleware => middleware(registration));

    this.emit('service:registered', { token, registration });
    return this;
  }

  /**
   * Register a singleton instance
   */
  registerInstance<T>(token: ServiceToken<T>, instance: T, qualifier?: string): this {
    const key = this.getKey(token, qualifier);
    const registration: ServiceRegistration<T> = {
      token,
      instance,
      scope: 'singleton',
      metadata: new Map()
    };

    this.services.set(key, registration);
    this.singletons.set(key, instance);

    this.emit('service:registered', { token, registration });
    return this;
  }

  /**
   * Register a service provider
   */
  registerProvider(provider: ServiceProvider): this {
    const providerName = provider.constructor.name;

    if (this.providers.has(providerName)) {
      throw new Error(`Provider ${providerName} is already registered`);
    }

    this.providers.set(providerName, provider);
    provider.register(this);

    this.emit('provider:registered', { provider });
    return this;
  }

  /**
   * Register multiple services
   */
  registerMany(registrations: Array<{
    token: ServiceToken;
    factory?: ServiceFactory;
    constructor?: ServiceConstructor;
    scope?: ServiceScope;
  }>): this {
    registrations.forEach(reg => {
      this.register(reg.token, reg.factory || reg.constructor!, {
        scope: reg.scope
      });
    });
    return this;
  }

  /**
   * Get a service from the container
   */
  get<T>(token: ServiceToken<T>, qualifier?: string): T {
    const key = this.getKey(token, qualifier);
    const registration = this.services.get(key);

    if (!registration) {
      throw new Error(`Service ${token.name} not registered`);
    }

    return this.resolve(registration);
  }

  /**
   * Get optional service (returns undefined if not found)
   */
  getOptional<T>(token: ServiceToken<T>, qualifier?: string): T | undefined {
    try {
      return this.get(token, qualifier);
    } catch {
      return undefined;
    }
  }

  /**
   * Get all services matching a token
   */
  getAll<T>(token: ServiceToken<T>): T[] {
    const services: T[] = [];
    const prefix = `${token.name}:`;

    for (const [key, registration] of this.services) {
      if (key === token.name || key.startsWith(prefix)) {
        services.push(this.resolve(registration));
      }
    }

    return services;
  }

  /**
   * Check if a service is registered
   */
  has(token: ServiceToken, qualifier?: string): boolean {
    const key = this.getKey(token, qualifier);
    return this.services.has(key);
  }

  /**
   * Create a scoped container
   */
  createScope(): ScopedContainer {
    return new ScopedContainer(this);
  }

  /**
   * Add middleware for service registration
   */
  use(middleware: (registration: ServiceRegistration) => void): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Resolve a service
   */
  private resolve<T>(registration: ServiceRegistration<T>, scope?: ScopedContainer): T {
    const key = this.getKey(registration.token, registration.qualifier);

    // Check for circular dependencies
    if (this.resolving.has(key)) {
      throw new Error(`Circular dependency detected: ${key}`);
    }

    // Return existing singleton
    if (registration.scope === 'singleton' && this.singletons.has(key)) {
      return this.singletons.get(key);
    }

    // Return pre-registered instance
    if (registration.instance) {
      return registration.instance;
    }

    try {
      this.resolving.add(key);
      const instance = this.createInstance(registration, scope);

      if (registration.scope === 'singleton') {
        this.singletons.set(key, instance);
      }

      return instance;
    } finally {
      this.resolving.delete(key);
    }
  }

  /**
   * Create an instance of a service
   */
  createInstance<T>(registration: ServiceRegistration<T>, scope?: ScopedContainer): T {
    this.emit('service:resolving', { registration });

    let instance: T;

    if (registration.factory) {
      instance = registration.factory(scope || this);
    } else if (registration.constructor) {
      const dependencies = this.resolveDependencies(registration.dependencies || [], scope);
      instance = new registration.constructor(...dependencies);
    } else {
      throw new Error(`No factory or constructor for ${registration.token.name}`);
    }

    // Apply property injection
    this.applyPropertyInjection(instance, scope);

    this.emit('service:resolved', { registration, instance });
    return instance;
  }

  /**
   * Resolve dependencies for a service
   */
  private resolveDependencies(dependencies: ServiceToken[], scope?: ScopedContainer): any[] {
    return dependencies.map(dep => {
      if (scope && scope instanceof ScopedContainer) {
        return scope.get(dep);
      }
      return this.get(dep);
    });
  }

  /**
   * Extract dependencies from constructor parameters
   */
  private extractDependencies(constructor: ServiceConstructor): ServiceToken[] {
    const paramTypes = Reflect.getMetadata(METADATA_KEYS.DEPENDENCIES, constructor) || [];
    const injectMetadata = Reflect.getMetadata(METADATA_KEYS.INJECT, constructor) || [];

    return paramTypes.map((type: any, index: number) => {
      const injected = injectMetadata.find((m: any) => m.index === index);
      if (injected) {
        return injected.token;
      }

      // Try to create token from type
      if (type && type.name) {
        return new ServiceToken(type.name, type);
      }

      throw new Error(`Cannot resolve parameter ${index} of ${constructor.name}`);
    });
  }

  /**
   * Apply property injection
   */
  private applyPropertyInjection(instance: any, scope?: ScopedContainer): void {
    if (!instance || typeof instance !== 'object') return;

    const prototype = Object.getPrototypeOf(instance);
    const injectMetadata = Reflect.getMetadata(METADATA_KEYS.INJECT, prototype) || [];

    for (const metadata of injectMetadata) {
      if (metadata.propertyKey) {
        const value = scope ? scope.get(metadata.token) : this.get(metadata.token);
        instance[metadata.propertyKey] = value;
      }
    }
  }

  /**
   * Get service registration
   */
  getRegistration<T>(token: ServiceToken<T>, qualifier?: string): ServiceRegistration<T> | undefined {
    const key = this.getKey(token, qualifier);
    return this.services.get(key) as ServiceRegistration<T> | undefined;
  }

  /**
   * Generate key for service storage
   */
  private getKey(token: ServiceToken, qualifier?: string): string {
    return qualifier ? `${token.name}:${qualifier}` : token.name;
  }

  /**
   * Clear all services
   */
  clear(): void {
    // Dispose singletons
    for (const [key, instance] of this.singletons) {
      if (typeof instance?.dispose === 'function') {
        instance.dispose();
      }
    }

    this.services.clear();
    this.singletons.clear();
    this.resolving.clear();
    this.providers.clear();
    this.middlewares = [];

    this.registerSelf();
    this.emit('container:cleared');
  }

  /**
   * Get container statistics
   */
  getStats(): {
    registeredServices: number;
    singletons: number;
    providers: number;
    middlewares: number;
  } {
    return {
      registeredServices: this.services.size,
      singletons: this.singletons.size,
      providers: this.providers.size,
      middlewares: this.middlewares.length
    };
  }
}

// Global container instance
export const container = new DIContainer();

// Service tokens for common services
export const SERVICE_TOKENS = {
  Logger: new ServiceToken<any>('Logger'),
  Database: new ServiceToken<any>('Database'),
  Cache: new ServiceToken<any>('Cache'),
  Config: new ServiceToken<any>('Config'),
  EventBus: new ServiceToken<any>('EventBus'),
  PDFService: new ServiceToken<any>('PDFService'),
  OCRService: new ServiceToken<any>('OCRService'),
  StorageService: new ServiceToken<any>('StorageService'),
  QueueService: new ServiceToken<any>('QueueService'),
  EmailService: new ServiceToken<any>('EmailService'),
  MetricsService: new ServiceToken<any>('MetricsService'),
  HealthService: new ServiceToken<any>('HealthService')
} as const;

export default container;