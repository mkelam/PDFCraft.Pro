/**
 * Production Configuration - PDFCraft.Pro
 * Optimized settings for OCR Overlay system deployment
 * Designed for Hostinger VPS and production-grade performance
 */

export interface ProductionConfig {
  server: {
    port: number;
    host: string;
    nodeEnv: string;
    processTitle: string;
    gracefulShutdownTimeout: number;
  };
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    connectionLimit: number;
    acquireTimeout: number;
    timeout: number;
    reconnect: boolean;
    ssl: boolean;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    retryDelayOnFailover: number;
    enableReadyCheck: boolean;
    maxRetriesPerRequest: number;
    lazyConnect: boolean;
  };
  cors: {
    origins: string[];
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
    maxAge: number;
  };
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    bcryptRounds: number;
    rateLimitWindowMs: number;
    rateLimitMax: number;
    helmetConfig: {
      contentSecurityPolicy: boolean;
      crossOriginEmbedderPolicy: boolean;
      referrerPolicy: string;
    };
  };
  upload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
    uploadDir: string;
    tempDir: string;
    cleanupInterval: number;
    retentionPeriod: number;
  };
  processing: {
    concurrentJobs: number;
    jobTimeout: number;
    retryAttempts: number;
    retryDelay: number;
    queueCleanupInterval: number;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
    publishableKey: string;
    apiVersion: string;
  };
  monitoring: {
    enableHealthChecks: boolean;
    healthCheckInterval: number;
    metricsCollection: boolean;
    logLevel: string;
    maxLogFiles: number;
    maxLogSize: string;
  };
  performance: {
    compressionLevel: number;
    cacheHeaders: {
      staticAssets: number;
      apiResponses: number;
    };
    keepAliveTimeout: number;
    headersTimeout: number;
  };
}

export const productionConfig: ProductionConfig = {
  server: {
    port: parseInt(process.env.PORT || '3001'),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'production',
    processTitle: 'pdfcraft-pro-api',
    gracefulShutdownTimeout: 30000, // 30 seconds
  },

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'pdfcraft_pro',
    username: process.env.DB_USER || 'pdfcraft_user',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: 20,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    ssl: process.env.DB_SSL === 'true',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'https://pdfcraft.pro,https://www.pdfcraft.pro').split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'stripe-signature'],
    credentials: true,
    maxAge: 86400, // 24 hours
  },

  security: {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: 12,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100,
    helmetConfig: {
      contentSecurityPolicy: false, // Handled by frontend
      crossOriginEmbedderPolicy: false,
      referrerPolicy: 'strict-origin-when-cross-origin',
    },
  },

  upload: {
    maxFileSize: 100 * 1024 * 1024, // 100MB for Pro users
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint'
    ],
    uploadDir: process.env.UPLOAD_DIR || '/tmp/pdfcraft/uploads',
    tempDir: process.env.TEMP_DIR || '/tmp/pdfcraft/temp',
    cleanupInterval: 60 * 60 * 1000, // 1 hour
    retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
  },

  processing: {
    concurrentJobs: parseInt(process.env.CONCURRENT_JOBS || '5'),
    jobTimeout: 5 * 60 * 1000, // 5 minutes
    retryAttempts: 3,
    retryDelay: 5000, // 5 seconds
    queueCleanupInterval: 30 * 60 * 1000, // 30 minutes
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    apiVersion: '2023-10-16',
  },

  monitoring: {
    enableHealthChecks: true,
    healthCheckInterval: 30000, // 30 seconds
    metricsCollection: true,
    logLevel: process.env.LOG_LEVEL || 'info',
    maxLogFiles: 10,
    maxLogSize: '10MB',
  },

  performance: {
    compressionLevel: 6,
    cacheHeaders: {
      staticAssets: 31536000, // 1 year
      apiResponses: 300, // 5 minutes
    },
    keepAliveTimeout: 65000, // 65 seconds
    headersTimeout: 66000, // 66 seconds
  },
};

/**
 * Validate production configuration
 */
export function validateProductionConfig(): void {
  const requiredEnvVars = [
    'JWT_SECRET',
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file or environment configuration.'
    );
  }

  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for production use');
  }

  // Validate Stripe configuration
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
    console.warn('⚠️  Warning: Using Stripe test keys in production environment');
  }

  console.log('✅ Production configuration validated successfully');
}

/**
 * Get optimized configuration for OCR Overlay processing
 */
export function getOCROverlayConfig() {
  return {
    imageProcessing: {
      maxDPI: 600,
      defaultDPI: 300,
      compressionQuality: 85,
      maxImageSize: 50 * 1024 * 1024, // 50MB per image
    },
    ocrEngine: {
      tessesactWorkers: Math.min(4, Math.max(1, Math.floor(require('os').cpus().length / 2))),
      ocrTimeout: 120000, // 2 minutes per page
      confidenceThreshold: 30,
      multiPassEnabled: true,
    },
    powerPointGeneration: {
      maxSlides: 500,
      templateCaching: true,
      compressionLevel: 'medium',
      preserveAspectRatio: true,
    },
    performance: {
      enableCaching: true,
      cacheExpiryMs: 60 * 60 * 1000, // 1 hour
      maxCacheSize: 500 * 1024 * 1024, // 500MB
      enableProgressTracking: true,
    }
  };
}

export default productionConfig;