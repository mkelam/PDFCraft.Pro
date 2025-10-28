/**
 * Real OCR-Enhanced PDF Conversion Test
 * Tests the actual conversion pipeline with real PDF files
 */

const fs = require('fs').promises;
const path = require('path');
const http = require('http');

class RealOCRConversionTester {
  constructor() {
    this.API_BASE_URL = 'http://localhost:3008';
    this.testResults = {
      timestamp: new Date().toISOString(),
      tests: []
    };
  }

  log(emoji, message, data = {}) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${timestamp} ${emoji} ${message}`);
    if (Object.keys(data).length > 0) {
      console.log('   📊', JSON.stringify(data, null, 2));
    }
  }

  addResult(testName, status, details, performance = {}) {
    this.testResults.tests.push({
      testName,
      status,
      details,
      performance,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Create a multipart form boundary
   */
  createBoundary() {
    return '----formdata-bmad-' + Date.now();
  }

  /**
   * Create multipart form data with OCR options
   */
  async createMultipartData(filePath, boundary) {
    const fileBuffer = await fs.readFile(filePath);
    const filename = path.basename(filePath);

    let multipartData = '';

    // File data
    multipartData += `--${boundary}\r\n`;
    multipartData += `Content-Disposition: form-data; name="files"; filename="${filename}"\r\n`;
    multipartData += `Content-Type: application/pdf\r\n\r\n`;

    const textPart = Buffer.from(multipartData, 'utf8');
    const endPart = Buffer.from(`\r\n`, 'utf8');

    // OCR options
    const ocrOptions = `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="ocrEnabled"\r\n\r\n` +
      `true\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="preserveImages"\r\n\r\n` +
      `true\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="textOverlays"\r\n\r\n` +
      `true\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="ocrAccuracy"\r\n\r\n` +
      `high\r\n` +
      `--${boundary}--\r\n`;

    const ocrPart = Buffer.from(ocrOptions, 'utf8');

    return Buffer.concat([textPart, fileBuffer, endPart, ocrPart]);
  }

  /**
   * Submit OCR-enhanced PDF conversion request
   */
  async submitConversionRequest(pdfPath) {
    const boundary = this.createBoundary();
    const multipartData = await this.createMultipartData(pdfPath, boundary);

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3008,
        path: '/api/convert/pdf-to-ppt',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': multipartData.length
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve({ statusCode: res.statusCode, data: response });
          } catch (error) {
            resolve({ statusCode: res.statusCode, data: { error: 'Invalid JSON response', raw: data } });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => reject(new Error('Request timeout')));
      req.write(multipartData);
      req.end();
    });
  }

  /**
   * Poll job status with detailed logging
   */
  async pollJobStatus(jobId, maxPolls = 30, interval = 5000) {
    this.log('🔄', `Starting job status polling for: ${jobId}`);

    for (let poll = 1; poll <= maxPolls; poll++) {
      await new Promise(resolve => setTimeout(resolve, interval));

      try {
        const response = await new Promise((resolve, reject) => {
          const req = http.get(`${this.API_BASE_URL}/api/job/${jobId}/status`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              try {
                const json = JSON.parse(data);
                resolve({ statusCode: res.statusCode, data: json });
              } catch (error) {
                resolve({ statusCode: res.statusCode, data: { error: 'Invalid JSON', raw: data } });
              }
            });
          });
          req.on('error', reject);
          req.setTimeout(10000, () => reject(new Error('Status check timeout')));
        });

        if (response.statusCode !== 200) {
          throw new Error(`Status check failed: ${response.statusCode}`);
        }

        const job = response.data.job;
        this.log('📊', `Poll ${poll}: ${job.status} (${job.progress}%)`, {
          stage: job.stage,
          processingTime: job.processingTime
        });

        // Check for OCR-specific processing stages
        if (job.stage) {
          const stage = job.stage.toLowerCase();
          if (stage.includes('ocr') || stage.includes('text') || stage.includes('overlay')) {
            this.addResult('OCR Processing Stage Detection', 'PASS',
              `OCR stage detected: "${job.stage}"`, { poll, progress: job.progress });
          }
        }

        if (job.status === 'completed') {
          this.log('✅', 'Job completed successfully!', {
            totalTime: job.processingTime,
            outputFile: job.outputFile,
            downloadUrl: job.downloadUrl
          });

          return {
            status: 'completed',
            job: job,
            polls: poll
          };
        }

        if (job.status === 'failed') {
          throw new Error(`Job failed: ${job.errorMessage || 'Unknown error'}`);
        }

      } catch (error) {
        this.log('❌', `Poll ${poll} failed: ${error.message}`);
        if (poll === maxPolls) {
          throw new Error(`Job polling failed after ${maxPolls} attempts`);
        }
      }
    }

    throw new Error(`Job did not complete within ${maxPolls} polls`);
  }

  /**
   * Test OCR conversion with real PDF
   */
  async testRealOCRConversion(pdfPath) {
    const testStart = Date.now();
    this.log('🚀', `Testing OCR conversion with: ${path.basename(pdfPath)}`);

    try {
      // Check if PDF exists
      await fs.access(pdfPath);
      const stats = await fs.stat(pdfPath);
      this.log('📄', 'PDF file details', {
        size: `${Math.round(stats.size / 1024)}KB`,
        path: pdfPath
      });

      // Submit conversion request
      this.log('📤', 'Submitting OCR conversion request...');
      const submitStart = Date.now();
      const response = await this.submitConversionRequest(pdfPath);
      const submitTime = Date.now() - submitStart;

      if (response.statusCode !== 202) {
        throw new Error(`Unexpected status code: ${response.statusCode}, Response: ${JSON.stringify(response.data)}`);
      }

      const jobData = response.data;
      if (!jobData.success || !jobData.jobId) {
        throw new Error(`Invalid response: ${JSON.stringify(jobData)}`);
      }

      this.addResult('Job Submission', 'PASS',
        `Job created: ${jobData.jobId}`,
        { submitTime, estimatedTime: jobData.estimatedTime });

      // Poll for completion
      const pollResult = await this.pollJobStatus(jobData.jobId);
      const totalTime = Date.now() - testStart;

      this.addResult('OCR Conversion Complete', 'PASS',
        `Conversion completed successfully`,
        {
          totalTime,
          polls: pollResult.polls,
          outputFile: pollResult.job.outputFile,
          processingTime: pollResult.job.processingTime
        });

      // Validate output
      if (pollResult.job.quality) {
        this.log('🏆', 'Quality metrics available', pollResult.job.quality);
        this.addResult('Quality Validation', 'PASS',
          `Output validated: ${pollResult.job.quality.slideCount} slides`,
          pollResult.job.quality);
      }

      return {
        success: true,
        jobId: jobData.jobId,
        totalTime,
        result: pollResult
      };

    } catch (error) {
      this.log('❌', `OCR conversion test failed: ${error.message}`);
      this.addResult('OCR Conversion Test', 'FAIL', error.message, {
        totalTime: Date.now() - testStart
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Run comprehensive OCR testing
   */
  async runComprehensiveTest() {
    console.log('🎯 Real OCR-Enhanced PDF Conversion Testing');
    console.log('=' .repeat(50));

    // Find available test PDFs
    const possiblePDFs = [
      'backend/Business_Report_Q4_2024.pdf',
      'backend/simple-test.pdf',
      'backend/test-data/sample.pdf'
    ];

    let testPDF = null;
    for (const pdfPath of possiblePDFs) {
      try {
        const fullPath = path.join(__dirname, pdfPath);
        await fs.access(fullPath);
        testPDF = fullPath;
        break;
      } catch (error) {
        // PDF doesn't exist, try next
      }
    }

    if (!testPDF) {
      this.log('❌', 'No test PDF files found for conversion testing');
      this.addResult('Test Setup', 'FAIL', 'No test PDFs available');
      return { success: false, error: 'No test PDFs available' };
    }

    // Run the actual conversion test
    const result = await this.testRealOCRConversion(testPDF);

    // Generate summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 OCR CONVERSION TEST SUMMARY');
    console.log('=' .repeat(50));

    const passed = this.testResults.tests.filter(t => t.status === 'PASS').length;
    const failed = this.testResults.tests.filter(t => t.status === 'FAIL').length;
    const total = this.testResults.tests.length;

    console.log(`Total Checks: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${total > 0 ? (passed / total * 100).toFixed(1) : 0}%`);

    if (result.success) {
      console.log(`\n🏆 OCR CONVERSION: SUCCESS`);
      console.log(`   ⏱️  Total Time: ${Math.round(result.totalTime / 1000)}s`);
      console.log(`   📄 Job ID: ${result.jobId}`);
      if (result.result.job.outputFile) {
        console.log(`   💾 Output: ${result.result.job.outputFile}`);
      }
    } else {
      console.log(`\n❌ OCR CONVERSION: FAILED`);
      console.log(`   Error: ${result.error}`);
    }

    // Save detailed results
    const reportPath = path.join(__dirname, 'test-results', `real-ocr-test-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify({
      ...this.testResults,
      overallResult: result
    }, null, 2));

    console.log(`\n📄 Detailed report: ${reportPath}`);

    return result;
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new RealOCRConversionTester();
  tester.runComprehensiveTest()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test crashed:', error);
      process.exit(1);
    });
}

module.exports = { RealOCRConversionTester };