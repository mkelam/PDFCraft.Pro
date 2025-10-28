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
  payfast: {
    merchantId: string;
    merchantKey: string;
    passphrase: string;
    sandbox: boolean;
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

// Extended Redis Configuration for type safety
export interface ExtendedRedisConfig extends RedisConfig {
  retryDelayOnClusterDown?: number;
  enableReadyCheck?: boolean;
  maxRetriesPerRequest?: number;
}

// PDF Service Types
export interface PDFServiceResult {
  success: boolean;
  outputPath: string;
  message?: string;
  processingTime: number;
  warnings?: string[];
  errors?: string[];
}

// Image Processing Types
export interface ImageProcessingOptions {
  adaptiveQuality: boolean;
  enhanceText: boolean;
  preserveColors: boolean;
  optimizeSize: boolean;
}

// Vector Graphics Types
export interface ExtractedVectorGraphics {
  paths: VectorPath[];
  images: VectorImage[];
  text: VectorText[];
  totalElements: number;
}

export interface VectorPath {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface VectorImage {
  href: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VectorText {
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
}

// Enhanced Conversion Configuration
export interface EnhancedConversionConfig {
  inputPath: string;
  outputPath: string;
  imageQualityDpi: number;
  ocrLanguage: string;
  useAdvancedProcessing: boolean;
  useMultiQualityExtraction: boolean;
  useEnhancedOCR: boolean;
  useSmartTextAnalysis: boolean;
  useAdvancedPowerPoint: boolean;
  usePerformanceOptimization: boolean;
  imageProcessing: ImageProcessingOptions;
  qualityValidation: {
    enableValidation: boolean;
    strictMode: boolean;
    minimumQualityScore: number;
  };
  powerPointGeneration: {
    templateStyle: string;
    enableAnimations: boolean;
    optimizeCompatibility: boolean;
  };
}

// Enhanced OCR Result
export interface EnhancedOCRResult {
  text: string;
  confidence: number;
  pages: Array<{
    pageNumber: number;
    textBlocks: TextBlock[];
    confidence: number;
  }>;
  processingTime: number;
  language: string;
}

export interface TextBlock {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  fontSize: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Page Image Interface
export interface PageImage {
  pageNumber: number;
  buffer: Buffer;
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  dpi: number;
}

// Enhanced Conversion Result
export interface EnhancedConversionResult {
  success: boolean;
  outputPath: string;
  processingTime: number;
  generationMetrics: ConversionMetrics;
  qualityMetrics: QualityMetrics;
  warnings?: string[];
  errors?: string[];
}

export interface ConversionMetrics {
  pages: number;
  textBlocks: number;
  averageConfidence: number;
  processingSpeed: number;
  memoryUsage: number;
}

export interface QualityMetrics {
  imageQuality: number;
  textAccuracy: number;
  layoutPreservation: number;
  overallScore: number;
}

// Validation Result
export interface ValidationResult {
  passed: boolean;
  overallScore: number;
  issues: ValidationIssue[];
  recommendations: string[];
}

export interface ValidationIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  page?: number;
}