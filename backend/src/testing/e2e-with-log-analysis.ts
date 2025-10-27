/**
 * Enhanced E2E Testing Framework with Real-time Log Analysis
 * pdflab.pro - Addresses the critical gap where logs are not reviewed during testing
 */

import { LogMonitoringService, LogMonitoringReport } from '../services/log-monitoring.service';
import { PDFService } from '../services/pdf.service';
import { PPTXValidatorService } from '../services/pptx-validator.service';
import fs from 'fs';
import path from 'path';
import winston from 'winston';

export interface E2ETestConfig {
  testName: string;
  pdfPath: string;
  expectedOutputPath?: string;
  maxProcessingTime: number; // milliseconds
  qualityThreshold: number; // percentage
  criticalIssuesAllowed: number;
  warningsAllowed: number;
}

export interface E2ETestResult {
  testName: string;
  success: boolean;
  duration: number;
  conversionResult?: {
    outputFile: string;
    processingTime: number;
    validation: any;
  };
  logAnalysis: LogMonitoringReport;
  issues: string[];
  recommendations: string[];
  riskAssessment: 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL';
}

/**
 * Enhanced E2E Testing with Real-time Log Monitoring
 * This addresses the critical testing gap identified by specialists
 */
export class E2ETestingFramework {
  private logMonitoring: LogMonitoringService;
  private outputDir: string;

  constructor() {
    this.logMonitoring = LogMonitoringService.getInstance();
    this.outputDir = path.join(process.cwd(), 'test-output');

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Run comprehensive E2E test with log analysis
   */
  public async runE2ETest(config: E2ETestConfig): Promise<E2ETestResult> {
    const testSessionId = `e2e-${Date.now()}-${config.testName.replace(/\s+/g, '-')}`;
    const startTime = Date.now();

    winston.info(`🚀 [E2E-LOG-ANALYSIS] Starting test: ${config.testName}`);
    winston.info(`📋 [E2E-LOG-ANALYSIS] Session ID: ${testSessionId}`);

    const result: E2ETestResult = {
      testName: config.testName,
      success: false,
      duration: 0,
      logAnalysis: {} as LogMonitoringReport,
      issues: [],
      recommendations: [],
      riskAssessment: 'FAIL'
    };

    try {
      // Step 1: Start log monitoring BEFORE test execution
      await this.logMonitoring.startMonitoring(testSessionId);
      winston.info(`📊 [E2E-LOG-ANALYSIS] Log monitoring started`);

      // Step 2: Set up real-time log analysis event listeners
      this.setupLogEventListeners(result);

      // Step 3: Execute PDF conversion with monitoring
      const conversionResult = await this.executeConversionWithMonitoring(config);
      result.conversionResult = conversionResult;

      // Step 4: Stop monitoring and get comprehensive log analysis
      const logReport = await this.logMonitoring.stopMonitoring();
      result.logAnalysis = logReport;

      // Step 5: Analyze results and generate assessment
      result.duration = Date.now() - startTime;
      await this.analyzeTestResults(result, config);

      winston.info(`✅ [E2E-LOG-ANALYSIS] Test completed: ${config.testName}`);
      winston.info(`📊 [E2E-LOG-ANALYSIS] Risk Level: ${result.riskAssessment}`);

    } catch (error) {
      result.issues.push(`Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.duration = Date.now() - startTime;

      // Still get log analysis even if test failed
      try {
        result.logAnalysis = await this.logMonitoring.stopMonitoring();
      } catch (stopError) {
        winston.error(`Failed to stop log monitoring:`, stopError);
      }

      winston.error(`❌ [E2E-LOG-ANALYSIS] Test failed: ${config.testName}`, error);
    }

    // Generate comprehensive test report
    await this.generateTestReport(result, config);

    return result;
  }

  /**
   * Set up real-time log event listeners
   */
  private setupLogEventListeners(result: E2ETestResult): void {
    // Listen for critical alerts during test execution
    this.logMonitoring.on('critical-alert', (alert) => {
      result.issues.push(`CRITICAL: ${alert.pattern.name} - ${alert.match}`);
      result.recommendations.push(alert.recommendation || 'Immediate investigation required');
      winston.error(`🚨 [E2E-REALTIME] Critical alert during test: ${alert.pattern.name}`);
    });

    // Listen for performance issues
    this.logMonitoring.on('pattern-detected', (alert) => {
      if (alert.pattern.name === 'SLOW_PROCESSING') {
        result.issues.push(`PERFORMANCE: Slow processing detected - ${alert.match}`);
        winston.warn(`⚠️ [E2E-REALTIME] Performance issue: ${alert.match}`);
      }
    });

    // Listen for metrics collection
    this.logMonitoring.on('metric-collected', (metric) => {
      winston.info(`📈 [E2E-REALTIME] Metric collected: ${metric.name} = ${metric.value}`);
    });
  }

  /**
   * Execute PDF conversion with comprehensive monitoring
   */
  private async executeConversionWithMonitoring(config: E2ETestConfig): Promise<any> {
    winston.info(`🔄 [E2E-LOG-ANALYSIS] Starting PDF conversion: ${path.basename(config.pdfPath)}`);

    const conversionStart = Date.now();

    try {
      // Execute the actual conversion
      const outputFile = await PDFService.convertPDFToPPT(config.pdfPath, this.outputDir);
      const processingTime = Date.now() - conversionStart;

      winston.info(`✅ [E2E-LOG-ANALYSIS] Conversion completed in ${processingTime}ms`);

      // Validate the output
      const outputPath = path.join(this.outputDir, outputFile);
      const validation = await PPTXValidatorService.validatePowerPointFile(outputPath);

      // Calculate quality score for logging
      const quality = validation.quality;
      const qualityScore = quality ?
        (quality.hasImages ? 25 : 0) +
        (quality.hasText ? 40 : 0) +
        (quality.hasNotes ? 15 : 0) +
        Math.min(quality.avgContentPerSlide * 5, 20) : 0;
      winston.info(`🔍 [E2E-LOG-ANALYSIS] Validation completed - Valid: ${validation.isValid}, Quality: ${qualityScore}%`);

      return {
        outputFile,
        processingTime,
        validation
      };

    } catch (error) {
      winston.error(`❌ [E2E-LOG-ANALYSIS] Conversion failed:`, error);
      throw error;
    }
  }

  /**
   * Analyze comprehensive test results including log analysis
   */
  private async analyzeTestResults(result: E2ETestResult, config: E2ETestConfig): Promise<void> {
    const logReport = result.logAnalysis;
    const conversionResult = result.conversionResult;

    // Check conversion success
    if (!conversionResult) {
      result.issues.push('Conversion failed to produce output');
      result.riskAssessment = 'FAIL';
      return;
    }

    // Check processing time
    if (conversionResult.processingTime > config.maxProcessingTime) {
      result.issues.push(`Processing time (${conversionResult.processingTime}ms) exceeded threshold (${config.maxProcessingTime}ms)`);
    }

    // Check validation quality (calculate from available metrics)
    const quality = conversionResult.validation?.quality;
    const qualityScore = quality ?
      (quality.hasImages ? 25 : 0) +
      (quality.hasText ? 40 : 0) +
      (quality.hasNotes ? 15 : 0) +
      Math.min(quality.avgContentPerSlide * 5, 20) : 0;
    if (qualityScore < config.qualityThreshold) {
      result.issues.push(`Quality score (${qualityScore}%) below threshold (${config.qualityThreshold}%)`);
    }

    // Analyze log patterns
    if (logReport.summary.criticalAlerts > config.criticalIssuesAllowed) {
      result.issues.push(`Critical issues (${logReport.summary.criticalAlerts}) exceeded allowed limit (${config.criticalIssuesAllowed})`);
    }

    if (logReport.summary.warningAlerts > config.warningsAllowed) {
      result.issues.push(`Warnings (${logReport.summary.warningAlerts}) exceeded allowed limit (${config.warningsAllowed})`);
    }

    // Add log-specific recommendations
    result.recommendations.push(...logReport.summary.recommendations);

    // Determine final risk assessment
    if (result.issues.length === 0) {
      result.success = true;
      result.riskAssessment = 'PASS';
    } else if (logReport.summary.criticalAlerts === 0 && result.issues.length <= 2) {
      result.success = true;
      result.riskAssessment = 'PASS_WITH_WARNINGS';
    } else {
      result.success = false;
      result.riskAssessment = 'FAIL';
    }

    winston.info(`📊 [E2E-LOG-ANALYSIS] Analysis complete: ${result.riskAssessment}`);
  }

  /**
   * Generate comprehensive test report
   */
  private async generateTestReport(result: E2ETestResult, config: E2ETestConfig): Promise<void> {
    const reportPath = path.join(this.outputDir, `e2e-report-${Date.now()}.json`);

    const report = {
      metadata: {
        testName: config.testName,
        timestamp: new Date().toISOString(),
        duration: result.duration,
        riskAssessment: result.riskAssessment
      },
      testConfig: config,
      results: result,
      logAnalysis: {
        summary: result.logAnalysis.summary,
        metricsSnapshot: result.logAnalysis.metrics,
        criticalAlertsCount: result.logAnalysis.alerts?.filter(a => a.severity === 'CRITICAL').length || 0,
        warningAlertsCount: result.logAnalysis.alerts?.filter(a => a.severity === 'WARNING').length || 0
      },
      recommendations: {
        immediate: result.issues,
        improvements: result.recommendations,
        nextSteps: this.generateNextSteps(result)
      }
    };

    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
    winston.info(`📄 [E2E-LOG-ANALYSIS] Report saved: ${reportPath}`);
  }

  /**
   * Generate actionable next steps based on results
   */
  private generateNextSteps(result: E2ETestResult): string[] {
    const nextSteps: string[] = [];

    if (result.riskAssessment === 'FAIL') {
      nextSteps.push('Address critical issues before proceeding to production');
      nextSteps.push('Review log patterns to identify root causes');
    }

    if (result.riskAssessment === 'PASS_WITH_WARNINGS') {
      nextSteps.push('Monitor identified warning patterns in production');
      nextSteps.push('Consider implementing additional error handling');
    }

    if (result.riskAssessment === 'PASS') {
      nextSteps.push('System ready for production deployment');
      nextSteps.push('Continue monitoring performance metrics');
    }

    // Add processing time recommendations
    if (result.conversionResult && result.conversionResult.processingTime > 5000) {
      nextSteps.push('Investigate performance optimization opportunities');
    }

    return nextSteps;
  }

  /**
   * Run multiple E2E tests with batch analysis
   */
  public async runTestSuite(configs: E2ETestConfig[]): Promise<E2ETestResult[]> {
    winston.info(`🧪 [E2E-LOG-ANALYSIS] Starting test suite with ${configs.length} tests`);

    const results: E2ETestResult[] = [];

    for (const config of configs) {
      const result = await this.runE2ETest(config);
      results.push(result);

      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Generate suite summary
    await this.generateSuiteSummary(results);

    winston.info(`✅ [E2E-LOG-ANALYSIS] Test suite completed`);
    return results;
  }

  /**
   * Generate comprehensive suite summary
   */
  private async generateSuiteSummary(results: E2ETestResult[]): Promise<void> {
    const summaryPath = path.join(this.outputDir, `e2e-suite-summary-${Date.now()}.json`);

    const summary = {
      metadata: {
        totalTests: results.length,
        timestamp: new Date().toISOString(),
        passedTests: results.filter(r => r.success).length,
        failedTests: results.filter(r => !r.success).length
      },
      riskDistribution: {
        pass: results.filter(r => r.riskAssessment === 'PASS').length,
        passWithWarnings: results.filter(r => r.riskAssessment === 'PASS_WITH_WARNINGS').length,
        fail: results.filter(r => r.riskAssessment === 'FAIL').length
      },
      aggregatedMetrics: {
        totalCriticalIssues: results.reduce((sum, r) => sum + (r.logAnalysis.summary?.criticalAlerts || 0), 0),
        totalWarnings: results.reduce((sum, r) => sum + (r.logAnalysis.summary?.warningAlerts || 0), 0),
        averageProcessingTime: this.calculateAverageProcessingTime(results),
        overallRecommendations: this.aggregateRecommendations(results)
      },
      detailedResults: results
    };

    await fs.promises.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    winston.info(`📊 [E2E-LOG-ANALYSIS] Suite summary saved: ${summaryPath}`);
  }

  /**
   * Calculate average processing time across tests
   */
  private calculateAverageProcessingTime(results: E2ETestResult[]): number {
    const times = results
      .filter(r => r.conversionResult?.processingTime)
      .map(r => r.conversionResult!.processingTime);

    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  /**
   * Aggregate unique recommendations across tests
   */
  private aggregateRecommendations(results: E2ETestResult[]): string[] {
    const allRecommendations = results.flatMap(r => r.recommendations);
    return Array.from(new Set(allRecommendations));
  }
}

// Export convenience function for quick testing
export async function runQuickE2ETest(pdfPath: string, testName: string = 'Quick Test'): Promise<E2ETestResult> {
  const framework = new E2ETestingFramework();

  const config: E2ETestConfig = {
    testName,
    pdfPath,
    maxProcessingTime: 10000, // 10 seconds
    qualityThreshold: 70, // 70% quality threshold
    criticalIssuesAllowed: 0,
    warningsAllowed: 2
  };

  return framework.runE2ETest(config);
}