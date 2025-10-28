/**
 * Global Teardown for Integration Tests
 * Runs once after all integration tests complete
 */

import { promises as fs } from 'fs';
import * as path from 'path';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up integration test environment...');

  // Cleanup test directories
  const testDirs = [
    path.join(__dirname, '../test-files'),
    path.join(__dirname, '../test-output'),
    path.join(__dirname, '../test-data'),
    path.join(process.cwd(), 'data/test')
  ];

  for (const dir of testDirs) {
    try {
      await fs.rmdir(dir, { recursive: true });
    } catch (error) {
      // Directory might not exist or have permission issues
    }
  }

  // Reset environment variables
  delete process.env.QUALITY_METRICS_FILE;
  delete process.env.QUALITY_REPORTS_DIR;

  console.log('✅ Integration test cleanup complete');
};