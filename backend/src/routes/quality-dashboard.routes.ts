/**
 * QUALITY DASHBOARD ROUTES
 *
 * API routes for quality monitoring and reporting
 */

import { Router } from 'express';
import { QualityDashboardController } from '../controllers/quality-dashboard.controller';

const router = Router();

/**
 * Quality Dashboard Endpoints
 */

// Real-time dashboard data
router.get('/dashboard', QualityDashboardController.getDashboard);

// Generate quality reports
router.get('/report', QualityDashboardController.generateReport);

// Export metrics as CSV
router.get('/metrics/export', QualityDashboardController.exportMetrics);

// Quality trends analysis
router.get('/trends', QualityDashboardController.getTrends);

// System health status
router.get('/health', QualityDashboardController.getHealthStatus);

// Service performance breakdown
router.get('/services', QualityDashboardController.getServiceBreakdown);

// Initialize monitoring system
router.post('/initialize', QualityDashboardController.initializeMonitoring);

export default router;