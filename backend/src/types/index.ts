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


export interface PlanLimits {
  free: {
    conversionsPerDay: number;
    maxFileSize: number;
    maxFilesPerMerge: number;
  };
  starter: {
    conversionsPerMonth: number;
    maxFileSize: number;
    maxFilesPerMerge: number;
  };
  pro: {
    conversionsPerMonth: number;
    maxFileSize: number;
    maxFilesPerMerge: number;
  };
  enterprise: {
    conversionsPerMonth: number;
    maxFileSize: number;
    maxFilesPerMerge: number;
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
  paystack: {
    secretKey: string;
    publicKey: string;
  };
  app: {
    frontendUrl: string;
    apiUrl: string;
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