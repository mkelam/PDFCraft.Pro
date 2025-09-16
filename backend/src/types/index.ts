export interface User {
  id: number;
  email: string;
  password: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  conversionsUsed: number;
  conversionsLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversionJob {
  id: string;
  userId?: number;
  type: 'pdf-to-ppt' | 'pdf-merge';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  inputFiles: string[];
  outputFile?: string;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
  processingTime?: number;
}

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface ConversionRequest {
  files: Express.Multer.File[];
  type: 'pdf-to-ppt' | 'pdf-merge';
  userId?: number;
}

export interface ConversionResponse {
  jobId: string;
  status: string;
  message: string;
  estimatedTime?: number;
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  downloadUrl?: string;
  errorMessage?: string;
  processingTime?: number;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface PlanLimits {
  free: {
    conversionsPerDay: 3;
    maxFileSize: 10 * 1024 * 1024; // 10MB
    maxFilesPerMerge: 3;
  };
  starter: {
    conversionsPerMonth: 100;
    maxFileSize: 25 * 1024 * 1024; // 25MB
    maxFilesPerMerge: 5;
  };
  pro: {
    conversionsPerMonth: -1; // unlimited
    maxFileSize: 100 * 1024 * 1024; // 100MB
    maxFilesPerMerge: 10;
  };
  enterprise: {
    conversionsPerMonth: -1; // unlimited
    maxFileSize: 500 * 1024 * 1024; // 500MB
    maxFilesPerMerge: 20;
  };
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  apiUrl: string;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
  };
  upload: {
    maxFileSize: number;
    uploadDir: string;
    tempDir: string;
  };
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
  libreoffice: {
    path: string;
  };
}