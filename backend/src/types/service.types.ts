/**
 * Service-specific type definitions for PDFCraft.Pro backend
 * Addresses TypeScript compilation errors across all services
 */

// Import shared types from pdf-conversion
import type { QualityMetrics } from './pdf-conversion.types';

// ====================================
// SHARP AND IMAGE PROCESSING TYPES
// ====================================

declare module 'sharp' {
  interface Sharp {
    (input?: string | Buffer | Uint8Array | Uint8ClampedArray): SharpInstance;
  }

  interface SharpInstance {
    resize(width?: number, height?: number, options?: ResizeOptions): SharpInstance;
    resize(options?: ResizeOptions): SharpInstance;
    png(options?: PngOptions): SharpInstance;
    jpeg(options?: JpegOptions): SharpInstance;
    toBuffer(): Promise<Buffer>;
    toFile(fileOut: string): Promise<any>;
    metadata(): Promise<Metadata>;
    stats(): Promise<{ channels: Array<{ min: number; max: number; sum: number; mean: number; stdev: number; minX: number; minY: number; maxX: number; maxY: number }> }>;
    extract(options: Region): SharpInstance;
    composite(images: OverlayOptions[]): SharpInstance;
    blur(sigma?: number): SharpInstance;
    sharpen(sigma?: number, flat?: number, jagged?: number): SharpInstance;
    sharpen(options?: { sigma?: number; m1?: number; m2?: number; x1?: number; y2?: number; y3?: number }): SharpInstance;
    gamma(gamma?: number, gammaOut?: number): SharpInstance;
    negate(options?: { alpha?: boolean }): SharpInstance;
    normalise(options?: { lower?: number; upper?: number }): SharpInstance;
    normalize(options?: { lower?: number; upper?: number }): SharpInstance;
    clahe(options: ClaheOptions): SharpInstance;
    convolve(kernel: Kernel): SharpInstance;
    threshold(threshold?: number, options?: ThresholdOptions): SharpInstance;
    boolean(operand: string | Buffer, operator: string, options?: { raw?: Raw }): SharpInstance;
    linear(a?: number | number[], b?: number | number[]): SharpInstance;
    recomb(inputMatrix: Matrix3x3): SharpInstance;
    modulate(options?: ModulateOptions): SharpInstance;
    ensureAlpha(alpha?: number): SharpInstance;
    extractChannel(channel: 0 | 1 | 2 | 3 | 'red' | 'green' | 'blue' | 'alpha'): SharpInstance;
    joinChannel(images: string[] | Buffer[] | SharpInstance[]): SharpInstance;
    grayscale(grayscale?: boolean): SharpInstance;
    greyscale(greyscale?: boolean): SharpInstance;
    toColourspace(colourspace?: string): SharpInstance;
    toColorspace(colorspace?: string): SharpInstance;
    raw(): SharpInstance;
    raw(options: Raw): SharpInstance;
  }

  interface ResizeOptions {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    position?: string;
    background?: Color;
    kernel?: 'nearest' | 'cubic' | 'mitchell' | 'lanczos2' | 'lanczos3';
    withoutEnlargement?: boolean;
    withoutReduction?: boolean;
    fastShrinkOnLoad?: boolean;
  }

  interface PngOptions {
    progressive?: boolean;
    compressionLevel?: number;
    adaptiveFiltering?: boolean;
    force?: boolean;
    quality?: number;
    effort?: number;
    colours?: number;
    colors?: number;
    dither?: number;
  }

  interface JpegOptions {
    quality?: number;
    progressive?: boolean;
    force?: boolean;
    mozjpeg?: boolean;
    trellisQuantisation?: boolean;
    trellisDC?: boolean;
    quantisationTable?: number;
    overshootDeringing?: boolean;
    optimiseScans?: boolean;
    optimisesCoding?: boolean;
    optimizeCoding?: boolean;
  }

  interface Metadata {
    format?: string;
    width?: number;
    height?: number;
    channels?: number;
    density?: number;
    hasProfile?: boolean;
    hasAlpha?: boolean;
    isProgressive?: boolean;
    pages?: number;
    pageHeight?: number;
    loop?: number;
    delay?: number[];
    pagePrimary?: number;
    [key: string]: any;
  }

  interface Region {
    left: number;
    top: number;
    width: number;
    height: number;
  }

  interface OverlayOptions {
    input: string | Buffer | SharpInstance;
    top?: number;
    left?: number;
    gravity?: string;
    blend?: string;
    tile?: boolean;
    cutout?: boolean;
  }

  interface ClaheOptions {
    width: number;
    height: number;
    maxSlope?: number;
  }

  interface Kernel {
    width: number;
    height: number;
    kernel: number[];
    scale?: number;
    offset?: number;
  }

  interface ThresholdOptions {
    greyscale?: boolean;
    grayscale?: boolean;
  }

  interface Raw {
    width: number;
    height: number;
    channels: number;
  }

  interface Matrix3x3 extends Array<number> {
    length: 9;
  }

  interface ModulateOptions {
    brightness?: number;
    saturation?: number;
    hue?: number;
    lightness?: number;
  }

  type Color = string | { r: number; g: number; b: number; alpha?: number };
}

// ====================================
// PDF-LIB EXTENDED TYPES
// ====================================

declare module 'pdf-lib' {
  export interface PDFName {
    asString(): string;
  }

  export function PDFName(name: string): PDFName;
}

// ====================================
// TESSERACT WORKER TYPES
// ====================================

export interface TesseractWorker {
  loadLanguage(lang: string): Promise<void>;
  initialize(lang: string): Promise<void>;
  reinitialize(): Promise<void>;
  setParameters(params: { [key: string]: string }): Promise<void>;
  recognize(image: string | Buffer): Promise<TesseractResult>;
  terminate(): Promise<void>;
}

export interface TesseractResult {
  data: {
    text: string;
    confidence: number;
    words: TesseractWord[];
    lines: TesseractLine[];
    paragraphs: TesseractParagraph[];
  };
}

export interface TesseractWord {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface TesseractLine {
  text: string;
  confidence: number;
  words: TesseractWord[];
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface TesseractParagraph {
  text: string;
  confidence: number;
  lines: TesseractLine[];
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

// ====================================
// SERVICE-SPECIFIC INTERFACES
// ====================================

export interface TesseractOCRServiceConfig {
  processImages?: (images: any[], language: string) => Promise<any[]>;
  ocrLanguage?: string;
  config?: TesseractConfiguration;
}

export interface TesseractConfiguration {
  tessedit_char_whitelist?: string;
  tessedit_pageseg_mode?: string;
  preserve_interword_spaces?: string;
}

export interface QualityValidationMethod {
  'pixel-analysis': boolean;
  'pixel-comparison': boolean;
  'visual-similarity': boolean;
  'hash-comparison': boolean;
}

export interface TemplateCache {
  clear(): void;
  set(key: string, value: any): void;
  get(key: string): any;
  has(key: string): boolean;
  delete(key: string): boolean;
}

// ====================================
// BUFFER AND CONVERSION UTILITIES
// ====================================

export interface BufferConversionUtils {
  createBuffer(data: any): Buffer;
  isBuffer(obj: any): obj is Buffer;
  concatBuffers(buffers: Buffer[]): Buffer;
}

export interface FileProcessingOptions {
  maxFileSize: number;
  allowedMimeTypes: string[];
  processingTimeout: number;
  retryAttempts: number;
}

// ====================================
// ERROR HANDLING TYPES
// ====================================

export interface ServiceError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
  timestamp?: Date;
  service?: string;
}

export interface ErrorHandler {
  handleError(error: ServiceError, context?: string): void;
  logError(error: ServiceError, context?: string): void;
  formatError(error: ServiceError): any;
}

// ====================================
// PERFORMANCE AND MONITORING TYPES
// ====================================

export interface PerformanceMetrics {
  startTime: Date;
  endTime?: Date;
  duration?: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
}

export interface ServiceMonitor {
  startMonitoring(serviceName: string): string;
  stopMonitoring(monitorId: string): PerformanceMetrics;
  getMetrics(serviceName: string): PerformanceMetrics[];
}

// ====================================
// CONCURRENT PROCESSING TYPES
// ====================================

export interface ConcurrentProcessor<T, R> {
  process(items: T[], processor: (item: T) => Promise<R>): Promise<R[]>;
  processBatch(items: T[], batchSize: number, processor: (batch: T[]) => Promise<R[]>): Promise<R[]>;
  processWithConcurrency(items: T[], concurrency: number, processor: (item: T) => Promise<R>): Promise<R[]>;
}

export interface ProcessingQueue<T> {
  add(item: T): Promise<void>;
  process(): Promise<T[]>;
  clear(): void;
  size(): number;
}

// ====================================
// CACHE AND STORAGE TYPES
// ====================================

export interface CacheManager {
  set(key: string, value: any, ttl?: number): Promise<void>;
  get(key: string): Promise<any>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

export interface StorageProvider {
  store(path: string, data: Buffer): Promise<string>;
  retrieve(path: string): Promise<Buffer>;
  delete(path: string): Promise<boolean>;
  exists(path: string): Promise<boolean>;
}

// ====================================
// VALIDATION AND QUALITY TYPES
// ====================================

export interface QualityScorer {
  scoreImageQuality(image: Buffer): Promise<number>;
  scoreTextAccuracy(original: string, ocr: string): Promise<number>;
  scoreLayoutPreservation(original: any, converted: any): Promise<number>;
  calculateOverallScore(metrics: QualityMetrics): number;
}

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
  warnings?: string[];
  metadata?: Record<string, any>;
}

export interface ValidationRule {
  name: string;
  description: string;
  validate(data: any): Promise<ValidationResult>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface QualityAssurance {
  rules: ValidationRule[];
  validate(data: any): Promise<ValidationResult>;
  addRule(rule: ValidationRule): void;
  removeRule(ruleName: string): void;
}