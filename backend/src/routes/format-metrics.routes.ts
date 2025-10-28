/**
 * FORMAT METRICS ROUTES
 *
 * API routes for format-specific metrics and monitoring dashboard
 * Provides real-time reliability tracking and performance analytics
 */

import { Router } from 'express';
import FormatMetricsController from '../controllers/format-metrics.controller';

const router = Router();

/**
 * GET /api/metrics/dashboard
 * Get complete real-time dashboard data
 *
 * Response includes:
 * - Overall metrics (last 24 hours)
 * - Per-format statistics (PPTX, DOCX, XLSX)
 * - Service health status
 * - Recent activity
 * - Active alerts
 */
router.get('/dashboard', FormatMetricsController.getDashboard);

/**
 * GET /api/metrics/summary
 * Get quick summary of all metrics
 *
 * Lightweight endpoint for status checks and quick overviews
 */
router.get('/summary', FormatMetricsController.getSummary);

/**
 * GET /api/metrics/health
 * Get system health check
 *
 * Returns health status for overall system and all formats
 * Useful for monitoring systems and health checks
 */
router.get('/health', FormatMetricsController.getSystemHealth);

/**
 * GET /api/metrics/format/:format
 * Get detailed statistics for a specific format
 *
 * Params:
 * - format: pptx | docx | xlsx
 *
 * Query parameters:
 * - days: Number of days to include (default: 7)
 * - startDate: ISO date string for custom range start
 * - endDate: ISO date string for custom range end
 *
 * Example:
 * GET /api/metrics/format/pptx?days=30
 * GET /api/metrics/format/docx?startDate=2025-01-01&endDate=2025-01-31
 */
router.get('/format/:format', FormatMetricsController.getFormatStats);

/**
 * GET /api/metrics/all-formats
 * Get statistics for all formats in one request
 *
 * Query parameters:
 * - days: Number of days to include (default: 7)
 *
 * Returns stats for PPTX, DOCX, and XLSX
 */
router.get('/all-formats', FormatMetricsController.getAllFormatsStats);

/**
 * GET /api/metrics/alerts
 * Get active alerts
 *
 * Returns all active alerts grouped by severity and format
 */
router.get('/alerts', FormatMetricsController.getActiveAlerts);

/**
 * GET /api/metrics/recent-activity
 * Get recent conversion activity
 *
 * Query parameters:
 * - limit: Number of recent conversions to return (default: 20, max: 100)
 */
router.get('/recent-activity', FormatMetricsController.getRecentActivity);

/**
 * POST /api/metrics/cleanup
 * Trigger cleanup of old metrics
 *
 * Protected endpoint - should require admin authentication
 * Removes metrics older than retention period (90 days)
 */
router.post('/cleanup', FormatMetricsController.cleanupOldMetrics);

export default router;
