import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

/**
 * Quality Scoring Service
 * Advanced OCR output quality assessment and scoring
 * Phase 2 OCR Optimization - Week 2 Wednesday-Thursday
 */
export class QualityScoring {

  private static readonly SCORING_WEIGHTS = {
    CHARACTER_ACCURACY: 0.30,    // Correctly identified characters
    WORD_ACCURACY: 0.25,         // Correctly identified words
    LAYOUT_PRESERVATION: 0.20,   // Spatial relationships maintained
    CONFIDENCE_CONSISTENCY: 0.15, // OCR engine confidence levels
    TEXT_COMPLETENESS: 0.10      // No missing text regions
  };

  private static readonly QUALITY_THRESHOLDS = {
    EXCELLENT: 0.95,
    GOOD: 0.85,
    ACCEPTABLE: 0.75,
    POOR: 0.60
  };

  private static readonly CONFIDENCE_LEVELS = {
    HIGH: 0.9,
    MEDIUM: 0.7,
    LOW: 0.5
  };

  /**
   * Comprehensive quality assessment of OCR results
   */
  static async assessQuality(params: {
    extractedText: string;
    originalImagePath: string;
    ocrConfidenceData?: any;
    expectedTextSample?: string;
    documentType: 'text' | 'mixed' | 'handwritten' | 'form' | 'table';
  }): Promise<QualityAssessmentResult> {
    const startTime = Date.now();

    console.log(`🔍 [QUALITY-SCORE] Analyzing OCR quality for ${path.basename(params.originalImagePath)}`);

    try {
      // Parallel quality analysis
      const [
        characterAnalysis,
        wordAnalysis,
        layoutAnalysis,
        confidenceAnalysis,
        completenessAnalysis
      ] = await Promise.all([
        this.analyzeCharacterAccuracy(params),
        this.analyzeWordAccuracy(params),
        this.analyzeLayoutPreservation(params),
        this.analyzeConfidenceConsistency(params),
        this.analyzeTextCompleteness(params)
      ]);

      // Calculate weighted overall score
      const overallScore = this.calculateOverallScore({
        characterAccuracy: characterAnalysis.score,
        wordAccuracy: wordAnalysis.score,
        layoutPreservation: layoutAnalysis.score,
        confidenceConsistency: confidenceAnalysis.score,
        textCompleteness: completenessAnalysis.score
      });

      const qualityLevel = this.determineQualityLevel(overallScore);
      const processingTime = Date.now() - startTime;

      const result: QualityAssessmentResult = {
        overallScore,
        qualityLevel,
        processingTime,
        detailedScores: {
          characterAccuracy: characterAnalysis.score,
          wordAccuracy: wordAnalysis.score,
          layoutPreservation: layoutAnalysis.score,
          confidenceConsistency: confidenceAnalysis.score,
          textCompleteness: completenessAnalysis.score
        },
        metrics: {
          totalCharacters: params.extractedText.length,
          totalWords: params.extractedText.split(/\s+/).filter(w => w.length > 0).length,
          averageConfidence: confidenceAnalysis.averageConfidence,
          layoutScore: layoutAnalysis.layoutScore,
          completenessRatio: completenessAnalysis.completenessRatio
        },
        issues: [
          ...characterAnalysis.issues,
          ...wordAnalysis.issues,
          ...layoutAnalysis.issues,
          ...confidenceAnalysis.issues,
          ...completenessAnalysis.issues
        ],
        recommendations: this.generateRecommendations(overallScore, params.documentType, {
          characterAnalysis,
          wordAnalysis,
          layoutAnalysis,
          confidenceAnalysis,
          completenessAnalysis
        }),
        confidence: this.calculateAssessmentConfidence({
          hasReferenceText: !!params.expectedTextSample,
          confidenceDataAvailable: !!params.ocrConfidenceData,
          documentType: params.documentType,
          textLength: params.extractedText.length
        })
      };

      console.log(`✅ [QUALITY-SCORE] Assessment complete: ${qualityLevel} (${overallScore.toFixed(3)}) - ${processingTime}ms`);

      return result;

    } catch (error) {
      console.error(`❌ [QUALITY-SCORE] Assessment failed:`, error);

      // Fallback quality assessment
      return {
        overallScore: 0.7,
        qualityLevel: 'acceptable',
        processingTime: Date.now() - startTime,
        detailedScores: {
          characterAccuracy: 0.7,
          wordAccuracy: 0.7,
          layoutPreservation: 0.7,
          confidenceConsistency: 0.7,
          textCompleteness: 0.7
        },
        metrics: {
          totalCharacters: params.extractedText.length,
          totalWords: params.extractedText.split(/\s+/).length,
          averageConfidence: 0.7,
          layoutScore: 0.7,
          completenessRatio: 0.7
        },
        issues: ['Quality assessment failed - using fallback scores'],
        recommendations: ['Retry with higher quality image', 'Consider manual review'],
        confidence: 0.3
      };
    }
  }

  /**
   * Analyze character-level accuracy
   */
  private static async analyzeCharacterAccuracy(params: {
    extractedText: string;
    expectedTextSample?: string;
    documentType: string;
  }): Promise<AnalysisResult> {
    const issues: string[] = [];
    let score = 0.8; // Default base score

    // Character frequency analysis
    const charFreq = this.analyzeCharacterFrequency(params.extractedText);

    // Check for suspicious character patterns
    const suspiciousChars = this.detectSuspiciousCharacters(params.extractedText);
    if (suspiciousChars.length > 0) {
      issues.push(`Suspicious characters detected: ${suspiciousChars.join(', ')}`);
      score -= suspiciousChars.length * 0.02;
    }

    // Check character distribution
    const distribution = this.analyzeCharacterDistribution(charFreq);
    if (distribution.unbalanced) {
      issues.push('Unbalanced character distribution detected');
      score -= 0.05;
    }

    // If reference text available, calculate exact accuracy
    if (params.expectedTextSample) {
      const accuracy = this.calculateEditDistance(
        params.extractedText.toLowerCase(),
        params.expectedTextSample.toLowerCase()
      );
      score = accuracy;

      if (accuracy < 0.9) {
        issues.push(`Character accuracy below 90%: ${(accuracy * 100).toFixed(1)}%`);
      }
    }

    return { score: Math.max(0, Math.min(1, score)), issues };
  }

  /**
   * Analyze word-level accuracy
   */
  private static async analyzeWordAccuracy(params: {
    extractedText: string;
    expectedTextSample?: string;
    documentType: string;
  }): Promise<AnalysisResult> {
    const issues: string[] = [];
    let score = 0.8;

    const words = params.extractedText.split(/\s+/).filter(w => w.length > 0);

    // Check for incomplete words (fragments)
    const fragments = words.filter(word =>
      word.length < 2 ||
      /^[^a-zA-Z0-9]+$/.test(word) ||
      word.includes('_') ||
      word.includes('|')
    );

    if (fragments.length > words.length * 0.1) {
      issues.push(`High fragment ratio: ${fragments.length}/${words.length} words appear incomplete`);
      score -= 0.1;
    }

    // Check for common OCR errors
    const commonErrors = this.detectCommonOCRErrors(words);
    if (commonErrors.length > 0) {
      issues.push(`Common OCR errors detected: ${commonErrors.slice(0, 5).join(', ')}`);
      score -= Math.min(0.2, commonErrors.length * 0.01);
    }

    // Word length distribution analysis
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    if (avgWordLength < 3 || avgWordLength > 8) {
      issues.push(`Unusual average word length: ${avgWordLength.toFixed(1)} characters`);
      score -= 0.05;
    }

    // Compare with reference if available
    if (params.expectedTextSample) {
      const expectedWords = params.expectedTextSample.split(/\s+/);
      const wordAccuracy = this.calculateWordAccuracy(words, expectedWords);
      score = wordAccuracy;

      if (wordAccuracy < 0.85) {
        issues.push(`Word accuracy below 85%: ${(wordAccuracy * 100).toFixed(1)}%`);
      }
    }

    return { score: Math.max(0, Math.min(1, score)), issues };
  }

  /**
   * Analyze layout preservation
   */
  private static async analyzeLayoutPreservation(params: {
    extractedText: string;
    originalImagePath: string;
    documentType: string;
  }): Promise<AnalysisResult & { layoutScore: number }> {
    const issues: string[] = [];
    let score = 0.75; // Base layout score
    let layoutScore = 0.75;

    try {
      // Analyze text structure
      const lines = params.extractedText.split('\n');
      const nonEmptyLines = lines.filter(line => line.trim().length > 0);

      // Check for reasonable line structure
      if (nonEmptyLines.length === 0) {
        issues.push('No text structure detected');
        score = 0.3;
      } else if (nonEmptyLines.length === 1 && params.documentType !== 'form') {
        issues.push('Single line detected - possible layout loss');
        score -= 0.2;
      }

      // Analyze line length consistency (for text documents)
      if (params.documentType === 'text') {
        const lineLengths = nonEmptyLines.map(line => line.trim().length);
        const avgLineLength = lineLengths.reduce((sum, len) => sum + len, 0) / lineLengths.length;
        const variance = lineLengths.reduce((sum, len) => sum + Math.pow(len - avgLineLength, 2), 0) / lineLengths.length;

        if (variance > avgLineLength * 2) {
          issues.push('High line length variance - possible column mixing');
          score -= 0.1;
        }
      }

      // Check for table-like structures (for forms/tables)
      if (params.documentType === 'table' || params.documentType === 'form') {
        const tabularScore = this.analyzeTabularStructure(params.extractedText);
        layoutScore = tabularScore;

        if (tabularScore < 0.6) {
          issues.push('Table structure not well preserved');
          score = Math.min(score, tabularScore + 0.1);
        }
      }

      // Use ImageMagick to analyze spatial distribution
      const spatialAnalysis = await this.analyzeSpatialDistribution(params.originalImagePath);
      if (spatialAnalysis) {
        layoutScore = Math.max(layoutScore, spatialAnalysis.score);
        if (spatialAnalysis.issues.length > 0) {
          issues.push(...spatialAnalysis.issues);
        }
      }

    } catch (error) {
      console.warn(`⚠️  [QUALITY-SCORE] Layout analysis fallback:`, error instanceof Error ? error.message : 'Unknown error');
      issues.push('Layout analysis partially failed');
      score *= 0.9;
    }

    return {
      score: Math.max(0, Math.min(1, score)),
      issues,
      layoutScore: Math.max(0, Math.min(1, layoutScore))
    };
  }

  /**
   * Analyze OCR confidence consistency
   */
  private static async analyzeConfidenceConsistency(params: {
    ocrConfidenceData?: any;
    extractedText: string;
  }): Promise<AnalysisResult & { averageConfidence: number }> {
    const issues: string[] = [];
    let score = 0.8;
    let averageConfidence = 0.8;

    if (params.ocrConfidenceData) {
      // Analyze provided confidence data
      const confidences = this.extractConfidenceValues(params.ocrConfidenceData);

      if (confidences.length > 0) {
        averageConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;

        // Check for low confidence areas
        const lowConfidence = confidences.filter(conf => conf < this.CONFIDENCE_LEVELS.LOW);
        if (lowConfidence.length > confidences.length * 0.2) {
          issues.push(`High number of low-confidence regions: ${lowConfidence.length}/${confidences.length}`);
          score -= 0.15;
        }

        // Check confidence variance
        const variance = confidences.reduce((sum, conf) => sum + Math.pow(conf - averageConfidence, 2), 0) / confidences.length;
        if (variance > 0.1) {
          issues.push('High confidence variance detected');
          score -= 0.1;
        }

        score = Math.max(score, averageConfidence);
      }
    } else {
      // Estimate confidence from text characteristics
      const estimatedConfidence = this.estimateConfidenceFromText(params.extractedText);
      averageConfidence = estimatedConfidence.confidence;
      score = estimatedConfidence.confidence;

      if (estimatedConfidence.issues.length > 0) {
        issues.push(...estimatedConfidence.issues);
      }
    }

    return {
      score: Math.max(0, Math.min(1, score)),
      issues,
      averageConfidence: Math.max(0, Math.min(1, averageConfidence))
    };
  }

  /**
   * Analyze text completeness
   */
  private static async analyzeTextCompleteness(params: {
    extractedText: string;
    originalImagePath: string;
    expectedTextSample?: string;
  }): Promise<AnalysisResult & { completenessRatio: number }> {
    const issues: string[] = [];
    let score = 0.8;
    let completenessRatio = 0.8;

    try {
      // Estimate expected text regions using image analysis
      const textRegionAnalysis = await this.analyzeTextRegions(params.originalImagePath);

      if (textRegionAnalysis) {
        const estimatedTextAmount = textRegionAnalysis.estimatedCharacterCount;
        const actualTextAmount = params.extractedText.length;

        completenessRatio = Math.min(1, actualTextAmount / Math.max(1, estimatedTextAmount));
        score = completenessRatio;

        if (completenessRatio < 0.8) {
          issues.push(`Potential missing text: extracted ${actualTextAmount} chars, estimated ${estimatedTextAmount}`);
        }

        // Check for empty regions
        if (textRegionAnalysis.emptyRegions > 0) {
          issues.push(`${textRegionAnalysis.emptyRegions} text regions appear empty`);
          score -= textRegionAnalysis.emptyRegions * 0.05;
        }
      }

      // Compare with reference if available
      if (params.expectedTextSample) {
        const expectedLength = params.expectedTextSample.length;
        const actualLength = params.extractedText.length;
        completenessRatio = Math.min(1, actualLength / Math.max(1, expectedLength));
        score = completenessRatio;

        if (completenessRatio < 0.9) {
          issues.push(`Text length mismatch: got ${actualLength}, expected ~${expectedLength}`);
        }
      }

    } catch (error) {
      console.warn(`⚠️  [QUALITY-SCORE] Completeness analysis fallback:`, error instanceof Error ? error.message : 'Unknown error');
      issues.push('Completeness analysis partially failed');
    }

    return {
      score: Math.max(0, Math.min(1, score)),
      issues,
      completenessRatio: Math.max(0, Math.min(1, completenessRatio))
    };
  }

  /**
   * Calculate weighted overall quality score
   */
  private static calculateOverallScore(scores: {
    characterAccuracy: number;
    wordAccuracy: number;
    layoutPreservation: number;
    confidenceConsistency: number;
    textCompleteness: number;
  }): number {
    return (
      (scores.characterAccuracy * this.SCORING_WEIGHTS.CHARACTER_ACCURACY) +
      (scores.wordAccuracy * this.SCORING_WEIGHTS.WORD_ACCURACY) +
      (scores.layoutPreservation * this.SCORING_WEIGHTS.LAYOUT_PRESERVATION) +
      (scores.confidenceConsistency * this.SCORING_WEIGHTS.CONFIDENCE_CONSISTENCY) +
      (scores.textCompleteness * this.SCORING_WEIGHTS.TEXT_COMPLETENESS)
    );
  }

  /**
   * Determine quality level from score
   */
  private static determineQualityLevel(score: number): QualityLevel {
    if (score >= this.QUALITY_THRESHOLDS.EXCELLENT) return 'excellent';
    if (score >= this.QUALITY_THRESHOLDS.GOOD) return 'good';
    if (score >= this.QUALITY_THRESHOLDS.ACCEPTABLE) return 'acceptable';
    return 'poor';
  }

  /**
   * Generate improvement recommendations
   */
  private static generateRecommendations(
    overallScore: number,
    documentType: string,
    analyses: any
  ): string[] {
    const recommendations: string[] = [];

    if (overallScore < this.QUALITY_THRESHOLDS.GOOD) {
      // Character accuracy issues
      if (analyses.characterAnalysis.score < 0.8) {
        recommendations.push('Improve image preprocessing - apply sharpening and contrast enhancement');
        recommendations.push('Consider higher resolution scanning (300+ DPI)');
      }

      // Word accuracy issues
      if (analyses.wordAnalysis.score < 0.8) {
        recommendations.push('Apply dictionary-based post-processing to correct common OCR errors');
        recommendations.push('Consider language-specific OCR models if available');
      }

      // Layout issues
      if (analyses.layoutAnalysis.score < 0.7) {
        recommendations.push('Review document orientation and skew correction');
        if (documentType === 'table') {
          recommendations.push('Consider specialized table extraction algorithms');
        }
      }

      // Confidence issues
      if (analyses.confidenceAnalysis.score < 0.7) {
        recommendations.push('Try alternative OCR engines for this document type');
        recommendations.push('Apply noise reduction and despeckling');
      }

      // Completeness issues
      if (analyses.completenessAnalysis.score < 0.8) {
        recommendations.push('Check for missing text regions - consider segmentation review');
        recommendations.push('Verify entire document is captured in scan');
      }
    }

    if (overallScore >= this.QUALITY_THRESHOLDS.EXCELLENT) {
      recommendations.push('Excellent OCR quality achieved - no improvements needed');
    } else if (recommendations.length === 0) {
      recommendations.push('Good OCR quality - minor improvements possible');
    }

    return recommendations;
  }

  /**
   * Helper methods for detailed analysis
   */
  private static analyzeCharacterFrequency(text: string): Map<string, number> {
    const freq = new Map<string, number>();
    for (const char of text.toLowerCase()) {
      if (/[a-z0-9]/.test(char)) {
        freq.set(char, (freq.get(char) || 0) + 1);
      }
    }
    return freq;
  }

  private static detectSuspiciousCharacters(text: string): string[] {
    const suspicious = [];
    const suspiciousPatterns = [
      /[|]/g,     // Pipe characters (often OCR errors)
      /[_]{2,}/g, // Multiple underscores
      /[~]/g,     // Tildes in regular text
      /[¦]/g,     // Broken pipe
      /[°]/g      // Degree symbol in regular text
    ];

    for (const pattern of suspiciousPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        suspicious.push(...matches.slice(0, 3)); // Limit examples
      }
    }

    return suspicious;
  }

  private static analyzeCharacterDistribution(freq: Map<string, number>): { unbalanced: boolean } {
    const total = Array.from(freq.values()).reduce((sum, count) => sum + count, 0);
    const expectedFreq = total / freq.size;

    let deviations = 0;
    for (const [char, count] of freq) {
      if (Math.abs(count - expectedFreq) > expectedFreq * 2) {
        deviations++;
      }
    }

    return { unbalanced: deviations > freq.size * 0.3 };
  }

  private static calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return 1 - matrix[str2.length][str1.length] / maxLength;
  }

  private static detectCommonOCRErrors(words: string[]): string[] {
    const commonErrors = [];
    const errorPatterns = [
      { pattern: /rn/g, replacement: 'm' },
      { pattern: /cl/g, replacement: 'd' },
      { pattern: /0/g, replacement: 'o' },
      { pattern: /1/g, replacement: 'l' }
    ];

    for (const word of words.slice(0, 100)) { // Limit analysis
      for (const error of errorPatterns) {
        if (error.pattern.test(word)) {
          commonErrors.push(word);
          break;
        }
      }
    }

    return [...new Set(commonErrors)];
  }

  private static calculateWordAccuracy(actual: string[], expected: string[]): number {
    const actualWords = new Set(actual.map(w => w.toLowerCase()));
    const expectedWords = new Set(expected.map(w => w.toLowerCase()));

    const intersection = new Set([...actualWords].filter(w => expectedWords.has(w)));
    const union = new Set([...actualWords, ...expectedWords]);

    return intersection.size / union.size;
  }

  private static analyzeTabularStructure(text: string): number {
    const lines = text.split('\n');
    let tabularScore = 0.5;

    // Look for consistent column separators
    const tabCount = lines.reduce((sum, line) => sum + (line.match(/\t/g) || []).length, 0);
    const spaceCount = lines.reduce((sum, line) => sum + (line.match(/\s{3,}/g) || []).length, 0);

    if (tabCount > lines.length * 0.5 || spaceCount > lines.length * 0.3) {
      tabularScore += 0.3;
    }

    return Math.min(1, tabularScore);
  }

  private static async analyzeSpatialDistribution(imagePath: string): Promise<{ score: number; issues: string[] } | null> {
    try {
      const result = await this.executeImageMagick([
        'convert', imagePath,
        '-colorspace', 'Gray',
        '-threshold', '50%',
        '-connected-components', '8',
        'info:-'
      ]);

      const components = result.stdout.split('\n').length - 1;
      const score = Math.max(0.5, Math.min(1, components / 100)); // Rough spatial score

      return { score, issues: [] };
    } catch (error) {
      return null;
    }
  }

  private static extractConfidenceValues(confidenceData: any): number[] {
    if (Array.isArray(confidenceData)) {
      return confidenceData.filter(c => typeof c === 'number' && c >= 0 && c <= 1);
    }
    return [];
  }

  private static estimateConfidenceFromText(text: string): { confidence: number; issues: string[] } {
    const issues = [];
    let confidence = 0.8;

    // Check for obvious OCR errors
    const errorPatterns = /[|_~¦°]{2,}/g;
    const errors = (text.match(errorPatterns) || []).length;
    confidence -= errors * 0.05;

    // Check character diversity
    const uniqueChars = new Set(text.toLowerCase().replace(/\s/g, '')).size;
    if (uniqueChars < 10) {
      issues.push('Low character diversity');
      confidence -= 0.1;
    }

    return { confidence: Math.max(0.3, Math.min(1, confidence)), issues };
  }

  private static async analyzeTextRegions(imagePath: string): Promise<{ estimatedCharacterCount: number; emptyRegions: number } | null> {
    try {
      const result = await this.executeImageMagick([
        'convert', imagePath,
        '-colorspace', 'Gray',
        '-threshold', '50%',
        '-morphology', 'Open', 'Rectangle:2x2',
        'txt:-'
      ]);

      const blackPixels = (result.stdout.match(/black/g) || []).length;
      const estimatedCharacterCount = Math.max(100, blackPixels / 100); // Rough estimation

      return { estimatedCharacterCount, emptyRegions: 0 };
    } catch (error) {
      return null;
    }
  }

  private static calculateAssessmentConfidence(params: {
    hasReferenceText: boolean;
    confidenceDataAvailable: boolean;
    documentType: string;
    textLength: number;
  }): number {
    let confidence = 0.7;

    if (params.hasReferenceText) confidence += 0.2;
    if (params.confidenceDataAvailable) confidence += 0.1;
    if (params.textLength > 100) confidence += 0.1;
    if (params.documentType === 'text') confidence += 0.05;

    return Math.max(0.5, Math.min(1, confidence));
  }

  /**
   * Execute ImageMagick command
   */
  private static async executeImageMagick(
    args: string[],
    timeout: number = 15000
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const process = spawn('magick', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        shell: false
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`ImageMagick process failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`ImageMagick process error: ${error.message}`));
      });

      const timeoutId = setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error(`ImageMagick process timeout after ${timeout}ms`));
      }, timeout);

      process.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }
}

/**
 * Type definitions for quality scoring
 */
export interface QualityAssessmentResult {
  overallScore: number;
  qualityLevel: QualityLevel;
  processingTime: number;
  detailedScores: {
    characterAccuracy: number;
    wordAccuracy: number;
    layoutPreservation: number;
    confidenceConsistency: number;
    textCompleteness: number;
  };
  metrics: {
    totalCharacters: number;
    totalWords: number;
    averageConfidence: number;
    layoutScore: number;
    completenessRatio: number;
  };
  issues: string[];
  recommendations: string[];
  confidence: number; // Confidence in the assessment itself
}

type QualityLevel = 'excellent' | 'good' | 'acceptable' | 'poor';

interface AnalysisResult {
  score: number;
  issues: string[];
}

export default QualityScoring;