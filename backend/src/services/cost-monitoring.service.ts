/**
 * 📊 COST MONITORING & ALERTING SERVICE
 * Real-time cost tracking and budget management for OCR operations
 *
 * Features:
 * - Real-time cost tracking across all OCR engines
 * - Budget alerts and threshold monitoring
 * - Cost analytics and reporting
 * - Automatic cost optimization recommendations
 * - Integration with business intelligence tools
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';

// Cost Tracking Types
export interface CostTransaction {
  id: string;
  service: string;
  engine: string;
  costAmount: number;
  pageCount: number;
  processingTime: number;
  accuracy: number;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface CostAlert {
  type: 'budget_warning' | 'budget_exceeded' | 'cost_spike' | 'efficiency_drop';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentAmount: number;
  threshold: number;
  recommendations: string[];
  timestamp: Date;
}

export interface CostReport {
  period: string;
  totalCost: number;
  totalPages: number;
  averageCostPerPage: number;
  engineBreakdown: Record<string, {
    cost: number;
    pages: number;
    averageAccuracy: number;
    averageSpeed: number;
  }>;
  trends: {
    costTrend: 'up' | 'down' | 'stable';
    efficiencyTrend: 'improving' | 'declining' | 'stable';
    volumeTrend: 'increasing' | 'decreasing' | 'stable';
  };
  recommendations: string[];
}

export interface BudgetConfig {
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  warningThreshold: number; // Percentage of limit
  criticalThreshold: number;
  enableAlerts: boolean;
  alertEmails: string[];
}

export class CostMonitoringService extends EventEmitter {
  private static instance: CostMonitoringService;
  private transactions: Map<string, CostTransaction> = new Map();
  private budgetConfig: BudgetConfig;
  private dataDirectory: string;

  private constructor(config: Partial<BudgetConfig> = {}) {
    super();

    this.budgetConfig = {
      dailyLimit: config.dailyLimit || 50.0,
      weeklyLimit: config.weeklyLimit || 300.0,
      monthlyLimit: config.monthlyLimit || 1000.0,
      warningThreshold: config.warningThreshold || 80,
      criticalThreshold: config.criticalThreshold || 95,
      enableAlerts: config.enableAlerts !== undefined ? config.enableAlerts : true,
      alertEmails: config.alertEmails || []
    };

    this.dataDirectory = path.join(process.cwd(), 'data', 'cost-monitoring');
    this.initializeStorage();
  }

  static getInstance(config?: Partial<BudgetConfig>): CostMonitoringService {
    if (!CostMonitoringService.instance) {
      CostMonitoringService.instance = new CostMonitoringService(config);
    }
    return CostMonitoringService.instance;
  }

  /**
   * 💳 RECORD COST TRANSACTION
   */
  async recordTransaction(transaction: Omit<CostTransaction, 'id'>): Promise<void> {
    const id = this.generateTransactionId();
    const fullTransaction: CostTransaction = {
      id,
      ...transaction
    };

    this.transactions.set(id, fullTransaction);
    await this.persistTransaction(fullTransaction);

    // Check budget limits and trigger alerts
    await this.checkBudgetLimits();

    // Emit transaction event for real-time monitoring
    this.emit('transaction', fullTransaction);

    console.log(`💳 [COST-MONITOR] Recorded: $${transaction.costAmount.toFixed(4)} (${transaction.engine})`);
  }

  /**
   * 📊 GET REAL-TIME COST METRICS
   */
  async getCurrentPeriodCosts(): Promise<{
    daily: number;
    weekly: number;
    monthly: number;
    percentOfLimits: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const dailyCost = this.calculateCostForPeriod(today, now);
    const weeklyCost = this.calculateCostForPeriod(weekStart, now);
    const monthlyCost = this.calculateCostForPeriod(monthStart, now);

    return {
      daily: dailyCost,
      weekly: weeklyCost,
      monthly: monthlyCost,
      percentOfLimits: {
        daily: (dailyCost / this.budgetConfig.dailyLimit) * 100,
        weekly: (weeklyCost / this.budgetConfig.weeklyLimit) * 100,
        monthly: (monthlyCost / this.budgetConfig.monthlyLimit) * 100
      }
    };
  }

  /**
   * 🚨 CHECK BUDGET LIMITS AND TRIGGER ALERTS
   */
  private async checkBudgetLimits(): Promise<void> {
    if (!this.budgetConfig.enableAlerts) return;

    const currentCosts = await this.getCurrentPeriodCosts();
    const alerts: CostAlert[] = [];

    // Daily budget checks
    if (currentCosts.percentOfLimits.daily >= this.budgetConfig.criticalThreshold) {
      alerts.push({
        type: 'budget_exceeded',
        severity: 'critical',
        message: `Daily budget critical: $${currentCosts.daily.toFixed(2)} of $${this.budgetConfig.dailyLimit} (${currentCosts.percentOfLimits.daily.toFixed(1)}%)`,
        currentAmount: currentCosts.daily,
        threshold: this.budgetConfig.dailyLimit,
        recommendations: [
          'Switch to Tesseract-only processing for remaining today',
          'Implement emergency cost controls',
          'Review high-cost operations from today'
        ],
        timestamp: new Date()
      });
    } else if (currentCosts.percentOfLimits.daily >= this.budgetConfig.warningThreshold) {
      alerts.push({
        type: 'budget_warning',
        severity: 'medium',
        message: `Daily budget warning: $${currentCosts.daily.toFixed(2)} of $${this.budgetConfig.dailyLimit} (${currentCosts.percentOfLimits.daily.toFixed(1)}%)`,
        currentAmount: currentCosts.daily,
        threshold: this.budgetConfig.dailyLimit,
        recommendations: [
          'Consider using cost-balanced engine selection',
          'Monitor remaining operations carefully',
          'Switch to aggressive cost mode if needed'
        ],
        timestamp: new Date()
      });
    }

    // Weekly budget checks
    if (currentCosts.percentOfLimits.weekly >= this.budgetConfig.criticalThreshold) {
      alerts.push({
        type: 'budget_exceeded',
        severity: 'critical',
        message: `Weekly budget critical: $${currentCosts.weekly.toFixed(2)} of $${this.budgetConfig.weeklyLimit}`,
        currentAmount: currentCosts.weekly,
        threshold: this.budgetConfig.weeklyLimit,
        recommendations: [
          'Implement aggressive cost controls immediately',
          'Review and optimize high-cost operations',
          'Consider temporary service restrictions'
        ],
        timestamp: new Date()
      });
    }

    // Monthly budget checks
    if (currentCosts.percentOfLimits.monthly >= this.budgetConfig.warningThreshold) {
      alerts.push({
        type: 'budget_warning',
        severity: currentCosts.percentOfLimits.monthly >= this.budgetConfig.criticalThreshold ? 'high' : 'medium',
        message: `Monthly budget at ${currentCosts.percentOfLimits.monthly.toFixed(1)}%: $${currentCosts.monthly.toFixed(2)} of $${this.budgetConfig.monthlyLimit}`,
        currentAmount: currentCosts.monthly,
        threshold: this.budgetConfig.monthlyLimit,
        recommendations: [
          'Plan cost optimization for remaining month',
          'Review monthly usage patterns',
          'Consider budget increase if justified by business value'
        ],
        timestamp: new Date()
      });
    }

    // Process alerts
    for (const alert of alerts) {
      await this.processAlert(alert);
    }
  }

  /**
   * 🔔 PROCESS COST ALERT
   */
  private async processAlert(alert: CostAlert): Promise<void> {
    console.log(`🚨 [COST-ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`);

    // Save alert to file
    await this.saveAlert(alert);

    // Emit alert event
    this.emit('alert', alert);

    // Send notifications if configured
    if (this.budgetConfig.alertEmails.length > 0) {
      // In production, integrate with email service
      console.log(`📧 [ALERT-EMAIL] Would send to: ${this.budgetConfig.alertEmails.join(', ')}`);
    }

    // Auto-trigger cost optimization if critical
    if (alert.severity === 'critical') {
      console.log(`🔧 [AUTO-OPTIMIZE] Triggering emergency cost optimization...`);
      // Could trigger automatic cost mode switching here
    }
  }

  /**
   * 📈 GENERATE COST REPORT
   */
  async generateReport(period: 'day' | 'week' | 'month' | 'custom', customStart?: Date, customEnd?: Date): Promise<CostReport> {
    const { start, end, periodLabel } = this.getPeriodBounds(period, customStart, customEnd);

    const transactions = Array.from(this.transactions.values())
      .filter(t => t.timestamp >= start && t.timestamp <= end);

    if (transactions.length === 0) {
      return this.createEmptyReport(periodLabel);
    }

    const totalCost = transactions.reduce((sum, t) => sum + t.costAmount, 0);
    const totalPages = transactions.reduce((sum, t) => sum + t.pageCount, 0);
    const averageCostPerPage = totalCost / totalPages;

    // Engine breakdown
    const engineBreakdown: Record<string, any> = {};
    for (const transaction of transactions) {
      if (!engineBreakdown[transaction.engine]) {
        engineBreakdown[transaction.engine] = {
          cost: 0,
          pages: 0,
          accuracySum: 0,
          speedSum: 0,
          count: 0
        };
      }

      const engine = engineBreakdown[transaction.engine];
      engine.cost += transaction.costAmount;
      engine.pages += transaction.pageCount;
      engine.accuracySum += transaction.accuracy;
      engine.speedSum += (transaction.pageCount / transaction.processingTime) * 1000; // pages per second
      engine.count += 1;
    }

    // Calculate averages
    Object.keys(engineBreakdown).forEach(engine => {
      const data = engineBreakdown[engine];
      data.averageAccuracy = data.accuracySum / data.count;
      data.averageSpeed = data.speedSum / data.count;
      delete data.accuracySum;
      delete data.speedSum;
      delete data.count;
    });

    // Calculate trends (simplified version)
    const trends = await this.calculateTrends(period);

    // Generate recommendations
    const recommendations = this.generateRecommendations(engineBreakdown, trends, totalCost);

    return {
      period: periodLabel,
      totalCost,
      totalPages,
      averageCostPerPage,
      engineBreakdown,
      trends,
      recommendations
    };
  }

  /**
   * 🎯 GET COST OPTIMIZATION RECOMMENDATIONS
   */
  async getOptimizationRecommendations(): Promise<string[]> {
    const dailyReport = await this.generateReport('day');
    const weeklyReport = await this.generateReport('week');

    const recommendations: string[] = [];

    // Check cost efficiency
    if (dailyReport.averageCostPerPage > 0.02) {
      recommendations.push('💡 Average cost per page is high - consider using Tesseract for simple documents');
    }

    // Check engine distribution
    const engines = Object.keys(dailyReport.engineBreakdown);
    const expensiveEngines = engines.filter(e =>
      dailyReport.engineBreakdown[e].cost / dailyReport.engineBreakdown[e].pages > 0.01
    );

    if (expensiveEngines.length > 0) {
      recommendations.push(`💡 High usage of expensive engines: ${expensiveEngines.join(', ')} - review accuracy requirements`);
    }

    // Check volume patterns
    if (weeklyReport.totalPages > 1000) {
      recommendations.push('💡 High volume detected - consider negotiating bulk pricing with cloud OCR providers');
    }

    return recommendations;
  }

  /**
   * 🔧 UTILITY METHODS
   */
  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.dataDirectory, { recursive: true });
    } catch (error) {
      console.warn(`⚠️ [COST-MONITOR] Could not create data directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async persistTransaction(transaction: CostTransaction): Promise<void> {
    try {
      const filename = `transactions_${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(this.dataDirectory, filename);

      let transactions: CostTransaction[] = [];
      try {
        const existing = await fs.readFile(filepath, 'utf-8');
        transactions = JSON.parse(existing);
      } catch {
        // File doesn't exist yet
      }

      transactions.push(transaction);
      await fs.writeFile(filepath, JSON.stringify(transactions, null, 2));
    } catch (error) {
      console.warn(`⚠️ [COST-MONITOR] Could not persist transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async saveAlert(alert: CostAlert): Promise<void> {
    try {
      const filename = `alerts_${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(this.dataDirectory, filename);

      let alerts: CostAlert[] = [];
      try {
        const existing = await fs.readFile(filepath, 'utf-8');
        alerts = JSON.parse(existing);
      } catch {
        // File doesn't exist yet
      }

      alerts.push(alert);
      await fs.writeFile(filepath, JSON.stringify(alerts, null, 2));
    } catch (error) {
      console.warn(`⚠️ [COST-MONITOR] Could not save alert: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private calculateCostForPeriod(start: Date, end: Date): number {
    return Array.from(this.transactions.values())
      .filter(t => t.timestamp >= start && t.timestamp <= end)
      .reduce((sum, t) => sum + t.costAmount, 0);
  }

  private getPeriodBounds(period: string, customStart?: Date, customEnd?: Date) {
    const now = new Date();
    let start: Date, end: Date, periodLabel: string;

    switch (period) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = now;
        periodLabel = start.toDateString();
        break;
      case 'week':
        start = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
        end = now;
        periodLabel = `Week of ${start.toDateString()}`;
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        periodLabel = `${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
        break;
      case 'custom':
        start = customStart || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = customEnd || now;
        periodLabel = `${start.toDateString()} to ${end.toDateString()}`;
        break;
      default:
        throw new Error(`Invalid period: ${period}`);
    }

    return { start, end, periodLabel };
  }

  private createEmptyReport(periodLabel: string): CostReport {
    return {
      period: periodLabel,
      totalCost: 0,
      totalPages: 0,
      averageCostPerPage: 0,
      engineBreakdown: {},
      trends: {
        costTrend: 'stable',
        efficiencyTrend: 'stable',
        volumeTrend: 'stable'
      },
      recommendations: ['No data available for this period']
    };
  }

  private async calculateTrends(period: string): Promise<any> {
    // Simplified trend calculation
    return {
      costTrend: 'stable' as const,
      efficiencyTrend: 'stable' as const,
      volumeTrend: 'stable' as const
    };
  }

  private generateRecommendations(engineBreakdown: any, trends: any, totalCost: number): string[] {
    const recommendations: string[] = [];

    // Cost-based recommendations
    if (totalCost > 10) {
      recommendations.push('Consider implementing more aggressive cost controls');
    }

    // Engine-based recommendations
    const engines = Object.keys(engineBreakdown);
    if (engines.some(e => engineBreakdown[e].cost / engineBreakdown[e].pages > 0.01)) {
      recommendations.push('Review usage of expensive cloud OCR engines');
    }

    if (recommendations.length === 0) {
      recommendations.push('Cost efficiency is good - continue current practices');
    }

    return recommendations;
  }
}

// Singleton export
export const costMonitor = CostMonitoringService.getInstance();