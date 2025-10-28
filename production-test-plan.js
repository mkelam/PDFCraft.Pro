/**
 * WEEK 2: PRODUCTION TESTING WITH REAL DOCUMENTS
 *
 * Comprehensive test suite to stress-test pdflab.pro with actual user documents
 * Testing CloudConvert-primary pipeline with monitoring
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const SERVER_URL = 'http://localhost:3013';

// Test document categories from real uploads
const testCategories = {
  businessReports: [
    './backend/Business_Report_Q4_2024.pdf',
    './backend/uploads/91fa842d-e730-4a06-953d-7e9e4bb3d5b0_Business_Report_Q4_2024.pdf'
  ],

  bankStatements: [
    './backend/uploads/064b7649-22c9-4e64-a73b-e3d30e8e4cbe_Capitec Proof of Account malibongwe mkela.pdf',
    './backend/uploads/25297465-ed40-4678-a481-cfd575ed495d_Capitec Proof of Account malibongwe mkela.pdf'
  ],

  identityDocuments: [
    './backend/uploads/0e13155d-db1f-46f1-9d16-e668caee3a03_MMkela ID FrontBack.pdf',
    './backend/uploads/35e498d5-0d68-4792-8224-a9c25f974330_MMkela ID FrontBack.pdf'
  ],

  municipalStatements: [
    './backend/uploads/02e7839b-2bcc-49cc-98b5-0966a974a84b_Municipal Statement.pdf',
    './backend/uploads/0c022cca-f7f5-4bb9-9ff5-674495b85575_Municipal Statement.pdf'
  ],

  contractDocuments: [
    './backend/uploads/173b8064-852a-4440-b162-7bfa8c3c2a3d_Paystack_Merchant_Service_Agreement_1585065.pdf',
    './backend/uploads/a18c369a-4631-48a0-a9a2-344c4a463d80_Paystack_Merchant_Service_Agreement_1585065.pdf'
  ],

  mergedDocuments: [
    './backend/merged_e0156e7a-de9c-4439-b43e-cadff05ed220.pdf',
    './backend/uploads/merged_e0156e7a-de9c-4439-b43e-cadff05ed220.pdf'
  ],

  simpleDocuments: [
    './simple-test.pdf',
    './test-cloudconvert.pdf'
  ]
};

// Test metrics we want to capture
let testResults = {
  timestamp: new Date().toISOString(),
  totalTests: 0,
  successful: 0,
  failed: 0,
  cloudConvertUsed: 0,
  ocrFallback: 0,
  categories: {},
  performance: {
    avgResponseTime: 0,
    avgConversionTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity
  },
  errors: [],
  detailedResults: []
};

/**
 * Test a single PDF conversion
 */
async function testConversion(filePath, category) {
  console.log(`\n🧪 Testing: ${path.basename(filePath)} (${category})`);

  const startTime = Date.now();

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileStats = fs.statSync(filePath);
    console.log(`📄 File size: ${(fileStats.size / 1024).toFixed(1)} KB`);

    // Create form data
    const formData = new FormData();
    formData.append('files', fs.createReadStream(filePath));

    // Send conversion request
    const response = await axios.post(`${SERVER_URL}/api/convert/pdf-to-ppt`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 60000 // 60 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (response.data.success) {
      const jobId = response.data.jobId;
      const routingInfo = response.data.routingInfo;

      console.log(`✅ Conversion started: ${jobId}`);
      console.log(`🔄 Route: ${routingInfo.preferredService} - ${routingInfo.reason}`);
      console.log(`💰 Cost: $${routingInfo.estimatedCost}`);
      console.log(`⏱️  Response time: ${responseTime}ms`);

      // Wait for job completion and track total time
      const conversionResult = await waitForJobCompletion(jobId);
      const totalTime = Date.now() - startTime;

      const result = {
        file: path.basename(filePath),
        category,
        success: conversionResult.success,
        jobId,
        responseTime,
        totalTime,
        fileSize: fileStats.size,
        routing: routingInfo,
        cloudConvertUsed: routingInfo.preferredService === 'cloudconvert' || routingInfo.preferredService === 'CloudConvert',
        details: conversionResult
      };

      testResults.detailedResults.push(result);

      if (conversionResult.success) {
        console.log(`🎉 Total conversion time: ${totalTime}ms`);
        testResults.successful++;

        if (result.cloudConvertUsed) {
          testResults.cloudConvertUsed++;
        } else {
          testResults.ocrFallback++;
        }
      } else {
        console.log(`❌ Conversion failed: ${conversionResult.error || 'Unknown error'}`);
        testResults.failed++;
        testResults.errors.push({
          file: path.basename(filePath),
          category,
          error: conversionResult.error || 'Conversion failed'
        });
      }

      // Update performance metrics
      testResults.performance.avgResponseTime =
        (testResults.performance.avgResponseTime * (testResults.totalTests - 1) + responseTime) / testResults.totalTests;
      testResults.performance.maxResponseTime = Math.max(testResults.performance.maxResponseTime, responseTime);
      testResults.performance.minResponseTime = Math.min(testResults.performance.minResponseTime, responseTime);

      return result;

    } else {
      throw new Error(response.data.error || 'Conversion request failed');
    }

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`❌ Test failed: ${error.message}`);

    testResults.failed++;
    testResults.errors.push({
      file: path.basename(filePath),
      category,
      error: error.message
    });

    testResults.detailedResults.push({
      file: path.basename(filePath),
      category,
      success: false,
      responseTime,
      error: error.message
    });

    return null;
  }
}

/**
 * Wait for job completion
 */
async function waitForJobCompletion(jobId, maxWaitTime = 120000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await axios.get(`${SERVER_URL}/api/job/${jobId}/status`);
      const status = response.data;

      if (status.status === 'completed') {
        return { success: true, ...status };
      } else if (status.status === 'failed') {
        return { success: false, error: status.error };
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'Timeout waiting for job completion' };
}

/**
 * Test a category of documents
 */
async function testCategory(categoryName, filePaths) {
  console.log(`\n🎯 Starting ${categoryName} tests...`);

  testResults.categories[categoryName] = {
    total: filePaths.length,
    successful: 0,
    failed: 0,
    cloudConvertUsed: 0,
    results: []
  };

  for (const filePath of filePaths) {
    const result = await testConversion(filePath, categoryName);
    if (result) {
      testResults.categories[categoryName].results.push(result);
      if (result.success) {
        testResults.categories[categoryName].successful++;
        if (result.cloudConvertUsed) {
          testResults.categories[categoryName].cloudConvertUsed++;
        }
      } else {
        testResults.categories[categoryName].failed++;
      }
    }

    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * Get monitoring data
 */
async function getMonitoringData() {
  try {
    const response = await axios.get(`${SERVER_URL}/api/monitoring/status`);
    return response.data;
  } catch (error) {
    console.log('⚠️  Could not fetch monitoring data:', error.message);
    return null;
  }
}

/**
 * Generate test report
 */
function generateReport() {
  const successRate = (testResults.successful / testResults.totalTests) * 100;
  const cloudConvertRate = (testResults.cloudConvertUsed / testResults.successful) * 100;

  const report = `
================================================================================
                    WEEK 2: PRODUCTION TEST RESULTS
================================================================================

📊 OVERALL RESULTS:
   Total Tests: ${testResults.totalTests}
   Successful: ${testResults.successful} (${successRate.toFixed(1)}%)
   Failed: ${testResults.failed}

🎯 ROUTING PERFORMANCE:
   CloudConvert Used: ${testResults.cloudConvertUsed} (${cloudConvertRate.toFixed(1)}% of successful)
   OCR Fallback: ${testResults.ocrFallback}

⚡ PERFORMANCE METRICS:
   Average Response Time: ${testResults.performance.avgResponseTime.toFixed(0)}ms
   Fastest Response: ${testResults.performance.minResponseTime}ms
   Slowest Response: ${testResults.performance.maxResponseTime}ms

📂 CATEGORY BREAKDOWN:
${Object.entries(testResults.categories).map(([category, data]) => `
   ${category}:
     Total: ${data.total}
     Success: ${data.successful}/${data.total} (${((data.successful/data.total)*100).toFixed(1)}%)
     CloudConvert: ${data.cloudConvertUsed}/${data.successful} (${data.successful > 0 ? ((data.cloudConvertUsed/data.successful)*100).toFixed(1) : 0}%)
`).join('')}

${testResults.errors.length > 0 ? `
❌ ERRORS (${testResults.errors.length}):
${testResults.errors.map(error => `   ${error.file} (${error.category}): ${error.error}`).join('\n')}
` : '✅ NO ERRORS DETECTED'}

================================================================================
Test completed at: ${new Date().toISOString()}
================================================================================
`;

  return report;
}

/**
 * Main test execution
 */
async function runProductionTests() {
  console.log('🚀 Starting Week 2: Production Testing with Real Documents');
  console.log('🎯 Testing CloudConvert-primary pipeline with monitoring');

  // Get initial monitoring state
  const initialMonitoring = await getMonitoringData();
  if (initialMonitoring) {
    console.log(`📊 Initial system status: ${initialMonitoring.data.overall.status}`);
  }

  // Run tests for each category
  for (const [categoryName, filePaths] of Object.entries(testCategories)) {
    await testCategory(categoryName, filePaths);
    testResults.totalTests += filePaths.length;
  }

  // Generate and display report
  const report = generateReport();
  console.log(report);

  // Save detailed results
  const resultsFile = `production-test-results-${Date.now()}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
  console.log(`📁 Detailed results saved to: ${resultsFile}`);

  // Get final monitoring state
  const finalMonitoring = await getMonitoringData();
  if (finalMonitoring) {
    console.log(`📊 Final system status: ${finalMonitoring.data.overall.status}`);
    console.log(`📈 Total requests processed: ${finalMonitoring.data.activity.totalRequests}`);
    console.log(`📈 Total conversions: ${finalMonitoring.data.activity.totalConversions}`);
  }

  return testResults;
}

// Export for use in other scripts
module.exports = {
  runProductionTests,
  testConversion,
  testCategories
};

// Run if this script is executed directly
if (require.main === module) {
  runProductionTests()
    .then(results => {
      console.log('\n🎉 Production testing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Production testing failed:', error);
      process.exit(1);
    });
}