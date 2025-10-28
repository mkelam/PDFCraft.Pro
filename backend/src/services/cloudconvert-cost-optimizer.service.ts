/**
 * CLOUDCONVERT COST OPTIMIZER SERVICE
 *
 * Monitors and optimizes CloudConvert API costs
 * Provides intelligent routing decisions based on cost, user tier, and usage patterns
 * Implements cost caps, budget monitoring, and usage analytics
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface CostMetrics {
  totalSpent: number;
  monthlySpent: number;
  dailySpent: number;
  totalConversions: number;
  monthlyConversions: number;
  dailyConversions: number;
  averageCostPerConversion: number;
  lastReset: Date;
}

export interface CostEstimate {
  estimatedCost: number;
  currency: string;
  factors: {
    baseCost: number;
    pageCost: number;
    sizeFactor: number;
    complexityFactor: number;
  };
  confidence: number;
}

export interface BudgetLimits {
  dailyLimit: number;
  monthlyLimit: number;
  perConversionLimit: number;
  userTierLimits: {
    free: number;
    starter: number;
    pro: number;
    enterprise: number;
  };
}

export interface CostOptimizationRule {
  condition: 'file_size' | 'page_count' | 'user_tier' | 'daily_budget' | 'monthly_budget' | 'document_type';
  threshold: number | string;
  action: 'allow_cloudconvert' | 'force_local' | 'cost_check' | 'user_confirm';
  priority: number;
}

export interface UserUsageProfile {
  userId: string;
  userTier: 'free' | 'starter' | 'pro' | 'enterprise';
  totalSpent: number;
  monthlySpent: number;
  conversionCount: number;
  averageFileSize: number;
  preferredService: string;
  lastUsed: Date;
}

export class CloudConvertCostOptimizer {
  private costMetrics: CostMetrics;
  private budgetLimits: BudgetLimits;
  private optimizationRules: CostOptimizationRule[];
  private userProfiles: Map<string, UserUsageProfile> = new Map();
  private readonly costDataPath: string;

  constructor(
    dataPath: string = './data/cloudconvert-costs.json',
    budgetLimits?: Partial<BudgetLimits>
  ) {
    this.costDataPath = dataPath;
    this.budgetLimits = {
      dailyLimit: 50.0, // $50 per day
      monthlyLimit: 1000.0, // $1000 per month
      perConversionLimit: 5.0, // $5 per conversion
      userTierLimits: {
        free: 50.0, // Free users get $50 monthly CloudConvert budget
        starter: 100.0, // $100 monthly for starter
        pro: 500.0, // $500 monthly for pro
        enterprise: -1 // Unlimited for enterprise
      },
      ...budgetLimits
    };

    this.optimizationRules = this.getDefaultOptimizationRules();
    this.initializeCostTracking();
  }

  /**
   * Initialize cost tracking and load historical data
   */
  private async initializeCostTracking(): Promise<void> {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.costDataPath);
      await fs.mkdir(dataDir, { recursive: true });

      // Load existing cost data
      try {
        const data = await fs.readFile(this.costDataPath, 'utf-8');
        const parsed = JSON.parse(data);
        this.costMetrics = {
          ...parsed,
          lastReset: new Date(parsed.lastReset)
        };
      } catch (error) {
        // Initialize with default values
        this.costMetrics = {
          totalSpent: 0,
          monthlySpent: 0,
          dailySpent: 0,
          totalConversions: 0,
          monthlyConversions: 0,
          dailyConversions: 0,
          averageCostPerConversion: 0,
          lastReset: new Date()
        };
      }

      // Reset daily/monthly counters if needed
      await this.checkAndResetCounters();

      console.log('💰 [COST-OPTIMIZER] Initialized with current metrics:', {
        monthlySpent: `$${this.costMetrics.monthlySpent.toFixed(2)}`,
        dailySpent: `$${this.costMetrics.dailySpent.toFixed(2)}`,
        totalConversions: this.costMetrics.totalConversions
      });

    } catch (error) {
      console.error('❌ [COST-OPTIMIZER] Failed to initialize cost tracking:', error);
      throw error;
    }
  }

  /**
   * Check if CloudConvert should be used for a conversion
   */
  async shouldUseCloudConvert(
    inputPath: string,
    options: {
      userId?: string;
      userTier?: string;
      fileSize?: number;
      pageCount?: number;
      documentType?: string;
      urgency?: 'low' | 'normal' | 'high';
    } = {}
  ): Promise<{
    shouldUse: boolean;
    reason: string;
    costEstimate?: CostEstimate;
    alternatives?: string[];
  }> {
    console.log('🤔 [COST-OPTIMIZER] Evaluating CloudConvert usage...');

    try {
      // Get file metadata if not provided
      const fileStats = await fs.stat(inputPath);
      const fileSize = options.fileSize || fileStats.size;
      const userTier = (options.userTier || 'free') as keyof BudgetLimits['userTierLimits'];

      // Generate cost estimate
      const costEstimate = this.estimateConversionCost(fileSize, options.pageCount, options.documentType);

      // Apply optimization rules
      const ruleDecision = this.applyOptimizationRules(inputPath, {
        ...options,
        fileSize,
        costEstimate
      });

      if (!ruleDecision.shouldUse) {
        return {
          shouldUse: false,
          reason: ruleDecision.reason,
          costEstimate,
          alternatives: ['visual-fidelity', 'semantic-validation', 'improved']
        };
      }

      // Check budget limits
      const budgetCheck = await this.checkBudgetLimits(costEstimate.estimatedCost, userTier, options.userId);
      if (!budgetCheck.allowed) {
        return {
          shouldUse: false,
          reason: budgetCheck.reason,
          costEstimate,
          alternatives: ['visual-fidelity', 'semantic-validation', 'enhanced-fallback']
        };
      }

      // CloudConvert is now available for ALL user tiers including free
      // User feedback: "i want CloudConvert to be the primary one since its superior in most ways"

      // All checks passed
      return {
        shouldUse: true,
        reason: `Cost: $${costEstimate.estimatedCost.toFixed(3)}, within budget limits`,
        costEstimate
      };

    } catch (error) {
      console.error('❌ [COST-OPTIMIZER] Error evaluating CloudConvert usage:', error);
      return {
        shouldUse: false,
        reason: 'Error during cost evaluation, defaulting to local services',
        alternatives: ['visual-fidelity', 'semantic-validation']
      };
    }
  }

  /**
   * Estimate cost for a conversion
   */
  estimateConversionCost(
    fileSize: number,
    pageCount?: number,
    documentType?: string
  ): CostEstimate {
    // CloudConvert pricing model (approximate)
    const baseCost = 0.01; // Base cost per conversion
    const sizeMB = fileSize / (1024 * 1024);
    const pages = pageCount || Math.max(1, Math.ceil(sizeMB / 2)); // Estimate 2MB per page

    // Cost factors
    const factors = {
      baseCost: baseCost,
      pageCost: pages * 0.005, // $0.005 per page
      sizeFactor: sizeMB > 10 ? (sizeMB - 10) * 0.001 : 0, // Extra cost for large files
      complexityFactor: this.getComplexityFactor(documentType)
    };

    const estimatedCost = factors.baseCost + factors.pageCost + factors.sizeFactor + factors.complexityFactor;

    return {
      estimatedCost: Math.max(0.01, estimatedCost), // Minimum cost
      currency: 'USD',
      factors,
      confidence: 0.85 // 85% confidence in estimate
    };
  }

  /**
   * Get complexity factor based on document type
   */
  private getComplexityFactor(documentType?: string): number {
    const complexityMap: Record<string, number> = {
      'presentation': 0.002, // Presentations are more complex
      'technical': 0.003, // Technical documents
      'financial': 0.002, // Financial reports
      'marketing': 0.001, // Marketing materials
      'simple': 0.0, // Simple documents
      'text': 0.0 // Text-heavy documents
    };

    return complexityMap[documentType || 'simple'] || 0.001;
  }

  /**
   * Apply optimization rules
   */
  private applyOptimizationRules(
    inputPath: string,
    options: any
  ): { shouldUse: boolean; reason: string } {
    // Sort rules by priority
    const sortedRules = [...this.optimizationRules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      const decision = this.evaluateRule(rule, inputPath, options);
      if (decision) {
        return decision;
      }
    }

    // Default: allow CloudConvert
    return {
      shouldUse: true,
      reason: 'No optimization rules triggered'
    };
  }

  /**
   * Evaluate a single optimization rule
   */
  private evaluateRule(
    rule: CostOptimizationRule,
    inputPath: string,
    options: any
  ): { shouldUse: boolean; reason: string } | null {
    let conditionMet = false;

    switch (rule.condition) {
      case 'file_size':
        conditionMet = typeof rule.threshold === 'number' && (options.fileSize || 0) > rule.threshold;
        break;
      case 'page_count':
        conditionMet = typeof rule.threshold === 'number' && (options.pageCount || 1) > rule.threshold;
        break;
      case 'user_tier':
        conditionMet = options.userTier === rule.threshold;
        break;
      case 'daily_budget':
        conditionMet = typeof rule.threshold === 'number' && this.costMetrics.dailySpent > rule.threshold;
        break;
      case 'monthly_budget':
        conditionMet = typeof rule.threshold === 'number' && this.costMetrics.monthlySpent > rule.threshold;
        break;
      case 'document_type':
        conditionMet = options.documentType === rule.threshold;
        break;
    }

    if (!conditionMet) return null;

    // Apply action
    switch (rule.action) {
      case 'force_local':
        return {
          shouldUse: false,
          reason: `Rule triggered: ${rule.condition} (${rule.threshold}) - forcing local processing`
        };
      case 'cost_check':
        if (options.costEstimate.estimatedCost > 1.0) {
          return {
            shouldUse: false,
            reason: `Cost check failed: estimated $${options.costEstimate.estimatedCost.toFixed(3)} > $1.00`
          };
        }
        break;
      default:
        break;
    }

    return null;
  }

  /**
   * Check budget limits
   */
  private async checkBudgetLimits(
    estimatedCost: number,
    userTier: keyof BudgetLimits['userTierLimits'],
    userId?: string
  ): Promise<{ allowed: boolean; reason: string }> {
    // Check per-conversion limit
    if (estimatedCost > this.budgetLimits.perConversionLimit) {
      return {
        allowed: false,
        reason: `Estimated cost $${estimatedCost.toFixed(3)} exceeds per-conversion limit $${this.budgetLimits.perConversionLimit}`
      };
    }

    // Check daily limit
    if (this.costMetrics.dailySpent + estimatedCost > this.budgetLimits.dailyLimit) {
      return {
        allowed: false,
        reason: `Would exceed daily budget: $${(this.costMetrics.dailySpent + estimatedCost).toFixed(2)} > $${this.budgetLimits.dailyLimit}`
      };
    }

    // Check monthly limit
    if (this.costMetrics.monthlySpent + estimatedCost > this.budgetLimits.monthlyLimit) {
      return {
        allowed: false,
        reason: `Would exceed monthly budget: $${(this.costMetrics.monthlySpent + estimatedCost).toFixed(2)} > $${this.budgetLimits.monthlyLimit}`
      };
    }

    // Check user tier limits
    const tierLimit = this.budgetLimits.userTierLimits[userTier];
    if (tierLimit >= 0) { // -1 means unlimited
      const userProfile = userId ? this.getUserProfile(userId) : null;
      const userMonthlySpent = userProfile?.monthlySpent || 0;

      if (userMonthlySpent + estimatedCost > tierLimit) {
        return {
          allowed: false,
          reason: `Would exceed ${userTier} tier monthly limit: $${(userMonthlySpent + estimatedCost).toFixed(2)} > $${tierLimit}`
        };
      }
    }

    return { allowed: true, reason: 'Within budget limits' };
  }

  /**
   * Record actual cost after conversion
   */
  async recordConversionCost(
    actualCost: number,
    userId?: string,
    metadata?: {
      fileSize: number;
      pageCount: number;
      processingTime: number;
      success: boolean;
    }
  ): Promise<void> {
    console.log(`💰 [COST-OPTIMIZER] Recording cost: $${actualCost.toFixed(3)}`);

    // Update global metrics
    this.costMetrics.totalSpent += actualCost;
    this.costMetrics.monthlySpent += actualCost;
    this.costMetrics.dailySpent += actualCost;
    this.costMetrics.totalConversions++;
    this.costMetrics.monthlyConversions++;
    this.costMetrics.dailyConversions++;
    this.costMetrics.averageCostPerConversion = this.costMetrics.totalSpent / this.costMetrics.totalConversions;

    // Update user profile if provided
    if (userId && metadata) {
      this.updateUserProfile(userId, actualCost, metadata);
    }

    // Save to file
    await this.saveCostData();

    console.log(`📊 [COST-OPTIMIZER] Updated metrics: Daily: $${this.costMetrics.dailySpent.toFixed(2)}, Monthly: $${this.costMetrics.monthlySpent.toFixed(2)}`);
  }

  /**
   * Update user usage profile
   */
  private updateUserProfile(
    userId: string,
    cost: number,
    metadata: {
      fileSize: number;
      pageCount: number;
      processingTime: number;
      success: boolean;
    }
  ): void {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      profile = {
        userId,
        userTier: 'free',
        totalSpent: 0,
        monthlySpent: 0,
        conversionCount: 0,
        averageFileSize: 0,
        preferredService: 'cloudconvert',
        lastUsed: new Date()
      };
    }

    // Update profile
    profile.totalSpent += cost;
    profile.monthlySpent += cost;
    profile.conversionCount++;
    profile.averageFileSize = (profile.averageFileSize * (profile.conversionCount - 1) + metadata.fileSize) / profile.conversionCount;
    profile.lastUsed = new Date();

    this.userProfiles.set(userId, profile);
  }

  /**
   * Get user profile
   */
  getUserProfile(userId: string): UserUsageProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * Get current cost metrics
   */
  getCostMetrics(): CostMetrics {
    return { ...this.costMetrics };
  }

  /**
   * Get cost optimization recommendations
   */
  getOptimizationRecommendations(): {
    recommendations: string[];
    potentialSavings: number;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const recommendations: string[] = [];
    let potentialSavings = 0;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Analyze spending patterns
    const dailyBurnRate = this.costMetrics.dailySpent;
    const monthlyProjection = dailyBurnRate * 30;

    if (monthlyProjection > this.budgetLimits.monthlyLimit * 0.8) {
      recommendations.push('Consider implementing more aggressive local-first routing');
      potentialSavings += monthlyProjection * 0.3;
      riskLevel = 'high';
    }

    if (this.costMetrics.averageCostPerConversion > 0.05) {
      recommendations.push('High average cost per conversion - review file size optimization');
      potentialSavings += this.costMetrics.monthlySpent * 0.2;
      riskLevel = riskLevel === 'high' ? 'high' : 'medium';
    }

    // Check conversion patterns
    if (this.costMetrics.dailyConversions > 100) {
      recommendations.push('High volume detected - consider bulk processing optimization');
      potentialSavings += this.costMetrics.dailySpent * 0.15;
    }

    return {
      recommendations,
      potentialSavings,
      riskLevel
    };
  }

  /**
   * Check and reset daily/monthly counters
   */
  private async checkAndResetCounters(): Promise<void> {
    const now = new Date();
    const lastReset = this.costMetrics.lastReset;

    // Reset daily counters at midnight
    if (now.getDate() !== lastReset.getDate()) {
      console.log('🔄 [COST-OPTIMIZER] Resetting daily counters');
      this.costMetrics.dailySpent = 0;
      this.costMetrics.dailyConversions = 0;
    }

    // Reset monthly counters at month start
    if (now.getMonth() !== lastReset.getMonth()) {
      console.log('🔄 [COST-OPTIMIZER] Resetting monthly counters');
      this.costMetrics.monthlySpent = 0;
      this.costMetrics.monthlyConversions = 0;

      // Reset user monthly spending
      this.userProfiles.forEach(profile => {
        profile.monthlySpent = 0;
      });
    }

    this.costMetrics.lastReset = now;
  }

  /**
   * Save cost data to file
   */
  private async saveCostData(): Promise<void> {
    try {
      await fs.writeFile(this.costDataPath, JSON.stringify(this.costMetrics, null, 2));
    } catch (error) {
      console.error('❌ [COST-OPTIMIZER] Failed to save cost data:', error);
    }
  }

  /**
   * Get default optimization rules
   */
  private getDefaultOptimizationRules(): CostOptimizationRule[] {
    return [
      {
        condition: 'file_size',
        threshold: 50 * 1024 * 1024, // 50MB
        action: 'cost_check',
        priority: 1
      },
      // CloudConvert is now primary for ALL user tiers - no force_local rules
      {
        condition: 'daily_budget',
        threshold: this.budgetLimits.dailyLimit * 0.9, // 90% of daily budget
        action: 'cost_check',
        priority: 2
      },
      {
        condition: 'monthly_budget',
        threshold: this.budgetLimits.monthlyLimit * 0.8, // 80% of monthly budget
        action: 'force_local',
        priority: 3
      },
      {
        condition: 'page_count',
        threshold: 50,
        action: 'cost_check',
        priority: 4
      }
    ];
  }

  /**
   * Cleanup and dispose
   */
  async dispose(): Promise<void> {
    await this.saveCostData();
    console.log('💰 [COST-OPTIMIZER] Disposed successfully');
  }
}

// Singleton instance
export const cloudConvertCostOptimizer = new CloudConvertCostOptimizer();
export default CloudConvertCostOptimizer;