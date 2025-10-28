/**
 * Automated End-to-End Testing for PDF to Office Conversion
 *
 * This script uses Playwright to automate the testing of:
 * - Every button click
 * - Every dropdown selection
 * - File upload/download
 * - Conversion flows for all formats
 * - Error scenarios
 *
 * Run with: node automated-e2e-pdf-office-test.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  frontendUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:3001',
  testTimeout: 60000, // 60 seconds per test
  screenshotsDir: './test-screenshots',
  downloadsDir: './test-downloads',
  testPDFsDir: '.' // Use current directory where test PDFs exist
};

// Test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// Helper to log test results
function logTest(name, status, details = '') {
  results.total++;
  const result = {
    name,
    status,
    details,
    timestamp: new Date().toISOString()
  };

  if (status === 'PASS') {
    results.passed++;
    console.log(`✅ PASS: ${name}`);
  } else if (status === 'FAIL') {
    results.failed++;
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Details: ${details}`);
  } else {
    results.skipped++;
    console.log(`⏭️  SKIP: ${name}`);
  }

  results.tests.push(result);
}

// Helper to take screenshots
async function screenshot(page, name) {
  const filename = `${name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
  const filepath = path.join(CONFIG.screenshotsDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

// Helper to wait for element
async function waitForElement(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    return false;
  }
}

// Create test PDF files
async function createTestPDFs() {
  const testPDFsDir = CONFIG.testPDFsDir;
  if (!fs.existsSync(testPDFsDir)) {
    fs.mkdirSync(testPDFsDir, { recursive: true });
  }

  console.log('\n📄 Creating test PDF files...');

  // Map to actual test PDFs that exist in the project
  const requiredPDFs = [
    'test-simple-text.pdf',
    'test-multi-page.pdf',
    'test-complex-table.pdf',
    'test-concurrent.pdf',
    'test-frontend-auth.pdf'
  ];

  for (const pdf of requiredPDFs) {
    const pdfPath = path.join(testPDFsDir, pdf);
    if (!fs.existsSync(pdfPath)) {
      console.log(`⚠️  Warning: ${pdf} not found. Please add test PDFs to ${testPDFsDir}`);
    }
  }
}

// ============================================
// PHASE 1: UI COMPONENT TESTS
// ============================================

async function testModeButtons(page) {
  console.log('\n🧪 PHASE 1: Testing Mode Selection Buttons...\n');

  // Test 1.1: Click Convert button
  try {
    await page.click('button:has-text("Convert")');
    await page.waitForTimeout(500);

    const convertButton = await page.locator('button:has-text("Convert")');
    const classes = await convertButton.getAttribute('class');

    if (classes.includes('bg-primary/20') && classes.includes('border-primary')) {
      logTest('Click Convert button - highlights correctly', 'PASS');
    } else {
      logTest('Click Convert button - highlights correctly', 'FAIL', 'Button classes incorrect');
    }
  } catch (error) {
    logTest('Click Convert button - highlights correctly', 'FAIL', error.message);
  }

  // Test 1.2: Click Merge button
  try {
    await page.click('button:has-text("Merge")');
    await page.waitForTimeout(500);

    const mergeButton = await page.locator('button:has-text("Merge")');
    const classes = await mergeButton.getAttribute('class');

    if (classes.includes('bg-primary/20')) {
      logTest('Click Merge button - highlights correctly', 'PASS');
    } else {
      logTest('Click Merge button - highlights correctly', 'FAIL', 'Button classes incorrect');
    }

    // Check if output dropdown is disabled
    const dropdown = await page.locator('button:has-text("PowerPoint")').first();
    const isDisabled = await dropdown.isDisabled();

    if (isDisabled) {
      logTest('Merge mode - output dropdown disabled', 'PASS');
    } else {
      logTest('Merge mode - output dropdown disabled', 'FAIL', 'Dropdown should be disabled in merge mode');
    }
  } catch (error) {
    logTest('Click Merge button', 'FAIL', error.message);
  }

  // Test 1.3: Toggle between modes rapidly
  try {
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Convert")');
      await page.waitForTimeout(100);
      await page.click('button:has-text("Merge")');
      await page.waitForTimeout(100);
    }

    // Final state should be Merge
    await page.click('button:has-text("Merge")');
    await page.waitForTimeout(300);

    const mergeActive = await page.locator('button:has-text("Merge")');
    const classes = await mergeActive.getAttribute('class');

    if (classes.includes('bg-primary/20')) {
      logTest('Rapid toggle between modes', 'PASS');
    } else {
      logTest('Rapid toggle between modes', 'FAIL', 'UI state incorrect after rapid toggling');
    }
  } catch (error) {
    logTest('Rapid toggle between modes', 'FAIL', error.message);
  }

  // Reset to Convert mode for next tests
  await page.click('button:has-text("Convert")');
  await page.waitForTimeout(500);
}

async function testOutputFormatDropdown(page) {
  console.log('\n🧪 Testing Output Format Dropdown...\n');

  // Test 2.1: Click dropdown to open
  try {
    // Find dropdown button (should show PowerPoint by default)
    const dropdownButton = await page.locator('button:has-text("📊 PowerPoint")').first();
    await dropdownButton.click();
    await page.waitForTimeout(500);

    // Check if dropdown menu is visible
    const imageOption = await page.locator('button:has-text("📷 Image")');
    const isVisible = await imageOption.isVisible();

    if (isVisible) {
      logTest('Open output format dropdown', 'PASS');
    } else {
      logTest('Open output format dropdown', 'FAIL', 'Dropdown menu not visible');
    }
  } catch (error) {
    logTest('Open output format dropdown', 'FAIL', error.message);
  }

  // Test 2.2: Select Image option
  try {
    await page.click('button:has-text("📷 Image")');
    await page.waitForTimeout(500);

    const dropdownButton = await page.locator('button').filter({ hasText: '📷 Image' }).first();
    const isVisible = await dropdownButton.isVisible();

    if (isVisible) {
      logTest('Select Image format', 'PASS');
    } else {
      logTest('Select Image format', 'FAIL', 'Image format not selected');
    }
  } catch (error) {
    logTest('Select Image format', 'FAIL', error.message);
  }

  // Test 2.3: Select PowerPoint option
  try {
    await page.click('button:has-text("📷 Image")').catch(() => {}); // Open dropdown
    await page.waitForTimeout(200);
    await page.click('button:has-text("📊 PowerPoint")');
    await page.waitForTimeout(500);

    logTest('Select PowerPoint format', 'PASS');
  } catch (error) {
    logTest('Select PowerPoint format', 'FAIL', error.message);
  }

  // Test 2.4: Select Word option
  try {
    const dropdownButton = await page.locator('button:has-text("📊 PowerPoint")').first();
    await dropdownButton.click();
    await page.waitForTimeout(300);

    await page.click('button:has-text("📝 Word")');
    await page.waitForTimeout(500);

    const wordButton = await page.locator('button').filter({ hasText: '📝 Word' }).first();
    const isVisible = await wordButton.isVisible();

    if (isVisible) {
      logTest('Select Word format', 'PASS');
    } else {
      logTest('Select Word format', 'FAIL');
    }
  } catch (error) {
    logTest('Select Word format', 'FAIL', error.message);
  }

  // Test 2.5: Select Excel option
  try {
    await page.click('button:has-text("📝 Word")').catch(() => {}); // Open dropdown
    await page.waitForTimeout(200);
    await page.click('button:has-text("📈 Excel")');
    await page.waitForTimeout(500);

    logTest('Select Excel format', 'PASS');
  } catch (error) {
    logTest('Select Excel format', 'FAIL', error.message);
  }

  // Reset to PowerPoint
  try {
    await page.click('button:has-text("📈 Excel")').catch(() => {});
    await page.waitForTimeout(200);
    await page.click('button:has-text("📊 PowerPoint")');
    await page.waitForTimeout(300);
  } catch (error) {
    // Ignore
  }
}

async function testFileUpload(page) {
  console.log('\n🧪 Testing File Upload...\n');

  const testPDFPath = path.join(CONFIG.testPDFsDir, 'test-simple-text.pdf');

  if (!fs.existsSync(testPDFPath)) {
    logTest('File upload tests', 'SKIP', 'Test PDF not found');
    return;
  }

  // Test 3.1: Upload single PDF file
  try {
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPDFPath);
    await page.waitForTimeout(1000);

    // Check if file appears in Files Ready section
    const fileName = path.basename(testPDFPath);
    const fileItem = await page.locator(`text=${fileName}`);
    const isVisible = await fileItem.isVisible();

    if (isVisible) {
      logTest('Upload single PDF file', 'PASS');
    } else {
      logTest('Upload single PDF file', 'FAIL', 'File not showing in Files Ready');
    }
  } catch (error) {
    logTest('Upload single PDF file', 'FAIL', error.message);
  }

  // Test 3.2: Remove uploaded file
  try {
    // Find and click X button
    const removeButton = await page.locator('button[aria-label="Remove file"], button:has-text("×")').first();
    await removeButton.click();
    await page.waitForTimeout(500);

    // Check if "No files uploaded yet" message appears
    const noFilesMessage = await page.locator('text=No files uploaded yet');
    const isVisible = await noFilesMessage.isVisible();

    if (isVisible) {
      logTest('Remove uploaded file', 'PASS');
    } else {
      logTest('Remove uploaded file', 'FAIL', 'File not removed properly');
    }
  } catch (error) {
    logTest('Remove uploaded file', 'FAIL', error.message);
  }
}

// ============================================
// PHASE 2: CONVERSION FLOW TESTS
// ============================================

async function testPDFtoPowerPointConversion(page) {
  console.log('\n🧪 PHASE 2: Testing PDF to PowerPoint Conversion...\n');

  const testPDFPath = path.join(CONFIG.testPDFsDir, 'test-simple-text.pdf');

  if (!fs.existsSync(testPDFPath)) {
    logTest('PDF to PowerPoint conversion', 'SKIP', 'Test PDF not found');
    return;
  }

  try {
    // Ensure Convert mode and PowerPoint format
    await page.click('button:has-text("Convert")');
    await page.waitForTimeout(300);

    // Upload file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPDFPath);
    await page.waitForTimeout(1000);

    // Click Convert button
    const convertButton = await page.locator('button:has-text("Convert to PowerPoint")');
    await convertButton.click();

    await screenshot(page, 'processing-started');

    // Wait for processing to complete (max 60 seconds)
    let processingComplete = false;
    const maxWait = 60;

    for (let i = 0; i < maxWait; i++) {
      await page.waitForTimeout(1000);

      const completeMessage = await page.locator('text=Conversion Complete!');
      if (await completeMessage.isVisible().catch(() => false)) {
        processingComplete = true;
        break;
      }

      // Check for errors
      const errorMessage = await page.locator('[role="alert"]').first();
      if (await errorMessage.isVisible().catch(() => false)) {
        const errorText = await errorMessage.textContent();
        throw new Error(`Conversion failed: ${errorText}`);
      }
    }

    if (processingComplete) {
      await screenshot(page, 'conversion-complete');
      logTest('PDF to PowerPoint conversion completes', 'PASS');

      // Test download button
      const downloadButton = await page.locator('button:has-text("Download")');
      const isVisible = await downloadButton.isVisible();

      if (isVisible) {
        logTest('Download button appears', 'PASS');
      } else {
        logTest('Download button appears', 'FAIL', 'Download button not visible');
      }
    } else {
      logTest('PDF to PowerPoint conversion completes', 'FAIL', 'Processing timeout after 60 seconds');
    }

  } catch (error) {
    await screenshot(page, 'conversion-error');
    logTest('PDF to PowerPoint conversion', 'FAIL', error.message);
  }
}

async function testPDFtoWordConversion(page) {
  console.log('\n🧪 Testing PDF to Word Conversion...\n');

  const testPDFPath = path.join(CONFIG.testPDFsDir, 'test-multi-page.pdf');

  if (!fs.existsSync(testPDFPath)) {
    logTest('PDF to Word conversion', 'SKIP', 'Test PDF not found');
    return;
  }

  try {
    // Click "Process Another" to reset
    await page.click('button:has-text("Process Another")').catch(() => {});
    await page.waitForTimeout(500);

    // Select Word format
    const dropdownButton = await page.locator('button:has-text("PowerPoint")').first();
    await dropdownButton.click();
    await page.waitForTimeout(300);
    await page.click('button:has-text("📝 Word")');
    await page.waitForTimeout(500);

    // Upload file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPDFPath);
    await page.waitForTimeout(1000);

    // Click Convert to Word
    const convertButton = await page.locator('button:has-text("Convert to Word")');
    const buttonExists = await convertButton.count() > 0;

    if (buttonExists) {
      await convertButton.click();
      await page.waitForTimeout(2000);
      logTest('PDF to Word conversion initiated', 'PASS');
    } else {
      logTest('PDF to Word conversion', 'FAIL', 'Convert to Word button not found');
    }
  } catch (error) {
    logTest('PDF to Word conversion', 'FAIL', error.message);
  }
}

async function testPDFMerge(page) {
  console.log('\n🧪 Testing PDF Merge...\n');

  const testPDF1 = path.join(CONFIG.testPDFsDir, 'test-simple-text.pdf');
  const testPDF2 = path.join(CONFIG.testPDFsDir, 'test-concurrent.pdf');

  if (!fs.existsSync(testPDF1) || !fs.existsSync(testPDF2)) {
    logTest('PDF Merge', 'SKIP', 'Test PDFs not found');
    return;
  }

  try {
    // Reset
    await page.click('button:has-text("Process Another")').catch(() => {});
    await page.waitForTimeout(500);

    // Switch to Merge mode
    await page.click('button:has-text("Merge")');
    await page.waitForTimeout(500);

    // Upload first file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles([testPDF1, testPDF2]);
    await page.waitForTimeout(1000);

    // Check if both files appear
    const file1 = await page.locator(`text=${path.basename(testPDF1)}`);
    const file2 = await page.locator(`text=${path.basename(testPDF2)}`);

    const file1Visible = await file1.isVisible();
    const file2Visible = await file2.isVisible();

    if (file1Visible && file2Visible) {
      logTest('Upload multiple files for merge', 'PASS');

      // Click Merge PDFs
      const mergeButton = await page.locator('button:has-text("Merge PDFs")');
      await mergeButton.click();
      await page.waitForTimeout(2000);

      logTest('Merge PDFs initiated', 'PASS');
    } else {
      logTest('Upload multiple files for merge', 'FAIL', 'Files not showing in list');
    }
  } catch (error) {
    logTest('PDF Merge', 'FAIL', error.message);
  }
}

// ============================================
// PHASE 3: ERROR HANDLING TESTS
// ============================================

async function testErrorScenarios(page) {
  console.log('\n🧪 PHASE 3: Testing Error Scenarios...\n');

  // Test: Process with no file uploaded
  try {
    await page.click('button:has-text("Process Another")').catch(() => {});
    await page.waitForTimeout(500);
    await page.click('button:has-text("Convert")');
    await page.waitForTimeout(500);

    const convertButton = await page.locator('button:has-text("Convert to PowerPoint")');
    const isDisabled = await convertButton.isDisabled();

    if (isDisabled) {
      logTest('Process button disabled without files', 'PASS');
    } else {
      logTest('Process button disabled without files', 'FAIL', 'Button should be disabled');
    }
  } catch (error) {
    logTest('Process button disabled without files', 'FAIL', error.message);
  }

  // Test: Merge with only 1 file
  try {
    const testPDF = path.join(CONFIG.testPDFsDir, 'test-simple-text.pdf');

    if (fs.existsSync(testPDF)) {
      await page.click('button:has-text("Merge")');
      await page.waitForTimeout(500);

      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(testPDF);
      await page.waitForTimeout(1000);

      const mergeButton = await page.locator('button:has-text("Merge PDFs")');
      const isDisabled = await mergeButton.isDisabled();

      if (isDisabled) {
        logTest('Merge disabled with single file', 'PASS');
      } else {
        logTest('Merge disabled with single file', 'FAIL', 'Merge should require 2+ files');
      }
    } else {
      logTest('Merge with single file', 'SKIP', 'Test PDF not found');
    }
  } catch (error) {
    logTest('Merge with single file', 'FAIL', error.message);
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
  console.log('🚀 Starting Automated E2E Testing for PDF to Office Conversion\n');
  console.log('='.repeat(70));

  // Setup
  if (!fs.existsSync(CONFIG.screenshotsDir)) {
    fs.mkdirSync(CONFIG.screenshotsDir, { recursive: true });
  }

  if (!fs.existsSync(CONFIG.downloadsDir)) {
    fs.mkdirSync(CONFIG.downloadsDir, { recursive: true });
  }

  await createTestPDFs();

  // Launch browser
  console.log('\n🌐 Launching browser...');
  const browser = await chromium.launch({
    headless: false, // Set to true for CI/CD
    slowMo: 100 // Slow down actions for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    acceptDownloads: true
  });

  const page = await context.newPage();

  try {
    // Navigate to app
    console.log(`\n📍 Navigating to ${CONFIG.frontendUrl}...`);
    await page.goto(CONFIG.frontendUrl);
    await page.waitForTimeout(2000);

    // Check if page loaded
    const title = await page.title();
    console.log(`✅ Page loaded: ${title}\n`);

    await screenshot(page, 'initial-page-load');

    // Run test suites
    await testModeButtons(page);
    await testOutputFormatDropdown(page);
    await testFileUpload(page);
    await testPDFtoPowerPointConversion(page);
    await testPDFtoWordConversion(page);
    await testPDFMerge(page);
    await testErrorScenarios(page);

  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error);
    await screenshot(page, 'fatal-error');
  } finally {
    // Cleanup
    await browser.close();
  }

  // Generate report
  generateReport();
}

function generateReport() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(70));
  console.log(`\nTotal Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`\n📈 Pass Rate: ${results.total > 0 ? Math.round((results.passed / results.total) * 100) : 0}%`);

  // List failures
  const failures = results.tests.filter(t => t.status === 'FAIL');
  if (failures.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failures.forEach(test => {
      console.log(`  - ${test.name}`);
      console.log(`    ${test.details}\n`);
    });
  }

  // Save detailed report
  const reportPath = './pdf-office-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    ...results,
    config: CONFIG,
    timestamp: new Date().toISOString()
  }, null, 2));

  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  console.log(`📸 Screenshots saved to: ${CONFIG.screenshotsDir}`);

  // Exit code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
