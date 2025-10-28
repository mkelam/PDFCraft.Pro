const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * SIMPLE IMAGE TEST - Validate black screen fix
 * Tests ImageMagick directly with environment variables
 */

async function simpleImageTest() {
  console.log('🎯 SIMPLE IMAGE TEST - Black Screen Fix Validation');
  console.log('===============================================');

  // Set critical environment variables
  process.env.IMAGEMAGICK_AVAILABLE = 'true';
  process.env.IMAGEMAGICK_PATH = 'magick';

  // Test file
  const testPDF = './backend/Business_Report_Q4_2024.pdf';
  const outputDir = './test-results/simple-test';
  const outputFile = path.join(outputDir, 'test-page-1.png');

  if (!fs.existsSync(testPDF)) {
    console.log('❌ Test PDF not found:', testPDF);
    console.log('📄 Available files:');
    const files = fs.readdirSync('./backend').filter(f => f.endsWith('.pdf'));
    files.forEach(f => console.log(`  - ${f}`));

    if (files.length > 0) {
      const firstPDF = path.join('./backend', files[0]);
      console.log(`🔄 Using first available PDF: ${files[0]}`);
      return await runImageMagickTest(firstPDF, outputFile);
    } else {
      console.log('❌ No PDF files found for testing');
      return false;
    }
  }

  return await runImageMagickTest(testPDF, outputFile);
}

async function runImageMagickTest(inputPDF, outputFile) {
  const outputDir = path.dirname(outputFile);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🔧 Testing ImageMagick PDF-to-Image conversion...');
  console.log(`   Input: ${inputPDF}`);
  console.log(`   Output: ${outputFile}`);

  const startTime = Date.now();

  return new Promise((resolve) => {
    const args = [
      '-density', '300',
      '-colorspace', 'sRGB',
      `${inputPDF}[0]`, // First page
      '-background', 'white',
      '-alpha', 'remove',
      '-flatten',
      '-quality', '95',
      outputFile
    ];

    console.log(`🚀 Running: magick ${args.join(' ')}`);

    const process = spawn('magick', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => stdout += data);
    process.stderr.on('data', (data) => stderr += data);

    process.on('close', (code) => {
      const processingTime = Date.now() - startTime;
      console.log(`⏱️ Processing time: ${processingTime}ms`);

      if (code === 0) {
        console.log('✅ ImageMagick command completed successfully');

        // Check if output file was created
        if (fs.existsSync(outputFile)) {
          const stats = fs.statSync(outputFile);
          const sizeKB = Math.round(stats.size / 1024);

          console.log(`📁 Output file created: ${path.basename(outputFile)}`);
          console.log(`📏 File size: ${sizeKB}KB`);

          if (sizeKB > 10) {
            console.log('🎉 SUCCESS: Image appears valid (not a black screen)');
            console.log('✅ BLACK SCREEN ISSUE APPEARS TO BE FIXED!');

            // Additional validation
            if (sizeKB > 50) {
              console.log('🏆 EXCELLENT: High-quality image generated');
            } else if (sizeKB > 20) {
              console.log('👍 GOOD: Reasonable quality image generated');
            } else {
              console.log('⚠️ OK: Small but valid image generated');
            }

            resolve(true);
          } else {
            console.log('⚠️ WARNING: Image file very small, may be black screen');
            console.log('❌ BLACK SCREEN ISSUE MAY STILL EXIST');
            resolve(false);
          }
        } else {
          console.log('❌ ERROR: Output file was not created');
          resolve(false);
        }
      } else {
        console.log(`❌ ERROR: ImageMagick failed with exit code ${code}`);
        if (stderr) {
          console.log(`💥 Error output: ${stderr}`);
        }
        resolve(false);
      }
    });

    process.on('error', (error) => {
      console.log('💥 Process error:', error.message);
      resolve(false);
    });
  });
}

// Run the test
simpleImageTest()
  .then(success => {
    console.log('\\n' + '='.repeat(50));
    if (success) {
      console.log('🎯 RESULT: BLACK SCREEN FIX SUCCESSFUL! ✅');
      console.log('🚀 Your image processing should now work correctly.');
      process.exit(0);
    } else {
      console.log('🔧 RESULT: Additional troubleshooting needed ⚠️');
      console.log('💡 Check ImageMagick installation and PDF file.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 TEST CRASHED:', error);
    process.exit(1);
  });