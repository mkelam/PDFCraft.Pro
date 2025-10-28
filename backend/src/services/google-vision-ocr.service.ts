import { promises as fs } from 'fs';
import path from 'path';

/**
 * Google Vision OCR Service
 * Cloud OCR integration with Google Vision API
 * Phase 3 Cloud Integration - Week 3 Monday-Tuesday
 */
export class GoogleVisionOCRService {

  private static readonly API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

  private static readonly PRICING = {
    TEXT_DETECTION: 0.0015,        // $1.50 per 1000 requests
    DOCUMENT_TEXT_DETECTION: 0.0015, // $1.50 per 1000 requests (first 1000 free)
    HANDWRITING_DETECTION: 0.006    // $6.00 per 1000 requests
  };

  private static readonly RATE_LIMITS = {
    REQUESTS_PER_MINUTE: 1800,     // 1800 requests per minute
    REQUESTS_PER_DAY: 24000000,    // 24 million requests per day
    MAX_FILE_SIZE: 20 * 1024 * 1024 // 20MB max file size
  };

  private static readonly CONFIDENCE_THRESHOLDS = {
    HIGH: 0.95,
    MEDIUM: 0.80,
    LOW: 0.60
  };

  /**
   * Check if Google Vision API is available and configured
   */
  static async isAvailable(): Promise<{
    available: boolean;
    error?: string;
    configuration?: {
      hasApiKey: boolean;
      hasServiceAccount: boolean;
      quotaStatus: string;
    };
  }> {
    try {
      const apiKey = process.env.GOOGLE_VISION_API_KEY;
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

      if (!apiKey && !serviceAccountPath) {
        return {
          available: false,
          error: 'No Google Vision API credentials configured'
        };
      }

      // Test API connectivity with a minimal request
      const testResponse = await this.testConnectivity(apiKey);

      return {
        available: testResponse.success,
        error: testResponse.error,
        configuration: {
          hasApiKey: !!apiKey,
          hasServiceAccount: !!serviceAccountPath,
          quotaStatus: testResponse.quotaStatus || 'unknown'
        }
      };

    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown configuration error'
      };
    }
  }

  /**
   * Perform OCR text detection using Google Vision API
   */
  static async extractText(
    imagePath: string,
    options: {
      detectionType?: 'TEXT_DETECTION' | 'DOCUMENT_TEXT_DETECTION' | 'HANDWRITING_DETECTION';
      languages?: string[];
      includeConfidence?: boolean;
      timeout?: number;
    } = {}
  ): Promise<{
    text: string;
    confidence: number;
    detailedResults: any;
    processingTime: number;
    cost: number;
    metadata: {
      language?: string;
      orientation?: number;
      paragraphs?: number;
      words?: number;
      characters?: number;
    };
  }> {
    const startTime = Date.now();
    const detectionType = options.detectionType || 'DOCUMENT_TEXT_DETECTION';

    console.log(`🌟 [GOOGLE-VISION] Processing with ${detectionType}: ${path.basename(imagePath)}`);

    try {
      // Validate file size
      const stats = await fs.stat(imagePath);
      if (stats.size > this.RATE_LIMITS.MAX_FILE_SIZE) {
        throw new Error(`File size ${stats.size} exceeds Google Vision limit of ${this.RATE_LIMITS.MAX_FILE_SIZE} bytes`);
      }

      // Read and encode image
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // Prepare API request
      const requestBody = {
        requests: [{
          image: {
            content: base64Image
          },
          features: [{
            type: detectionType,
            maxResults: 1
          }],
          imageContext: options.languages ? {
            languageHints: options.languages
          } : undefined
        }]
      };

      // Make API call
      const response = await this.makeVisionAPICall(requestBody, options.timeout);

      // Process response
      const result = this.processVisionResponse(response, detectionType);
      const processingTime = Date.now() - startTime;
      const cost = this.calculateCost(detectionType, 1);

      console.log(`✅ [GOOGLE-VISION] Extraction completed in ${processingTime}ms (cost: $${cost.toFixed(4)})`);

      return {
        text: result.text,
        confidence: result.confidence,
        detailedResults: result.detailedResults,
        processingTime,
        cost,
        metadata: result.metadata
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ [GOOGLE-VISION] Extraction failed after ${processingTime}ms:`, error);

      throw new Error(`Google Vision OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch process multiple images
   */
  static async batchExtractText(
    imagePaths: string[],
    options: {
      detectionType?: 'TEXT_DETECTION' | 'DOCUMENT_TEXT_DETECTION' | 'HANDWRITING_DETECTION';
      languages?: string[];
      maxConcurrent?: number;
      timeout?: number;
    } = {}
  ): Promise<{
    results: Array<{
      imagePath: string;
      success: boolean;
      text?: string;
      confidence?: number;
      cost?: number;
      error?: string;
    }>;
    totalCost: number;
    totalProcessingTime: number;
  }> {
    const startTime = Date.now();
    const maxConcurrent = options.maxConcurrent || 5;
    const results: any[] = [];
    let totalCost = 0;

    console.log(`🌟 [GOOGLE-VISION] Batch processing ${imagePaths.length} images (max ${maxConcurrent} concurrent)`);

    // Process in batches to respect rate limits
    for (let i = 0; i < imagePaths.length; i += maxConcurrent) {
      const batch = imagePaths.slice(i, i + maxConcurrent);

      const batchPromises = batch.map(async (imagePath) => {
        try {
          const result = await this.extractText(imagePath, options);
          totalCost += result.cost;

          return {
            imagePath,
            success: true,
            text: result.text,
            confidence: result.confidence,
            cost: result.cost
          };
        } catch (error) {
          return {
            imagePath,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Rate limiting delay between batches
      if (i + maxConcurrent < imagePaths.length) {
        await this.delay(1000); // 1 second delay between batches
      }
    }

    const totalProcessingTime = Date.now() - startTime;

    console.log(`✅ [GOOGLE-VISION] Batch completed: ${results.filter(r => r.success).length}/${imagePaths.length} successful (${totalProcessingTime}ms, $${totalCost.toFixed(4)})`);

    return {
      results,
      totalCost,
      totalProcessingTime
    };
  }

  /**
   * Analyze document structure and recommend optimal OCR approach
   */
  static async analyzeDocument(imagePath: string): Promise<{
    documentType: 'printed' | 'handwritten' | 'mixed' | 'form' | 'table';
    recommendedDetectionType: 'TEXT_DETECTION' | 'DOCUMENT_TEXT_DETECTION' | 'HANDWRITING_DETECTION';
    confidence: number;
    estimatedCost: number;
    recommendations: string[];
  }> {
    console.log(`🔍 [GOOGLE-VISION] Analyzing document structure: ${path.basename(imagePath)}`);

    try {
      // Use basic text detection for structure analysis (cheaper)
      const result = await this.extractText(imagePath, {
        detectionType: 'TEXT_DETECTION',
        includeConfidence: true
      });

      // Analyze the response to determine document characteristics
      const analysis = this.analyzeTextStructure(result.detailedResults);

      return {
        documentType: analysis.documentType,
        recommendedDetectionType: analysis.recommendedDetectionType,
        confidence: analysis.confidence,
        estimatedCost: this.calculateCost(analysis.recommendedDetectionType, 1),
        recommendations: analysis.recommendations
      };

    } catch (error) {
      console.error(`❌ [GOOGLE-VISION] Document analysis failed:`, error);

      // Fallback recommendation
      return {
        documentType: 'printed',
        recommendedDetectionType: 'DOCUMENT_TEXT_DETECTION',
        confidence: 0.5,
        estimatedCost: this.PRICING.DOCUMENT_TEXT_DETECTION,
        recommendations: ['Analysis failed - using conservative approach']
      };
    }
  }

  /**
   * Get current usage statistics and quota information
   */
  static async getUsageStats(): Promise<{
    quotaUsed: {
      textDetection: number;
      documentTextDetection: number;
      handwritingDetection: number;
    };
    quotaRemaining: {
      textDetection: number;
      documentTextDetection: number;
      handwritingDetection: number;
    };
    costThisMonth: number;
    recommendedOptimizations: string[];
  }> {
    // This would typically integrate with Google Cloud Monitoring API
    // For now, return mock data structure
    return {
      quotaUsed: {
        textDetection: 0,
        documentTextDetection: 0,
        handwritingDetection: 0
      },
      quotaRemaining: {
        textDetection: 1000, // Free tier
        documentTextDetection: 1000, // Free tier
        handwritingDetection: 0
      },
      costThisMonth: 0,
      recommendedOptimizations: [
        'Use DOCUMENT_TEXT_DETECTION for structured documents',
        'Reserve HANDWRITING_DETECTION for confirmed handwritten content',
        'Implement client-side image optimization to reduce API calls'
      ]
    };
  }

  /**
   * Test API connectivity
   */
  private static async testConnectivity(apiKey?: string): Promise<{
    success: boolean;
    error?: string;
    quotaStatus?: string;
  }> {
    if (!apiKey) {
      return { success: false, error: 'No API key provided' };
    }

    try {
      // Make a minimal test request
      const testResponse = await fetch(`${this.API_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [{
            image: { content: '' }, // Empty test
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
          }]
        })
      });

      if (testResponse.status === 400) {
        // Expected for empty image, but confirms API is reachable
        return { success: true, quotaStatus: 'active' };
      }

      if (testResponse.status === 403) {
        return { success: false, error: 'API key invalid or quota exceeded' };
      }

      return { success: true, quotaStatus: 'active' };

    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown'}`
      };
    }
  }

  /**
   * Make Vision API call with error handling and retries
   */
  private static async makeVisionAPICall(
    requestBody: any,
    timeout: number = 30000
  ): Promise<any> {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;

    if (!apiKey) {
      throw new Error('Google Vision API key not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.API_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const result = await response.json();

      // Check for API-level errors
      if (result.responses?.[0]?.error) {
        throw new Error(`Vision API error: ${result.responses[0].error.message}`);
      }

      return result;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Process Vision API response
   */
  private static processVisionResponse(
    response: any,
    detectionType: string
  ): {
    text: string;
    confidence: number;
    detailedResults: any;
    metadata: any;
  } {
    const annotation = response.responses?.[0];

    if (!annotation) {
      throw new Error('No response from Vision API');
    }

    let text = '';
    let confidence = 0;
    const metadata: any = {};

    switch (detectionType) {
      case 'TEXT_DETECTION':
        if (annotation.textAnnotations?.[0]) {
          text = annotation.textAnnotations[0].description || '';
          confidence = this.calculateAverageConfidence(annotation.textAnnotations);
        }
        break;

      case 'DOCUMENT_TEXT_DETECTION':
        if (annotation.fullTextAnnotation) {
          text = annotation.fullTextAnnotation.text || '';
          confidence = this.calculateDocumentConfidence(annotation.fullTextAnnotation);

          // Extract metadata
          metadata.language = annotation.fullTextAnnotation.pages?.[0]?.property?.detectedLanguages?.[0]?.languageCode;
          metadata.paragraphs = annotation.fullTextAnnotation.pages?.[0]?.blocks?.length || 0;
          metadata.words = this.countWords(annotation.fullTextAnnotation);
          metadata.characters = text.length;
        }
        break;

      case 'HANDWRITING_DETECTION':
        if (annotation.textAnnotations?.[0]) {
          text = annotation.textAnnotations[0].description || '';
          confidence = this.calculateAverageConfidence(annotation.textAnnotations);
        }
        break;
    }

    return {
      text,
      confidence,
      detailedResults: annotation,
      metadata
    };
  }

  /**
   * Calculate cost for Vision API usage
   */
  private static calculateCost(detectionType: string, requestCount: number): number {
    switch (detectionType) {
      case 'TEXT_DETECTION':
        return requestCount * this.PRICING.TEXT_DETECTION;
      case 'DOCUMENT_TEXT_DETECTION':
        // First 1000 requests per month are free
        return Math.max(0, requestCount - 1000) * this.PRICING.DOCUMENT_TEXT_DETECTION;
      case 'HANDWRITING_DETECTION':
        return requestCount * this.PRICING.HANDWRITING_DETECTION;
      default:
        return requestCount * this.PRICING.DOCUMENT_TEXT_DETECTION;
    }
  }

  /**
   * Analyze text structure to determine document type
   */
  private static analyzeTextStructure(detailedResults: any): {
    documentType: 'printed' | 'handwritten' | 'mixed' | 'form' | 'table';
    recommendedDetectionType: 'TEXT_DETECTION' | 'DOCUMENT_TEXT_DETECTION' | 'HANDWRITING_DETECTION';
    confidence: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    // Analyze confidence patterns to detect handwriting
    const confidences = this.extractConfidences(detailedResults);
    const avgConfidence = confidences.length > 0 ?
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 0.5;

    const lowConfidenceRatio = confidences.filter(c => c < 0.7).length / confidences.length;

    // Determine document type
    let documentType: 'printed' | 'handwritten' | 'mixed' | 'form' | 'table' = 'printed';
    let recommendedDetectionType: 'TEXT_DETECTION' | 'DOCUMENT_TEXT_DETECTION' | 'HANDWRITING_DETECTION' = 'DOCUMENT_TEXT_DETECTION';

    if (lowConfidenceRatio > 0.4) {
      documentType = 'handwritten';
      recommendedDetectionType = 'HANDWRITING_DETECTION';
      recommendations.push('High handwriting content detected - use HANDWRITING_DETECTION for better accuracy');
    } else if (lowConfidenceRatio > 0.2) {
      documentType = 'mixed';
      recommendations.push('Mixed content detected - consider preprocessing or multiple detection passes');
    }

    // Check for table/form structure (simplified heuristic)
    const text = detailedResults.textAnnotations?.[0]?.description || '';
    const lineCount = text.split('\n').length;
    const tabCount = (text.match(/\t/g) || []).length;

    if (tabCount > lineCount * 0.3) {
      documentType = 'table';
      recommendations.push('Table structure detected - DOCUMENT_TEXT_DETECTION recommended for layout preservation');
    }

    return {
      documentType,
      recommendedDetectionType,
      confidence: avgConfidence,
      recommendations
    };
  }

  /**
   * Helper methods
   */
  private static calculateAverageConfidence(textAnnotations: any[]): number {
    if (!textAnnotations || textAnnotations.length <= 1) return 0.8; // Default confidence

    // Skip first annotation (full text) and calculate average of word confidences
    const wordAnnotations = textAnnotations.slice(1);
    const confidences = wordAnnotations
      .map(annotation => annotation.confidence || 0.8)
      .filter(confidence => confidence > 0);

    return confidences.length > 0 ?
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 0.8;
  }

  private static calculateDocumentConfidence(fullTextAnnotation: any): number {
    // Extract confidence from page-level detection
    const pages = fullTextAnnotation.pages || [];
    let totalConfidence = 0;
    let count = 0;

    pages.forEach((page: any) => {
      page.blocks?.forEach((block: any) => {
        if (block.confidence !== undefined) {
          totalConfidence += block.confidence;
          count++;
        }
      });
    });

    return count > 0 ? totalConfidence / count : 0.8;
  }

  private static countWords(fullTextAnnotation: any): number {
    let wordCount = 0;

    fullTextAnnotation.pages?.forEach((page: any) => {
      page.blocks?.forEach((block: any) => {
        block.paragraphs?.forEach((paragraph: any) => {
          wordCount += paragraph.words?.length || 0;
        });
      });
    });

    return wordCount;
  }

  private static extractConfidences(detailedResults: any): number[] {
    const textAnnotations = detailedResults.textAnnotations || [];
    return textAnnotations.slice(1).map((annotation: any) => annotation.confidence || 0.8);
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}