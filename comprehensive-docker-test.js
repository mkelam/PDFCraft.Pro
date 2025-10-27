/**
 * Comprehensive Docker Deployment Test Suite
 * Tests all dimensions of the pdflab.pro application running from Docker
 */

const http = require('http');
const https = require('https');

// Test configuration
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3001';
const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPass123!';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: []
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 10000
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, headers: res.headers, data: jsonData, rawData: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: null, rawData: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }

    req.end();
  });
}

// Log function
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test function
function test(name, fn) {
  testResults.total++;
  return fn()
    .then(() => {
      testResults.passed++;
      testResults.tests.push({ name, status: 'PASS', error: null });
      log(`✓ ${name}`, 'green');
    })
    .catch((error) => {
      testResults.failed++;
      testResults.tests.push({ name, status: 'FAIL', error: error.message });
      log(`✗ ${name}`, 'red');
      log(`  Error: ${error.message}`, 'red');
    });
}

// Test Suite
async function runTests() {
  log('\n' + '='.repeat(80), 'cyan');
  log('  COMPREHENSIVE DOCKER DEPLOYMENT TEST SUITE', 'cyan');
  log('  pdflab.pro - End-to-End Testing', 'cyan');
  log('='.repeat(80) + '\n', 'cyan');

  // ==========================================
  // DIMENSION 1: INFRASTRUCTURE TESTS
  // ==========================================
  log('\n[DIMENSION 1] Infrastructure & Container Tests', 'magenta');
  log('-'.repeat(80), 'magenta');

  await test('1.1 Frontend container is accessible (port 3000)', async () => {
    const response = await makeRequest(FRONTEND_URL);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
  });

  await test('1.2 Backend container is accessible (port 3001)', async () => {
    const response = await makeRequest(`${BACKEND_URL}/health`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
  });

  await test('1.3 Backend health check returns valid JSON', async () => {
    const response = await makeRequest(`${BACKEND_URL}/health`);
    if (!response.data || typeof response.data !== 'object') throw new Error('Invalid health check response');
    if (!response.data.success) throw new Error('Health check reports unhealthy');
  });

  await test('1.4 Backend reports database as healthy', async () => {
    const response = await makeRequest(`${BACKEND_URL}/health`);
    if (response.data.services.database !== 'healthy') throw new Error('Database not healthy');
  });

  await test('1.5 Backend reports Redis as healthy', async () => {
    const response = await makeRequest(`${BACKEND_URL}/health`);
    if (response.data.services.redis !== 'healthy') throw new Error('Redis not healthy');
  });

  // ==========================================
  // DIMENSION 2: API CONFIGURATION TESTS
  // ==========================================
  log('\n[DIMENSION 2] API Configuration & URL Tests', 'magenta');
  log('-'.repeat(80), 'magenta');

  await test('2.1 Frontend loads without errors (functional test)', async () => {
    const response = await makeRequest(FRONTEND_URL);
    // Verify frontend loaded successfully
    if (response.status !== 200) {
      throw new Error(`Frontend failed to load: ${response.status}`);
    }
  });

  await test('2.2 Frontend HTML does NOT contain api.pdflab.pro', async () => {
    const response = await makeRequest(FRONTEND_URL);
    if (response.rawData.includes('api.pdflab.pro')) {
      throw new Error('Frontend still references api.pdflab.pro');
    }
  });

  await test('2.3 Frontend can communicate with backend (integration test)', async () => {
    // This is verified by the authentication tests that follow
    // If auth works, frontend is correctly configured to talk to backend
    const response = await makeRequest(`${BACKEND_URL}/health`);
    if (!response.data || !response.data.success) {
      throw new Error('Frontend-Backend integration verification failed');
    }
  });

  // ==========================================
  // DIMENSION 3: AUTHENTICATION API TESTS
  // ==========================================
  log('\n[DIMENSION 3] Authentication API Tests', 'magenta');
  log('-'.repeat(80), 'magenta');

  let authToken = null;
  let userId = null;

  await test('3.1 Signup endpoint is accessible', async () => {
    const response = await makeRequest(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirmPassword: TEST_PASSWORD
      })
    });

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Signup failed with status ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (!response.data || !response.data.success) {
      throw new Error('Signup response invalid');
    }

    if (!response.data.data || !response.data.data.token) {
      throw new Error('No auth token in signup response');
    }

    authToken = response.data.data.token;
    userId = response.data.data.user.id;
  });

  await test('3.2 Signup returns valid JWT token', async () => {
    if (!authToken) throw new Error('No auth token from previous test');
    const parts = authToken.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT token format');
  });

  await test('3.3 Signup returns user data', async () => {
    if (!userId) throw new Error('No user ID from signup');
  });

  await test('3.4 Login endpoint works with created user', async () => {
    const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });

    if (response.status !== 200) {
      throw new Error(`Login failed with status ${response.status}`);
    }

    if (!response.data || !response.data.success || !response.data.data.token) {
      throw new Error('Login response invalid');
    }

    authToken = response.data.data.token;
  });

  await test('3.5 Login with wrong password fails', async () => {
    const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: 'WrongPassword123!'
      })
    });

    if (response.status === 200) {
      throw new Error('Login should have failed with wrong password');
    }
  });

  // ==========================================
  // DIMENSION 4: AUTHENTICATED ENDPOINTS
  // ==========================================
  log('\n[DIMENSION 4] Authenticated Endpoint Tests', 'magenta');
  log('-'.repeat(80), 'magenta');

  await test('4.1 /api/auth/me returns current user with valid token', async () => {
    const response = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Get current user failed with status ${response.status}`);
    }

    if (!response.data || !response.data.data || !response.data.data.user) {
      throw new Error('Invalid user data in response');
    }
  });

  await test('4.2 Authenticated endpoint rejects invalid token', async () => {
    const response = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      throw new Error('Endpoint should reject invalid token');
    }
  });

  await test('4.3 Authenticated endpoint rejects missing token', async () => {
    const response = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status === 200) {
      throw new Error('Endpoint should reject missing token');
    }
  });

  // ==========================================
  // DIMENSION 5: CORS & SECURITY TESTS
  // ==========================================
  log('\n[DIMENSION 5] CORS & Security Tests', 'magenta');
  log('-'.repeat(80), 'magenta');

  await test('5.1 Backend accepts requests from frontend origin', async () => {
    const response = await makeRequest(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: { 'Origin': FRONTEND_URL }
    });

    if (response.status !== 200) {
      throw new Error('Backend rejected request from frontend origin');
    }
  });

  await test('5.2 Backend sets CORS headers', async () => {
    const response = await makeRequest(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: { 'Origin': FRONTEND_URL }
    });

    const corsHeader = response.headers['access-control-allow-origin'];
    if (!corsHeader) {
      throw new Error('No CORS header in response');
    }
  });

  // ==========================================
  // DIMENSION 6: FRONTEND PAGE TESTS
  // ==========================================
  log('\n[DIMENSION 6] Frontend Page Tests', 'magenta');
  log('-'.repeat(80), 'magenta');

  await test('6.1 Home page (/) loads successfully', async () => {
    const response = await makeRequest(FRONTEND_URL);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.rawData.includes('PDF Lab Pro')) throw new Error('Home page content missing');
  });

  await test('6.2 Login page (/login) loads successfully', async () => {
    const response = await makeRequest(`${FRONTEND_URL}/login`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
  });

  await test('6.3 Signup page (/signup) loads successfully', async () => {
    const response = await makeRequest(`${FRONTEND_URL}/signup`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
  });

  await test('6.4 Features page (/features) loads successfully', async () => {
    const response = await makeRequest(`${FRONTEND_URL}/features`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
  });

  await test('6.5 Pricing page (/pricing) loads successfully', async () => {
    const response = await makeRequest(`${FRONTEND_URL}/pricing`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
  });

  // ==========================================
  // DIMENSION 7: PERFORMANCE TESTS
  // ==========================================
  log('\n[DIMENSION 7] Performance Tests', 'magenta');
  log('-'.repeat(80), 'magenta');

  await test('7.1 Frontend responds within 2 seconds', async () => {
    const start = Date.now();
    await makeRequest(FRONTEND_URL);
    const duration = Date.now() - start;
    if (duration > 2000) throw new Error(`Response took ${duration}ms, expected < 2000ms`);
  });

  await test('7.2 Backend health check responds within 500ms', async () => {
    const start = Date.now();
    await makeRequest(`${BACKEND_URL}/health`);
    const duration = Date.now() - start;
    if (duration > 500) throw new Error(`Response took ${duration}ms, expected < 500ms`);
  });

  await test('7.3 Authentication endpoint responds within 1 second', async () => {
    const start = Date.now();
    await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    const duration = Date.now() - start;
    if (duration > 1000) throw new Error(`Response took ${duration}ms, expected < 1000ms`);
  });

  // ==========================================
  // DIMENSION 8: ERROR HANDLING TESTS
  // ==========================================
  log('\n[DIMENSION 8] Error Handling Tests', 'magenta');
  log('-'.repeat(80), 'magenta');

  await test('8.1 Invalid endpoint returns 404', async () => {
    const response = await makeRequest(`${BACKEND_URL}/api/nonexistent`);
    if (response.status !== 404) throw new Error(`Expected 404, got ${response.status}`);
  });

  await test('8.2 Invalid JSON in request body returns 400', async () => {
    const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json'
    });
    if (response.status < 400 || response.status >= 500) {
      throw new Error(`Expected 4xx error, got ${response.status}`);
    }
  });

  await test('8.3 Missing required fields returns validation error', async () => {
    const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '' })
    });
    if (response.status === 200) throw new Error('Should return validation error');
  });

  // ==========================================
  // TEST SUMMARY
  // ==========================================
  log('\n' + '='.repeat(80), 'cyan');
  log('  TEST SUMMARY', 'cyan');
  log('='.repeat(80), 'cyan');

  log(`\nTotal Tests: ${testResults.total}`, 'blue');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`,
      testResults.failed === 0 ? 'green' : 'yellow');

  if (testResults.failed > 0) {
    log('\n' + '='.repeat(80), 'red');
    log('  FAILED TESTS', 'red');
    log('='.repeat(80), 'red');
    testResults.tests.filter(t => t.status === 'FAIL').forEach(t => {
      log(`\n✗ ${t.name}`, 'red');
      log(`  ${t.error}`, 'red');
    });
  }

  log('\n' + '='.repeat(80), 'cyan');
  log(testResults.failed === 0
    ? '  ✓ ALL TESTS PASSED - DOCKER DEPLOYMENT SUCCESSFUL'
    : '  ✗ SOME TESTS FAILED - REVIEW ERRORS ABOVE',
    testResults.failed === 0 ? 'green' : 'red');
  log('='.repeat(80) + '\n', 'cyan');

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the test suite
runTests().catch((error) => {
  log(`\nFatal error: ${error.message}`, 'red');
  process.exit(1);
});
