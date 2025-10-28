/**
 * COMPREHENSIVE END-TO-END TEST SUITE V2
 * Fixed version with correct field names and improved error handling
 * Tests PDF to PowerPoint, Word, and Excel conversions
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { PDFDocument } = require('pdf-lib');

// Test configuration - FIXED PORT
const CONFIG = {
  API_BASE_URL: 'http://localhost:3010', // Fixed: Using correct port
  FRONTEND_URL: 'http://localhost:3000',
  TEST_TIMEOUT: 60000,
  POLLING_INTERVAL: 1000,
  MAX_RETRIES: 3
};

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  environment: 'development',
  apiEndpoint: CONFIG.API_BASE_URL,
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  },
  issues: [],
  recommendations: []
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '═'.repeat(80));
  log(`  ${title}`, 'bright');
  console.log('═'.repeat(80));
}

function logTest(name, status, details = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`${icon} ${name}`, color);
  if (details) {
    console.log(`   ${details}`);
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if file exists or create it
async function ensureTestFile(filename) {
  if (!fs.existsSync(filename)) {
    // Create a simple test PDF if it doesn't exist
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    page.drawText('Test PDF Content', { x: 50, y: 750, size: 24 });
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(filename, pdfBytes);
    log(`✅ Created test file: ${filename}`, 'green');
  } else {
    log(`✅ Using existing file: ${filename}`, 'green');
  }
  return filename;
}

// Create test PDF files
async function createTestPDFs() {
  logSection('PREPARING TEST FILES');

  const testFiles = [];

  try {
    // Check for existing test files first
    const existingFiles = [
      'test-simple-text.pdf',
      'test-complex-table.pdf',
      'test-multi-page.pdf',
      'simple-test.pdf'
    ];

    for (const file of existingFiles) {
      if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        testFiles.push({
          name: file,
          type: file.replace('.pdf', '').replace('test-', ''),
          size: stats.size
        });
        log(`✅ Found existing test file: ${file}`, 'green');
      }
    }

    // If no test files found, create them
    if (testFiles.length === 0) {
      // 1. Simple text PDF
      const simpleTextPDF = await PDFDocument.create();
      const page1 = simpleTextPDF.addPage([600, 800]);
      page1.drawText('Test PDF for Office Conversion', { x: 50, y: 750, size: 24 });
      page1.drawText('This is a simple text document for testing.', { x: 50, y: 700, size: 12 });

      const simpleTextBytes = await simpleTextPDF.save();
      fs.writeFileSync('test-simple.pdf', simpleTextBytes);
      testFiles.push({ name: 'test-simple.pdf', type: 'simple', size: simpleTextBytes.length });
      log('✅ Created simple text PDF', 'green');

      // 2. Multi-page document
      const multiPagePDF = await PDFDocument.create();
      for (let i = 1; i <= 3; i++) {
        const page = multiPagePDF.addPage([600, 800]);
        page.drawText(`Page ${i} of 3`, { x: 250, y: 750, size: 24 });
        page.drawText(`Content for page ${i}`, { x: 50, y: 700, size: 14 });
      }

      const multiPageBytes = await multiPagePDF.save();
      fs.writeFileSync('test-multipage.pdf', multiPageBytes);
      testFiles.push({ name: 'test-multipage.pdf', type: 'multipage', size: multiPageBytes.length });
      log('✅ Created multi-page PDF', 'green');
    }

    return testFiles;

  } catch (error) {
    log(`❌ Error preparing test PDFs: ${error.message}`, 'red');
    return testFiles;
  }
}

// Test PDF to PowerPoint conversion - FIXED
async function testPDFToPowerPoint(testFile) {
  const testName = `PDF to PowerPoint: ${testFile.type}`;
  const startTime = Date.now();

  try {
    log(`\nTesting: ${testName}`, 'cyan');

    // Prepare form data - FIXED: Using 'files' field name
    const formData = new FormData();

    // CRITICAL FIX: Use 'files' field name as expected by the API
    formData.append('files', fs.createReadStream(testFile.name), {
      filename: testFile.name,
      contentType: 'application/pdf'
    });

    // Submit conversion request
    log(`  Submitting conversion request...`, 'yellow');
    const response = await axios.post(
      `${CONFIG.API_BASE_URL}/api/convert/pdf-to-ppt`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Origin': CONFIG.FRONTEND_URL,
          'Accept': 'application/json'
        },
        timeout: CONFIG.TEST_TIMEOUT,
        validateStatus: (status) => status < 500 // Don't throw on 4xx
      }
    );

    if (response.status !== 202 && response.status !== 200) {
      throw new Error(`Unexpected status: ${response.status} - ${JSON.stringify(response.data)}`);
    }

    const { jobId } = response.data;
    log(`  Job ID: ${jobId}`, 'yellow');

    // Poll for completion
    let attempts = 0;
    let conversionResult = null;

    while (attempts < 30) {
      await sleep(CONFIG.POLLING_INTERVAL);

      const statusResponse = await axios.get(
        `${CONFIG.API_BASE_URL}/api/job/${jobId}/status`,
        {
          validateStatus: () => true
        }
      );

      const status = statusResponse.data;

      process.stdout.write('.');

      if (status.status === 'completed') {
        conversionResult = status;
        break;
      } else if (status.status === 'failed') {
        throw new Error(`Conversion failed: ${status.error || 'Unknown error'}`);
      }

      attempts++;
    }

    if (!conversionResult) {
      throw new Error('Conversion timeout after 30 seconds');
    }

    console.log(''); // New line after dots

    // Download and validate the output
    const downloadResponse = await axios.get(
      `${CONFIG.API_BASE_URL}/api/download/${conversionResult.filename}`,
      {
        responseType: 'arraybuffer',
        validateStatus: () => true
      }
    );

    if (downloadResponse.status !== 200) {
      throw new Error(`Download failed: ${downloadResponse.status}`);
    }

    const outputPath = `output-${testFile.type}.pptx`;
    fs.writeFileSync(outputPath, downloadResponse.data);

    // Basic validation
    if (downloadResponse.data.length < 1000) {
      throw new Error('Output file too small, likely corrupted');
    }

    const processingTime = Date.now() - startTime;

    testResults.tests.push({
      name: testName,
      status: 'PASS',
      processingTime,
      outputSize: downloadResponse.data.length,
      details: {
        jobId,
        inputSize: testFile.size,
        outputFile: outputPath
      }
    });

    logTest(testName, 'PASS', `✓ Processed in ${processingTime}ms, Output: ${outputPath}`);
    testResults.summary.passed++;

    return true;

  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message;

    testResults.tests.push({
      name: testName,
      status: 'FAIL',
      error: errorMessage,
      processingTime: Date.now() - startTime
    });

    logTest(testName, 'FAIL', errorMessage);
    testResults.summary.failed++;

    // Track specific issues
    if (errorMessage.includes('Unexpected field')) {
      testResults.issues.push({
        type: 'API_FIELD_MISMATCH',
        message: 'API expects different field name for file upload',
        severity: 'CRITICAL'
      });
    }

    return false;
  }
}

// Test with frontend simulation
async function testWithFrontendSimulation() {
  logSection('FRONTEND SIMULATION TEST');

  try {
    // Create test PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText('Frontend Simulation Test', { x: 50, y: 750, size: 20 });
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('frontend-test.pdf', pdfBytes);

    // Simulate frontend upload
    const formData = new FormData();

    // Try both field names to see which works
    const fieldNames = ['files', 'file'];
    let successfulField = null;

    for (const fieldName of fieldNames) {
      try {
        const testForm = new FormData();
        testForm.append(fieldName, fs.createReadStream('frontend-test.pdf'), {
          filename: 'frontend-test.pdf',
          contentType: 'application/pdf'
        });

        const response = await axios.post(
          `${CONFIG.API_BASE_URL}/api/convert/pdf-to-ppt`,
          testForm,
          {
            headers: {
              ...testForm.getHeaders(),
              'Origin': CONFIG.FRONTEND_URL
            },
            timeout: 5000,
            validateStatus: (status) => status < 500
          }
        );

        if (response.status === 202 || response.status === 200) {
          successfulField = fieldName;
          logTest(`Frontend Simulation (field: ${fieldName})`, 'PASS',
            `API accepts field name: ${fieldName}`);
          testResults.summary.passed++;
          break;
        }
      } catch (error) {
        log(`  Field name '${fieldName}' failed: ${error.message}`, 'yellow');
      }
    }

    if (successfulField) {
      testResults.recommendations.push({
        type: 'API_CONFIGURATION',
        message: `Use field name '${successfulField}' for file uploads`,
        priority: 'HIGH'
      });
    } else {
      logTest('Frontend Simulation', 'FAIL', 'Could not determine correct field name');
      testResults.summary.failed++;
    }

  } catch (error) {
    logTest('Frontend Simulation', 'FAIL', error.message);
    testResults.summary.failed++;
  }
}

// Test API endpoints availability
async function testAPIEndpoints() {
  logSection('API ENDPOINTS AVAILABILITY TEST');

  const endpoints = [
    { path: '/health', method: 'GET', name: 'Health Check' },
    { path: '/api/convert/pdf-to-ppt', method: 'POST', name: 'PDF to PPT' },
    { path: '/api/convert/pdf-to-word', method: 'POST', name: 'PDF to Word' },
    { path: '/api/convert/pdf-to-excel', method: 'POST', name: 'PDF to Excel' },
    { path: '/api/convert/pdf-to-office', method: 'POST', name: 'PDF to Office (Generic)' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method === 'POST' ? 'OPTIONS' : endpoint.method,
        url: `${CONFIG.API_BASE_URL}${endpoint.path}`,
        timeout: 5000,
        validateStatus: () => true
      });

      const status = response.status;

      if (status === 200 || status === 204) {
        logTest(`${endpoint.name} (${endpoint.path})`, 'PASS', `Status: ${status}`);
        testResults.summary.passed++;
      } else if (status === 404) {
        logTest(`${endpoint.name} (${endpoint.path})`, 'FAIL', `Endpoint not found (404)`);
        testResults.summary.failed++;

        testResults.issues.push({
          type: 'MISSING_ENDPOINT',
          message: `${endpoint.path} is not implemented`,
          severity: 'HIGH'
        });
      } else {
        logTest(`${endpoint.name} (${endpoint.path})`, 'WARN', `Unexpected status: ${status}`);
        testResults.summary.failed++;
      }

    } catch (error) {
      logTest(`${endpoint.name} (${endpoint.path})`, 'FAIL', error.message);
      testResults.summary.failed++;
    }

    testResults.summary.total++;
  }
}

// Test real-world PDF files
async function testRealWorldPDFs() {
  logSection('REAL-WORLD PDF TESTING');

  const realWorldTests = [
    {
      name: 'Text-heavy document',
      create: async () => {
        const pdf = await PDFDocument.create();
        const page = pdf.addPage([600, 800]);
        const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20);
        const lines = text.match(/.{1,80}/g) || [];
        let y = 750;
        for (const line of lines.slice(0, 30)) {
          page.drawText(line, { x: 50, y, size: 10 });
          y -= 20;
        }
        return pdf.save();
      }
    },
    {
      name: 'Presentation-style',
      create: async () => {
        const pdf = await PDFDocument.create();
        for (let i = 1; i <= 5; i++) {
          const page = pdf.addPage([800, 600]); // Landscape
          page.drawText(`Slide ${i}`, { x: 350, y: 500, size: 36 });
          page.drawText(`• Point 1\n• Point 2\n• Point 3`, { x: 100, y: 400, size: 18 });
        }
        return pdf.save();
      }
    },
    {
      name: 'Mixed content',
      create: async () => {
        const pdf = await PDFDocument.create();
        const page1 = pdf.addPage();
        page1.drawText('Document Title', { x: 200, y: 750, size: 28 });
        page1.drawText('Subtitle and metadata', { x: 200, y: 700, size: 14 });

        const page2 = pdf.addPage();
        page2.drawText('Data Table', { x: 250, y: 750, size: 20 });
        // Simulate table
        for (let i = 0; i < 5; i++) {
          page2.drawText(`Row ${i + 1}    Value ${(i + 1) * 100}    Status`,
            { x: 100, y: 650 - (i * 30), size: 12 });
        }

        return pdf.save();
      }
    }
  ];

  for (const test of realWorldTests) {
    try {
      const pdfBytes = await test.create();
      const filename = `real-world-${test.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      fs.writeFileSync(filename, pdfBytes);

      const testFile = {
        name: filename,
        type: test.name,
        size: pdfBytes.length
      };

      await testPDFToPowerPoint(testFile);

    } catch (error) {
      logTest(`Real-world: ${test.name}`, 'FAIL', error.message);
      testResults.summary.failed++;
    }

    testResults.summary.total++;
  }
}

// Performance benchmarks
async function performanceBenchmark() {
  logSection('PERFORMANCE BENCHMARKS');

  const benchmarks = [
    { size: 'small', pages: 1, target: 3000 },
    { size: 'medium', pages: 5, target: 8000 },
    { size: 'large', pages: 10, target: 15000 }
  ];

  for (const benchmark of benchmarks) {
    try {
      // Create test PDF
      const pdf = await PDFDocument.create();
      for (let i = 0; i < benchmark.pages; i++) {
        const page = pdf.addPage();
        page.drawText(`Page ${i + 1}`, { x: 50, y: 750, size: 24 });
      }

      const pdfBytes = await pdf.save();
      const filename = `benchmark-${benchmark.size}.pdf`;
      fs.writeFileSync(filename, pdfBytes);

      const startTime = Date.now();

      // Test conversion
      const formData = new FormData();
      formData.append('files', fs.createReadStream(filename), {
        filename,
        contentType: 'application/pdf'
      });

      const response = await axios.post(
        `${CONFIG.API_BASE_URL}/api/convert/pdf-to-ppt`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000,
          validateStatus: (status) => status < 500
        }
      );

      const duration = Date.now() - startTime;
      const withinTarget = duration <= benchmark.target;

      logTest(
        `Performance: ${benchmark.size} (${benchmark.pages} pages)`,
        withinTarget ? 'PASS' : 'FAIL',
        `${duration}ms (target: ${benchmark.target}ms)`
      );

      if (withinTarget) {
        testResults.summary.passed++;
      } else {
        testResults.summary.failed++;
      }

    } catch (error) {
      logTest(`Performance: ${benchmark.size}`, 'FAIL', error.message);
      testResults.summary.failed++;
    }

    testResults.summary.total++;
  }
}

// Generate comprehensive report
function generateReport() {
  logSection('COMPREHENSIVE TEST REPORT');

  const passRate = testResults.summary.total > 0
    ? ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(2)
    : 0;

  console.log(`\n📊 TEST STATISTICS:`);
  console.log(`   Total Tests: ${testResults.summary.total}`);
  console.log(`   ${colors.green}✅ Passed: ${testResults.summary.passed}${colors.reset}`);
  console.log(`   ${colors.red}❌ Failed: ${testResults.summary.failed}${colors.reset}`);
  console.log(`   ${colors.yellow}⚠️  Skipped: ${testResults.summary.skipped}${colors.reset}`);
  console.log(`   Pass Rate: ${passRate}%`);

  // Issues found
  if (testResults.issues.length > 0) {
    console.log(`\n🔍 ISSUES IDENTIFIED:`);
    testResults.issues.forEach(issue => {
      const color = issue.severity === 'CRITICAL' ? 'red' :
                    issue.severity === 'HIGH' ? 'yellow' : 'cyan';
      log(`   [${issue.severity}] ${issue.type}: ${issue.message}`, color);
    });
  }

  // Recommendations
  if (testResults.recommendations.length > 0) {
    console.log(`\n💡 RECOMMENDATIONS:`);
    testResults.recommendations.forEach(rec => {
      log(`   • ${rec.message} [${rec.priority}]`, 'cyan');
    });
  }

  // Failed tests details
  const failedTests = testResults.tests.filter(t => t.status === 'FAIL');
  if (failedTests.length > 0) {
    console.log(`\n${colors.red}❌ FAILED TESTS DETAILS:${colors.reset}`);
    failedTests.forEach(test => {
      console.log(`   - ${test.name}`);
      console.log(`     Error: ${test.error || 'Unknown error'}`);
    });
  }

  // Save detailed report
  const reportPath = `test-report-v2-${new Date().toISOString().replace(/:/g, '-')}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  // Final verdict
  console.log('\n' + '═'.repeat(80));
  if (passRate >= 90) {
    log('🎉 EXCELLENT: System is working well!', 'green');
  } else if (passRate >= 70) {
    log('✅ GOOD: System is functional with some issues', 'yellow');
  } else if (passRate >= 50) {
    log('⚠️  WARNING: System has significant issues', 'yellow');
  } else {
    log('❌ CRITICAL: System needs immediate attention', 'red');
  }
  console.log('═'.repeat(80));

  // Action items
  console.log(`\n📋 ACTION ITEMS:`);
  if (testResults.issues.some(i => i.type === 'API_FIELD_MISMATCH')) {
    console.log(`   1. Fix Multer configuration to accept correct field name`);
  }
  if (testResults.issues.some(i => i.type === 'MISSING_ENDPOINT')) {
    console.log(`   2. Implement missing endpoints (Word, Excel conversions)`);
  }
  console.log(`   3. Improve error handling and validation`);
  console.log(`   4. Add comprehensive logging for debugging`);
}

// Main test runner
async function runTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║      COMPREHENSIVE PDF TO OFFICE CONVERSION TEST SUITE V2                  ║');
  console.log('║                     Fixed Field Names & Improved Testing                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');

  try {
    // Check API availability
    logSection('API AVAILABILITY CHECK');
    try {
      const healthResponse = await axios.get(`${CONFIG.API_BASE_URL}/health`);
      if (healthResponse.data.status === 'healthy') {
        log('✅ API is healthy and ready', 'green');
        log(`   Server: ${CONFIG.API_BASE_URL}`, 'cyan');
      }
    } catch (error) {
      log(`⚠️  API health check failed: ${error.message}`, 'yellow');
      log(`   Attempting to continue anyway...`, 'yellow');
    }

    // Test API endpoints availability
    await testAPIEndpoints();

    // Test with frontend simulation to find correct field name
    await testWithFrontendSimulation();

    // Create/prepare test PDFs
    const testFiles = await createTestPDFs();

    // Test PowerPoint conversions
    if (testFiles.length > 0) {
      logSection('PDF TO POWERPOINT CONVERSION TESTS');
      for (const testFile of testFiles) {
        await testPDFToPowerPoint(testFile);
        testResults.summary.total++;
      }
    }

    // Test real-world scenarios
    await testRealWorldPDFs();

    // Performance benchmarks
    await performanceBenchmark();

    // Generate final report
    generateReport();

  } catch (error) {
    log(`\n❌ Critical test failure: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run the tests
console.log('Starting comprehensive test suite...');
runTests().catch(console.error);