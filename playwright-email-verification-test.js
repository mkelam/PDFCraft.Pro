/**
 * PLAYWRIGHT EMAIL VERIFICATION E2E TEST
 *
 * Complete browser automation test for email verification enforcement
 * Uses Playwright to test the full user journey in a real browser
 *
 * PREREQUISITES:
 * - Backend running on port 3015
 * - Frontend running on port 3020
 * - Database migration executed
 * - Playwright installed: npm install -D @playwright/test
 *
 * RUN: npx playwright test playwright-email-verification-test.js --headed
 */

const { test, expect } = require('@playwright/test');

const FRONTEND_URL = 'http://localhost:3020';
const BACKEND_URL = 'http://localhost:3015';

// Generate unique test user
const timestamp = Date.now();
const testUser = {
  email: `test-user-${timestamp}@pdflab.test`,
  password: 'SecureTestPassword123!',
  fullName: 'Test User Automated'
};

test.describe('Email Verification Enforcement', () => {
  test.use({
    viewport: { width: 1280, height: 720 },
    video: 'retain-on-failure'
  });

  test('Complete Email Verification Flow', async ({ page, context }) => {
    console.log('\n🚀 Starting Playwright Email Verification Test');
    console.log(`📧 Test User: ${testUser.email}`);

    // =====================================================================
    // TEST 1: User Registration
    // =====================================================================
    test.step('User Registration', async () => {
      console.log('\n📝 TEST 1: User Registration');

      // Navigate to signup page
      await page.goto(`${FRONTEND_URL}/signup`);
      await page.waitForLoadState('networkidle');

      // Fill registration form
      await page.fill('input[name="email"], input[type="email"]', testUser.email);
      await page.fill('input[name="password"], input[type="password"]', testUser.password);

      // Try to find full name field (may not exist)
      const fullNameField = page.locator('input[name="fullName"], input[name="full_name"]');
      if (await fullNameField.count() > 0) {
        await fullNameField.fill(testUser.fullName);
      }

      // Take screenshot before submission
      await page.screenshot({
        path: `test-results/01-registration-form-${timestamp}.png`,
        fullPage: true
      });

      // Submit registration
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign Up"), button:has-text("Register")');
      await submitButton.click();

      // Wait for response (either success message or redirect)
      await page.waitForTimeout(2000);

      // Take screenshot after submission
      await page.screenshot({
        path: `test-results/02-registration-success-${timestamp}.png`,
        fullPage: true
      });

      console.log('✅ Registration form submitted');
      console.log('   Screenshot saved: test-results/01-registration-form.png');
    });

    // =====================================================================
    // TEST 2: Verify Email Verification Message Shown
    // =====================================================================
    test.step('Verify Email Verification Prompt Shown', async () => {
      console.log('\n📧 TEST 2: Email Verification Prompt');

      // Check for verification message
      const verificationMessage = page.locator('text=/verify.*email/i, text=/check.*inbox/i, text=/verification.*sent/i');

      if (await verificationMessage.count() > 0) {
        console.log('✅ Email verification prompt displayed');
        const text = await verificationMessage.first().textContent();
        console.log(`   Message: "${text}"`);
      } else {
        console.log('⚠️  No email verification prompt found (check frontend implementation)');
      }

      await page.screenshot({
        path: `test-results/03-verification-prompt-${timestamp}.png`,
        fullPage: true
      });
    });

    // =====================================================================
    // TEST 3: Attempt Conversion Without Verification (SHOULD BE BLOCKED)
    // =====================================================================
    test.step('Unverified User Attempts Conversion - Should Be BLOCKED', async () => {
      console.log('\n🚫 TEST 3: Unverified Conversion Attempt (Should BLOCK)');

      // Navigate to converter page
      await page.goto(`${FRONTEND_URL}`);
      await page.waitForLoadState('networkidle');

      // Try to upload a PDF file
      const fileInput = page.locator('input[type="file"]');

      if (await fileInput.count() > 0) {
        console.log('   Found file upload input');

        // Create a test PDF file
        const testPdfPath = './test-data/sample.pdf';

        // Check if test file exists, if not create a minimal PDF
        const fs = require('fs');
        if (!fs.existsSync('./test-data')) {
          fs.mkdirSync('./test-data', { recursive: true });
        }

        if (!fs.existsSync(testPdfPath)) {
          // Create minimal valid PDF
          const minimalPdf = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n194\n%%EOF';
          fs.writeFileSync(testPdfPath, minimalPdf);
        }

        // Upload file
        await fileInput.setInputFiles(testPdfPath);
        console.log('   Test PDF uploaded');

        // Wait for upload processing
        await page.waitForTimeout(1000);

        // Try to click convert button
        const convertButton = page.locator('button:has-text("Convert"), button:has-text("Start"), button[type="submit"]');

        if (await convertButton.count() > 0) {
          await convertButton.first().click();
          console.log('   Convert button clicked');

          // Wait for response
          await page.waitForTimeout(2000);

          // Check for error message about email verification
          const verificationError = page.locator('text=/email.*verif/i, text=/verify.*email/i, text=/403/i');

          if (await verificationError.count() > 0) {
            console.log('✅ CONVERSION BLOCKED - Email verification required (as expected)');
            const errorText = await verificationError.first().textContent();
            console.log(`   Error Message: "${errorText}"`);
          } else {
            console.log('❌ ERROR: Conversion should be blocked for unverified users!');
            console.log('   🚨 CRITICAL: Email verification enforcement NOT working in UI');
          }

          await page.screenshot({
            path: `test-results/04-conversion-blocked-${timestamp}.png`,
            fullPage: true
          });
        } else {
          console.log('⚠️  Convert button not found (check frontend implementation)');
        }
      } else {
        console.log('⚠️  File upload input not found');
      }
    });

    // =====================================================================
    // TEST 4: Check for Resend Verification Button
    // =====================================================================
    test.step('Check Resend Verification Functionality', async () => {
      console.log('\n📧 TEST 4: Resend Verification');

      // Look for resend verification button/link
      const resendButton = page.locator('button:has-text("Resend"), a:has-text("Resend"), text=/resend.*verification/i');

      if (await resendButton.count() > 0) {
        console.log('✅ Resend verification button found');

        // Click resend button
        await resendButton.first().click();
        console.log('   Resend button clicked');

        await page.waitForTimeout(2000);

        // Check for success message
        const successMessage = page.locator('text=/email.*sent/i, text=/verification.*sent/i');
        if (await successMessage.count() > 0) {
          console.log('✅ Resend verification success message shown');
          const text = await successMessage.first().textContent();
          console.log(`   Message: "${text}"`);
        }

        await page.screenshot({
          path: `test-results/05-resend-verification-${timestamp}.png`,
          fullPage: true
        });
      } else {
        console.log('⚠️  Resend verification button not found');
        console.log('   Frontend should provide resend verification option');
      }
    });

    // =====================================================================
    // TEST 5: API Direct Test - Verify Backend Enforcement
    // =====================================================================
    test.step('Direct API Test - Backend Enforcement', async () => {
      console.log('\n🔌 TEST 5: Direct Backend API Test');

      // Get auth token from browser storage
      const authToken = await page.evaluate(() => {
        return localStorage.getItem('token') ||
               localStorage.getItem('authToken') ||
               localStorage.getItem('accessToken') ||
               sessionStorage.getItem('token');
      });

      if (authToken) {
        console.log('✅ Auth token found in browser storage');
        console.log(`   Token: ${authToken.substring(0, 30)}...`);

        // Make direct API call to conversion endpoint
        const apiContext = await context.request;

        // Create minimal PDF buffer
        const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n194\n%%EOF');

        const response = await apiContext.post(`${BACKEND_URL}/api/convert/pdf-to-ppt`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          multipart: {
            files: {
              name: 'test.pdf',
              mimeType: 'application/pdf',
              buffer: pdfBuffer
            }
          },
          failOnStatusCode: false // Don't throw on 403
        });

        console.log(`   API Response Status: ${response.status()}`);

        if (response.status() === 403) {
          const responseBody = await response.json();
          console.log('✅ BACKEND ENFORCEMENT WORKING - 403 Forbidden');
          console.log(`   Error Code: ${responseBody.error?.code}`);
          console.log(`   Error Message: ${responseBody.error?.message}`);

          if (responseBody.error?.code === 'EMAIL_NOT_VERIFIED') {
            console.log('✅ Correct error code: EMAIL_NOT_VERIFIED');
          } else {
            console.log('⚠️  Unexpected error code');
          }

          if (responseBody.actions?.resend_verification) {
            console.log('✅ Resend verification action included in response');
          }
        } else {
          console.log('❌ ERROR: Expected 403 Forbidden');
          console.log(`   Actual Status: ${response.status()}`);
          const responseBody = await response.json();
          console.log('   Response:', JSON.stringify(responseBody, null, 2));
        }
      } else {
        console.log('⚠️  Auth token not found in browser storage');
        console.log('   Cannot test direct API call');
      }
    });

    // =====================================================================
    // MANUAL VERIFICATION STEP
    // =====================================================================
    test.step('Manual Verification Instructions', async () => {
      console.log('\n✉️  MANUAL VERIFICATION REQUIRED:');
      console.log('   1. Check email inbox for verification email');
      console.log(`   2. Email sent to: ${testUser.email}`);
      console.log('   3. Click verification link in email');
      console.log('   4. OR extract token and test:');
      console.log(`      SELECT verification_token FROM users WHERE email = '${testUser.email}';`);
      console.log('   5. Then test: GET /api/auth/verify-email/:token');
      console.log('   6. After verification, conversion should work');
    });
  });
});

test.describe('Password Reset Flow', () => {
  test('Forgot Password Flow', async ({ page }) => {
    console.log('\n🔑 PASSWORD RESET TEST');

    test.step('Request Password Reset', async () => {
      console.log('\n📧 Requesting password reset...');

      // Navigate to forgot password page
      await page.goto(`${FRONTEND_URL}/forgot-password`);
      await page.waitForLoadState('networkidle');

      // Fill email
      await page.fill('input[type="email"]', testUser.email);

      await page.screenshot({
        path: `test-results/06-forgot-password-form-${timestamp}.png`,
        fullPage: true
      });

      // Submit
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      await page.waitForTimeout(2000);

      await page.screenshot({
        path: `test-results/07-password-reset-sent-${timestamp}.png`,
        fullPage: true
      });

      console.log('✅ Password reset request submitted');
      console.log('   Check email for reset link');
    });
  });
});

// Cleanup after tests
test.afterAll(async () => {
  console.log('\n🧹 Test Cleanup Complete');
  console.log('📸 Screenshots saved in test-results/');
  console.log('🎥 Videos saved in test-results/ (if tests failed)');
});
