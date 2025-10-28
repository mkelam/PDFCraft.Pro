/**
 * Global Setup for Integration Tests
 * Runs once before all integration tests
 */

import { promises as fs } from 'fs';
import * as path from 'path';

export default async function globalSetup() {
  console.log('🔧 Setting up integration test environment...');

  // Create test directories
  const testDirs = [
    path.join(__dirname, '../test-files'),
    path.join(__dirname, '../test-output'),
    path.join(__dirname, '../test-data'),
    path.join(process.cwd(), 'data/test')
  ];

  for (const dir of testDirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.QUALITY_METRICS_FILE = path.join(process.cwd(), 'data/test/quality-metrics.json');
  process.env.QUALITY_REPORTS_DIR = path.join(process.cwd(), 'data/test/quality-reports');

  console.log('✅ Integration test environment setup complete');
};