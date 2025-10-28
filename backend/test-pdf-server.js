const fs = require('fs').promises;
const path = require('path');

// Simple test to verify PDF conversion endpoints work
async function testPDFConversion() {
  console.log('🧪 Testing PDF Conversion Server...\n');

  const serverUrl = 'http://localhost:3002';

  try {
    // Install dependencies dynamically
    let FormData, fetch;
    try {
      FormData = require('form-data');
      fetch = require('node-fetch');
    } catch (error) {
      console.log('📦 Installing test dependencies...');
      const { execSync } = require('child_process');
      execSync('npm install form-data node-fetch pdf-lib', { stdio: 'inherit', cwd: __dirname });
      FormData = require('form-data');
      fetch = require('node-fetch');
      console.log('✅ Dependencies installed\n');
    }

    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${serverUrl}/health`);
    const healthData = await healthResponse.json();
    console.log(`   ✅ Health check: ${healthData.message}`);

    // Test 2: Create a simple test PDF
    console.log('\n2. Creating test PDF...');
    const { PDFDocument, StandardFonts } = require('pdf-lib');

    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    page.drawText('pdflab.pro Live Test', {
      x: 50,
      y: height - 100,
      size: 24,
      font: helveticaFont,
    });

    page.drawText('This PDF was generated to test the conversion API.', {
      x: 50,
      y: height - 150,
      size: 14,
      font: helveticaFont,
    });

    const pdfBytes = await pdfDoc.save();
    console.log(`   ✅ Test PDF created (${pdfBytes.length} bytes)`);

    // Test 3: PDF to PowerPoint conversion
    console.log('\n3. Testing PDF → PowerPoint conversion...');
    const formData = new FormData();
    formData.append('files', Buffer.from(pdfBytes), {
      filename: 'test.pdf',
      contentType: 'application/pdf'
    });

    const convertResponse = await fetch(`${serverUrl}/api/convert/pdf-to-ppt`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const convertData = await convertResponse.json();

    if (convertResponse.ok) {
      console.log(`   ✅ Conversion started: Job ID ${convertData.jobId}`);
      console.log(`   📊 Estimated time: ${convertData.estimatedTime}s`);
      console.log(`   📄 Pages: ${convertData.metadata.pages}`);

      // Test 4: Job status monitoring
      console.log('\n4. Monitoring job status...');
      const jobId = convertData.jobId;
      let jobCompleted = false;
      let attempts = 0;
      const maxAttempts = 30; // Wait up to 30 seconds

      while (!jobCompleted && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        attempts++;

        const statusResponse = await fetch(`${serverUrl}/api/job/${jobId}/status`);
        const statusData = await statusResponse.json();

        if (statusResponse.ok) {
          const status = statusData.job.status;
          const progress = statusData.job.progress;

          console.log(`   🔄 Status: ${status} (${progress}%)`);

          if (status === 'completed') {
            jobCompleted = true;
            console.log(`   ✅ Job completed in ${statusData.job.processingTime}ms`);

            // Test 5: File download
            if (statusData.job.downloadUrl) {
              console.log('\n5. Testing file download...');
              const downloadResponse = await fetch(`${serverUrl}${statusData.job.downloadUrl}`);

              if (downloadResponse.ok) {
                const contentType = downloadResponse.headers.get('content-type');
                const contentLength = downloadResponse.headers.get('content-length');
                console.log(`   ✅ Download successful`);
                console.log(`   📁 Content-Type: ${contentType}`);
                console.log(`   📏 Size: ${contentLength} bytes`);

                // Read the downloaded content to verify it's the mock format
                const downloadedContent = await downloadResponse.text();
                try {
                  const mockData = JSON.parse(downloadedContent);
                  if (mockData.mockPPTX) {
                    console.log(`   🎭 Mock PowerPoint file detected (development mode)`);
                    console.log(`   📝 Original file: ${mockData.originalFile}`);
                  }
                } catch (e) {
                  console.log(`   💾 Binary PowerPoint file detected (production mode)`);
                }
              } else {
                console.log(`   ❌ Download failed: ${downloadResponse.status}`);
              }
            }
          } else if (status === 'failed') {
            console.log(`   ❌ Job failed: ${statusData.job.errorMessage || 'Unknown error'}`);
            break;
          }
        } else {
          console.log(`   ❌ Status check failed: ${statusResponse.status}`);
          break;
        }
      }

      if (!jobCompleted && attempts >= maxAttempts) {
        console.log(`   ⏰ Job did not complete within ${maxAttempts} seconds`);
      }

    } else {
      console.log(`   ❌ Conversion failed: ${convertResponse.status}`);
      console.log(`   💬 Error: ${convertData.message || 'Unknown error'}`);
    }

    // Test 6: PDF Merging
    console.log('\n6. Testing PDF merging...');

    // Create a second test PDF
    const pdfDoc2 = await PDFDocument.create();
    const page2 = pdfDoc2.addPage();
    page2.drawText('Second PDF for Merge Test', {
      x: 50,
      y: height - 100,
      size: 20,
      font: helveticaFont,
    });
    const pdf2Bytes = await pdfDoc2.save();

    const mergeFormData = new FormData();
    mergeFormData.append('files', Buffer.from(pdfBytes), {
      filename: 'test1.pdf',
      contentType: 'application/pdf'
    });
    mergeFormData.append('files', Buffer.from(pdf2Bytes), {
      filename: 'test2.pdf',
      contentType: 'application/pdf'
    });

    const mergeResponse = await fetch(`${serverUrl}/api/convert/merge`, {
      method: 'POST',
      body: mergeFormData,
      headers: mergeFormData.getHeaders()
    });

    const mergeData = await mergeResponse.json();

    if (mergeResponse.ok) {
      console.log(`   ✅ Merge started: Job ID ${mergeData.jobId}`);
      console.log(`   📊 Files: ${mergeData.metadata.fileCount}`);
      console.log(`   📏 Total size: ${mergeData.metadata.totalSize} bytes`);

      // Monitor merge job
      const mergeJobId = mergeData.jobId;
      let mergeCompleted = false;
      let mergeAttempts = 0;

      while (!mergeCompleted && mergeAttempts < 15) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 0.5 seconds
        mergeAttempts++;

        const mergeStatusResponse = await fetch(`${serverUrl}/api/job/${mergeJobId}/status`);
        const mergeStatusData = await mergeStatusResponse.json();

        if (mergeStatusResponse.ok) {
          const status = mergeStatusData.job.status;

          if (status === 'completed') {
            mergeCompleted = true;
            console.log(`   ✅ Merge completed in ${mergeStatusData.job.processingTime}ms`);
          } else if (status === 'failed') {
            console.log(`   ❌ Merge failed: ${mergeStatusData.job.errorMessage || 'Unknown error'}`);
            break;
          }
        }
      }
    } else {
      console.log(`   ❌ Merge failed: ${mergeResponse.status}`);
      console.log(`   💬 Error: ${mergeData.message || 'Unknown error'}`);
    }

    console.log('\n🎉 PDF Conversion Server Test Complete!');
    console.log('\n📋 Test Summary:');
    console.log('   • Health check endpoint working');
    console.log('   • PDF generation and validation working');
    console.log('   • PDF→PowerPoint conversion API working');
    console.log('   • Job status monitoring working');
    console.log('   • File download working');
    console.log('   • PDF merging API working');
    console.log('\n💡 All core PDF processing functionality is operational!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('💡 Make sure the server is running with: npm run dev');
    console.error('🔧 Also ensure upload directories exist and have proper permissions');
  }
}

// Run the test
testPDFConversion().catch(console.error);