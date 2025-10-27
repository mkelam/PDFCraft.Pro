/**
 * Integration Test Runner
 * Comprehensive test suite runner for quality validation system
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
}

class IntegrationTestRunner {
  private testSuites: TestSuite[] = [];
  private overallStartTime: number = 0;

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Quality Validation Integration Test Suite');
    console.log('=' .repeat(60));

    this.overallStartTime = Date.now();

    try {
      // Pre-test setup
      await this.preTestSetup();

      // Run test suites
      await this.runTestSuite('Service Integration Tests', 'service-integration.test.ts');
      await this.runTestSuite('API Integration Tests', 'api-integration.test.ts');

      // Generate test report
      await this.generateTestReport();

      // Post-test cleanup
      await this.postTestCleanup();

    } catch (error) {
      console.error('❌ Integration test suite failed:', error);
      process.exit(1);
    }
  }

  private async preTestSetup(): Promise<void> {
    console.log('🔧 Setting up test environment...');

    // Ensure test directories exist
    const testDirs = [
      path.join(__dirname, '../test-files'),
      path.join(__dirname, '../test-output'),
      path.join(__dirname, '../test-data')
    ];

    for (const dir of testDirs) {
      await fs.mkdir(dir, { recursive: true });
    }

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';

    console.log('✅ Test environment setup complete');
  }

  private async runTestSuite(suiteName: string, testFile: string): Promise<void> {
    console.log(`\n📋 Running ${suiteName}...`);
    const suiteStartTime = Date.now();

    try {
      // Execute Jest for specific test file
      const command = `npx jest --config jest.integration.config.js --testPathPattern=${testFile} --verbose --json`;
      const output = execSync(command, {
        encoding: 'utf-8',
        cwd: path.join(__dirname, '../../..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Parse Jest output
      const results = JSON.parse(output);
      const suite = this.parseJestResults(suiteName, results, suiteStartTime);
      this.testSuites.push(suite);

      this.logSuiteResults(suite);

    } catch (error: any) {
      // Handle test failures
      const suite: TestSuite = {
        name: suiteName,
        tests: [],
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        skippedTests: 0,
        duration: Date.now() - suiteStartTime
      };

      // Try to parse error output if it's JSON
      try {
        const errorOutput = error.stdout || error.message;
        const results = JSON.parse(errorOutput);
        const parsedSuite = this.parseJestResults(suiteName, results, suiteStartTime);
        this.testSuites.push(parsedSuite);
        this.logSuiteResults(parsedSuite);
      } catch {
        suite.tests.push({
          name: 'Test Suite Execution',
          status: 'failed',
          duration: suite.duration,
          error: error.message
        });
        this.testSuites.push(suite);
        console.error(`❌ ${suiteName} failed:`, error.message);
      }
    }
  }

  private parseJestResults(suiteName: string, jestResults: any, startTime: number): TestSuite {
    const suite: TestSuite = {
      name: suiteName,
      tests: [],
      totalTests: jestResults.numTotalTests || 0,
      passedTests: jestResults.numPassedTests || 0,
      failedTests: jestResults.numFailedTests || 0,
      skippedTests: jestResults.numPendingTests || 0,
      duration: Date.now() - startTime
    };

    // Parse individual test results
    if (jestResults.testResults) {
      jestResults.testResults.forEach((testFile: any) => {
        if (testFile.assertionResults) {
          testFile.assertionResults.forEach((test: any) => {
            suite.tests.push({
              name: test.title || test.fullName,
              status: test.status === 'passed' ? 'passed' :
                     test.status === 'failed' ? 'failed' : 'skipped',
              duration: test.duration || 0,
              error: test.failureMessages?.join('\n')
            });
          });
        }
      });
    }

    return suite;
  }

  private logSuiteResults(suite: TestSuite): void {
    const { name, totalTests, passedTests, failedTests, skippedTests, duration } = suite;

    console.log(`\n📊 ${name} Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   ⏭️  Skipped: ${skippedTests}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);

    if (failedTests > 0) {
      console.log(`\n❌ Failed Tests in ${name}:`);
      suite.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error || 'Unknown error'}`);
        });
    }
  }

  private async generateTestReport(): Promise<void> {
    console.log('\n📋 Generating Test Report...');

    const totalDuration = Date.now() - this.overallStartTime;
    const overallStats = this.calculateOverallStats();

    const report = {
      timestamp: new Date().toISOString(),
      environment: 'integration-test',
      duration: totalDuration,
      overview: overallStats,
      testSuites: this.testSuites,
      summary: this.generateSummary(overallStats)
    };

    // Save report to file
    const reportPath = path.join(__dirname, '../test-output/integration-test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable summary
    this.logOverallResults(overallStats, totalDuration);

    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }

  private calculateOverallStats() {
    return this.testSuites.reduce((stats, suite) => ({
      totalTests: stats.totalTests + suite.totalTests,
      passedTests: stats.passedTests + suite.passedTests,
      failedTests: stats.failedTests + suite.failedTests,
      skippedTests: stats.skippedTests + suite.skippedTests
    }), { totalTests: 0, passedTests: 0, failedTests: 0, skippedTests: 0 });
  }

  private generateSummary(stats: any): string[] {
    const recommendations: string[] = [];

    if (stats.failedTests === 0) {
      recommendations.push('🎉 All integration tests passed! Quality validation system is working correctly.');
    } else {
      recommendations.push(`⚠️ ${stats.failedTests} tests failed. Review failed tests and fix issues.`);
    }

    const successRate = (stats.passedTests / stats.totalTests) * 100;

    if (successRate >= 95) {
      recommendations.push('✅ Excellent test coverage and success rate.');
    } else if (successRate >= 80) {
      recommendations.push('🔶 Good test coverage, but some improvements needed.');
    } else {
      recommendations.push('🔴 Test success rate below 80%. Significant issues need attention.');
    }

    return recommendations;
  }

  private logOverallResults(stats: any, duration: number): void {
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 INTEGRATION TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));

    const successRate = ((stats.passedTests / stats.totalTests) * 100).toFixed(1);

    console.log(`📊 Overall Statistics:`);
    console.log(`   Total Tests: ${stats.totalTests}`);
    console.log(`   ✅ Passed: ${stats.passedTests}`);
    console.log(`   ❌ Failed: ${stats.failedTests}`);
    console.log(`   ⏭️  Skipped: ${stats.skippedTests}`);
    console.log(`   📈 Success Rate: ${successRate}%`);
    console.log(`   ⏱️  Total Duration: ${duration}ms`);

    // Quality assessment
    if (stats.failedTests === 0) {
      console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
      console.log('✅ Quality validation system is fully functional and ready for production.');
    } else {
      console.log(`\n⚠️ ${stats.failedTests} TESTS FAILED`);
      console.log('🔧 Review failed tests and address issues before production deployment.');
    }

    // Test suite breakdown
    console.log('\n📋 Test Suite Breakdown:');
    this.testSuites.forEach(suite => {
      const suiteSuccessRate = ((suite.passedTests / suite.totalTests) * 100).toFixed(1);
      const status = suite.failedTests === 0 ? '✅' : '❌';
      console.log(`   ${status} ${suite.name}: ${suite.passedTests}/${suite.totalTests} (${suiteSuccessRate}%)`);
    });

    console.log('\n' + '=' .repeat(60));
  }

  private async postTestCleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test environment...');

    // Cleanup test directories (optional - keep for debugging)
    // const testDirs = [
    //   path.join(__dirname, '../test-files'),
    //   path.join(__dirname, '../test-output'),
    //   path.join(__dirname, '../test-data')
    // ];

    // for (const dir of testDirs) {
    //   try {
    //     await fs.rmdir(dir, { recursive: true });
    //   } catch (error) {
    //     // Ignore cleanup errors
    //   }
    // }

    console.log('✅ Test cleanup complete');
  }
}

// Run integration tests if this file is executed directly
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  runner.runAllTests().catch(error => {
    console.error('❌ Integration test runner failed:', error);
    process.exit(1);
  });
}

export { IntegrationTestRunner };