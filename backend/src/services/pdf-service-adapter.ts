/**
 * PDF SERVICE ADAPTER
 *
 * Provides a standardized interface for all PDF conversion services
 * Handles type conversions and ensures consistency across legacy and new services
 */

import {
  ConversionResult,
  ConversionOptions,
  PDFConversionService,
  ConversionTypeGuards
} from '../types/pdf-conversion.types';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Legacy service interface (services that return string)
 */
interface LegacyPDFService {
  convertPDFToPPT(inputPath: string, outputDir: string, originalFilename?: string): Promise<string>;
}

/**
 * Enhanced legacy service interface (services that return {filename, qualityResult})
 */
interface EnhancedLegacyPDFService {
  convertPDFToPPT(inputPath: string, outputDir: string, options?: any): Promise<{
    filename: string;
    qualityResult?: any;
  }>;
}

/**
 * Service adapter that wraps legacy services to provide unified interface
 */
export class PDFServiceAdapter implements PDFConversionService {
  constructor(
    private service: any,
    private serviceType: 'legacy' | 'enhanced' | 'modern' = 'legacy'
  ) {}

  /**
   * Convert PDF to Office format (PPTX, DOCX, or XLSX)
   * This is the new standardized method
   */
  async convertPDFToOffice(
    inputPath: string,
    outputDir: string,
    options?: ConversionOptions
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      let result: any;

      // Check if the service has the new convertPDFToOffice method
      if (this.service.convertPDFToOffice && typeof this.service.convertPDFToOffice === 'function') {
        result = await this.service.convertPDFToOffice(inputPath, outputDir, options);
        if (ConversionTypeGuards.isConversionResult(result)) {
          return result;
        }
      } else {
        // Fallback to convertPDFToPPT for backward compatibility
        return this.convertPDFToOffice(inputPath, outputDir, options);
      }

      // Convert result to standardized format
      return this.normalizeResult(result, inputPath, outputDir, Date.now() - startTime);

    } catch (error) {
      throw error; // Re-throw with original error
    }
  }

  /**
   * @deprecated Use convertPDFToOffice instead. Kept for backward compatibility.
   */
  async convertPDFToPPT(
    inputPath: string,
    outputDir: string,
    options?: ConversionOptions
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      let result: any;

      // Call the service based on its type
      switch (this.serviceType) {
        case 'modern':
          // Service already returns ConversionResult
          result = await this.service.convertPDFToOffice(inputPath, outputDir, options);
          if (ConversionTypeGuards.isConversionResult(result)) {
            return result;
          }
          break;

        case 'enhanced':
          // Service returns {filename, qualityResult?}
          result = await this.service.convertPDFToOffice(inputPath, outputDir, options);
          break;

        case 'legacy':
        default:
          // Service returns string filename
          const filename = await this.service.convertPDFToOffice(inputPath, outputDir);
          result = { filename };
          break;
      }

      // Convert result to standardized format
      return this.normalizeResult(result, inputPath, outputDir, Date.now() - startTime);

    } catch (error) {
      throw error; // Re-throw with original error
    }
  }

  /**
   * Normalize result to ConversionResult format
   */
  private async normalizeResult(
    result: any,
    inputPath: string,
    outputDir: string,
    processingTime: number
  ): Promise<ConversionResult> {
    let filename: string;
    let qualityResult: any;

    // Extract filename and quality result
    if (typeof result === 'string') {
      filename = result;
    } else if (result && typeof result.filename === 'string') {
      filename = result.filename;
      qualityResult = result.qualityResult;
    } else {
      throw new Error('Invalid service result format');
    }

    // Get file stats
    const outputPath = path.join(outputDir, filename);
    let outputSize = 0;
    try {
      const stats = await fs.stat(outputPath);
      outputSize = stats.size;
    } catch (error) {
      // File may not exist yet, that's ok
    }

    let inputSize = 0;
    try {
      const stats = await fs.stat(inputPath);
      inputSize = stats.size;
    } catch (error) {
      // Input file should exist, but handle gracefully
    }

    // Create standardized result
    const conversionResult: ConversionResult = {
      filename,
      qualityResult,
      processingTime,
      success: true,
      metadata: {
        originalFilename: path.basename(inputPath),
        inputSize,
        outputSize,
        pageCount: 1, // Default, would need actual PDF parsing to get real count
        timestamp: new Date().toISOString(),
        engineVersion: this.service.constructor?.name || 'unknown'
      }
    };

    return conversionResult;
  }
}

/**
 * Service factory for creating standardized PDF services
 */
export class PDFServiceFactory {
  /**
   * Create a standardized service from a legacy service
   */
  static createStandardizedService(
    serviceClass: any,
    serviceType: 'legacy' | 'enhanced' | 'modern' = 'legacy'
  ): PDFConversionService {
    return new PDFServiceAdapter(serviceClass, serviceType);
  }

  /**
   * Auto-detect service type and create adapter
   */
  static createAdaptiveService(serviceClass: any): PDFConversionService {
    // Try to detect service type based on method signature
    const method = serviceClass.convertPDFToPPT;
    if (!method) {
      throw new Error('Service must have convertPDFToPPT method');
    }

    // Check if it's already a modern service by looking at the prototype
    if (serviceClass.prototype &&
        serviceClass.prototype.constructor &&
        serviceClass.prototype.constructor.name.includes('PDFConversionService')) {
      return new PDFServiceAdapter(serviceClass, 'modern');
    }

    // For now, assume enhanced for the services we've updated
    const enhancedServices = [
      'VisualFidelityPDFService',
      'ImprovedPDFService',
      'SemanticValidationPDFService',
      'OptimizedEngineSelectionService'
    ];

    const serviceName = serviceClass.constructor?.name || serviceClass.name;
    if (enhancedServices.includes(serviceName)) {
      return new PDFServiceAdapter(serviceClass, 'modern');
    }

    // Default to legacy
    return new PDFServiceAdapter(serviceClass, 'legacy');
  }

  /**
   * Get all available services in standardized format
   */
  static getAllStandardizedServices(): { [key: string]: PDFConversionService } {
    // Import services dynamically
    const services: { [key: string]: PDFConversionService } = {};

    try {
      const { VisualFidelityPDFService } = require('./visual-fidelity-pdf.service');
      services.visualFidelity = this.createStandardizedService(VisualFidelityPDFService, 'modern');
    } catch (error) {
      console.warn('Failed to load VisualFidelityPDFService:', error);
    }

    try {
      const { ImprovedPDFService } = require('./improved-pdf.service');
      services.improved = this.createStandardizedService(ImprovedPDFService, 'modern');
    } catch (error) {
      console.warn('Failed to load ImprovedPDFService:', error);
    }

    try {
      const { SemanticValidationPDFService } = require('./semantic-validation-pdf.service');
      services.semanticValidation = this.createStandardizedService(SemanticValidationPDFService, 'modern');
    } catch (error) {
      console.warn('Failed to load SemanticValidationPDFService:', error);
    }

    try {
      const { OptimizedEngineSelectionService } = require('./optimized-engine-selection.service');
      services.optimized = this.createStandardizedService(OptimizedEngineSelectionService, 'modern');
    } catch (error) {
      console.warn('Failed to load OptimizedEngineSelectionService:', error);
    }

    // Add legacy services
    try {
      const { LayoutAwarePDFService } = require('./layout-aware-pdf.service');
      services.layoutAware = this.createStandardizedService(LayoutAwarePDFService, 'legacy');
    } catch (error) {
      console.warn('Failed to load LayoutAwarePDFService:', error);
    }

    try {
      const { EnhancedSpacingPDFService } = require('./enhanced-spacing-pdf.service');
      services.enhancedSpacing = this.createStandardizedService(EnhancedSpacingPDFService, 'legacy');
    } catch (error) {
      console.warn('Failed to load EnhancedSpacingPDFService:', error);
    }

    return services;
  }
}

/**
 * Default export for the factory
 */
export default PDFServiceFactory;