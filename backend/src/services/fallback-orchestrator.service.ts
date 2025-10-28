/**
 * FALLBACK ORCHESTRATOR SERVICE
 *
 * Implements intelligent fallback chain for PDF conversion services
 * Provides automatic recovery when primary services fail
 * Maintains service health monitoring and adaptive routing
 */

import {
  PDFConversionService,
  ConversionResult,
  EnhancedConversionResult,
  ConversionOptions
} from '../types/pdf-conversion.types';
import { promises as fs } from 'fs';
import path from 'path';

export interface FallbackRule {
  condition: 'api_error' | 'timeout' | 'file_size' | 'cost_limit' | 'rate_limit' | 'quality_threshold';
  threshold?: number;
  action: 'fallback' | 'retry' | 'fail';
  retryCount?: number;
  delay?: number;
}

export interface ServiceHealth {
  serviceName: string;
  isHealthy: boolean;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  successRate: number;
  averageResponseTime: number;
  failureCount: number;
  totalRequests: number;
}

export interface FallbackConfig {
  primaryService: string;
  fallbackChain: string[];
  rules: FallbackRule[];
  healthCheckInterval: number;
  maxRetries: number;
  circuitBreakerThreshold: number;
}

export class FallbackOrchestrator {
  private services: Map<string, PDFConversionService> = new Map();
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private config: FallbackConfig;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config?: Partial<FallbackConfig>) {
    this.config = {
      primaryService: 'cloudconvert',
      fallbackChain: ['visual-fidelity', 'semantic-validation', 'improved', 'enhanced-fallback'],
      rules: this.getDefaultFallbackRules(),
      healthCheckInterval: 60000, // 1 minute
      maxRetries: 3,
      circuitBreakerThreshold: 0.5, // 50% failure rate triggers circuit breaker
      ...config
    };

    this.startHealthChecking();
  }

  /**
   * Register a service with the orchestrator
   */
  registerService(name: string, service: PDFConversionService): void {
    console.log(`🔗 [FALLBACK-ORCHESTRATOR] Registering service: ${name}`);

    this.services.set(name, service);
    this.serviceHealth.set(name, {
      serviceName: name,
      isHealthy: true,
      lastSuccess: null,
      lastFailure: null,
      successRate: 1.0,
      averageResponseTime: 0,
      failureCount: 0,
      totalRequests: 0
    });
  }

  /**
   * Main conversion method with intelligent fallback
   * Supports multiple office formats (PPTX, DOCX, XLSX)
   */
  async convertPDFToOffice(
    inputPath: string,
    outputDir: string,
    options?: ConversionOptions
  ): Promise<ConversionResult> {
    console.log('🎯 [FALLBACK-ORCHESTRATOR] Starting intelligent conversion...');

    // Determine the best service order based on current health and context
    const serviceOrder = await this.determineServiceOrder(inputPath, options);
    console.log(`📋 [FALLBACK-ORCHESTRATOR] Service order: ${serviceOrder.join(' → ')}`);

    let lastError: Error | null = null;
    let attemptCount = 0;

    for (const serviceName of serviceOrder) {
      attemptCount++;

      const service = this.services.get(serviceName);
      if (!service) {
        console.warn(`⚠️ [FALLBACK-ORCHESTRATOR] Service not found: ${serviceName}`);
        continue;
      }

      // Check if service is healthy enough to attempt
      const health = this.serviceHealth.get(serviceName);
      if (health && !this.shouldAttemptService(health, serviceName)) {
        console.log(`🚫 [FALLBACK-ORCHESTRATOR] Skipping unhealthy service: ${serviceName}`);
        continue;
      }

      try {
        console.log(`🚀 [FALLBACK-ORCHESTRATOR] Attempting conversion with: ${serviceName} (attempt ${attemptCount})`);

        const startTime = Date.now();
        const result = await this.executeWithTimeout(
          service.convertPDFToOffice(inputPath, outputDir, options),
          this.getTimeoutForService(serviceName),
          serviceName
        );

        const responseTime = Date.now() - startTime;

        // Update service health on success
        this.recordSuccess(serviceName, responseTime);

        // Validate result quality
        if (await this.validateResult(result, serviceName)) {
          console.log(`✅ [FALLBACK-ORCHESTRATOR] Conversion successful with: ${serviceName} (${responseTime}ms)`);

          // Enhance result with orchestrator metadata
          result.metadata = {
            ...result.metadata,
            orchestrator: {
              serviceName,
              attemptCount,
              fallbackUsed: attemptCount > 1,
              totalServicesTried: attemptCount,
              serviceOrder: serviceOrder.slice(0, attemptCount)
            }
          };

          return result;
        } else {
          throw new Error('Result failed quality validation');
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`❌ [FALLBACK-ORCHESTRATOR] ${serviceName} failed:`, lastError.message);

        // Update service health on failure
        this.recordFailure(serviceName, lastError);

        // Check if we should continue to next service
        if (!this.shouldContinueFallback(lastError, serviceName, attemptCount)) {
          break;
        }

        // Apply delay before next attempt if configured
        const delay = this.getDelayForService(serviceName);
        if (delay > 0) {
          console.log(`⏱️ [FALLBACK-ORCHESTRATOR] Waiting ${delay}ms before next attempt...`);
          await this.sleep(delay);
        }
      }
    }

    // All services failed
    const errorMessage = `All conversion services failed. Last error: ${lastError?.message || 'Unknown error'}`;
    console.error(`💥 [FALLBACK-ORCHESTRATOR] ${errorMessage}`);

    return {
      success: false,
      filename: '',
      error: errorMessage,
      processingTime: 0,
      metadata: {
        originalFilename: path.basename(inputPath),
        inputSize: 0,
        outputSize: 0,
        pageCount: 0,
        timestamp: new Date().toISOString(),
        engineVersion: 'FallbackOrchestrator-1.0',
        orchestrator: {
          serviceName: 'none',
          attemptCount,
          fallbackUsed: true,
          totalServicesTried: attemptCount,
          serviceOrder: serviceOrder.slice(0, attemptCount),
          allServicesFailed: true
        }
      }
    };
  }

  /**
   * Determine optimal service order based on context
   */
  private async determineServiceOrder(inputPath: string, options?: ConversionOptions): Promise<string[]> {
    const fileStats = await fs.stat(inputPath).catch(() => ({ size: 0 }));
    const fileSize = fileStats.size;

    // Get all available healthy services
    const availableServices = Array.from(this.services.keys()).filter(name => {
      const health = this.serviceHealth.get(name);
      return health && health.isHealthy;
    });

    // Sort by priority based on context
    const serviceScores = availableServices.map(serviceName => {
      let score = 0;
      const health = this.serviceHealth.get(serviceName)!;

      // Base score from success rate
      score += health.successRate * 100;

      // Adjust for response time (faster = better)
      if (health.averageResponseTime > 0) {
        score += Math.max(0, 50 - (health.averageResponseTime / 1000));
      }

      // Context-specific adjustments
      if (serviceName === 'cloudconvert') {
        // CloudConvert is best for large files and complex documents
        if (fileSize > 10 * 1024 * 1024) score += 20; // Bonus for large files
        if (options?.complexity === 'high') score += 15;
      } else if (serviceName === 'visual-fidelity') {
        // Visual fidelity is good for presentation-style documents
        if (options?.documentType === 'presentation') score += 10;
      } else if (serviceName === 'enhanced-fallback') {
        // Fallback service is most reliable but lowest quality
        score += 5; // Small bonus for reliability
      }

      // Penalty for recent failures
      if (health.lastFailure && Date.now() - health.lastFailure.getTime() < 300000) {
        score -= 20; // 5 minute penalty
      }

      return { serviceName, score };
    });

    // Sort by score (highest first) and return service names
    const orderedServices = serviceScores
      .sort((a, b) => b.score - a.score)
      .map(item => item.serviceName);

    // Ensure primary service is first if healthy
    const primaryService = this.config.primaryService;
    if (orderedServices.includes(primaryService) && orderedServices[0] !== primaryService) {
      orderedServices.splice(orderedServices.indexOf(primaryService), 1);
      orderedServices.unshift(primaryService);
    }

    return orderedServices;
  }

  /**
   * Execute service call with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    serviceName: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Service ${serviceName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Validate conversion result quality
   */
  private async validateResult(result: ConversionResult, serviceName: string): Promise<boolean> {
    if (!result.success || !result.filename) {
      return false;
    }

    // Check if quality metrics meet minimum thresholds
    if (result.qualityMetrics) {
      const minOverallScore = serviceName === 'cloudconvert' ? 0.8 : 0.6;
      if (result.qualityMetrics.overallScore < minOverallScore) {
        console.warn(`🎯 [FALLBACK-ORCHESTRATOR] Quality too low for ${serviceName}: ${result.qualityMetrics.overallScore}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Record successful conversion
   */
  private recordSuccess(serviceName: string, responseTime: number): void {
    const health = this.serviceHealth.get(serviceName);
    if (!health) return;

    health.lastSuccess = new Date();
    health.totalRequests++;
    health.successRate = (health.successRate * (health.totalRequests - 1) + 1) / health.totalRequests;
    health.averageResponseTime = (health.averageResponseTime * (health.totalRequests - 1) + responseTime) / health.totalRequests;
    health.isHealthy = true;

    console.log(`📈 [FALLBACK-ORCHESTRATOR] ${serviceName} success rate: ${(health.successRate * 100).toFixed(1)}%`);
  }

  /**
   * Record failed conversion
   */
  private recordFailure(serviceName: string, error: Error): void {
    const health = this.serviceHealth.get(serviceName);
    if (!health) return;

    health.lastFailure = new Date();
    health.failureCount++;
    health.totalRequests++;
    health.successRate = (health.successRate * (health.totalRequests - 1)) / health.totalRequests;

    // Trigger circuit breaker if failure rate too high
    if (health.successRate < this.config.circuitBreakerThreshold) {
      health.isHealthy = false;
      console.warn(`🔴 [FALLBACK-ORCHESTRATOR] Circuit breaker triggered for ${serviceName}`);
    }

    console.log(`📉 [FALLBACK-ORCHESTRATOR] ${serviceName} success rate: ${(health.successRate * 100).toFixed(1)}%`);
  }

  /**
   * Check if we should attempt a service based on its health
   */
  private shouldAttemptService(health: ServiceHealth, serviceName: string): boolean {
    // Always attempt if no previous requests
    if (health.totalRequests === 0) return true;

    // Don't attempt if circuit breaker is open
    if (!health.isHealthy) {
      // Auto-recovery after 5 minutes
      if (health.lastFailure && Date.now() - health.lastFailure.getTime() > 300000) {
        health.isHealthy = true;
        console.log(`🔄 [FALLBACK-ORCHESTRATOR] Auto-recovery for ${serviceName}`);
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * Check if we should continue fallback chain
   */
  private shouldContinueFallback(error: Error, serviceName: string, attemptCount: number): boolean {
    // Don't continue if max attempts reached
    if (attemptCount >= this.config.maxRetries) {
      return false;
    }

    // Check fallback rules
    for (const rule of this.config.rules) {
      if (this.errorMatchesRule(error, rule)) {
        return rule.action === 'fallback';
      }
    }

    // Default: continue fallback
    return true;
  }

  /**
   * Check if error matches fallback rule
   */
  private errorMatchesRule(error: Error, rule: FallbackRule): boolean {
    const message = error.message.toLowerCase();

    switch (rule.condition) {
      case 'api_error':
        return message.includes('api') || message.includes('cloudconvert');
      case 'timeout':
        return message.includes('timeout') || message.includes('timed out');
      case 'rate_limit':
        return message.includes('rate limit') || message.includes('too many requests');
      case 'file_size':
        return message.includes('file size') || message.includes('too large');
      case 'cost_limit':
        return message.includes('cost') || message.includes('credit');
      default:
        return false;
    }
  }

  /**
   * Get timeout for specific service
   */
  private getTimeoutForService(serviceName: string): number {
    const timeouts: Record<string, number> = {
      'cloudconvert': 120000, // 2 minutes for cloud API
      'visual-fidelity': 90000, // 1.5 minutes for complex processing
      'semantic-validation': 60000, // 1 minute for validation
      'improved': 45000, // 45 seconds for improved
      'enhanced-fallback': 30000 // 30 seconds for fallback
    };

    return timeouts[serviceName] || 60000; // Default 1 minute
  }

  /**
   * Get delay before retrying service
   */
  private getDelayForService(serviceName: string): number {
    const delays: Record<string, number> = {
      'cloudconvert': 5000, // 5 seconds for API rate limits
      'visual-fidelity': 2000, // 2 seconds for processing
      'semantic-validation': 1000, // 1 second
      'improved': 500, // 0.5 seconds
      'enhanced-fallback': 0 // No delay for fallback
    };

    return delays[serviceName] || 1000; // Default 1 second
  }

  /**
   * Get default fallback rules
   */
  private getDefaultFallbackRules(): FallbackRule[] {
    return [
      {
        condition: 'api_error',
        action: 'fallback'
      },
      {
        condition: 'timeout',
        action: 'fallback'
      },
      {
        condition: 'rate_limit',
        action: 'fallback'
      },
      {
        condition: 'file_size',
        threshold: 100 * 1024 * 1024, // 100MB
        action: 'fallback'
      },
      {
        condition: 'cost_limit',
        action: 'fallback'
      }
    ];
  }

  /**
   * Start health checking timer
   */
  private startHealthChecking(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check on all services
   */
  private async performHealthCheck(): Promise<void> {
    console.log('🔍 [FALLBACK-ORCHESTRATOR] Performing health check...');

    for (const [serviceName, service] of this.services) {
      try {
        // Simple health check - could be enhanced with actual service ping
        const health = this.serviceHealth.get(serviceName);
        if (health && !health.isHealthy) {
          // Try to recover unhealthy services
          if (health.lastFailure && Date.now() - health.lastFailure.getTime() > 300000) {
            health.isHealthy = true;
            console.log(`💚 [FALLBACK-ORCHESTRATOR] Service recovered: ${serviceName}`);
          }
        }
      } catch (error) {
        console.warn(`🔍 [FALLBACK-ORCHESTRATOR] Health check failed for ${serviceName}:`, error);
      }
    }
  }

  /**
   * Get service health statistics
   */
  getHealthStatistics(): Map<string, ServiceHealth> {
    return new Map(this.serviceHealth);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    console.log('🧹 [FALLBACK-ORCHESTRATOR] Disposed successfully');
  }

  /**
   * @deprecated Use convertPDFToOffice instead. This method is kept for backward compatibility.
   * Convert PDF to PowerPoint presentation
   */
  async convertPDFToPPT(
    inputPath: string,
    outputDir: string,
    options?: ConversionOptions
  ): Promise<ConversionResult> {
    console.warn('⚠️ [FALLBACK-ORCHESTRATOR] convertPDFToPPT is deprecated. Use convertPDFToOffice instead.');
    return this.convertPDFToOffice(inputPath, outputDir, options);
  }
}

export default FallbackOrchestrator;