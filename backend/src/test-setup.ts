// Jest setup file for global test configuration
import { connectDatabase } from './config/database';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';

// Suppress console warnings during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;
  console.warn = (...args: any[]) => {
    // Only show warnings that are not related to test environment
    if (!args[0]?.toString().includes('deprecated') &&
        !args[0]?.toString().includes('Warning:')) {
      originalConsoleWarn.apply(console, args);
    }
  };

  console.log = (...args: any[]) => {
    // Suppress database connection logs during tests unless debugging
    if (!args[0]?.toString().includes('✅') &&
        !args[0]?.toString().includes('SQLite')) {
      originalConsoleLog.apply(console, args);
    }
  };
}

// Global test timeout
jest.setTimeout(15000);

// Initialize database before all tests
beforeAll(async () => {
  try {
    // Connect to SQLite database for testing
    await connectDatabase();
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
});

// Clean up after all tests
afterAll(async () => {
  // Import here to avoid circular dependency issues
  const { closeConnection } = await import('./config/database');
  await closeConnection();
});