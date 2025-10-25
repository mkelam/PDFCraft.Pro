import { logger } from '../utils/logger';
import { GoogleVisionOCRService } from './google-vision-ocr.service';
import { AWSTextractOCRService } from './aws-textract-ocr.service';
import { TesseractWrapper } from './tesseract-wrapper.service';

/**
 * Cloud OCR Cost Optimization Engine
 *
 * Phase 3 - Cloud Integration Service
 * Intelligently selects the most cost-effective OCR engine based on:
 * - Document characteristics
 * - Quality requirements
 * - Budget constraints
 * - Performance requirements
 * - Historical accuracy data
 */

export interface CostAnalysis {
  engine: 'tesseract' | 'google-vision' | 'aws-textract';
  estimatedCost: number;
  estimatedAccuracy: number;
  estimatedTime: number;
  confidenceLevel: number;
  reasoning: string[];
}

export interface OptimizationOptions {
  maxBudget?: number; // Maximum cost per operation in USD
  minAccuracy?: number; // Minimum required accuracy (0-1)
  maxProcessingTime?: number; // Maximum processing time in seconds
  documentType?: 'text' | 'mixed' | 'handwritten' | 'form' | 'table' | 'receipt';
  qualityLevel?: 'basic' | 'good' | 'high' | 'premium';
  prioritizeSpeed?: boolean;
  prioritizeCost?: boolean;
  prioritizeAccuracy?: boolean;
}

export interface DocumentCharacteristics {
  fileSize: number; // in bytes
  imageResolution?: { width: number; height: number };
  estimatedPages: number;
  hasText: boolean;
  hasHandwriting: boolean;
  hasTables: boolean;
  hasForms: boolean;
  textDensity: 'low' | 'medium' | 'high';
  imageQuality: 'poor' | 'fair' | 'good' | 'excellent';
}

export interface EngineRecommendation {
  primaryEngine: CostAnalysis;
  fallbackEngines: CostAnalysis[];
  totalBudgetImpact: number;
  recommendationScore: number;
  riskAssessment: {
    costRisk: 'low' | 'medium' | 'high';
    accuracyRisk: 'low' | 'medium' | 'high';
    timeRisk: 'low' | 'medium' | 'high';
  };
}

export class CloudOCRCostOptimizer {

  // Pricing models (per 1000 operations/pages)
  private static readonly PRICING = {
    tesseract: { cost: 0, processingTime: 3000 }, // Free, ~3s average
    googleVision: {
      textDetection: 1.50,
      documentDetection: 1.50,
      handwritingDetection: 1.50,
      processingTime: 1200 // ~1.2s average
    },
    awsTextract: {
      textDetection: 1.50,
      documentAnalysis: 10.00,
      expenseAnalysis: 50.00,
      processingTime: 2000 // ~2s average
    }
  };

  // Historical accuracy data (mock data for now)
  private static readonly ACCURACY_BENCHMARKS = {
    tesseract: {
      text: 0.89,
      mixed: 0.75,
      handwritten: 0.45,
      form: 0.70,
      table: 0.65,
      receipt: 0.72
    },
    googleVision: {
      text: 0.95,
      mixed: 0.91,
      handwritten: 0.78,
      form: 0.88,
      table: 0.85,
      receipt: 0.92
    },
    awsTextract: {
      text: 0.94,
      mixed: 0.89,
      handwritten: 0.72,
      form: 0.95,
      table: 0.93,
      receipt: 0.90
    }
  };

  /**
   * Analyze document characteristics to inform engine selection
   */
  static async analyzeDocumentCharacteristics(
    imagePath: string,
    metadata?: Partial<DocumentCharacteristics>
  ): Promise<DocumentCharacteristics> {
    try {
      logger.info('📊 [COST-OPTIMIZER] Analyzing document characteristics...');

      // Use ImageMagick to get basic image info
      const { promises: fs } = await import('fs');
      const stats = await fs.stat(imagePath);

      // Mock analysis for now - in production, use actual image analysis
      const characteristics: DocumentCharacteristics = {
        fileSize: stats.size,
        imageResolution: metadata?.imageResolution || { width: 2480, height: 3508 }, // A4 at 300 DPI
        estimatedPages: metadata?.estimatedPages || 1,
        hasText: metadata?.hasText ?? true,
        hasHandwriting: metadata?.hasHandwriting ?? false,
        hasTables: metadata?.hasTables ?? false,
        hasForms: metadata?.hasForms ?? false,
        textDensity: metadata?.textDensity || 'medium',
        imageQuality: metadata?.imageQuality || 'good',
        ...metadata
      };

      logger.info(`📊 [COST-OPTIMIZER] Document analysis complete: ${JSON.stringify(characteristics, null, 2)}`);
      return characteristics;

    } catch (error) {
      logger.error('❌ [COST-OPTIMIZER] Document analysis failed:', error);

      // Return default characteristics
      return {
        fileSize: 1024 * 1024, // 1MB default
        imageResolution: { width: 2480, height: 3508 },
        estimatedPages: 1,
        hasText: true,
        hasHandwriting: false,
        hasTables: false,
        hasForms: false,
        textDensity: 'medium',
        imageQuality: 'good'
      };
    }
  }

  /**
   * Calculate cost analysis for each engine
   */
  static calculateEngineAnalysis(
    characteristics: DocumentCharacteristics,
    options: OptimizationOptions
  ): CostAnalysis[] {
    const analyses: CostAnalysis[] = [];

    // Tesseract Analysis
    const tesseractAccuracy = this.getAccuracyForDocumentType('tesseract', options.documentType || 'text');
    analyses.push({
      engine: 'tesseract',
      estimatedCost: 0, // Free
      estimatedAccuracy: tesseractAccuracy,
      estimatedTime: this.PRICING.tesseract.processingTime + (characteristics.fileSize / (1024 * 1024)) * 500, // Scale with file size
      confidenceLevel: 0.85,
      reasoning: [
        'Zero cost option',
        'Reliable for standard text documents',
        characteristics.hasHandwriting ? 'Limited handwriting recognition' : 'Good text recognition',
        characteristics.imageQuality === 'poor' ? 'May struggle with low quality images' : 'Adequate image processing'
      ]
    });

    // Google Vision Analysis
    const googleAccuracy = this.getAccuracyForDocumentType('google-vision', options.documentType || 'text');
    const googleCost = this.PRICING.googleVision.textDetection / 1000; // Per operation
    analyses.push({
      engine: 'google-vision',
      estimatedCost: googleCost,
      estimatedAccuracy: googleAccuracy,
      estimatedTime: this.PRICING.googleVision.processingTime,
      confidenceLevel: 0.95,
      reasoning: [
        `Estimated cost: $${googleCost.toFixed(4)} per operation`,
        'High accuracy across document types',
        characteristics.hasHandwriting ? 'Excellent handwriting recognition' : 'Superior text recognition',
        'Fast cloud processing',
        'Built-in image preprocessing'
      ]
    });

    // AWS Textract Analysis
    const awsAccuracy = this.getAccuracyForDocumentType('aws-textract', options.documentType || 'text');
    let awsCost = this.PRICING.awsTextract.textDetection / 1000; // Base cost

    // Adjust cost based on features needed
    if (characteristics.hasTables || characteristics.hasForms) {
      awsCost = this.PRICING.awsTextract.documentAnalysis / 1000;
    }

    analyses.push({
      engine: 'aws-textract',
      estimatedCost: awsCost,
      estimatedAccuracy: awsAccuracy,
      estimatedTime: this.PRICING.awsTextract.processingTime,
      confidenceLevel: 0.90,
      reasoning: [
        `Estimated cost: $${awsCost.toFixed(4)} per operation`,
        characteristics.hasTables ? 'Excellent table extraction' : 'Strong text recognition',
        characteristics.hasForms ? 'Advanced form processing' : 'Good document structure',
        'Comprehensive document analysis',
        awsCost > googleCost ? 'Higher cost than Google Vision' : 'Competitive pricing'
      ]
    });

    return analyses;
  }

  /**
   * Get accuracy benchmark for specific engine and document type
   */
  private static getAccuracyForDocumentType(
    engine: 'tesseract' | 'google-vision' | 'aws-textract',
    documentType: string
  ): number {
    const benchmarks = this.ACCURACY_BENCHMARKS[engine];
    return benchmarks[documentType as keyof typeof benchmarks] || benchmarks.text;
  }

  /**
   * Score and rank engines based on optimization criteria
   */
  static scoreEngines(analyses: CostAnalysis[], options: OptimizationOptions): CostAnalysis[] {
    const scoredAnalyses = analyses.map(analysis => {
      let score = 0;
      let maxScore = 0;

      // Cost scoring (higher score = better value)
      if (options.prioritizeCost || options.maxBudget) {
        const costWeight = options.prioritizeCost ? 40 : 20;
        if (analysis.estimatedCost === 0) {
          score += costWeight;
        } else if (!options.maxBudget || analysis.estimatedCost <= options.maxBudget) {
          // Score inversely proportional to cost
          const maxCost = Math.max(...analyses.map(a => a.estimatedCost));
          score += costWeight * (1 - (analysis.estimatedCost / maxCost));
        }
        maxScore += costWeight;
      }

      // Accuracy scoring
      if (options.prioritizeAccuracy || options.minAccuracy) {
        const accuracyWeight = options.prioritizeAccuracy ? 40 : 30;
        if (!options.minAccuracy || analysis.estimatedAccuracy >= options.minAccuracy) {
          score += accuracyWeight * analysis.estimatedAccuracy;
        }
        maxScore += accuracyWeight;
      }

      // Speed scoring
      if (options.prioritizeSpeed || options.maxProcessingTime) {
        const speedWeight = options.prioritizeSpeed ? 40 : 20;
        if (!options.maxProcessingTime || analysis.estimatedTime <= options.maxProcessingTime * 1000) {
          const maxTime = Math.max(...analyses.map(a => a.estimatedTime));
          score += speedWeight * (1 - (analysis.estimatedTime / maxTime));
        }
        maxScore += speedWeight;
      }

      // Quality level adjustment
      if (options.qualityLevel) {
        const qualityMultiplier = {
          basic: 0.8,
          good: 1.0,
          high: 1.2,
          premium: 1.4
        }[options.qualityLevel];

        if (analysis.engine === 'tesseract' && options.qualityLevel === 'premium') {
          score *= 0.7; // Penalize Tesseract for premium quality requirements
        } else {
          score *= qualityMultiplier;
        }
      }

      return {
        ...analysis,
        recommendationScore: maxScore > 0 ? (score / maxScore) * 100 : 0
      };
    });

    return scoredAnalyses.sort((a, b) =>
      (b as any).recommendationScore - (a as any).recommendationScore
    );
  }

  /**
   * Main optimization function - returns the best engine recommendation
   */
  static async optimizeEngineSelection(
    imagePath: string,
    options: OptimizationOptions = {},
    documentCharacteristics?: Partial<DocumentCharacteristics>
  ): Promise<EngineRecommendation> {
    try {
      logger.info('🎯 [COST-OPTIMIZER] Starting engine optimization...');

      // Step 1: Analyze document characteristics
      const characteristics = await this.analyzeDocumentCharacteristics(imagePath, documentCharacteristics);

      // Step 2: Calculate cost analysis for each engine
      const analyses = this.calculateEngineAnalysis(characteristics, options);

      // Step 3: Score and rank engines
      const rankedEngines = this.scoreEngines(analyses, options);

      // Step 4: Validate constraints
      const validEngines = rankedEngines.filter(analysis => {
        // Budget constraint
        if (options.maxBudget && analysis.estimatedCost > options.maxBudget) {
          return false;
        }

        // Accuracy constraint
        if (options.minAccuracy && analysis.estimatedAccuracy < options.minAccuracy) {
          return false;
        }

        // Time constraint
        if (options.maxProcessingTime && analysis.estimatedTime > options.maxProcessingTime * 1000) {
          return false;
        }

        return true;
      });

      if (validEngines.length === 0) {
        throw new Error('No engines meet the specified constraints');
      }

      // Step 5: Build recommendation
      const primaryEngine = validEngines[0];
      const fallbackEngines = validEngines.slice(1, 3); // Top 2 fallback options

      const recommendation: EngineRecommendation = {
        primaryEngine,
        fallbackEngines,
        totalBudgetImpact: primaryEngine.estimatedCost + fallbackEngines.reduce((sum, engine) => sum + engine.estimatedCost * 0.1, 0), // 10% chance of fallback
        recommendationScore: (primaryEngine as any).recommendationScore || 0,
        riskAssessment: {
          costRisk: primaryEngine.estimatedCost > (options.maxBudget || 0.01) * 0.8 ? 'high' :
                   primaryEngine.estimatedCost > (options.maxBudget || 0.01) * 0.5 ? 'medium' : 'low',
          accuracyRisk: primaryEngine.estimatedAccuracy < (options.minAccuracy || 0.8) + 0.1 ? 'high' :
                       primaryEngine.estimatedAccuracy < (options.minAccuracy || 0.8) + 0.2 ? 'medium' : 'low',
          timeRisk: primaryEngine.estimatedTime > (options.maxProcessingTime || 10) * 1000 * 0.8 ? 'high' :
                   primaryEngine.estimatedTime > (options.maxProcessingTime || 10) * 1000 * 0.6 ? 'medium' : 'low'
        }
      };

      logger.info(`✅ [COST-OPTIMIZER] Optimization complete. Primary engine: ${primaryEngine.engine} (score: ${recommendation.recommendationScore.toFixed(1)})`);

      return recommendation;

    } catch (error) {
      logger.error('❌ [COST-OPTIMIZER] Engine optimization failed:', error);

      // Return default recommendation (Tesseract fallback)
      return {
        primaryEngine: {
          engine: 'tesseract',
          estimatedCost: 0,
          estimatedAccuracy: 0.85,
          estimatedTime: 3000,
          confidenceLevel: 0.85,
          reasoning: ['Fallback to free option due to optimization error']
        },
        fallbackEngines: [],
        totalBudgetImpact: 0,
        recommendationScore: 50,
        riskAssessment: {
          costRisk: 'low',
          accuracyRisk: 'medium',
          timeRisk: 'medium'
        }
      };
    }
  }

  /**
   * Execute OCR with the recommended engine
   */
  static async executeOptimizedOCR(
    imagePath: string,
    recommendation: EngineRecommendation,
    ocrOptions: any = {}
  ): Promise<{
    result: { text: string; confidence: number; };
    actualCost: number;
    processingTime: number;
    engineUsed: string;
    fallbacksAttempted: number;
  }> {
    const startTime = Date.now();
    let fallbacksAttempted = 0;

    try {
      logger.info(`🚀 [COST-OPTIMIZER] Executing OCR with primary engine: ${recommendation.primaryEngine.engine}`);

      // Try primary engine
      const primaryResult = await this.executeWithEngine(
        recommendation.primaryEngine.engine,
        imagePath,
        ocrOptions
      );

      if (primaryResult.result.confidence > 0.5) { // Minimum confidence threshold
        return {
          result: primaryResult.result,
          actualCost: primaryResult.actualCost,
          processingTime: Date.now() - startTime,
          engineUsed: recommendation.primaryEngine.engine,
          fallbacksAttempted: 0
        };
      }

      // Try fallback engines if primary fails
      for (const fallbackEngine of recommendation.fallbackEngines) {
        fallbacksAttempted++;
        logger.warn(`⚠️  [COST-OPTIMIZER] Primary engine low confidence, trying fallback: ${fallbackEngine.engine}`);

        try {
          const fallbackResult = await this.executeWithEngine(
            fallbackEngine.engine,
            imagePath,
            ocrOptions
          );

          if (fallbackResult.result.confidence > primaryResult.result.confidence) {
            return {
              result: fallbackResult.result,
              actualCost: primaryResult.actualCost + fallbackResult.actualCost,
              processingTime: Date.now() - startTime,
              engineUsed: `${recommendation.primaryEngine.engine}+${fallbackEngine.engine}`,
              fallbacksAttempted
            };
          }
        } catch (fallbackError) {
          logger.warn(`⚠️  [COST-OPTIMIZER] Fallback engine ${fallbackEngine.engine} failed:`, fallbackError);
        }
      }

      // Return primary result even if confidence is low
      return {
        result: primaryResult.result,
        actualCost: primaryResult.actualCost,
        processingTime: Date.now() - startTime,
        engineUsed: recommendation.primaryEngine.engine,
        fallbacksAttempted
      };

    } catch (error) {
      logger.error('❌ [COST-OPTIMIZER] Optimized OCR execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute OCR with a specific engine
   */
  private static async executeWithEngine(
    engine: 'tesseract' | 'google-vision' | 'aws-textract',
    imagePath: string,
    options: any
  ): Promise<{ result: { text: string; confidence: number; }; actualCost: number; }> {

    switch (engine) {
      case 'tesseract':
        const tesseractResult = await TesseractWrapper.extractText(imagePath, {
          languages: options.languages || ['eng'],
          outputFormat: 'hocr',
          timeout: options.timeout || 30000
        });
        return {
          result: {
            text: tesseractResult.text,
            confidence: tesseractResult.confidence / 100 // Convert to 0-1 scale
          },
          actualCost: 0
        };

      case 'google-vision':
        const googleResult = await GoogleVisionOCRService.extractText(imagePath, {
          detectionType: options.detectionType || 'TEXT_DETECTION',
          languages: options.languages
        });
        return {
          result: {
            text: googleResult.text,
            confidence: googleResult.confidence
          },
          actualCost: googleResult.cost
        };

      case 'aws-textract':
        const awsResult = await AWSTextractOCRService.extractText(imagePath);
        return {
          result: {
            text: awsResult.text,
            confidence: awsResult.confidence
          },
          actualCost: awsResult.cost
        };

      default:
        throw new Error(`Unsupported engine: ${engine}`);
    }
  }

  /**
   * Get usage statistics and cost tracking
   */
  static getUsageStatistics(): {
    totalOperations: number;
    totalCost: number;
    engineBreakdown: Record<string, { operations: number; cost: number; }>;
    averageAccuracy: number;
    averageProcessingTime: number;
  } {
    // Mock statistics for now - in production, track in database
    return {
      totalOperations: 1247,
      totalCost: 12.47,
      engineBreakdown: {
        tesseract: { operations: 892, cost: 0 },
        'google-vision': { operations: 255, cost: 8.32 },
        'aws-textract': { operations: 100, cost: 4.15 }
      },
      averageAccuracy: 0.89,
      averageProcessingTime: 2150
    };
  }
}