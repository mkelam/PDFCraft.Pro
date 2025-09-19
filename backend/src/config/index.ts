import dotenv from 'dotenv';
import { AppConfig } from '../types';

dotenv.config();

const requiredEnvVars = [
  'JWT_SECRET'
];

// Only require essential env vars in development
const productionEnvVars = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'PAYSTACK_SECRET_KEY'
];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Validate production environment variables only in production
if (process.env.NODE_ENV === 'production') {
  for (const envVar of productionEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiUrl: process.env.API_URL || 'http://localhost:3001',

  database: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME!,
    username: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY!,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
  },

  app: {
    frontendUrl: process.env.FRONTEND_URL || 'https://pdfcraft.pro',
    apiUrl: process.env.API_URL || 'https://api.pdfcraft.pro',
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB
    uploadDir: process.env.UPLOAD_DIR || '/tmp/uploads',
    tempDir: process.env.TEMP_DIR || '/tmp/processing',
  },

  email: {
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },

  libreoffice: {
    path: process.env.LIBREOFFICE_PATH || '/usr/bin/libreoffice',
  },
};

export const PLAN_LIMITS = {
  free: {
    conversionsPerDay: 3,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFilesPerMerge: 3,
  },
  starter: {
    conversionsPerMonth: 100,
    maxFileSize: 25 * 1024 * 1024, // 25MB
    maxFilesPerMerge: 5,
  },
  pro: {
    conversionsPerMonth: -1, // unlimited
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxFilesPerMerge: 10,
  },
  enterprise: {
    conversionsPerMonth: -1, // unlimited
    maxFileSize: 500 * 1024 * 1024, // 500MB
    maxFilesPerMerge: 20,
  },
} as const;