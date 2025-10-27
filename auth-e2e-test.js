/**
 * End-to-End Authentication Test for pdflab.pro
 * Tests complete authentication flow with all middleware
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3015/api';
const TEST_EMAIL = `test.user.${Date.now()}@pdflab.pro`;
const TEST_PASSWORD = 'SecurePassword123!';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`  ${title}`, 'blue');
  log('='.repeat(60), 'blue');
}

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, details = '') {
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
    log(`✅ PASS: ${name}`, 'green');
    if (details) log(`   ${details}`, 'blue');
  } else {
    testResults.failed++;
    log(`❌ FAIL: ${name}`, 'red');
    if (details) log(`   ${details}`, 'yellow');
  }
}

async function test() {
  let userId = null;
  let accessToken = null;
  let refreshToken = null;
  let verificationToken = null;

  try {
    // ============================================================
    // Test 1: User Registration
    // ============================================================
    section('Test 1: User Registration');
    try {
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

      const success = registerResponse.status === 201 &&
                     registerResponse.data.success === true &&
                     registerResponse.data.data.user.email === TEST_EMAIL;

      if (success) {
        userId = registerResponse.data.data.user.id;
        recordTest('User registration', true, `User ID: ${userId}, Email: ${TEST_EMAIL}`);
      } else {
        recordTest('User registration', false, 'Invalid response structure');
      }
    } catch (error) {
      recordTest('User registration', false, error.response?.data?.error?.message || error.message);
    }

    // ============================================================
    // Test 2: Duplicate Registration Prevention
    // ============================================================
    section('Test 2: Duplicate Registration Prevention');
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      recordTest('Duplicate registration prevention', false, 'Should have rejected duplicate email');
    } catch (error) {
      const expectedError = error.response?.status === 409 &&
                           error.response?.data?.error?.code === 'EMAIL_ALREADY_EXISTS';
      recordTest('Duplicate registration prevention', expectedError,
                error.response?.data?.error?.message || 'Correctly rejected duplicate');
    }

    // ============================================================
    // Test 3: Login Without Email Verification
    // ============================================================
    section('Test 3: Login (Email Not Verified Yet)');
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

      const success = loginResponse.status === 200 &&
                     loginResponse.data.success === true &&
                     loginResponse.data.data.token;

      if (success) {
        accessToken = loginResponse.data.data.token;
        refreshToken = loginResponse.data.data.refreshToken;
        recordTest('Login before email verification', true,
                  `Token received (email_verified: ${loginResponse.data.data.user.email_verified})`);
      } else {
        recordTest('Login before email verification', false, 'Invalid response structure');
      }
    } catch (error) {
      recordTest('Login before email verification', false,
                error.response?.data?.error?.message || error.message);
    }

    // ============================================================
    // Test 4: Conversion Attempt Without Email Verification
    // ============================================================
    section('Test 4: Conversion Blocked - Email Not Verified');
    try {
      // Create test PDF file
      const testPdfPath = path.join(__dirname, 'test-auth.pdf');
      if (!fs.existsSync(testPdfPath)) {
        fs.writeFileSync(testPdfPath, 'Mock PDF content for testing');
      }

      const formData = new FormData();
      formData.append('files', fs.createReadStream(testPdfPath));

      await axios.post(`${API_BASE}/convert/pdf-to-ppt`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${accessToken}`
        }
      });

      recordTest('Email verification enforcement', false, 'Should have blocked unverified user');
    } catch (error) {
      const expectedBlock = error.response?.status === 403 &&
                           error.response?.data?.error?.code === 'EMAIL_NOT_VERIFIED';
      recordTest('Email verification enforcement', expectedBlock,
                error.response?.data?.error?.message || 'Correctly blocked unverified user');
    }

    // ============================================================
    // Test 5: Manually Verify Email (Simulate)
    // ============================================================
    section('Test 5: Email Verification (Database Simulation)');
    try {
      // In production, this would be done via email link
      // For testing, we'll directly update the database
      const sqlite3 = require('better-sqlite3');
      const dbPath = path.join(__dirname, 'backend', 'data', 'pdflab.db');
      const db = sqlite3(dbPath);

      db.prepare('UPDATE users SET email_verified = 1 WHERE email = ?').run(TEST_EMAIL);
      db.close();

      recordTest('Email verification (simulated)', true, 'Database updated: email_verified = 1');
    } catch (error) {
      recordTest('Email verification (simulated)', false, error.message);
    }

    // ============================================================
    // Test 6: Login After Email Verification
    // ============================================================
    section('Test 6: Login After Email Verification');
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

      const success = loginResponse.status === 200 &&
                     loginResponse.data.data.user.email_verified === 1;

      if (success) {
        accessToken = loginResponse.data.data.token;
        refreshToken = loginResponse.data.data.refreshToken;
        recordTest('Login with verified email', true, 'New tokens issued for verified user');
      } else {
        recordTest('Login with verified email', false, 'Email verification status incorrect');
      }
    } catch (error) {
      recordTest('Login with verified email', false, error.response?.data?.error?.message || error.message);
    }

    // ============================================================
    // Test 7: Successful Conversion (Verified User, Within Limits)
    // ============================================================
    section('Test 7: Successful Conversion (Verified + Within Limits)');
    try {
      const testPdfPath = path.join(__dirname, 'test-auth.pdf');
      const formData = new FormData();
      formData.append('files', fs.createReadStream(testPdfPath));

      const conversionResponse = await axios.post(`${API_BASE}/convert/pdf-to-ppt`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const success = conversionResponse.status === 200 &&
                     conversionResponse.data.success === true;

      recordTest('First conversion (verified user)', success,
                success ? `Job ID: ${conversionResponse.data.data.jobId}` : 'Conversion failed');
    } catch (error) {
      recordTest('First conversion (verified user)', false,
                error.response?.data?.error?.message || error.message);
    }

    // ============================================================
    // Test 8: Multiple Conversions to Test Usage Limits
    // ============================================================
    section('Test 8: Usage Limit Enforcement (Free Tier = 3/month)');
    try {
      const testPdfPath = path.join(__dirname, 'test-auth.pdf');
      let conversionsSucceeded = 0;
      let limitEnforced = false;

      // Free tier allows 3 conversions - we already did 1, so try 3 more
      for (let i = 0; i < 3; i++) {
        try {
          const formData = new FormData();
          formData.append('files', fs.createReadStream(testPdfPath));

          await axios.post(`${API_BASE}/convert/pdf-to-ppt`, formData, {
            headers: {
              ...formData.getHeaders(),
              'Authorization': `Bearer ${accessToken}`
            }
          });
          conversionsSucceeded++;
          log(`  Conversion ${i + 2} succeeded`, 'yellow');
        } catch (error) {
          if (error.response?.status === 429 &&
              error.response?.data?.code === 'USAGE_LIMIT_EXCEEDED') {
            limitEnforced = true;
            log(`  Conversion ${i + 2} blocked by usage limit`, 'yellow');
            recordTest('Usage limit enforcement', true,
                      `Blocked after ${conversionsSucceeded + 1} conversions (limit: 3)`);
            break;
          } else {
            throw error;
          }
        }
      }

      if (!limitEnforced) {
        recordTest('Usage limit enforcement', false,
                  `All ${conversionsSucceeded + 1} conversions succeeded - limit not enforced`);
      }
    } catch (error) {
      recordTest('Usage limit enforcement', false, error.response?.data?.error?.message || error.message);
    }

    // ============================================================
    // Test 9: Invalid Token Rejection
    // ============================================================
    section('Test 9: Invalid Token Rejection');
    try {
      const testPdfPath = path.join(__dirname, 'test-auth.pdf');
      const formData = new FormData();
      formData.append('files', fs.createReadStream(testPdfPath));

      await axios.post(`${API_BASE}/convert/pdf-to-ppt`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': 'Bearer invalid_token_12345'
        }
      });

      recordTest('Invalid token rejection', false, 'Should have rejected invalid token');
    } catch (error) {
      const expectedRejection = error.response?.status === 401;
      recordTest('Invalid token rejection', expectedRejection,
                error.response?.data?.error?.message || 'Correctly rejected invalid token');
    }

    // ============================================================
    // Test 10: Missing Token Rejection
    // ============================================================
    section('Test 10: Missing Token Rejection');
    try {
      const testPdfPath = path.join(__dirname, 'test-auth.pdf');
      const formData = new FormData();
      formData.append('files', fs.createReadStream(testPdfPath));

      await axios.post(`${API_BASE}/convert/pdf-to-ppt`, formData, {
        headers: formData.getHeaders()
        // No Authorization header
      });

      recordTest('Missing token rejection', false, 'Should have rejected request without token');
    } catch (error) {
      const expectedRejection = error.response?.status === 401;
      recordTest('Missing token rejection', expectedRejection,
                error.response?.data?.error?.message || 'Correctly rejected missing token');
    }

    // ============================================================
    // Test 11: Token Refresh Mechanism
    // ============================================================
    section('Test 11: Token Refresh Mechanism');
    try {
      const refreshResponse = await axios.post(`${API_BASE}/auth/refresh`, {
        refreshToken: refreshToken
      });

      const success = refreshResponse.status === 200 &&
                     refreshResponse.data.data.token &&
                     refreshResponse.data.data.refreshToken;

      if (success) {
        const newAccessToken = refreshResponse.data.data.token;
        recordTest('Token refresh', true,
                  `New access token issued (differs from old: ${newAccessToken !== accessToken})`);
      } else {
        recordTest('Token refresh', false, 'Invalid refresh response');
      }
    } catch (error) {
      recordTest('Token refresh', false, error.response?.data?.error?.message || error.message);
    }

    // ============================================================
    // Test 12: Get Current User Info
    // ============================================================
    section('Test 12: Get Current User Info (/me endpoint)');
    try {
      const meResponse = await axios.get(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const success = meResponse.status === 200 &&
                     meResponse.data.data.user.email === TEST_EMAIL;

      recordTest('Get current user (/me)', success,
                success ? `Retrieved user data: ${meResponse.data.data.user.email}` : 'Invalid response');
    } catch (error) {
      recordTest('Get current user (/me)', false, error.response?.data?.error?.message || error.message);
    }

    // ============================================================
    // Test 13: Password Update
    // ============================================================
    section('Test 13: Password Update (Authenticated User)');
    const NEW_PASSWORD = 'NewSecurePassword456!';
    try {
      const updateResponse = await axios.post(`${API_BASE}/auth/update-password`, {
        oldPassword: TEST_PASSWORD,
        newPassword: NEW_PASSWORD
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const success = updateResponse.status === 200 && updateResponse.data.success === true;
      recordTest('Password update', success, 'Password changed successfully');

      // Verify new password works
      if (success) {
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: TEST_EMAIL,
          password: NEW_PASSWORD
        });

        const loginSuccess = loginResponse.status === 200;
        recordTest('Login with new password', loginSuccess, 'New password works correctly');
      }
    } catch (error) {
      recordTest('Password update', false, error.response?.data?.error?.message || error.message);
    }

    // ============================================================
    // CLEANUP
    // ============================================================
    section('Cleanup');
    try {
      // Delete test PDF
      const testPdfPath = path.join(__dirname, 'test-auth.pdf');
      if (fs.existsSync(testPdfPath)) {
        fs.unlinkSync(testPdfPath);
        log('  Deleted test PDF file', 'yellow');
      }

      // Delete test user from database
      const sqlite3 = require('better-sqlite3');
      const dbPath = path.join(__dirname, 'backend', 'data', 'pdflab.db');
      const db = sqlite3(dbPath);

      db.prepare('DELETE FROM users WHERE email = ?').run(TEST_EMAIL);
      db.close();

      log('  Deleted test user from database', 'yellow');
      recordTest('Cleanup', true, 'Test data removed');
    } catch (error) {
      recordTest('Cleanup', false, error.message);
    }

  } catch (error) {
    log(`\n❌ CRITICAL ERROR: ${error.message}`, 'red');
    console.error(error);
  }

  // ============================================================
  // FINAL REPORT
  // ============================================================
  section('TEST SUMMARY');
  log(`\nTotal Tests: ${testResults.passed + testResults.failed}`, 'blue');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%\n`,
      testResults.failed === 0 ? 'green' : 'yellow');

  if (testResults.failed === 0) {
    log('🎉 ALL TESTS PASSED! Authentication system is production-ready.', 'green');
  } else {
    log('⚠️  Some tests failed. Review failures above.', 'yellow');
  }

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
log('\n🚀 Starting End-to-End Authentication Tests', 'magenta');
log(`📧 Test Email: ${TEST_EMAIL}`, 'blue');
log(`🔑 Test Password: ${TEST_PASSWORD}`, 'blue');
test();
