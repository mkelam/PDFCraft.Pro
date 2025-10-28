/**
 * BMAD AGENT ROUTES
 *
 * API routes for BMAD AI agent management and task execution
 * Integrates with BMAD Agent Controller
 */

import { Router } from 'express';
import { BMADAgentController } from '../controllers/bmad-agent.controller';

const router = Router();

// ========== AGENT MANAGEMENT ROUTES ==========

/**
 * GET /api/agents
 * List all registered BMAD agents with their capabilities and status
 */
router.get('/', BMADAgentController.listAgents);

/**
 * GET /api/agents/health
 * Get overall agent system health and statistics
 */
router.get('/health', BMADAgentController.getSystemHealth);

/**
 * POST /api/agents/register
 * Register a new BMAD agent (development/testing endpoint)
 */
router.post('/register', BMADAgentController.registerAgent);

/**
 * POST /api/agents/execute
 * Execute a task on the best available agent (automatic selection)
 */
router.post('/execute', BMADAgentController.executeTaskOnBestAgent);

// ========== SPECIALIZED TASK ROUTES ==========

/**
 * POST /api/agents/pdf-analysis
 * Specialized endpoint for PDF quality analysis
 */
router.post('/pdf-analysis', BMADAgentController.analyzePDFQuality);

// ========== INDIVIDUAL AGENT ROUTES ==========

/**
 * GET /api/agents/:agentId/status
 * Get specific agent status, health, and performance metrics
 */
router.get('/:agentId/status', BMADAgentController.getAgentStatus);

/**
 * GET /api/agents/:agentId/capabilities
 * Get detailed capabilities for a specific agent
 */
router.get('/:agentId/capabilities', BMADAgentController.getAgentCapabilities);

/**
 * POST /api/agents/:agentId/execute
 * Execute a task on a specific agent
 */
router.post('/:agentId/execute', BMADAgentController.executeAgentTask);

/**
 * DELETE /api/agents/:agentId
 * Unregister an agent from the system
 */
router.delete('/:agentId', BMADAgentController.unregisterAgent);

export default router;