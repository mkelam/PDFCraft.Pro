/**
 * UNIFIED PDF CONVERSION TYPES
 *
 * Standardized type definitions for all PDF-to-PowerPoint conversion services
 * Resolves type inconsistencies across VisualFidelityPDFService, ImprovedPDFService,
 * SemanticValidationPDFService, and OptimizedEngineSelectionService.
 *
 * PHASE 2: Consolidated format type definitions to eliminate type fragmentation
 */

import { QualityValidationResult } from '../middleware/quality-validation.middleware';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE 2: UNIFIED FORMAT TYPE DEFINITIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * Centralizes all format-related types to prevent fragmentation across services
 */

/**
 * Office document output formats supported by CloudConvert and conversion services
 * Used for PDF-to-Office conversions (PPTX, DOCX, XLSX)
 */
export type OfficeOutputFormat = 'pptx' | 'docx' | 'xlsx';

/**
 * Image output formats for PDF-to-image conversions
 * Used when converting PDF pages to image files
 */
export type ImageOutputFormat = 'png' | 'jpg' | 'jpeg' | 'tiff';

/**
 * All supported output formats (union of office and image formats)
 */
export type OutputFormat = OfficeOutputFormat | ImageOutputFormat;

/**
 * Legacy alias for OfficeOutputFormat for backward compatibility
 * @deprecated Use OfficeOutputFormat instead
 */
export type OfficeFormat = OfficeOutputFormat;

/**
 * Standard conversion result interface for all PDF services
 */
export interface ConversionResult {
  /** Output filename (without path) */
  filename: string;

  /** Quality validation results if enabled */
  qualityResult?: QualityValidationResult;

  /** Processing time in milliseconds */
  processingTime?: number;

  /** Success status */
  success?: boolean;

  /** Additional metadata */
  metadata?: ConversionMetadata;

  /** Quality metrics for the conversion */
  qualityMetrics?: QualityMetrics;

  /** Error message if conversion failed */
  error?: string;
}

/**
 * Enhanced conversion result with additional service-specific data
 */
export interface EnhancedConversionResult extends ConversionResult {
  /** Service that performed the conversion */
  engine: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Quality metrics */
  qualityMetrics?: QualityMetrics;

  /** Processing details */
  processingDetails?: ProcessingDetails;
}

/**
 * Conversion metadata
 */
export interface ConversionMetadata {
  /** Original input filename */
  originalFilename: string;

  /** File size of input */
  inputSize: number;

  /** File size of output */
  outputSize?: number;

  /** Number of pages processed */
  pageCount: number;

  /** Timestamp of conversion */
  timestamp: string;

  /** Engine version used */
  engineVersion?: string;

  /** Orchestrator information for fallback tracking */
  orchestrator?: {
    serviceName: string;
    attemptCount: number;
    fallbackUsed: boolean;
    totalServicesTried: number;
    serviceOrder: string[];
    allServicesFailed?: boolean;
  };
}

/**
 * Quality metrics for conversion assessment
 */
export interface QualityMetrics {
  /** Text preservation score (0-1) */
  textPreservation: number;

  /** Layout preservation score (0-1) */
  layoutPreservation: number;

  /** Visual fidelity score (0-1) */
  visualPreservation: number;

  /** Semantic accuracy score (0-1) */
  semanticAccuracy: number;

  /** Overall quality score (0-1) */
  overallScore: number;

  /** Confidence in assessment (0-1) */
  confidence: number;
}

/**
 * Processing details for debugging and optimization
 */
export interface ProcessingDetails {
  /** Time breakdown by processing stage */
  stageTimings: {
    analysis: number;
    extraction: number;
    conversion: number;
    validation: number;
    optimization: number;
  };

  /** Memory usage statistics */
  memoryUsage?: {
    peak: number;
    average: number;
  };

  /** Processing warnings */
  warnings: string[];

  /** Debug information */
  debugInfo?: Record<string, any>;
}

/**
 * Conversion options for PDF services
 */
export interface ConversionOptions {
  /** Target DPI for image extraction */
  targetDPI?: number;

  /** Target quality percentage (0-100) */
  targetQuality?: number;

  /** Enable quality validation */
  validateQuality?: boolean;

  /** Output format preference (for image exports) - uses ImageOutputFormat */
  outputFormat?: ImageOutputFormat;

  /** Requested office format (for PDF to Office conversions) - uses OfficeOutputFormat */
  requestedOutputFormat?: OfficeOutputFormat;

  /** Quality level requirement */
  qualityLevel?: 'minimum' | 'good' | 'excellent';

  /** Enable debug mode */
  debugMode?: boolean;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Document complexity for service selection */
  complexity?: 'low' | 'medium' | 'high';

  /** Document type for service optimization */
  documentType?: 'presentation' | 'technical' | 'general' | 'mixed';

  /** Original filename for context */
  originalFilename?: string;

  /** Page count for optimization */
  pageCount?: number;

  /** File size for optimization */
  fileSize?: number;
}

/**
 * Document analysis result for engine selection
 */
export interface DocumentAnalysis {
  /** Document type classification */
  type: 'form' | 'document' | 'presentation' | 'mixed';

  /** Complexity level */
  complexity: 'simple' | 'moderate' | 'complex';

  /** Contains images */
  hasImages: boolean;

  /** Contains form fields */
  hasFormFields: boolean;

  /** Contains charts or graphs */
  hasCharts: boolean;

  /** Contains signatures or stamps */
  hasSignatures: boolean;

  /** Text density (characters per page) */
  textDensity: number;

  /** Visual content density (0-1) */
  visualDensity: number;

  /** Document structure quality (0-1) */
  structureScore: number;

  /** Number of detected form fields */
  formFieldCount: number;

  /** Total page count */
  pageCount: number;

  /** Analysis confidence (0-1) */
  confidence: number;
}

/**
 * Engine recommendation result
 */
export interface EngineRecommendation {
  /** Recommended primary engine */
  primaryEngine: string;

  /** Fallback engines in priority order */
  fallbackEngines: string[];

  /** Recommendation confidence (0-1) */
  confidence: number;

  /** Reasoning for recommendation */
  reasoning: string[];

  /** Expected quality score (0-1) */
  expectedQuality: number;

  /** Expected processing time in ms */
  expectedTime: number;

  /** Whether uncertainty resolution is recommended */
  uncertaintyResolution: boolean;
}

/**
 * Engine performance metrics
 */
export interface EnginePerformanceMetrics {
  /** Engine identifier */
  engine: string;

  /** Average processing time in ms */
  avgProcessingTime: number;

  /** Average quality score (0-1) */
  avgQualityScore: number;

  /** Success rate (0-1) */
  successRate: number;

  /** Form document handling score (0-1) */
  formDocumentScore: number;

  /** Visual document handling score (0-1) */
  visualDocumentScore: number;

  /** Text document handling score (0-1) */
  textDocumentScore: number;

  /** Overall reliability score (0-1) */
  reliability: number;
}

/**
 * Validation result for service consistency
 * (Different from quality validation - this is for service validation)
 */
export interface ServiceValidationResult {
  /** Engine that performed validation */
  engine: string;

  /** Validation success status */
  success: boolean;

  /** Output file path if successful */
  outputFile?: string;

  /** Processing time in milliseconds */
  processingTime: number;

  /** Quality score achieved (0-1) */
  qualityScore: number;

  /** Error message if failed */
  errorMessage?: string;

  /** Final weighted score for comparison */
  finalScore?: number;
}

/**
 * OCR analysis result
 */
export interface OCRResult {
  /** Extracted text content */
  text: string;

  /** Overall confidence score (0-1) */
  confidence: number;

  /** Word-level OCR data */
  words: OCRWord[];
}

/**
 * OCR word-level data
 */
export interface OCRWord {
  /** Word text */
  text: string;

  /** Confidence score for this word (0-1) */
  confidence: number;

  /** Bounding box coordinates */
  bbox: BoundingBox;
}

/**
 * Bounding box coordinates
 */
export interface BoundingBox {
  /** X coordinate */
  x: number;

  /** Y coordinate */
  y: number;

  /** Width */
  width: number;

  /** Height */
  height: number;
}

/**
 * Extracted image data
 */
export interface ExtractedImage {
  /** Unique image identifier */
  id: string;

  /** Image filename */
  name: string;

  /** Image data buffer */
  buffer: Buffer;

  /** Position and dimensions */
  x: number;
  y: number;
  width: number;
  height: number;

  /** Classified image type */
  type: 'logo' | 'qr-code' | 'chart' | 'signature' | 'image' | 'unknown';

  /** Detection confidence (0-1) */
  confidence: number;
}

/**
 * Visual element representation
 */
export interface VisualElement {
  /** Element type */
  type: 'text' | 'image' | 'shape';

  /** Element content */
  content: any;

  /** Position and dimensions */
  position: BoundingBox;

  /** Processing priority */
  priority: number;
}

/**
 * Visual document structure
 */
export interface VisualDocument {
  /** Extracted text elements */
  textElements: VisualElement[];

  /** Extracted image elements */
  imageElements: ExtractedImage[];

  /** Rendered page images */
  pageImages: Buffer[];

  /** Detected QR codes */
  detectedQRCodes: ExtractedImage[];

  /** Detected logos */
  detectedLogos: ExtractedImage[];

  /** Visual complexity assessment */
  visualComplexity: 'simple' | 'moderate' | 'complex';
}

/**
 * Standard interface for all PDF conversion services
 */
export interface PDFConversionService {
  /**
   * Convert PDF to Office format (PPTX, DOCX, or XLSX)
   * @param inputPath Path to input PDF file
   * @param outputDir Directory for output files
   * @param options Conversion options (include requestedOutputFormat for DOCX/XLSX)
   * @returns Promise resolving to conversion result
   */
  convertPDFToOffice(
    inputPath: string,
    outputDir: string,
    options?: ConversionOptions
  ): Promise<ConversionResult>;

  /**
   * @deprecated Use convertPDFToOffice instead. This method is kept for backward compatibility.
   * Convert PDF to PowerPoint presentation
   * @param inputPath Path to input PDF file
   * @param outputDir Directory for output files
   * @param options Conversion options
   * @returns Promise resolving to conversion result
   */
  convertPDFToPPT?(
    inputPath: string,
    outputDir: string,
    options?: ConversionOptions
  ): Promise<ConversionResult>;
}

/**
 * Engine selection service interface
 */
export interface EngineSelectionService {
  /**
   * Analyze document and recommend optimal engine
   * @param inputPath Path to input PDF file
   * @returns Promise resolving to engine recommendation
   */
  recommendEngine(inputPath: string): Promise<EngineRecommendation>;

  /**
   * Get performance analytics for all engines
   * @returns Array of engine performance metrics
   */
  getEngineAnalytics(): EnginePerformanceMetrics[];
}

/**
 * Quality assessment service interface
 */
export interface QualityAssessmentService {
  /**
   * Assess conversion quality
   * @param originalPath Path to original PDF
   * @param convertedPath Path to converted PowerPoint
   * @returns Promise resolving to quality metrics
   */
  assessQuality(originalPath: string, convertedPath: string): Promise<QualityMetrics>;
}

/**
 * Error types for PDF conversion
 */
export enum ConversionErrorType {
  INVALID_INPUT = 'INVALID_INPUT',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  QUALITY_VALIDATION_FAILED = 'QUALITY_VALIDATION_FAILED',
  OUTPUT_GENERATION_FAILED = 'OUTPUT_GENERATION_FAILED',
  ENGINE_SELECTION_FAILED = 'ENGINE_SELECTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  INSUFFICIENT_RESOURCES = 'INSUFFICIENT_RESOURCES'
}

/**
 * PDF conversion error class
 */
export class PDFConversionError extends Error {
  constructor(
    public type: ConversionErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PDFConversionError';
  }
}

/**
 * Type guards for conversion results
 */
export namespace ConversionTypeGuards {
  export function isConversionResult(obj: any): obj is ConversionResult {
    return obj && typeof obj.filename === 'string';
  }

  export function isEnhancedConversionResult(obj: any): obj is EnhancedConversionResult {
    return isConversionResult(obj) && typeof (obj as any).engine === 'string';
  }

  export function hasQualityResult(result: ConversionResult): result is ConversionResult & { qualityResult: QualityValidationResult } {
    return result.qualityResult !== undefined;
  }
}

// Re-export commonly used types for convenience
export {
  type QualityValidationResult,
  type QualityValidationRequest,
  type ImageQualityMetrics,
  type QualityIssue,
  validateOutputQuality,
  QualityValidationEngine
} from '../middleware/quality-validation.middleware';