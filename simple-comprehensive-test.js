/**
 * 🎉 BMAD PARTY-MODE: Simple Comprehensive PDF-to-PPT Testing
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎉 BMAD PARTY-MODE: COMPREHENSIVE PDF-TO-PPT TESTING');
console.log('=' * 60);

// Test Results
let totalTests = 0;
let passed = 0;
let failed = 0;
const results = [];

// Helper function to run a test
async function runTest(filename, testName) {
  totalTests++;
  console.log(`\n🧪 Testing: ${testName}`);

  const startTime = Date.now();

  try {
    // Upload PDF
    console.log(`📤 Uploading ${filename}...`);
    const uploadResult = execSync(
      `curl -s -X POST http://localhost:3020/api/convert/pdf-to-ppt -F "files=@${filename}"`,
      { encoding: 'utf8' }
    );

    const uploadResponse = JSON.parse(uploadResult);

    if (!uploadResponse.success) {
      throw new Error(`Upload failed: ${uploadResponse.message}`);
    }

    const jobId = uploadResponse.jobId;
    console.log(`🆔 Job ID: ${jobId}`);

    // Poll for completion
    let status = 'pending';
    let attempts = 0;

    while (status !== 'completed' && status !== 'failed' && attempts < 30) {
      // Wait 1 second
      execSync('ping 127.0.0.1 -n 2 > nul', { stdio: 'ignore' });

      const statusResult = execSync(
        `curl -s http://localhost:3020/api/job/${jobId}/status`,
        { encoding: 'utf8' }
      );

      const statusResponse = JSON.parse(statusResult);

      if (statusResponse.success) {
        status = statusResponse.job.status;
        const progress = statusResponse.job.progress || 0;
        console.log(`📊 Status: ${status} (Progress: ${progress}%)`);
      }

      attempts++;
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    if (status === 'completed') {
      // Get final status
      const finalResult = execSync(
        `curl -s http://localhost:3020/api/job/${jobId}/status`,
        { encoding: 'utf8' }
      );

      const finalResponse = JSON.parse(finalResult);
      const job = finalResponse.job;

      const result = {
        testName,
        filename,
        success: true,
        totalTime,
        processingTime: job.processingTime,
        outputFile: job.outputFile,
        slideCount: job.quality?.slideCount || 0,
        fileSize: job.quality?.fileSize || 0,
        qualityScore: job.quality?.contentMetrics?.contentDensity || 0
      };

      results.push(result);
      passed++;

      console.log(`✅ SUCCESS: ${testName}`);
      console.log(`   📏 Output Size: ${result.fileSize} bytes`);
      console.log(`   📊 Slides: ${result.slideCount}`);
      console.log(`   ⚡ Total Time: ${result.totalTime}ms`);
      console.log(`   🔧 Processing Time: ${result.processingTime}ms`);
      console.log(`   🎯 Quality: ${result.qualityScore}%`);

    } else {
      throw new Error(`Conversion failed with status: ${status}`);
    }

  } catch (error) {
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    const result = {
      testName,
      filename,
      success: false,
      totalTime,
      error: error.message
    };

    results.push(result);
    failed++;

    console.log(`❌ FAILED: ${testName}`);
    console.log(`   Error: ${error.message}`);
  }
}

// Create test files
function createTestFiles() {
  console.log('🎯 Creating test PDF files...');

  // Simple PDF
  const simplePDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 80 >>
stream
BT
/F1 12 Tf
100 700 Td
(CloudConvert Test Document) Tj
0 -30 Td
(Simple text conversion test) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000210 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
340
%%EOF`;

  fs.writeFileSync('test-simple.pdf', simplePDF);
  console.log('✅ Created: test-simple.pdf');

  // Complex PDF with formatting
  const complexPDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 250 >>
stream
BT
/F1 16 Tf
50 700 Td
(COMPLEX FORMATTING TEST) Tj
/F1 12 Tf
50 650 Td
(This document tests:) Tj
70 620 Td
(• Multiple font sizes) Tj
70 600 Td
(• Text positioning) Tj
70 580 Td
(• Structure preservation) Tj
50 530 Td
(Performance targets:) Tj
70 500 Td
(Speed: <5 seconds) Tj
70 480 Td
(Quality: >95%) Tj
50 430 Td
(CloudConvert Integration Status: ACTIVE) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000210 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
511
%%EOF`;

  fs.writeFileSync('test-complex.pdf', complexPDF);
  console.log('✅ Created: test-complex.pdf');

  return ['test-simple.pdf', 'test-complex.pdf'];
}

// Generate report
function generateReport() {
  console.log('\\n' + '='.repeat(60));
  console.log('📋 COMPREHENSIVE TEST REPORT');
  console.log('='.repeat(60));

  console.log(`\\n📊 SUMMARY:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passed} ✅`);
  console.log(`   Failed: ${failed} ❌`);
  console.log(`   Success Rate: ${((passed / totalTests) * 100).toFixed(1)}%`);

  if (passed > 0) {
    const avgTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.totalTime, 0) / passed;

    const avgProcessingTime = results
      .filter(r => r.success && r.processingTime)
      .reduce((sum, r) => sum + r.processingTime, 0) / passed;

    const avgQuality = results
      .filter(r => r.success && r.qualityScore)
      .reduce((sum, r) => sum + r.qualityScore, 0) /
      results.filter(r => r.success && r.qualityScore).length;

    console.log(`\\n⚡ PERFORMANCE:`);
    console.log(`   Average Total Time: ${avgTime.toFixed(0)}ms`);
    console.log(`   Average Processing Time: ${avgProcessingTime.toFixed(0)}ms`);
    if (avgQuality) {
      console.log(`   Average Quality: ${avgQuality.toFixed(1)}%`);
    }
  }

  console.log(`\\n📋 DETAILED RESULTS:`);
  results.forEach((result, index) => {
    console.log(`\\n${index + 1}. ${result.testName}`);
    console.log(`   Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);

    if (result.success) {
      console.log(`   Time: ${result.totalTime}ms`);
      console.log(`   Output: ${result.outputFile}`);
      console.log(`   Slides: ${result.slideCount}`);
      console.log(`   Quality: ${result.qualityScore}%`);
    } else {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log(`\\n🎯 ASSESSMENT:`);
  const successRate = (passed / totalTests) * 100;

  if (successRate >= 100) {
    console.log(`   🎉 EXCELLENT: All tests passed!`);
  } else if (successRate >= 90) {
    console.log(`   ✅ GOOD: Most tests passed`);
  } else {
    console.log(`   ⚠️ NEEDS IMPROVEMENT: Some tests failed`);
  }

  // Save results
  fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2));
  console.log(`\\n💾 Results saved to: test-results.json`);
}

// Main execution
async function runTests() {
  try {
    const testFiles = createTestFiles();

    const tests = [
      { file: 'test-simple.pdf', name: 'Simple Text PDF' },
      { file: 'test-complex.pdf', name: 'Complex Formatting PDF' }
    ];

    for (const test of tests) {
      await runTest(test.file, test.name);
    }

    generateReport();

    // Cleanup
    testFiles.forEach(file => {
      try {
        fs.unlinkSync(file);
        console.log(`🗑️ Cleaned up: ${file}`);
      } catch (error) {
        console.warn(`⚠️ Could not cleanup: ${file}`);
      }
    });

    console.log('\\n🎊 COMPREHENSIVE TESTING COMPLETE!');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run the tests
runTests();