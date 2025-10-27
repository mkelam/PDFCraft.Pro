/**
 * COMPREHENSIVE END-TO-END TEST SUITE FOR PDF TO OFFICE CONVERSIONS
 * Tests PDF to PowerPoint, Word, and Excel conversions
 * Military-grade quality assurance protocol
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { PDFDocument } = require('pdf-lib');

// Test configuration
const CONFIG = {
  API_BASE_URL: 'http://localhost:3010',
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
  }
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
  console.log('\n' + '='.repeat(80));
  log(`  ${title}`, 'bright');
  console.log('='.repeat(80));
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

// Create test PDF files
async function createTestPDFs() {
  logSection('CREATING TEST PDF FILES');

  const testFiles = [];

  try {
    // 1. Simple text PDF
    const simpleTextPDF = await PDFDocument.create();
    const page1 = simpleTextPDF.addPage([600, 800]);
    page1.drawText('Test PDF for Office Conversion', { x: 50, y: 750, size: 24 });
    page1.drawText('This is a simple text document for testing.', { x: 50, y: 700, size: 12 });
    page1.drawText('Page 1 of 2', { x: 50, y: 50, size: 10 });

    const page2 = simpleTextPDF.addPage([600, 800]);
    page2.drawText('Page 2 Content', { x: 50, y: 750, size: 20 });
    page2.drawText('Additional test content on second page.', { x: 50, y: 700, size: 12 });

    const simpleTextBytes = await simpleTextPDF.save();
    fs.writeFileSync('test-simple-text.pdf', simpleTextBytes);
    testFiles.push({ name: 'test-simple-text.pdf', type: 'simple-text', size: simpleTextBytes.length });
    log('✅ Created simple text PDF', 'green');

    // 2. Complex layout PDF with tables
    const complexPDF = await PDFDocument.create();
    const tablePage = complexPDF.addPage([600, 800]);
    tablePage.drawText('Financial Report Q4 2024', { x: 200, y: 750, size: 18 });

    // Draw table headers
    tablePage.drawText('Category', { x: 50, y: 650, size: 12 });
    tablePage.drawText('Q3 2024', { x: 200, y: 650, size: 12 });
    tablePage.drawText('Q4 2024', { x: 350, y: 650, size: 12 });
    tablePage.drawText('Change', { x: 500, y: 650, size: 12 });

    // Draw table data
    const tableData = [
      ['Revenue', '$1.2M', '$1.5M', '+25%'],
      ['Expenses', '$800K', '$900K', '+12.5%'],
      ['Profit', '$400K', '$600K', '+50%']
    ];

    let yPos = 620;
    for (const row of tableData) {
      tablePage.drawText(row[0], { x: 50, y: yPos, size: 11 });
      tablePage.drawText(row[1], { x: 200, y: yPos, size: 11 });
      tablePage.drawText(row[2], { x: 350, y: yPos, size: 11 });
      tablePage.drawText(row[3], { x: 500, y: yPos, size: 11 });
      yPos -= 30;
    }

    const complexBytes = await complexPDF.save();
    fs.writeFileSync('test-complex-table.pdf', complexBytes);
    testFiles.push({ name: 'test-complex-table.pdf', type: 'complex-table', size: complexBytes.length });
    log('✅ Created complex table PDF', 'green');

    // 3. Multi-page document
    const multiPagePDF = await PDFDocument.create();
    for (let i = 1; i <= 5; i++) {
      const page = multiPagePDF.addPage([600, 800]);
      page.drawText(`Page ${i} of 5`, { x: 250, y: 750, size: 24 });
      page.drawText(`Content for page ${i}`, { x: 50, y: 700, size: 14 });
      page.drawText('Lorem ipsum dolor sit amet, consectetur adipiscing elit.', { x: 50, y: 650, size: 12 });
    }

    const multiPageBytes = await multiPagePDF.save();
    fs.writeFileSync('test-multi-page.pdf', multiPageBytes);
    testFiles.push({ name: 'test-multi-page.pdf', type: 'multi-page', size: multiPageBytes.length });
    log('✅ Created multi-page PDF', 'green');

    return testFiles;

  } catch (error) {
    log(`❌ Error creating test PDFs: ${error.message}`, 'red');
    return [];
  }
}

// Test PDF to PowerPoint conversion
async function testPDFToPowerPoint(testFile) {
  const testName = `PDF to PowerPoint: ${testFile.type}`;
  const startTime = Date.now();

  try {
    log(`\nTesting: ${testName}`, 'cyan');

    // Prepare form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFile.name), testFile.name);

    // Submit conversion request
    const response = await axios.post(
      `${CONFIG.API_BASE_URL}/api/convert/pdf-to-ppt`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Origin': CONFIG.FRONTEND_URL
        },
        timeout: CONFIG.TEST_TIMEOUT
      }
    );

    const { jobId } = response.data;
    log(`  Job ID: ${jobId}`, 'yellow');

    // Poll for completion
    let attempts = 0;
    let conversionResult = null;

    while (attempts < 30) {
      await sleep(CONFIG.POLLING_INTERVAL);

      const statusResponse = await axios.get(
        `${CONFIG.API_BASE_URL}/api/job/${jobId}/status`
      );

      const status = statusResponse.data;

      if (status.status === 'completed') {
        conversionResult = status;
        break;
      } else if (status.status === 'failed') {
        throw new Error(`Conversion failed: ${status.error}`);
      }

      attempts++;
      process.stdout.write('.');
    }

    if (!conversionResult) {
      throw new Error('Conversion timeout');
    }

    console.log(''); // New line after dots

    // Download and validate the output
    const downloadResponse = await axios.get(
      `${CONFIG.API_BASE_URL}/api/download/${conversionResult.filename}`,
      { responseType: 'arraybuffer' }
    );

    const outputPath = `output-${testFile.type}.pptx`;
    fs.writeFileSync(outputPath, downloadResponse.data);

    // Validate PPTX structure
    const zip = new AdmZip(outputPath);
    const entries = zip.getEntries();

    const requiredFiles = [
      'ppt/presentation.xml',
      'ppt/slides/slide1.xml',
      '[Content_Types].xml',
      '_rels/.rels'
    ];

    const foundFiles = entries.map(e => e.entryName);
    const hasRequiredFiles = requiredFiles.every(file =>
      foundFiles.some(f => f.includes(file.replace('[', '').replace(']', '')))
    );

    if (!hasRequiredFiles) {
      throw new Error('Invalid PPTX structure: missing required files');
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
        outputFile: outputPath,
        slideCount: foundFiles.filter(f => f.includes('ppt/slides/slide')).length
      }
    });

    logTest(testName, 'PASS', `✓ Processed in ${processingTime}ms, Output: ${outputPath}`);
    testResults.summary.passed++;

    return true;

  } catch (error) {
    testResults.tests.push({
      name: testName,
      status: 'FAIL',
      error: error.message,
      processingTime: Date.now() - startTime
    });

    logTest(testName, 'FAIL', error.message);
    testResults.summary.failed++;

    return false;
  }
}

// Test PDF to Word conversion
async function testPDFToWord(testFile) {
  const testName = `PDF to Word: ${testFile.type}`;
  const startTime = Date.now();

  try {
    log(`\nTesting: ${testName}`, 'cyan');

    // Prepare form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFile.name), testFile.name);
    formData.append('outputFormat', 'docx');

    // Submit conversion request
    const response = await axios.post(
      `${CONFIG.API_BASE_URL}/api/convert/pdf-to-office`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Origin': CONFIG.FRONTEND_URL
        },
        timeout: CONFIG.TEST_TIMEOUT
      }
    );

    const { jobId } = response.data;
    log(`  Job ID: ${jobId}`, 'yellow');

    // Poll for completion
    let attempts = 0;
    let conversionResult = null;

    while (attempts < 30) {
      await sleep(CONFIG.POLLING_INTERVAL);

      const statusResponse = await axios.get(
        `${CONFIG.API_BASE_URL}/api/job/${jobId}/status`
      );

      const status = statusResponse.data;

      if (status.status === 'completed') {
        conversionResult = status;
        break;
      } else if (status.status === 'failed') {
        throw new Error(`Conversion failed: ${status.error}`);
      }

      attempts++;
      process.stdout.write('.');
    }

    if (!conversionResult) {
      throw new Error('Conversion timeout');
    }

    console.log(''); // New line after dots

    // Download and validate the output
    const downloadResponse = await axios.get(
      `${CONFIG.API_BASE_URL}/api/download/${conversionResult.filename}`,
      { responseType: 'arraybuffer' }
    );

    const outputPath = `output-${testFile.type}.docx`;
    fs.writeFileSync(outputPath, downloadResponse.data);

    // Validate DOCX structure
    const zip = new AdmZip(outputPath);
    const entries = zip.getEntries();

    const requiredFiles = [
      'word/document.xml',
      '[Content_Types].xml',
      '_rels/.rels'
    ];

    const foundFiles = entries.map(e => e.entryName);
    const hasRequiredFiles = requiredFiles.every(file =>
      foundFiles.some(f => f.includes(file.replace('[', '').replace(']', '')))
    );

    if (!hasRequiredFiles) {
      throw new Error('Invalid DOCX structure: missing required files');
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
    testResults.tests.push({
      name: testName,
      status: 'FAIL',
      error: error.message,
      processingTime: Date.now() - startTime
    });

    logTest(testName, 'FAIL', error.message);
    testResults.summary.failed++;

    return false;
  }
}

// Test PDF to Excel conversion
async function testPDFToExcel(testFile) {
  const testName = `PDF to Excel: ${testFile.type}`;
  const startTime = Date.now();

  try {
    log(`\nTesting: ${testName}`, 'cyan');

    // Prepare form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFile.name), testFile.name);
    formData.append('outputFormat', 'xlsx');

    // Submit conversion request
    const response = await axios.post(
      `${CONFIG.API_BASE_URL}/api/convert/pdf-to-office`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Origin': CONFIG.FRONTEND_URL
        },
        timeout: CONFIG.TEST_TIMEOUT
      }
    );

    const { jobId } = response.data;
    log(`  Job ID: ${jobId}`, 'yellow');

    // Poll for completion
    let attempts = 0;
    let conversionResult = null;

    while (attempts < 30) {
      await sleep(CONFIG.POLLING_INTERVAL);

      const statusResponse = await axios.get(
        `${CONFIG.API_BASE_URL}/api/job/${jobId}/status`
      );

      const status = statusResponse.data;

      if (status.status === 'completed') {
        conversionResult = status;
        break;
      } else if (status.status === 'failed') {
        throw new Error(`Conversion failed: ${status.error}`);
      }

      attempts++;
      process.stdout.write('.');
    }

    if (!conversionResult) {
      throw new Error('Conversion timeout');
    }

    console.log(''); // New line after dots

    // Download and validate the output
    const downloadResponse = await axios.get(
      `${CONFIG.API_BASE_URL}/api/download/${conversionResult.filename}`,
      { responseType: 'arraybuffer' }
    );

    const outputPath = `output-${testFile.type}.xlsx`;
    fs.writeFileSync(outputPath, downloadResponse.data);

    // Validate XLSX structure
    const zip = new AdmZip(outputPath);
    const entries = zip.getEntries();

    const requiredFiles = [
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
      '[Content_Types].xml',
      '_rels/.rels'
    ];

    const foundFiles = entries.map(e => e.entryName);
    const hasRequiredFiles = requiredFiles.every(file =>
      foundFiles.some(f => f.includes(file.replace('[', '').replace(']', '')))
    );

    if (!hasRequiredFiles) {
      throw new Error('Invalid XLSX structure: missing required files');
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
    testResults.tests.push({
      name: testName,
      status: 'FAIL',
      error: error.message,
      processingTime: Date.now() - startTime
    });

    logTest(testName, 'FAIL', error.message);
    testResults.summary.failed++;

    return false;
  }
}

// Test error handling
async function testErrorHandling() {
  logSection('TESTING ERROR HANDLING');

  const errorTests = [
    {
      name: 'Invalid file type',
      test: async () => {
        const formData = new FormData();
        formData.append('file', Buffer.from('not a pdf'), 'test.txt');

        try {
          await axios.post(
            `${CONFIG.API_BASE_URL}/api/convert/pdf-to-ppt`,
            formData,
            {
              headers: formData.getHeaders(),
              validateStatus: () => true
            }
          );
          return { status: 'FAIL', message: 'Should have rejected non-PDF file' };
        } catch (error) {
          return { status: 'PASS', message: 'Correctly rejected invalid file' };
        }
      }
    },
    {
      name: 'Missing file',
      test: async () => {
        try {
          await axios.post(
            `${CONFIG.API_BASE_URL}/api/convert/pdf-to-ppt`,
            {},
            { validateStatus: () => true }
          );
          return { status: 'FAIL', message: 'Should have rejected request without file' };
        } catch (error) {
          return { status: 'PASS', message: 'Correctly rejected missing file' };
        }
      }
    },
    {
      name: 'Invalid job ID',
      test: async () => {
        const response = await axios.get(
          `${CONFIG.API_BASE_URL}/api/job/invalid-job-id/status`,
          { validateStatus: () => true }
        );

        if (response.status === 404 || response.status === 400) {
          return { status: 'PASS', message: 'Correctly handled invalid job ID' };
        } else {
          return { status: 'FAIL', message: `Unexpected status: ${response.status}` };
        }
      }
    }
  ];

  for (const errorTest of errorTests) {
    try {
      const result = await errorTest.test();
      logTest(errorTest.name, result.status, result.message);

      testResults.tests.push({
        name: `Error Handling: ${errorTest.name}`,
        status: result.status,
        details: result.message
      });

      if (result.status === 'PASS') {
        testResults.summary.passed++;
      } else {
        testResults.summary.failed++;
      }
    } catch (error) {
      logTest(errorTest.name, 'FAIL', error.message);
      testResults.tests.push({
        name: `Error Handling: ${errorTest.name}`,
        status: 'FAIL',
        error: error.message
      });
      testResults.summary.failed++;
    }
  }
}

// Test concurrent conversions
async function testConcurrentConversions() {
  logSection('TESTING CONCURRENT CONVERSIONS');

  try {
    // Create a simple test PDF for concurrent tests
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([600, 800]);
    page.drawText('Concurrent Test PDF', { x: 50, y: 750, size: 24 });
    const pdfBytes = await pdf.save();
    fs.writeFileSync('test-concurrent.pdf', pdfBytes);

    // Launch 5 concurrent conversions
    const concurrentTests = [];
    for (let i = 1; i <= 5; i++) {
      const formData = new FormData();
      formData.append('file', fs.createReadStream('test-concurrent.pdf'), `test-${i}.pdf`);

      concurrentTests.push(
        axios.post(
          `${CONFIG.API_BASE_URL}/api/convert/pdf-to-ppt`,
          formData,
          {
            headers: formData.getHeaders(),
            timeout: CONFIG.TEST_TIMEOUT
          }
        ).then(response => ({
          success: true,
          jobId: response.data.jobId,
          index: i
        })).catch(error => ({
          success: false,
          error: error.message,
          index: i
        }))
      );
    }

    log('Launching 5 concurrent conversions...', 'yellow');
    const results = await Promise.all(concurrentTests);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    if (successful === 5) {
      logTest('Concurrent Conversions', 'PASS', `All 5 conversions initiated successfully`);
      testResults.tests.push({
        name: 'Concurrent Conversions',
        status: 'PASS',
        details: { successful, failed }
      });
      testResults.summary.passed++;
    } else {
      logTest('Concurrent Conversions', 'FAIL', `${failed} out of 5 conversions failed`);
      testResults.tests.push({
        name: 'Concurrent Conversions',
        status: 'FAIL',
        details: { successful, failed, errors: results.filter(r => !r.success) }
      });
      testResults.summary.failed++;
    }

  } catch (error) {
    logTest('Concurrent Conversions', 'FAIL', error.message);
    testResults.tests.push({
      name: 'Concurrent Conversions',
      status: 'FAIL',
      error: error.message
    });
    testResults.summary.failed++;
  }
}

// Test performance benchmarks
async function testPerformanceBenchmarks() {
  logSection('TESTING PERFORMANCE BENCHMARKS');

  const benchmarks = [
    { pages: 1, targetTime: 5000, name: 'Single page conversion' },
    { pages: 5, targetTime: 10000, name: '5-page document conversion' },
    { pages: 10, targetTime: 20000, name: '10-page document conversion' }
  ];

  for (const benchmark of benchmarks) {
    try {
      // Create test PDF with specified pages
      const pdf = await PDFDocument.create();
      for (let i = 1; i <= benchmark.pages; i++) {
        const page = pdf.addPage([600, 800]);
        page.drawText(`Page ${i} of ${benchmark.pages}`, { x: 50, y: 750, size: 24 });
      }

      const pdfBytes = await pdf.save();
      const testFile = `test-perf-${benchmark.pages}pages.pdf`;
      fs.writeFileSync(testFile, pdfBytes);

      // Measure conversion time
      const startTime = Date.now();

      const formData = new FormData();
      formData.append('file', fs.createReadStream(testFile), testFile);

      const response = await axios.post(
        `${CONFIG.API_BASE_URL}/api/convert/pdf-to-ppt`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: CONFIG.TEST_TIMEOUT
        }
      );

      const { jobId } = response.data;

      // Wait for completion
      let completed = false;
      for (let i = 0; i < 30; i++) {
        await sleep(CONFIG.POLLING_INTERVAL);

        const statusResponse = await axios.get(
          `${CONFIG.API_BASE_URL}/api/job/${jobId}/status`
        );

        if (statusResponse.data.status === 'completed') {
          completed = true;
          break;
        } else if (statusResponse.data.status === 'failed') {
          throw new Error('Conversion failed');
        }
      }

      if (!completed) {
        throw new Error('Conversion timeout');
      }

      const processingTime = Date.now() - startTime;
      const withinTarget = processingTime <= benchmark.targetTime;

      logTest(
        benchmark.name,
        withinTarget ? 'PASS' : 'FAIL',
        `Processed in ${processingTime}ms (target: ${benchmark.targetTime}ms)`
      );

      testResults.tests.push({
        name: `Performance: ${benchmark.name}`,
        status: withinTarget ? 'PASS' : 'FAIL',
        processingTime,
        targetTime: benchmark.targetTime,
        pages: benchmark.pages
      });

      if (withinTarget) {
        testResults.summary.passed++;
      } else {
        testResults.summary.failed++;
      }

    } catch (error) {
      logTest(benchmark.name, 'FAIL', error.message);
      testResults.tests.push({
        name: `Performance: ${benchmark.name}`,
        status: 'FAIL',
        error: error.message
      });
      testResults.summary.failed++;
    }
  }
}

// Main test runner
async function runTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         COMPREHENSIVE PDF TO OFFICE CONVERSION TEST SUITE                  ║');
  console.log('║                    Military-Grade Quality Assurance                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');

  try {
    // Check API availability
    logSection('CHECKING API AVAILABILITY');
    const healthResponse = await axios.get(`${CONFIG.API_BASE_URL}/health`);
    if (healthResponse.data.status === 'healthy') {
      log('✅ API is healthy and ready', 'green');
    } else {
      throw new Error('API is not healthy');
    }

    // Create test PDFs
    const testFiles = await createTestPDFs();
    if (testFiles.length === 0) {
      throw new Error('Failed to create test files');
    }

    // Test PowerPoint conversions
    logSection('TESTING PDF TO POWERPOINT CONVERSIONS');
    for (const testFile of testFiles) {
      await testPDFToPowerPoint(testFile);
      testResults.summary.total++;
    }

    // Test Word conversions
    logSection('TESTING PDF TO WORD CONVERSIONS');
    for (const testFile of testFiles) {
      await testPDFToWord(testFile);
      testResults.summary.total++;
    }

    // Test Excel conversions (only for table PDF)
    logSection('TESTING PDF TO EXCEL CONVERSIONS');
    const tableFile = testFiles.find(f => f.type === 'complex-table');
    if (tableFile) {
      await testPDFToExcel(tableFile);
      testResults.summary.total++;
    }

    // Test error handling
    await testErrorHandling();
    testResults.summary.total += 3;

    // Test concurrent conversions
    await testConcurrentConversions();
    testResults.summary.total++;

    // Test performance benchmarks
    await testPerformanceBenchmarks();
    testResults.summary.total += 3;

    // Generate report
    generateReport();

  } catch (error) {
    log(`\n❌ Critical test failure: ${error.message}`, 'red');
    console.error(error);
  }
}

// Generate comprehensive test report
function generateReport() {
  logSection('TEST RESULTS SUMMARY');

  const passRate = ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(2);

  console.log(`\n📊 OVERALL STATISTICS:`);
  console.log(`   Total Tests: ${testResults.summary.total}`);
  console.log(`   ${colors.green}✅ Passed: ${testResults.summary.passed}${colors.reset}`);
  console.log(`   ${colors.red}❌ Failed: ${testResults.summary.failed}${colors.reset}`);
  console.log(`   ${colors.yellow}⚠️  Skipped: ${testResults.summary.skipped}${colors.reset}`);
  console.log(`   Pass Rate: ${passRate}%`);

  // Performance metrics
  const performanceTests = testResults.tests.filter(t => t.processingTime);
  if (performanceTests.length > 0) {
    const avgTime = performanceTests.reduce((sum, t) => sum + t.processingTime, 0) / performanceTests.length;
    console.log(`\n⚡ PERFORMANCE METRICS:`);
    console.log(`   Average Processing Time: ${avgTime.toFixed(0)}ms`);
    console.log(`   Fastest Conversion: ${Math.min(...performanceTests.map(t => t.processingTime))}ms`);
    console.log(`   Slowest Conversion: ${Math.max(...performanceTests.map(t => t.processingTime))}ms`);
  }

  // Failed tests details
  const failedTests = testResults.tests.filter(t => t.status === 'FAIL');
  if (failedTests.length > 0) {
    console.log(`\n${colors.red}❌ FAILED TESTS:${colors.reset}`);
    failedTests.forEach(test => {
      console.log(`   - ${test.name}: ${test.error || 'Unknown error'}`);
    });
  }

  // Save detailed report to file
  const reportPath = `test-report-${new Date().toISOString().replace(/:/g, '-')}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  // Final verdict
  console.log('\n' + '='.repeat(80));
  if (passRate >= 95) {
    log('🎉 EXCELLENT: System is production-ready!', 'green');
  } else if (passRate >= 80) {
    log('✅ GOOD: System is functional with minor issues', 'yellow');
  } else if (passRate >= 60) {
    log('⚠️  WARNING: System has significant issues', 'yellow');
  } else {
    log('❌ CRITICAL: System is not ready for production', 'red');
  }
  console.log('='.repeat(80));
}

// Run tests
runTests().catch(console.error);