/**
 * Comprehensive PPT Conversion Stress Test
 * Tests our mid-execution reset fixes under load
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const API_BASE = 'http://localhost:3010';
const TEST_PDF = path.join(__dirname, 'Business_Report_Q4_2024.pdf');

class PPTConversionTester {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async runComprehensiveTest() {
    console.log('🧪 COMPREHENSIVE PPT CONVERSION STRESS TEST');
    console.log('===========================================\n');

    // Check if test PDF exists
    if (!fs.existsSync(TEST_PDF)) {
      console.log('❌ Test PDF not found:', TEST_PDF);
      return;
    }

    console.log('📄 Test file:', path.basename(TEST_PDF));
    console.log('📊 File size:', (fs.statSync(TEST_PDF).size / 1024 / 1024).toFixed(2), 'MB\n');

    // Test 1: Single conversion (baseline)
    await this.testSingleConversion();

    // Test 2: Concurrent conversions (mutex test)
    await this.testConcurrentConversions();

    // Test 3: Rapid-fire submissions (queue test)
    await this.testRapidSubmissions();

    // Test 4: Long-running conversion (timeout test)
    await this.testLongRunningConversion();

    // Report results
    this.generateReport();
  }

  async testSingleConversion() {
    console.log('🔬 TEST 1: Single Conversion (Baseline Performance)');
    console.log('---------------------------------------------------');

    try {
      const result = await this.submitConversion('baseline-test');

      if (result.success) {
        console.log(`✅ Single conversion: ${result.duration}ms`);
        console.log(`📊 Job ID: ${result.jobId}`);
        this.results.push({
          test: 'Single Conversion',
          success: true,
          duration: result.duration,
          jobId: result.jobId
        });
      } else {
        console.log(`❌ Single conversion failed: ${result.error}`);
        this.results.push({
          test: 'Single Conversion',
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.log(`❌ Single conversion error: ${error.message}`);
    }

    console.log('');
  }

  async testConcurrentConversions() {
    console.log('🚀 TEST 2: Concurrent Conversions (Mutex Test)');
    console.log('------------------------------------------------');

    const promises = [];
    const startTime = Date.now();

    // Submit 3 conversions simultaneously
    for (let i = 1; i <= 3; i++) {
      promises.push(this.submitConversion(`concurrent-test-${i}`));
    }

    try {
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log(`✅ Concurrent results: ${successful.length}/${results.length} successful`);
      console.log(`⏱️  Total time: ${totalTime}ms`);
      console.log(`📊 Average per job: ${Math.round(totalTime / results.length)}ms`);

      if (failed.length > 0) {
        console.log(`❌ Failed jobs: ${failed.map(f => f.error).join(', ')}`);
      }

      this.results.push({
        test: 'Concurrent Conversions',
        success: failed.length === 0,
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        totalTime: totalTime
      });
    } catch (error) {
      console.log(`❌ Concurrent test error: ${error.message}`);
    }

    console.log('');
  }

  async testRapidSubmissions() {
    console.log('⚡ TEST 3: Rapid-Fire Submissions (Queue Test)');
    console.log('-----------------------------------------------');

    const submissions = [];
    const startTime = Date.now();

    // Submit 5 jobs as fast as possible
    for (let i = 1; i <= 5; i++) {
      submissions.push(this.submitConversionAsync(`rapid-test-${i}`));
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms between submissions
    }

    try {
      const results = await Promise.all(submissions);
      const totalTime = Date.now() - startTime;

      const successful = results.filter(r => r.success);

      console.log(`✅ Rapid submissions: ${successful.length}/${results.length} successful`);
      console.log(`⚡ Submission rate: ${Math.round(results.length / (totalTime / 1000))} jobs/second`);

      this.results.push({
        test: 'Rapid Submissions',
        success: successful.length === results.length,
        submissionRate: Math.round(results.length / (totalTime / 1000))
      });
    } catch (error) {
      console.log(`❌ Rapid submission test error: ${error.message}`);
    }

    console.log('');
  }

  async testLongRunningConversion() {
    console.log('⏳ TEST 4: Long-Running Conversion (Timeout Test)');
    console.log('--------------------------------------------------');

    try {
      const result = await this.submitConversion('timeout-test', { timeout: 60000 });

      if (result.success) {
        console.log(`✅ Long conversion completed: ${result.duration}ms`);
        console.log(`🛡️  No timeout issues detected`);
        this.results.push({
          test: 'Long-Running Conversion',
          success: true,
          duration: result.duration
        });
      } else {
        console.log(`❌ Long conversion failed: ${result.error}`);
        this.results.push({
          test: 'Long-Running Conversion',
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.log(`❌ Long conversion error: ${error.message}`);
    }

    console.log('');
  }

  async submitConversion(testName, options = {}) {
    const startTime = Date.now();

    try {
      // Submit conversion
      const formData = new FormData();
      formData.append('files', fs.createReadStream(TEST_PDF));
      formData.append('mode', 'convert');
      formData.append('ocrEnabled', 'true');
      formData.append('preserveImages', 'true');
      formData.append('textOverlays', 'true');

      const submitResponse = await axios.post(`${API_BASE}/api/convert/pdf-to-ppt`, formData, {
        headers: formData.getHeaders(),
        timeout: options.timeout || 30000
      });

      if (submitResponse.status !== 202) {
        return { success: false, error: `Submit failed: ${submitResponse.status}` };
      }

      const jobId = submitResponse.data.jobId;
      console.log(`📤 [${testName}] Submitted: ${jobId}`);

      // Poll for completion
      const result = await this.pollForCompletion(jobId, testName, options.timeout || 30000);

      return {
        success: result.success,
        duration: Date.now() - startTime,
        jobId: jobId,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async submitConversionAsync(testName) {
    try {
      const formData = new FormData();
      formData.append('files', fs.createReadStream(TEST_PDF));
      formData.append('mode', 'convert');
      formData.append('ocrEnabled', 'true');

      const response = await axios.post(`${API_BASE}/api/convert/pdf-to-ppt`, formData, {
        headers: formData.getHeaders(),
        timeout: 10000
      });

      return {
        success: response.status === 202,
        jobId: response.data.jobId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async pollForCompletion(jobId, testName, timeout = 30000) {
    const startTime = Date.now();
    const maxAttempts = Math.floor(timeout / 1000);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await axios.get(`${API_BASE}/api/job/${jobId}/status`);
        const status = response.data.status;

        if (status === 'completed') {
          console.log(`✅ [${testName}] Completed in ${Date.now() - startTime}ms`);
          return { success: true };
        } else if (status === 'failed') {
          console.log(`❌ [${testName}] Failed: ${response.data.error}`);
          return { success: false, error: response.data.error };
        }

        // Still processing
        if (attempt % 5 === 0) {
          console.log(`⏳ [${testName}] Status: ${status} (${attempt}s)`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.log(`❌ [${testName}] Polling error: ${error.message}`);
        return { success: false, error: error.message };
      }
    }

    console.log(`⏰ [${testName}] Timeout after ${timeout}ms`);
    return { success: false, error: 'Timeout' };
  }

  generateReport() {
    console.log('📊 COMPREHENSIVE TEST RESULTS');
    console.log('==============================\n');

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log(`📈 Overall Results: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)`);
    console.log(`⏱️  Total test duration: ${Date.now() - this.startTime}ms\n`);

    this.results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.test}: ${status}`);

      if (result.duration) {
        console.log(`   Duration: ${result.duration}ms`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.total) {
        console.log(`   Results: ${result.successful}/${result.total} successful`);
      }
      console.log('');
    });

    console.log('🔍 KEY VALIDATION POINTS:');
    console.log('✓ ConversionMutex: Check server logs for mutex acquire/release messages');
    console.log('✓ ImageMagick Optimization: Check for 200 DPI and ~8s processing times');
    console.log('✓ Tesseract Timeout: Check for no indefinite hanging');
    console.log('✓ No Mid-Execution Resets: All conversions should complete or fail gracefully');

    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED - MID-EXECUTION RESET FIXES VALIDATED!');
    } else {
      console.log(`\n⚠️  ${failedTests} tests failed - review server logs for issues`);
    }
  }
}

// Run the comprehensive test
const tester = new PPTConversionTester();
tester.runComprehensiveTest().catch(console.error);