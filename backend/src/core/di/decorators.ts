/**
 * Dependency Injection Decorators
 * Provides TypeScript decorators for automatic dependency injection
 */

import 'reflect-metadata';
import { ServiceToken, ServiceScope, container } from './container';

// Metadata keys
const METADATA_KEYS = {
  INJECTABLE: 'custom:injectable',
  INJECT: 'custom:inject',
  INJECT_ALL: 'custom:inject:all',
  DEPENDENCIES: 'design:paramtypes',
  SERVICE_SCOPE: 'custom:scope',
  SERVICE_TOKEN: 'custom:token',
  LAZY: 'custom:lazy',
  OPTIONAL: 'custom:optional',
  QUALIFIER: 'custom:qualifier',
  AUTO_BIND: 'custom:autobind',
  POST_CONSTRUCT: 'custom:postconstruct',
  PRE_DESTROY: 'custom:predestroy'
} as const;

/**
 * Mark a class as injectable
 */
export function Injectable(options?: {
  scope?: ServiceScope;
  token?: ServiceToken;
  qualifier?: string;
  lazy?: boolean;
}): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(METADATA_KEYS.INJECTABLE, true, target);

    if (options?.scope) {
      Reflect.defineMetadata(METADATA_KEYS.SERVICE_SCOPE, options.scope, target);
    }

    if (options?.token) {
      Reflect.defineMetadata(METADATA_KEYS.SERVICE_TOKEN, options.token, target);
    }

    if (options?.qualifier) {
      Reflect.defineMetadata(METADATA_KEYS.QUALIFIER, options.qualifier, target);
    }

    if (options?.lazy !== undefined) {
      Reflect.defineMetadata(METADATA_KEYS.LAZY, options.lazy, target);
    }

    // Auto-register if token is provided
    if (options?.token) {
      container.register(options.token, target, {
        scope: options.scope || 'singleton',
        qualifier: options.qualifier,
        lazy: options.lazy
      });
    }

    return target;
  };
}

/**
 * Inject a dependency into constructor parameter
 */
export function Inject(token: ServiceToken | string, options?: {
  optional?: boolean;
  qualifier?: string;
}): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const serviceToken = typeof token === 'string'
      ? new ServiceToken(token)
      : token;

    const existingTokens = Reflect.getMetadata(METADATA_KEYS.INJECT, target) || [];
    existingTokens.push({
      index: parameterIndex,
      token: serviceToken,
      optional: options?.optional,
      qualifier: options?.qualifier,
      propertyKey
    });

    Reflect.defineMetadata(METADATA_KEYS.INJECT, existingTokens, target);
  };
}

/**
 * Inject a dependency into a property
 */
export function InjectProperty(token: ServiceToken | string, options?: {
  optional?: boolean;
  qualifier?: string;
}): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const serviceToken = typeof token === 'string'
      ? new ServiceToken(token)
      : token;

    const existingTokens = Reflect.getMetadata(METADATA_KEYS.INJECT, target) || [];
    existingTokens.push({
      token: serviceToken,
      optional: options?.optional,
      qualifier: options?.qualifier,
      propertyKey
    });

    Reflect.defineMetadata(METADATA_KEYS.INJECT, existingTokens, target);

    // Create property getter
    const getter = function(this: any) {
      const propertyName = `__${String(propertyKey)}_injected`;

      if (!this[propertyName]) {
        if (options?.optional) {
          this[propertyName] = container.getOptional(serviceToken, options?.qualifier);
        } else {
          this[propertyName] = container.get(serviceToken, options?.qualifier);
        }
      }

      return this[propertyName];
    };

    const setter = function(this: any, value: any) {
      const propertyName = `__${String(propertyKey)}_injected`;
      this[propertyName] = value;
    };

    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true
    });
  };
}

/**
 * Inject all services matching a token
 */
export function InjectAll(token: ServiceToken | string): ParameterDecorator & PropertyDecorator {
  return (target: any, propertyKey?: string | symbol, parameterIndex?: number) => {
    const serviceToken = typeof token === 'string'
      ? new ServiceToken(token)
      : token;

    if (typeof parameterIndex === 'number') {
      // Constructor parameter injection
      const existingTokens = Reflect.getMetadata(METADATA_KEYS.INJECT_ALL, target) || [];
      existingTokens.push({
        index: parameterIndex,
        token: serviceToken
      });
      Reflect.defineMetadata(METADATA_KEYS.INJECT_ALL, existingTokens, target);
    } else if (propertyKey) {
      // Property injection
      const getter = function(this: any) {
        const propertyName = `__${String(propertyKey)}_injected_all`;

        if (!this[propertyName]) {
          this[propertyName] = container.getAll(serviceToken);
        }

        return this[propertyName];
      };

      Object.defineProperty(target, propertyKey, {
        get: getter,
        enumerable: true,
        configurable: true
      });
    }
  };
}

/**
 * Mark a property or method as lazy-loaded
 */
export function Lazy(): PropertyDecorator & MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(METADATA_KEYS.LAZY, true, target, propertyKey);

    if (descriptor && typeof descriptor.value === 'function') {
      const originalMethod = descriptor.value;
      let cachedResult: any;
      let isResolved = false;

      descriptor.value = function(...args: any[]) {
        if (!isResolved) {
          cachedResult = originalMethod.apply(this, args);
          isResolved = true;
        }
        return cachedResult;
      };
    }

    return descriptor!;
  };
}

/**
 * Mark a method to be called after construction
 */
export function PostConstruct(): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const existingMethods = Reflect.getMetadata(METADATA_KEYS.POST_CONSTRUCT, target) || [];
    existingMethods.push(propertyKey);
    Reflect.defineMetadata(METADATA_KEYS.POST_CONSTRUCT, existingMethods, target);
    return descriptor;
  };
}

/**
 * Mark a method to be called before destruction
 */
export function PreDestroy(): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const existingMethods = Reflect.getMetadata(METADATA_KEYS.PRE_DESTROY, target) || [];
    existingMethods.push(propertyKey);
    Reflect.defineMetadata(METADATA_KEYS.PRE_DESTROY, existingMethods, target);
    return descriptor;
  };
}

/**
 * Auto-bind method context
 */
export function AutoBind(): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const adjDescriptor: PropertyDescriptor = {
      configurable: true,
      enumerable: false,
      get() {
        const boundMethod = originalMethod.bind(this);
        Object.defineProperty(this, propertyKey, {
          value: boundMethod,
          configurable: true,
          writable: true,
          enumerable: false
        });
        return boundMethod;
      }
    };
    return adjDescriptor;
  };
}

/**
 * Service decorator - combines Injectable with automatic registration
 */
export function Service(options?: {
  name?: string;
  scope?: ServiceScope;
  qualifier?: string;
}): ClassDecorator {
  return (target: any) => {
    const name = options?.name || target.name;
    const token = new ServiceToken(name, target);

    // Apply Injectable decorator
    Injectable({
      token,
      scope: options?.scope || 'singleton',
      qualifier: options?.qualifier
    })(target);

    return target;
  };
}

/**
 * Repository decorator for data access services
 */
export function Repository(entity?: any): ClassDecorator {
  return (target: any) => {
    const name = `${entity?.name || target.name}Repository`;
    const token = new ServiceToken(name, target);

    Injectable({
      token,
      scope: 'singleton'
    })(target);

    return target;
  };
}

/**
 * Controller decorator for HTTP controllers
 */
export function Controller(path?: string): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata('controller:path', path || '', target);

    const token = new ServiceToken(`${target.name}Controller`, target);

    Injectable({
      token,
      scope: 'singleton'
    })(target);

    return target;
  };
}

/**
 * Middleware decorator for Express middleware
 */
export function Middleware(): ClassDecorator {
  return (target: any) => {
    const token = new ServiceToken(`${target.name}Middleware`, target);

    Injectable({
      token,
      scope: 'singleton'
    })(target);

    return target;
  };
}

/**
 * Factory decorator for factory classes
 */
export function Factory(produces: any): ClassDecorator {
  return (target: any) => {
    const token = new ServiceToken(`${produces.name}Factory`, target);

    Injectable({
      token,
      scope: 'singleton'
    })(target);

    Reflect.defineMetadata('factory:produces', produces, target);

    return target;
  };
}

/**
 * Configuration decorator
 */
export function Configuration(prefix?: string): ClassDecorator {
  return (target: any) => {
    const token = new ServiceToken(`${target.name}Configuration`, target);

    Injectable({
      token,
      scope: 'singleton'
    })(target);

    if (prefix) {
      Reflect.defineMetadata('config:prefix', prefix, target);
    }

    return target;
  };
}

/**
 * Cache decorator for methods
 */
export function Cacheable(options?: {
  ttl?: number;
  key?: string | ((args: any[]) => string);
}): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const cache = new Map<string, { value: any; expiry: number }>();

    descriptor.value = async function(...args: any[]) {
      const cacheKey = typeof options?.key === 'function'
        ? options.key(args)
        : options?.key || JSON.stringify(args);

      const now = Date.now();
      const cached = cache.get(cacheKey);

      if (cached && cached.expiry > now) {
        return cached.value;
      }

      const result = await originalMethod.apply(this, args);
      const ttl = options?.ttl || 60000; // Default 1 minute

      cache.set(cacheKey, {
        value: result,
        expiry: now + ttl
      });

      return result;
    };

    return descriptor;
  };
}

/**
 * Retry decorator for methods
 */
export function Retry(options?: {
  attempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
}): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const maxAttempts = options?.attempts || 3;
      const initialDelay = options?.delay || 1000;
      const backoff = options?.backoff || 'exponential';

      let lastError: any;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;

          if (attempt < maxAttempts) {
            const delay = backoff === 'exponential'
              ? initialDelay * Math.pow(2, attempt - 1)
              : initialDelay * attempt;

            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError;
    };

    return descriptor;
  };
}

/**
 * Transactional decorator for database operations
 */
export function Transactional(): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      // This would integrate with your database transaction system
      // For now, it's a placeholder
      console.log(`Starting transaction for ${String(propertyKey)}`);

      try {
        const result = await originalMethod.apply(this, args);
        console.log(`Committing transaction for ${String(propertyKey)}`);
        return result;
      } catch (error) {
        console.log(`Rolling back transaction for ${String(propertyKey)}`);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Validate decorator for input validation
 */
export function Validate(schema: any): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      // This would integrate with your validation library (e.g., Joi, Yup)
      // For now, it's a placeholder
      console.log(`Validating input for ${String(propertyKey)}`);

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Log decorator for method logging
 */
export function Log(level: 'debug' | 'info' | 'warn' | 'error' = 'info'): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;

    descriptor.value = async function(...args: any[]) {
      console.log(`[${level.toUpperCase()}] ${className}.${String(propertyKey)} called with:`, args);

      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        console.log(`[${level.toUpperCase()}] ${className}.${String(propertyKey)} completed in ${duration}ms`);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        console.error(`[ERROR] ${className}.${String(propertyKey)} failed after ${duration}ms:`, error);

        throw error;
      }
    };

    return descriptor;
  };
}