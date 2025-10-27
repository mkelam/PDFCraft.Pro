/**
 * Conversion Types - Centralized type definitions for PDF conversion operations
 *
 * This file defines all conversion-related types used across the application.
 * By centralizing these types, we ensure consistency and prevent TypeScript compilation errors.
 *
 * IMPORTANT: When adding new conversion types:
 * 1. Add the type to ConversionType union below
 * 2. Update production-monitoring.middleware.ts to accept the new type
 * 3. Implement the corresponding controller method in ConvertController
 * 4. Add the endpoint route in server.ts
 *
 * @author Claude Code
 * @date 2025-10-27
 */

/**
 * All supported conversion operation types
 *
 * Currently supported:
 * - 'pdf-to-ppt': PDF to PowerPoint conversion with OCR support
 * - 'pdf-merge': Merge multiple PDF files into one
 *
 * Future planned:
 * - 'pdf-to-word': PDF to Word conversion
 * - 'pdf-to-excel': PDF to Excel conversion
 * - 'pdf-to-office': Generic PDF to Office format conversion
 * - 'pdf-to-images': PDF to image files conversion
 */
export type ConversionType =
  | 'pdf-to-ppt'
  | 'pdf-merge'
  // Future conversion types - uncomment when implemented:
  // | 'pdf-to-word'
  // | 'pdf-to-excel'
  // | 'pdf-to-office'
  // | 'pdf-to-images'
  ;

/**
 * Conversion job status
 */
export type ConversionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Conversion job interface
 */
export interface ConversionJob {
  id: string;
  userId: string;
  type: ConversionType;
  status: ConversionStatus;
  progress: number;
  inputFiles: string[];
  outputFile?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * Conversion request parameters
 */
export interface ConversionRequest {
  userId: string;
  type: ConversionType;
  files: Express.Multer.File[];
  options?: ConversionOptions;
}

/**
 * Conversion options
 */
export interface ConversionOptions {
  // PDF to PPT options
  preserveLayout?: boolean;
  enableOCR?: boolean;
  ocrLanguage?: string;
  quality?: 'low' | 'medium' | 'high';

  // PDF merge options
  includeBookmarks?: boolean;

  // Common options
  timeout?: number;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Conversion result
 */
export interface ConversionResult {
  success: boolean;
  jobId: string;
  outputFile?: string;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    inputPages?: number;
    outputPages?: number;
    processingTime?: number;
    ocrConfidence?: number;
  };
}
