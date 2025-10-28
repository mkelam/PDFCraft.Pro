/**
 * PDF CONVERSION ROUTER SERVICE
 *
 * Intelligent routing system for PDF conversions
 * Integrates CloudConvert, cost optimization, fallback orchestration, and performance monitoring
 * Makes optimal decisions about which service to use for each conversion
 */

import {
  PDFConversionService,
  ConversionResult,
  ConversionOptions
} from '../types/pdf-conversion.types';
import { CloudConvertAdapter } from './cloudconvert-adapter.service';
import { FallbackOrchestrator } from './fallback-orchestrator.service';
import { CloudConvertCostOptimizer, cloudConvertCostOptimizer } from './cloudconvert-cost-optimizer.service';
// import { serviceContainer } from './service-container'; // Deferred to avoid circular dependency
import { promises as fs } from 'fs';
import path from 'path';

export interface RoutingDecision {
  selectedService: string;
  reasoning: string[];
  costEstimate?: number;
  estimatedTime: number;
  confidence: number;
  fallbackPlan: string[];
}

export interface RoutingContext {
  inputPath: string;
  outputDir: string;
  options: ConversionOptions;
  userContext: {
    userId?: string;
    userTier: 'free' | 'starter' | 'pro' | 'enterprise';
    priority: 'low' | 'normal' | 'high';
    previousSuccesses: string[];
    preferredService?: string;
  };
  fileMetadata: {
    size: number;
    pageCount: number;
    documentType: string;
    complexity: 'low' | 'medium' | 'high';
  };
}

export interface PerformanceMetrics {
  serviceName: string;
  averageTime: number;
  successRate: number;
  averageQuality: number;
  lastUsed: Date;
  totalUsage: number;
}

export class PDFConversionRouter {
  private fallbackOrchestrator: FallbackOrchestrator;
  private costOptimizer: CloudConvertCostOptimizer;
  private cloudConvertAdapter: CloudConvertAdapter;
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();
  private routingRules: RoutingRule[] = [];

  constructor() {
    this.fallbackOrchestrator = new FallbackOrchestrator({
      primaryService: 'cloudconvert',
      fallbackChain: ['improved', 'visual-fidelity'] // OCR-based services only as last resort
    });

    this.costOptimizer = cloudConvertCostOptimizer;
    this.cloudConvertAdapter = new CloudConvertAdapter();
    this.initializeRoutingRules();
    // Service registration deferred to init() method to avoid circular dependency
  }

  /**
   * Initialize router with service container (call after service container is ready)
   */
  async init(): Promise<void> {
    try {
      // Dynamic import to avoid circular dependency
      const { serviceContainer } = await import('./service-container');
      this.registerServicesWithOrchestrator(serviceContainer);
      console.log('🎯 [PDF-ROUTER] Initialized with service container');
    } catch (error) {
      console.warn('⚠️ [PDF-ROUTER] Failed to initialize with service container:', error);
    }
  }

  /**
   * Main conversion routing method
   */
  async routeConversion(context: RoutingContext): Promise<ConversionResult> {
    console.log('🎯 [PDF-ROUTER] Starting intelligent conversion routing...');

    try {
      // 1. Make routing decision
      const decision = await this.makeRoutingDecision(context);
      console.log(`📋 [PDF-ROUTER] Routing decision: ${decision.selectedService} (confidence: ${(decision.confidence * 100).toFixed(1)}%)`);
      console.log(`💭 [PDF-ROUTER] Reasoning: ${decision.reasoning.join(', ')}`);

      // 2. Execute conversion with selected strategy
      const result = await this.executeConversion(decision, context);

      // 3. Record performance metrics
      await this.recordPerformanceMetrics(decision.selectedService, result, Date.now());

      // 4. Handle post-conversion tasks
      await this.handlePostConversion(result, decision, context);

      return result;

    } catch (error) {
      console.error('❌ [PDF-ROUTER] Routing failed:', error);
      throw error;
    }
  }

  /**
   * Make intelligent routing decision
   */
  private async makeRoutingDecision(context: RoutingContext): Promise<RoutingDecision> {
    const reasoning: string[] = [];
    // Default to CloudConvert as primary service
    let selectedService = 'cloudconvert';
    let confidence = 0.95;
    let costEstimate: number | undefined;
    let estimatedTime = 15000; // CloudConvert is fast: ~15 seconds

    // Step 1: Check CloudConvert and get cost estimate
    const cloudConvertDecision = await this.evaluateCloudConvert(context);
    costEstimate = cloudConvertDecision.costEstimate;
    reasoning.push('CloudConvert selected as primary: superior quality, professional formatting, and fast processing');

    // Step 2: Only fall back to local services if CloudConvert is specifically not viable
    if (!cloudConvertDecision.viable) {
      const localServiceDecision = await this.selectBestLocalService(context);
      selectedService = localServiceDecision.service;
      confidence = localServiceDecision.confidence;
      estimatedTime = localServiceDecision.estimatedTime;
      reasoning.push(`CloudConvert not available (${cloudConvertDecision.reason}), using local service: ${localServiceDecision.reasoning}`);
    }

    // Step 3: Apply routing rules
    const ruleResult = this.applyRoutingRules(context, selectedService);
    if (ruleResult.overrideService) {
      selectedService = ruleResult.overrideService;
      confidence = Math.min(confidence, ruleResult.confidence || 0.7);
      reasoning.push(`Rule override: ${ruleResult.reason}`);
    }

    // Step 4: Determine fallback plan
    const fallbackPlan = this.determineFallbackPlan(selectedService, context);

    return {
      selectedService,
      reasoning,
      costEstimate,
      estimatedTime,
      confidence,
      fallbackPlan
    };
  }

  /**
   * Evaluate CloudConvert viability
   */
  private async evaluateCloudConvert(context: RoutingContext): Promise<{
    viable: boolean;
    reason: string;
    costEstimate?: number;
  }> {
    try {
      // CloudConvert is ALWAYS viable unless specifically contraindicated
      // Only check if CloudConvert can handle the file technically
      if (!this.cloudConvertAdapter.canHandle(context.inputPath, context.options)) {
        return {
          viable: false,
          reason: 'CloudConvert cannot handle this file type/size'
        };
      }

      // Get cost estimate but don't use it to reject (just for info)
      const costDecision = await this.costOptimizer.shouldUseCloudConvert(context.inputPath, {
        userId: context.userContext.userId,
        userTier: context.userContext.userTier,
        fileSize: context.fileMetadata.size,
        pageCount: context.fileMetadata.pageCount,
        documentType: context.fileMetadata.documentType,
        urgency: context.userContext.priority === 'high' ? 'high' : 'normal'
      });

      // Always return viable - CloudConvert is our primary choice
      return {
        viable: true,
        reason: 'CloudConvert is primary service - superior quality, speed, and reliability',
        costEstimate: costDecision.costEstimate?.estimatedCost
      };

    } catch (error) {
      return {
        viable: false,
        reason: `CloudConvert evaluation failed: ${error instanceof Error ? error.message : 'unknown error'}`
      };
    }
  }

  /**
   * Select best local service
   */
  private async selectBestLocalService(context: RoutingContext): Promise<{
    service: string;
    confidence: number;
    estimatedTime: number;
    reasoning: string;
  }> {
    let services: Record<string, any> = {};

    try {
      // Dynamic import to avoid circular dependency
      const { serviceContainer } = await import('./service-container');
      services = serviceContainer.getAllServices();
    } catch (error) {
      console.warn('⚠️ [PDF-ROUTER] Could not access service container, using fallback');
    }
    const candidates: Array<{
      name: string;
      score: number;
      estimatedTime: number;
      reasoning: string[];
    }> = [];

    // Evaluate each service
    for (const [serviceName, service] of Object.entries(services)) {
      if (serviceName === 'cloudconvert') continue; // Skip CloudConvert in local evaluation

      const metrics = this.performanceMetrics.get(serviceName);
      const score = this.calculateServiceScore(serviceName, context, metrics);
      const estimatedTime = this.estimateServiceTime(serviceName, context);

      candidates.push({
        name: serviceName,
        score,
        estimatedTime,
        reasoning: [`Score: ${score.toFixed(2)}`]
      });
    }

    // Sort by score and select best
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0] || {
      name: 'enhanced-fallback',
      score: 0.3,
      estimatedTime: 45000,
      reasoning: ['Default fallback service']
    };

    return {
      service: best.name,
      confidence: Math.min(0.9, best.score / 100),
      estimatedTime: best.estimatedTime,
      reasoning: `Best local service (${best.reasoning.join(', ')})`
    };
  }

  /**
   * Calculate service score based on context
   */
  private calculateServiceScore(
    serviceName: string,
    context: RoutingContext,
    metrics?: PerformanceMetrics
  ): number {
    let score = 50; // Base score

    // Performance metrics
    if (metrics) {
      score += metrics.successRate * 30; // 0-30 points for success rate
      score += Math.max(0, 20 - (metrics.averageTime / 1000)); // Faster = better
      score += metrics.averageQuality * 20; // 0-20 points for quality
    }

    // Context-specific bonuses
    switch (serviceName) {
      case 'visual-fidelity':
        if (context.fileMetadata.documentType === 'presentation') score += 15;
        if (context.fileMetadata.complexity === 'high') score += 10;
        break;
      case 'semantic-validation':
        if (context.fileMetadata.documentType === 'technical') score += 15;
        if (context.userContext.priority === 'high') score += 10;
        break;
      case 'improved':
        if (context.fileMetadata.size < 10 * 1024 * 1024) score += 10; // Good for small files
        break;
      case 'enhanced-fallback':
        score += 5; // Always reliable but basic
        break;
    }

    // User preference bonus
    if (context.userContext.preferredService === serviceName) {
      score += 10;
    }

    // Recent success bonus
    if (context.userContext.previousSuccesses.includes(serviceName)) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Estimate service processing time
   */
  private estimateServiceTime(serviceName: string, context: RoutingContext): number {
    const baseTime = 30000; // 30 seconds base
    const sizeMs = (context.fileMetadata.size / 1024 / 1024) * 2000; // 2 seconds per MB
    const pageMs = context.fileMetadata.pageCount * 1000; // 1 second per page

    const serviceMultipliers: Record<string, number> = {
      'cloudconvert': 0.5, // Fastest
      'visual-fidelity': 1.2,
      'semantic-validation': 1.5,
      'improved': 1.0,
      'enhanced-fallback': 0.8 // Fast but basic
    };

    const multiplier = serviceMultipliers[serviceName] || 1.0;
    return Math.round((baseTime + sizeMs + pageMs) * multiplier);
  }

  /**
   * Apply routing rules
   */
  private applyRoutingRules(
    context: RoutingContext,
    currentSelection: string
  ): { overrideService?: string; confidence?: number; reason?: string } {
    for (const rule of this.routingRules) {
      const result = rule.evaluate(context, currentSelection);
      if (result.shouldOverride) {
        return {
          overrideService: result.newService,
          confidence: result.confidence,
          reason: result.reason
        };
      }
    }

    return {};
  }

  /**
   * Determine fallback plan
   */
  private determineFallbackPlan(selectedService: string, context: RoutingContext): string[] {
    const allServices = ['cloudconvert', 'visual-fidelity', 'semantic-validation', 'improved', 'enhanced-fallback'];

    // Remove selected service and order by preference
    const fallbacks = allServices.filter(s => s !== selectedService);

    // Prioritize based on context
    return fallbacks.sort((a, b) => {
      const scoreA = this.calculateServiceScore(a, context);
      const scoreB = this.calculateServiceScore(b, context);
      return scoreB - scoreA;
    });
  }

  /**
   * Execute conversion with routing decision
   */
  private async executeConversion(
    decision: RoutingDecision,
    context: RoutingContext
  ): Promise<ConversionResult> {
    console.log(`🚀 [PDF-ROUTER] Executing conversion with: ${decision.selectedService}`);

    // If CloudConvert, use adapter directly
    if (decision.selectedService === 'cloudconvert') {
      return await this.cloudConvertAdapter.convertPDFToOffice(
        context.inputPath,
        context.outputDir,
        context.options
      );
    }

    // For local services, use fallback orchestrator with specific service order
    const customOrchestrator = new FallbackOrchestrator({
      primaryService: decision.selectedService,
      fallbackChain: decision.fallbackPlan
    });

    // Register services
    await this.registerServicesWithCustomOrchestrator(customOrchestrator);

    return await customOrchestrator.convertPDFToOffice(
      context.inputPath,
      context.outputDir,
      context.options
    );
  }

  /**
   * Record performance metrics
   */
  private async recordPerformanceMetrics(
    serviceName: string,
    result: ConversionResult,
    startTime: number
  ): Promise<void> {
    const endTime = Date.now();
    const actualTime = endTime - startTime;

    let metrics = this.performanceMetrics.get(serviceName);
    if (!metrics) {
      metrics = {
        serviceName,
        averageTime: 0,
        successRate: 0,
        averageQuality: 0,
        lastUsed: new Date(),
        totalUsage: 0
      };
    }

    // Update metrics
    metrics.totalUsage++;
    metrics.lastUsed = new Date();
    metrics.averageTime = (metrics.averageTime * (metrics.totalUsage - 1) + actualTime) / metrics.totalUsage;

    // Update success rate
    const wasSuccessful = result.success ? 1 : 0;
    metrics.successRate = (metrics.successRate * (metrics.totalUsage - 1) + wasSuccessful) / metrics.totalUsage;

    // Update quality score
    const qualityScore = result.qualityMetrics?.overallScore || (result.success ? 0.7 : 0);
    metrics.averageQuality = (metrics.averageQuality * (metrics.totalUsage - 1) + qualityScore) / metrics.totalUsage;

    this.performanceMetrics.set(serviceName, metrics);

    console.log(`📊 [PDF-ROUTER] Updated metrics for ${serviceName}: success=${(metrics.successRate * 100).toFixed(1)}%, time=${metrics.averageTime.toFixed(0)}ms`);
  }

  /**
   * Handle post-conversion tasks
   */
  private async handlePostConversion(
    result: ConversionResult,
    decision: RoutingDecision,
    context: RoutingContext
  ): Promise<void> {
    // Record cost if CloudConvert was used
    if (decision.selectedService === 'cloudconvert' && decision.costEstimate && result.success) {
      await this.costOptimizer.recordConversionCost(
        decision.costEstimate,
        context.userContext.userId,
        {
          fileSize: context.fileMetadata.size,
          pageCount: context.fileMetadata.pageCount,
          processingTime: result.processingTime || 0,
          success: result.success
        }
      );
    }

    // Update user preferences based on success
    if (result.success && context.userContext.userId) {
      await this.updateUserPreferences(context.userContext.userId, decision.selectedService);
    }
  }

  /**
   * Update user preferences
   */
  private async updateUserPreferences(userId: string, successfulService: string): Promise<void> {
    // This would typically update a database
    console.log(`👤 [PDF-ROUTER] User ${userId} had success with ${successfulService}`);
  }

  /**
   * Register services with fallback orchestrator
   */
  private registerServicesWithOrchestrator(serviceContainer?: any): void {
    // Register CloudConvert adapter
    this.fallbackOrchestrator.registerService('cloudconvert', this.cloudConvertAdapter);

    // Register other services if service container is available
    if (serviceContainer) {
      const services = serviceContainer.getAllServices();
      for (const [name, service] of Object.entries(services)) {
        if (service && typeof (service as any).convertPDFToOffice === 'function') {
          this.fallbackOrchestrator.registerService(name, service as PDFConversionService);
        }
      }
    }
  }

  /**
   * Register services with custom orchestrator
   */
  private async registerServicesWithCustomOrchestrator(orchestrator: FallbackOrchestrator): Promise<void> {
    try {
      // Dynamic import to avoid circular dependency
      const { serviceContainer } = await import('./service-container');
      const services = serviceContainer.getAllServices();

      for (const [name, service] of Object.entries(services)) {
        if (service && typeof service.convertPDFToOffice === 'function') {
          orchestrator.registerService(name, service as PDFConversionService);
        }
      }
    } catch (error) {
      console.warn('⚠️ [PDF-ROUTER] Could not register services with custom orchestrator:', error);
    }
  }

  /**
   * Initialize routing rules
   */
  private initializeRoutingRules(): void {
    this.routingRules = [
      new FileSizeRule(),
      new UserTierRule(),
      new UrgencyRule(),
      new DocumentTypeRule(),
      new QualityRequirementRule()
    ];
  }

  /**
   * Get routing statistics
   */
  getRoutingStatistics(): {
    totalConversions: number;
    serviceUsage: Record<string, number>;
    averageResponseTime: number;
    successRate: number;
  } {
    let totalConversions = 0;
    let totalTime = 0;
    let totalSuccesses = 0;
    const serviceUsage: Record<string, number> = {};

    for (const [serviceName, metrics] of this.performanceMetrics) {
      totalConversions += metrics.totalUsage;
      totalTime += metrics.averageTime * metrics.totalUsage;
      totalSuccesses += metrics.successRate * metrics.totalUsage;
      serviceUsage[serviceName] = metrics.totalUsage;
    }

    return {
      totalConversions,
      serviceUsage,
      averageResponseTime: totalConversions > 0 ? totalTime / totalConversions : 0,
      successRate: totalConversions > 0 ? totalSuccesses / totalConversions : 0
    };
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    this.fallbackOrchestrator.dispose();
    await this.costOptimizer.dispose();
    console.log('🧹 [PDF-ROUTER] Disposed successfully');
  }
}

// ========== ROUTING RULES ==========

abstract class RoutingRule {
  abstract evaluate(context: RoutingContext, currentSelection: string): {
    shouldOverride: boolean;
    newService?: string;
    confidence?: number;
    reason?: string;
  };
}

class FileSizeRule extends RoutingRule {
  evaluate(context: RoutingContext, currentSelection: string) {
    const size = context.fileMetadata.size;
    const sizeMB = size / (1024 * 1024);

    // Very large files should use CloudConvert if available
    if (sizeMB > 50 && currentSelection !== 'cloudconvert' && context.userContext.userTier !== 'free') {
      return {
        shouldOverride: true,
        newService: 'cloudconvert',
        confidence: 0.9,
        reason: `Large file (${sizeMB.toFixed(1)}MB) benefits from CloudConvert`
      };
    }

    return { shouldOverride: false };
  }
}

class UserTierRule extends RoutingRule {
  evaluate(context: RoutingContext, currentSelection: string) {
    // ALL users should prefer CloudConvert as primary service
    if (currentSelection !== 'cloudconvert') {
      return {
        shouldOverride: true,
        newService: 'cloudconvert',
        confidence: 0.95,
        reason: `CloudConvert is superior for ${context.userContext.userTier} tier - fast, reliable, professional quality`
      };
    }

    return { shouldOverride: false };
  }
}

class UrgencyRule extends RoutingRule {
  evaluate(context: RoutingContext, currentSelection: string) {
    // High priority requests should use fastest service
    if (context.userContext.priority === 'high' && currentSelection !== 'cloudconvert') {
      return {
        shouldOverride: true,
        newService: 'cloudconvert',
        confidence: 0.7,
        reason: 'High priority request routed to fastest service'
      };
    }

    return { shouldOverride: false };
  }
}

class DocumentTypeRule extends RoutingRule {
  evaluate(context: RoutingContext, currentSelection: string) {
    // Only use OCR for scanned/image-heavy documents where CloudConvert fails
    if (context.fileMetadata.documentType === 'scanned' && currentSelection === 'cloudconvert') {
      return {
        shouldOverride: true,
        newService: 'improved', // OCR-based service
        confidence: 0.7,
        reason: 'Scanned document requires OCR processing - CloudConvert fallback to OCR'
      };
    }

    // All other document types stay with CloudConvert
    return { shouldOverride: false };
  }
}

class QualityRequirementRule extends RoutingRule {
  evaluate(context: RoutingContext, currentSelection: string) {
    // High complexity documents should definitely use CloudConvert for best quality
    if (context.fileMetadata.complexity === 'high' && currentSelection !== 'cloudconvert') {
      return {
        shouldOverride: true,
        newService: 'cloudconvert',
        confidence: 0.9,
        reason: 'High complexity document gets CloudConvert for superior quality and formatting'
      };
    }

    return { shouldOverride: false };
  }
}

// Singleton instance
export const pdfConversionRouter = new PDFConversionRouter();
export default PDFConversionRouter;