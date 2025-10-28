/**
 * PDF QUALITY OPTIMIZER AGENT
 *
 * BMAD AI Agent specializing in PDF conversion quality analysis and optimization
 * Intelligently analyzes document structure and recommends optimal processing strategies
 */

import pdf from 'pdf-parse';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  BMADAgent,
  AgentPersona,
  AgentCapability,
  AgentTask,
  AgentResponse,
  AgentStatus,
  AgentHealthCheck,
  PerformanceMetrics,
  PDFQualityAnalysis,
  DocumentComplexity,
  ContentAnalysis,
  OptimizationRecommendation,
  QualityPrediction,
  ProcessingRecommendation
} from '../../types/bmad-agent.types';

export class PDFQualityOptimizerAgent implements BMADAgent {
  public readonly id: string = 'pdf-quality-optimizer';
  public readonly name: string = 'PDF Quality Optimizer Agent';
  public readonly version: string = '1.0.0';

  public readonly persona: AgentPersona = {
    role: 'PDF Quality Analysis Specialist',
    expertise: [
      'Document structure analysis',
      'Content complexity assessment',
      'Conversion quality prediction',
      'Engine selection optimization',
      'Visual fidelity analysis',
      'Processing efficiency optimization'
    ],
    style: 'analytical',
    coreRrinciples: [
      'Quality-first decision making',
      'Data-driven recommendations',
      'Comprehensive analysis before action',
      'Predictive optimization',
      'Resource efficiency awareness'
    ],
    operationalDirectives: [
      'Analyze document structure thoroughly before recommendations',
      'Consider both quality and performance trade-offs',
      'Provide actionable, specific optimization suggestions',
      'Predict potential issues before they occur',
      'Continuously learn from conversion outcomes'
    ],
    decisionApproach: 'data-driven'
  };

  public readonly capabilities: AgentCapability[] = [
    {
      name: 'analyze-pdf-quality',
      description: 'Comprehensive PDF document quality and complexity analysis',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to PDF file' },
          options: {
            type: 'object',
            properties: {
              deepAnalysis: { type: 'boolean', default: true },
              includePreview: { type: 'boolean', default: false },
              generateThumbnails: { type: 'boolean', default: false }
            }
          }
        },
        required: ['filePath']
      },
      outputSchema: {
        type: 'object',
        properties: {
          analysis: { type: 'object', description: 'Complete quality analysis' },
          recommendations: { type: 'array', description: 'Optimization recommendations' },
          predictions: { type: 'object', description: 'Quality predictions' }
        }
      },
      estimatedExecutionTime: 2000,
      resourceRequirements: {
        cpu: 'medium',
        memory: 128,
        network: 'none',
        storage: 10
      }
    },
    {
      name: 'recommend-engine',
      description: 'Recommend optimal conversion engine based on document analysis',
      inputSchema: {
        type: 'object',
        properties: {
          analysis: { type: 'object', description: 'Document analysis result' },
          constraints: {
            type: 'object',
            properties: {
              maxProcessingTime: { type: 'number' },
              prioritizeQuality: { type: 'boolean', default: true },
              availableEngines: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        required: ['analysis']
      },
      outputSchema: {
        type: 'object',
        properties: {
          recommendedEngine: { type: 'string' },
          alternatives: { type: 'array', items: { type: 'string' } },
          rationale: { type: 'string' },
          expectedQuality: { type: 'number' },
          expectedTime: { type: 'number' }
        }
      },
      estimatedExecutionTime: 500,
      resourceRequirements: {
        cpu: 'low',
        memory: 32,
        network: 'none',
        storage: 1
      }
    },
    {
      name: 'optimize-preprocessing',
      description: 'Generate preprocessing recommendations for quality enhancement',
      inputSchema: {
        type: 'object',
        properties: {
          analysis: { type: 'object', description: 'Document analysis result' },
          targetQuality: { type: 'number', minimum: 0, maximum: 1, default: 0.9 }
        },
        required: ['analysis']
      },
      outputSchema: {
        type: 'object',
        properties: {
          preprocessingSteps: { type: 'array', description: 'Preprocessing recommendations' },
          expectedImprovement: { type: 'number' },
          estimatedCost: { type: 'object', description: 'Resource cost estimate' }
        }
      },
      estimatedExecutionTime: 300,
      resourceRequirements: {
        cpu: 'low',
        memory: 16,
        network: 'none',
        storage: 1
      }
    }
  ];

  private performance: PerformanceMetrics = {
    tasksCompleted: 0,
    averageResponseTime: 0,
    successRate: 1.0,
    errorCount: 0,
    throughput: 0,
    resourceEfficiency: 0.95
  };

  private currentTask?: string;
  private lastActivity: Date = new Date();
  private initialized: boolean = false;

  public get status(): AgentStatus {
    return {
      state: this.currentTask ? 'busy' : 'idle',
      currentTaskId: this.currentTask,
      queuedTasks: 0, // Single-threaded agent
      performance: this.performance,
      lastActivity: this.lastActivity,
      health: this.performance.errorCount < 5 ? 'healthy' : 'degraded'
    };
  }

  /**
   * Initialize the PDF Quality Optimizer Agent
   */
  public async initialize(): Promise<void> {
    console.log('🎯 [PDF-QUALITY-OPTIMIZER] Initializing PDF Quality Optimizer Agent...');

    try {
      // Reset performance metrics
      this.performance = {
        tasksCompleted: 0,
        averageResponseTime: 0,
        successRate: 1.0,
        errorCount: 0,
        throughput: 0,
        resourceEfficiency: 0.95
      };

      this.lastActivity = new Date();
      this.initialized = true;

      console.log('✅ [PDF-QUALITY-OPTIMIZER] Agent initialized successfully');
      console.log(`   📊 Capabilities: ${this.capabilities.length} available`);
      console.log(`   🎯 Specialization: PDF quality analysis and optimization`);

    } catch (error) {
      console.error('❌ [PDF-QUALITY-OPTIMIZER] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Execute agent task
   */
  public async execute(task: AgentTask): Promise<AgentResponse> {
    if (!this.initialized) {
      throw new Error('Agent not initialized');
    }

    console.log(`🚀 [PDF-QUALITY-OPTIMIZER] Executing task: ${task.capability}`);
    const startTime = Date.now();
    this.currentTask = task.id;
    this.lastActivity = new Date();

    try {
      let result: any;

      switch (task.capability) {
        case 'analyze-pdf-quality':
          result = await this.analyzePDFQuality(task.input);
          break;

        case 'recommend-engine':
          result = await this.recommendEngine(task.input);
          break;

        case 'optimize-preprocessing':
          result = await this.optimizePreprocessing(task.input);
          break;

        default:
          throw new Error(`Unknown capability: ${task.capability}`);
      }

      const processingTime = Date.now() - startTime;
      this.updatePerformanceMetrics(processingTime, true);

      console.log(`✅ [PDF-QUALITY-OPTIMIZER] Task completed in ${processingTime}ms`);

      return {
        success: true,
        data: result,
        metadata: {
          processingTime,
          confidence: this.calculateConfidence(task.capability, result),
          resourceUsage: {
            cpu: this.estimateCPUUsage(task.capability),
            memory: this.estimateMemoryUsage(task.capability),
            networkIO: 0,
            storageIO: this.estimateStorageUsage(task.capability)
          },
          qualityScore: this.calculateQualityScore(result)
        },
        recommendations: this.generateTaskRecommendations(task.capability, result)
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      this.updatePerformanceMetrics(processingTime, false);

      console.error(`❌ [PDF-QUALITY-OPTIMIZER] Task failed:`, error.message);

      return {
        success: false,
        error: {
          code: 'TASK_EXECUTION_FAILED',
          message: error.message,
          details: { capability: task.capability, taskId: task.id },
          recoverySuggestions: [
            'Verify input file exists and is readable',
            'Check file format is valid PDF',
            'Retry with different parameters'
          ],
          retryable: true
        },
        metadata: {
          processingTime,
          confidence: 0,
          resourceUsage: { cpu: 0, memory: 0, networkIO: 0, storageIO: 0 }
        }
      };

    } finally {
      this.currentTask = undefined;
    }
  }

  /**
   * Get agent health status
   */
  public async getHealth(): Promise<AgentHealthCheck> {
    const checks: any[] = [
      {
        name: 'initialization',
        status: this.initialized ? 'pass' : 'fail',
        message: this.initialized ? 'Agent properly initialized' : 'Agent not initialized',
        duration: 0
      },
      {
        name: 'performance',
        status: this.performance.successRate >= 0.8 ? 'pass' :
                this.performance.successRate >= 0.6 ? 'warn' : 'fail',
        message: `Success rate: ${(this.performance.successRate * 100).toFixed(1)}%`,
        duration: 0
      },
      {
        name: 'resource-efficiency',
        status: this.performance.resourceEfficiency >= 0.8 ? 'pass' : 'warn',
        message: `Resource efficiency: ${(this.performance.resourceEfficiency * 100).toFixed(1)}%`,
        duration: 0
      },
      {
        name: 'error-rate',
        status: this.performance.errorCount < 5 ? 'pass' :
                this.performance.errorCount < 10 ? 'warn' : 'fail',
        message: `Error count: ${this.performance.errorCount}`,
        duration: 0
      }
    ];

    const failedChecks = checks.filter(check => check.status === 'fail').length;
    const warnChecks = checks.filter(check => check.status === 'warn').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (failedChecks === 0 && warnChecks <= 1) {
      overallStatus = 'healthy';
    } else if (failedChecks <= 1) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    return {
      status: overallStatus,
      checks,
      timestamp: new Date(),
      nextCheck: new Date(Date.now() + 30000) // 30 seconds
    };
  }

  /**
   * Cleanup agent resources
   */
  public async dispose(): Promise<void> {
    console.log('🧹 [PDF-QUALITY-OPTIMIZER] Disposing agent resources...');

    this.currentTask = undefined;
    this.initialized = false;

    console.log('✅ [PDF-QUALITY-OPTIMIZER] Agent disposed successfully');
  }

  // ========== PRIVATE CAPABILITY IMPLEMENTATIONS ==========

  /**
   * Analyze PDF quality and complexity
   */
  private async analyzePDFQuality(input: any): Promise<PDFQualityAnalysis> {
    const { filePath, options = {} } = input;

    console.log(`🔍 [PDF-QUALITY-OPTIMIZER] Analyzing PDF: ${path.basename(filePath)}`);

    // Read and parse PDF
    const pdfBuffer = await fs.readFile(filePath);
    const pdfData = await pdf(pdfBuffer);

    // Perform comprehensive analysis
    const complexity = await this.analyzeDocumentComplexity(pdfData, filePath);
    const contentAnalysis = await this.analyzeContent(pdfData);
    const optimizationRecommendations = this.generateOptimizationRecommendations(complexity, contentAnalysis);
    const qualityPrediction = this.predictQuality(complexity, contentAnalysis);
    const processingRecommendations = this.generateProcessingRecommendations(complexity, contentAnalysis);

    const overallScore = this.calculateOverallQualityScore(complexity, contentAnalysis);

    return {
      overallScore,
      complexity,
      contentAnalysis,
      optimizationRecommendations,
      predictedQuality: qualityPrediction,
      processingRecommendations
    };
  }

  /**
   * Analyze document complexity
   */
  private async analyzeDocumentComplexity(pdfData: any, filePath: string): Promise<DocumentComplexity> {
    const text = pdfData.text;
    const pageCount = pdfData.numpages;

    // Text complexity analysis
    const textComplexity = this.calculateTextComplexity(text);

    // Visual complexity analysis
    const visualComplexity = await this.calculateVisualComplexity(pdfData, filePath);

    // Structure complexity analysis
    const structureComplexity = this.calculateStructureComplexity(text);

    // Overall complexity level
    const avgComplexity = (textComplexity + visualComplexity + structureComplexity) / 3;
    let complexityLevel: 'simple' | 'moderate' | 'complex' | 'very-complex';

    if (avgComplexity <= 2.5) complexityLevel = 'simple';
    else if (avgComplexity <= 5) complexityLevel = 'moderate';
    else if (avgComplexity <= 7.5) complexityLevel = 'complex';
    else complexityLevel = 'very-complex';

    // Identify complexity factors
    const factors: string[] = [];
    if (textComplexity > 6) factors.push('High text density');
    if (visualComplexity > 6) factors.push('Complex visual elements');
    if (structureComplexity > 6) factors.push('Complex document structure');
    if (pageCount > 20) factors.push('Large document size');

    return {
      textComplexity,
      visualComplexity,
      structureComplexity,
      complexityLevel,
      factors
    };
  }

  /**
   * Calculate text complexity score (0-10)
   */
  private calculateTextComplexity(text: string): number {
    let score = 0;

    // Base score on text density
    const textDensity = text.length / Math.max(1, text.split('\n').length);
    score += Math.min(3, textDensity / 1000);

    // Language complexity
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
    score += Math.min(2, avgSentenceLength / 20);

    // Font diversity (estimated)
    const uniqueWords = new Set(text.toLowerCase().match(/\w+/g) || []).size;
    const totalWords = (text.match(/\w+/g) || []).length;
    const diversity = uniqueWords / Math.max(1, totalWords);
    score += Math.min(2, diversity * 10);

    // Special characters and formatting
    const specialChars = (text.match(/[^\w\s]/g) || []).length;
    score += Math.min(3, specialChars / text.length * 100);

    return Math.min(10, score);
  }

  /**
   * Calculate visual complexity score (0-10)
   */
  private async calculateVisualComplexity(pdfData: any, filePath: string): Promise<number> {
    let score = 0;

    try {
      // Estimate based on file size (larger files often have more visual content)
      const stats = await fs.stat(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      score += Math.min(3, fileSizeMB / 10);

      // Estimate based on text-to-page ratio
      const textPerPage = pdfData.text.length / Math.max(1, pdfData.numpages);
      if (textPerPage < 500) score += 3; // Likely image-heavy
      else if (textPerPage < 1000) score += 2;
      else if (textPerPage < 2000) score += 1;

      // Look for visual content indicators in text
      const visualKeywords = [
        'image', 'figure', 'chart', 'graph', 'table', 'diagram',
        'photo', 'picture', 'illustration', 'logo', 'signature'
      ];
      const lowerText = pdfData.text.toLowerCase();
      const visualHints = visualKeywords.filter(keyword => lowerText.includes(keyword)).length;
      score += Math.min(4, visualHints);

    } catch (error) {
      console.warn('Visual complexity analysis warning:', error);
      score = 5; // Default moderate complexity
    }

    return Math.min(10, score);
  }

  /**
   * Calculate structure complexity score (0-10)
   */
  private calculateStructureComplexity(text: string): number {
    let score = 0;

    const lines = text.split('\n').filter(line => line.trim().length > 0);

    // Form field detection
    const formPatterns = [
      /^(Name|Client|Full Name):\s*/i,
      /^(ID|Account|Reference):\s*/i,
      /^(Date|Phone|Email):\s*/i
    ];
    const formFields = lines.filter(line =>
      formPatterns.some(pattern => pattern.test(line))
    ).length;
    score += Math.min(3, formFields * 0.5);

    // Header/section structure
    const headers = lines.filter(line =>
      line.length < 60 &&
      (line.toUpperCase() === line || /^[A-Z][^:]*:?$/.test(line.trim()))
    ).length;
    score += Math.min(2, headers * 0.2);

    // Indentation patterns (structure indicators)
    const indentedLines = lines.filter(line =>
      line.startsWith('  ') || line.startsWith('\t')
    ).length;
    score += Math.min(2, (indentedLines / lines.length) * 10);

    // List structures
    const listItems = lines.filter(line =>
      /^\s*[-*•]\s/.test(line) || /^\s*\d+[\.)]\s/.test(line)
    ).length;
    score += Math.min(2, listItems * 0.1);

    // Table-like structures
    const tableRows = lines.filter(line =>
      (line.match(/\s+/g) || []).length >= 3 && line.length > 20
    ).length;
    score += Math.min(1, tableRows * 0.1);

    return Math.min(10, score);
  }

  /**
   * Analyze document content
   */
  private async analyzeContent(pdfData: any): Promise<ContentAnalysis> {
    const text = pdfData.text;
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    // Text analysis
    const textAnalysis = {
      characterCount: text.length,
      wordCount: (text.match(/\w+/g) || []).length,
      lineCount: lines.length,
      fontDiversity: this.calculateFontDiversity(text),
      textDensity: text.length / Math.max(1, pdfData.numpages),
      languages: ['en'] // Simplified - could integrate language detection
    };

    // Image analysis (heuristic-based)
    const imageKeywords = ['image', 'figure', 'photo', 'chart', 'graph'];
    const imageHints = imageKeywords.filter(keyword =>
      text.toLowerCase().includes(keyword)
    ).length;

    const imageAnalysis = {
      imageCount: imageHints,
      imageTypes: imageHints > 0 ? ['jpg', 'png'] : [],
      averageImageSize: imageHints * 500, // Estimated
      imageQuality: imageHints > 3 ? 'high' as const : 'medium' as const,
      hasComplexGraphics: imageHints > 5
    };

    // Form analysis
    const formPatterns = [
      /^(Name|Client Name|Full Name):\s*/i,
      /^(ID|ID Number|Account):\s*/i,
      /^(Address|Phone|Email):\s*/i
    ];
    const formFieldCount = lines.filter(line =>
      formPatterns.some(pattern => pattern.test(line))
    ).length;

    const formAnalysis = {
      fieldCount: formFieldCount,
      formTypes: formFieldCount > 0 ? ['application-form'] : [],
      hasInteractiveElements: formFieldCount > 3,
      complexityLevel: formFieldCount > 5 ? 'complex' as const :
                       formFieldCount > 2 ? 'moderate' as const : 'simple' as const
    };

    // Table analysis
    const tableRows = lines.filter(line =>
      (line.match(/\s+/g) || []).length >= 3 && line.length > 20
    ).length;

    const tableAnalysis = {
      tableCount: Math.max(0, Math.floor(tableRows / 3)),
      hasComplexTables: tableRows > 10,
      averageTableSize: tableRows > 0 ? tableRows / Math.max(1, Math.floor(tableRows / 3)) : 0,
      formattingComplexity: tableRows > 15 ? 'complex' as const :
                           tableRows > 5 ? 'moderate' as const : 'simple' as const
    };

    return {
      text: textAnalysis,
      images: imageAnalysis,
      forms: formAnalysis,
      tables: tableAnalysis
    };
  }

  /**
   * Calculate font diversity score
   */
  private calculateFontDiversity(text: string): number {
    // Simplified heuristic based on character variety
    const uniqueChars = new Set(text).size;
    const totalChars = text.length;
    return Math.min(10, (uniqueChars / Math.max(1, totalChars)) * 100);
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    complexity: DocumentComplexity,
    content: ContentAnalysis
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Text-based recommendations
    if (complexity.textComplexity > 7) {
      recommendations.push({
        category: 'preprocessing',
        title: 'Text Preprocessing Optimization',
        description: 'Apply advanced text extraction with enhanced spacing algorithms',
        expectedImprovement: 15,
        complexity: 'medium',
        resourceImpact: 'moderate'
      });
    }

    // Visual content recommendations
    if (complexity.visualComplexity > 6) {
      recommendations.push({
        category: 'engine-selection',
        title: 'Visual-First Engine Selection',
        description: 'Prioritize visual fidelity engine for image-heavy content',
        expectedImprovement: 25,
        complexity: 'low',
        resourceImpact: 'minimal'
      });
    }

    // Structure-based recommendations
    if (complexity.structureComplexity > 7) {
      recommendations.push({
        category: 'preprocessing',
        title: 'Structure-Aware Processing',
        description: 'Use layout-aware engine to preserve complex document structure',
        expectedImprovement: 20,
        complexity: 'high',
        resourceImpact: 'significant'
      });
    }

    // Form-specific recommendations
    if (content.forms.fieldCount > 3) {
      recommendations.push({
        category: 'engine-selection',
        title: 'Form-Optimized Engine',
        description: 'Use specialized form processing engine for field preservation',
        expectedImprovement: 30,
        complexity: 'medium',
        resourceImpact: 'moderate'
      });
    }

    return recommendations;
  }

  /**
   * Predict conversion quality
   */
  private predictQuality(complexity: DocumentComplexity, content: ContentAnalysis): QualityPrediction {
    // Base prediction on complexity and content analysis
    let textPreservation = 0.9;
    let layoutPreservation = 0.85;
    let visualPreservation = 0.8;

    // Adjust based on complexity
    if (complexity.complexityLevel === 'very-complex') {
      textPreservation -= 0.2;
      layoutPreservation -= 0.3;
      visualPreservation -= 0.25;
    } else if (complexity.complexityLevel === 'complex') {
      textPreservation -= 0.1;
      layoutPreservation -= 0.15;
      visualPreservation -= 0.15;
    }

    // Adjust based on content type
    if (content.images.imageCount > 5) {
      visualPreservation += 0.1; // Visual fidelity engine handles this well
    }

    if (content.forms.fieldCount > 3) {
      layoutPreservation += 0.1; // Layout-aware engine helps
    }

    // Ensure values stay in valid range
    textPreservation = Math.max(0.5, Math.min(1.0, textPreservation));
    layoutPreservation = Math.max(0.5, Math.min(1.0, layoutPreservation));
    visualPreservation = Math.max(0.5, Math.min(1.0, visualPreservation));

    const overallQuality = (textPreservation + layoutPreservation + visualPreservation) / 3;

    // Identify potential issues
    const potentialIssues: string[] = [];
    if (complexity.textComplexity > 8) potentialIssues.push('Complex text formatting may be lost');
    if (complexity.visualComplexity > 8) potentialIssues.push('Complex graphics may need manual adjustment');
    if (complexity.structureComplexity > 8) potentialIssues.push('Document structure may be simplified');
    if (content.tables.hasComplexTables) potentialIssues.push('Table formatting may require attention');

    return {
      textPreservation,
      layoutPreservation,
      visualPreservation,
      overallQuality,
      confidence: 0.85,
      potentialIssues
    };
  }

  /**
   * Generate processing recommendations
   */
  private generateProcessingRecommendations(
    complexity: DocumentComplexity,
    content: ContentAnalysis
  ): ProcessingRecommendation[] {
    const recommendations: ProcessingRecommendation[] = [];

    // Primary recommendation based on content analysis
    if (content.images.imageCount > 3 || complexity.visualComplexity > 6) {
      recommendations.push({
        recommendedEngine: 'visual-fidelity',
        parameters: {
          enhanceImages: true,
          preserveQuality: true,
          extractGraphics: true
        },
        alternatives: ['semantic-validation', 'optimized-engine'],
        rationale: 'High visual content detected - visual fidelity engine will best preserve images and graphics',
        expectedProcessingTime: 8000
      });
    } else if (content.forms.fieldCount > 3 || complexity.structureComplexity > 6) {
      recommendations.push({
        recommendedEngine: 'layout-aware',
        parameters: {
          preserveStructure: true,
          mapCoordinates: true,
          detectForms: true
        },
        alternatives: ['semantic-validation', 'optimized-engine'],
        rationale: 'Complex structure or forms detected - layout-aware engine will preserve positioning',
        expectedProcessingTime: 6000
      });
    } else if (complexity.textComplexity > 6) {
      recommendations.push({
        recommendedEngine: 'enhanced-spacing',
        parameters: {
          intelligentSpacing: true,
          preserveFormatting: true,
          enhanceReadability: true
        },
        alternatives: ['semantic-validation', 'visual-fidelity'],
        rationale: 'Complex text formatting detected - enhanced spacing engine will improve text quality',
        expectedProcessingTime: 5000
      });
    } else {
      recommendations.push({
        recommendedEngine: 'optimized-engine',
        parameters: {
          autoOptimize: true,
          balanceQualitySpeed: true
        },
        alternatives: ['semantic-validation', 'visual-fidelity'],
        rationale: 'Standard document - optimized engine will provide best balance of quality and speed',
        expectedProcessingTime: 4000
      });
    }

    return recommendations;
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallQualityScore(complexity: DocumentComplexity, content: ContentAnalysis): number {
    // Base score
    let score = 80;

    // Adjust based on complexity
    switch (complexity.complexityLevel) {
      case 'simple': score += 10; break;
      case 'moderate': score += 5; break;
      case 'complex': score -= 5; break;
      case 'very-complex': score -= 15; break;
    }

    // Content-based adjustments
    if (content.images.imageCount > 5) score -= 5;
    if (content.forms.fieldCount > 5) score -= 5;
    if (content.tables.hasComplexTables) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Recommend optimal engine
   */
  private async recommendEngine(input: any): Promise<any> {
    const { analysis, constraints = {} } = input;

    // Extract key metrics from analysis
    const complexity = analysis.complexity;
    const content = analysis.contentAnalysis;

    // Get processing recommendations
    const recommendations = this.generateProcessingRecommendations(complexity, content);
    const primary = recommendations[0];

    // Apply constraints
    let recommendedEngine = primary.recommendedEngine;
    let expectedQuality = analysis.predictedQuality.overallQuality;
    let expectedTime = primary.expectedProcessingTime;

    // Check time constraints
    if (constraints.maxProcessingTime && expectedTime > constraints.maxProcessingTime) {
      // Fallback to faster engine
      recommendedEngine = 'improved';
      expectedTime = 3000;
      expectedQuality *= 0.9; // Slight quality reduction
    }

    // Check available engines
    if (constraints.availableEngines && !constraints.availableEngines.includes(recommendedEngine)) {
      const available = constraints.availableEngines.find((engine: string) =>
        primary.alternatives.includes(engine)
      );
      if (available) {
        recommendedEngine = available;
      }
    }

    return {
      recommendedEngine,
      alternatives: primary.alternatives,
      rationale: primary.rationale,
      expectedQuality,
      expectedTime,
      confidence: 0.88
    };
  }

  /**
   * Generate preprocessing optimization recommendations
   */
  private async optimizePreprocessing(input: any): Promise<any> {
    const { analysis, targetQuality = 0.9 } = input;

    const preprocessingSteps: string[] = [];
    let expectedImprovement = 0;
    const estimatedCost = { time: 0, memory: 0, cpu: 'low' };

    // Generate steps based on analysis
    if (analysis.complexity.textComplexity > 7) {
      preprocessingSteps.push('Apply advanced text spacing algorithms');
      expectedImprovement += 0.1;
      estimatedCost.time += 2000;
      estimatedCost.memory += 64;
    }

    if (analysis.complexity.visualComplexity > 7) {
      preprocessingSteps.push('Enhance image extraction and processing');
      expectedImprovement += 0.15;
      estimatedCost.time += 3000;
      estimatedCost.memory += 128;
      estimatedCost.cpu = 'medium';
    }

    if (analysis.complexity.structureComplexity > 7) {
      preprocessingSteps.push('Apply structure-aware layout mapping');
      expectedImprovement += 0.12;
      estimatedCost.time += 2500;
      estimatedCost.memory += 96;
    }

    if (analysis.contentAnalysis.forms.fieldCount > 3) {
      preprocessingSteps.push('Enable form field detection and preservation');
      expectedImprovement += 0.08;
      estimatedCost.time += 1500;
      estimatedCost.memory += 32;
    }

    return {
      preprocessingSteps,
      expectedImprovement,
      estimatedCost
    };
  }

  // ========== UTILITY METHODS ==========

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(processingTime: number, success: boolean): void {
    this.performance.tasksCompleted++;

    // Update average response time
    const totalTime = this.performance.averageResponseTime * (this.performance.tasksCompleted - 1) + processingTime;
    this.performance.averageResponseTime = totalTime / this.performance.tasksCompleted;

    // Update success rate
    const totalSuccesses = this.performance.successRate * (this.performance.tasksCompleted - 1) + (success ? 1 : 0);
    this.performance.successRate = totalSuccesses / this.performance.tasksCompleted;

    // Update error count
    if (!success) {
      this.performance.errorCount++;
    }

    // Calculate throughput (tasks per minute)
    const uptimeMinutes = (Date.now() - this.lastActivity.getTime()) / 60000;
    this.performance.throughput = this.performance.tasksCompleted / Math.max(0.1, uptimeMinutes);
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(capability: string, result: any): number {
    switch (capability) {
      case 'analyze-pdf-quality':
        return 0.92; // High confidence in analysis
      case 'recommend-engine':
        return 0.88; // Good confidence in recommendations
      case 'optimize-preprocessing':
        return 0.85; // Moderate confidence in optimization
      default:
        return 0.8;
    }
  }

  /**
   * Estimate CPU usage
   */
  private estimateCPUUsage(capability: string): number {
    switch (capability) {
      case 'analyze-pdf-quality': return 65;
      case 'recommend-engine': return 25;
      case 'optimize-preprocessing': return 15;
      default: return 30;
    }
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(capability: string): number {
    switch (capability) {
      case 'analyze-pdf-quality': return 128;
      case 'recommend-engine': return 32;
      case 'optimize-preprocessing': return 16;
      default: return 64;
    }
  }

  /**
   * Estimate storage usage
   */
  private estimateStorageUsage(capability: string): number {
    switch (capability) {
      case 'analyze-pdf-quality': return 10;
      case 'recommend-engine': return 1;
      case 'optimize-preprocessing': return 1;
      default: return 5;
    }
  }

  /**
   * Calculate quality score for result
   */
  private calculateQualityScore(result: any): number {
    if (result.overallScore !== undefined) {
      return result.overallScore / 100;
    }
    if (result.expectedQuality !== undefined) {
      return result.expectedQuality;
    }
    return 0.85; // Default quality score
  }

  /**
   * Generate task-specific recommendations
   */
  private generateTaskRecommendations(capability: string, result: any): any[] {
    const recommendations: any[] = [];

    if (capability === 'analyze-pdf-quality' && result.overallScore < 70) {
      recommendations.push({
        type: 'warning',
        message: 'Low quality score detected - consider preprocessing optimization',
        priority: 'high',
        actions: ['Run optimize-preprocessing capability', 'Review engine selection']
      });
    }

    if (capability === 'recommend-engine' && result.expectedQuality < 0.8) {
      recommendations.push({
        type: 'optimization',
        message: 'Consider preprocessing steps to improve expected quality',
        priority: 'medium',
        actions: ['Apply preprocessing optimization', 'Use fallback engine chain']
      });
    }

    return recommendations;
  }
}