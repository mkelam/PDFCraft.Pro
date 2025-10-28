/**
 * BMAD PDF-to-PPT OCR E2E TEST SUITE
 * Comprehensive testing of the OCR-enhanced PDF-to-PowerPoint conversion pipeline
 */

const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Configuration
const API_BASE_URL = 'http://localhost:3008';
const FRONTEND_BASE_URL = 'http://localhost:3009';
const TEST_OUTPUT_DIR = path.join(__dirname, 'test-results');

class OCRConversionTester {
  constructor() {
    this.testResults = {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  /**
   * Add test result to summary
   */
  addTestResult(testName, status, details, performance = {}) {
    const result = {
      testName,
      status, // 'PASS', 'FAIL', 'WARN'
      details,
      performance,
      timestamp: new Date().toISOString()
    };

    this.testResults.tests.push(result);
    this.testResults.totalTests++;

    if (status === 'PASS') this.testResults.passed++;
    else if (status === 'FAIL') this.testResults.failed++;
    else if (status === 'WARN') this.testResults.warnings++;

    console.log(`${this.getStatusEmoji(status)} [${testName}] ${details}`);
  }

  getStatusEmoji(status) {
    switch (status) {
      case 'PASS': return '✅';
      case 'FAIL': return '❌';
      case 'WARN': return '⚠️';
      default: return '🔍';
    }
  }

  /**
   * Create a simple test PDF with text content
   */
  async createTestPDF(filename, content) {
    // For this test, we'll use an existing PDF or create a simple one
    // In practice, you'd use pdf-lib or similar to create PDFs programmatically
    const testPDFPath = path.join(__dirname, 'backend', 'simple-test.pdf');

    try {
      await fs.access(testPDFPath);
      return testPDFPath;
    } catch (error) {
      this.addTestResult(
        'Create Test PDF',
        'WARN',
        `Test PDF not found at ${testPDFPath}, will use alternative test data`
      );
      return null;
    }
  }

  /**
   * Test backend health and OCR service availability
   */
  async testBackendHealth() {
    const startTime = Date.now();

    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const healthData = await response.json();
      const responseTime = Date.now() - startTime;

      // Check if OCR services are available
      const hasOCRServices = healthData.services && (
        healthData.services.tesseract === 'available' ||
        healthData.services.ocr === 'available'
      );

      this.addTestResult(
        'Backend Health Check',
        healthData.success ? 'PASS' : 'FAIL',
        `Backend status: ${healthData.status}, OCR services: ${hasOCRServices ? 'Available' : 'Not detected'}`,
        { responseTime }
      );

      return healthData;

    } catch (error) {
      this.addTestResult(
        'Backend Health Check',
        'FAIL',
        `Backend health check failed: ${error.message}`
      );
      return null;
    }
  }

  /**
   * Test frontend accessibility
   */
  async testFrontendAccessibility() {
    const startTime = Date.now();

    try {
      const response = await fetch(`${FRONTEND_BASE_URL}`, {
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const responseTime = Date.now() - startTime;

      // Check for OCR-related UI elements in HTML
      const hasOCRUI = html.includes('OCR') || html.includes('ocr') || html.includes('text overlay');

      this.addTestResult(
        'Frontend Accessibility',
        'PASS',
        `Frontend accessible, OCR UI elements: ${hasOCRUI ? 'Found' : 'Not detected'}`,
        { responseTime }
      );

      return true;

    } catch (error) {
      this.addTestResult(
        'Frontend Accessibility',
        'FAIL',
        `Frontend accessibility failed: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Test OCR-enhanced PDF conversion API
   */
  async testOCRConversionAPI() {
    const startTime = Date.now();

    try {
      // Find or create test PDF
      const testPDFPath = await this.createTestPDF('test-doc.pdf', 'Sample content for OCR testing');

      if (!testPDFPath) {
        this.addTestResult(
          'OCR Conversion API Test',
          'FAIL',
          'No test PDF available for conversion testing'
        );
        return null;
      }

      // Create form data with OCR options
      const formData = new FormData();
      const pdfBuffer = await fs.readFile(testPDFPath);
      formData.append('files', pdfBuffer, { filename: 'test-ocr.pdf', contentType: 'application/pdf' });

      // OCR-specific options
      formData.append('ocrEnabled', 'true');
      formData.append('preserveImages', 'true');
      formData.append('textOverlays', 'true');
      formData.append('ocrAccuracy', 'high');

      console.log('🚀 Submitting OCR-enhanced PDF conversion request...');

      const response = await fetch(`${API_BASE_URL}/api/convert/pdf-to-ppt`, {
        method: 'POST',
        body: formData,
        timeout: 30000
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();

      if (!result.success || !result.jobId) {
        throw new Error(`Invalid response: ${result.message || 'No job ID returned'}`);
      }

      this.addTestResult(
        'OCR Conversion API Submission',
        'PASS',
        `Job created successfully: ${result.jobId}`,
        { responseTime, estimatedTime: result.estimatedTime }
      );

      // Now test job status polling
      return await this.testJobStatusPolling(result.jobId);

    } catch (error) {
      this.addTestResult(
        'OCR Conversion API Test',
        'FAIL',
        `API test failed: ${error.message}`,
        { responseTime: Date.now() - startTime }
      );
      return null;
    }
  }

  /**
   * Test job status polling and completion
   */
  async testJobStatusPolling(jobId) {
    const maxPolls = 30; // 5 minutes max
    const pollInterval = 10000; // 10 seconds
    let polls = 0;
    const startTime = Date.now();

    console.log(`📊 Polling job status for: ${jobId}`);

    while (polls < maxPolls) {
      try {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        polls++;

        const response = await fetch(`${API_BASE_URL}/api/job/${jobId}/status`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const statusData = await response.json();

        if (!statusData.success) {
          throw new Error(statusData.message || 'Status check failed');
        }

        const job = statusData.job;
        const elapsedTime = Date.now() - startTime;

        console.log(`   🔄 Poll ${polls}: ${job.status} (${job.progress}%) - ${job.stage || 'Processing...'}`);

        // Test processing stage messages for OCR-specific content
        if (job.stage) {
          const isOCRStage = job.stage.toLowerCase().includes('ocr') ||
                           job.stage.toLowerCase().includes('text') ||
                           job.stage.toLowerCase().includes('overlay');

          if (isOCRStage) {
            this.addTestResult(
              'OCR Processing Stages',
              'PASS',
              `OCR-specific stage detected: "${job.stage}"`,
              { poll: polls, progress: job.progress }
            );
          }
        }

        if (job.status === 'completed') {
          this.addTestResult(
            'Job Status Polling - Completion',
            'PASS',
            `Job completed successfully in ${Math.round(elapsedTime / 1000)}s after ${polls} polls`,
            {
              totalTime: elapsedTime,
              polls,
              processingTime: job.processingTime,
              outputFile: job.outputFile
            }
          );

          // Test download functionality
          if (job.downloadUrl) {
            return await this.testFileDownload(job.downloadUrl, job.outputFile);
          } else {
            this.addTestResult(
              'Download URL Generation',
              'FAIL',
              'No download URL provided in completed job'
            );
            return null;
          }
        }

        if (job.status === 'failed') {
          throw new Error(`Job failed: ${job.errorMessage || 'Unknown error'}`);
        }

      } catch (error) {
        this.addTestResult(
          'Job Status Polling',
          'FAIL',
          `Polling failed: ${error.message}`,
          { polls, elapsedTime: Date.now() - startTime }
        );
        return null;
      }
    }

    this.addTestResult(
      'Job Status Polling - Timeout',
      'FAIL',
      `Job did not complete within ${maxPolls} polls (${Math.round((Date.now() - startTime) / 1000)}s)`,
      { polls: maxPolls, elapsedTime: Date.now() - startTime }
    );
    return null;
  }

  /**
   * Test file download functionality
   */
  async testFileDownload(downloadUrl, filename) {
    const startTime = Date.now();

    try {
      console.log(`📥 Testing file download: ${filename}`);

      const response = await fetch(downloadUrl, { timeout: 30000 });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.buffer();
      const downloadTime = Date.now() - startTime;

      if (buffer.length === 0) {
        throw new Error('Downloaded file is empty');
      }

      // Save file for manual inspection
      await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
      const outputPath = path.join(TEST_OUTPUT_DIR, filename);
      await fs.writeFile(outputPath, buffer);

      // Basic PowerPoint validation
      const isPPTX = filename.toLowerCase().endsWith('.pptx');
      const hasValidSize = buffer.length > 1000; // At least 1KB
      const hasZipHeader = buffer.subarray(0, 2).toString('hex') === '504b'; // ZIP magic bytes

      if (isPPTX && hasValidSize && hasZipHeader) {
        this.addTestResult(
          'File Download & Validation',
          'PASS',
          `PowerPoint file downloaded successfully: ${formatBytes(buffer.length)}`,
          { downloadTime, fileSize: buffer.length, outputPath }
        );
      } else {
        this.addTestResult(
          'File Download & Validation',
          'WARN',
          `File downloaded but validation concerns: PPTX=${isPPTX}, Size=${hasValidSize}, ZIP=${hasZipHeader}`,
          { downloadTime, fileSize: buffer.length, outputPath }
        );
      }

      return outputPath;

    } catch (error) {
      this.addTestResult(
        'File Download & Validation',
        'FAIL',
        `Download failed: ${error.message}`,
        { downloadTime: Date.now() - startTime }
      );
      return null;
    }
  }

  /**
   * Test error handling scenarios
   */
  async testErrorHandling() {
    console.log('🧪 Testing error handling scenarios...');

    // Test 1: Invalid file type
    try {
      const formData = new FormData();
      formData.append('files', Buffer.from('fake content'), {
        filename: 'test.txt',
        contentType: 'text/plain'
      });

      const response = await fetch(`${API_BASE_URL}/api/convert/pdf-to-ppt`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        this.addTestResult(
          'Error Handling - Invalid File Type',
          'FAIL',
          'API should have rejected non-PDF file but accepted it'
        );
      } else {
        this.addTestResult(
          'Error Handling - Invalid File Type',
          'PASS',
          `API correctly rejected non-PDF file: ${result.message}`
        );
      }
    } catch (error) {
      this.addTestResult(
        'Error Handling - Invalid File Type',
        'WARN',
        `Error handling test failed: ${error.message}`
      );
    }

    // Test 2: Missing file
    try {
      const formData = new FormData();
      // No files attached

      const response = await fetch(`${API_BASE_URL}/api/convert/pdf-to-ppt`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        this.addTestResult(
          'Error Handling - Missing File',
          'FAIL',
          'API should have rejected empty request but accepted it'
        );
      } else {
        this.addTestResult(
          'Error Handling - Missing File',
          'PASS',
          `API correctly rejected empty request: ${result.message}`
        );
      }
    } catch (error) {
      this.addTestResult(
        'Error Handling - Missing File',
        'WARN',
        `Error handling test failed: ${error.message}`
      );
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🎯 BMAD OCR-Enhanced PDF-to-PowerPoint E2E Testing Started');
    console.log('=' .repeat(60));

    // Test 1: Backend Health
    await this.testBackendHealth();

    // Test 2: Frontend Accessibility
    await this.testFrontendAccessibility();

    // Test 3: OCR Conversion Pipeline
    await this.testOCRConversionAPI();

    // Test 4: Error Handling
    await this.testErrorHandling();

    // Generate summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY REPORT');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${this.testResults.totalTests}`);
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`⚠️  Warnings: ${this.testResults.warnings}`);
    console.log(`Success Rate: ${(this.testResults.passed / this.testResults.totalTests * 100).toFixed(1)}%`);

    // Save detailed report
    const reportPath = path.join(TEST_OUTPUT_DIR, `ocr-e2e-test-report-${Date.now()}.json`);
    await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(this.testResults, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportPath}`);

    // Return overall status
    const overallStatus = this.testResults.failed === 0 ? 'PASS' : 'FAIL';
    console.log(`\n🏆 OVERALL STATUS: ${overallStatus}`);

    return {
      status: overallStatus,
      summary: this.testResults,
      reportPath
    };
  }
}

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run tests if called directly
if (require.main === module) {
  const tester = new OCRConversionTester();
  tester.runAllTests()
    .then(result => {
      process.exit(result.status === 'PASS' ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = { OCRConversionTester };