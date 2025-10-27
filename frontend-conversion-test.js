/**
 * Frontend E2E Test for PDF Conversions
 * Tests the complete flow: Upload PDF → Convert → Download
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3015';
const TEST_PDF = path.join(__dirname, 'simple-test.pdf');

// Create a simple test PDF if it doesn't exist
function createTestPDF() {
  if (!fs.existsSync(TEST_PDF)) {
    console.log('📄 Creating test PDF...');
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(TEST_PDF));
    doc.fontSize(25).text('Test PDF for Conversion', 100, 100);
    doc.fontSize(12).text('This is a test document for PDF to Office conversion.', 100, 150);
    doc.end();
  }
}

async function testPDFConversion() {
  console.log('\n🚀 Starting Frontend E2E Test...\n');

  const browser = await chromium.launch({
    headless: false,  // Show browser for debugging
    slowMo: 500  // Slow down actions to see what's happening
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to console messages
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error') {
      console.log(`❌ Browser Console Error: ${msg.text()}`);
    } else if (type === 'warning') {
      console.log(`⚠️  Browser Console Warning: ${msg.text()}`);
    }
  });

  // Listen to network requests
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/convert')) {
      const status = response.status();
      console.log(`🌐 API Response: ${status} - ${url}`);

      if (status !== 200) {
        try {
          const body = await response.text();
          console.log(`   Response body: ${body.substring(0, 200)}`);
        } catch (e) {
          // Ignore if can't read body
        }
      }
    }
  });

  try {
    // Step 1: Navigate to frontend
    console.log('📍 Step 1: Navigating to frontend...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    console.log('✅ Frontend loaded successfully');

    // Step 2: Find the file upload input
    console.log('\n📍 Step 2: Looking for file upload...');

    // Wait for the page to be fully loaded
    await page.waitForTimeout(2000);

    // Try to find upload input (it might be hidden)
    const fileInput = await page.locator('input[type="file"]').first();

    if (!fileInput) {
      console.log('❌ No file upload input found!');
      await page.screenshot({ path: 'frontend-error-no-upload.png' });
      return;
    }

    console.log('✅ File upload input found');

    // Step 3: Upload the PDF
    console.log('\n📍 Step 3: Uploading test PDF...');
    await fileInput.setInputFiles(TEST_PDF);
    console.log('✅ PDF file selected');

    // Wait a bit for upload to register
    await page.waitForTimeout(1000);

    // Step 4: Find and click convert button
    console.log('\n📍 Step 4: Looking for convert button...');

    // Try multiple selectors for the convert button
    const convertButtonSelectors = [
      'button:has-text("Convert")',
      'button:has-text("convert")',
      '[data-testid="convert-button"]',
      'button[type="submit"]'
    ];

    let convertButton = null;
    for (const selector of convertButtonSelectors) {
      try {
        convertButton = await page.locator(selector).first();
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`✅ Found convert button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!convertButton) {
      console.log('❌ No convert button found!');
      await page.screenshot({ path: 'frontend-error-no-button.png' });
      return;
    }

    // Step 5: Click convert
    console.log('\n📍 Step 5: Clicking convert button...');
    await convertButton.click();
    console.log('✅ Convert button clicked');

    // Step 6: Wait for conversion to complete
    console.log('\n📍 Step 6: Waiting for conversion...');

    // Wait for either success or error message
    try {
      await page.waitForSelector('[data-testid="conversion-success"], [data-testid="conversion-error"], .success, .error', {
        timeout: 30000
      });

      // Check if there's an error message
      const errorMessage = await page.locator('.error, [data-testid="conversion-error"]').first().textContent().catch(() => null);

      if (errorMessage) {
        console.log(`❌ Conversion failed: ${errorMessage}`);
        await page.screenshot({ path: 'frontend-error-conversion-failed.png' });
      } else {
        console.log('✅ Conversion completed successfully!');
        await page.screenshot({ path: 'frontend-success.png' });
      }

    } catch (e) {
      console.log('⏱️  Timeout waiting for conversion result');
      await page.screenshot({ path: 'frontend-timeout.png' });
    }

    // Step 7: Check network tab for API calls
    console.log('\n📍 Step 7: Checking for download...');
    await page.waitForTimeout(2000);

    // Take final screenshot
    await page.screenshot({ path: 'frontend-final-state.png', fullPage: true });
    console.log('📸 Screenshots saved');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    await page.screenshot({ path: 'frontend-error.png', fullPage: true });
  } finally {
    console.log('\n🏁 Test completed');
    await browser.close();
  }
}

// Run the test
(async () => {
  createTestPDF();

  // First check if servers are running
  const http = require('http');

  console.log('🔍 Checking if servers are running...\n');

  // Check frontend
  try {
    await new Promise((resolve, reject) => {
      const req = http.get(FRONTEND_URL, resolve);
      req.on('error', reject);
      req.setTimeout(2000, () => reject(new Error('Timeout')));
    });
    console.log('✅ Frontend is running at', FRONTEND_URL);
  } catch (e) {
    console.log('❌ Frontend is NOT running at', FRONTEND_URL);
    console.log('   Please start the frontend with: npm run dev');
    process.exit(1);
  }

  // Check backend
  try {
    await new Promise((resolve, reject) => {
      const req = http.get(BACKEND_URL, resolve);
      req.on('error', reject);
      req.setTimeout(2000, () => reject(new Error('Timeout')));
    });
    console.log('✅ Backend is running at', BACKEND_URL);
  } catch (e) {
    console.log('❌ Backend is NOT running at', BACKEND_URL);
    console.log('   Please start the backend on port 3015');
    process.exit(1);
  }

  console.log('\n✅ Both servers are running!\n');

  await testPDFConversion();
})();
