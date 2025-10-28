/**
 * End-to-End Authentication Test - Real User Journey
 * Simulates a complete user experience from landing page to authenticated dashboard
 *
 * This test clicks every button, fills every form, and validates every step
 * exactly as a real user would experience the application.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3001';
const TEST_EMAIL = `testuser_${Date.now()}@example.com`;
const TEST_PASSWORD = 'SecurePassword123!';
const SCREENSHOT_DIR = './test-screenshots/auth-journey';

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

// Test state tracking
let stepNumber = 0;
let totalSteps = 0;
let passedSteps = 0;
let failedSteps = 0;
const testResults = [];

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

/**
 * Logging utilities
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(description) {
  stepNumber++;
  log(`\n[${'='.repeat(80)}]`, 'cyan');
  log(`STEP ${stepNumber}: ${description}`, 'bright');
  log(`[${'='.repeat(80)}]`, 'cyan');
}

function logAction(action) {
  log(`  → ${action}`, 'blue');
}

function logSuccess(message) {
  log(`  ✓ ${message}`, 'green');
  passedSteps++;
  testResults.push({ step: stepNumber, status: 'PASS', message });
}

function logError(message) {
  log(`  ✗ ${message}`, 'red');
  failedSteps++;
  testResults.push({ step: stepNumber, status: 'FAIL', message });
}

function logInfo(message) {
  log(`  ℹ ${message}`, 'yellow');
}

function logWarning(message) {
  log(`  ⚠ ${message}`, 'yellow');
}

/**
 * Screenshot helper
 */
async function takeScreenshot(page, name) {
  const filename = `${SCREENSHOT_DIR}/step-${stepNumber.toString().padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  logInfo(`Screenshot saved: ${filename}`);
}

/**
 * Wait and validate helper
 */
async function waitAndValidate(page, selector, description, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout });
    logSuccess(`Found: ${description}`);
    return true;
  } catch (error) {
    logError(`Not found: ${description} (${selector})`);
    return false;
  }
}

/**
 * Main test suite
 */
async function runUserJourney() {
  log('\n' + '='.repeat(80), 'cyan');
  log('  END-TO-END AUTHENTICATION TEST - REAL USER JOURNEY', 'bright');
  log('  Testing complete user experience from landing to dashboard', 'cyan');
  log('='.repeat(80) + '\n', 'cyan');

  const browser = await chromium.launch({
    headless: false, // Show browser for visibility
    slowMo: 500 // Slow down actions for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
  });

  const page = await context.newPage();

  // Enable console logging from the page
  page.on('console', msg => {
    if (msg.type() === 'error') {
      logWarning(`Browser console error: ${msg.text()}`);
    }
  });

  try {
    // ============================================
    // PHASE 1: LANDING PAGE
    // ============================================
    logStep('Visit Landing Page');
    logAction('Navigate to http://localhost:3000');

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot(page, 'landing-page');

    // Verify landing page elements
    if (await waitAndValidate(page, 'h1, h2', 'Main heading')) {
      const title = await page.textContent('h1, h2');
      logInfo(`Page title: "${title}"`);
    }

    // Check for navigation buttons
    logAction('Checking navigation elements');
    const hasSignup = await page.locator('a:has-text("Sign"), button:has-text("Sign")').count() > 0;
    const hasLogin = await page.locator('a:has-text("Login"), a:has-text("Sign in")').count() > 0;

    if (hasSignup) logSuccess('Signup button found');
    else logError('Signup button not found');

    if (hasLogin) logSuccess('Login button found');
    else logError('Login button not found');

    // ============================================
    // PHASE 2: NAVIGATE TO SIGNUP PAGE
    // ============================================
    logStep('Navigate to Signup Page');
    logAction('Click on "Sign Up" or "Get Started" button');

    // Try multiple possible signup button selectors
    const signupSelectors = [
      'a[href="/signup"]',
      'button:has-text("Sign Up")',
      'a:has-text("Sign Up")',
      'a:has-text("Get Started")',
      'button:has-text("Get Started")',
      '[href*="signup"]'
    ];

    let signupClicked = false;
    for (const selector of signupSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          await element.click();
          logSuccess(`Clicked signup button: ${selector}`);
          signupClicked = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!signupClicked) {
      logWarning('No signup button found, navigating directly to /signup');
      await page.goto(`${BASE_URL}/signup`);
    }

    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'signup-page-loaded');

    // Verify we're on signup page
    const url = page.url();
    if (url.includes('/signup')) {
      logSuccess(`On signup page: ${url}`);
    } else {
      logError(`Not on signup page. Current URL: ${url}`);
    }

    // ============================================
    // PHASE 3: INSPECT SIGNUP FORM
    // ============================================
    logStep('Inspect Signup Form Elements');
    logAction('Identifying all form fields and buttons');

    // Check for form elements
    const formElements = {
      emailInput: await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').count() > 0,
      passwordInput: await page.locator('input[type="password"]').count() > 0,
      submitButton: await page.locator('button[type="submit"], button:has-text("Sign Up"), button:has-text("Create")').count() > 0
    };

    if (formElements.emailInput) logSuccess('Email input field found');
    else logError('Email input field NOT found');

    if (formElements.passwordInput) {
      const passwordCount = await page.locator('input[type="password"]').count();
      logSuccess(`Password input field(s) found (${passwordCount} field(s))`);

      if (passwordCount >= 2) {
        logInfo('Confirm password field detected');
      }
    } else {
      logError('Password input field NOT found');
    }

    if (formElements.submitButton) logSuccess('Submit button found');
    else logError('Submit button NOT found');

    // ============================================
    // PHASE 4: FILL OUT SIGNUP FORM
    // ============================================
    logStep('Fill Out Signup Form');

    // Fill first name
    logAction('Enter first name: Test');
    const firstNameInput = page.locator('input[id="firstName"], input[name="firstName"]').first();
    await firstNameInput.click();
    await firstNameInput.fill('Test');
    logSuccess('First name entered');

    // Fill last name
    logAction('Enter last name: User');
    const lastNameInput = page.locator('input[id="lastName"], input[name="lastName"]').first();
    await lastNameInput.click();
    await lastNameInput.fill('User');
    logSuccess('Last name entered');

    await takeScreenshot(page, 'names-filled');

    // Fill email
    logAction(`Enter email: ${TEST_EMAIL}`);
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    await emailInput.click();
    await emailInput.fill(TEST_EMAIL);
    await page.waitForTimeout(300);

    const emailValue = await emailInput.inputValue();
    if (emailValue === TEST_EMAIL) {
      logSuccess('Email entered correctly');
    } else {
      logError(`Email mismatch. Expected: ${TEST_EMAIL}, Got: ${emailValue}`);
    }

    await takeScreenshot(page, 'email-filled');

    // Fill password
    logAction(`Enter password: ${'*'.repeat(TEST_PASSWORD.length)}`);
    const passwordInputs = page.locator('input[type="password"]');
    const passwordCount = await passwordInputs.count();

    // Fill first password field
    await passwordInputs.nth(0).click();
    await passwordInputs.nth(0).fill(TEST_PASSWORD);
    logSuccess('Password entered in first field');

    // If there's a confirm password field, fill it
    if (passwordCount >= 2) {
      logAction('Enter confirm password');
      await passwordInputs.nth(1).click();
      await passwordInputs.nth(1).fill(TEST_PASSWORD);
      logSuccess('Confirm password entered');
    }

    await takeScreenshot(page, 'passwords-filled');

    // Accept terms and conditions
    logAction('Click to accept terms and conditions checkbox');
    try {
      // Find the terms acceptance container div
      const termsContainer = page.locator('.flex.items-start.space-x-3').filter({ has: page.locator('button[type="button"]') });

      // Click the button inside the container (not the label with links)
      const termsButton = termsContainer.locator('button[type="button"]').first();
      await termsButton.click();
      await page.waitForTimeout(300);
      logSuccess('Terms checkbox button clicked');
    } catch (error) {
      logWarning(`Could not find terms checkbox button: ${error.message}`);
    }

    await takeScreenshot(page, 'form-filled-complete');

    // Wait a moment for form validation to update
    await page.waitForTimeout(800);

    // Check if submit button is enabled (with shorter timeout)
    logAction('Checking submit button state');
    try {
      const submitBtn = page.locator('button[type="submit"]').first();
      const isDisabled = await submitBtn.getAttribute('disabled', { timeout: 3000 });
      if (isDisabled === null) {
        logSuccess('Submit button is enabled');
      } else {
        logWarning('Submit button is still disabled');
      }
    } catch (error) {
      logInfo('Could not check button state (page may have changed)');
    }

    // ============================================
    // PHASE 5: SUBMIT SIGNUP FORM
    // ============================================
    logStep('Submit Signup Form');
    logAction('Click "Sign Up" or "Create Account" button');

    // Take screenshot before clicking
    await takeScreenshot(page, 'before-submit');

    // Click submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign Up"), button:has-text("Create")').first();
    await submitButton.click();
    logSuccess('Submit button clicked');

    // Wait for response
    logAction('Waiting for signup response...');
    await page.waitForTimeout(2000);

    // Check for success or error messages
    const currentUrl = page.url();
    logInfo(`Current URL after submit: ${currentUrl}`);

    await takeScreenshot(page, 'after-submit');

    // Look for success indicators
    const successIndicators = [
      page.locator('text=/success/i'),
      page.locator('text=/welcome/i'),
      page.locator('text=/dashboard/i'),
      page.locator('[class*="success"]'),
      page.locator('[role="alert"]')
    ];

    let foundSuccess = false;
    for (const indicator of successIndicators) {
      if (await indicator.count() > 0) {
        const text = await indicator.first().textContent();
        logSuccess(`Success indicator found: "${text}"`);
        foundSuccess = true;
        break;
      }
    }

    // Look for error messages
    const errorIndicators = [
      page.locator('text=/error/i'),
      page.locator('text=/failed/i'),
      page.locator('[class*="error"]'),
      page.locator('[role="alert"][class*="error"]')
    ];

    let foundError = false;
    for (const indicator of errorIndicators) {
      if (await indicator.count() > 0) {
        const text = await indicator.first().textContent();
        logError(`Error message found: "${text}"`);
        foundError = true;
        break;
      }
    }

    if (!foundSuccess && !foundError) {
      logWarning('No clear success or error message detected');
    }

    // Check if redirected
    if (currentUrl !== page.url()) {
      logSuccess(`Redirected to: ${page.url()}`);
    }

    // ============================================
    // PHASE 6: VERIFY REDIRECT OR CONFIRMATION
    // ============================================
    logStep('Verify Post-Signup State');

    await page.waitForTimeout(1000);
    const finalUrl = page.url();

    if (finalUrl.includes('/dashboard')) {
      logSuccess('Redirected to dashboard (logged in automatically)');
    } else if (finalUrl.includes('/login')) {
      logSuccess('Redirected to login page (email verification required)');
    } else if (finalUrl.includes('/verify')) {
      logSuccess('Redirected to verification page');
    } else {
      logInfo(`Current page: ${finalUrl}`);
    }

    await takeScreenshot(page, 'post-signup-state');

    // ============================================
    // PHASE 7: NAVIGATE TO LOGIN PAGE
    // ============================================
    logStep('Navigate to Login Page');

    if (!finalUrl.includes('/login')) {
      logAction('Navigate to /login');
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
    } else {
      logInfo('Already on login page');
    }

    await takeScreenshot(page, 'login-page');

    // Verify login page elements
    const loginElements = {
      emailInput: await page.locator('input[type="email"], input[name="email"]').count() > 0,
      passwordInput: await page.locator('input[type="password"]').count() > 0,
      loginButton: await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').count() > 0
    };

    if (loginElements.emailInput) logSuccess('Login email field found');
    if (loginElements.passwordInput) logSuccess('Login password field found');
    if (loginElements.loginButton) logSuccess('Login button found');

    // ============================================
    // PHASE 8: FILL OUT LOGIN FORM
    // ============================================
    logStep('Fill Out Login Form');

    logAction(`Enter email: ${TEST_EMAIL}`);
    const loginEmailInput = page.locator('input[type="email"], input[name="email"]').first();
    await loginEmailInput.click();
    await loginEmailInput.fill(TEST_EMAIL);
    logSuccess('Email entered');

    await takeScreenshot(page, 'login-email-filled');

    logAction('Enter password');
    const loginPasswordInput = page.locator('input[type="password"]').first();
    await loginPasswordInput.click();
    await loginPasswordInput.fill(TEST_PASSWORD);
    logSuccess('Password entered');

    await takeScreenshot(page, 'login-form-filled');

    // ============================================
    // PHASE 9: SUBMIT LOGIN FORM
    // ============================================
    logStep('Submit Login Form');

    logAction('Click "Login" or "Sign In" button');
    await takeScreenshot(page, 'before-login-submit');

    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
    await loginButton.click();
    logSuccess('Login button clicked');

    // Wait for response
    logAction('Waiting for login response...');
    await page.waitForTimeout(3000);

    await takeScreenshot(page, 'after-login-submit');

    const postLoginUrl = page.url();
    logInfo(`URL after login: ${postLoginUrl}`);

    // ============================================
    // PHASE 10: VERIFY AUTHENTICATION STATUS
    // ============================================
    logStep('Verify Authentication Status');

    // Check localStorage for token
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    if (token) {
      logSuccess('Auth token found in localStorage');
      logInfo(`Token: ${token.substring(0, 20)}...`);
    } else {
      logError('No auth token in localStorage');
    }

    // Check if on dashboard
    if (postLoginUrl.includes('/dashboard')) {
      logSuccess('Successfully redirected to dashboard');
    } else if (postLoginUrl.includes('/login')) {
      logWarning('Still on login page - login may have failed');
    } else {
      logInfo(`Redirected to: ${postLoginUrl}`);
    }

    await takeScreenshot(page, 'authenticated-state');

    // ============================================
    // PHASE 11: CHECK DASHBOARD ELEMENTS
    // ============================================
    if (postLoginUrl.includes('/dashboard')) {
      logStep('Inspect Dashboard Elements');

      logAction('Looking for user profile indicators');

      // Check for common dashboard elements
      const dashboardElements = {
        userEmail: await page.locator(`text=${TEST_EMAIL}`).count() > 0,
        logoutButton: await page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")').count() > 0,
        userMenu: await page.locator('[aria-label*="user"], [aria-label*="account"], [class*="avatar"]').count() > 0,
        welcomeMessage: await page.locator('text=/welcome/i, text=/hello/i').count() > 0
      };

      if (dashboardElements.userEmail) logSuccess('User email displayed on page');
      if (dashboardElements.logoutButton) logSuccess('Logout button found');
      if (dashboardElements.userMenu) logSuccess('User menu/avatar found');
      if (dashboardElements.welcomeMessage) logSuccess('Welcome message displayed');

      await takeScreenshot(page, 'dashboard-overview');

      // ============================================
      // PHASE 12: TEST AUTHENTICATED FEATURES
      // ============================================
      logStep('Test Authenticated Features');

      // Look for conversion buttons or features
      logAction('Checking for PDF conversion features');

      const conversionFeatures = await page.locator('button:has-text("Convert"), button:has-text("Upload"), input[type="file"]').count();
      if (conversionFeatures > 0) {
        logSuccess(`Found ${conversionFeatures} conversion-related element(s)`);
      } else {
        logWarning('No conversion features visible on dashboard');
      }

      await takeScreenshot(page, 'authenticated-features');
    }

    // ============================================
    // PHASE 13: TEST LOGOUT
    // ============================================
    if (postLoginUrl.includes('/dashboard')) {
      logStep('Test Logout Functionality');

      logAction('Looking for logout button');
      const logoutSelectors = [
        'button:has-text("Logout")',
        'button:has-text("Sign out")',
        'a:has-text("Logout")',
        'a:has-text("Sign out")',
        '[data-testid="logout"]'
      ];

      let logoutClicked = false;
      for (const selector of logoutSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.count() > 0) {
            await element.click();
            logSuccess(`Clicked logout: ${selector}`);
            logoutClicked = true;
            break;
          }
        } catch (e) {
          // Continue
        }
      }

      if (logoutClicked) {
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'after-logout');

        const afterLogoutUrl = page.url();
        logInfo(`URL after logout: ${afterLogoutUrl}`);

        // Verify token removed
        const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('authToken'));
        if (!tokenAfterLogout) {
          logSuccess('Auth token cleared from localStorage');
        } else {
          logError('Auth token still present after logout');
        }

        // Check if redirected to login/home
        if (afterLogoutUrl.includes('/login') || afterLogoutUrl === BASE_URL + '/') {
          logSuccess('Redirected to login/home page after logout');
        } else {
          logWarning(`Unexpected URL after logout: ${afterLogoutUrl}`);
        }
      } else {
        logWarning('Could not find logout button');
      }
    }

    // ============================================
    // PHASE 14: VERIFY SESSION CLEARED
    // ============================================
    logStep('Verify Session Cleared');

    logAction('Attempt to access dashboard without token');
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'dashboard-without-auth');

    const finalDashboardUrl = page.url();
    if (finalDashboardUrl.includes('/login')) {
      logSuccess('Redirected to login (protected route working)');
    } else if (finalDashboardUrl.includes('/dashboard')) {
      logWarning('Dashboard accessible without authentication');
    }

  } catch (error) {
    logError(`Test execution error: ${error.message}`);
    console.error(error);
    await takeScreenshot(page, 'error-state');
  } finally {
    // ============================================
    // FINAL SUMMARY
    // ============================================
    log('\n' + '='.repeat(80), 'cyan');
    log('  TEST EXECUTION SUMMARY', 'bright');
    log('='.repeat(80), 'cyan');

    log(`\nTotal Steps: ${stepNumber}`, 'blue');
    log(`Passed: ${passedSteps}`, 'green');
    log(`Failed: ${failedSteps}`, failedSteps > 0 ? 'red' : 'green');
    log(`Success Rate: ${((passedSteps / (passedSteps + failedSteps)) * 100).toFixed(1)}%`,
        failedSteps === 0 ? 'green' : 'yellow');

    log('\n📸 Screenshots saved to: ' + SCREENSHOT_DIR, 'cyan');
    log('\n✅ Test execution complete!', 'green');
    log('='.repeat(80) + '\n', 'cyan');

    // Save detailed results
    const reportPath = path.join(SCREENSHOT_DIR, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      testEmail: TEST_EMAIL,
      totalSteps: stepNumber,
      passedSteps,
      failedSteps,
      successRate: ((passedSteps / (passedSteps + failedSteps)) * 100).toFixed(1) + '%',
      results: testResults
    }, null, 2));
    log(`📄 Detailed report saved to: ${reportPath}`, 'cyan');

    await browser.close();
  }
}

// Run the test
runUserJourney().catch(console.error);
