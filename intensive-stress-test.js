const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');
const path = require('path');

/**
 * 🚨 INTENSIVE STRESS TEST FOR MULTI-PAGE INSTABILITY
 * Specifically designed to reproduce instability issues with 3+ page documents
 *
 * Test scenarios:
 * - High concurrency bursts
 * - Rapid sequential conversions
 * - Large document stress testing
 * - Memory pressure scenarios
 * - Timeout boundary testing
 */

class IntensiveStressTest {
  constructor() {
    this.API_BASE = 'http://localhost:3013';
    this.testResults = {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      timeoutTests: 0,
      networkErrors: 0,
      unexpectedErrors: 0,
      failures: [],
      stressPoints: []
    };
  }

  async runIntensiveStressTests() {
    console.log('🚨 INTENSIVE MULTI-PAGE STRESS TEST');
    console.log('===================================');
    console.log('🎯 Objective: Reproduce instability issues with 3+ page documents');
    console.log(`⏰ Test Started: ${new Date().toISOString()}`);
    console.log('');

    try {
      // Test 1: High Concurrency Burst (10 simultaneous)
      await this.testHighConcurrencyBurst();

      // Test 2: Rapid Sequential Testing (30 rapid conversions)
      await this.testRapidSequentialConversions();

      // Test 3: Sustained Load Testing (5 minutes continuous)
      await this.testSustainedLoad();

      // Test 4: Memory Pressure Testing
      await this.testMemoryPressure();

      // Test 5: Timeout Boundary Testing
      await this.testTimeoutBoundaries();

      // Test 6: Error Recovery Testing
      await this.testErrorRecovery();

      // Generate comprehensive analysis
      await this.generateIntensiveAnalysis();

    } catch (error) {
      console.error('🚨 INTENSIVE STRESS TEST CRASHED:', error.message);
      this.testResults.unexpectedErrors++;
    }
  }

  async testHighConcurrencyBurst() {
    console.log('\n🚨 TEST 1: HIGH CONCURRENCY BURST (10 simultaneous conversions)');
    console.log('─'.repeat(70));

    const municipalPath = 'C:\\Users\\Mac\\OneDrive\\Desktop\\Projects\\pmo framework\\Municipal Statement.pdf';

    if (!fs.existsSync(municipalPath)) {
      console.log('⚠️  Skipping test - Municipal Statement.pdf not found');
      return;
    }

    console.log('🚀 Launching 10 simultaneous conversions...');

    const startTime = Date.now();
    const concurrentPromises = [];

    for (let i = 1; i <= 10; i++) {
      const promise = this.performConversionWithMetrics(
        municipalPath,
        `Burst-${i}`,
        30000 // 30 second timeout
      );
      concurrentPromises.push(promise);
    }

    const results = await Promise.all(concurrentPromises);
    const endTime = Date.now();

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n📊 Burst Test Results (${((endTime - startTime) / 1000).toFixed(2)}s total):`);
    console.log(`   ✅ Successful: ${successful}/10`);
    console.log(`   ❌ Failed: ${failed}/10`);
    console.log(`   📈 Success Rate: ${(successful / 10 * 100).toFixed(1)}%`);

    // Log failed conversions
    results.forEach((result, index) => {
      if (!result.success) {
        console.log(`   Error ${index + 1}: ${result.error}`);
        this.testResults.failures.push({
          test: 'concurrency_burst',
          index: index + 1,
          error: result.error,
          timestamp: Date.now()
        });
      }
    });

    if (failed > 2) {
      this.testResults.stressPoints.push({
        test: 'concurrency_burst',
        issue: 'High failure rate under concurrent load',
        failureRate: (failed / 10 * 100).toFixed(1) + '%'
      });
    }

    this.updateTestCounts(successful, failed);
  }

  async testRapidSequentialConversions() {
    console.log('\n⚡ TEST 2: RAPID SEQUENTIAL CONVERSIONS (30 rapid conversions)');
    console.log('─'.repeat(70));

    const municipalPath = 'C:\\Users\\Mac\\OneDrive\\Desktop\\Projects\\pmo framework\\Municipal Statement.pdf';

    if (!fs.existsSync(municipalPath)) {
      console.log('⚠️  Skipping test - Municipal Statement.pdf not found');
      return;
    }

    console.log('⚡ Running 30 rapid sequential conversions with minimal delays...');

    let successful = 0;
    let failed = 0;
    const startTime = Date.now();

    for (let i = 1; i <= 30; i++) {
      try {
        const result = await this.performConversionWithMetrics(
          municipalPath,
          `Rapid-${i}`,
          15000 // 15 second timeout for speed
        );

        if (result.success) {
          successful++;
          process.stdout.write(`✅`);
        } else {
          failed++;
          process.stdout.write(`❌`);
          this.testResults.failures.push({
            test: 'rapid_sequential',
            index: i,
            error: result.error,
            timestamp: Date.now()
          });
        }

        // Very short delay between conversions
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        failed++;
        process.stdout.write(`💥`);
        this.testResults.failures.push({
          test: 'rapid_sequential',
          index: i,
          error: error.message,
          timestamp: Date.now()
        });
      }

      // Progress indicator every 10 tests
      if (i % 10 === 0) {
        console.log(` (${i}/30)`);
      }
    }

    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n📊 Rapid Sequential Results (${totalTime}s total):`);
    console.log(`   ✅ Successful: ${successful}/30`);
    console.log(`   ❌ Failed: ${failed}/30`);
    console.log(`   📈 Success Rate: ${(successful / 30 * 100).toFixed(1)}%`);
    console.log(`   ⚡ Average Rate: ${(30 / totalTime * 60).toFixed(1)} conversions/minute`);

    if (failed > 5) {
      this.testResults.stressPoints.push({
        test: 'rapid_sequential',
        issue: 'High failure rate under rapid sequential load',
        failureRate: (failed / 30 * 100).toFixed(1) + '%'
      });
    }

    this.updateTestCounts(successful, failed);
  }

  async testSustainedLoad() {
    console.log('\n🕐 TEST 3: SUSTAINED LOAD TESTING (5 minutes continuous)');
    console.log('─'.repeat(70));

    const municipalPath = 'C:\\Users\\Mac\\OneDrive\\Desktop\\Projects\\pmo framework\\Municipal Statement.pdf';

    if (!fs.existsSync(municipalPath)) {
      console.log('⚠️  Skipping test - Municipal Statement.pdf not found');
      return;
    }

    const testDurationMs = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();
    let conversionCount = 0;
    let successCount = 0;
    let failCount = 0;

    console.log('🕐 Running sustained load for 5 minutes...');

    while (Date.now() - startTime < testDurationMs) {
      conversionCount++;

      try {
        const result = await this.performConversionWithMetrics(
          municipalPath,
          `Sustained-${conversionCount}`,
          20000 // 20 second timeout
        );

        if (result.success) {
          successCount++;
        } else {
          failCount++;
          this.testResults.failures.push({
            test: 'sustained_load',
            index: conversionCount,
            error: result.error,
            timestamp: Date.now()
          });
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const successRate = ((successCount / conversionCount) * 100).toFixed(1);

        if (conversionCount % 5 === 0) {
          console.log(`   ${elapsed}s: Conversion ${conversionCount} - Success rate: ${successRate}%`);
        }

      } catch (error) {
        failCount++;
        this.testResults.failures.push({
          test: 'sustained_load',
          index: conversionCount,
          error: error.message,
          timestamp: Date.now()
        });
      }

      // Moderate delay for sustained testing
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second intervals
    }

    const finalSuccessRate = ((successCount / conversionCount) * 100).toFixed(1);
    console.log(`\n📊 Sustained Load Results:`);
    console.log(`   Total conversions: ${conversionCount}`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📈 Success rate: ${finalSuccessRate}%`);

    if (parseFloat(finalSuccessRate) < 85) {
      this.testResults.stressPoints.push({
        test: 'sustained_load',
        issue: 'Degraded performance over time',
        successRate: finalSuccessRate + '%'
      });
    }

    this.updateTestCounts(successCount, failCount);
  }

  async testMemoryPressure() {
    console.log('\n🧠 TEST 4: MEMORY PRESSURE TESTING');
    console.log('─'.repeat(70));

    const municipalPath = 'C:\\Users\\Mac\\OneDrive\\Desktop\\Projects\\pmo framework\\Municipal Statement.pdf';

    if (!fs.existsSync(municipalPath)) {
      console.log('⚠️  Skipping test - Municipal Statement.pdf not found');
      return;
    }

    console.log('🧠 Running conversions with memory monitoring...');

    const memoryBaseline = this.getMemoryUsage();
    let successCount = 0;
    let failCount = 0;
    let memoryLeak = false;

    for (let i = 1; i <= 15; i++) {
      const memoryBefore = this.getMemoryUsage();

      try {
        const result = await this.performConversionWithMetrics(
          municipalPath,
          `Memory-${i}`,
          25000
        );

        const memoryAfter = this.getMemoryUsage();
        const memoryDelta = memoryAfter - memoryBefore;

        if (result.success) {
          successCount++;
        } else {
          failCount++;
          this.testResults.failures.push({
            test: 'memory_pressure',
            index: i,
            error: result.error,
            memoryDelta,
            timestamp: Date.now()
          });
        }

        console.log(`   ${i}/15: ${result.success ? '✅' : '❌'} Memory: ${memoryAfter.toFixed(1)}MB (Δ${memoryDelta > 0 ? '+' : ''}${memoryDelta.toFixed(1)}MB)`);

        // Check for memory leak
        if (memoryAfter - memoryBaseline > 150) { // 150MB increase
          memoryLeak = true;
          console.log(`   ⚠️  MEMORY LEAK DETECTED: ${(memoryAfter - memoryBaseline).toFixed(1)}MB above baseline`);
        }

      } catch (error) {
        failCount++;
        console.log(`   ${i}/15: 💥 Error: ${error.message}`);
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n📊 Memory Pressure Results:`);
    console.log(`   ✅ Successful: ${successCount}/15`);
    console.log(`   ❌ Failed: ${failCount}/15`);
    console.log(`   🧠 Memory leak detected: ${memoryLeak ? 'YES' : 'NO'}`);

    if (memoryLeak) {
      this.testResults.stressPoints.push({
        test: 'memory_pressure',
        issue: 'Memory leak detected during extended processing',
        severity: 'high'
      });
    }

    this.updateTestCounts(successCount, failCount);
  }

  async testTimeoutBoundaries() {
    console.log('\n⏰ TEST 5: TIMEOUT BOUNDARY TESTING');
    console.log('─'.repeat(70));

    const municipalPath = 'C:\\Users\\Mac\\OneDrive\\Desktop\\Projects\\pmo framework\\Municipal Statement.pdf';

    if (!fs.existsSync(municipalPath)) {
      console.log('⚠️  Skipping test - Municipal Statement.pdf not found');
      return;
    }

    console.log('⏰ Testing with very short timeouts to trigger timeout conditions...');

    const timeoutTests = [
      { timeout: 2000, label: '2s' },
      { timeout: 5000, label: '5s' },
      { timeout: 8000, label: '8s' },
      { timeout: 12000, label: '12s' },
      { timeout: 20000, label: '20s' }
    ];

    let successCount = 0;
    let failCount = 0;
    let timeoutCount = 0;

    for (const test of timeoutTests) {
      try {
        console.log(`   Testing ${test.label} timeout...`);

        const result = await this.performConversionWithMetrics(
          municipalPath,
          `Timeout-${test.label}`,
          test.timeout
        );

        if (result.success) {
          successCount++;
          console.log(`   ✅ ${test.label}: SUCCESS`);
        } else if (result.error && result.error.includes('timeout')) {
          timeoutCount++;
          console.log(`   ⏰ ${test.label}: TIMEOUT (expected)`);
        } else {
          failCount++;
          console.log(`   ❌ ${test.label}: FAILED - ${result.error}`);
        }

      } catch (error) {
        if (error.message.includes('timeout')) {
          timeoutCount++;
          console.log(`   ⏰ ${test.label}: TIMEOUT (expected)`);
        } else {
          failCount++;
          console.log(`   ❌ ${test.label}: ERROR - ${error.message}`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n📊 Timeout Boundary Results:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏰ Timeouts: ${timeoutCount}`);
    console.log(`   ❌ Failed: ${failCount}`);

    this.updateTestCounts(successCount, failCount);
  }

  async testErrorRecovery() {
    console.log('\n🔄 TEST 6: ERROR RECOVERY TESTING');
    console.log('─'.repeat(70));

    const municipalPath = 'C:\\Users\\Mac\\OneDrive\\Desktop\\Projects\\pmo framework\\Municipal Statement.pdf';

    if (!fs.existsSync(municipalPath)) {
      console.log('⚠️  Skipping test - Municipal Statement.pdf not found');
      return;
    }

    console.log('🔄 Testing system recovery after errors...');

    // First, trigger a few failures with bad requests
    console.log('   Phase 1: Triggering errors...');

    for (let i = 1; i <= 3; i++) {
      try {
        // Send invalid request to trigger error
        const response = await fetch(`${this.API_BASE}/api/convert/pdf-to-ppt`, {
          method: 'POST',
          body: 'invalid data',
          headers: { 'Content-Type': 'application/json' }
        });
        console.log(`   Error trigger ${i}: ${response.status}`);
      } catch (error) {
        console.log(`   Error trigger ${i}: Network error (expected)`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Then test if system can recover with normal requests
    console.log('   Phase 2: Testing recovery...');

    let successCount = 0;
    let failCount = 0;

    for (let i = 1; i <= 5; i++) {
      try {
        const result = await this.performConversionWithMetrics(
          municipalPath,
          `Recovery-${i}`,
          15000
        );

        if (result.success) {
          successCount++;
          console.log(`   Recovery ${i}: ✅ SUCCESS`);
        } else {
          failCount++;
          console.log(`   Recovery ${i}: ❌ FAILED - ${result.error}`);
        }

      } catch (error) {
        failCount++;
        console.log(`   Recovery ${i}: 💥 ERROR - ${error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n📊 Error Recovery Results:`);
    console.log(`   ✅ Successful recoveries: ${successCount}/5`);
    console.log(`   ❌ Failed recoveries: ${failCount}/5`);
    console.log(`   📈 Recovery rate: ${(successCount / 5 * 100).toFixed(1)}%`);

    if (successCount < 4) {
      this.testResults.stressPoints.push({
        test: 'error_recovery',
        issue: 'Poor recovery after errors',
        recoveryRate: (successCount / 5 * 100).toFixed(1) + '%'
      });
    }

    this.updateTestCounts(successCount, failCount);
  }

  async performConversionWithMetrics(pdfPath, testName, timeoutMs = 30000) {
    try {
      const formData = new FormData();
      formData.append('files', fs.createReadStream(pdfPath));
      formData.append('ocrEnabled', 'true');
      formData.append('preserveImages', 'true');

      const uploadResponse = await fetch(`${this.API_BASE}/api/convert/pdf-to-ppt`, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders(),
        timeout: timeoutMs
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      const jobId = uploadResult.jobId;

      if (!jobId) {
        throw new Error('No job ID returned');
      }

      // Monitor with timeout
      const result = await this.monitorWithTimeout(jobId, timeoutMs);
      return result;

    } catch (error) {
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
        this.testResults.networkErrors++;
        return { success: false, error: `Network error: ${error.code}` };
      }

      if (error.message.includes('timeout')) {
        this.testResults.timeoutTests++;
        return { success: false, error: 'Conversion timeout' };
      }

      return { success: false, error: error.message };
    }
  }

  async monitorWithTimeout(jobId, timeoutMs) {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = Math.floor(timeoutMs / 1000); // Check every second

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${this.API_BASE}/api/job/${jobId}/status`);

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const data = await response.json();
        const job = data.job || data;

        if (job.status === 'completed') {
          return {
            success: true,
            processingTime: Date.now() - startTime,
            outputFile: job.outputFile
          };
        } else if (job.status === 'failed') {
          throw new Error(`Conversion failed: ${job.errorMessage || 'Unknown error'}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

      } catch (error) {
        if (attempts > 3) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    throw new Error('TIMEOUT: Exceeded maximum wait time');
  }

  updateTestCounts(successful, failed) {
    this.testResults.totalTests += successful + failed;
    this.testResults.successfulTests += successful;
    this.testResults.failedTests += failed;
  }

  getMemoryUsage() {
    const usage = process.memoryUsage();
    return usage.heapUsed / 1024 / 1024; // MB
  }

  async generateIntensiveAnalysis() {
    console.log('\n🚨 INTENSIVE STRESS TEST ANALYSIS');
    console.log('=================================');

    const successRate = this.testResults.totalTests > 0 ?
      ((this.testResults.successfulTests / this.testResults.totalTests) * 100).toFixed(1) : '0';

    console.log(`\n📊 OVERALL STRESS TEST RESULTS:`);
    console.log(`   Total Tests: ${this.testResults.totalTests}`);
    console.log(`   ✅ Successful: ${this.testResults.successfulTests}`);
    console.log(`   ❌ Failed: ${this.testResults.failedTests}`);
    console.log(`   ⏰ Timeouts: ${this.testResults.timeoutTests || 0}`);
    console.log(`   🌐 Network Errors: ${this.testResults.networkErrors}`);
    console.log(`   📈 Success Rate: ${successRate}%`);

    console.log(`\n🎯 STABILITY ASSESSMENT:`);
    if (parseFloat(successRate) >= 95) {
      console.log(`   🟢 EXCELLENT: System is highly stable under stress`);
    } else if (parseFloat(successRate) >= 90) {
      console.log(`   🟡 GOOD: Minor instability detected under stress`);
    } else if (parseFloat(successRate) >= 80) {
      console.log(`   🟠 FAIR: Noticeable instability under stress conditions`);
    } else {
      console.log(`   🔴 POOR: Significant instability issues detected`);
    }

    if (this.testResults.stressPoints.length > 0) {
      console.log(`\n⚠️  STRESS POINTS IDENTIFIED:`);
      this.testResults.stressPoints.forEach((point, index) => {
        console.log(`   ${index + 1}. ${point.test}: ${point.issue}`);
        if (point.failureRate) console.log(`      Failure rate: ${point.failureRate}`);
        if (point.successRate) console.log(`      Success rate: ${point.successRate}`);
        if (point.severity) console.log(`      Severity: ${point.severity}`);
      });
    } else {
      console.log(`\n✅ NO STRESS POINTS: System handled all stress tests well`);
    }

    if (this.testResults.failures.length > 0) {
      console.log(`\n❌ FAILURE ANALYSIS (Last 10):`);
      this.testResults.failures.slice(-10).forEach((failure, index) => {
        console.log(`   ${index + 1}. [${failure.test}] ${failure.error}`);
      });
    }

    // Save detailed stress report
    const reportPath = path.join(__dirname, 'test-results', `stress-report-${Date.now()}.json`);
    const testDir = path.dirname(reportPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
    console.log(`\n📄 Detailed stress report saved: ${reportPath}`);

    console.log(`\n🏁 INTENSIVE STRESS TEST COMPLETE`);
  }
}

// Execute intensive stress test
async function runIntensiveStressTest() {
  const tester = new IntensiveStressTest();
  await tester.runIntensiveStressTests();
}

if (require.main === module) {
  runIntensiveStressTest().catch(console.error);
}

module.exports = IntensiveStressTest;