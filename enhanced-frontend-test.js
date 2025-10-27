/**
 * Enhanced Frontend E2E Test for PDF Conversions
 * Tests: Upload PDF → Select Format → Convert → Download
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3015';
const TEST_PDF = path.join(__dirname, 'simple-test.pdf');

async function testPDFConversion() {
  console.log('\n🚀 Starting Enhanced Frontend E2E Test...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 800  // Slower for visibility
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Track API calls
  const apiCalls = [];
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/')) {
      const status = response.status();
      apiCalls.push({ url, status });
      console.log(`🌐 API Call: ${status} - ${url}`);

      if (status !== 200) {
        try {
          const body = await response.text();
          console.log(`   ❌ Response: ${body.substring(0, 300)}`);
        } catch (e) {}
      }
    }
  });

  // Track console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ Browser Error: ${msg.text()}`);
    }
  });

  try {
    // Step 1: Navigate
    console.log('📍 Step 1: Navigating to frontend...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 10000 });
    console.log('✅ Frontend loaded');
    await page.waitForTimeout(2000);

    // Step 2: Upload PDF
    console.log('\n📍 Step 2: Uploading PDF...');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_PDF);
    console.log('✅ PDF uploaded');
    await page.waitForTimeout(1500);

    // Step 3: Select format - Try multiple approaches
    console.log('\n📍 Step 3: Selecting PowerPoint format...');

    // Take screenshot to see UI
    await page.screenshot({ path: 'step3-before-format-selection.png', fullPage: true });

    // Try clicking PowerPoint tab/button
    const formatOptions = [
      // Tab selectors
      'button[role="tab"]:has-text("PowerPoint")',
      'button[role="tab"]:has-text("PPT")',
      '[data-state="inactive"]:has-text("PowerPoint")',

      // Button selectors
      'button:has-text("PowerPoint")',
      'button:has-text("PPT")',
      '.format-option:has-text("PowerPoint")',

      // Radio/checkbox selectors
      'input[value="ppt"]',
      'input[value="powerpoint"]',
      'input[type="radio"][id*="ppt"]',

      // Dropdown
      'select[name="format"]',
      'select option[value="ppt"]'
    ];

    let formatFound = false;
    for (const selector of formatOptions) {
      try {
        const elements = await page.locator(selector).all();

        if (elements.length > 0) {
          console.log(`   Found format option: ${selector} (${elements.length} matches)`);

          if (selector.includes('select')) {
            await page.selectOption(selector.replace(' option[value="ppt"]', ''), 'ppt');
          } else if (selector.includes('input')) {
            await elements[0].check();
          } else {
            await elements[0].click();
          }

          formatFound = true;
          console.log('✅ PowerPoint format selected');
          await page.waitForTimeout(1000);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!formatFound) {
      console.log('⚠️  No format selector found - might be auto-selected');
    }

    await page.screenshot({ path: 'step3-after-format-selection.png', fullPage: true });

    // Step 4: Click Convert
    console.log('\n📍 Step 4: Clicking Convert button...');

    const convertSelectors = [
      'button:has-text("Convert to PowerPoint")',
      'button:has-text("Convert to PPT")',
      'button:has-text("Convert")',
      'button[type="submit"]:has-text("Convert")',
      '[data-testid="convert-button"]',
      'button.convert-btn',
      'button[aria-label*="Convert"]'
    ];

    let convertClicked = false;
    for (const selector of convertSelectors) {
      try {
        const elements = await page.locator(selector).all();

        if (elements.length > 0) {
          console.log(`   Found convert button: ${selector}`);

          // Check if button is disabled
          const isDisabled = await elements[0].isDisabled().catch(() => false);

          if (isDisabled) {
            console.log(`   ⚠️  Button is disabled!`);
            continue;
          }

          await elements[0].click();
          convertClicked = true;
          console.log('✅ Convert button clicked');
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!convertClicked) {
      console.log('❌ Could not find or click convert button');
      await page.screenshot({ path: 'error-no-convert-button.png', fullPage: true });
      return { success: false, reason: 'No convert button' };
    }

    // Step 5: Wait for conversion
    console.log('\n📍 Step 5: Waiting for conversion...');

    await page.waitForTimeout(2000);

    // Check if API was called
    const conversionAPICalls = apiCalls.filter(call => call.url.includes('/convert'));

    if (conversionAPICalls.length === 0) {
      console.log('❌ NO API call was made to conversion endpoint!');
      console.log('   This means the frontend is not calling the backend.');
      await page.screenshot({ path: 'error-no-api-call.png', fullPage: true });
      return { success: false, reason: 'No API call made' };
    }

    console.log(`✅ Conversion API called ${conversionAPICalls.length} time(s)`);

    // Wait for success/error message
    try {
      await page.waitForSelector(
        '[data-testid="success"], [data-testid="error"], .success, .error, [role="alert"]',
        { timeout: 30000 }
      );

      const hasError = await page.locator('.error, [data-testid="error"], [role="alert"][class*="error"]').count() > 0;

      if (hasError) {
        const errorText = await page.locator('.error, [data-testid="error"]').first().textContent().catch(() => 'Unknown error');
        console.log(`❌ Conversion failed: ${errorText}`);
        await page.screenshot({ path: 'conversion-failed.png', fullPage: true });
        return { success: false, reason: errorText };
      } else {
        console.log('✅ Conversion succeeded!');
        await page.screenshot({ path: 'conversion-success.png', fullPage: true });
        return { success: true, apiCalls: conversionAPICalls };
      }

    } catch (e) {
      console.log('⏱️  Timeout waiting for result');
      await page.screenshot({ path: 'conversion-timeout.png', fullPage: true });
      return { success: false, reason: 'Timeout' };
    }

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
    return { success: false, reason: error.message };

  } finally {
    console.log('\n📸 Screenshots saved in project root');
    console.log(`📊 Total API calls: ${apiCalls.length}`);
    apiCalls.forEach(call => console.log(`   - ${call.status} ${call.url}`));

    await page.waitForTimeout(2000);
    await browser.close();
  }
}

// Run
(async () => {
  // Create test PDF if needed
  if (!fs.existsSync(TEST_PDF)) {
    console.log('📄 Creating test PDF...');
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(TEST_PDF));
    doc.fontSize(20).text('Test PDF', 100, 100);
    doc.end();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const result = await testPDFConversion();

  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST RESULTS:');
  console.log('='.repeat(60));
  console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (!result.success) {
    console.log(`Reason: ${result.reason}`);
  }
  console.log('='.repeat(60) + '\n');

  process.exit(result.success ? 0 : 1);
})();
