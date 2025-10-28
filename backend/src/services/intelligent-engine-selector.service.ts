import { AdaptiveDPISelector } from './adaptive-dpi-selector.service';
import { ImageQualityAssessor } from './image-quality-assessor.service';
import { TesseractWrapper } from './tesseract-wrapper.service';
import { GoogleVisionOCRService } from './google-vision-ocr.service';
import { AWSTextractOCRService } from './aws-textract-ocr.service';
import { CloudOCRCostOptimizer, OptimizationOptions } from './cloud-ocr-cost-optimizer.service';
import { logger } from '../utils/logger';

/**
 * Intelligent Multi-Engine OCR Framework
 * Selects optimal OCR engine based on document characteristics and quality
 *
 * Phase 2 OCR Optimization - Advanced engine selection
 * Phase 3 Cloud Integration - Cloud engines with cost optimization
 */

export interface OCREngine {
  name: string;
  type: 'local' | 'cloud';
  strengths: DocumentType[];
  avgAccuracy: number;
  costPerPage: number;
  maxFileSize: number; // in MB
  supportedLanguages: string[];
  processingSpeed: number; // pages per minute
  reliability: number; // 0-1 score
  isAvailable: () => Promise<boolean>;
}

export enum DocumentType {
  PRINTED_TEXT = 'printed_text',
  HANDWRITTEN = 'handwritten',
  SCANNED_DOCUMENT = 'scanned_document',
  PHOTO_OF_DOCUMENT = 'photo_of_document',
  TECHNICAL_DRAWING = 'technical_drawing',
  TABLE_HEAVY = 'table_heavy',
  MULTI_COLUMN = 'multi_column',
  MIXED_CONTENT = 'mixed_content',
  POOR_QUALITY = 'poor_quality',
  MULTI_LANGUAGE = 'multi_language'
}

export interface DocumentAnalysis {
  documentType: DocumentType;
  confidence: number;
  characteristics: {
    hasHandwriting: boolean;
    hasTable: boolean;
    isMultiColumn: boolean;
    textQuality: 'excellent' | 'good' | 'fair' | 'poor';
    complexity: 'simple' | 'moderate' | 'complex';
    imageQuality: any; // From ImageQualityAssessor
  };
  requirements: {
    accuracyPriority: number; // 0-1
    speedPriority: number;    // 0-1
    costPriority: number;     // 0-1
  };
}

export interface OCRResult {
  text: string;
  confidence: number;
  engine: string;
  processingTime: number;
  cost: number;
  wordLevelData?: any;
  engineMetadata?: {
    version?: string;
    model?: string;
    language?: string;
  };
}

export class IntelligentEngineSelector {

  private static readonly ENGINES: OCREngine[] = [
    {
      name: 'Tesseract Enhanced',
      type: 'local',
      strengths: [
        DocumentType.PRINTED_TEXT,
        DocumentType.SCANNED_DOCUMENT,
        DocumentType.MULTI_COLUMN,
        DocumentType.MIXED_CONTENT
      ],
      avgAccuracy: 0.88,
      costPerPage: 0.0, // Free
      maxFileSize: 100,
      supportedLanguages: ['eng', 'osd'],
      processingSpeed: 12, // pages per minute
      reliability: 0.95,
      isAvailable: async () => await TesseractWrapper.isAvailable()
    },
    {
      name: 'Google Vision API',
      type: 'cloud',
      strengths: [
        DocumentType.HANDWRITTEN,
        DocumentType.PHOTO_OF_DOCUMENT,
        DocumentType.POOR_QUALITY,
        DocumentType.MULTI_LANGUAGE,
        DocumentType.MIXED_CONTENT
      ],
      avgAccuracy: 0.94,
      costPerPage: 0.0015, // $1.50 per 1000 images
      maxFileSize: 20,
      supportedLanguages: ['auto'], // Auto-detection
      processingSpeed: 30, // pages per minute
      reliability: 0.99,
      isAvailable: async () => {
        try {
          // Check if Google Vision API credentials are available
          return process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_KEY_FILE ? true : false;
        } catch {
          return false;
        }
      }
    },
    {
      name: 'AWS Textract',
      type: 'cloud',
      strengths: [
        DocumentType.TABLE_HEAVY,
        DocumentType.TECHNICAL_DRAWING,
        DocumentType.SCANNED_DOCUMENT,
        DocumentType.MULTI_COLUMN
      ],
      avgAccuracy: 0.92,
      costPerPage: 0.0015, // $1.50 per 1000 pages
      maxFileSize: 10,
      supportedLanguages: ['eng', 'spa', 'ita', 'por', 'fra', 'deu'],
      processingSpeed: 25, // pages per minute
      reliability: 0.98,
      isAvailable: async () => {
        try {
          // Check if AWS credentials are available
          return process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? true : false;
        } catch {
          return false;
        }
      }
    }
  ];

  private static readonly FALLBACK_CHAIN = [
    'Tesseract Enhanced',
    'Google Vision API',
    'AWS Textract'
  ];

  /**
   * Analyze document characteristics to determine optimal processing strategy
   */
  static async analyzeDocument(imagePath: string): Promise<DocumentAnalysis> {
    logger.info(`🔍 [ENGINE-SELECTOR] Analyzing document characteristics: ${imagePath}`);

    try {
      // Get comprehensive image quality assessment
      const qualityAssessment = await ImageQualityAssessor.assessQuality(imagePath);

      // Analyze DPI requirements
      const dpiAnalysis = await AdaptiveDPISelector.analyzeDPI(imagePath);

      // Document type classification based on quality metrics
      const documentType = this.classifyDocumentType(qualityAssessment, dpiAnalysis);

      // Extract characteristics
      const characteristics = {
        hasHandwriting: this.detectHandwriting(qualityAssessment),
        hasTable: this.detectTables(qualityAssessment),
        isMultiColumn: dpiAnalysis.analysisDetails.layoutComplexity > 0.6,
        textQuality: qualityAssessment.qualityLevel,
        complexity: this.determineComplexity(qualityAssessment, dpiAnalysis),
        imageQuality: qualityAssessment
      };

      // Determine processing requirements based on characteristics
      const requirements = this.determineRequirements(documentType, characteristics);

      const analysis: DocumentAnalysis = {
        documentType,
        confidence: Math.min(qualityAssessment.overallScore, dpiAnalysis.confidence),
        characteristics,
        requirements
      };

      logger.info(`✅ [ENGINE-SELECTOR] Document classified as: ${documentType} (confidence: ${analysis.confidence.toFixed(2)})`);

      return analysis;

    } catch (error) {
      logger.error(`❌ [ENGINE-SELECTOR] Document analysis failed:`, error);

      // Fallback analysis
      return {
        documentType: DocumentType.PRINTED_TEXT,
        confidence: 0.5,
        characteristics: {
          hasHandwriting: false,
          hasTable: false,
          isMultiColumn: false,
          textQuality: 'fair',
          complexity: 'moderate',
          imageQuality: null
        },
        requirements: {
          accuracyPriority: 0.7,
          speedPriority: 0.6,
          costPriority: 0.8
        }
      };
    }
  }

  /**
   * Select optimal OCR engine using Phase 3 Cloud Cost Optimization
   */
  static async selectOptimalEngineWithCostOptimization(
    imagePath: string,
    analysis: DocumentAnalysis,
    budget?: {
      maxCostPerPage: number;
      totalBudget: number;
    },
    optimizationOptions?: OptimizationOptions
  ): Promise<{
    primaryEngine: OCREngine;
    fallbackEngines: OCREngine[];
    processingStrategy: {
      usePreprocessing: boolean;
      recommendedDPI: number;
      qualityEnhancements: string[];
    };
    estimatedAccuracy: number;
    estimatedCost: number;
    reasoning: string[];
    costOptimization?: any;
  }> {
    logger.info(`🎯 [ENGINE-SELECTOR] Selecting optimal engine for ${analysis.documentType} with cost optimization`);

    const reasoning: string[] = [];
    let costOptimization;
    let primaryEngine: OCREngine;
    let fallbackEngines: OCREngine[];

    try {
      // Use Phase 3 Cloud Cost Optimizer for intelligent engine selection
      const costOptimizerOptions: OptimizationOptions = {
        maxBudget: budget?.totalBudget,
        documentType: this.mapDocumentTypeToOptimizer(analysis.documentType),
        qualityLevel: analysis.characteristics.textQuality === 'excellent' ? 'premium' :
                     analysis.characteristics.textQuality === 'good' ? 'high' : 'good',
        prioritizeAccuracy: analysis.requirements.accuracyPriority > 0.8,
        prioritizeCost: analysis.requirements.costPriority > 0.8,
        prioritizeSpeed: analysis.requirements.speedPriority > 0.8,
        ...optimizationOptions
      };

      const recommendation = await CloudOCRCostOptimizer.optimizeEngineSelection(
        imagePath,
        costOptimizerOptions
      );

      costOptimization = recommendation;

      // Map cost optimizer recommendation to our engine format
      const primaryEngineFromOptimizer = this.ENGINES.find(e =>
        e.name.toLowerCase().includes(recommendation.primaryEngine.engine.replace('-', ' '))
      );

      primaryEngine = primaryEngineFromOptimizer || this.ENGINES[0]; // Fallback to Tesseract
      fallbackEngines = recommendation.fallbackEngines.map(fallback =>
        this.ENGINES.find(e => e.name.toLowerCase().includes(fallback.engine.replace('-', ' ')))
      ).filter(Boolean) as OCREngine[];

      reasoning.push(...recommendation.primaryEngine.reasoning);
      reasoning.push(`Cost optimization score: ${recommendation.recommendationScore.toFixed(1)}`);

    } catch (optimizerError) {
      logger.warn('⚠️  [ENGINE-SELECTOR] Cost optimizer failed, falling back to legacy selection:', optimizerError);

      // Fallback to original engine selection logic
      const availableEngines = await this.getAvailableEngines();

      if (availableEngines.length === 0) {
        throw new Error('No OCR engines are available');
      }

      const engineScores = await this.scoreEngines(availableEngines, analysis, budget);
      const rankedEngines = engineScores.sort((a, b) => b.score - a.score);

      primaryEngine = rankedEngines[0].engine;
      fallbackEngines = rankedEngines.slice(1, 3).map(e => e.engine);

      // Generate reasoning
      reasoning.push(`Selected ${primaryEngine.name} (score: ${rankedEngines[0].score.toFixed(2)})`);
      reasoning.push(`Document type: ${analysis.documentType} matches engine strengths`);

      if (analysis.characteristics.textQuality === 'poor') {
        reasoning.push('Poor image quality - preprocessing recommended');
      }

      if (budget && primaryEngine.costPerPage > budget.maxCostPerPage) {
        reasoning.push(`Cost-optimized selection (${primaryEngine.costPerPage.toFixed(4)} per page)`);
      }
    }

    // Determine processing strategy
    const processingStrategy = {
      usePreprocessing: analysis.characteristics.textQuality !== 'excellent',
      recommendedDPI: this.getRecommendedDPI(analysis),
      qualityEnhancements: this.getQualityEnhancements(analysis)
    };

    // Estimate results
    const estimatedAccuracy = this.estimateAccuracy(primaryEngine, analysis);
    const estimatedCost = primaryEngine.costPerPage;

    logger.info(`✅ [ENGINE-SELECTOR] Selected: ${primaryEngine.name} (accuracy: ${(estimatedAccuracy*100).toFixed(1)}%, cost: $${estimatedCost.toFixed(4)})`);

    return {
      primaryEngine,
      fallbackEngines,
      processingStrategy,
      estimatedAccuracy,
      estimatedCost,
      reasoning,
      costOptimization
    };
  }

  /**
   * Legacy method - kept for backward compatibility
   */
  static async selectOptimalEngine(
    analysis: DocumentAnalysis,
    budget?: {
      maxCostPerPage: number;
      totalBudget: number;
    }
  ): Promise<{
    primaryEngine: OCREngine;
    fallbackEngines: OCREngine[];
    processingStrategy: {
      usePreprocessing: boolean;
      recommendedDPI: number;
      qualityEnhancements: string[];
    };
    estimatedAccuracy: number;
    estimatedCost: number;
    reasoning: string[];
  }> {
    // Create a dummy image path for cost optimization
    const dummyPath = '/tmp/dummy.png';
    const result = await this.selectOptimalEngineWithCostOptimization(dummyPath, analysis, budget);

    // Return without cost optimization data for backward compatibility
    const { costOptimization, ...legacyResult } = result;
    return legacyResult;
  }

  /**
   * Execute OCR with intelligent fallback chain and cost optimization
   */
  static async executeWithFallback(
    imagePath: string,
    analysis: DocumentAnalysis,
    options: {
      maxAttempts?: number;
      targetAccuracy?: number;
      budgetLimit?: number;
    } = {}
  ): Promise<{
    result: OCRResult;
    attemptsUsed: number;
    totalCost: number;
    enginesUsed: string[];
    finalStrategy: string;
  }> {
    const { maxAttempts = 3, targetAccuracy = 0.85, budgetLimit = 0.01 } = options;

    logger.info(`🚀 [MULTI-ENGINE] Starting OCR with fallback chain and cost optimization`);
    logger.info(`🎯 [TARGET] Accuracy: ${(targetAccuracy*100).toFixed(0)}%, Budget: $${budgetLimit.toFixed(4)}`);

    const enginesUsed: string[] = [];
    let totalCost = 0;
    let bestResult: OCRResult | null = null;
    let attemptsUsed = 0;

    // Get engine selection with cost optimization
    const selection = await this.selectOptimalEngineWithCostOptimization(imagePath, analysis, {
      maxCostPerPage: budgetLimit,
      totalBudget: budgetLimit
    });

    // Try primary engine first
    const enginesToTry = [selection.primaryEngine, ...selection.fallbackEngines];

    for (const engine of enginesToTry.slice(0, maxAttempts)) {
      if (totalCost >= budgetLimit) {
        logger.info(`💰 [BUDGET] Budget limit reached: $${totalCost.toFixed(4)}`);
        break;
      }

      attemptsUsed++;
      logger.info(`🔄 [ATTEMPT-${attemptsUsed}] Trying ${engine.name}...`);

      try {
        const result = await this.executeEngineOCR(engine, imagePath, analysis);
        enginesUsed.push(engine.name);
        totalCost += result.cost;

        if (!bestResult || result.confidence > bestResult.confidence) {
          bestResult = result;
        }

        // Check if we've met our target accuracy
        if (result.confidence >= targetAccuracy) {
          logger.info(`🎯 [SUCCESS] Target accuracy achieved: ${(result.confidence*100).toFixed(1)}%`);
          break;
        }

        logger.info(`📊 [RESULT] ${engine.name}: ${(result.confidence*100).toFixed(1)}% confidence`);

      } catch (error) {
        logger.warn(`⚠️  [ENGINE-FALLBACK] ${engine.name} failed:`, error instanceof Error ? error.message : 'Unknown error');
        continue;
      }
    }

    if (!bestResult) {
      throw new Error('All OCR engines failed');
    }

    const finalStrategy = enginesUsed.length > 1 ? 'Multi-engine fallback' : 'Single engine success';

    logger.info(`✅ [MULTI-ENGINE] Completed with ${finalStrategy}`);
    logger.info(`📊 [FINAL] Accuracy: ${(bestResult.confidence*100).toFixed(1)}%, Cost: $${totalCost.toFixed(4)}, Engines: ${enginesUsed.join(' → ')}`);

    return {
      result: bestResult,
      attemptsUsed,
      totalCost,
      enginesUsed,
      finalStrategy
    };
  }

  /**
   * Get list of currently available engines
   */
  private static async getAvailableEngines(): Promise<OCREngine[]> {
    const available: OCREngine[] = [];

    for (const engine of this.ENGINES) {
      try {
        if (await engine.isAvailable()) {
          available.push(engine);
        }
      } catch (error) {
        logger.warn(`⚠️  [ENGINE-CHECK] ${engine.name} availability check failed`);
      }
    }

    return available;
  }

  /**
   * Score engines based on document analysis and requirements
   */
  private static async scoreEngines(
    engines: OCREngine[],
    analysis: DocumentAnalysis,
    budget?: { maxCostPerPage: number; totalBudget: number }
  ): Promise<Array<{ engine: OCREngine; score: number; breakdown: any }>> {
    const scores: Array<{ engine: OCREngine; score: number; breakdown: any }> = [];

    for (const engine of engines) {
      const breakdown = {
        strengthsMatch: 0,
        accuracyScore: 0,
        speedScore: 0,
        costScore: 0,
        reliabilityScore: 0
      };

      // Strengths matching (40% weight)
      const strengthsMatch = engine.strengths.includes(analysis.documentType) ? 1.0 : 0.3;
      breakdown.strengthsMatch = strengthsMatch;

      // Accuracy score (30% weight)
      breakdown.accuracyScore = engine.avgAccuracy;

      // Speed score (15% weight)
      breakdown.speedScore = Math.min(1.0, engine.processingSpeed / 30);

      // Cost score (10% weight) - lower cost is better
      let costScore = 1.0;
      if (budget && engine.costPerPage > budget.maxCostPerPage) {
        costScore = 0.1; // Heavily penalize over-budget engines
      } else {
        costScore = 1.0 - Math.min(0.9, engine.costPerPage / 0.01);
      }
      breakdown.costScore = costScore;

      // Reliability score (5% weight)
      breakdown.reliabilityScore = engine.reliability;

      // Calculate weighted total
      const totalScore = (
        (strengthsMatch * analysis.requirements.accuracyPriority * 0.4) +
        (breakdown.accuracyScore * analysis.requirements.accuracyPriority * 0.3) +
        (breakdown.speedScore * analysis.requirements.speedPriority * 0.15) +
        (breakdown.costScore * analysis.requirements.costPriority * 0.1) +
        (breakdown.reliabilityScore * 0.05)
      );

      scores.push({ engine, score: totalScore, breakdown });
    }

    return scores;
  }

  /**
   * Execute OCR using specific engine
   */
  private static async executeEngineOCR(
    engine: OCREngine,
    imagePath: string,
    analysis: DocumentAnalysis
  ): Promise<OCRResult> {
    const startTime = Date.now();

    switch (engine.name) {
      case 'Tesseract Enhanced':
        return await this.executeTesseractEnhanced(imagePath, analysis);

      case 'Google Vision API':
        return await this.executeGoogleVisionOCR(imagePath, analysis);

      case 'AWS Textract':
        return await this.executeAWSTextractOCR(imagePath, analysis);

      default:
        throw new Error(`Unknown engine: ${engine.name}`);
    }
  }

  /**
   * Execute enhanced Tesseract with optimal preprocessing
   */
  private static async executeTesseractEnhanced(
    imagePath: string,
    analysis: DocumentAnalysis
  ): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // Apply preprocessing if needed
      let processedImagePath = imagePath;

      if (analysis.characteristics.imageQuality?.preprocessingSteps?.length > 0) {
        const preprocessedPath = imagePath.replace(/\.(jpg|jpeg|png|gif|bmp|tiff)$/i, '_preprocessed.png');
        processedImagePath = await ImageQualityAssessor.preprocessImage(
          imagePath,
          preprocessedPath,
          analysis.characteristics.imageQuality.preprocessingSteps
        );
      }

      // Use adaptive DPI
      const dpiAnalysis = await AdaptiveDPISelector.analyzeDPI(processedImagePath);

      // Execute Tesseract with optimal settings
      const tesseractResult = await TesseractWrapper.extractTextFromImage(processedImagePath, {
        language: 'eng',
        dpi: dpiAnalysis.recommendedDPI,
        outputFormat: 'hocr',
        timeout: 30000
      });

      const processingTime = Date.now() - startTime;

      return {
        text: tesseractResult.text,
        confidence: tesseractResult.confidence / 100, // Convert to 0-1 scale
        engine: 'Tesseract Enhanced',
        processingTime,
        cost: 0.0, // Free
        wordLevelData: tesseractResult.wordData || [],
        engineMetadata: {
          version: 'Enhanced with adaptive preprocessing',
          language: 'eng'
        }
      };

    } catch (error) {
      throw new Error(`Tesseract Enhanced failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute Google Vision OCR with optimal settings
   */
  private static async executeGoogleVisionOCR(
    imagePath: string,
    analysis: DocumentAnalysis
  ): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // Determine optimal detection type based on document analysis
      let detectionType: 'TEXT_DETECTION' | 'DOCUMENT_TEXT_DETECTION' | 'HANDWRITING_DETECTION' = 'TEXT_DETECTION';

      if (analysis.characteristics.hasHandwriting) {
        detectionType = 'HANDWRITING_DETECTION';
      } else if (analysis.documentType === DocumentType.SCANNED_DOCUMENT ||
                analysis.documentType === DocumentType.TABLE_HEAVY) {
        detectionType = 'DOCUMENT_TEXT_DETECTION';
      }

      const googleResult = await GoogleVisionOCRService.extractText(imagePath, {
        detectionType,
        languages: ['en'] // Default to English for now
      });

      const processingTime = Date.now() - startTime;

      return {
        text: googleResult.text,
        confidence: googleResult.confidence,
        engine: 'Google Vision API',
        processingTime,
        cost: googleResult.cost,
        wordLevelData: googleResult.detailedResults,
        engineMetadata: {
          version: 'Cloud Vision API v1',
          model: detectionType,
          language: 'auto-detected'
        }
      };

    } catch (error) {
      throw new Error(`Google Vision API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute AWS Textract OCR with optimal settings
   */
  private static async executeAWSTextractOCR(
    imagePath: string,
    analysis: DocumentAnalysis
  ): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // Determine features based on document analysis
      const extractTables = analysis.characteristics.hasTable ||
                           analysis.documentType === DocumentType.TABLE_HEAVY;
      const extractForms = analysis.documentType === DocumentType.TECHNICAL_DRAWING;

      const awsResult = await AWSTextractOCRService.analyzeDocument(imagePath, {
        extractTables,
        extractForms
      });

      const processingTime = Date.now() - startTime;

      // Combine text from all sources
      let combinedText = awsResult.text;
      if (awsResult.tables && awsResult.tables.length > 0) {
        combinedText += '\n\n[TABLES DETECTED]\n' +
          awsResult.tables.map(table => table.text || '[Table content]').join('\n');
      }

      return {
        text: combinedText,
        confidence: awsResult.confidence,
        engine: 'AWS Textract',
        processingTime,
        cost: awsResult.cost,
        wordLevelData: {
          tables: awsResult.tables,
          forms: awsResult.forms
        },
        engineMetadata: {
          version: 'Textract API',
          model: extractTables || extractForms ? 'ANALYZE_DOCUMENT' : 'DETECT_DOCUMENT_TEXT',
          language: 'auto-detected'
        }
      };

    } catch (error) {
      throw new Error(`AWS Textract failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility methods for document analysis
  private static classifyDocumentType(qualityAssessment: any, dpiAnalysis: any): DocumentType {
    if (qualityAssessment.qualityLevel === 'poor') return DocumentType.POOR_QUALITY;
    if (dpiAnalysis.analysisDetails.layoutComplexity > 0.7) return DocumentType.MULTI_COLUMN;
    if (qualityAssessment.metrics.resolution.dpi < 200) return DocumentType.PHOTO_OF_DOCUMENT;
    return DocumentType.PRINTED_TEXT;
  }

  private static detectHandwriting(qualityAssessment: any): boolean {
    // Simplified handwriting detection based on noise and irregularity
    return qualityAssessment.metrics.noise > 0.4 && qualityAssessment.metrics.blurLevel > 0.5;
  }

  private static detectTables(qualityAssessment: any): boolean {
    // Simplified table detection based on layout complexity
    return qualityAssessment.metrics.contrast > 0.7; // High contrast often indicates table lines
  }

  private static determineComplexity(qualityAssessment: any, dpiAnalysis: any): 'simple' | 'moderate' | 'complex' {
    const complexityScore = (qualityAssessment.overallScore + dpiAnalysis.confidence) / 2;
    if (complexityScore > 0.8) return 'simple';
    if (complexityScore > 0.6) return 'moderate';
    return 'complex';
  }

  private static determineRequirements(type: DocumentType, characteristics: any) {
    const requirements = {
      accuracyPriority: 0.7,
      speedPriority: 0.6,
      costPriority: 0.8
    };

    // Adjust based on document type
    switch (type) {
      case DocumentType.POOR_QUALITY:
        requirements.accuracyPriority = 0.9;
        requirements.speedPriority = 0.4;
        requirements.costPriority = 0.5;
        break;
      case DocumentType.TABLE_HEAVY:
        requirements.accuracyPriority = 0.85;
        requirements.speedPriority = 0.5;
        requirements.costPriority = 0.6;
        break;
    }

    return requirements;
  }

  private static getRecommendedDPI(analysis: DocumentAnalysis): number {
    if (analysis.documentType === DocumentType.POOR_QUALITY) return 450;
    if (analysis.characteristics.complexity === 'complex') return 400;
    return 300;
  }

  private static getQualityEnhancements(analysis: DocumentAnalysis): string[] {
    const enhancements: string[] = [];

    if (analysis.characteristics.textQuality === 'poor') {
      enhancements.push('Contrast enhancement', 'Noise reduction', 'Sharpening');
    } else if (analysis.characteristics.textQuality === 'fair') {
      enhancements.push('Contrast adjustment');
    }

    return enhancements;
  }

  private static estimateAccuracy(engine: OCREngine, analysis: DocumentAnalysis): number {
    let accuracy = engine.avgAccuracy;

    // Adjust based on document type match
    if (engine.strengths.includes(analysis.documentType)) {
      accuracy *= 1.05; // 5% bonus for strengths match
    }

    // Adjust based on quality
    if (analysis.characteristics.textQuality === 'poor') {
      accuracy *= 0.85;
    } else if (analysis.characteristics.textQuality === 'excellent') {
      accuracy *= 1.1;
    }

    return Math.min(0.98, accuracy); // Cap at 98%
  }

  /**
   * Map our document types to cost optimizer document types
   */
  private static mapDocumentTypeToOptimizer(
    documentType: DocumentType
  ): 'text' | 'mixed' | 'handwritten' | 'form' | 'table' | 'receipt' {
    switch (documentType) {
      case DocumentType.HANDWRITTEN:
        return 'handwritten';
      case DocumentType.TABLE_HEAVY:
        return 'table';
      case DocumentType.TECHNICAL_DRAWING:
        return 'form';
      case DocumentType.MIXED_CONTENT:
        return 'mixed';
      default:
        return 'text';
    }
  }

  /**
   * Execute OCR with cost-optimized engine selection
   */
  static async executeWithCostOptimization(
    imagePath: string,
    optimizationOptions?: OptimizationOptions
  ): Promise<{
    result: OCRResult;
    actualCost: number;
    processingTime: number;
    engineUsed: string;
    fallbacksAttempted: number;
    recommendation?: any;
  }> {
    try {
      logger.info('🎯 [COST-OPTIMIZATION] Starting cost-optimized OCR execution...');

      // Get cost optimization recommendation
      const recommendation = await CloudOCRCostOptimizer.optimizeEngineSelection(
        imagePath,
        optimizationOptions || {}
      );

      // Execute OCR with the recommended engine
      const executionResult = await CloudOCRCostOptimizer.executeOptimizedOCR(
        imagePath,
        recommendation
      );

      logger.info(`✅ [COST-OPTIMIZATION] Completed with ${executionResult.engineUsed} (cost: $${executionResult.actualCost.toFixed(4)})`);

      // Construct proper OCRResult object
      const ocrResult: OCRResult = {
        text: executionResult.result.text,
        confidence: executionResult.result.confidence,
        engine: executionResult.engineUsed,
        processingTime: executionResult.processingTime,
        cost: executionResult.actualCost
      };

      return {
        result: ocrResult,
        actualCost: executionResult.actualCost,
        processingTime: executionResult.processingTime,
        engineUsed: executionResult.engineUsed,
        fallbacksAttempted: executionResult.fallbacksAttempted,
        recommendation
      };

    } catch (error) {
      logger.error('❌ [COST-OPTIMIZATION] Cost-optimized execution failed:', error);
      throw error;
    }
  }
}