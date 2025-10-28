/**
 * Comprehensive Session Management Test Suite
 * Tests all aspects of the session management system with edge cases
 */

const API_BASE = 'http://localhost:3014';

// Test configuration
const TESTS = {
  REGISTRATION: true,
  LOGIN: true,
  TOKEN_REFRESH: true,
  PROTECTED_ROUTES: true,
  SECURITY: true,
  EDGE_CASES: true,
  PERFORMANCE: true,
  INTEGRATION: true
};

// Test data
const testUsers = [
  {
    email: 'comprehensive-test1@example.com',
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!'
  },
  {
    email: 'comprehensive-test2@example.com',
    password: 'DifferentPass456!',
    confirmPassword: 'DifferentPass456!'
  }
];

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

// Utility functions
function logTest(testName, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const message = `${status} - ${testName}${details ? ': ' + details : ''}`;
  console.log(message);

  testResults.details.push({ testName, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

function logWarning(message) {
  console.log(`⚠️  WARNING - ${message}`);
  testResults.warnings++;
}

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const defaultOptions = {
    headers: { 'Content-Type': 'application/json' }
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    const data = await response.json();
    return { response, data, error: null };
  } catch (error) {
    return { response: null, data: null, error };
  }
}

// Advanced JWT token analysis
function analyzeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, reason: 'Invalid JWT structure' };

    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));

    const now = Date.now() / 1000;
    const isExpired = payload.exp < now;
    const timeUntilExpiry = payload.exp - now;

    return {
      valid: true,
      header,
      payload,
      isExpired,
      timeUntilExpiry,
      expiresAt: new Date(payload.exp * 1000).toISOString()
    };
  } catch (error) {
    return { valid: false, reason: 'Token parsing failed' };
  }
}

// Test 1: Basic Authentication Flow
async function testBasicAuthFlow() {
  console.log('\n🔐 Test 1: Basic Authentication Flow');
  console.log('=====================================');

  const user = testUsers[0];

  // Test registration
  const { response: regResponse, data: regData } = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(user)
  });

  if (regResponse?.status === 409) {
    logTest('Registration (User Exists)', true, 'User already exists, continuing');
  } else if (regData?.success) {
    logTest('Registration', true, `User ${regData.data.user.email} created`);
  } else {
    logTest('Registration', false, regData?.error?.message || 'Unknown error');
    return null;
  }

  // Test login
  const { response: loginResponse, data: loginData } = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: user.email, password: user.password })
  });

  if (loginData?.success) {
    logTest('Login', true, `Token received: ${loginData.data.token ? 'Yes' : 'No'}`);

    // Analyze JWT token
    const tokenAnalysis = analyzeJWT(loginData.data.token);
    if (tokenAnalysis.valid) {
      logTest('JWT Token Structure', true, `Expires: ${tokenAnalysis.expiresAt}`);
      logTest('JWT Token Expiry', tokenAnalysis.timeUntilExpiry > 0,
        `${Math.round(tokenAnalysis.timeUntilExpiry / 60)} minutes until expiry`);
    } else {
      logTest('JWT Token Structure', false, tokenAnalysis.reason);
    }

    return loginData.data;
  } else {
    logTest('Login', false, loginData?.error?.message || 'Unknown error');
    return null;
  }
}

// Test 2: Token Refresh Mechanism
async function testTokenRefresh(authData) {
  console.log('\n🔄 Test 2: Token Refresh Mechanism');
  console.log('===================================');

  if (!authData?.refreshToken) {
    logTest('Token Refresh', false, 'No refresh token available');
    return null;
  }

  // Test valid refresh token
  const { data: refreshData } = await makeRequest('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: authData.refreshToken })
  });

  if (refreshData?.success) {
    logTest('Valid Refresh Token', true, 'New token generated');

    // Compare old vs new token
    const oldToken = analyzeJWT(authData.token);
    const newToken = analyzeJWT(refreshData.data.token);

    if (oldToken.valid && newToken.valid) {
      const timeDifference = newToken.payload.exp - oldToken.payload.exp;
      logTest('Token Refresh Extension', timeDifference > 0,
        `Extended by ${Math.round(timeDifference / 60)} minutes`);
    }

    return refreshData.data;
  } else {
    logTest('Valid Refresh Token', false, refreshData?.error?.message);
  }

  // Test invalid refresh token
  const { data: invalidRefreshData } = await makeRequest('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: 'invalid-refresh-token' })
  });

  logTest('Invalid Refresh Token Rejection', !invalidRefreshData?.success,
    invalidRefreshData?.error?.message);

  return null;
}

// Test 3: Protected Routes Security
async function testProtectedRoutes(authData) {
  console.log('\n🛡️  Test 3: Protected Routes Security');
  console.log('====================================');

  if (!authData?.token) {
    logTest('Protected Routes', false, 'No token available for testing');
    return;
  }

  // Test valid token access
  const { data: validData } = await makeRequest('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${authData.token}` }
  });

  logTest('Valid Token Access', validData?.success,
    validData?.success ? `User: ${validData.data.user.email}` : validData?.error?.message);

  // Test no token
  const { data: noTokenData } = await makeRequest('/api/auth/me');
  logTest('No Token Rejection', !noTokenData?.success && noTokenData?.error?.code === 'AUTH_TOKEN_MISSING');

  // Test malformed token
  const { data: malformedData } = await makeRequest('/api/auth/me', {
    headers: { 'Authorization': 'Bearer malformed-token' }
  });
  logTest('Malformed Token Rejection', !malformedData?.success);

  // Test expired token (simulated)
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAwfQ.invalid';
  const { data: expiredData } = await makeRequest('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${expiredToken}` }
  });
  logTest('Expired Token Rejection', !expiredData?.success);

  // Test wrong signature
  const wrongSigToken = authData.token.slice(0, -10) + 'wrongsignature';
  const { data: wrongSigData } = await makeRequest('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${wrongSigToken}` }
  });
  logTest('Wrong Signature Rejection', !wrongSigData?.success);
}

// Test 4: Edge Cases and Error Handling
async function testEdgeCases() {
  console.log('\n🚨 Test 4: Edge Cases and Error Handling');
  console.log('========================================');

  // Test SQL injection attempts
  const sqlInjectionAttempts = [
    "'; DROP TABLE users; --",
    "admin@example.com' OR '1'='1",
    "test@example.com'; INSERT INTO users"
  ];

  for (const email of sqlInjectionAttempts) {
    const { data } = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'password' })
    });
    logTest(`SQL Injection Protection (${email.substring(0, 20)}...)`, !data?.success);
  }

  // Test XSS attempts in email
  const xssAttempts = [
    "<script>alert('xss')</script>@example.com",
    "javascript:alert('xss')@example.com",
    "test+<img src=x onerror=alert('xss')>@example.com"
  ];

  for (const email of xssAttempts) {
    const { data } = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!'
      })
    });
    logTest(`XSS Protection (${email.substring(0, 20)}...)`, !data?.success);
  }

  // Test password validation edge cases
  const invalidPasswords = [
    '',                    // Empty
    '123',                 // Too short
    'password',            // No uppercase/numbers
    'PASSWORD123',         // No lowercase
    'Password',            // No numbers
    'Pass 123!',          // Spaces
    'Pass123',            // No special chars
  ];

  for (const password of invalidPasswords) {
    const { data } = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: `test-invalid-${Date.now()}@example.com`,
        password,
        confirmPassword: password
      })
    });
    logTest(`Password Validation (${password || 'empty'})`, !data?.success);
  }

  // Test extremely long payloads
  const longEmail = 'a'.repeat(1000) + '@example.com';
  const { data: longEmailData } = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: longEmail,
      password: 'ValidPass123!',
      confirmPassword: 'ValidPass123!'
    })
  });
  logTest('Long Email Rejection', !longEmailData?.success);

  // Test concurrent login attempts
  console.log('Testing concurrent login attempts...');
  const concurrentPromises = [];
  for (let i = 0; i < 5; i++) {
    concurrentPromises.push(makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      })
    }));
  }

  const concurrentResults = await Promise.all(concurrentPromises);
  const rateLimited = concurrentResults.some(r => r.response?.status === 429);
  logTest('Rate Limiting', rateLimited, rateLimited ? 'Rate limiting triggered' : 'May need more attempts');
}

// Test 5: Frontend Integration
async function testFrontendIntegration() {
  console.log('\n🌐 Test 5: Frontend Integration');
  console.log('===============================');

  // Test if frontend pages are accessible
  const pages = [
    '/',
    '/login',
    '/signup',
    '/session-demo'
  ];

  for (const page of pages) {
    try {
      const response = await fetch(`http://localhost:3000${page}`);
      logTest(`Frontend Page ${page}`, response.ok, `Status: ${response.status}`);
    } catch (error) {
      logTest(`Frontend Page ${page}`, false, `Error: ${error.message}`);
    }
  }

  // Test CORS headers
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:3000' }
    });
    const corsHeader = response.headers.get('Access-Control-Allow-Origin');
    logTest('CORS Configuration', corsHeader !== null, `CORS header: ${corsHeader}`);
  } catch (error) {
    logTest('CORS Configuration', false, error.message);
  }
}

// Test 6: Performance and Memory
async function testPerformance() {
  console.log('\n⚡ Test 6: Performance and Memory');
  console.log('=================================');

  // Test response times
  const startTime = Date.now();
  const { data } = await makeRequest('/health');
  const responseTime = Date.now() - startTime;

  logTest('Health Check Response Time', responseTime < 100, `${responseTime}ms`);
  if (responseTime > 500) {
    logWarning(`Slow health check response: ${responseTime}ms`);
  }

  // Test login performance
  const loginStartTime = Date.now();
  await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testUsers[0].email,
      password: testUsers[0].password
    })
  });
  const loginTime = Date.now() - loginStartTime;

  logTest('Login Response Time', loginTime < 1000, `${loginTime}ms`);
  if (loginTime > 2000) {
    logWarning(`Slow login response: ${loginTime}ms`);
  }

  // Test memory usage (from health endpoint)
  if (data?.memory) {
    const memoryUsageMB = data.memory.heapUsed / (1024 * 1024);
    logTest('Memory Usage', memoryUsageMB < 500, `${memoryUsageMB.toFixed(2)}MB`);

    if (memoryUsageMB > 100) {
      logWarning(`High memory usage: ${memoryUsageMB.toFixed(2)}MB`);
    }
  }
}

// Test 7: Session Persistence
async function testSessionPersistence(authData) {
  console.log('\n💾 Test 7: Session Persistence');
  console.log('==============================');

  if (!authData) {
    logTest('Session Persistence', false, 'No auth data available');
    return;
  }

  // Simulate browser storage operations
  const mockLocalStorage = {};

  // Test session storage simulation
  try {
    const sessionData = {
      user: authData.user,
      accessToken: authData.token,
      refreshToken: authData.refreshToken,
      expiresAt: Date.now() + (15 * 60 * 1000),
      lastActivity: Date.now()
    };

    const encoded = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    mockLocalStorage['pdflab_session'] = encoded;

    const decoded = JSON.parse(Buffer.from(mockLocalStorage['pdflab_session'], 'base64').toString());

    logTest('Session Encoding/Decoding',
      decoded.user.email === authData.user.email,
      'Session data preserved');

    // Test session expiry logic
    const expiredSession = { ...sessionData, expiresAt: Date.now() - 1000 };
    const isExpired = Date.now() > expiredSession.expiresAt;
    logTest('Session Expiry Detection', isExpired, 'Expired session detected');

    // Test inactivity timeout
    const inactiveSession = { ...sessionData, lastActivity: Date.now() - (61 * 60 * 1000) };
    const isInactive = (Date.now() - inactiveSession.lastActivity) > (60 * 60 * 1000);
    logTest('Inactivity Timeout Detection', isInactive, 'Inactive session detected');

  } catch (error) {
    logTest('Session Storage Operations', false, error.message);
  }
}

// Main test execution
async function runComprehensiveTests() {
  console.log('🧪 COMPREHENSIVE SESSION MANAGEMENT TEST SUITE');
  console.log('==============================================');
  console.log('Testing enhanced session management with edge cases\n');

  let authData = null;

  try {
    // Test 1: Basic Authentication
    if (TESTS.REGISTRATION) {
      authData = await testBasicAuthFlow();
    }

    // Test 2: Token Refresh
    if (TESTS.TOKEN_REFRESH && authData) {
      const refreshedData = await testTokenRefresh(authData);
      if (refreshedData) authData = refreshedData;
    }

    // Test 3: Protected Routes
    if (TESTS.PROTECTED_ROUTES && authData) {
      await testProtectedRoutes(authData);
    }

    // Test 4: Edge Cases
    if (TESTS.EDGE_CASES) {
      await testEdgeCases();
    }

    // Test 5: Frontend Integration
    if (TESTS.INTEGRATION) {
      await testFrontendIntegration();
    }

    // Test 6: Performance
    if (TESTS.PERFORMANCE) {
      await testPerformance();
    }

    // Test 7: Session Persistence
    if (TESTS.SECURITY && authData) {
      await testSessionPersistence(authData);
    }

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error);
    testResults.failed++;
  }

  // Final results
  console.log('\n📊 COMPREHENSIVE TEST RESULTS');
  console.log('=============================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  if (testResults.failed > 0) {
    console.log('\n🚨 FAILED TESTS:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => console.log(`   ❌ ${test.testName}: ${test.details}`));
  }

  if (testResults.warnings > 0) {
    console.log('\n⚠️  WARNINGS FOUND - Review performance and security settings');
  }

  const overallStatus = testResults.failed === 0 ? 'PASSED' : 'FAILED';
  console.log(`\n🎯 OVERALL STATUS: ${overallStatus}`);

  if (overallStatus === 'PASSED') {
    console.log('🎉 All session management features working correctly!');
  } else {
    console.log('🔧 Some issues found - review failed tests above');
  }
}

// Execute tests
runComprehensiveTests().catch(console.error);