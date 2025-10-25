/**
 * FORMAT METRICS DASHBOARD CONTROLLER
 *
 * Provides API endpoints for real-time monitoring and metrics dashboard
 * Supports format-specific analytics for PPTX, DOCX, and XLSX conversions
 */

import { Request, Response } from 'express';
import FormatMetricsMonitorService from '../services/format-metrics-monitor.service';
import { OfficeOutputFormat } from '../types/pdf-conversion.types';

export class FormatMetricsController {
  /**
   * GET /api/metrics/dashboard
   * Get real-time reliability dashboard data
   */
  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      console.log('📊 [METRICS-API] Fetching dashboard data...');

      const dashboard = await FormatMetricsMonitorService.getDashboard();

      res.status(200).json({
        success: true,
        data: dashboard,
        message: 'Dashboard data retrieved successfully'
      });

    } catch (error: any) {
      console.error('❌ [METRICS-API] Dashboard fetch failed:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: 'Failed to fetch dashboard data',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * GET /api/metrics/format/:format
   * Get detailed statistics for a specific format (pptx, docx, xlsx)
   */
  static async getFormatStats(req: Request, res: Response): Promise<void> {
    try {
      const { format } = req.params;
      const { startDate, endDate, days } = req.query;

      // Validate format
      if (!['pptx', 'docx', 'xlsx'].includes(format)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: `Invalid format: ${format}. Must be one of: pptx, docx, xlsx`
          }
        });
        return;
      }

      console.log(`📊 [METRICS-API] Fetching stats for ${format}...`);

      // Determine time range
      let timeRange: { start: Date; end: Date } | undefined;

      if (startDate && endDate) {
        timeRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        };
      } else if (days) {
        const daysNum = parseInt(days as string, 10);
        if (isNaN(daysNum) || daysNum < 1) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DAYS',
              message: 'Days parameter must be a positive number'
            }
          });
          return;
        }

        const end = new Date();
        const start = new Date(end.getTime() - daysNum * 24 * 60 * 60 * 1000);
        timeRange = { start, end };
      }

      const stats = await FormatMetricsMonitorService.getFormatStats(
        format as OfficeOutputFormat,
        timeRange
      );

      res.status(200).json({
        success: true,
        data: stats,
        message: `Statistics for ${format} retrieved successfully`
      });

    } catch (error: any) {
      console.error('❌ [METRICS-API] Format stats fetch failed:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to fetch format statistics',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * GET /api/metrics/all-formats
   * Get statistics for all formats in one request
   */
  static async getAllFormatsStats(req: Request, res: Response): Promise<void> {
    try {
      const { days } = req.query;

      console.log('📊 [METRICS-API] Fetching stats for all formats...');

      // Determine time range
      let timeRange: { start: Date; end: Date } | undefined;

      if (days) {
        const daysNum = parseInt(days as string, 10);
        if (isNaN(daysNum) || daysNum < 1) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DAYS',
              message: 'Days parameter must be a positive number'
            }
          });
          return;
        }

        const end = new Date();
        const start = new Date(end.getTime() - daysNum * 24 * 60 * 60 * 1000);
        timeRange = { start, end };
      }

      // Fetch stats for all formats in parallel
      const [pptxStats, docxStats, xlsxStats] = await Promise.all([
        FormatMetricsMonitorService.getFormatStats('pptx', timeRange),
        FormatMetricsMonitorService.getFormatStats('docx', timeRange),
        FormatMetricsMonitorService.getFormatStats('xlsx', timeRange)
      ]);

      res.status(200).json({
        success: true,
        data: {
          pptx: pptxStats,
          docx: docxStats,
          xlsx: xlsxStats
        },
        message: 'All format statistics retrieved successfully'
      });

    } catch (error: any) {
      console.error('❌ [METRICS-API] All formats stats fetch failed:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'ALL_STATS_ERROR',
          message: 'Failed to fetch all format statistics',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * GET /api/metrics/health
   * Get system health check including all format statuses
   */
  static async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      console.log('🏥 [METRICS-API] Fetching system health...');

      const dashboard = await FormatMetricsMonitorService.getDashboard();

      // Extract health information
      const health = {
        timestamp: dashboard.timestamp,
        overall: {
          status: dashboard.overall.successRate >= 95 ? 'healthy' :
                  dashboard.overall.successRate >= 80 ? 'degraded' : 'down',
          successRate: dashboard.overall.successRate,
          totalConversions24h: dashboard.overall.totalConversions,
          averageTime: dashboard.overall.averageTime,
          activeFailures: dashboard.overall.activeFailures
        },
        formats: {
          pptx: {
            status: dashboard.formatMetrics.pptx.status,
            successRate: dashboard.formatMetrics.pptx.successRate,
            conversions: dashboard.formatMetrics.pptx.conversions
          },
          docx: {
            status: dashboard.formatMetrics.docx.status,
            successRate: dashboard.formatMetrics.docx.successRate,
            conversions: dashboard.formatMetrics.docx.conversions
          },
          xlsx: {
            status: dashboard.formatMetrics.xlsx.status,
            successRate: dashboard.formatMetrics.xlsx.successRate,
            conversions: dashboard.formatMetrics.xlsx.conversions
          }
        },
        services: dashboard.serviceHealth.map(s => ({
          name: s.serviceName,
          status: s.status,
          successRate: s.successRate
        })),
        alerts: {
          critical: dashboard.activeAlerts.filter(a => a.severity === 'critical').length,
          warning: dashboard.activeAlerts.filter(a => a.severity === 'warning').length,
          total: dashboard.activeAlerts.length
        }
      };

      res.status(200).json({
        success: true,
        data: health,
        message: 'System health retrieved successfully'
      });

    } catch (error: any) {
      console.error('❌ [METRICS-API] Health check failed:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Failed to retrieve system health',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * GET /api/metrics/alerts
   * Get active alerts
   */
  static async getActiveAlerts(req: Request, res: Response): Promise<void> {
    try {
      console.log('🚨 [METRICS-API] Fetching active alerts...');

      const dashboard = await FormatMetricsMonitorService.getDashboard();

      res.status(200).json({
        success: true,
        data: {
          alerts: dashboard.activeAlerts,
          count: dashboard.activeAlerts.length,
          bySeverity: {
            critical: dashboard.activeAlerts.filter(a => a.severity === 'critical').length,
            warning: dashboard.activeAlerts.filter(a => a.severity === 'warning').length,
            info: dashboard.activeAlerts.filter(a => a.severity === 'info').length
          },
          byFormat: {
            pptx: dashboard.activeAlerts.filter(a => a.format === 'pptx').length,
            docx: dashboard.activeAlerts.filter(a => a.format === 'docx').length,
            xlsx: dashboard.activeAlerts.filter(a => a.format === 'xlsx').length
          }
        },
        message: 'Active alerts retrieved successfully'
      });

    } catch (error: any) {
      console.error('❌ [METRICS-API] Alerts fetch failed:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'ALERTS_ERROR',
          message: 'Failed to fetch active alerts',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * GET /api/metrics/recent-activity
   * Get recent conversion activity
   */
  static async getRecentActivity(req: Request, res: Response): Promise<void> {
    try {
      const { limit = '20' } = req.query;

      console.log(`📋 [METRICS-API] Fetching recent activity (limit: ${limit})...`);

      const dashboard = await FormatMetricsMonitorService.getDashboard();

      const limitNum = parseInt(limit as string, 10);
      const recentConversions = dashboard.recentConversions.slice(0, limitNum);

      res.status(200).json({
        success: true,
        data: {
          conversions: recentConversions,
          count: recentConversions.length
        },
        message: 'Recent activity retrieved successfully'
      });

    } catch (error: any) {
      console.error('❌ [METRICS-API] Recent activity fetch failed:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'ACTIVITY_ERROR',
          message: 'Failed to fetch recent activity',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * POST /api/metrics/cleanup
   * Trigger cleanup of old metrics
   * (Protected endpoint - should require admin auth)
   */
  static async cleanupOldMetrics(req: Request, res: Response): Promise<void> {
    try {
      console.log('🧹 [METRICS-API] Triggering metrics cleanup...');

      await FormatMetricsMonitorService.cleanupOldMetrics();

      res.status(200).json({
        success: true,
        message: 'Metrics cleanup completed successfully'
      });

    } catch (error: any) {
      console.error('❌ [METRICS-API] Cleanup failed:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'CLEANUP_ERROR',
          message: 'Failed to cleanup old metrics',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * GET /api/metrics/summary
   * Get quick summary of all metrics
   */
  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      console.log('📈 [METRICS-API] Fetching metrics summary...');

      const dashboard = await FormatMetricsMonitorService.getDashboard();

      const summary = {
        timestamp: dashboard.timestamp,
        overall: dashboard.overall,
        formats: {
          pptx: {
            conversions: dashboard.formatMetrics.pptx.conversions,
            successRate: dashboard.formatMetrics.pptx.successRate,
            status: dashboard.formatMetrics.pptx.status
          },
          docx: {
            conversions: dashboard.formatMetrics.docx.conversions,
            successRate: dashboard.formatMetrics.docx.successRate,
            status: dashboard.formatMetrics.docx.status
          },
          xlsx: {
            conversions: dashboard.formatMetrics.xlsx.conversions,
            successRate: dashboard.formatMetrics.xlsx.successRate,
            status: dashboard.formatMetrics.xlsx.status
          }
        },
        services: {
          total: dashboard.serviceHealth.length,
          healthy: dashboard.serviceHealth.filter(s => s.status === 'healthy').length,
          degraded: dashboard.serviceHealth.filter(s => s.status === 'degraded').length,
          down: dashboard.serviceHealth.filter(s => s.status === 'down').length
        },
        alerts: {
          total: dashboard.activeAlerts.length,
          critical: dashboard.activeAlerts.filter(a => a.severity === 'critical').length,
          warning: dashboard.activeAlerts.filter(a => a.severity === 'warning').length
        }
      };

      res.status(200).json({
        success: true,
        data: summary,
        message: 'Metrics summary retrieved successfully'
      });

    } catch (error: any) {
      console.error('❌ [METRICS-API] Summary fetch failed:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'SUMMARY_ERROR',
          message: 'Failed to fetch metrics summary',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }
}

export default FormatMetricsController;
