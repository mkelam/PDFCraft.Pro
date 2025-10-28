/**
 * Jest Configuration for Integration Tests
 * Optimized for testing service integration and API endpoints
 */

module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'node',

  // Root directory
  rootDir: './src',

  // Test match patterns for integration tests
  testMatch: [
    '**/tests/integration/**/*.test.ts',
    '**/tests/integration/**/*.test.js'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/integration/setup.ts'
  ],

  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Transform files
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },

  // File extensions to consider
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Coverage configuration
  collectCoverageFrom: [
    'services/**/*.ts',
    'controllers/**/*.ts',
    'middleware/**/*.ts',
    'routes/**/*.ts',
    '!**/*.test.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],

  // Coverage thresholds for integration tests
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Test timeout for integration tests (longer than unit tests)
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Maximum number of concurrent workers
  maxWorkers: 4,

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/integration/global-setup.ts',
  globalTeardown: '<rootDir>/tests/integration/global-teardown.ts'
};