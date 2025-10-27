/**
 * Direct API Test - Bypass Frontend
 * Test the backend API directly to verify PDF conversion works
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:3015';
const TEST_PDF = path.join(__dirname, 'simple-test.pdf');

console.log('\n🚀 Direct Backend API Test\n');
console.log('============================================================\n');

async function testDirectAPI() {
  try {
    // Create test PDF if needed
    if (!fs.existsSync(TEST_PDF)) {
      console.log('📄 Creating test PDF...');
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(TEST_PDF));
      doc.fontSize(20).text('Test PDF for Conversion', 100, 100);
      doc.text('This tests the backend API directly.', 100, 150);
      doc.end();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('📍 Testing PDF to PowerPoint conversion...\n');

    const formData = new FormData();
    formData.append('files', fs.createReadStream(TEST_PDF), {
      filename: 'test.pdf',
      contentType: 'application/pdf'
    });

    const startTime = Date.now();

    const response = await axios.post(
      `${BACKEND_URL}/api/convert/pdf-to-ppt`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 120000, // 2 minutes
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('✅ Response received!\n');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ TEST PASSED - Backend API is working!');
      console.log('='.repeat(60));
      return true;
    } else {
      console.log('\n' + '='.repeat(60));
      console.log('❌ TEST FAILED - API returned success: false');
      console.log('='.repeat(60));
      return false;
    }

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TEST FAILED');
    console.log('='.repeat(60));

    if (error.response) {
      console.log(`\n📊 Status: ${error.response.status}`);
      console.log(`📄 Response:`, error.response.data);
    } else if (error.request) {
      console.log('\n❌ No response received from server');
      console.log('   Make sure backend is running on', BACKEND_URL);
    } else {
      console.log('\n❌ Error:', error.message);
    }

    return false;
  }
}

testDirectAPI().then(success => {
  process.exit(success ? 0 : 1);
});
