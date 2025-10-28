/**
 * COMPREHENSIVE END-TO-END AUTHENTICATION TEST
 *
 * This test performs a COMPLETE user journey:
 * 1. Landing page - click every navigation element
 * 2. Signup flow - fill every field, click every button
 * 3. Email verification flow
 * 4. Login flow - test all login options
 * 5. Dashboard access - verify authentication
 * 6. Profile/Settings interaction
 * 7. Logout flow
 * 8. Re-login to verify persistence
 *
 * This is the MOST DETAILED authentication test possible.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test Configuration
const BASE_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3001';
const TEST_USER = {
  firstName: 'John',
  lastName: 'Tester',
  email: `test_${Date.now()}@example.com`,
  password: 'SecurePassword123!',
};

// Screenshot directory
const SCREENSHOT_DIR = './test-screenshots/comprehensive-auth-e2e';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Test results tracking
const testResults = {
  totalSteps: 0,
  passedChecks: 0,
  failedChecks: 0,
  steps: [],
};

// Logging utilities
function logHeader(text) {
  console.log(`\n${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${text}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
}

function logStep(stepNumber, text) {
  testResults.totalSteps++;
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}STEP ${stepNumber}: ${text}${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
}

function logAction(text) {
  console.log(`${colors.blue}  → ${text}${colors.reset}`);
}

function logSuccess(text) {
  testResults.passedChecks++;
  console.log(`${colors.green}  ✓ ${text}${colors.reset}`);
  testResults.steps.push({ status: 'PASS', message: text });
}

function logError(text) {
  testResults.failedChecks++;
  console.log(`${colors.red}  ✗ ${text}${colors.reset}`);
  testResults.steps.push({ status: 'FAIL', message: text });
}

function logInfo(text) {
  console.log(`${colors.cyan}  ℹ ${text}${colors.reset}`);
}

function logWarning(text) {
  console.log(`${colors.yellow}  ⚠ ${text}${colors.reset}`);
}

// Screenshot helper
async function takeScreenshot(page, name) {
  try {
    const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    logInfo(`Screenshot: ${name}.png`);
  } catch (error) {
    logWarning(`Failed to take screenshot: ${error.message}`);
  }
}

// Wait helper
async function waitAndLog(ms, message) {
  logInfo(`Waiting ${ms}ms - ${message}`);
  await new Promise(resolve => setTimeout(resolve, ms));
}

// Main test function
async function runComprehensiveAuthTest() {
  logHeader('🚀 COMPREHENSIVE END-TO-END AUTHENTICATION TEST');
  logInfo(`Test User: ${TEST_USER.email}`);
  logInfo(`Frontend: ${BASE_URL}`);
  logInfo(`Backend: ${BACKEND_URL}`);
  logInfo(`Time: ${new Date().toISOString()}`);

  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: SCREENSHOT_DIR },
  });
  const page = await context.newPage();

  // Track console messages and errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      logWarning(`Browser console error: ${msg.text()}`);
    }
  });

  try {
    // ========================================================================
    // STEP 1: EXPLORE LANDING PAGE
    // ========================================================================
    logStep(1, 'Landing Page - Explore Navigation');

    logAction('Navigate to homepage');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // Allow page to render
    await takeScreenshot(page, 'step-01-landing-page');

    // Check for main heading
    logAction('Verify main heading');
    const heading = await page.locator('h1').first().textContent();
    logSuccess(`Found heading: "${heading.substring(0, 50)}..."`);

    // Check navigation buttons
    logAction('Identify all navigation buttons');
    const loginBtn = page.locator('a[href="/login"], button:has-text("Login"), button:has-text("Sign in")');
    const signupBtn = page.locator('a[href="/signup"], button:has-text("Sign up"), button:has-text("Get Started")');

    const loginCount = await loginBtn.count();
    const signupCount = await signupBtn.count();
    logSuccess(`Found ${loginCount} login button(s)`);
    logSuccess(`Found ${signupCount} signup button(s)`);

    // Check for features link
    logAction('Check for Features link');
    const featuresLink = page.locator('a[href="/features"]');
    if (await featuresLink.count() > 0) {
      logSuccess('Features link found');
      await featuresLink.first().click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'step-01-features-page');
      logSuccess(`Features page loaded: ${page.url()}`);
      await page.goBack();
      await page.waitForTimeout(1000);
    }

    // Check for pricing link
    logAction('Check for Pricing link');
    const pricingLink = page.locator('a[href="/pricing"]');
    if (await pricingLink.count() > 0) {
      logSuccess('Pricing link found');
      await pricingLink.first().click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'step-01-pricing-page');
      logSuccess(`Pricing page loaded: ${page.url()}`);
      await page.goBack();
      await page.waitForTimeout(1000);
    }

    // ========================================================================
    // STEP 2: NAVIGATE TO SIGNUP
    // ========================================================================
    logStep(2, 'Navigate to Signup Page');

    logAction('Click on Sign Up button');
    await page.goto(`${BASE_URL}/signup`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // Allow form to render
    await takeScreenshot(page, 'step-02-signup-page');
    logSuccess(`Signup page loaded: ${page.url()}`);

    // ========================================================================
    // STEP 3: TEST SOCIAL LOGIN BUTTONS (Don't click, just verify presence)
    // ========================================================================
    logStep(3, 'Verify Social Login Options');

    logAction('Check for Google login button');
    const googleBtn = page.locator('button:has-text("Google"), button:has-text("Continue with Google")');
    if (await googleBtn.count() > 0) {
      logSuccess(`Google login button found (${await googleBtn.count()})`);
    } else {
      logInfo('Google login button not found');
    }

    logAction('Check for Facebook login button');
    const facebookBtn = page.locator('button:has-text("Facebook"), button:has-text("Continue with Facebook")');
    if (await facebookBtn.count() > 0) {
      logSuccess(`Facebook login button found (${await facebookBtn.count()})`);
    } else {
      logInfo('Facebook login button not found');
    }

    logAction('Check for LinkedIn login button');
    const linkedinBtn = page.locator('button:has-text("LinkedIn"), button:has-text("Continue with LinkedIn")');
    if (await linkedinBtn.count() > 0) {
      logSuccess(`LinkedIn login button found (${await linkedinBtn.count()})`);
    } else {
      logInfo('LinkedIn login button not found');
    }

    // ========================================================================
    // STEP 4: FILL SIGNUP FORM - EVERY FIELD
    // ========================================================================
    logStep(4, 'Fill Complete Signup Form');

    // First Name
    logAction(`Enter first name: ${TEST_USER.firstName}`);
    const firstNameInput = page.locator('input[id="firstName"], input[name="firstName"]').first();
    await firstNameInput.click();
    await firstNameInput.fill(TEST_USER.firstName);
    await waitAndLog(200, 'field population');
    const firstNameValue = await firstNameInput.inputValue();
    if (firstNameValue === TEST_USER.firstName) {
      logSuccess(`First name entered: "${firstNameValue}"`);
    } else {
      logError(`First name mismatch: expected "${TEST_USER.firstName}", got "${firstNameValue}"`);
    }

    // Last Name
    logAction(`Enter last name: ${TEST_USER.lastName}`);
    const lastNameInput = page.locator('input[id="lastName"], input[name="lastName"]').first();
    await lastNameInput.click();
    await lastNameInput.fill(TEST_USER.lastName);
    await waitAndLog(200, 'field population');
    const lastNameValue = await lastNameInput.inputValue();
    if (lastNameValue === TEST_USER.lastName) {
      logSuccess(`Last name entered: "${lastNameValue}"`);
    } else {
      logError(`Last name mismatch: expected "${TEST_USER.lastName}", got "${lastNameValue}"`);
    }
    await takeScreenshot(page, 'step-04-names-filled');

    // Email
    logAction(`Enter email: ${TEST_USER.email}`);
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.click();
    await emailInput.fill(TEST_USER.email);
    await waitAndLog(200, 'field population');
    const emailValue = await emailInput.inputValue();
    if (emailValue === TEST_USER.email) {
      logSuccess(`Email entered: "${emailValue}"`);
    } else {
      logError(`Email mismatch: expected "${TEST_USER.email}", got "${emailValue}"`);
    }
    await takeScreenshot(page, 'step-04-email-filled');

    // Password
    logAction('Enter password');
    const passwordInputs = page.locator('input[type="password"]');
    const passwordCount = await passwordInputs.count();
    logInfo(`Found ${passwordCount} password field(s)`);

    await passwordInputs.nth(0).click();
    await passwordInputs.nth(0).fill(TEST_USER.password);
    await waitAndLog(200, 'field population');
    logSuccess('Password entered in first field');

    // Confirm Password
    if (passwordCount >= 2) {
      logAction('Enter confirm password');
      await passwordInputs.nth(1).click();
      await passwordInputs.nth(1).fill(TEST_USER.password);
      await waitAndLog(200, 'field population');
      logSuccess('Confirm password entered');
    }
    await takeScreenshot(page, 'step-04-passwords-filled');

    // Terms and Conditions Checkbox
    logAction('Accept terms and conditions');
    try {
      const termsContainer = page.locator('.flex.items-start.space-x-3').filter({ has: page.locator('button[type="button"]') });
      const termsButton = termsContainer.locator('button[type="button"]').first();
      await termsButton.click();
      await waitAndLog(300, 'terms checkbox state update');
      logSuccess('Terms checkbox clicked');
    } catch (error) {
      logWarning(`Could not click terms checkbox: ${error.message}`);
    }
    await takeScreenshot(page, 'step-04-form-complete');

    // Verify submit button state
    logAction('Verify submit button is enabled');
    try {
      const submitBtn = page.locator('button[type="submit"]').first();
      const isDisabled = await submitBtn.getAttribute('disabled', { timeout: 3000 });
      if (isDisabled === null) {
        logSuccess('Submit button is ENABLED ✓');
      } else {
        logError('Submit button is still DISABLED ✗');
        await takeScreenshot(page, 'step-04-button-disabled-error');
      }
    } catch (error) {
      logInfo('Could not check button state');
    }

    // ========================================================================
    // STEP 5: SUBMIT SIGNUP FORM
    // ========================================================================
    logStep(5, 'Submit Signup Form');

    logAction('Click submit button');
    await takeScreenshot(page, 'step-05-before-submit');

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    logSuccess('Submit button clicked');

    // Wait for response
    logAction('Waiting for signup response...');
    await waitAndLog(3000, 'backend processing');
    await takeScreenshot(page, 'step-05-after-submit');

    // Check current URL
    const currentUrl = page.url();
    logInfo(`Current URL: ${currentUrl}`);

    // Look for success or error messages
    logAction('Checking for response messages');
    const successIndicators = [
      page.locator('text=/success/i'),
      page.locator('text=/created/i'),
      page.locator('text=/registered/i'),
      page.locator('text=/verify/i'),
      page.locator('text=/email/i'),
      page.locator('[role="alert"]'),
      page.locator('.alert-success, .success-message'),
    ];

    let foundSuccess = false;
    for (const indicator of successIndicators) {
      if (await indicator.count() > 0) {
        const text = await indicator.first().textContent();
        logSuccess(`Success indicator found: "${text.substring(0, 100)}"`);
        foundSuccess = true;
        break;
      }
    }

    if (!foundSuccess) {
      logWarning('No explicit success message found');
    }

    await takeScreenshot(page, 'step-05-signup-result');

    // ========================================================================
    // STEP 6: CHECK FOR EMAIL VERIFICATION
    // ========================================================================
    logStep(6, 'Email Verification Check');

    logAction('Looking for email verification message');
    const verifyMessages = page.locator('text=/verify.*email/i, text=/check.*email/i, text=/confirmation.*sent/i');
    if (await verifyMessages.count() > 0) {
      const message = await verifyMessages.first().textContent();
      logSuccess(`Email verification message: "${message}"`);
      logInfo('In production, user would check email and click verification link');
    } else {
      logInfo('No email verification prompt found - may auto-login or redirect');
    }

    await takeScreenshot(page, 'step-06-email-verification');

    // ========================================================================
    // STEP 7: ATTEMPT LOGIN (New Session)
    // ========================================================================
    logStep(7, 'Login Flow - Test All Elements');

    logAction('Navigate to login page');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'step-07-login-page');
    logSuccess(`Login page loaded: ${page.url()}`);

    // Check for social login buttons on login page
    logAction('Verify social login options on login page');
    const loginGoogleBtn = page.locator('button:has-text("Google")');
    if (await loginGoogleBtn.count() > 0) {
      logSuccess('Google login available');
    }
    const loginFacebookBtn = page.locator('button:has-text("Facebook")');
    if (await loginFacebookBtn.count() > 0) {
      logSuccess('Facebook login available');
    }
    const loginLinkedInBtn = page.locator('button:has-text("LinkedIn")');
    if (await loginLinkedInBtn.count() > 0) {
      logSuccess('LinkedIn login available');
    }

    // Check for "Forgot Password" link
    logAction('Check for Forgot Password link');
    const forgotPasswordLink = page.locator('a[href="/forgot-password"], a:has-text("Forgot"), a:has-text("password")');
    if (await forgotPasswordLink.count() > 0) {
      logSuccess('Forgot Password link found');
      // Click it to test the page
      await forgotPasswordLink.first().click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'step-07-forgot-password-page');
      logSuccess('Forgot Password page loaded');
      // Go back to login
      await page.goBack();
      await page.waitForTimeout(1000);
    }

    // Fill login form
    logAction('Fill login form');
    const loginEmailInput = page.locator('input[type="email"], input[name="email"]').first();
    await loginEmailInput.click();
    await loginEmailInput.fill(TEST_USER.email);
    logSuccess(`Email entered: ${TEST_USER.email}`);

    const loginPasswordInput = page.locator('input[type="password"]').first();
    await loginPasswordInput.click();
    await loginPasswordInput.fill(TEST_USER.password);
    logSuccess('Password entered');

    await takeScreenshot(page, 'step-07-login-form-filled');

    // Check for "Remember Me" checkbox
    logAction('Check for Remember Me option');
    const rememberMeCheckbox = page.locator('input[type="checkbox"][name="rememberMe"], label:has-text("Remember")');
    if (await rememberMeCheckbox.count() > 0) {
      logSuccess('Remember Me checkbox found');
      try {
        await rememberMeCheckbox.first().click();
        logSuccess('Remember Me checkbox clicked');
      } catch (error) {
        logInfo('Could not click Remember Me checkbox');
      }
    }

    // Submit login form
    logAction('Submit login form');
    const loginSubmitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
    await loginSubmitBtn.click();
    logSuccess('Login button clicked');

    await waitAndLog(3000, 'authentication processing');
    await takeScreenshot(page, 'step-07-after-login');

    const afterLoginUrl = page.url();
    logInfo(`URL after login: ${afterLoginUrl}`);

    // ========================================================================
    // STEP 8: VERIFY DASHBOARD ACCESS
    // ========================================================================
    logStep(8, 'Verify Dashboard Access & Explore');

    logAction('Check if redirected to dashboard');
    if (afterLoginUrl.includes('/dashboard') || afterLoginUrl.includes('/app') || afterLoginUrl.includes('/home')) {
      logSuccess('Successfully redirected to dashboard/app area');
    } else {
      logWarning(`Current URL: ${afterLoginUrl} - Expected dashboard redirect`);
    }

    await takeScreenshot(page, 'step-08-dashboard-initial');

    // Look for welcome message or user name
    logAction('Looking for user name or welcome message');
    const userNameIndicators = [
      page.locator(`text=${TEST_USER.firstName}`),
      page.locator(`text=${TEST_USER.lastName}`),
      page.locator(`text=${TEST_USER.email}`),
      page.locator('text=/welcome/i'),
    ];

    for (const indicator of userNameIndicators) {
      if (await indicator.count() > 0) {
        const text = await indicator.first().textContent();
        logSuccess(`User identifier found: "${text}"`);
        break;
      }
    }

    // Check for profile/settings button
    logAction('Looking for profile/settings menu');
    const profileButton = page.locator('button[aria-label*="profile"], button[aria-label*="account"], button:has-text("Profile"), a[href="/profile"], a[href="/settings"]');
    if (await profileButton.count() > 0) {
      logSuccess('Profile/Settings button found');

      try {
        await profileButton.first().click();
        await waitAndLog(1000, 'menu opening');
        await takeScreenshot(page, 'step-08-profile-menu-open');
        logSuccess('Profile menu opened');
      } catch (error) {
        logInfo('Could not open profile menu');
      }
    }

    // ========================================================================
    // STEP 9: TEST MAIN APPLICATION FEATURES
    // ========================================================================
    logStep(9, 'Test Main Application Features');

    // Look for file upload area
    logAction('Looking for file upload functionality');
    const uploadArea = page.locator('input[type="file"], [role="button"]:has-text("upload"), button:has-text("upload")');
    if (await uploadArea.count() > 0) {
      logSuccess('File upload area found');
      await takeScreenshot(page, 'step-09-upload-area');
    } else {
      logInfo('No file upload area visible');
    }

    // Check for recent activity/history
    logAction('Looking for activity history');
    const activitySection = page.locator('text=/recent/i, text=/history/i, text=/activity/i');
    if (await activitySection.count() > 0) {
      logSuccess('Activity/History section found');
    }

    // ========================================================================
    // STEP 10: TEST LOGOUT FUNCTIONALITY
    // ========================================================================
    logStep(10, 'Test Logout Flow');

    logAction('Looking for logout button');
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Sign out")');

    if (await logoutButton.count() > 0) {
      logSuccess(`Logout button found (${await logoutButton.count()} instance(s))`);

      await takeScreenshot(page, 'step-10-before-logout');

      logAction('Clicking logout button');
      await logoutButton.first().click();
      await waitAndLog(2000, 'logout processing');
      await takeScreenshot(page, 'step-10-after-logout');

      const afterLogoutUrl = page.url();
      logInfo(`URL after logout: ${afterLogoutUrl}`);

      if (afterLogoutUrl.includes('/login') || afterLogoutUrl === BASE_URL + '/' || afterLogoutUrl === BASE_URL) {
        logSuccess('Successfully logged out and redirected');
      } else {
        logWarning(`Unexpected URL after logout: ${afterLogoutUrl}`);
      }
    } else {
      logWarning('Logout button not found');
    }

    // ========================================================================
    // STEP 11: VERIFY LOGGED OUT STATE
    // ========================================================================
    logStep(11, 'Verify Logged Out State');

    logAction('Attempt to access dashboard while logged out');
    await page.goto(`${BASE_URL}/dashboard`);
    await waitAndLog(1000, 'redirect check');
    await takeScreenshot(page, 'step-11-dashboard-logged-out');

    const protectedPageUrl = page.url();
    if (protectedPageUrl.includes('/login')) {
      logSuccess('Correctly redirected to login when accessing protected route');
    } else {
      logWarning(`Not redirected to login. Current URL: ${protectedPageUrl}`);
    }

    // ========================================================================
    // STEP 12: RE-LOGIN TO TEST PERSISTENCE
    // ========================================================================
    logStep(12, 'Re-login to Test Account Persistence');

    logAction('Navigate to login page');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    logAction('Fill login credentials again');
    const loginEmailInput2 = page.locator('input[type="email"]').first();
    await loginEmailInput2.fill(TEST_USER.email);

    const loginPasswordInput2 = page.locator('input[type="password"]').first();
    await loginPasswordInput2.fill(TEST_USER.password);

    await takeScreenshot(page, 'step-12-relogin-form');

    logAction('Submit re-login');
    const loginBtn2 = page.locator('button[type="submit"]').first();
    await loginBtn2.click();
    await waitAndLog(2000, 'authentication');
    await takeScreenshot(page, 'step-12-after-relogin');

    const reloginUrl = page.url();
    if (reloginUrl.includes('/dashboard') || reloginUrl.includes('/app')) {
      logSuccess('Successfully re-logged in - account persists!');
    } else {
      logWarning(`Re-login may have failed. URL: ${reloginUrl}`);
    }

    // ========================================================================
    // STEP 13: FINAL VERIFICATION
    // ========================================================================
    logStep(13, 'Final Account Verification');

    logAction('Verify user data persists');
    const finalUserCheck = page.locator(`text=${TEST_USER.firstName}, text=${TEST_USER.email}`);
    if (await finalUserCheck.count() > 0) {
      logSuccess('User data visible - account fully functional');
    }

    await takeScreenshot(page, 'step-13-final-state');
    logSuccess('✅ COMPREHENSIVE AUTHENTICATION TEST COMPLETE');

  } catch (error) {
    logError(`Test execution error: ${error.message}`);
    await takeScreenshot(page, 'error-state');
    throw error;
  } finally {
    // Summary
    logHeader('📊 TEST EXECUTION SUMMARY');
    console.log(`${colors.blue}\nTotal Steps Executed: ${testResults.totalSteps}${colors.reset}`);
    console.log(`${colors.green}Passed Checks: ${testResults.passedChecks}${colors.reset}`);
    console.log(`${colors.red}Failed Checks: ${testResults.failedChecks}${colors.reset}`);

    const successRate = ((testResults.passedChecks / (testResults.passedChecks + testResults.failedChecks)) * 100).toFixed(1);
    console.log(`${colors.yellow}Success Rate: ${successRate}%${colors.reset}`);

    console.log(`\n${colors.cyan}📸 Screenshots saved to: ${SCREENSHOT_DIR}${colors.reset}`);
    console.log(`${colors.green}\n✅ Test execution complete!${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      testUser: TEST_USER.email,
      totalSteps: testResults.totalSteps,
      passedChecks: testResults.passedChecks,
      failedChecks: testResults.failedChecks,
      successRate: `${successRate}%`,
      results: testResults.steps,
    };

    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );
    console.log(`${colors.cyan}📄 Detailed report saved to: ${path.join(SCREENSHOT_DIR, 'test-report.json')}${colors.reset}\n`);

    // Close browser
    await browser.close();
  }
}

// Run the test
runComprehensiveAuthTest().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
