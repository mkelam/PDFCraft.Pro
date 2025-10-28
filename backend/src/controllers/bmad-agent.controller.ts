/**
 * BMAD AGENT CONTROLLER
 *
 * RESTful API endpoints for BMAD AI agent management and task execution
 * Integrates with service container and agent registry
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { serviceContainer } from '../services/service-container';
import { PDFQualityOptimizerAgent } from '../services/agents/pdf-quality-optimizer.agent';
import {
  AgentTask,
  AgentResponse,
  AgentConfiguration,
  BMADAgent
} from '../types/bmad-agent.types';

export class BMADAgentController {
  /**
   * GET /api/agents
   * List all registered BMAD agents
   */
  public static async listAgents(req: Request, res: Response): Promise<void> {
    try {
      console.log('📋 [BMAD-CONTROLLER] Listing all registered agents...');

      const agents = serviceContainer.getAllAgents();
      const agentStats = serviceContainer.getAgentStatistics();

      const response = {
        success: true,
        data: {
          agents: agents.map(agent => ({
            id: agent.id,
            name: agent.name,
            version: agent.version,
            status: agent.status,
            capabilities: agent.capabilities.map(cap => ({
              name: cap.name,
              description: cap.description,
              estimatedExecutionTime: cap.estimatedExecutionTime
            })),
            persona: {
              role: agent.persona.role,
              expertise: agent.persona.expertise,
              style: agent.persona.style
            }
          })),
          statistics: {
            totalAgents: agentStats.totalAgents,
            healthyAgents: agentStats.healthyAgents,
            capabilities: agentStats.capabilities,
            averageSuccessRate: agentStats.averageSuccessRate,
            averageResponseTime: agentStats.averageResponseTime
          }
        },
        timestamp: new Date().toISOString()
      };

      console.log(`✅ [BMAD-CONTROLLER] Listed ${agents.length} agents`);
      res.status(200).json(response);

    } catch (error: any) {
      console.error('❌ [BMAD-CONTROLLER] Failed to list agents:', error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'AGENT_LIST_FAILED',
          message: 'Failed to retrieve agent list',
          details: error.message
        }
      });
    }
  }

  /**
   * GET /api/agents/:agentId/status
   * Get specific agent status and health
   */
  public static async getAgentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      console.log(`🔍 [BMAD-CONTROLLER] Getting status for agent: ${agentId}`);

      const agent = serviceContainer.getAgent(agentId);
      if (!agent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent '${agentId}' not found`
          }
        });
        return;
      }

      const health = await agent.getHealth();

      const response = {
        success: true,
        data: {
          agent: {
            id: agent.id,
            name: agent.name,
            version: agent.version,
            status: agent.status,
            health: health
          }
        },
        timestamp: new Date().toISOString()
      };

      console.log(`✅ [BMAD-CONTROLLER] Retrieved status for agent '${agentId}'`);
      res.status(200).json(response);

    } catch (error: any) {
      console.error(`❌ [BMAD-CONTROLLER] Failed to get agent status:`, error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'AGENT_STATUS_FAILED',
          message: 'Failed to retrieve agent status',
          details: error.message
        }
      });
    }
  }

  /**
   * POST /api/agents/:agentId/execute
   * Execute a task on a specific agent
   */
  public static async executeAgentTask(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const { capability, input, priority = 'medium', timeout, context } = req.body;

      console.log(`⚡ [BMAD-CONTROLLER] Executing task on agent '${agentId}'`);
      console.log(`   📋 Capability: ${capability}`);
      console.log(`   🎯 Priority: ${priority}`);

      // Validate required fields
      if (!capability || !input) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: capability and input are required'
          }
        });
        return;
      }

      // Get agent
      const agent = serviceContainer.getAgent(agentId);
      if (!agent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent '${agentId}' not found`
          }
        });
        return;
      }

      // Validate capability
      const hasCapability = agent.capabilities.some(cap => cap.name === capability);
      if (!hasCapability) {
        res.status(400).json({
          success: false,
          error: {
            code: 'CAPABILITY_NOT_SUPPORTED',
            message: `Agent '${agentId}' does not support capability '${capability}'`,
            details: {
              supportedCapabilities: agent.capabilities.map(cap => cap.name)
            }
          }
        });
        return;
      }

      // Create task
      const task: AgentTask = {
        id: uuidv4(),
        capability,
        input,
        priority,
        timeout,
        context: {
          ...context,
          timestamp: new Date(),
          correlationId: uuidv4()
        }
      };

      // Execute task
      const startTime = Date.now();
      const result = await agent.execute(task);
      const totalTime = Date.now() - startTime;

      const response = {
        success: result.success,
        data: result.data,
        metadata: {
          ...result.metadata,
          totalExecutionTime: totalTime,
          agentId,
          taskId: task.id
        },
        recommendations: result.recommendations,
        error: result.error,
        timestamp: new Date().toISOString()
      };

      const statusCode = result.success ? 200 : 500;

      console.log(`${result.success ? '✅' : '❌'} [BMAD-CONTROLLER] Task ${result.success ? 'completed' : 'failed'} in ${totalTime}ms`);
      res.status(statusCode).json(response);

    } catch (error: any) {
      console.error('❌ [BMAD-CONTROLLER] Task execution failed:', error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'TASK_EXECUTION_FAILED',
          message: 'Failed to execute agent task',
          details: error.message
        }
      });
    }
  }

  /**
   * GET /api/agents/:agentId/capabilities
   * Get detailed capabilities for a specific agent
   */
  public static async getAgentCapabilities(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      console.log(`📋 [BMAD-CONTROLLER] Getting capabilities for agent: ${agentId}`);

      const agent = serviceContainer.getAgent(agentId);
      if (!agent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent '${agentId}' not found`
          }
        });
        return;
      }

      const response = {
        success: true,
        data: {
          agent: {
            id: agent.id,
            name: agent.name,
            version: agent.version
          },
          capabilities: agent.capabilities.map(cap => ({
            name: cap.name,
            description: cap.description,
            inputSchema: cap.inputSchema,
            outputSchema: cap.outputSchema,
            estimatedExecutionTime: cap.estimatedExecutionTime,
            resourceRequirements: cap.resourceRequirements,
            dependencies: cap.dependencies
          }))
        },
        timestamp: new Date().toISOString()
      };

      console.log(`✅ [BMAD-CONTROLLER] Retrieved ${agent.capabilities.length} capabilities for '${agentId}'`);
      res.status(200).json(response);

    } catch (error: any) {
      console.error('❌ [BMAD-CONTROLLER] Failed to get capabilities:', error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'CAPABILITIES_FAILED',
          message: 'Failed to retrieve agent capabilities',
          details: error.message
        }
      });
    }
  }

  /**
   * POST /api/agents/execute
   * Execute a task on the best available agent (automatic selection)
   */
  public static async executeTaskOnBestAgent(req: Request, res: Response): Promise<void> {
    try {
      const { capability, input, priority = 'medium', timeout, context } = req.body;

      console.log(`🎯 [BMAD-CONTROLLER] Executing task on best available agent`);
      console.log(`   📋 Capability: ${capability}`);
      console.log(`   🎯 Priority: ${priority}`);

      // Validate required fields
      if (!capability || !input) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: capability and input are required'
          }
        });
        return;
      }

      // Create task
      const task: AgentTask = {
        id: uuidv4(),
        capability,
        input,
        priority,
        timeout,
        context: {
          ...context,
          timestamp: new Date(),
          correlationId: uuidv4()
        }
      };

      // Execute on best available agent
      const startTime = Date.now();
      const result = await serviceContainer.executeAgentTask(task);
      const totalTime = Date.now() - startTime;

      const response = {
        success: result.success,
        data: result.data,
        metadata: {
          ...result.metadata,
          totalExecutionTime: totalTime,
          taskId: task.id
        },
        recommendations: result.recommendations,
        error: result.error,
        timestamp: new Date().toISOString()
      };

      const statusCode = result.success ? 200 : 500;

      console.log(`${result.success ? '✅' : '❌'} [BMAD-CONTROLLER] Task ${result.success ? 'completed' : 'failed'} in ${totalTime}ms`);
      res.status(statusCode).json(response);

    } catch (error: any) {
      console.error('❌ [BMAD-CONTROLLER] Task execution failed:', error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'TASK_EXECUTION_FAILED',
          message: 'Failed to execute agent task',
          details: error.message
        }
      });
    }
  }

  /**
   * GET /api/agents/health
   * Get overall agent system health
   */
  public static async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      console.log('🏥 [BMAD-CONTROLLER] Getting system health status...');

      const systemHealth = await serviceContainer.getSystemHealth();

      const response = {
        success: true,
        data: systemHealth,
        timestamp: new Date().toISOString()
      };

      console.log(`✅ [BMAD-CONTROLLER] System health: ${systemHealth.overall.status}`);
      res.status(200).json(response);

    } catch (error: any) {
      console.error('❌ [BMAD-CONTROLLER] Failed to get system health:', error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Failed to retrieve system health',
          details: error.message
        }
      });
    }
  }

  /**
   * POST /api/agents/register
   * Register a new agent (for development/testing)
   */
  public static async registerAgent(req: Request, res: Response): Promise<void> {
    try {
      const { agentType, configuration } = req.body;

      console.log(`🔧 [BMAD-CONTROLLER] Registering new agent: ${agentType}`);

      if (!agentType) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required field: agentType'
          }
        });
        return;
      }

      let agent: BMADAgent;

      // Handle known agent types
      switch (agentType) {
        case 'pdf-quality-optimizer':
          agent = new PDFQualityOptimizerAgent();
          break;

        default:
          res.status(400).json({
            success: false,
            error: {
              code: 'UNKNOWN_AGENT_TYPE',
              message: `Unknown agent type: ${agentType}`,
              details: {
                supportedTypes: ['pdf-quality-optimizer']
              }
            }
          });
          return;
      }

      // Register agent
      await serviceContainer.registerAgent(agent);

      const response = {
        success: true,
        data: {
          agent: {
            id: agent.id,
            name: agent.name,
            version: agent.version,
            capabilities: agent.capabilities.map(cap => cap.name)
          },
          message: 'Agent registered successfully'
        },
        timestamp: new Date().toISOString()
      };

      console.log(`✅ [BMAD-CONTROLLER] Agent '${agent.id}' registered successfully`);
      res.status(201).json(response);

    } catch (error: any) {
      console.error('❌ [BMAD-CONTROLLER] Agent registration failed:', error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'AGENT_REGISTRATION_FAILED',
          message: 'Failed to register agent',
          details: error.message
        }
      });
    }
  }

  /**
   * DELETE /api/agents/:agentId
   * Unregister an agent
   */
  public static async unregisterAgent(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;

      console.log(`🗑️ [BMAD-CONTROLLER] Unregistering agent: ${agentId}`);

      const agent = serviceContainer.getAgent(agentId);
      if (!agent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent '${agentId}' not found`
          }
        });
        return;
      }

      await serviceContainer.unregisterAgent(agentId);

      const response = {
        success: true,
        data: {
          message: `Agent '${agentId}' unregistered successfully`
        },
        timestamp: new Date().toISOString()
      };

      console.log(`✅ [BMAD-CONTROLLER] Agent '${agentId}' unregistered successfully`);
      res.status(200).json(response);

    } catch (error: any) {
      console.error('❌ [BMAD-CONTROLLER] Agent unregistration failed:', error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'AGENT_UNREGISTRATION_FAILED',
          message: 'Failed to unregister agent',
          details: error.message
        }
      });
    }
  }

  /**
   * POST /api/agents/pdf-analysis
   * Specialized endpoint for PDF quality analysis (convenience method)
   */
  public static async analyzePDFQuality(req: Request, res: Response): Promise<void> {
    try {
      const { filePath, options = {} } = req.body;

      console.log(`🎯 [BMAD-CONTROLLER] Analyzing PDF quality: ${filePath}`);

      if (!filePath) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required field: filePath'
          }
        });
        return;
      }

      // Create task for PDF quality analysis
      const task: AgentTask = {
        id: uuidv4(),
        capability: 'analyze-pdf-quality',
        input: { filePath, options },
        priority: 'high',
        context: {
          timestamp: new Date(),
          correlationId: uuidv4()
        }
      };

      // Execute on best available agent
      const startTime = Date.now();
      const result = await serviceContainer.executeAgentTask(task);
      const totalTime = Date.now() - startTime;

      const response = {
        success: result.success,
        data: result.data,
        metadata: {
          ...result.metadata,
          totalExecutionTime: totalTime,
          taskId: task.id
        },
        recommendations: result.recommendations,
        error: result.error,
        timestamp: new Date().toISOString()
      };

      const statusCode = result.success ? 200 : 500;

      console.log(`${result.success ? '✅' : '❌'} [BMAD-CONTROLLER] PDF analysis ${result.success ? 'completed' : 'failed'} in ${totalTime}ms`);
      res.status(statusCode).json(response);

    } catch (error: any) {
      console.error('❌ [BMAD-CONTROLLER] PDF analysis failed:', error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'PDF_ANALYSIS_FAILED',
          message: 'Failed to analyze PDF quality',
          details: error.message
        }
      });
    }
  }
}