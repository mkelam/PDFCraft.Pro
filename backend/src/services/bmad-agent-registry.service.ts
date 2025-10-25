/**
 * BMAD AGENT REGISTRY SERVICE
 *
 * Centralized registry for managing BMAD AI agents
 * Implements singleton pattern with lifecycle management
 * Integrates with existing service container architecture
 */

import {
  BMADAgent,
  AgentRegistryInterface,
  AgentTask,
  AgentResponse,
  AgentStatus,
  AgentEvent,
  AgentEventType,
  AgentHealthCheck,
  ValidationResult,
  AgentConfiguration,
  AgentFactory
} from '../types/bmad-agent.types';

export class BMADAgentRegistry implements AgentRegistryInterface {
  private static instance: BMADAgentRegistry;
  private agents: Map<string, BMADAgent> = new Map();
  private agentFactories: Map<string, AgentFactory> = new Map();
  private agentConfigurations: Map<string, AgentConfiguration> = new Map();
  private eventListeners: Map<AgentEventType, Array<(event: AgentEvent) => void>> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly healthCheckInterval = 30000; // 30 seconds

  private constructor() {
    console.log('🤖 [BMAD-REGISTRY] Initializing BMAD Agent Registry...');
    this.initializeEventListeners();
  }

  /**
   * Get singleton instance of the registry
   */
  public static getInstance(): BMADAgentRegistry {
    if (!BMADAgentRegistry.instance) {
      BMADAgentRegistry.instance = new BMADAgentRegistry();
    }
    return BMADAgentRegistry.instance;
  }

  /**
   * Register a new agent in the registry
   */
  public async register(agent: BMADAgent): Promise<void> {
    console.log(`🔧 [BMAD-REGISTRY] Registering agent: ${agent.id} (${agent.name})`);

    try {
      // Validate agent before registration
      if (this.agents.has(agent.id)) {
        throw new Error(`Agent with ID '${agent.id}' already registered`);
      }

      // Initialize the agent
      await agent.initialize();

      // Register the agent
      this.agents.set(agent.id, agent);

      // Start health monitoring
      this.startHealthMonitoring(agent.id);

      // Emit registration event
      this.emitEvent({
        type: 'agent-initialized',
        agentId: agent.id,
        timestamp: new Date(),
        data: {
          name: agent.name,
          version: agent.version,
          capabilities: agent.capabilities.map(c => c.name)
        },
        severity: 'info'
      });

      console.log(`✅ [BMAD-REGISTRY] Agent '${agent.id}' registered successfully`);
      console.log(`   📊 Capabilities: ${agent.capabilities.map(c => c.name).join(', ')}`);

    } catch (error: any) {
      console.error(`❌ [BMAD-REGISTRY] Failed to register agent '${agent.id}':`, error.message);

      this.emitEvent({
        type: 'agent-error',
        agentId: agent.id,
        timestamp: new Date(),
        data: { error: error.message },
        severity: 'error'
      });

      throw error;
    }
  }

  /**
   * Unregister an agent from the registry
   */
  public async unregister(agentId: string): Promise<void> {
    console.log(`🗑️ [BMAD-REGISTRY] Unregistering agent: ${agentId}`);

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found`);
    }

    try {
      // Stop health monitoring
      this.stopHealthMonitoring(agentId);

      // Dispose of the agent
      await agent.dispose();

      // Remove from registry
      this.agents.delete(agentId);
      this.agentConfigurations.delete(agentId);

      // Emit unregistration event
      this.emitEvent({
        type: 'agent-stopped',
        agentId,
        timestamp: new Date(),
        data: { reason: 'unregistered' },
        severity: 'info'
      });

      console.log(`✅ [BMAD-REGISTRY] Agent '${agentId}' unregistered successfully`);

    } catch (error: any) {
      console.error(`❌ [BMAD-REGISTRY] Failed to unregister agent '${agentId}':`, error.message);
      throw error;
    }
  }

  /**
   * Get agent by ID
   */
  public get(agentId: string): BMADAgent | null {
    return this.agents.get(agentId) || null;
  }

  /**
   * Get all registered agents
   */
  public getAll(): BMADAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by capability
   */
  public getByCapability(capability: string): BMADAgent[] {
    return this.getAll().filter(agent =>
      agent.capabilities.some(cap => cap.name === capability)
    );
  }

  /**
   * Get agents by status
   */
  public getByStatus(status: AgentStatus['state']): BMADAgent[] {
    return this.getAll().filter(agent => agent.status.state === status);
  }

  /**
   * Execute task on best available agent
   */
  public async executeTask(task: AgentTask): Promise<AgentResponse> {
    console.log(`🎯 [BMAD-REGISTRY] Executing task '${task.capability}' (Priority: ${task.priority})`);

    try {
      // Find agents capable of handling this task
      const capableAgents = this.getByCapability(task.capability);

      if (capableAgents.length === 0) {
        throw new Error(`No agents found with capability '${task.capability}'`);
      }

      // Filter for available agents
      const availableAgents = capableAgents.filter(agent =>
        agent.status.state === 'idle' && agent.status.health === 'healthy'
      );

      if (availableAgents.length === 0) {
        // If no idle agents, find least busy agent
        const busiestAgent = capableAgents
          .filter(agent => agent.status.health === 'healthy')
          .sort((a, b) => a.status.queuedTasks - b.status.queuedTasks)[0];

        if (!busiestAgent) {
          throw new Error(`No healthy agents available for capability '${task.capability}'`);
        }

        console.log(`⏳ [BMAD-REGISTRY] All agents busy, queuing task for '${busiestAgent.id}'`);
        return await this.executeTaskOnAgent(busiestAgent, task);
      }

      // Select best agent based on performance metrics
      const bestAgent = this.selectBestAgent(availableAgents, task);
      console.log(`🤖 [BMAD-REGISTRY] Selected agent '${bestAgent.id}' for task execution`);

      return await this.executeTaskOnAgent(bestAgent, task);

    } catch (error: any) {
      console.error(`❌ [BMAD-REGISTRY] Task execution failed:`, error.message);

      return {
        success: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: error.message,
          details: { taskId: task.id, capability: task.capability },
          recoverySuggestions: ['Check agent availability', 'Retry with different parameters'],
          retryable: true
        },
        metadata: {
          processingTime: 0,
          confidence: 0,
          resourceUsage: {
            cpu: 0,
            memory: 0,
            networkIO: 0,
            storageIO: 0
          }
        }
      };
    }
  }

  /**
   * Register an agent factory
   */
  public registerFactory(factory: AgentFactory): void {
    console.log(`🏭 [BMAD-REGISTRY] Registering agent factory: ${factory.type}`);
    this.agentFactories.set(factory.type, factory);
  }

  /**
   * Create agent from factory
   */
  public async createAgent(type: string, config: AgentConfiguration): Promise<BMADAgent> {
    const factory = this.agentFactories.get(type);
    if (!factory) {
      throw new Error(`No factory registered for agent type '${type}'`);
    }

    // Validate configuration
    const validation = factory.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors?.join(', ')}`);
    }

    // Create and register agent
    const agent = await factory.create(config);
    await this.register(agent);

    // Store configuration
    this.agentConfigurations.set(agent.id, config);

    return agent;
  }

  /**
   * Get registry statistics
   */
  public getStatistics(): RegistryStatistics {
    const agents = this.getAll();
    const totalTasks = agents.reduce((sum, agent) => sum + agent.status.performance.tasksCompleted, 0);
    const totalErrors = agents.reduce((sum, agent) => sum + agent.status.performance.errorCount, 0);

    const healthyAgents = agents.filter(agent => agent.status.health === 'healthy').length;
    const degradedAgents = agents.filter(agent => agent.status.health === 'degraded').length;
    const unhealthyAgents = agents.filter(agent => agent.status.health === 'unhealthy').length;

    const avgSuccessRate = agents.length > 0
      ? agents.reduce((sum, agent) => sum + agent.status.performance.successRate, 0) / agents.length
      : 0;

    const avgResponseTime = agents.length > 0
      ? agents.reduce((sum, agent) => sum + agent.status.performance.averageResponseTime, 0) / agents.length
      : 0;

    return {
      totalAgents: agents.length,
      healthyAgents,
      degradedAgents,
      unhealthyAgents,
      totalTasksCompleted: totalTasks,
      totalErrors,
      averageSuccessRate: avgSuccessRate,
      averageResponseTime: avgResponseTime,
      capabilities: this.getAllCapabilities(),
      uptime: process.uptime() * 1000
    };
  }

  /**
   * Add event listener
   */
  public addEventListener(eventType: AgentEventType, listener: (event: AgentEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(eventType: AgentEventType, listener: (event: AgentEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Get all available capabilities across all agents
   */
  private getAllCapabilities(): string[] {
    const capabilities = new Set<string>();
    this.getAll().forEach(agent => {
      agent.capabilities.forEach(cap => capabilities.add(cap.name));
    });
    return Array.from(capabilities);
  }

  /**
   * Select best agent for task execution
   */
  private selectBestAgent(agents: BMADAgent[], task: AgentTask): BMADAgent {
    // Score agents based on multiple factors
    const scoredAgents = agents.map(agent => {
      const capability = agent.capabilities.find(cap => cap.name === task.capability);
      if (!capability) return { agent, score: 0 };

      let score = 0;

      // Performance metrics (40% weight)
      score += agent.status.performance.successRate * 0.4;

      // Response time (lower is better, 30% weight)
      const normalizedResponseTime = Math.max(0, 1 - (agent.status.performance.averageResponseTime / 10000));
      score += normalizedResponseTime * 0.3;

      // Resource efficiency (20% weight)
      score += agent.status.performance.resourceEfficiency * 0.2;

      // Queue length (lower is better, 10% weight)
      const normalizedQueueLength = Math.max(0, 1 - (agent.status.queuedTasks / 10));
      score += normalizedQueueLength * 0.1;

      return { agent, score };
    });

    // Sort by score (highest first) and return best agent
    scoredAgents.sort((a, b) => b.score - a.score);
    return scoredAgents[0].agent;
  }

  /**
   * Execute task on specific agent
   */
  private async executeTaskOnAgent(agent: BMADAgent, task: AgentTask): Promise<AgentResponse> {
    const startTime = Date.now();

    // Emit task started event
    this.emitEvent({
      type: 'task-started',
      agentId: agent.id,
      timestamp: new Date(),
      data: { taskId: task.id, capability: task.capability, priority: task.priority },
      severity: 'info'
    });

    try {
      const response = await agent.execute(task);

      // Emit task completed event
      this.emitEvent({
        type: 'task-completed',
        agentId: agent.id,
        timestamp: new Date(),
        data: {
          taskId: task.id,
          success: response.success,
          processingTime: response.metadata.processingTime,
          confidence: response.metadata.confidence
        },
        severity: response.success ? 'info' : 'warn'
      });

      return response;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      // Emit task failed event
      this.emitEvent({
        type: 'task-failed',
        agentId: agent.id,
        timestamp: new Date(),
        data: {
          taskId: task.id,
          error: error.message,
          processingTime
        },
        severity: 'error'
      });

      throw error;
    }
  }

  /**
   * Initialize event listeners
   */
  private initializeEventListeners(): void {
    // Initialize event listener maps
    Object.values([
      'agent-initialized', 'agent-started', 'agent-stopped', 'agent-error',
      'task-started', 'task-completed', 'task-failed',
      'performance-threshold', 'health-check', 'resource-warning'
    ] as AgentEventType[]).forEach(eventType => {
      this.eventListeners.set(eventType, []);
    });
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: AgentEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`❌ [BMAD-REGISTRY] Error in event listener:`, error);
        }
      });
    }
  }

  /**
   * Start health monitoring for an agent
   */
  private startHealthMonitoring(agentId: string): void {
    const interval = setInterval(async () => {
      try {
        const agent = this.get(agentId);
        if (!agent) {
          this.stopHealthMonitoring(agentId);
          return;
        }

        const healthCheck = await agent.getHealth();

        // Emit health check event
        this.emitEvent({
          type: 'health-check',
          agentId,
          timestamp: new Date(),
          data: healthCheck,
          severity: healthCheck.status === 'healthy' ? 'info' :
                   healthCheck.status === 'degraded' ? 'warn' : 'error'
        });

        // Check for performance thresholds
        this.checkPerformanceThresholds(agent);

      } catch (error) {
        console.error(`❌ [BMAD-REGISTRY] Health check failed for agent '${agentId}':`, error);
      }
    }, this.healthCheckInterval);

    this.healthCheckIntervals.set(agentId, interval);
  }

  /**
   * Stop health monitoring for an agent
   */
  private stopHealthMonitoring(agentId: string): void {
    const interval = this.healthCheckIntervals.get(agentId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(agentId);
    }
  }

  /**
   * Check performance thresholds and emit warnings
   */
  private checkPerformanceThresholds(agent: BMADAgent): void {
    const performance = agent.status.performance;

    // Check success rate threshold (below 80%)
    if (performance.successRate < 0.8) {
      this.emitEvent({
        type: 'performance-threshold',
        agentId: agent.id,
        timestamp: new Date(),
        data: {
          metric: 'success-rate',
          value: performance.successRate,
          threshold: 0.8
        },
        severity: 'warn'
      });
    }

    // Check response time threshold (above 5 seconds)
    if (performance.averageResponseTime > 5000) {
      this.emitEvent({
        type: 'performance-threshold',
        agentId: agent.id,
        timestamp: new Date(),
        data: {
          metric: 'response-time',
          value: performance.averageResponseTime,
          threshold: 5000
        },
        severity: 'warn'
      });
    }

    // Check error count threshold (more than 10 errors)
    if (performance.errorCount > 10) {
      this.emitEvent({
        type: 'performance-threshold',
        agentId: agent.id,
        timestamp: new Date(),
        data: {
          metric: 'error-count',
          value: performance.errorCount,
          threshold: 10
        },
        severity: 'error'
      });
    }
  }

  /**
   * Cleanup all agents and resources
   */
  public async dispose(): Promise<void> {
    console.log('🧹 [BMAD-REGISTRY] Disposing of all agents and resources...');

    // Stop all health monitoring
    for (const agentId of this.healthCheckIntervals.keys()) {
      this.stopHealthMonitoring(agentId);
    }

    // Dispose of all agents
    const disposePromises = this.getAll().map(async (agent) => {
      try {
        await agent.dispose();
      } catch (error) {
        console.error(`❌ [BMAD-REGISTRY] Error disposing agent '${agent.id}':`, error);
      }
    });

    await Promise.allSettled(disposePromises);

    // Clear all maps
    this.agents.clear();
    this.agentFactories.clear();
    this.agentConfigurations.clear();
    this.eventListeners.clear();

    console.log('✅ [BMAD-REGISTRY] All agents and resources disposed successfully');
  }
}

/**
 * Registry Statistics Interface
 */
export interface RegistryStatistics {
  totalAgents: number;
  healthyAgents: number;
  degradedAgents: number;
  unhealthyAgents: number;
  totalTasksCompleted: number;
  totalErrors: number;
  averageSuccessRate: number;
  averageResponseTime: number;
  capabilities: string[];
  uptime: number;
}

// Export singleton instance
export const bmadAgentRegistry = BMADAgentRegistry.getInstance();