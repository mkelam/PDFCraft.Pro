/**
 * QUALITY DASHBOARD CONTROLLER
 *
 * API endpoints for quality monitoring dashboard
 * Provides real-time quality metrics and reporting
 */

import { Request, Response } from 'express';
import { QualityMonitoringService } from '../services/quality-monitoring.service';

export class QualityDashboardController {

  /**
   * GET /api/quality/dashboard
   * Get real-time dashboard data
   */
  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      console.log('📊 [QUALITY-API] Fetching dashboard data...');

      const dashboardData = await QualityMonitoringService.getDashboardData();

      res.status(200).json({
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ [QUALITY-API] Dashboard fetch failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data',
        message: error.message
      });
    }
  }

  /**
   * GET /api/quality/report
   * Generate quality report for specified time range
   */
  static async generateReport(req: Request, res: Response): Promise<void> {
    try {
      console.log('📋 [QUALITY-API] Generating quality report...');

      const { startDate, endDate } = req.query;

      let timeRange: { start: Date; end: Date } | undefined;

      if (startDate && endDate) {
        timeRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        };

        // Validate dates
        if (isNaN(timeRange.start.getTime()) || isNaN(timeRange.end.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid date format',
            message: 'Please provide valid ISO date strings'
          });
          return;
        }

        console.log(`📅 Report range: ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}`);
      } else {
        console.log('📅 Using default 7-day report range');
      }

      const report = await QualityMonitoringService.generateQualityReport(timeRange);

      res.status(200).json({
        success: true,
        data: report
      });

    } catch (error: any) {
      console.error('❌ [QUALITY-API] Report generation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate quality report',
        message: error.message
      });
    }
  }

  /**
   * GET /api/quality/metrics/export
   * Export quality metrics as CSV
   */
  static async exportMetrics(req: Request, res: Response): Promise<void> {
    try {
      console.log('📤 [QUALITY-API] Exporting metrics...');

      const { startDate, endDate, filename } = req.query;
      const exportFilename = (filename as string) || `quality-metrics-${Date.now()}.csv`;

      let timeRange: { start: Date; end: Date } | undefined;

      if (startDate && endDate) {
        timeRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        };

        if (isNaN(timeRange.start.getTime()) || isNaN(timeRange.end.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid date format'
          });
          return;
        }
      }

      // Create temporary file path
      const tempPath = `/tmp/${exportFilename}`;

      await QualityMonitoringService.exportMetricsCSV(tempPath, timeRange);

      // Send file as download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${exportFilename}"`);
      res.sendFile(tempPath, (err) => {
        if (err) {
          console.error('❌ File send error:', err);
        } else {
          console.log('✅ CSV export completed');
          // Clean up temp file
          require('fs').unlink(tempPath, () => {});
        }
      });

    } catch (error: any) {
      console.error('❌ [QUALITY-API] Metrics export failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export metrics',
        message: error.message
      });
    }
  }

  /**
   * GET /api/quality/trends
   * Get quality trends analysis
   */
  static async getTrends(req: Request, res: Response): Promise<void> {
    try {
      console.log('📈 [QUALITY-API] Analyzing trends...');

      const { days = '7' } = req.query;
      const daysNumber = parseInt(days as string, 10);

      if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 90) {
        res.status(400).json({
          success: false,
          error: 'Invalid days parameter',
          message: 'Days must be between 1 and 90'
        });
        return;
      }

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - daysNumber * 24 * 60 * 60 * 1000);

      const report = await QualityMonitoringService.generateQualityReport({
        start: startDate,
        end: endDate
      });

      res.status(200).json({
        success: true,
        data: {
          timeRange: report.timeRange,
          trends: report.trends,
          summary: report.summary,
          topIssues: report.topIssues.slice(0, 5), // Top 5 issues
          servicePerformance: report.servicePerformance
        }
      });

    } catch (error: any) {
      console.error('❌ [QUALITY-API] Trends analysis failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze trends',
        message: error.message
      });
    }
  }

  /**
   * GET /api/quality/health
   * Get system quality health status
   */
  static async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      console.log('🏥 [QUALITY-API] Checking quality health...');

      const dashboardData = await QualityMonitoringService.getDashboardData();
      const { currentMetrics, alertSummary } = dashboardData;

      // Determine overall health status
      let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      const healthDetails: string[] = [];

      // Check success rate
      if (currentMetrics.successRateToday < 80) {
        healthStatus = 'critical';
        healthDetails.push(`Low success rate: ${currentMetrics.successRateToday.toFixed(1)}%`);
      } else if (currentMetrics.successRateToday < 90) {
        healthStatus = 'warning';
        healthDetails.push(`Moderate success rate: ${currentMetrics.successRateToday.toFixed(1)}%`);
      }

      // Check quality score
      if (currentMetrics.averageScoreToday < 70) {
        healthStatus = 'critical';
        healthDetails.push(`Low quality score: ${currentMetrics.averageScoreToday.toFixed(1)}`);
      } else if (currentMetrics.averageScoreToday < 80) {
        if (healthStatus === 'healthy') healthStatus = 'warning';
        healthDetails.push(`Moderate quality score: ${currentMetrics.averageScoreToday.toFixed(1)}`);
      }

      // Check active issues
      if (currentMetrics.activeIssues > 10) {
        if (healthStatus === 'healthy') healthStatus = 'warning';
        healthDetails.push(`High issue count: ${currentMetrics.activeIssues}`);
      }

      if (healthDetails.length === 0) {
        healthDetails.push('All quality metrics are within healthy ranges');
      }

      res.status(200).json({
        success: true,
        data: {
          status: healthStatus,
          details: healthDetails,
          metrics: currentMetrics,
          alerts: alertSummary,
          lastChecked: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error('❌ [QUALITY-API] Health check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check quality health',
        message: error.message
      });
    }
  }

  /**
   * POST /api/quality/initialize
   * Initialize quality monitoring system
   */
  static async initializeMonitoring(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔧 [QUALITY-API] Initializing monitoring system...');

      await QualityMonitoringService.initialize();

      res.status(200).json({
        success: true,
        message: 'Quality monitoring system initialized successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ [QUALITY-API] Initialization failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize monitoring system',
        message: error.message
      });
    }
  }

  /**
   * GET /api/quality/services
   * Get quality metrics breakdown by service
   */
  static async getServiceBreakdown(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 [QUALITY-API] Getting service breakdown...');

      const { days = '7' } = req.query;
      const daysNumber = parseInt(days as string, 10);

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - daysNumber * 24 * 60 * 60 * 1000);

      const report = await QualityMonitoringService.generateQualityReport({
        start: startDate,
        end: endDate
      });

      // Enhanced service analysis
      const serviceBreakdown = report.servicePerformance.map(service => ({
        ...service,
        healthStatus: this.determineServiceHealth(service),
        recommendations: this.getServiceRecommendations(service)
      }));

      res.status(200).json({
        success: true,
        data: {
          timeRange: report.timeRange,
          services: serviceBreakdown,
          totalOperations: report.summary.totalOperations
        }
      });

    } catch (error: any) {
      console.error('❌ [QUALITY-API] Service breakdown failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get service breakdown',
        message: error.message
      });
    }
  }

  // Helper methods

  private static determineServiceHealth(service: any): 'healthy' | 'warning' | 'critical' {
    if (service.successRate < 80 || service.averageScore < 70) {
      return 'critical';
    }
    if (service.successRate < 90 || service.averageScore < 80) {
      return 'warning';
    }
    return 'healthy';
  }

  private static getServiceRecommendations(service: any): string[] {
    const recommendations: string[] = [];

    if (service.successRate < 90) {
      recommendations.push('Investigate conversion failures');
    }
    if (service.averageScore < 80) {
      recommendations.push('Review quality parameters');
    }
    if (service.averageTime > 10000) {
      recommendations.push('Optimize processing performance');
    }
    if (recommendations.length === 0) {
      recommendations.push('Service is performing well');
    }

    return recommendations;
  }
}

export default QualityDashboardController;