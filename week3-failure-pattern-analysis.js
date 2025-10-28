/**
 * WEEK 3: REAL-WORLD FAILURE PATTERN ANALYSIS
 *
 * Comprehensive analysis of production data from Week 2 testing
 * Identifies patterns, bottlenecks, and optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const SERVER_URL = 'http://localhost:3013';

// Analysis configuration
const analysisConfig = {
  metricsFile: './backend/logs/metrics/metrics-2025-09-28.jsonl',
  outputFile: `week3-analysis-report-${Date.now()}.json`,
  timeRanges: {
    week2Start: '2025-09-28T00:04:00.000Z',
    week2End: '2025-09-28T00:12:00.000Z'
  }
};

// Analysis results structure
let analysisResults = {
  timestamp: new Date().toISOString(),
  period: 'Week 2 Production Testing',
  summary: {
    totalMetricSamples: 0,
    analysisTimespan: 0,
    keyFindings: []
  },
  patterns: {
    performance: {},
    errors: {},
    resource: {},
    conversion: {}
  },
  recommendations: [],
  week4Targets: []
};

/**
 * Load and parse metrics data
 */
function loadMetricsData() {
  console.log('📊 Loading production metrics data...');

  try {
    if (!fs.existsSync(analysisConfig.metricsFile)) {
      console.log('⚠️  Metrics file not found, analyzing current state only');
      return [];
    }

    const data = fs.readFileSync(analysisConfig.metricsFile, 'utf8');
    const lines = data.trim().split('\n').filter(line => line.trim());
    const metrics = lines.map(line => JSON.parse(line));

    console.log(`✅ Loaded ${metrics.length} metric samples`);
    analysisResults.summary.totalMetricSamples = metrics.length;

    return metrics;
  } catch (error) {
    console.error('❌ Error loading metrics:', error.message);
    return [];
  }
}

/**
 * Analyze performance patterns
 */
function analyzePerformancePatterns(metrics) {
  console.log('🚀 Analyzing performance patterns...');

  const performanceData = {
    responseTimeDistribution: {},
    conversionTimeDistribution: {},
    performanceTrends: {
      responseTimes: [],
      conversionTimes: [],
      cpuUsage: [],
      memoryUsage: []
    },
    bottlenecks: []
  };

  metrics.forEach(metric => {
    const appHealth = metric.applicationHealth;
    const convMetrics = metric.conversionMetrics;
    const sysHealth = metric.systemHealth;

    // Response time analysis
    if (appHealth && appHealth.averageResponseTime) {
      const responseTime = appHealth.averageResponseTime;
      performanceData.performanceTrends.responseTimes.push({
        timestamp: metric.timestamp,
        value: responseTime
      });

      // Categorize response times
      const category = responseTime < 10 ? 'fast' :
                     responseTime < 50 ? 'medium' : 'slow';
      performanceData.responseTimeDistribution[category] =
        (performanceData.responseTimeDistribution[category] || 0) + 1;
    }

    // Conversion time analysis
    if (convMetrics && convMetrics.averageConversionTime) {
      const convTime = convMetrics.averageConversionTime;
      performanceData.performanceTrends.conversionTimes.push({
        timestamp: metric.timestamp,
        value: convTime
      });

      // Categorize conversion times (vs 5-second target)
      const category = convTime < 3000 ? 'excellent' :
                      convTime < 5000 ? 'good' : 'slow';
      performanceData.conversionTimeDistribution[category] =
        (performanceData.conversionTimeDistribution[category] || 0) + 1;
    }

    // System resource trends
    if (sysHealth) {
      performanceData.performanceTrends.cpuUsage.push({
        timestamp: metric.timestamp,
        value: sysHealth.cpuUsage
      });
      performanceData.performanceTrends.memoryUsage.push({
        timestamp: metric.timestamp,
        value: sysHealth.memoryUsage
      });
    }
  });

  // Calculate performance statistics
  const avgResponseTime = performanceData.performanceTrends.responseTimes
    .reduce((sum, item) => sum + item.value, 0) /
    performanceData.performanceTrends.responseTimes.length;

  const avgConversionTime = performanceData.performanceTrends.conversionTimes
    .reduce((sum, item) => sum + item.value, 0) /
    performanceData.performanceTrends.conversionTimes.length;

  const maxCpuUsage = Math.max(...performanceData.performanceTrends.cpuUsage.map(item => item.value));
  const avgMemoryUsage = performanceData.performanceTrends.memoryUsage
    .reduce((sum, item) => sum + item.value, 0) /
    performanceData.performanceTrends.memoryUsage.length;

  // Identify bottlenecks
  if (avgResponseTime > 20) {
    performanceData.bottlenecks.push({
      type: 'RESPONSE_TIME',
      severity: 'MEDIUM',
      description: `Average response time ${avgResponseTime.toFixed(1)}ms above optimal range`,
      impact: 'User experience degradation'
    });
  }

  if (avgConversionTime > 5000) {
    performanceData.bottlenecks.push({
      type: 'CONVERSION_TIME',
      severity: 'HIGH',
      description: `Average conversion time ${(avgConversionTime/1000).toFixed(1)}s exceeds 5s target`,
      impact: 'Performance target miss'
    });
  }

  if (maxCpuUsage > 80) {
    performanceData.bottlenecks.push({
      type: 'CPU_USAGE',
      severity: 'HIGH',
      description: `Peak CPU usage ${maxCpuUsage.toFixed(1)}% indicates resource stress`,
      impact: 'System stability risk'
    });
  }

  if (avgMemoryUsage > 80) {
    performanceData.bottlenecks.push({
      type: 'MEMORY_USAGE',
      severity: 'MEDIUM',
      description: `Average memory usage ${avgMemoryUsage.toFixed(1)}% approaching limits`,
      impact: 'Potential memory pressure'
    });
  }

  analysisResults.patterns.performance = performanceData;

  console.log(`✅ Performance analysis complete:`);
  console.log(`   - Average response time: ${avgResponseTime?.toFixed(1) || 'N/A'}ms`);
  console.log(`   - Average conversion time: ${avgConversionTime ? (avgConversionTime/1000).toFixed(1) : 'N/A'}s`);
  console.log(`   - Peak CPU usage: ${maxCpuUsage?.toFixed(1) || 'N/A'}%`);
  console.log(`   - Average memory usage: ${avgMemoryUsage?.toFixed(1) || 'N/A'}%`);
  console.log(`   - Bottlenecks identified: ${performanceData.bottlenecks.length}`);
}

/**
 * Analyze error patterns
 */
function analyzeErrorPatterns(metrics) {
  console.log('🔍 Analyzing error patterns...');

  const errorData = {
    errorCategories: {},
    errorTimeline: [],
    criticalErrors: [],
    errorRate: 0,
    uniqueErrorTypes: new Set()
  };

  let totalRequests = 0;
  let totalErrors = 0;

  metrics.forEach(metric => {
    const errorTracking = metric.errorTracking;
    const appHealth = metric.applicationHealth;

    if (appHealth) {
      totalRequests += appHealth.totalRequests || 0;
      totalErrors += appHealth.failedRequests || 0;
    }

    if (errorTracking && errorTracking.recentErrors) {
      errorTracking.recentErrors.forEach(error => {
        // Categorize errors
        const category = error.category || 'UNKNOWN';
        errorData.errorCategories[category] = (errorData.errorCategories[category] || 0) + 1;
        errorData.uniqueErrorTypes.add(error.type);

        // Track critical errors
        if (error.type === 'CRITICAL') {
          errorData.criticalErrors.push({
            timestamp: error.timestamp,
            message: error.message,
            context: error.context
          });
        }

        // Add to timeline
        errorData.errorTimeline.push({
          timestamp: error.timestamp,
          type: error.type,
          category: error.category,
          message: error.message
        });
      });
    }
  });

  errorData.errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  errorData.uniqueErrorTypes = Array.from(errorData.uniqueErrorTypes);

  analysisResults.patterns.errors = errorData;

  console.log(`✅ Error analysis complete:`);
  console.log(`   - Error rate: ${errorData.errorRate.toFixed(2)}%`);
  console.log(`   - Critical errors: ${errorData.criticalErrors.length}`);
  console.log(`   - Unique error types: ${errorData.uniqueErrorTypes.length}`);
  console.log(`   - Error categories: ${Object.keys(errorData.errorCategories).join(', ')}`);
}

/**
 * Analyze resource utilization patterns
 */
function analyzeResourcePatterns(metrics) {
  console.log('💾 Analyzing resource utilization patterns...');

  const resourceData = {
    cpuPatterns: {
      average: 0,
      peak: 0,
      spikes: []
    },
    memoryPatterns: {
      average: 0,
      peak: 0,
      trend: 'stable'
    },
    uptimeAnalysis: {
      totalUptime: 0,
      restarts: 0
    }
  };

  let cpuValues = [];
  let memoryValues = [];
  let previousUptime = 0;

  metrics.forEach(metric => {
    const sysHealth = metric.systemHealth;

    if (sysHealth) {
      // CPU analysis
      if (typeof sysHealth.cpuUsage === 'number') {
        cpuValues.push(sysHealth.cpuUsage);

        // Identify CPU spikes
        if (sysHealth.cpuUsage > 90) {
          resourceData.cpuPatterns.spikes.push({
            timestamp: metric.timestamp,
            value: sysHealth.cpuUsage
          });
        }
      }

      // Memory analysis
      if (typeof sysHealth.memoryUsage === 'number') {
        memoryValues.push(sysHealth.memoryUsage);
      }

      // Uptime analysis (detect restarts)
      if (sysHealth.uptime < previousUptime) {
        resourceData.uptimeAnalysis.restarts++;
      }
      previousUptime = sysHealth.uptime;
      resourceData.uptimeAnalysis.totalUptime = Math.max(
        resourceData.uptimeAnalysis.totalUptime,
        sysHealth.uptime
      );
    }
  });

  // Calculate statistics
  if (cpuValues.length > 0) {
    resourceData.cpuPatterns.average = cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length;
    resourceData.cpuPatterns.peak = Math.max(...cpuValues);
  }

  if (memoryValues.length > 0) {
    resourceData.memoryPatterns.average = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
    resourceData.memoryPatterns.peak = Math.max(...memoryValues);

    // Determine memory trend
    const firstHalf = memoryValues.slice(0, Math.floor(memoryValues.length / 2));
    const secondHalf = memoryValues.slice(Math.floor(memoryValues.length / 2));

    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const difference = secondAvg - firstAvg;
      if (difference > 2) {
        resourceData.memoryPatterns.trend = 'increasing';
      } else if (difference < -2) {
        resourceData.memoryPatterns.trend = 'decreasing';
      }
    }
  }

  analysisResults.patterns.resource = resourceData;

  console.log(`✅ Resource analysis complete:`);
  console.log(`   - Average CPU usage: ${resourceData.cpuPatterns.average.toFixed(1)}%`);
  console.log(`   - Peak CPU usage: ${resourceData.cpuPatterns.peak.toFixed(1)}%`);
  console.log(`   - CPU spikes: ${resourceData.cpuPatterns.spikes.length}`);
  console.log(`   - Average memory usage: ${resourceData.memoryPatterns.average.toFixed(1)}%`);
  console.log(`   - Memory trend: ${resourceData.memoryPatterns.trend}`);
  console.log(`   - System restarts: ${resourceData.uptimeAnalysis.restarts}`);
}

/**
 * Analyze conversion patterns
 */
function analyzeConversionPatterns(metrics) {
  console.log('🔄 Analyzing conversion patterns...');

  const conversionData = {
    successRate: 0,
    totalConversions: 0,
    conversionTypes: {
      pdfToPpt: 0,
      pdfMerge: 0
    },
    performanceByType: {},
    failurePatterns: []
  };

  let totalConversions = 0;
  let successfulConversions = 0;
  let conversionTimes = [];

  metrics.forEach(metric => {
    const convMetrics = metric.conversionMetrics;

    if (convMetrics) {
      totalConversions = Math.max(totalConversions, convMetrics.totalConversions || 0);
      successfulConversions = Math.max(successfulConversions, convMetrics.successfulConversions || 0);

      conversionData.conversionTypes.pdfToPpt = Math.max(
        conversionData.conversionTypes.pdfToPpt,
        convMetrics.pdfToPptConversions || 0
      );

      conversionData.conversionTypes.pdfMerge = Math.max(
        conversionData.conversionTypes.pdfMerge,
        convMetrics.pdfMergeOperations || 0
      );

      if (convMetrics.averageConversionTime) {
        conversionTimes.push(convMetrics.averageConversionTime);
      }
    }
  });

  conversionData.totalConversions = totalConversions;
  conversionData.successRate = totalConversions > 0 ?
    (successfulConversions / totalConversions) * 100 : 0;

  // Analyze conversion performance
  if (conversionTimes.length > 0) {
    const avgTime = conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length;
    const maxTime = Math.max(...conversionTimes);
    const minTime = Math.min(...conversionTimes);

    conversionData.performanceByType.average = avgTime;
    conversionData.performanceByType.max = maxTime;
    conversionData.performanceByType.min = minTime;
    conversionData.performanceByType.targetAchievement = avgTime < 5000 ? 'ACHIEVED' : 'MISSED';
  }

  analysisResults.patterns.conversion = conversionData;

  console.log(`✅ Conversion analysis complete:`);
  console.log(`   - Success rate: ${conversionData.successRate.toFixed(1)}%`);
  console.log(`   - Total conversions: ${conversionData.totalConversions}`);
  console.log(`   - PDF→PPT conversions: ${conversionData.conversionTypes.pdfToPpt}`);
  console.log(`   - Average conversion time: ${conversionData.performanceByType.average ? (conversionData.performanceByType.average/1000).toFixed(1) : 'N/A'}s`);
  console.log(`   - Target achievement: ${conversionData.performanceByType.targetAchievement || 'N/A'}`);
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations() {
  console.log('💡 Generating recommendations...');

  const recommendations = [];
  const week4Targets = [];

  // Performance recommendations
  const perfPattern = analysisResults.patterns.performance;
  if (perfPattern.bottlenecks && perfPattern.bottlenecks.length > 0) {
    perfPattern.bottlenecks.forEach(bottleneck => {
      let recommendation = '';
      let target = '';

      switch (bottleneck.type) {
        case 'RESPONSE_TIME':
          recommendation = 'Optimize API response times by implementing request caching and reducing middleware overhead';
          target = 'Reduce average response time to <10ms';
          break;
        case 'CONVERSION_TIME':
          recommendation = 'Investigate CloudConvert API performance and implement parallel processing for large documents';
          target = 'Maintain all conversions under 5 seconds';
          break;
        case 'CPU_USAGE':
          recommendation = 'Implement CPU throttling and optimize background processes during peak usage';
          target = 'Keep CPU usage below 80% during normal operations';
          break;
        case 'MEMORY_USAGE':
          recommendation = 'Implement memory cleanup routines and optimize file handling processes';
          target = 'Maintain memory usage below 75%';
          break;
      }

      recommendations.push({
        category: 'PERFORMANCE',
        priority: bottleneck.severity,
        issue: bottleneck.description,
        recommendation,
        impact: bottleneck.impact
      });

      if (target) {
        week4Targets.push({
          category: 'PERFORMANCE',
          target,
          measurable: true
        });
      }
    });
  }

  // Error handling recommendations
  const errorPattern = analysisResults.patterns.errors;
  if (errorPattern.errorRate > 5) {
    recommendations.push({
      category: 'RELIABILITY',
      priority: 'HIGH',
      issue: `Error rate of ${errorPattern.errorRate.toFixed(1)}% exceeds acceptable threshold`,
      recommendation: 'Implement enhanced error handling and retry mechanisms for failed requests',
      impact: 'User experience and system reliability'
    });

    week4Targets.push({
      category: 'RELIABILITY',
      target: 'Reduce error rate to <1%',
      measurable: true
    });
  }

  if (errorPattern.criticalErrors && errorPattern.criticalErrors.length > 0) {
    recommendations.push({
      category: 'RELIABILITY',
      priority: 'CRITICAL',
      issue: `${errorPattern.criticalErrors.length} critical errors detected`,
      recommendation: 'Investigate and fix critical error sources, implement monitoring alerts',
      impact: 'System stability and availability'
    });

    week4Targets.push({
      category: 'RELIABILITY',
      target: 'Zero critical errors in production',
      measurable: true
    });
  }

  // Resource optimization recommendations
  const resourcePattern = analysisResults.patterns.resource;
  if (resourcePattern.cpuPatterns && resourcePattern.cpuPatterns.spikes.length > 0) {
    recommendations.push({
      category: 'OPTIMIZATION',
      priority: 'MEDIUM',
      issue: `${resourcePattern.cpuPatterns.spikes.length} CPU spikes detected`,
      recommendation: 'Implement load balancing and optimize resource-intensive operations',
      impact: 'System performance and stability'
    });

    week4Targets.push({
      category: 'OPTIMIZATION',
      target: 'Eliminate CPU spikes above 90%',
      measurable: true
    });
  }

  if (resourcePattern.memoryPatterns && resourcePattern.memoryPatterns.trend === 'increasing') {
    recommendations.push({
      category: 'OPTIMIZATION',
      priority: 'MEDIUM',
      issue: 'Memory usage showing increasing trend',
      recommendation: 'Investigate potential memory leaks and implement garbage collection optimization',
      impact: 'Long-term system stability'
    });

    week4Targets.push({
      category: 'OPTIMIZATION',
      target: 'Stabilize memory usage trend',
      measurable: true
    });
  }

  // CloudConvert optimization recommendations
  const conversionPattern = analysisResults.patterns.conversion;
  if (conversionPattern.successRate < 95) {
    recommendations.push({
      category: 'CLOUDCONVERT',
      priority: 'HIGH',
      issue: `Conversion success rate of ${conversionPattern.successRate.toFixed(1)}% below target`,
      recommendation: 'Implement robust fallback mechanisms and improve CloudConvert error handling',
      impact: 'User satisfaction and service reliability'
    });

    week4Targets.push({
      category: 'CLOUDCONVERT',
      target: 'Achieve 99%+ conversion success rate',
      measurable: true
    });
  }

  if (conversionPattern.performanceByType && conversionPattern.performanceByType.targetAchievement === 'MISSED') {
    recommendations.push({
      category: 'CLOUDCONVERT',
      priority: 'MEDIUM',
      issue: 'Conversion time target missed',
      recommendation: 'Optimize CloudConvert API usage and implement document preprocessing',
      impact: 'Performance target achievement'
    });

    week4Targets.push({
      category: 'CLOUDCONVERT',
      target: 'Maintain 100% of conversions under 5 seconds',
      measurable: true
    });
  }

  // Add general recommendations
  recommendations.push({
    category: 'MONITORING',
    priority: 'LOW',
    issue: 'Production monitoring system needs enhancement',
    recommendation: 'Implement real-time alerting and automated incident response',
    impact: 'Operational efficiency'
  });

  week4Targets.push({
    category: 'MONITORING',
    target: 'Deploy automated alerting system',
    measurable: false
  });

  analysisResults.recommendations = recommendations;
  analysisResults.week4Targets = week4Targets;

  console.log(`✅ Generated ${recommendations.length} recommendations`);
  console.log(`✅ Identified ${week4Targets.length} Week 4 targets`);
}

/**
 * Fetch current system status
 */
async function fetchCurrentStatus() {
  console.log('🔄 Fetching current system status...');

  try {
    const response = await axios.get(`${SERVER_URL}/api/monitoring/status`);
    analysisResults.currentStatus = response.data;
    console.log(`✅ Current system status: ${response.data.data.overall.status}`);
  } catch (error) {
    console.log(`⚠️  Could not fetch current status: ${error.message}`);
    analysisResults.currentStatus = { error: error.message };
  }
}

/**
 * Generate summary findings
 */
function generateSummary() {
  console.log('📋 Generating summary findings...');

  const findings = [];

  // Performance findings
  const perfPattern = analysisResults.patterns.performance;
  if (perfPattern.performanceTrends && perfPattern.performanceTrends.conversionTimes.length > 0) {
    const avgConversionTime = perfPattern.performanceTrends.conversionTimes
      .reduce((sum, item) => sum + item.value, 0) / perfPattern.performanceTrends.conversionTimes.length;

    if (avgConversionTime < 5000) {
      findings.push(`✅ CloudConvert performance exceeds target: ${(avgConversionTime/1000).toFixed(1)}s average conversion time`);
    } else {
      findings.push(`⚠️ CloudConvert performance needs optimization: ${(avgConversionTime/1000).toFixed(1)}s average conversion time`);
    }
  }

  // Reliability findings
  const errorPattern = analysisResults.patterns.errors;
  if (errorPattern.errorRate < 1) {
    findings.push(`✅ Excellent reliability: ${errorPattern.errorRate.toFixed(1)}% error rate`);
  } else if (errorPattern.errorRate < 5) {
    findings.push(`⚠️ Acceptable reliability: ${errorPattern.errorRate.toFixed(1)}% error rate, room for improvement`);
  } else {
    findings.push(`❌ Poor reliability: ${errorPattern.errorRate.toFixed(1)}% error rate requires immediate attention`);
  }

  // Resource findings
  const resourcePattern = analysisResults.patterns.resource;
  if (resourcePattern.cpuPatterns && resourcePattern.cpuPatterns.average < 50) {
    findings.push(`✅ Good resource utilization: ${resourcePattern.cpuPatterns.average.toFixed(1)}% average CPU usage`);
  } else if (resourcePattern.cpuPatterns && resourcePattern.cpuPatterns.average > 80) {
    findings.push(`⚠️ High resource utilization: ${resourcePattern.cpuPatterns.average.toFixed(1)}% average CPU usage`);
  }

  // Conversion findings
  const conversionPattern = analysisResults.patterns.conversion;
  if (conversionPattern.successRate >= 99) {
    findings.push(`✅ Excellent conversion success rate: ${conversionPattern.successRate.toFixed(1)}%`);
  } else if (conversionPattern.successRate >= 95) {
    findings.push(`✅ Good conversion success rate: ${conversionPattern.successRate.toFixed(1)}%`);
  } else {
    findings.push(`⚠️ Conversion success rate needs improvement: ${conversionPattern.successRate.toFixed(1)}%`);
  }

  // CloudConvert primary success finding
  if (conversionPattern.conversionTypes.pdfToPpt > 0) {
    findings.push(`✅ CloudConvert primary pipeline operational: ${conversionPattern.conversionTypes.pdfToPpt} PDF→PPT conversions processed`);
  }

  analysisResults.summary.keyFindings = findings;

  console.log(`✅ Generated ${findings.length} key findings`);
}

/**
 * Save analysis results
 */
function saveAnalysisResults() {
  console.log('💾 Saving analysis results...');

  try {
    fs.writeFileSync(analysisConfig.outputFile, JSON.stringify(analysisResults, null, 2));
    console.log(`✅ Analysis results saved to: ${analysisConfig.outputFile}`);
  } catch (error) {
    console.error(`❌ Error saving results: ${error.message}`);
  }
}

/**
 * Main analysis execution
 */
async function runWeek3Analysis() {
  console.log('🔍 Starting Week 3: Real-World Failure Pattern Analysis');
  console.log('🎯 Analyzing production data from Week 2 testing');

  try {
    // Load metrics data
    const metrics = loadMetricsData();

    if (metrics.length > 0) {
      // Analyze patterns
      analyzePerformancePatterns(metrics);
      analyzeErrorPatterns(metrics);
      analyzeResourcePatterns(metrics);
      analyzeConversionPatterns(metrics);
    } else {
      console.log('⚠️  No historical metrics available, analyzing current state only');
    }

    // Fetch current status
    await fetchCurrentStatus();

    // Generate recommendations and summary
    generateRecommendations();
    generateSummary();

    // Save results
    saveAnalysisResults();

    // Display summary
    console.log('\n================================================================================');
    console.log('                    WEEK 3: FAILURE PATTERN ANALYSIS COMPLETE');
    console.log('================================================================================');

    console.log('\n📊 KEY FINDINGS:');
    analysisResults.summary.keyFindings.forEach(finding => {
      console.log(`   ${finding}`);
    });

    console.log('\n💡 TOP RECOMMENDATIONS:');
    analysisResults.recommendations
      .filter(rec => rec.priority === 'HIGH' || rec.priority === 'CRITICAL')
      .slice(0, 5)
      .forEach(rec => {
        console.log(`   [${rec.priority}] ${rec.recommendation}`);
      });

    console.log('\n🎯 WEEK 4 TARGETS:');
    analysisResults.week4Targets.slice(0, 5).forEach(target => {
      console.log(`   ${target.target}`);
    });

    console.log('\n================================================================================');
    console.log(`Analysis completed at: ${new Date().toISOString()}`);
    console.log(`Report saved to: ${analysisConfig.outputFile}`);
    console.log('================================================================================');

    return analysisResults;

  } catch (error) {
    console.error('❌ Week 3 analysis failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = {
  runWeek3Analysis,
  analysisConfig,
  analysisResults
};

// Run if this script is executed directly
if (require.main === module) {
  runWeek3Analysis()
    .then(results => {
      console.log('\n🎉 Week 3 analysis completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Week 3 analysis failed:', error);
      process.exit(1);
    });
}