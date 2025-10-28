const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');
const path = require('path');
const os = require('os');

/**
 * 🔬 MULTI-PAGE STABILITY TEST SUITE
 * Comprehensive testing for 3+ page PDF conversion stability issues
 *
 * Objectives:
 * - Identify stability issues with multi-page documents
 * - Monitor memory usage and processing patterns
 * - Detect failure points and bottlenecks
 * - Generate detailed performance analysis
 */

class MultiPageStabilityTester {
  constructor() {
    this.API_BASE = 'http://localhost:3013';
    this.testResults = {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      timeouts: 0,
      memoryIssues: 0,
      processingTimes: [],
      failures: [],
      memorySnapshots: [],
      performanceMetrics: {},
      stabilityReport: {}
    };
    this.testStartTime = Date.now();
  }

  async runComprehensiveStabilityTests() {
    console.log('🔬 MULTI-PAGE PDF STABILITY TEST SUITE');
    console.log('=====================================');
    console.log(`⏰ Test Session Started: ${new Date().toISOString()}`);
    console.log(`🎯 Focus: 3+ page document stability issues`);
    console.log('');

    try {
      // Test 1: Municipal Statement (3 pages) - Baseline
      await this.testDocument('Municipal Statement.pdf', 3, 'baseline');

      // Test 2: Create synthetic multi-page documents for testing
      await this.generateTestDocuments();

      // Test 3: Stress test with multiple page counts
      await this.runPageCountStressTests();

      // Test 4: Concurrent conversion stress test
      await this.runConcurrentConversionTests();

      // Test 5: Memory leak detection
      await this.runMemoryLeakTests();

      // Test 6: Long-running stability test
      await this.runLongRunningStabilityTest();

      // Analysis and reporting
      await this.generateStabilityReport();

    } catch (error) {
      console.error('❌ STABILITY TEST SUITE FAILED:', error.message);
      this.testResults.failures.push({
        type: 'suite_failure',
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  async testDocument(filename, expectedPages, testType = 'standard') {
    console.log(`\n📄 TESTING: ${filename} (${expectedPages} pages, ${testType})`);
    console.log('─'.repeat(60));

    const testStart = Date.now();
    const memoryBefore = this.getMemoryUsage();

    try {
      // Find the test file
      const testPaths = [
        `C:\\Users\\Mac\\OneDrive\\Desktop\\Projects\\pmo framework\\${filename}`,
        path.join(__dirname, 'test-data', filename),
        path.join(__dirname, filename)
      ];

      let pdfPath = null;
      for (const testPath of testPaths) {
        if (fs.existsSync(testPath)) {
          pdfPath = testPath;
          break;
        }
      }

      if (!pdfPath) {
        throw new Error(`Test file not found: ${filename}`);
      }

      const fileSize = fs.statSync(pdfPath).size;
      console.log(`📁 File: ${filename} (${(fileSize / 1024).toFixed(1)} KB)`);
      console.log(`💾 Memory before: ${memoryBefore.used.toFixed(1)} MB`);

      // Upload and convert
      const result = await this.performConversion(pdfPath, filename);

      const testEnd = Date.now();
      const processingTime = testEnd - testStart;
      const memoryAfter = this.getMemoryUsage();
      const memoryDelta = memoryAfter.used - memoryBefore.used;

      // Record results
      this.testResults.totalTests++;
      this.testResults.processingTimes.push({
        filename,
        pages: expectedPages,
        time: processingTime,
        fileSize,
        memoryDelta,
        success: result.success
      });

      if (result.success) {
        this.testResults.successfulTests++;
        console.log(`✅ SUCCESS: ${filename} converted in ${(processingTime/1000).toFixed(2)}s`);
        console.log(`📊 Output: ${result.outputSize ? (result.outputSize/1024).toFixed(1) + ' KB' : 'N/A'}`);
      } else {
        this.testResults.failedTests++;
        this.testResults.failures.push({
          filename,
          pages: expectedPages,
          error: result.error,
          processingTime,
          timestamp: testStart
        });
        console.log(`❌ FAILED: ${filename} - ${result.error}`);
      }

      console.log(`💾 Memory after: ${memoryAfter.used.toFixed(1)} MB (Δ${memoryDelta > 0 ? '+' : ''}${memoryDelta.toFixed(1)} MB)`);
      console.log(`⏱️  Processing time: ${(processingTime/1000).toFixed(2)}s`);

      // Memory leak detection
      if (memoryDelta > 50) { // More than 50MB increase
        this.testResults.memoryIssues++;
        console.log(`⚠️  MEMORY CONCERN: High memory usage increase (+${memoryDelta.toFixed(1)} MB)`);
      }

      return result;

    } catch (error) {
      this.testResults.failedTests++;
      this.testResults.failures.push({
        filename,
        pages: expectedPages,
        error: error.message,
        processingTime: Date.now() - testStart,
        timestamp: testStart
      });
      console.log(`❌ ERROR: ${filename} - ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async performConversion(pdfPath, filename) {
    try {
      // Create form data
      const formData = new FormData();
      formData.append('files', fs.createReadStream(pdfPath));
      formData.append('ocrEnabled', 'true');
      formData.append('preserveImages', 'true');
      formData.append('textOverlays', 'true');
      formData.append('ocrAccuracy', 'high');

      // Upload
      const uploadResponse = await fetch(`${this.API_BASE}/api/convert/pdf-to-ppt`, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders(),
        timeout: 120000 // 2 minute timeout
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      const jobId = uploadResult.jobId;

      if (!jobId) {
        throw new Error('No job ID returned from upload');
      }

      // Monitor conversion with timeout
      const result = await this.monitorConversionWithTimeout(jobId, 300000); // 5 minute timeout

      return result;

    } catch (error) {
      if (error.code === 'TIMEOUT' || error.message.includes('timeout')) {
        this.testResults.timeouts++;
      }
      return { success: false, error: error.message };
    }
  }

  async monitorConversionWithTimeout(jobId, timeoutMs = 300000) {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = Math.floor(timeoutMs / 2000); // Check every 2 seconds

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await fetch(`${this.API_BASE}/api/job/${jobId}/status`);

        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json();
        const job = statusData.job || statusData;
        const status = job.status;
        const progress = job.progress || 0;

        if (status === 'completed') {
          // Try to get file info
          let outputSize = null;
          if (job.outputFile) {
            try {
              const downloadResponse = await fetch(`${this.API_BASE}/api/download/${encodeURIComponent(job.outputFile)}`, {
                method: 'HEAD'
              });
              if (downloadResponse.ok) {
                outputSize = parseInt(downloadResponse.headers.get('content-length')) || null;
              }
            } catch (e) {
              // Ignore download errors for now
            }
          }

          return {
            success: true,
            jobId,
            outputFile: job.outputFile,
            outputSize,
            processingTime: Date.now() - startTime,
            qualityMetrics: job.qualityMetrics || {}
          };

        } else if (status === 'failed') {
          throw new Error(`Conversion failed: ${job.errorMessage || 'Unknown error'}`);
        }

        // Show progress for longer conversions
        if (attempts % 10 === 0 && attempts > 0) {
          console.log(`   🔄 Progress: ${status} (${progress}%) - ${(attempts * 2)}s elapsed`);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;

      } catch (error) {
        if (attempts > 5) { // Allow a few retries for network issues
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
    }

    throw new Error('TIMEOUT: Conversion exceeded maximum time limit');
  }

  async generateTestDocuments() {
    console.log('\n🏭 GENERATING SYNTHETIC TEST DOCUMENTS');
    console.log('─'.repeat(60));

    // Check if we have any multi-page PDFs available
    const availablePDFs = await this.findAvailableTestPDFs();

    if (availablePDFs.length === 0) {
      console.log('⚠️  No additional test PDFs found, using Municipal Statement for repeated tests');
    } else {
      console.log(`📚 Found ${availablePDFs.length} additional test documents:`);
      availablePDFs.forEach(pdf => {
        console.log(`   • ${pdf.name} (${(pdf.size/1024).toFixed(1)} KB)`);
      });
    }
  }

  async findAvailableTestPDFs() {
    const testDirectories = [
      'C:\\Users\\Mac\\OneDrive\\Desktop\\Projects\\pmo framework',
      'C:\\Users\\Mac\\OneDrive\\Desktop\\Projects\\pdflab.pro\\test-data',
      'C:\\Users\\Mac\\OneDrive\\Desktop\\Projects\\pdflab.pro'
    ];

    const availablePDFs = [];

    for (const dir of testDirectories) {
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            if (file.toLowerCase().endsWith('.pdf')) {
              const fullPath = path.join(dir, file);
              const stats = fs.statSync(fullPath);
              availablePDFs.push({
                name: file,
                path: fullPath,
                size: stats.size
              });
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    return availablePDFs;
  }

  async runPageCountStressTests() {
    console.log('\n📊 PAGE COUNT STRESS TESTING');
    console.log('─'.repeat(60));

    const availablePDFs = await this.findAvailableTestPDFs();

    // Test with Municipal Statement multiple times to simulate different page counts
    console.log('🔄 Testing Municipal Statement.pdf multiple times for consistency...');

    for (let i = 1; i <= 5; i++) {
      console.log(`\n📋 Iteration ${i}/5:`);
      await this.testDocument('Municipal Statement.pdf', 3, `iteration_${i}`);

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test any other available PDFs
    for (const pdf of availablePDFs.slice(0, 3)) { // Limit to 3 additional PDFs
      if (pdf.name !== 'Municipal Statement.pdf') {
        await this.testDocument(pdf.name, -1, 'additional_pdf');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async runConcurrentConversionTests() {
    console.log('\n🔀 CONCURRENT CONVERSION STRESS TEST');
    console.log('─'.repeat(60));

    const municipalPath = 'C:\\Users\\Mac\\OneDrive\\Desktop\\Projects\\pmo framework\\Municipal Statement.pdf';

    if (!fs.existsSync(municipalPath)) {
      console.log('⚠️  Skipping concurrent tests - Municipal Statement.pdf not found');
      return;
    }

    console.log('🚀 Launching 3 concurrent conversions...');

    const concurrentTests = [];
    for (let i = 1; i <= 3; i++) {
      concurrentTests.push(
        this.performConversion(municipalPath, `Municipal-Concurrent-${i}.pdf`)
          .then(result => ({ testId: i, result }))
          .catch(error => ({ testId: i, result: { success: false, error: error.message } }))
      );
    }

    const results = await Promise.all(concurrentTests);

    console.log('\n📊 Concurrent Test Results:');
    results.forEach(({ testId, result }) => {
      const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
      const time = result.processingTime ? `${(result.processingTime/1000).toFixed(2)}s` : 'N/A';
      console.log(`   Test ${testId}: ${status} (${time})`);
      if (!result.success) {
        console.log(`      Error: ${result.error}`);
      }
    });

    // Check for concurrent processing issues
    const successCount = results.filter(r => r.result.success).length;
    if (successCount < 3) {
      console.log(`⚠️  CONCURRENT ISSUE: Only ${successCount}/3 tests succeeded`);
      this.testResults.failures.push({
        type: 'concurrent_failure',
        successCount,
        totalTests: 3,
        timestamp: Date.now()
      });
    }
  }

  async runMemoryLeakTests() {
    console.log('\n🧠 MEMORY LEAK DETECTION TEST');
    console.log('─'.repeat(60));

    const municipalPath = 'C:\\Users\\Mac\\OneDrive\\Desktop\\Projects\\pmo framework\\Municipal Statement.pdf';

    if (!fs.existsSync(municipalPath)) {
      console.log('⚠️  Skipping memory tests - Municipal Statement.pdf not found');
      return;
    }

    const memoryBaseline = this.getMemoryUsage();
    console.log(`📊 Memory baseline: ${memoryBaseline.used.toFixed(1)} MB`);

    console.log('🔄 Running 10 consecutive conversions to detect memory leaks...');

    for (let i = 1; i <= 10; i++) {
      const memoryBefore = this.getMemoryUsage();

      try {
        const result = await this.performConversion(municipalPath, `Memory-Test-${i}.pdf`);
        const memoryAfter = this.getMemoryUsage();
        const memoryDelta = memoryAfter.used - memoryBefore.used;

        this.testResults.memorySnapshots.push({
          iteration: i,
          memoryBefore: memoryBefore.used,
          memoryAfter: memoryAfter.used,
          memoryDelta,
          success: result.success
        });

        const status = result.success ? '✅' : '❌';
        console.log(`   ${i}/10: ${status} Memory: ${memoryAfter.used.toFixed(1)} MB (Δ${memoryDelta > 0 ? '+' : ''}${memoryDelta.toFixed(1)} MB)`);

        if (memoryDelta > 25) {
          console.log(`      ⚠️  HIGH MEMORY INCREASE: +${memoryDelta.toFixed(1)} MB`);
        }

      } catch (error) {
        console.log(`   ${i}/10: ❌ Error: ${error.message}`);
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Analyze memory trend
    const finalMemory = this.getMemoryUsage();
    const totalMemoryIncrease = finalMemory.used - memoryBaseline.used;

    console.log(`\n📈 Memory Analysis:`);
    console.log(`   Baseline: ${memoryBaseline.used.toFixed(1)} MB`);
    console.log(`   Final: ${finalMemory.used.toFixed(1)} MB`);
    console.log(`   Total increase: ${totalMemoryIncrease > 0 ? '+' : ''}${totalMemoryIncrease.toFixed(1)} MB`);

    if (totalMemoryIncrease > 100) {
      console.log(`   ⚠️  MEMORY LEAK DETECTED: Significant memory increase over 10 conversions`);
      this.testResults.memoryIssues++;
    }
  }

  async runLongRunningStabilityTest() {
    console.log('\n⏳ LONG-RUNNING STABILITY TEST');
    console.log('─'.repeat(60));

    const municipalPath = 'C:\\Users\\Mac\\OneDrive\\Desktop\\Projects\\pmo framework\\Municipal Statement.pdf';

    if (!fs.existsSync(municipalPath)) {
      console.log('⚠️  Skipping long-running test - Municipal Statement.pdf not found');
      return;
    }

    console.log('🕐 Running conversions over 5 minutes to test long-term stability...');

    const testDurationMs = 5 * 60 * 1000; // 5 minutes
    const testStart = Date.now();
    let conversionCount = 0;
    let successCount = 0;

    while (Date.now() - testStart < testDurationMs) {
      conversionCount++;

      try {
        const result = await this.performConversion(municipalPath, `Long-Running-${conversionCount}.pdf`);
        if (result.success) {
          successCount++;
        }

        const elapsed = ((Date.now() - testStart) / 1000).toFixed(0);
        const successRate = ((successCount / conversionCount) * 100).toFixed(1);
        console.log(`   ${elapsed}s: Conversion ${conversionCount} - Success rate: ${successRate}%`);

      } catch (error) {
        console.log(`   Conversion ${conversionCount} failed: ${error.message}`);
      }

      // Delay between conversions
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second intervals
    }

    const finalSuccessRate = ((successCount / conversionCount) * 100).toFixed(1);
    console.log(`\n📊 Long-running test completed:`);
    console.log(`   Total conversions: ${conversionCount}`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Success rate: ${finalSuccessRate}%`);

    if (parseFloat(finalSuccessRate) < 90) {
      console.log(`   ⚠️  STABILITY ISSUE: Success rate below 90%`);
      this.testResults.failures.push({
        type: 'long_running_instability',
        successRate: finalSuccessRate,
        totalConversions: conversionCount,
        timestamp: Date.now()
      });
    }
  }

  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      used: usage.heapUsed / 1024 / 1024, // MB
      total: usage.heapTotal / 1024 / 1024, // MB
      external: usage.external / 1024 / 1024, // MB
      rss: usage.rss / 1024 / 1024 // MB
    };
  }

  async generateStabilityReport() {
    console.log('\n📋 COMPREHENSIVE STABILITY ANALYSIS REPORT');
    console.log('==========================================');

    const totalDuration = Date.now() - this.testStartTime;
    const successRate = this.testResults.totalTests > 0 ?
      ((this.testResults.successfulTests / this.testResults.totalTests) * 100).toFixed(1) : '0';

    // Overall Statistics
    console.log(`\n📊 OVERALL STATISTICS:`);
    console.log(`   Total Tests: ${this.testResults.totalTests}`);
    console.log(`   Successful: ${this.testResults.successfulTests}`);
    console.log(`   Failed: ${this.testResults.failedTests}`);
    console.log(`   Timeouts: ${this.testResults.timeouts}`);
    console.log(`   Memory Issues: ${this.testResults.memoryIssues}`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log(`   Test Duration: ${(totalDuration / 1000 / 60).toFixed(1)} minutes`);

    // Performance Analysis
    if (this.testResults.processingTimes.length > 0) {
      const times = this.testResults.processingTimes.map(t => t.time);
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log(`\n⏱️  PERFORMANCE METRICS:`);
      console.log(`   Average Processing Time: ${(avgTime / 1000).toFixed(2)}s`);
      console.log(`   Fastest Conversion: ${(minTime / 1000).toFixed(2)}s`);
      console.log(`   Slowest Conversion: ${(maxTime / 1000).toFixed(2)}s`);
      console.log(`   Time Variance: ${((maxTime - minTime) / 1000).toFixed(2)}s`);
    }

    // Memory Analysis
    if (this.testResults.memorySnapshots.length > 0) {
      const memoryDeltas = this.testResults.memorySnapshots.map(s => s.memoryDelta);
      const avgMemoryDelta = memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length;
      const maxMemoryDelta = Math.max(...memoryDeltas);

      console.log(`\n🧠 MEMORY ANALYSIS:`);
      console.log(`   Average Memory Delta: ${avgMemoryDelta.toFixed(1)} MB`);
      console.log(`   Maximum Memory Delta: ${maxMemoryDelta.toFixed(1)} MB`);
      console.log(`   Memory Leak Indicators: ${this.testResults.memoryIssues}`);
    }

    // Failure Analysis
    if (this.testResults.failures.length > 0) {
      console.log(`\n❌ FAILURE ANALYSIS:`);
      const failureTypes = {};
      this.testResults.failures.forEach(failure => {
        const type = failure.type || 'conversion_failure';
        failureTypes[type] = (failureTypes[type] || 0) + 1;
      });

      Object.entries(failureTypes).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} occurrences`);
      });

      console.log('\n   Recent Failures:');
      this.testResults.failures.slice(-5).forEach((failure, index) => {
        console.log(`   ${index + 1}. ${failure.filename || failure.type}: ${failure.error}`);
      });
    }

    // Stability Assessment
    const stabilityScore = this.calculateStabilityScore();
    console.log(`\n🎯 STABILITY ASSESSMENT:`);
    console.log(`   Stability Score: ${stabilityScore}/100`);
    console.log(`   Assessment: ${this.getStabilityAssessment(stabilityScore)}`);

    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    this.generateRecommendations(stabilityScore);

    // Save detailed report
    this.saveDetailedReport(stabilityScore);
  }

  calculateStabilityScore() {
    let score = 100;

    // Deduct for failures
    const failureRate = this.testResults.totalTests > 0 ?
      (this.testResults.failedTests / this.testResults.totalTests) : 0;
    score -= failureRate * 50; // Up to 50 points for failures

    // Deduct for timeouts
    if (this.testResults.timeouts > 0) {
      score -= this.testResults.timeouts * 10; // 10 points per timeout
    }

    // Deduct for memory issues
    if (this.testResults.memoryIssues > 0) {
      score -= this.testResults.memoryIssues * 15; // 15 points per memory issue
    }

    // Performance penalty for slow conversions
    if (this.testResults.processingTimes.length > 0) {
      const avgTime = this.testResults.processingTimes.reduce((a, b) => a + b.time, 0) / this.testResults.processingTimes.length;
      if (avgTime > 10000) { // Over 10 seconds
        score -= 10;
      }
    }

    return Math.max(0, Math.round(score));
  }

  getStabilityAssessment(score) {
    if (score >= 90) return '🟢 EXCELLENT - Production ready';
    if (score >= 75) return '🟡 GOOD - Minor issues, mostly stable';
    if (score >= 60) return '🟠 FAIR - Some stability concerns';
    if (score >= 40) return '🔴 POOR - Significant stability issues';
    return '🚨 CRITICAL - Major stability problems';
  }

  generateRecommendations(score) {
    if (this.testResults.timeouts > 0) {
      console.log('   • Increase timeout limits for multi-page documents');
      console.log('   • Implement progressive timeout scaling based on page count');
    }

    if (this.testResults.memoryIssues > 0) {
      console.log('   • Investigate memory leaks in conversion pipeline');
      console.log('   • Implement more aggressive garbage collection');
      console.log('   • Add memory monitoring and cleanup');
    }

    if (this.testResults.failedTests > this.testResults.successfulTests * 0.1) {
      console.log('   • Review error handling in multi-page processing');
      console.log('   • Add retry mechanisms for failed conversions');
      console.log('   • Implement fallback strategies for complex documents');
    }

    if (score < 75) {
      console.log('   • Consider implementing document complexity analysis');
      console.log('   • Add processing queue management for large documents');
      console.log('   • Implement health monitoring and auto-recovery');
    }

    console.log('   • Regular stability testing should be implemented');
    console.log('   • Monitor production metrics for early issue detection');
  }

  saveDetailedReport(stabilityScore) {
    const reportPath = path.join(__dirname, 'test-results', `stability-report-${Date.now()}.json`);

    // Ensure directory exists
    const testDir = path.dirname(reportPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const detailedReport = {
      timestamp: new Date().toISOString(),
      testDuration: Date.now() - this.testStartTime,
      stabilityScore,
      assessment: this.getStabilityAssessment(stabilityScore),
      statistics: {
        totalTests: this.testResults.totalTests,
        successfulTests: this.testResults.successfulTests,
        failedTests: this.testResults.failedTests,
        timeouts: this.testResults.timeouts,
        memoryIssues: this.testResults.memoryIssues,
        successRate: this.testResults.totalTests > 0 ?
          ((this.testResults.successfulTests / this.testResults.totalTests) * 100) : 0
      },
      performance: this.testResults.processingTimes,
      memorySnapshots: this.testResults.memorySnapshots,
      failures: this.testResults.failures,
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        memory: os.totalmem(),
        cpus: os.cpus().length
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
  }
}

// Execute the stability test suite
async function runStabilityTests() {
  const tester = new MultiPageStabilityTester();
  await tester.runComprehensiveStabilityTests();
}

// Check if running directly
if (require.main === module) {
  runStabilityTests().catch(console.error);
}

module.exports = MultiPageStabilityTester;