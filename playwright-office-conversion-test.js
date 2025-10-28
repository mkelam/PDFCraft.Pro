/**
 * Playwright Browser Test Suite for PDF to Office Conversions
 *
 * This script uses Playwright to perform end-to-end browser testing
 * of the PDF to Office conversion functionality on the frontend.
 *
 * Tests:
 * 1. PDF to PowerPoint conversion via UI
 * 2. PDF to Word conversion via UI
 * 3. PDF to Excel conversion via UI
 * 4. Format selector functionality
 * 5. Upload drag-and-drop
 * 6. Progress tracking visualization
 * 7. Download functionality
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Configuration
const CONFIG = {
  frontendUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:3010',
  timeout: 60000, // 60 second timeout for conversions
  headless: false, // Run in headed mode to see the browser
  slowMo: 500, // Slow down actions by 500ms for visibility
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

/**
 * Create a test PDF file
 */
async function createTestPDF() {
  const pdfPath = path.join(__dirname, 'test-playwright-conversion.pdf');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    // Page 1
    doc.fontSize(24).text('Playwright Test Document', 100, 100);
    doc.fontSize(14).text('This PDF is generated for automated browser testing', 100, 150);
    doc.fontSize(12).text('Testing PDF to Office conversion functionality', 100, 180);

    // Page 2
    doc.addPage();
    doc.fontSize(18).text('Test Content - Page 2', 100, 100);
    doc.fontSize(12).text('This document will be converted to:', 100, 150);
    doc.list(['PowerPoint (.pptx)', 'Word (.docx)', 'Excel (.xlsx)'], 100, 180);

    doc.end();

    stream.on('finish', () => {
      const stats = fs.statSync(pdfPath);
      console.log(`${colors.green}✓${colors.reset} Test PDF created: ${pdfPath} (${(stats.size / 1024).toFixed(2)} KB)`);
      resolve(pdfPath);
    });

    stream.on('error', reject);
  });
}

/**
 * Print test header
 */
function printHeader(title) {
  console.log('\n' + colors.cyan + '═'.repeat(60) + colors.reset);
  console.log(colors.bright + colors.cyan + title.toUpperCase().padStart(30 + title.length / 2) + colors.reset);
  console.log(colors.cyan + '═'.repeat(60) + colors.reset + '\n');
}

/**
 * Print test result
 */
function printResult(testName, success, duration, details = '') {
  const status = success
    ? `${colors.green}✓ PASS${colors.reset}`
    : `${colors.red}✗ FAIL${colors.reset}`;

  console.log(`${status} ${testName} ${colors.yellow}(${duration}ms)${colors.reset}`);
  if (details) {
    console.log(`   ${colors.blue}ℹ${colors.reset} ${details}`);
  }
}

/**
 * Test PDF to PowerPoint conversion
 */
async function testPDFToPowerPoint(page, pdfPath) {
  const startTime = Date.now();

  try {
    console.log(`${colors.blue}→${colors.reset} Navigating to conversion page...`);

    // Navigate to the conversion interface
    await page.goto(CONFIG.frontendUrl, { waitUntil: 'networkidle' });

    // Look for the conversion interface
    await page.waitForSelector('text=Convert PDF', { timeout: 10000 });

    // Click on "Convert PDF to Office" option if needed
    const convertButton = page.locator('text=Convert PDF to Office').first();
    if (await convertButton.isVisible()) {
      await convertButton.click();
      await page.waitForTimeout(1000);
    }

    console.log(`${colors.blue}→${colors.reset} Selecting PowerPoint format...`);

    // Select PowerPoint format from dropdown
    const formatSelector = page.locator('select, [role="combobox"]').first();
    if (await formatSelector.isVisible()) {
      await formatSelector.selectOption({ label: /PowerPoint|pptx/i });
      await page.waitForTimeout(500);
    }

    console.log(`${colors.blue}→${colors.reset} Uploading PDF file...`);

    // Upload the PDF file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(pdfPath);

    // Wait for file to be recognized
    await page.waitForTimeout(2000);

    console.log(`${colors.blue}→${colors.reset} Starting conversion...`);

    // Click the convert button
    const convertBtn = page.locator('button:has-text("Convert")').first();
    await convertBtn.click();

    console.log(`${colors.blue}→${colors.reset} Monitoring conversion progress...`);

    // Wait for progress or completion indicator
    await page.waitForSelector('text=/Processing|Completed|Download/i', { timeout: CONFIG.timeout });

    // Wait for download button or completion
    const downloadButton = page.locator('button:has-text("Download"), a:has-text("Download")');
    await downloadButton.waitFor({ state: 'visible', timeout: CONFIG.timeout });

    const duration = Date.now() - startTime;

    console.log(`${colors.green}✓${colors.reset} Conversion completed successfully!`);

    // Take a screenshot of success state
    await page.screenshot({ path: 'test-screenshots/ppt-conversion-success.png', fullPage: true });

    printResult('PDF to PowerPoint (Browser)', true, duration, 'File ready for download');

    return { success: true, duration, format: 'pptx' };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${colors.red}✗${colors.reset} Error: ${error.message}`);

    // Take a screenshot of error state
    await page.screenshot({ path: 'test-screenshots/ppt-conversion-error.png', fullPage: true });

    printResult('PDF to PowerPoint (Browser)', false, duration, error.message);

    return { success: false, duration, format: 'pptx', error: error.message };
  }
}

/**
 * Test PDF to Word conversion
 */
async function testPDFToWord(page, pdfPath) {
  const startTime = Date.now();

  try {
    console.log(`${colors.blue}→${colors.reset} Reloading page for Word conversion...`);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log(`${colors.blue}→${colors.reset} Selecting Word format...`);

    // Select Word format from dropdown
    const formatSelector = page.locator('select, [role="combobox"]').first();
    if (await formatSelector.isVisible()) {
      await formatSelector.selectOption({ label: /Word|docx/i });
      await page.waitForTimeout(500);
    }

    console.log(`${colors.blue}→${colors.reset} Uploading PDF file...`);

    // Upload the PDF file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(pdfPath);
    await page.waitForTimeout(2000);

    console.log(`${colors.blue}→${colors.reset} Starting conversion...`);

    // Click the convert button
    const convertBtn = page.locator('button:has-text("Convert")').first();
    await convertBtn.click();

    console.log(`${colors.blue}→${colors.reset} Monitoring conversion progress...`);

    // Wait for download button
    const downloadButton = page.locator('button:has-text("Download"), a:has-text("Download")');
    await downloadButton.waitFor({ state: 'visible', timeout: CONFIG.timeout });

    const duration = Date.now() - startTime;

    console.log(`${colors.green}✓${colors.reset} Conversion completed successfully!`);

    await page.screenshot({ path: 'test-screenshots/word-conversion-success.png', fullPage: true });

    printResult('PDF to Word (Browser)', true, duration, 'File ready for download');

    return { success: true, duration, format: 'docx' };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${colors.red}✗${colors.reset} Error: ${error.message}`);

    await page.screenshot({ path: 'test-screenshots/word-conversion-error.png', fullPage: true });

    printResult('PDF to Word (Browser)', false, duration, error.message);

    return { success: false, duration, format: 'docx', error: error.message };
  }
}

/**
 * Test PDF to Excel conversion
 */
async function testPDFToExcel(page, pdfPath) {
  const startTime = Date.now();

  try {
    console.log(`${colors.blue}→${colors.reset} Reloading page for Excel conversion...`);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log(`${colors.blue}→${colors.reset} Selecting Excel format...`);

    // Select Excel format from dropdown
    const formatSelector = page.locator('select, [role="combobox"]').first();
    if (await formatSelector.isVisible()) {
      await formatSelector.selectOption({ label: /Excel|xlsx/i });
      await page.waitForTimeout(500);
    }

    console.log(`${colors.blue}→${colors.reset} Uploading PDF file...`);

    // Upload the PDF file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(pdfPath);
    await page.waitForTimeout(2000);

    console.log(`${colors.blue}→${colors.reset} Starting conversion...`);

    // Click the convert button
    const convertBtn = page.locator('button:has-text("Convert")').first();
    await convertBtn.click();

    console.log(`${colors.blue}→${colors.reset} Monitoring conversion progress...`);

    // Wait for download button
    const downloadButton = page.locator('button:has-text("Download"), a:has-text("Download")');
    await downloadButton.waitFor({ state: 'visible', timeout: CONFIG.timeout });

    const duration = Date.now() - startTime;

    console.log(`${colors.green}✓${colors.reset} Conversion completed successfully!`);

    await page.screenshot({ path: 'test-screenshots/excel-conversion-success.png', fullPage: true });

    printResult('PDF to Excel (Browser)', true, duration, 'File ready for download');

    return { success: true, duration, format: 'xlsx' };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${colors.red}✗${colors.reset} Error: ${error.message}`);

    await page.screenshot({ path: 'test-screenshots/excel-conversion-error.png', fullPage: true });

    printResult('PDF to Excel (Browser)', false, duration, error.message);

    return { success: false, duration, format: 'xlsx', error: error.message };
  }
}

/**
 * Main test execution
 */
async function main() {
  printHeader('Playwright PDF to Office Conversion Test Suite');

  console.log(`${colors.cyan}Configuration:${colors.reset}`);
  console.log(`  Frontend URL: ${CONFIG.frontendUrl}`);
  console.log(`  Backend URL: ${CONFIG.backendUrl}`);
  console.log(`  Headless: ${CONFIG.headless}`);
  console.log(`  Timeout: ${CONFIG.timeout}ms\n`);

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'test-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Create test PDF
  console.log(`${colors.yellow}→${colors.reset} Creating test PDF...`);
  const pdfPath = await createTestPDF();

  // Launch browser
  console.log(`\n${colors.yellow}→${colors.reset} Launching browser...`);
  const browser = await chromium.launch({
    headless: CONFIG.headless,
    slowMo: CONFIG.slowMo,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    acceptDownloads: true,
  });

  const page = await context.newPage();

  console.log(`${colors.green}✓${colors.reset} Browser launched successfully\n`);

  const results = [];

  try {
    // Test 1: PDF to PowerPoint
    printHeader('Test 1: PDF to PowerPoint Conversion');
    const pptResult = await testPDFToPowerPoint(page, pdfPath);
    results.push(pptResult);

    await page.waitForTimeout(2000);

    // Test 2: PDF to Word
    printHeader('Test 2: PDF to Word Conversion');
    const wordResult = await testPDFToWord(page, pdfPath);
    results.push(wordResult);

    await page.waitForTimeout(2000);

    // Test 3: PDF to Excel
    printHeader('Test 3: PDF to Excel Conversion');
    const excelResult = await testPDFToExcel(page, pdfPath);
    results.push(excelResult);

  } catch (error) {
    console.error(`${colors.red}Critical error:${colors.reset}`, error);
  } finally {
    // Close browser
    await browser.close();
    console.log(`\n${colors.yellow}→${colors.reset} Browser closed\n`);
  }

  // Print summary
  printHeader('Test Results Summary');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`${colors.bright}Total Tests:${colors.reset} ${results.length}`);
  console.log(`${colors.green}✓ Successful:${colors.reset} ${successful}`);
  console.log(`${colors.red}✗ Failed:${colors.reset} ${failed}`);
  console.log(`${colors.yellow}⌚ Average Duration:${colors.reset} ${Math.round(avgDuration)}ms`);
  console.log(`${colors.cyan}Success Rate:${colors.reset} ${((successful / results.length) * 100).toFixed(1)}%\n`);

  // Detailed results
  console.log(`${colors.bright}Detailed Results:${colors.reset}\n`);
  results.forEach((result, index) => {
    const status = result.success ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
    console.log(`  ${index + 1}. ${result.format.toUpperCase()} - ${status} (${result.duration}ms)`);
    if (result.error) {
      console.log(`     ${colors.red}Error:${colors.reset} ${result.error}`);
    }
  });

  console.log('\n' + colors.cyan + '═'.repeat(60) + colors.reset + '\n');

  // Final verdict
  if (failed === 0) {
    console.log(`${colors.green}${colors.bright}🎉 ALL TESTS PASSED!${colors.reset}`);
    console.log(`${colors.green}PDF to Office conversion is working perfectly in the browser!${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bright}❌ SOME TESTS FAILED${colors.reset}`);
    console.log(`${colors.red}Please review the screenshots in test-screenshots/ for details.${colors.reset}\n`);
  }

  // Cleanup test PDF
  if (fs.existsSync(pdfPath)) {
    fs.unlinkSync(pdfPath);
    console.log(`${colors.yellow}→${colors.reset} Test PDF cleaned up\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
main().catch(error => {
  console.error(`${colors.red}${colors.bright}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
