/**
 * Integration Test Setup
 * Common setup and configuration for all integration tests
 */

import { jest } from '@jest/globals';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Store original methods for restoration
global.originalConsole = {
  log: originalConsoleLog,
  warn: originalConsoleWarn,
  error: originalConsoleError
};

// Mock console methods during tests
beforeAll(() => {
  // Only show important console messages during tests
  console.log = (...args: any[]) => {
    if (args[0] && typeof args[0] === 'string' &&
        (args[0].includes('✅') || args[0].includes('❌') || args[0].includes('🧪'))) {
      originalConsoleLog(...args);
    }
  };

  console.warn = (...args: any[]) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('⚠️')) {
      originalConsoleWarn(...args);
    }
  };

  console.error = (...args: any[]) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('❌')) {
      originalConsoleError(...args);
    }
  };
});

// Restore console methods after tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Global test configuration
global.testConfig = {
  timeout: 30000,
  maxRetries: 3,
  cleanupAfterTests: true
};

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

export {};