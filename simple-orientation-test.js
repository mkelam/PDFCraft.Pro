#!/usr/bin/env node

/**
 * Simple orientation test using curl
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testOrientation() {
  console.log('🔍 Testing PDF orientation detection...');

  // Find a test PDF
  const testPDFs = [
    'backend/test.pdf',
    'backend/simple-test.pdf',
    'backend/Business_Report_Q4_2024.pdf',
    'test.pdf'
  ];

  let testPDF = null;
  for (const pdfPath of testPDFs) {
    if (fs.existsSync(pdfPath)) {
      testPDF = pdfPath;
      console.log(`📄 Found test PDF: ${testPDF}`);
      break;
    }
  }

  if (!testPDF) {
    console.log('❌ No test PDF found. Please ensure a PDF file exists for testing.');
    return;
  }

  // Test the conversion with curl (using 'files' field name)
  const curlCommand = `curl -X POST -F "files=@${testPDF}" http://localhost:3001/api/convert/pdf-to-ppt -v`;

  console.log('\n🚀 Starting PDF conversion test...');
  console.log(`Command: ${curlCommand}`);

  exec(curlCommand, { timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Test failed:', error.message);
      return;
    }

    console.log('\n📊 Response:');
    console.log(stdout);

    if (stderr) {
      console.log('\n📋 Debug info:');
      console.log(stderr);
    }

    try {
      const response = JSON.parse(stdout);
      if (response.success) {
        console.log('\n✅ Test successful!');
        console.log(`Job ID: ${response.jobId}`);
        console.log('🔍 Check backend logs for orientation detection details');
      } else {
        console.log('\n❌ Conversion failed:', response.message);
      }
    } catch (parseError) {
      console.log('⚠️  Could not parse response as JSON');
    }
  });
}

testOrientation();