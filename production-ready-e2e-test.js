#!/usr/bin/env node

/**
 * PRODUCTION READY E2E TEST
 * Comprehensive validation of concurrent processing and production readiness
 */

const fs = require('fs');
const FormData = require('form-data');
const { performance } = require('perf_hooks');

// Simple HTTP request wrapper
function makeRequest(options, formData = null) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);

    if (formData) {
      formData.pipe(req);
    } else {
      req.end();
    }
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test results tracking
const testResults = {
  startTime: new Date().toISOString(),
  environment: {
    nodeVersion: process.version,
    platform: process.platform,
    apiURL: 'http://localhost:3001'
  },
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  },
  performance: {
    totalDuration: 0,
    averageApiResponse: 0,
    averageProcessingTime: 0
  },
  productionReadiness: {
    score: 0,
    status: 'NOT_READY',
    passRate: 0,
    criticalFailures: 0,
    blockers: [],
    recommendations: []
  }
};

function addTestResult(category, testName, success, error = '', duration = 0, details = {}) {
  if (!testResults.tests.find(cat => cat.category === category)) {
    testResults.tests.push({ category, tests: [] });
  }

  const categoryTests = testResults.tests.find(cat => cat.category === category);
  categoryTests.tests.push({
    name: testName,
    success,
    error,
    duration,
    details
  });

  testResults.summary.total++;
  if (success) {
    testResults.summary.passed++;
  } else {
    testResults.summary.failed++;
    if (category === 'Health & Availability' || category === 'API Endpoints') {
      testResults.productionReadiness.criticalFailures++;
      testResults.productionReadiness.blockers.push(`${category}: ${testName} - Failed`);
    }
  }
}

async function testHealthEndpoint() {
  console.log('🏥 Testing health endpoint...');
  try {
    const start = performance.now();
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    });
    const duration = performance.now() - start;

    if (response.status === 200) {
      addTestResult('Health & Availability', 'Health Endpoint', true, '', duration);
      console.log(`  ✅ Health endpoint responding (${Math.round(duration)}ms)`);
      return true;
    } else {
      addTestResult('Health & Availability', 'Health Endpoint', false, `Status: ${response.status}`, duration);
      console.log(`  ❌ Health endpoint failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    addTestResult('Health & Availability', 'Health Endpoint', false, error.message);
    console.log(`  ❌ Health endpoint error: ${error.message}`);
    return false;
  }
}

async function testConcurrentProcessing() {
  console.log('🚀 Testing concurrent processing (3 jobs)...');

  const testFile = './backend/test.pdf';
  if (!fs.existsSync(testFile)) {
    addTestResult('Performance Benchmarks', 'Concurrent Processing', false, 'Test file not found');
    console.log(`  ❌ Test file not found: ${testFile}`);
    return false;
  }

  try {
    const startTime = performance.now();
    const concurrentJobs = 3;
    const promises = [];

    // Submit 3 concurrent jobs
    for (let i = 0; i < concurrentJobs; i++) {
      const formData = new FormData();
      formData.append('files', fs.createReadStream(testFile));

      const promise = makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/convert/pdf-to-ppt',
        method: 'POST',
        headers: formData.getHeaders()
      }, formData);

      promises.push(promise);
    }

    const responses = await Promise.all(promises);
    const apiDuration = performance.now() - startTime;

    let successfulSubmissions = 0;
    const jobIds = [];

    responses.forEach((response, index) => {
      if (response.status === 202 && response.data && response.data.jobId) {
        successfulSubmissions++;
        jobIds.push(response.data.jobId);
      }
    });

    if (successfulSubmissions === 0) {
      addTestResult('Performance Benchmarks', 'Concurrent Processing', false, 'No jobs successfully submitted');
      console.log('  ❌ No jobs were successfully submitted');
      return false;
    }

    console.log(`  📤 ${successfulSubmissions}/${concurrentJobs} jobs submitted successfully`);

    // Monitor completion
    const completedJobs = [];
    const maxWaitTime = 30000; // 30 seconds
    const checkInterval = 2000; // 2 seconds
    let elapsed = 0;

    while (completedJobs.length < successfulSubmissions && elapsed < maxWaitTime) {
      await sleep(checkInterval);
      elapsed += checkInterval;

      for (const jobId of jobIds) {
        if (completedJobs.find(job => job.jobId === jobId)) {
          continue; // Already completed
        }

        try {
          const statusResponse = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: `/api/job/${jobId}/status`,
            method: 'GET'
          });

          if (statusResponse.data && statusResponse.data.job) {
            const job = statusResponse.data.job;

            if (job.status === 'completed') {
              completedJobs.push({
                jobId,
                processingTime: job.processingTime,
                outputFile: job.outputFile
              });
            } else if (job.status === 'failed') {
              completedJobs.push({
                jobId,
                status: 'failed',
                error: job.error
              });
            }
          }
        } catch (error) {
          // Ignore status check errors
        }
      }
    }

    const successfulJobs = completedJobs.filter(job => job.processingTime);
    const successRate = (successfulJobs.length / concurrentJobs) * 100;

    if (successfulJobs.length >= Math.ceil(concurrentJobs * 0.67)) { // 67% success threshold
      const avgProcessingTime = successfulJobs.reduce((sum, job) => sum + job.processingTime, 0) / successfulJobs.length;
      addTestResult('Performance Benchmarks', 'Concurrent Processing', true, '', apiDuration, {
        concurrentJobs,
        successfulJobs: successfulJobs.length,
        successRate,
        averageProcessingTime: avgProcessingTime
      });
      console.log(`  ✅ Concurrent processing: ${successfulJobs.length}/${concurrentJobs} jobs completed (${Math.round(successRate)}%)`);
      console.log(`  ⏱️ Average processing time: ${Math.round(avgProcessingTime)}ms`);
      return true;
    } else {
      addTestResult('Performance Benchmarks', 'Concurrent Processing', false, `Only ${successfulJobs.length}/${concurrentJobs} jobs completed`, apiDuration, {
        concurrentJobs,
        successfulJobs: successfulJobs.length,
        successRate
      });
      console.log(`  ❌ Concurrent processing failed: ${successfulJobs.length}/${concurrentJobs} jobs completed`);
      return false;
    }

  } catch (error) {
    addTestResult('Performance Benchmarks', 'Concurrent Processing', false, error.message);
    console.log(`  ❌ Concurrent processing error: ${error.message}`);
    return false;
  }
}

async function testRateLimiting() {
  console.log('🚦 Testing rate limiting...');

  try {
    const requests = 15;
    const promises = [];

    // Send rapid requests to trigger rate limiting
    for (let i = 0; i < requests; i++) {
      const promise = makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/pdf-to-ppt', // This endpoint should be rate limited
        method: 'POST'
      });
      promises.push(promise);
    }

    const responses = await Promise.all(promises);
    const rateLimitedCount = responses.filter(res => res.status === 429).length;

    if (rateLimitedCount > 0) {
      addTestResult('Error Handling', 'Rate Limiting', true, '', 0, {
        totalRequests: requests,
        rateLimitedRequests: rateLimitedCount,
        rateLimitingWorking: true
      });
      console.log(`  ✅ Rate limiting working: ${rateLimitedCount}/${requests} requests rate limited`);
      return true;
    } else {
      addTestResult('Error Handling', 'Rate Limiting', false, `No requests were rate limited (0/${requests})`, 0, {
        totalRequests: requests,
        rateLimitedRequests: 0,
        rateLimitingWorking: false
      });
      console.log(`  ⚠️ Rate limiting: 0/${requests} requests were rate limited (may need configuration)`);
      testResults.summary.warnings++;
      return false;
    }

  } catch (error) {
    addTestResult('Error Handling', 'Rate Limiting', false, error.message);
    console.log(`  ❌ Rate limiting test error: ${error.message}`);
    return false;
  }
}

async function testAvailability() {
  console.log('📊 Testing service availability...');

  try {
    let successfulChecks = 0;
    const totalChecks = 5;

    for (let i = 0; i < totalChecks; i++) {
      try {
        const response = await makeRequest({
          hostname: 'localhost',
          port: 3001,
          path: '/health',
          method: 'GET'
        });

        if (response.status === 200) {
          successfulChecks++;
        }

        await sleep(200); // Small delay between checks
      } catch (error) {
        // Check failed
      }
    }

    const availability = (successfulChecks / totalChecks) * 100;

    if (availability >= 80) {
      addTestResult('Production Readiness', 'Service Availability', true, '', 0, {
        healthChecks: totalChecks,
        successfulChecks,
        availability
      });
      console.log(`  ✅ Service availability: ${availability}% (${successfulChecks}/${totalChecks})`);
      return true;
    } else {
      addTestResult('Production Readiness', 'Service Availability', false, `Low availability: ${availability}%`, 0, {
        healthChecks: totalChecks,
        successfulChecks,
        availability
      });
      console.log(`  ❌ Service availability: ${availability}% (${successfulChecks}/${totalChecks})`);
      return false;
    }

  } catch (error) {
    addTestResult('Production Readiness', 'Service Availability', false, error.message);
    console.log(`  ❌ Availability test error: ${error.message}`);
    return false;
  }
}

function calculateProductionReadiness() {
  const totalTests = testResults.summary.total;
  const passedTests = testResults.summary.passed;
  const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  testResults.productionReadiness.passRate = passRate;
  testResults.productionReadiness.score = Math.max(0, Math.round(passRate - (testResults.productionReadiness.criticalFailures * 10)));

  if (testResults.productionReadiness.score >= 90 && testResults.productionReadiness.criticalFailures === 0) {
    testResults.productionReadiness.status = 'READY';
  } else if (testResults.productionReadiness.score >= 75 && testResults.productionReadiness.criticalFailures <= 1) {
    testResults.productionReadiness.status = 'NEARLY_READY';
  } else {
    testResults.productionReadiness.status = 'NOT_READY';
  }

  // Add recommendations
  if (testResults.productionReadiness.criticalFailures > 0) {
    testResults.productionReadiness.recommendations.push('Address critical failures before production deployment');
  }

  if (passRate < 80) {
    testResults.productionReadiness.recommendations.push('Improve test success rate to at least 80%');
  }

  if (testResults.summary.warnings > 0) {
    testResults.productionReadiness.recommendations.push('Review and address warning conditions');
  }
}

async function main() {
  console.log('🚀 BMAD PARTY MODE: COMPREHENSIVE E2E TESTING');
  console.log('==============================================\n');

  const overallStart = performance.now();

  // Run all tests
  await testHealthEndpoint();
  await testConcurrentProcessing();
  await testRateLimiting();
  await testAvailability();

  const overallDuration = performance.now() - overallStart;
  testResults.performance.totalDuration = overallDuration;
  testResults.endTime = new Date().toISOString();

  // Calculate production readiness
  calculateProductionReadiness();

  // Display results
  console.log('\n🎯 COMPREHENSIVE TEST RESULTS');
  console.log('===============================');
  console.log(`📊 Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`⚠️ Warnings: ${testResults.summary.warnings}`);
  console.log(`⏱️ Total Duration: ${Math.round(overallDuration)}ms`);
  console.log(`📈 Success Rate: ${Math.round(testResults.productionReadiness.passRate)}%`);

  console.log('\n🚀 PRODUCTION READINESS ASSESSMENT');
  console.log('===================================');
  console.log(`🎯 Production Score: ${testResults.productionReadiness.score}/100`);
  console.log(`📊 Status: ${testResults.productionReadiness.status}`);
  console.log(`🚨 Critical Failures: ${testResults.productionReadiness.criticalFailures}`);

  if (testResults.productionReadiness.blockers.length > 0) {
    console.log('\n🚫 BLOCKERS:');
    testResults.productionReadiness.blockers.forEach(blocker => {
      console.log(`   • ${blocker}`);
    });
  }

  if (testResults.productionReadiness.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    testResults.productionReadiness.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });
  }

  // Save detailed results
  fs.writeFileSync('./E2E-COMPREHENSIVE-TEST-REPORT.json', JSON.stringify(testResults, null, 2));
  console.log('\n📄 Detailed test report saved to: E2E-COMPREHENSIVE-TEST-REPORT.json');

  // Final verdict
  console.log('\n🏁 FINAL ASSESSMENT');
  console.log('===================');
  if (testResults.productionReadiness.status === 'READY') {
    console.log('🎉 BMAD PARTY MODE: COMPLETE SUCCESS!');
    console.log('🚀 System is PRODUCTION READY with excellent performance!');
    console.log('✅ Concurrent processing working perfectly!');
    console.log('📈 All critical systems operational!');
  } else if (testResults.productionReadiness.status === 'NEARLY_READY') {
    console.log('🟡 BMAD PARTY MODE: NEARLY READY!');
    console.log('🔧 Minor optimizations needed for full production readiness');
  } else {
    console.log('🔴 BMAD PARTY MODE: MORE WORK NEEDED');
    console.log('🛠️ Critical issues must be resolved before production deployment');
  }

  console.log('\n🎊 BMAD Party Mode Testing Complete! 🎊');
}

main().catch(console.error);