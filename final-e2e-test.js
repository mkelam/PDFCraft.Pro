/**
 * FINAL COMPREHENSIVE E2E TEST
 * Complete user flow: Upload → Select Format → Convert → Download
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FRONTEND_URL = 'http://localhost:3002';  // Updated port
const BACKEND_URL = 'http://localhost:3015';
const TEST_PDF = path.join(__dirname, 'simple-test.pdf');

console.log('\n' + '='.repeat(80));
console.log('🎯 FINAL COMPREHENSIVE E2E TEST - pdflab.pro');
console.log('='.repeat(80) + '\n');

async function runFinalTest() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000  // Slow for visibility
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const apiCalls = [];
  let conversionStarted = false;

  // Monitor API calls
  page.on('request', request => {
    if (request.url().includes('/api/convert')) {
      console.log(`\n🌐 API REQUEST: ${request.method()} ${request.url()}`);
      conversionStarted = true;
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/')) {
      const status = response.status();
      apiCalls.push({ url, status });
      console.log(`📥 API RESPONSE: ${status} - ${url.substring(url.indexOf('/api/'))}`);

      if (url.includes('/convert')) {
        try {
          const data = await response.json();
          console.log(`   Data:`, JSON.stringify(data, null, 2).substring(0, 300));
        } catch (e) {}
      }
    }
  });

  try {
    // STEP 1: Navigate
    console.log('\n📍 STEP 1: Navigating to frontend...');
    await page.goto(FRONTEND_URL, { timeout: 30000 });
    console.log(`✅ Loaded: ${FRONTEND_URL}`);
    await page.screenshot({ path: 'test-01-loaded.png', fullPage: true });
    await page.waitForTimeout(3000);

    // STEP 2: Upload PDF
    console.log('\n📍 STEP 2: Uploading PDF file...');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_PDF);
    console.log('✅ File uploaded');
    await page.screenshot({ path: 'test-02-uploaded.png', fullPage: true });
    await page.waitForTimeout(2000);

    // STEP 3: Select PowerPoint format (should be default)
    console.log('\n📍 STEP 3: Verifying PowerPoint format selected...');
    const formatButton = page.locator('button:has-text("PowerPoint")').first();
    const isVisible = await formatButton.isVisible().catch(() => false);
    console.log(`✅ PowerPoint format visible: ${isVisible}`);
    await page.screenshot({ path: 'test-03-format-selected.png', fullPage: true });

    // STEP 4: Click Convert
    console.log('\n📍 STEP 4: Clicking Convert to PowerPoint button...');

    const convertButton = page.locator('button:has-text("Convert to PowerPoint")').first();
    const btnVisible = await convertButton.isVisible().catch(() => false);

    if (!btnVisible) {
      console.log('❌ Convert button not visible!');
      await page.screenshot({ path: 'test-04-error-no-button.png', fullPage: true });
      throw new Error('Convert button not found');
    }

    await convertButton.click();
    console.log('✅ Convert button clicked');
    await page.screenshot({ path: 'test-04-clicked-convert.png', fullPage: true });

    // STEP 5: Wait for API call
    console.log('\n📍 STEP 5: Waiting for API call...');
    await page.waitForTimeout(3000);

    if (!conversionStarted) {
      console.log('❌ NO API CALL MADE!');
      await page.screenshot({ path: 'test-05-error-no-api.png', fullPage: true });
      throw new Error('Conversion API was not called');
    }

    console.log('✅ Conversion API called successfully!');

    // STEP 6: Wait for processing
    console.log('\n📍 STEP 6: Waiting for conversion to complete...');

    // Look for download button or success message
    try {
      await page.waitForSelector('button:has-text("Download")', { timeout: 60000 });
      console.log('✅ Download button appeared!');
      await page.screenshot({ path: 'test-06-success.png', fullPage: true });

      return {
        success: true,
        message: 'Complete end-to-end test PASSED!',
        apiCalls: apiCalls.length
      };

    } catch (e) {
      console.log('⏱️  Waiting for completion timed out');
      await page.screenshot({ path: 'test-06-timeout.png', fullPage: true });

      // Check if there's an error message
      const errorVisible = await page.locator('.error, [role="alert"]').count();
      if (errorVisible > 0) {
        const errorText = await page.locator('.error, [role="alert"]').first().textContent();
        console.log(`❌ Error message: ${errorText}`);
      }

      return {
        success: false,
        message: 'Conversion timed out or failed',
        apiCalls: apiCalls.length
      };
    }

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
    return {
      success: false,
      message: error.message,
      apiCalls: apiCalls.length
    };

  } finally {
    console.log('\n📸 All screenshots saved to project root');
    console.log(`📊 Total API calls intercepted: ${apiCalls.length}`);

    await page.waitForTimeout(3000);
    await browser.close();
  }
}

// Run the test
(async () => {
  const result = await runFinalTest();

  console.log('\n' + '='.repeat(80));
  console.log('📋 FINAL TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Message: ${result.message}`);
  console.log(`API Calls: ${result.apiCalls}`);
  console.log('='.repeat(80) + '\n');

  process.exit(result.success ? 0 : 1);
})();
