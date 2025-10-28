/**
 * Simple OCR-Enhanced PDF Conversion Validation Test
 * Tests the core functionality without complex dependencies
 */

const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const querystring = require('querystring');
const { URL } = require('url');

class SimpleOCRTester {
  constructor() {
    this.API_BASE_URL = 'http://localhost:3008';
    this.results = [];
  }

  log(emoji, message, data = {}) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${timestamp} ${emoji} ${message}`);
    if (Object.keys(data).length > 0) {
      console.log('   📊', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Make a simple HTTP request
   */
  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestLib = urlObj.protocol === 'https:' ? https : http;

      const req = requestLib.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data, headers: res.headers }));
      });

      req.on('error', reject);
      req.setTimeout(10000, () => reject(new Error('Request timeout')));

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  /**
   * Test backend health and OCR availability
   */
  async testBackendHealth() {
    this.log('🏥', 'Testing backend health...');

    try {
      const response = await this.makeRequest(`${this.API_BASE_URL}/health`);

      if (response.statusCode === 200) {
        const healthData = JSON.parse(response.data);
        this.log('✅', 'Backend health check PASSED', {
          status: healthData.status,
          services: healthData.services
        });

        // Check for OCR-related services
        if (healthData.services) {
          const ocrServices = Object.keys(healthData.services).filter(key =>
            key.toLowerCase().includes('ocr') ||
            key.toLowerCase().includes('tesseract') ||
            key.toLowerCase().includes('vision')
          );

          if (ocrServices.length > 0) {
            this.log('🔍', 'OCR services detected', { ocrServices });
          } else {
            this.log('⚠️', 'No OCR services detected in health status');
          }
        }

        return true;
      } else {
        this.log('❌', `Backend health check FAILED: HTTP ${response.statusCode}`);
        return false;
      }
    } catch (error) {
      this.log('❌', `Backend health check FAILED: ${error.message}`);
      return false;
    }
  }

  /**
   * Test job status endpoint format
   */
  async testJobStatusEndpoint() {
    this.log('📊', 'Testing job status endpoint format...');

    try {
      // Test with a fake job ID to see error handling
      const response = await this.makeRequest(`${this.API_BASE_URL}/api/job/test-fake-job-id/status`);

      if (response.statusCode === 404) {
        const data = JSON.parse(response.data);
        if (data.success === false && data.message) {
          this.log('✅', 'Job status endpoint format PASSED', {
            message: data.message,
            hasErrorHandling: true
          });
          return true;
        }
      }

      this.log('⚠️', `Unexpected job status response: ${response.statusCode}`, {
        data: response.data.substring(0, 200)
      });
      return false;

    } catch (error) {
      this.log('❌', `Job status endpoint test FAILED: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate OCR service integration by checking code
   */
  async validateOCRCodeIntegration() {
    this.log('🔍', 'Validating OCR code integration...');

    const criticalFiles = [
      'backend/src/controllers/convert.controller.ts',
      'backend/src/services/pdf.service.ts',
      'backend/src/workers/conversion.worker.ts',
      'lib/api.ts',
      'components/PDFUpload.tsx'
    ];

    let validationResults = {
      ocrOptionsExtraction: false,
      ocrRouting: false,
      ocrProcessing: false,
      frontendIntegration: false,
      workerIntegration: false
    };

    try {
      // Check controller for OCR options extraction
      const controllerPath = path.join(__dirname, criticalFiles[0]);
      const controllerContent = await fs.readFile(controllerPath, 'utf8');

      if (controllerContent.includes('ocrEnabled') &&
          controllerContent.includes('ocrOptions') &&
          controllerContent.includes('ocrAccuracy')) {
        validationResults.ocrOptionsExtraction = true;
        this.log('✅', 'Controller OCR options extraction: FOUND');
      } else {
        this.log('❌', 'Controller OCR options extraction: MISSING');
      }

      // Check PDF service for OCR routing
      const servicePath = path.join(__dirname, criticalFiles[1]);
      const serviceContent = await fs.readFile(servicePath, 'utf8');

      if (serviceContent.includes('convertPDFToPPTWithOCR') &&
          serviceContent.includes('ocrOptions?.ocrEnabled')) {
        validationResults.ocrRouting = true;
        this.log('✅', 'PDF Service OCR routing: FOUND');
      } else {
        this.log('❌', 'PDF Service OCR routing: MISSING');
      }

      // Check worker integration
      const workerPath = path.join(__dirname, criticalFiles[2]);
      const workerContent = await fs.readFile(workerPath, 'utf8');

      if (workerContent.includes('ocrOptions') &&
          workerContent.includes('originalFilename, ocrOptions')) {
        validationResults.workerIntegration = true;
        this.log('✅', 'Worker OCR integration: FOUND');
      } else {
        this.log('❌', 'Worker OCR integration: MISSING');
      }

      // Check frontend API integration
      const apiPath = path.join(__dirname, criticalFiles[3]);
      const apiContent = await fs.readFile(apiPath, 'utf8');

      if (apiContent.includes("formData.append('ocrEnabled'") &&
          apiContent.includes("formData.append('ocrAccuracy'")) {
        validationResults.frontendIntegration = true;
        this.log('✅', 'Frontend API OCR integration: FOUND');
      } else {
        this.log('❌', 'Frontend API OCR integration: MISSING');
      }

      // Overall validation score
      const totalChecks = Object.keys(validationResults).length;
      const passedChecks = Object.values(validationResults).filter(Boolean).length;
      const integrationScore = (passedChecks / totalChecks * 100).toFixed(1);

      this.log('📊', `OCR Integration Score: ${integrationScore}% (${passedChecks}/${totalChecks})`, validationResults);

      return integrationScore >= 80;

    } catch (error) {
      this.log('❌', `OCR code validation FAILED: ${error.message}`);
      return false;
    }
  }

  /**
   * Test rate limiting and error handling
   */
  async testErrorHandling() {
    this.log('🛡️', 'Testing error handling capabilities...');

    try {
      // Test empty request
      const response = await this.makeRequest(`${this.API_BASE_URL}/api/convert/pdf-to-ppt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (response.statusCode === 400) {
        const data = JSON.parse(response.data);
        if (data.success === false && data.message) {
          this.log('✅', 'Error handling test PASSED', {
            message: data.message,
            errorCode: data.code
          });
          return true;
        }
      }

      this.log('⚠️', `Unexpected error handling response: ${response.statusCode}`);
      return false;

    } catch (error) {
      this.log('❌', `Error handling test FAILED: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if existing test files can validate OCR processing
   */
  async checkExistingTestFiles() {
    this.log('📁', 'Checking for existing test files...');

    const testFiles = [
      'backend/simple-test.pdf',
      'backend/Business_Report_Q4_2024.pdf',
      'test-results',
      'backend/test-data'
    ];

    let foundFiles = 0;

    for (const testFile of testFiles) {
      try {
        const fullPath = path.join(__dirname, testFile);
        await fs.access(fullPath);

        const stats = await fs.stat(fullPath);
        this.log('📄', `Found test asset: ${testFile}`, {
          size: stats.isFile() ? `${Math.round(stats.size / 1024)}KB` : 'directory',
          modified: stats.mtime.toISOString().split('T')[0]
        });
        foundFiles++;
      } catch (error) {
        // File doesn't exist, skip
      }
    }

    this.log('📊', `Test assets summary: ${foundFiles} files/directories found`);
    return foundFiles > 0;
  }

  /**
   * Run all validation tests
   */
  async runAllTests() {
    console.log('🎯 BMAD OCR-Enhanced Conversion Validation');
    console.log('=' .repeat(50));

    const tests = [
      { name: 'Backend Health', method: () => this.testBackendHealth() },
      { name: 'Job Status Format', method: () => this.testJobStatusEndpoint() },
      { name: 'OCR Code Integration', method: () => this.validateOCRCodeIntegration() },
      { name: 'Error Handling', method: () => this.testErrorHandling() },
      { name: 'Test Assets', method: () => this.checkExistingTestFiles() }
    ];

    const results = [];
    let totalTests = tests.length;
    let passedTests = 0;

    for (const test of tests) {
      this.log('🧪', `Running: ${test.name}`);

      try {
        const result = await test.method();
        results.push({ name: test.name, status: result ? 'PASS' : 'FAIL' });
        if (result) passedTests++;

        this.log(result ? '✅' : '❌', `${test.name}: ${result ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        results.push({ name: test.name, status: 'ERROR', error: error.message });
        this.log('💥', `${test.name}: ERROR - ${error.message}`);
      }

      console.log(''); // Spacing
    }

    // Summary
    console.log('=' .repeat(50));
    console.log('📊 VALIDATION SUMMARY');
    console.log('=' .repeat(50));

    results.forEach(result => {
      const emoji = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '💥';
      console.log(`${emoji} ${result.name}: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('');
    console.log(`Success Rate: ${(passedTests / totalTests * 100).toFixed(1)}% (${passedTests}/${totalTests})`);

    const overallStatus = passedTests >= (totalTests * 0.8) ? 'SYSTEM READY' : 'NEEDS ATTENTION';
    console.log(`🏆 Overall Status: ${overallStatus}`);

    return {
      status: overallStatus,
      passedTests,
      totalTests,
      results
    };
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new SimpleOCRTester();
  tester.runAllTests()
    .then(result => {
      process.exit(result.status === 'SYSTEM READY' ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Validation crashed:', error);
      process.exit(1);
    });
}

module.exports = { SimpleOCRTester };