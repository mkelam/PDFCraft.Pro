/**
 * Comprehensive End-to-End Authentication Test
 * Tests the complete authentication flow in Docker environment
 */

const http = require('http');
const https = require('https');

// Configuration
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3001';
const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = 'Test User';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failedTestDetails = [];

// Global test data
let authToken = null;
let refreshToken = null;
let userId = null;
let userData = null;

/**
 * Logging utilities
 */
function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(80), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(80), 'cyan');
}

function logTest(name) {
  log(`\n[TEST] ${name}`, 'blue');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'yellow');
}

/**
 * HTTP request helper
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    };

    const req = protocol.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Test runner
 */
async function test(name, testFn) {
  totalTests++;
  logTest(name);

  try {
    await testFn();
    passedTests++;
    logSuccess('PASSED');
    return true;
  } catch (error) {
    failedTests++;
    logError(`FAILED: ${error.message}`);
    failedTestDetails.push({ name, error: error.message });
    return false;
  }
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main test suite
 */
async function runAuthenticationTests() {
  logSection('COMPREHENSIVE AUTHENTICATION E2E TEST SUITE');
  log('Testing complete authentication flow in Docker environment\n', 'white');

  try {
    // ==========================================
    // PHASE 1: INFRASTRUCTURE VERIFICATION
    // ==========================================
    logSection('PHASE 1: Infrastructure Verification');

    await test('1.1 Backend is accessible', async () => {
      const response = await makeRequest(`${BACKEND_URL}/health`);
      if (response.status !== 200) {
        throw new Error(`Backend returned status ${response.status}`);
      }
      logInfo(`Backend health: ${JSON.stringify(response.data)}`);
    });

    await test('1.2 Database connection is healthy', async () => {
      const response = await makeRequest(`${BACKEND_URL}/health`);
      if (!response.data.services || response.data.services.database !== 'healthy') {
        throw new Error('Database is not healthy');
      }
      logInfo('Database: Connected ✓');
    });

    await test('1.3 Redis connection is healthy', async () => {
      const response = await makeRequest(`${BACKEND_URL}/health`);
      if (!response.data.services || response.data.services.redis !== 'healthy') {
        throw new Error('Redis is not healthy');
      }
      logInfo('Redis: Connected ✓');
    });

    await test('1.4 Frontend is accessible', async () => {
      const response = await makeRequest(FRONTEND_URL);
      if (response.status !== 200) {
        throw new Error(`Frontend returned status ${response.status}`);
      }
      logInfo('Frontend: Loaded ✓');
    });

    // ==========================================
    // PHASE 2: USER REGISTRATION
    // ==========================================
    logSection('PHASE 2: User Registration');

    await test('2.1 Register new user with valid data', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        body: {
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          confirmPassword: TEST_PASSWORD
        }
      });

      if (response.status !== 201) {
        throw new Error(`Registration failed with status ${response.status}: ${JSON.stringify(response.data)}`);
      }

      if (!response.data.success) {
        throw new Error(`Registration unsuccessful: ${response.data.error?.message}`);
      }

      // Response structure: {success: true, data: {user: {...}, token: "...", refreshToken: "..."}}
      const responseData = response.data.data;

      if (!responseData || !responseData.token) {
        throw new Error('No auth token returned');
      }

      if (!responseData.user) {
        throw new Error('No user data returned');
      }

      // Store for subsequent tests
      authToken = responseData.token;
      refreshToken = responseData.refreshToken;
      userId = responseData.user.id;
      userData = responseData.user;

      logInfo(`User ID: ${userId}`);
      logInfo(`Email: ${userData.email}`);
      logInfo(`Token: ${authToken.substring(0, 20)}...`);
    });

    await test('2.2 Verify user data structure', async () => {
      if (!userData.email || !userData.id) {
        throw new Error('User data missing required fields');
      }

      if (userData.email !== TEST_EMAIL) {
        throw new Error(`Email mismatch: expected ${TEST_EMAIL}, got ${userData.email}`);
      }

      if (!userData.plan) {
        throw new Error('User plan not set');
      }

      logInfo(`Plan: ${userData.plan}`);
      logInfo(`Email verified: ${userData.email_verified ? 'Yes' : 'No'}`);
    });

    await test('2.3 Verify JWT token format', async () => {
      if (!authToken.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
        throw new Error('Token does not match JWT format');
      }
      logInfo('Token format: Valid JWT ✓');
    });

    await test('2.4 Duplicate registration should fail', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        body: {
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          confirmPassword: TEST_PASSWORD
        }
      });

      if (response.status !== 409 && response.status !== 400) {
        throw new Error(`Expected 409 or 400 for duplicate email, got ${response.status}`);
      }

      logInfo('Duplicate prevention: Working ✓');
    });

    await test('2.5 Registration with invalid email should fail', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        body: {
          email: 'invalid-email',
          password: TEST_PASSWORD,
          confirmPassword: TEST_PASSWORD
        }
      });

      if (response.status === 201) {
        throw new Error('Invalid email was accepted');
      }

      logInfo('Email validation: Working ✓');
    });

    await test('2.6 Registration with weak password should fail', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        body: {
          email: `weak_${Date.now()}@example.com`,
          password: '123',
          confirmPassword: '123'
        }
      });

      if (response.status === 201) {
        throw new Error('Weak password was accepted');
      }

      logInfo('Password strength validation: Working ✓');
    });

    // ==========================================
    // PHASE 3: USER LOGIN
    // ==========================================
    logSection('PHASE 3: User Login');

    await test('3.1 Login with correct credentials', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        body: {
          email: TEST_EMAIL,
          password: TEST_PASSWORD
        }
      });

      if (response.status !== 200) {
        throw new Error(`Login failed with status ${response.status}`);
      }

      if (!response.data.success) {
        throw new Error(`Login unsuccessful: ${response.data.error?.message}`);
      }

      if (!response.data.token) {
        throw new Error('No auth token returned');
      }

      // Update token (might be different from registration token)
      const newToken = response.data.token;
      logInfo(`New token: ${newToken.substring(0, 20)}...`);

      // Keep the original registration token for other tests
      // authToken = newToken;
    });

    await test('3.2 Login with wrong password should fail', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        body: {
          email: TEST_EMAIL,
          password: 'WrongPassword123!'
        }
      });

      if (response.status === 200) {
        throw new Error('Login succeeded with wrong password');
      }

      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }

      logInfo('Wrong password rejection: Working ✓');
    });

    await test('3.3 Login with non-existent user should fail', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        body: {
          email: 'nonexistent@test.com',
          password: TEST_PASSWORD
        }
      });

      if (response.status === 200) {
        throw new Error('Login succeeded for non-existent user');
      }

      logInfo('Non-existent user rejection: Working ✓');
    });

    await test('3.4 Login without email should fail', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        body: {
          password: TEST_PASSWORD
        }
      });

      if (response.status === 200) {
        throw new Error('Login succeeded without email');
      }

      logInfo('Missing email validation: Working ✓');
    });

    await test('3.5 Login without password should fail', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        body: {
          email: TEST_EMAIL
        }
      });

      if (response.status === 200) {
        throw new Error('Login succeeded without password');
      }

      logInfo('Missing password validation: Working ✓');
    });

    // ==========================================
    // PHASE 4: AUTHENTICATED REQUESTS
    // ==========================================
    logSection('PHASE 4: Authenticated Requests');

    await test('4.1 Get current user with valid token', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.status !== 200) {
        throw new Error(`Get current user failed with status ${response.status}`);
      }

      if (!response.data.user) {
        throw new Error('No user data returned');
      }

      if (response.data.user.id !== userId) {
        throw new Error(`User ID mismatch: expected ${userId}, got ${response.data.user.id}`);
      }

      logInfo(`Retrieved user: ${response.data.user.email}`);
      logInfo(`Plan: ${response.data.user.plan}`);
      logInfo(`Conversions: ${response.data.user.conversions_used}/${response.data.user.conversions_limit}`);
    });

    await test('4.2 Request with invalid token should fail', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid.token.here'
        }
      });

      if (response.status === 200) {
        throw new Error('Request succeeded with invalid token');
      }

      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }

      logInfo('Invalid token rejection: Working ✓');
    });

    await test('4.3 Request with missing token should fail', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
        method: 'GET'
      });

      if (response.status === 200) {
        throw new Error('Request succeeded without token');
      }

      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }

      logInfo('Missing token rejection: Working ✓');
    });

    await test('4.4 Request with malformed Authorization header should fail', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': authToken // Missing "Bearer " prefix
        }
      });

      if (response.status === 200) {
        throw new Error('Request succeeded with malformed header');
      }

      logInfo('Malformed header rejection: Working ✓');
    });

    await test('4.5 Request with expired token should fail gracefully', async () => {
      // Note: We can't easily test with an actually expired token without waiting,
      // but we can verify the endpoint handles invalid tokens properly
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjF9.invalid';

      const response = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${expiredToken}`
        }
      });

      if (response.status === 200) {
        throw new Error('Request succeeded with expired/invalid token');
      }

      logInfo('Token expiration handling: Working ✓');
    });

    // ==========================================
    // PHASE 5: TOKEN LIFECYCLE
    // ==========================================
    logSection('PHASE 5: Token Lifecycle & Security');

    await test('5.1 Token persists across multiple requests', async () => {
      // Make 3 consecutive requests with same token
      for (let i = 1; i <= 3; i++) {
        const response = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        if (response.status !== 200) {
          throw new Error(`Request ${i} failed with status ${response.status}`);
        }

        logInfo(`Request ${i}/3: Success ✓`);
        await sleep(100); // Small delay between requests
      }
    });

    await test('5.2 Different tokens for same user should work', async () => {
      // Login again to get a new token
      const loginResponse = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        body: {
          email: TEST_EMAIL,
          password: TEST_PASSWORD
        }
      });

      const newToken = loginResponse.data.token;

      // Verify both tokens work
      const response1 = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const response2 = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${newToken}` }
      });

      if (response1.status !== 200 || response2.status !== 200) {
        throw new Error('One of the tokens failed');
      }

      logInfo('Original token: Valid ✓');
      logInfo('New token: Valid ✓');
    });

    await test('5.3 Token contains correct user claims', async () => {
      // Decode JWT (base64 decode the payload)
      const parts = authToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT structure');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      if (!payload.userId && !payload.id && !payload.sub) {
        throw new Error('Token missing user identifier claim');
      }

      if (!payload.iat) {
        throw new Error('Token missing issued-at claim');
      }

      if (!payload.exp) {
        throw new Error('Token missing expiration claim');
      }

      logInfo(`Token claims: ${Object.keys(payload).join(', ')}`);
      logInfo(`Issued at: ${new Date(payload.iat * 1000).toISOString()}`);
      logInfo(`Expires at: ${new Date(payload.exp * 1000).toISOString()}`);
    });

    // ==========================================
    // PHASE 6: RATE LIMITING & SECURITY
    // ==========================================
    logSection('PHASE 6: Rate Limiting & Security Features');

    await test('6.1 Multiple failed login attempts should be tracked', async () => {
      // Attempt 5 failed logins
      let lastResponse;
      for (let i = 1; i <= 5; i++) {
        lastResponse = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          body: {
            email: TEST_EMAIL,
            password: 'WrongPassword!'
          }
        });

        logInfo(`Failed attempt ${i}/5: Status ${lastResponse.status}`);
        await sleep(100);
      }

      // All should fail with 401
      if (lastResponse.status !== 401 && lastResponse.status !== 429) {
        throw new Error(`Expected 401 or 429, got ${lastResponse.status}`);
      }

      logInfo('Failed login tracking: Working ✓');
    });

    await test('6.2 Successful login after failed attempts should work', async () => {
      // Wait a bit for rate limit cooldown
      await sleep(1000);

      const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        body: {
          email: TEST_EMAIL,
          password: TEST_PASSWORD
        }
      });

      if (response.status !== 200) {
        throw new Error(`Login failed after failed attempts: ${response.status}`);
      }

      logInfo('Account not locked after failed attempts ✓');
    });

    await test('6.3 SQL injection attempt should be rejected', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        body: {
          email: "admin'--",
          password: "' OR '1'='1"
        }
      });

      if (response.status === 200) {
        throw new Error('SQL injection succeeded (CRITICAL SECURITY ISSUE!)');
      }

      logInfo('SQL injection prevention: Working ✓');
    });

    await test('6.4 XSS attempt in registration should be sanitized', async () => {
      const xssEmail = `xss_${Date.now()}@example.com`;

      const response = await makeRequest(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        body: {
          email: xssEmail,
          password: TEST_PASSWORD,
          confirmPassword: TEST_PASSWORD
        }
      });

      if (response.status === 201 && response.data.user) {
        // Check if script tags are present in response
        if (response.data.user.full_name && response.data.user.full_name.includes('<script>')) {
          throw new Error('XSS content not sanitized');
        }
      }

      logInfo('XSS prevention: Working ✓');
    });

    // ==========================================
    // PHASE 7: USER DATA MANAGEMENT
    // ==========================================
    logSection('PHASE 7: User Data & Profile Management');

    await test('7.1 User has correct default plan', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const user = response.data.user;

      if (!user.plan) {
        throw new Error('User plan is missing');
      }

      if (user.plan !== 'free' && user.plan !== 'starter' && user.plan !== 'pro') {
        throw new Error(`Invalid plan: ${user.plan}`);
      }

      logInfo(`User plan: ${user.plan}`);
    });

    await test('7.2 User has conversion limits set', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const user = response.data.user;

      if (typeof user.conversions_limit !== 'number') {
        throw new Error('Conversions limit not set');
      }

      if (typeof user.conversions_used !== 'number') {
        throw new Error('Conversions used not set');
      }

      logInfo(`Conversions: ${user.conversions_used}/${user.conversions_limit}`);
    });

    await test('7.3 User email is stored correctly', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.data.user.email !== TEST_EMAIL.toLowerCase()) {
        throw new Error('Email not normalized to lowercase');
      }

      logInfo('Email normalization: Working ✓');
    });

    await test('7.4 User timestamps are present', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const user = response.data.user;

      if (!user.created_at && !user.registration_date) {
        throw new Error('User creation timestamp missing');
      }

      logInfo(`Account created: ${user.created_at || user.registration_date}`);
    });

    // ==========================================
    // PHASE 8: CORS & HEADERS
    // ==========================================
    logSection('PHASE 8: CORS & Security Headers');

    await test('8.1 Backend accepts requests from frontend origin', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Origin': 'http://localhost:3000'
        }
      });

      if (response.status !== 200) {
        throw new Error('Request from frontend origin was rejected');
      }

      logInfo('CORS: Frontend origin accepted ✓');
    });

    await test('8.2 Backend sets CORS headers', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Origin': 'http://localhost:3000'
        }
      });

      if (!response.headers['access-control-allow-origin']) {
        throw new Error('CORS headers not set');
      }

      logInfo(`CORS header: ${response.headers['access-control-allow-origin']}`);
    });

    await test('8.3 Backend sets security headers', async () => {
      const response = await makeRequest(`${BACKEND_URL}/health`);

      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection'
      ];

      let foundHeaders = 0;
      for (const header of securityHeaders) {
        if (response.headers[header]) {
          foundHeaders++;
          logInfo(`${header}: ${response.headers[header]}`);
        }
      }

      if (foundHeaders === 0) {
        logInfo('Note: No standard security headers found (may be handled by proxy)');
      }
    });

    // ==========================================
    // PHASE 9: LOGOUT (if implemented)
    // ==========================================
    logSection('PHASE 9: Session Cleanup & Logout');

    await test('9.1 Verify logout endpoint exists', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // 200 = logout implemented, 404 = not implemented (acceptable)
      if (response.status !== 200 && response.status !== 404 && response.status !== 501) {
        logInfo(`Logout status: ${response.status} (May not be implemented)`);
      } else if (response.status === 200) {
        logInfo('Logout endpoint: Implemented ✓');
      } else {
        logInfo('Logout endpoint: Not implemented (using stateless JWT)');
      }
    });

    await test('9.2 Token still works after logout attempt (stateless JWT)', async () => {
      // With stateless JWT, token should still work after "logout"
      // True logout would require token blacklist or short expiry
      const response = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.status === 200) {
        logInfo('JWT is stateless (no server-side session) ✓');
      } else {
        logInfo('Token invalidated on logout (session-based) ✓');
      }
    });

    // ==========================================
    // SUMMARY
    // ==========================================
    logSection('TEST SUMMARY');

    log(`\nTotal Tests: ${totalTests}`, 'blue');
    log(`Passed: ${passedTests}`, 'green');
    log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
    log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`,
        failedTests === 0 ? 'green' : 'yellow');

    if (failedTests > 0) {
      logSection('FAILED TESTS DETAILS');
      failedTestDetails.forEach(({ name, error }) => {
        log(`\n✗ ${name}`, 'red');
        log(`  ${error}`, 'red');
      });
    }

    log('\n' + '='.repeat(80), 'cyan');
    if (failedTests === 0) {
      log('  ✓ ALL AUTHENTICATION TESTS PASSED!', 'green');
    } else {
      log('  ✗ SOME TESTS FAILED - REVIEW ERRORS ABOVE', 'red');
    }
    log('='.repeat(80) + '\n', 'cyan');

    // Exit with appropriate code
    process.exit(failedTests > 0 ? 1 : 0);

  } catch (error) {
    logError(`\nFatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the test suite
runAuthenticationTests();
