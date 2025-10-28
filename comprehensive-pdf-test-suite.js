/**
 * 🎉 BMAD PARTY-MODE: COMPREHENSIVE PDF-TO-PPT TESTING SUITE
 *
 * This suite tests our CloudConvert integration with various PDF types
 * to ensure our conversion engine can handle real-world scenarios.
 */

const fs = require('fs');
const path = require('path');

// Test Results Storage
const testResults = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  details: [],
  summary: {
    averageProcessingTime: 0,
    totalProcessingTime: 0,
    qualityScores: [],
    fileTypes: {}
  }
};

// Create test PDFs with different complexity levels
function createTestPDFs() {
  console.log('🎯 Creating comprehensive test PDF suite...');

  const testFiles = {
    // Test 1: Simple text-only PDF
    'test-simple-text.pdf': `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources << /Font << /F1 5 0 R >> >>
>>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 14 Tf
50 700 Td
(pdflab.pro CloudConvert Test) Tj
0 -30 Td
(Simple Text Document) Tj
0 -30 Td
(This document contains basic text formatting.) Tj
0 -30 Td
(It should convert perfectly to PowerPoint.) Tj
0 -30 Td
(Testing bullet points:) Tj
0 -20 Td
(• Feature 1: Fast conversion) Tj
0 -20 Td
(• Feature 2: Quality preservation) Tj
0 -20 Td
(• Feature 3: Structure maintenance) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000251 00000 n
0000000502 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
569
%%EOF`,

    // Test 2: Multi-page PDF
    'test-multipage.pdf': `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources << /Font << /F1 5 0 R >> >>
>>
endobj
4 0 obj
<< /Length 150 >>
stream
BT
/F1 16 Tf
50 700 Td
(PAGE 1: Executive Summary) Tj
0 -40 Td
/F1 12 Tf
(This is the first page of our test document.) Tj
0 -25 Td
(It contains important information about) Tj
0 -25 Td
(pdflab.pro's conversion capabilities.) Tj
0 -40 Td
(Key Points:) Tj
0 -25 Td
(1. CloudConvert Integration) Tj
0 -25 Td
(2. Structure Preservation) Tj
0 -25 Td
(3. Speed Optimization) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
6 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 7 0 R
/Resources << /Font << /F1 5 0 R >> >>
>>
endobj
7 0 obj
<< /Length 180 >>
stream
BT
/F1 16 Tf
50 700 Td
(PAGE 2: Technical Details) Tj
0 -40 Td
/F1 12 Tf
(This second page demonstrates multi-page) Tj
0 -25 Td
(PDF conversion capabilities.) Tj
0 -40 Td
(Technical Specifications:) Tj
0 -25 Td
(• API: CloudConvert v2) Tj
0 -25 Td
(• Engine: pdftron) Tj
0 -25 Td
(• Speed: <5 seconds target) Tj
0 -25 Td
(• Quality: 96%+ accuracy) Tj
0 -40 Td
(Testing Results:) Tj
0 -25 Td
(All systems operational ✓) Tj
ET
endstream
endobj
xref
0 8
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000120 00000 n
0000000256 00000 n
0000000458 00000 n
0000000525 00000 n
0000000661 00000 n
trailer
<< /Size 8 /Root 1 0 R >>
startxref
893
%%EOF`,

    // Test 3: Complex formatting PDF
    'test-complex-format.pdf': `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >>
>>
endobj
4 0 obj
<< /Length 400 >>
stream
BT
/F1 18 Tf
1 0 0 1 50 720 Tm
(CLOUDCONVERT QUALITY TEST) Tj

/F2 14 Tf
1 0 0 1 50 680 Tm
(Complex Formatting Assessment) Tj

/F1 12 Tf
1 0 0 1 50 640 Tm
(This document tests various formatting elements:) Tj

1 0 0 1 70 600 Tm
(1. Multiple font sizes and styles) Tj
1 0 0 1 70 580 Tm
(2. Precise text positioning) Tj
1 0 0 1 70 560 Tm
(3. Hierarchical content structure) Tj

/F2 16 Tf
1 0 0 1 50 500 Tm
(PERFORMANCE METRICS) Tj

/F1 11 Tf
1 0 0 1 50 460 Tm
(Target Specifications:) Tj
1 0 0 1 70 440 Tm
(• Conversion Speed: <5 seconds) Tj
1 0 0 1 70 420 Tm
(• Quality Score: >95%) Tj
1 0 0 1 70 400 Tm
(• Structure Preservation: 100%) Tj
1 0 0 1 70 380 Tm
(• Text Accuracy: 96%+) Tj

/F2 14 Tf
1 0 0 1 50 320 Tm
(Test Status: READY FOR EXECUTION) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 7
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000267 00000 n
0000000719 00000 n
0000000790 00000 n
trailer
<< /Size 7 /Root 1 0 R >>
startxref
856
%%EOF`
  };

  // Create test files
  for (const [filename, content] of Object.entries(testFiles)) {
    fs.writeFileSync(filename, content);
    console.log(`✅ Created: ${filename}`);
  }

  return Object.keys(testFiles);
}

// Test function to convert a PDF and measure results
async function testPDFConversion(filename, testName) {
  console.log(`\n🧪 Testing: ${testName}`);
  const startTime = Date.now();

  try {
    // Upload PDF to CloudConvert endpoint
    const formData = new FormData();
    formData.append('files', fs.createReadStream(filename), filename);

    console.log(`📤 Uploading ${filename}...`);

    // We'll use curl since we're in Node.js environment
    const { execSync } = require('child_process');

    // Upload file and get job ID
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
    const maxAttempts = 30; // 30 seconds max wait

    while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const statusResult = execSync(
        \`curl -s http://localhost:3020/api/job/\${jobId}/status\`,
        { encoding: 'utf8' }
      );

      const statusResponse = JSON.parse(statusResult);

      if (statusResponse.success) {
        status = statusResponse.job.status;
        console.log(\`📊 Status: \${status} (Progress: \${statusResponse.job.progress || 0}%)\`);
      }

      attempts++;
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    if (status === 'completed') {
      const finalStatusResult = execSync(
        \`curl -s http://localhost:3020/api/job/\${jobId}/status\`,
        { encoding: 'utf8' }
      );

      const finalResponse = JSON.parse(finalStatusResult);
      const job = finalResponse.job;

      const result = {
        testName,
        filename,
        success: true,
        processingTime,
        serverProcessingTime: job.processingTime || 0,
        outputFile: job.outputFile,
        quality: job.quality || {},
        downloadUrl: job.downloadUrl
      };

      console.log(\`✅ SUCCESS: \${testName}\`);
      console.log(\`   📏 File Size: \${job.quality?.fileSize || 'Unknown'} bytes\`);
      console.log(\`   📊 Slides: \${job.quality?.slideCount || 'Unknown'}\`);
      console.log(\`   ⚡ Processing Time: \${processingTime}ms\`);
      console.log(\`   🎯 Quality Score: \${job.quality?.contentMetrics?.contentDensity || 'Unknown'}%\`);

      return result;

    } else {
      throw new Error(\`Conversion failed with status: \${status}\`);
    }

  } catch (error) {
    const endTime = Date.now();
    const processingTime = endTime - startTime;

    const result = {
      testName,
      filename,
      success: false,
      processingTime,
      error: error.message
    };

    console.log(\`❌ FAILED: \${testName}\`);
    console.log(\`   Error: \${error.message}\`);

    return result;
  }
}

// Main testing function
async function runComprehensiveTests() {
  console.log('🎉 STARTING COMPREHENSIVE PDF-TO-PPT TESTING SUITE');
  console.log('=' * 60);

  // Create test files
  const testFiles = createTestPDFs();

  const tests = [
    { file: 'test-simple-text.pdf', name: 'Simple Text Document' },
    { file: 'test-multipage.pdf', name: 'Multi-Page Document' },
    { file: 'test-complex-format.pdf', name: 'Complex Formatting' }
  ];

  // Run tests
  for (const test of tests) {
    testResults.totalTests++;

    try {
      const result = await testPDFConversion(test.file, test.name);

      testResults.details.push(result);

      if (result.success) {
        testResults.passed++;
        testResults.summary.totalProcessingTime += result.processingTime;

        if (result.quality.contentMetrics?.contentDensity) {
          testResults.summary.qualityScores.push(result.quality.contentMetrics.contentDensity);
        }
      } else {
        testResults.failed++;
      }

    } catch (error) {
      testResults.failed++;
      testResults.details.push({
        testName: test.name,
        filename: test.file,
        success: false,
        error: error.message
      });
    }
  }

  // Calculate summary metrics
  if (testResults.passed > 0) {
    testResults.summary.averageProcessingTime =
      testResults.summary.totalProcessingTime / testResults.passed;

    if (testResults.summary.qualityScores.length > 0) {
      testResults.summary.averageQuality =
        testResults.summary.qualityScores.reduce((a, b) => a + b, 0) /
        testResults.summary.qualityScores.length;
    }
  }

  // Generate report
  generateComprehensiveReport();

  // Cleanup test files
  testFiles.forEach(file => {
    try {
      fs.unlinkSync(file);
      console.log(\`🗑️ Cleaned up: \${file}\`);
    } catch (error) {
      console.warn(\`⚠️ Could not cleanup: \${file}\`);
    }
  });

  console.log('\\n🎊 COMPREHENSIVE TESTING COMPLETE!');
}

// Generate detailed report
function generateComprehensiveReport() {
  console.log('\\n' + '=' * 60);
  console.log('📋 COMPREHENSIVE TEST REPORT');
  console.log('=' * 60);

  console.log(\`\\n📊 SUMMARY:\`);
  console.log(\`   Total Tests: \${testResults.totalTests}\`);
  console.log(\`   Passed: \${testResults.passed} ✅\`);
  console.log(\`   Failed: \${testResults.failed} ❌\`);
  console.log(\`   Success Rate: \${((testResults.passed / testResults.totalTests) * 100).toFixed(1)}%\`);

  if (testResults.summary.averageProcessingTime) {
    console.log(\`\\n⚡ PERFORMANCE:\`);
    console.log(\`   Average Processing Time: \${testResults.summary.averageProcessingTime.toFixed(0)}ms\`);
    console.log(\`   Total Processing Time: \${testResults.summary.totalProcessingTime}ms\`);

    if (testResults.summary.averageQuality) {
      console.log(\`   Average Quality Score: \${testResults.summary.averageQuality.toFixed(1)}%\`);
    }
  }

  console.log(\`\\n📋 DETAILED RESULTS:\`);
  testResults.details.forEach((result, index) => {
    console.log(\`\\n\${index + 1}. \${result.testName}\`);
    console.log(\`   File: \${result.filename}\`);
    console.log(\`   Result: \${result.success ? '✅ SUCCESS' : '❌ FAILED'}\`);

    if (result.success) {
      console.log(\`   Processing Time: \${result.processingTime}ms\`);
      console.log(\`   Output: \${result.outputFile}\`);
      if (result.quality) {
        console.log(\`   Slides: \${result.quality.slideCount || 'N/A'}\`);
        console.log(\`   Quality: \${result.quality.contentMetrics?.contentDensity || 'N/A'}%\`);
      }
    } else {
      console.log(\`   Error: \${result.error}\`);
    }
  });

  console.log(\`\\n🎯 RECOMMENDATIONS:\`);

  if (testResults.summary.averageProcessingTime < 5000) {
    console.log(\`   ✅ Processing speed target MET (<5 seconds)\`);
  } else {
    console.log(\`   ⚠️ Processing speed target MISSED (>\${testResults.summary.averageProcessingTime/1000}s)\`);
  }

  if (testResults.summary.averageQuality > 95) {
    console.log(\`   ✅ Quality target MET (>95%)\`);
  } else if (testResults.summary.averageQuality) {
    console.log(\`   ⚠️ Quality target MISSED (\${testResults.summary.averageQuality.toFixed(1)}%)\`);
  }

  const successRate = (testResults.passed / testResults.totalTests) * 100;
  if (successRate >= 100) {
    console.log(\`   ✅ Reliability target MET (100% success)\`);
  } else {
    console.log(\`   ⚠️ Reliability target MISSED (\${successRate.toFixed(1)}% success)\`);
  }

  console.log(\`\\n🏆 OVERALL ASSESSMENT:\`);
  if (successRate >= 100 && testResults.summary.averageProcessingTime < 5000) {
    console.log(\`   🎉 EXCELLENT: CloudConvert integration exceeds expectations!\`);
  } else if (successRate >= 90) {
    console.log(\`   ✅ GOOD: CloudConvert integration performs well\`);
  } else {
    console.log(\`   ⚠️ NEEDS IMPROVEMENT: Consider optimization\`);
  }

  // Save report to file
  const reportContent = JSON.stringify(testResults, null, 2);
  fs.writeFileSync('comprehensive-test-report.json', reportContent);
  console.log(\`\\n💾 Report saved to: comprehensive-test-report.json\`);
}

// Add delay helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export for use
module.exports = {
  runComprehensiveTests,
  testPDFConversion,
  createTestPDFs
};

// Run if called directly
if (require.main === module) {
  runComprehensiveTests().catch(console.error);
}