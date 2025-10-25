/**
 * ENHANCED SERVICE CONTAINER
 *
 * Implements dependency injection container for PDF conversion services
 * and BMAD AI agents. Manages service instances and their dependencies
 * with integrated agent orchestration capabilities.
 */

import { ImprovedPDFService } from './improved-pdf.service';
import { VisualFidelityPDFService } from './visual-fidelity-pdf.service';
import { SemanticValidationPDFService } from './semantic-validation-pdf.service';
import { OptimizedEngineSelectionService } from './optimized-engine-selection.service';
import { OCRServiceFacade, ocrService } from './ocr-service-facade';
import { PDFConversionService, ConversionResult } from '../types/pdf-conversion.types';
import { CloudConvertAdapter } from './cloudconvert-adapter.service';
import { FallbackOrchestrator } from './fallback-orchestrator.service';
import { PDFConversionRouter, pdfConversionRouter } from './pdf-conversion-router.service';
import { CloudConvertCostOptimizer, cloudConvertCostOptimizer } from './cloudconvert-cost-optimizer.service';
import { EnhancedFallbackPDFService } from './enhanced-fallback-pdf.service';
import path from 'path';

// BMAD Agent Integration
import { BMADAgentRegistry, bmadAgentRegistry } from './bmad-agent-registry.service';
import {
  BMADAgent,
  AgentTask,
  AgentResponse,
  AgentConfiguration,
  AgentFactory
} from '../types/bmad-agent.types';

export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, PDFConversionService> = new Map();
  private ocrService: OCRServiceFacade;
  private agentRegistry: BMADAgentRegistry;
  private cloudConvertAdapter: CloudConvertAdapter;
  private fallbackOrchestrator: FallbackOrchestrator;
  private conversionRouter: PDFConversionRouter;
  private costOptimizer: CloudConvertCostOptimizer;
  private initialized: boolean = false;

  private constructor() {
    this.agentRegistry = bmadAgentRegistry;
    this.ocrService = ocrService; // Use singleton OCR facade
    this.cloudConvertAdapter = new CloudConvertAdapter();
    this.costOptimizer = cloudConvertCostOptimizer;
    this.conversionRouter = pdfConversionRouter;

    // Initialize services asynchronously
    this.initializeServices().catch(error => {
      console.error('❌ [SERVICE-CONTAINER] Async initialization failed:', error);
    });
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  private async initializeServices(): Promise<void> {
    console.log('🔧 [SERVICE-CONTAINER] Initializing enhanced service container with CloudConvert integration...');

    try {
      // Initialize PDF conversion services with proper dependency injection
      const visualFidelityService = new VisualFidelityPDFService();
      const semanticValidationService = new SemanticValidationPDFService();

      // Set up dependencies - SemanticValidationPDFService depends on VisualFidelityPDFService
      (semanticValidationService as any).visualFidelityService = visualFidelityService;

      const optimizedEngineService = new OptimizedEngineSelectionService();
      // OptimizedEngineSelectionService depends on SemanticValidationPDFService
      (optimizedEngineService as any).semanticValidationService = semanticValidationService;

      // Register standard PDF services
      this.services.set('improved', new ImprovedPDFService());
      this.services.set('visual-fidelity', visualFidelityService);
      this.services.set('semantic-validation', semanticValidationService);
      this.services.set('optimized-engine', optimizedEngineService);
      // Create adapter for EnhancedFallbackPDFService since it has static methods
      const enhancedFallbackAdapter: PDFConversionService = {
        async convertPDFToOffice(inputPath: string, outputDir: string, options?: any): Promise<ConversionResult> {
          // Fallback to convertPDFToPPT for now - call it directly
          return enhancedFallbackAdapter.convertPDFToPPT(inputPath, outputDir, options);
        },
        async convertPDFToPPT(inputPath: string, outputDir: string, options?: any): Promise<ConversionResult> {
          try {
            // Note: EnhancedFallbackPDFService.convertPDFToPPT is a static method
            const { EnhancedFallbackPDFService: FallbackService } = require('./enhanced-fallback-pdf.service');
            const filename = await FallbackService.convertPDFToPPT(inputPath, outputDir, options?.originalFilename);
            return {
              filename,
              success: true,
              processingTime: 0,
              metadata: {
                originalFilename: options?.originalFilename || path.basename(inputPath),
                inputSize: 0,
                outputSize: 0,
                pageCount: options?.pageCount || 1,
                timestamp: new Date().toISOString(),
                engineVersion: 'EnhancedFallback-1.0'
              }
            };
          } catch (error) {
            return {
              filename: '',
              success: false,
              processingTime: 0,
              metadata: {
                originalFilename: options?.originalFilename || path.basename(inputPath),
                inputSize: 0,
                outputSize: 0,
                pageCount: 0,
                timestamp: new Date().toISOString(),
                engineVersion: 'EnhancedFallback-1.0'
              }
            };
          }
        }
      };
      this.services.set('enhanced-fallback', enhancedFallbackAdapter);

      // Register CloudConvert adapter
      this.services.set('cloudconvert', this.cloudConvertAdapter);

      // Initialize fallback orchestrator with all services
      this.fallbackOrchestrator = new FallbackOrchestrator({
        primaryService: 'cloudconvert',
        fallbackChain: ['visual-fidelity', 'semantic-validation', 'improved', 'enhanced-fallback']
      });

      // Register services with fallback orchestrator
      for (const [name, service] of this.services) {
        this.fallbackOrchestrator.registerService(name, service);
      }

      console.log(`✅ [SERVICE-CONTAINER] Initialized ${this.services.size} PDF services`);
      console.log('☁️ [SERVICE-CONTAINER] CloudConvert adapter integrated');
      console.log('🎯 [SERVICE-CONTAINER] Intelligent routing system activated');
      console.log('💰 [SERVICE-CONTAINER] Cost optimization monitoring enabled');
      console.log('🔄 [SERVICE-CONTAINER] Fallback orchestration configured');
      console.log('🔍 [SERVICE-CONTAINER] OCR Service Facade integrated');
      console.log('🤖 [SERVICE-CONTAINER] BMAD Agent Registry integrated');

      // Initialize conversion router after all services are ready
      await this.conversionRouter.init();

      this.initialized = true;

    } catch (error) {
      console.error('❌ [SERVICE-CONTAINER] Failed to initialize services:', error);
      throw error;
    }
  }

  public getService(serviceName: string): PDFConversionService {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`);
    }
    return service;
  }

  public getAllServices(): Record<string, PDFConversionService> {
    const result: Record<string, PDFConversionService> = {};
    this.services.forEach((service, name) => {
      result[name] = service;
    });
    return result;
  }

  public getOCRService(): OCRServiceFacade {
    if (!this.initialized) {
      throw new Error('Service container not initialized');
    }
    return this.ocrService;
  }

  // ========== CLOUDCONVERT INTEGRATION METHODS ==========

  /**
   * Get CloudConvert adapter
   */
  public getCloudConvertAdapter(): CloudConvertAdapter {
    if (!this.initialized) {
      throw new Error('Service container not initialized');
    }
    return this.cloudConvertAdapter;
  }

  /**
   * Get fallback orchestrator
   */
  public getFallbackOrchestrator(): FallbackOrchestrator {
    if (!this.initialized) {
      throw new Error('Service container not initialized');
    }
    return this.fallbackOrchestrator;
  }

  /**
   * Get intelligent conversion router
   */
  public getConversionRouter(): PDFConversionRouter {
    if (!this.initialized) {
      throw new Error('Service container not initialized');
    }
    return this.conversionRouter;
  }

  /**
   * Get cost optimizer
   */
  public getCostOptimizer(): CloudConvertCostOptimizer {
    if (!this.initialized) {
      throw new Error('Service container not initialized');
    }
    return this.costOptimizer;
  }

  // ========== BMAD AGENT INTEGRATION METHODS ==========

  /**
   * Register a BMAD agent with the container
   */
  public async registerAgent(agent: BMADAgent): Promise<void> {
    console.log(`🤖 [SERVICE-CONTAINER] Registering BMAD agent: ${agent.id}`);
    await this.agentRegistry.register(agent);
  }

  /**
   * Unregister a BMAD agent from the container
   */
  public async unregisterAgent(agentId: string): Promise<void> {
    console.log(`🗑️ [SERVICE-CONTAINER] Unregistering BMAD agent: ${agentId}`);
    await this.agentRegistry.unregister(agentId);
  }

  /**
   * Get a BMAD agent by ID
   */
  public getAgent(agentId: string): BMADAgent | null {
    return this.agentRegistry.get(agentId);
  }

  /**
   * Get all registered BMAD agents
   */
  public getAllAgents(): BMADAgent[] {
    return this.agentRegistry.getAll();
  }

  /**
   * Get agents by capability
   */
  public getAgentsByCapability(capability: string): BMADAgent[] {
    return this.agentRegistry.getByCapability(capability);
  }

  /**
   * Execute a task on the best available agent
   */
  public async executeAgentTask(task: AgentTask): Promise<AgentResponse> {
    console.log(`⚡ [SERVICE-CONTAINER] Executing agent task: ${task.capability}`);
    return await this.agentRegistry.executeTask(task);
  }

  /**
   * Register an agent factory
   */
  public registerAgentFactory(factory: AgentFactory): void {
    console.log(`🏭 [SERVICE-CONTAINER] Registering agent factory: ${factory.type}`);
    this.agentRegistry.registerFactory(factory);
  }

  /**
   * Create and register an agent from factory
   */
  public async createAgent(type: string, config: AgentConfiguration): Promise<BMADAgent> {
    console.log(`🔧 [SERVICE-CONTAINER] Creating agent of type: ${type}`);
    return await this.agentRegistry.createAgent(type, config);
  }

  /**
   * Get agent registry statistics
   */
  public getAgentStatistics() {
    return this.agentRegistry.getStatistics();
  }

  /**
   * Enhanced service container health check including agents and CloudConvert
   */
  public async getSystemHealth(): Promise<SystemHealth> {
    const agentStats = this.agentRegistry.getStatistics();
    const serviceHealth = this.getServiceHealth();

    // Get CloudConvert health
    const cloudConvertHealth = await this.cloudConvertAdapter.getHealthStatus();

    // Get fallback orchestrator health
    const fallbackHealth = this.fallbackOrchestrator.getHealthStatistics();

    // Get cost optimizer metrics
    const costMetrics = this.costOptimizer.getCostMetrics();

    return {
      services: serviceHealth,
      agents: {
        totalAgents: agentStats.totalAgents,
        healthyAgents: agentStats.healthyAgents,
        degradedAgents: agentStats.degradedAgents,
        unhealthyAgents: agentStats.unhealthyAgents,
        averageSuccessRate: agentStats.averageSuccessRate,
        averageResponseTime: agentStats.averageResponseTime,
        capabilities: agentStats.capabilities
      },
      cloudConvert: {
        status: cloudConvertHealth.status,
        details: cloudConvertHealth.details,
        costMetrics: {
          dailySpent: costMetrics.dailySpent,
          monthlySpent: costMetrics.monthlySpent,
          totalConversions: costMetrics.totalConversions,
          averageCostPerConversion: costMetrics.averageCostPerConversion
        }
      },
      fallbackOrchestrator: {
        servicesRegistered: fallbackHealth.size,
        healthyServices: Array.from(fallbackHealth.values()).filter(h => h.isHealthy).length
      },
      overall: {
        status: this.getOverallHealthStatus(serviceHealth, agentStats, cloudConvertHealth),
        uptime: agentStats.uptime,
        initialized: this.initialized
      }
    };
  }

  /**
   * Get PDF services health status
   */
  private getServiceHealth(): ServiceHealth {
    return {
      totalServices: this.services.size,
      activeServices: this.services.size, // All services are considered active if registered
      services: Array.from(this.services.keys())
    };
  }

  /**
   * Determine overall system health status including CloudConvert
   */
  private getOverallHealthStatus(serviceHealth: ServiceHealth, agentStats: any, cloudConvertHealth?: any): 'healthy' | 'degraded' | 'unhealthy' {
    const serviceRatio = serviceHealth.activeServices / serviceHealth.totalServices;
    const healthyAgentRatio = agentStats.totalAgents > 0
      ? agentStats.healthyAgents / agentStats.totalAgents
      : 1; // If no agents, consider healthy

    // Consider CloudConvert health if available
    const cloudConvertHealthy = !cloudConvertHealth || cloudConvertHealth.status === 'healthy';

    if (serviceRatio >= 0.9 && healthyAgentRatio >= 0.8 && cloudConvertHealthy) {
      return 'healthy';
    } else if (serviceRatio >= 0.7 && healthyAgentRatio >= 0.6) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * Cleanup all services and agents including CloudConvert resources
   */
  public async dispose(): Promise<void> {
    console.log('🧹 [SERVICE-CONTAINER] Disposing of all services and agents...');

    try {
      // Dispose of agent registry (which handles all agents)
      await this.agentRegistry.dispose();

      // Dispose of CloudConvert resources
      if (this.fallbackOrchestrator) {
        this.fallbackOrchestrator.dispose();
      }

      if (this.conversionRouter) {
        await this.conversionRouter.dispose();
      }

      if (this.costOptimizer) {
        await this.costOptimizer.dispose();
      }

      // Clear services
      this.services.clear();
      this.initialized = false;

      console.log('✅ [SERVICE-CONTAINER] All services, agents, and CloudConvert resources disposed successfully');
    } catch (error) {
      console.error('❌ [SERVICE-CONTAINER] Error during disposal:', error);
      throw error;
    }
  }
}

// ========== SUPPORTING INTERFACES ==========

interface SystemHealth {
  services: ServiceHealth;
  agents: {
    totalAgents: number;
    healthyAgents: number;
    degradedAgents: number;
    unhealthyAgents: number;
    averageSuccessRate: number;
    averageResponseTime: number;
    capabilities: string[];
  };
  cloudConvert: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
    costMetrics: {
      dailySpent: number;
      monthlySpent: number;
      totalConversions: number;
      averageCostPerConversion: number;
    };
  };
  fallbackOrchestrator: {
    servicesRegistered: number;
    healthyServices: number;
  };
  overall: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    initialized: boolean;
  };
}

interface ServiceHealth {
  totalServices: number;
  activeServices: number;
  services: string[];
}

// Export singleton instance
export const serviceContainer = ServiceContainer.getInstance();