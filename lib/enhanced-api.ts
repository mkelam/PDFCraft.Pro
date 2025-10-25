/**
 * Enhanced API Client - PDFCraft.Pro
 * Revolutionary OCR Overlay system integration for Next.js frontend
 * Provides 90%+ text accuracy with 99% image preservation
 */

import { CONFIG } from '@/config/shared.config';

// Use enhanced OCR Overlay API endpoints - BMAD Shared Config
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || CONFIG.API_BASE_URL;

console.log(`🚀 Enhanced OCR Overlay API: ${API_BASE_URL}`);

export interface EnhancedConversionRequest {
  performanceMode?: 'speed' | 'balanced' | 'quality';
  useEnhancements?: boolean;
  realTimeProgress?: boolean;
}

export interface EnhancedConversionResponse {
  success: boolean;
  message: string;
  jobId: string;
  estimatedTime: number;
  features: {
    ocrOverlaySystem: boolean;
    imagePreservation: string;
    textAccuracy: string;
    processingSpeed: string;
    enhancementsEnabled: boolean;
  };
  statusUrl: string;
  downloadUrl: string;
}

export interface EnhancedJobStatus {
  success: boolean;
  job: {
    id: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    currentPhase: string;
    createdAt: string;
    completedAt?: string;
    processingTime?: number;
    enhancementMetrics?: {
      imageProcessingImprovements: any;
      multiQualityResults: any;
      ocrEnhancements: any;
      textAnalysisResults: any;
      powerpointFeatures: any;
      performanceOptimizations: any;
    };
    qualityMetrics?: {
      textAccuracy: number;
      imagePreservation: number;
      overallQuality: number;
    };
    downloadUrl?: string;
    outputFile?: string;
    errorMessage?: string;
    estimatedTimeRemaining?: number;
    progressEvents?: any[];
  };
}

export interface ServiceStatus {
  success: boolean;
  service: string;
  version: string;
  phase: string;
  capabilities: {
    basicConversion: boolean;
    advancedImageProcessing: boolean;
    multiQualityExtraction: boolean;
    enhancedOCR: boolean;
    smartTextAnalysis: boolean;
    advancedPowerPoint: boolean;
    performanceOptimization: boolean;
    realTimeMonitoring: boolean;
    comprehensiveReporting: boolean;
  };
  performance: {
    targetSpeed: string;
    targetAccuracy: string;
    targetQuality: string;
  };
  status: string;
  uptime: number;
  memoryUsage: any;
  features: {
    revolutionaryOCROverlay: boolean;
    week2Enhancements: boolean;
    productionReady: boolean;
    realTimeProgress: boolean;
    90percentAccuracy: boolean;
    sub5SecondSpeed: boolean;
  };
}

export interface ConversionProgress {
  phase: string;
  progress: number;
  message: string;
  timeElapsed: number;
  estimatedTimeRemaining: number;
  phaseDetails?: {
    currentOperation: string;
    itemsProcessed: number;
    totalItems: number;
    qualityMetrics: any;
  };
}

export class EnhancedPDFCraftAPI {
  /**
   * Convert PDF to PowerPoint using revolutionary OCR Overlay system
   */
  static async convertPDFToPowerPoint(
    file: File,
    options: EnhancedConversionRequest = {}
  ): Promise<EnhancedConversionResponse> {
    try {
      // Validate file
      const validation = this.validatePDFFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      console.log(`🚀 Starting OCR Overlay conversion for: ${file.name}`);
      console.log(`📊 Mode: ${options.performanceMode || 'auto-detect'}`);
      console.log(`⚡ Enhancements: ${options.useEnhancements !== false ? 'ALL ENABLED' : 'BASIC'}`);

      const formData = new FormData();
      formData.append('files', file);

      // Add options as form data
      if (options.performanceMode) {
        formData.append('performanceMode', options.performanceMode);
      }
      if (options.useEnhancements !== undefined) {
        formData.append('useEnhancements', String(options.useEnhancements));
      }

      const response = await fetch(`${API_BASE_URL}/api/convert/enhanced/pdf-to-powerpoint`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      console.log(`✅ Conversion job started: ${result.jobId}`);
      console.log(`📊 Features: ${Object.entries(result.features).map(([k,v]) => `${k}:${v}`).join(', ')}`);

      return result;

    } catch (error) {
      console.error('❌ Enhanced conversion failed:', error);
      throw new Error(`OCR Overlay conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get enhanced job status with real-time progress
   */
  static async getEnhancedJobStatus(jobId: string): Promise<EnhancedJobStatus> {
    try {
      // Add cache busting to ensure fresh data
      const timestamp = Date.now();
      const response = await fetch(`${API_BASE_URL}/api/convert/enhanced/status/${jobId}?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        throw new Error(`Status check failed: HTTP ${response.status}`);
      }

      const status = await response.json();
      return status;

    } catch (error) {
      throw new Error(`Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get OCR Overlay service status and capabilities
   */
  static async getServiceStatus(): Promise<ServiceStatus> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/convert/enhanced/service-status`);

      if (!response.ok) {
        throw new Error(`Service status check failed: HTTP ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      throw new Error(`Service status failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check OCR Overlay system health
   */
  static async checkHealth(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/convert/enhanced/health`);

      if (!response.ok) {
        throw new Error(`Health check failed: HTTP ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      throw new Error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Poll for conversion completion with real-time progress
   */
  static async pollConversionWithProgress(
    jobId: string,
    onProgress?: (progress: ConversionProgress) => void
  ): Promise<EnhancedJobStatus> {
    const maxAttempts = 300; // 5 minutes max for high-quality conversion
    let attempts = 0;
    let lastProgress = 0;

    console.log(`🔄 Starting progress polling for job: ${jobId}`);

    while (attempts < maxAttempts) {
      try {
        const status = await this.getEnhancedJobStatus(jobId);
        const job = status.job;

        // Calculate progress information
        const progress: ConversionProgress = {
          phase: job.currentPhase || 'initializing',
          progress: job.progress || 0,
          message: this.getProgressMessage(job.currentPhase, job.progress),
          timeElapsed: job.createdAt ? Date.now() - new Date(job.createdAt).getTime() : 0,
          estimatedTimeRemaining: job.estimatedTimeRemaining || 0
        };

        // Call progress callback if progress changed
        if (onProgress && (job.progress !== lastProgress || attempts === 0)) {
          onProgress(progress);
          lastProgress = job.progress;
        }

        console.log(`📊 Poll ${attempts + 1}: ${job.status} - ${job.currentPhase} - ${job.progress}%`);

        // Handle completion
        if (job.status === 'completed') {
          console.log(`🎉 Conversion completed successfully!`);
          console.log(`📊 Quality metrics:`, job.qualityMetrics);
          if (onProgress) {
            onProgress({
              ...progress,
              progress: 100,
              message: 'Conversion completed successfully!'
            });
          }
          return status;
        }

        // Handle failure
        if (job.status === 'failed') {
          const error = job.errorMessage || 'Conversion failed for unknown reason';
          console.error(`❌ Conversion failed: ${error}`);
          throw new Error(error);
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

      } catch (error) {
        console.error(`❌ Poll error:`, error);
        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
    }

    throw new Error('Conversion timeout - processing took longer than expected');
  }

  /**
   * Get user-friendly progress message
   */
  private static getProgressMessage(phase: string, progress: number): string {
    const messages = {
      'initializing': 'Preparing OCR Overlay system...',
      'multi-quality-extraction': 'Extracting images with optimal quality...',
      'advanced-image-processing': 'Enhancing images for better OCR...',
      'enhanced-ocr-processing': 'Performing intelligent text recognition...',
      'smart-text-analysis': 'Analyzing text layout and structure...',
      'advanced-powerpoint-generation': 'Creating professional PowerPoint...',
      'quality-validation': 'Validating output quality...',
      'processing': progress < 20 ? 'Starting conversion...' :
                  progress < 40 ? 'Extracting and processing images...' :
                  progress < 70 ? 'Recognizing text with OCR...' :
                  progress < 90 ? 'Generating PowerPoint presentation...' :
                  'Finalizing conversion...'
    };

    return messages[phase as keyof typeof messages] || `Processing... ${progress}%`;
  }

  /**
   * Validate PDF file for enhanced conversion
   */
  static validatePDFFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'Only PDF files are supported for OCR Overlay conversion' };
    }

    // Check file size (100MB limit for enhanced conversion)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 100MB limit' };
    }

    // Check minimum size
    if (file.size < 1024) {
      return { valid: false, error: 'File appears to be empty or corrupted' };
    }

    // Check file extension
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return { valid: false, error: 'File must have .pdf extension' };
    }

    return { valid: true };
  }

  /**
   * Get performance mode recommendation based on file characteristics
   */
  static getPerformanceModeRecommendation(file: File): {
    mode: 'speed' | 'balanced' | 'quality';
    reason: string;
  } {
    const fileSizeMB = file.size / (1024 * 1024);

    if (fileSizeMB < 5) {
      return {
        mode: 'quality',
        reason: 'Small file - can handle maximum quality processing'
      };
    } else if (fileSizeMB < 25) {
      return {
        mode: 'balanced',
        reason: 'Medium file - balanced speed and quality optimal'
      };
    } else {
      return {
        mode: 'speed',
        reason: 'Large file - prioritizing speed while maintaining good quality'
      };
    }
  }

  /**
   * Format processing time for display
   */
  static formatProcessingTime(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Get download URL for converted file
   */
  static getDownloadUrl(filename: string): string {
    return `${API_BASE_URL}/api/download/${filename}`;
  }

  /**
   * Trigger download of converted file
   */
  static triggerDownload(filename: string, originalName?: string): void {
    const downloadUrl = this.getDownloadUrl(filename);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = originalName?.replace('.pdf', '.pptx') || filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Get quality score color for UI display
   */
  static getQualityScoreColor(score: number): string {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  }

  /**
   * Get processing phase icon
   */
  static getPhaseIcon(phase: string): string {
    const icons = {
      'initializing': '🚀',
      'multi-quality-extraction': '📸',
      'advanced-image-processing': '🎨',
      'enhanced-ocr-processing': '🔍',
      'smart-text-analysis': '🧠',
      'advanced-powerpoint-generation': '📋',
      'quality-validation': '✅',
      'processing': '⚡',
      'completed': '🎉',
      'failed': '❌'
    };

    return icons[phase as keyof typeof icons] || '🔄';
  }

  /**
   * Get feature description for UI
   */
  static getFeatureDescription(feature: string): string {
    const descriptions = {
      ocrOverlaySystem: 'Revolutionary invisible text overlay technology',
      imagePreservation: 'Perfect visual fidelity maintenance',
      textAccuracy: 'Advanced multi-pass OCR intelligence',
      processingSpeed: 'Optimized performance modes',
      enhancementsEnabled: 'All Week 2 enhancement features active'
    };

    return descriptions[feature as keyof typeof descriptions] || feature;
  }
}

// Export individual functions for convenience
export const {
  convertPDFToPowerPoint,
  getEnhancedJobStatus,
  getServiceStatus,
  checkHealth,
  pollConversionWithProgress,
  validatePDFFile,
  getPerformanceModeRecommendation,
  formatProcessingTime,
  getDownloadUrl,
  triggerDownload,
  formatFileSize,
  getQualityScoreColor,
  getPhaseIcon,
  getFeatureDescription
} = EnhancedPDFCraftAPI;