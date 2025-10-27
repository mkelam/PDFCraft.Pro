/**
 * Direct Backend PDF to PPT Conversion Test
 * This script directly tests the conversion pipeline to identify failure points
 */

const fs = require('fs');
const path = require('path');

// Simulate the conversion process step by step
async function testDirectConversion() {
    console.log('🧪 Starting Direct Backend PDF to PPT Conversion Test...\n');

    let testFile = path.join(__dirname, 'test-data', 'simple-test.pdf');

    // Step 1: Verify test file exists
    console.log('📁 Step 1: Checking test file...');
    try {
        const stats = await fs.promises.stat(testFile);
        console.log(`✅ Test file found: ${testFile} (${stats.size} bytes)`);
    } catch (error) {
        console.log('❌ Test file not found. Creating a simple test...');

        // Try to find any PDF in the backend directory
        const backendFiles = await fs.promises.readdir(__dirname);
        const pdfFiles = backendFiles.filter(file => file.endsWith('.pdf'));

        if (pdfFiles.length > 0) {
            const foundPdf = path.join(__dirname, pdfFiles[0]);
            console.log(`📄 Using existing PDF: ${foundPdf}`);
            testFile = foundPdf;
        } else {
            console.log('❌ No PDF files found for testing');
            return;
        }
    }

    // Step 2: Test ImageMagick directly
    console.log('\n🖼️ Step 2: Testing ImageMagick extraction...');
    await testImageMagick(testFile);

    // Step 3: Test OCR processing
    console.log('\n🔍 Step 3: Testing OCR processing...');
    await testOCRProcessing();

    // Step 4: Test LibreOffice conversion
    console.log('\n📊 Step 4: Testing LibreOffice conversion...');
    await testLibreOfficeConversion();

    console.log('\n🏁 Direct conversion test completed!');
}

async function testImageMagick(pdfPath) {
    const { spawn } = require('child_process');

    console.log('   → Testing ImageMagick PDF page extraction...');

    return new Promise((resolve) => {
        const outputPath = path.join(__dirname, 'temp', 'test-page-1.png');

        // Ensure temp directory exists
        const tempDir = path.dirname(outputPath);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const args = [
            '-density', '300',
            '-quality', '100',
            `${pdfPath}[0]`,  // First page only
            outputPath
        ];

        console.log(`   → Command: magick ${args.join(' ')}`);

        const startTime = Date.now();
        let timeoutId;

        const process = spawn('magick', args, {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // Set 15 second timeout
        timeoutId = setTimeout(() => {
            console.log('   ❌ ImageMagick TIMEOUT after 15 seconds!');
            process.kill('SIGTERM');
            setTimeout(() => {
                if (!process.killed) {
                    console.log('   💀 Force killing ImageMagick process...');
                    process.kill('SIGKILL');
                }
            }, 5000);
            resolve(false);
        }, 15000);

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;

            if (code === 0) {
                console.log(`   ✅ ImageMagick completed in ${duration}ms`);
                // Check if output file was created
                if (fs.existsSync(outputPath)) {
                    const stats = fs.statSync(outputPath);
                    console.log(`   📁 Output file created: ${stats.size} bytes`);
                } else {
                    console.log('   ❌ Output file was not created');
                }
            } else {
                console.log(`   ❌ ImageMagick failed with code ${code}`);
                if (stderr) console.log(`   📝 Error: ${stderr}`);
            }

            resolve(code === 0);
        });

        process.on('error', (error) => {
            clearTimeout(timeoutId);
            console.log(`   ❌ ImageMagick spawn error: ${error.message}`);
            resolve(false);
        });
    });
}

async function testOCRProcessing() {
    const { spawn } = require('child_process');

    console.log('   → Testing Tesseract OCR...');

    const imagePath = path.join(__dirname, 'temp', 'test-page-1.png');

    if (!fs.existsSync(imagePath)) {
        console.log('   ❌ No image file to process with OCR');
        return false;
    }

    return new Promise((resolve) => {
        const outputPath = path.join(__dirname, 'temp', 'test-ocr-output');

        const tesseractPath = 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';

        const args = [
            imagePath,
            outputPath,
            '-l', 'eng',
            '--psm', '1',
            '--oem', '3'
        ];

        console.log(`   → Command: "${tesseractPath}" ${args.join(' ')}`);

        const startTime = Date.now();

        const process = spawn(tesseractPath, args, {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // Set 10 second timeout
        const timeoutId = setTimeout(() => {
            console.log('   ❌ Tesseract TIMEOUT after 10 seconds!');
            process.kill('SIGTERM');
            resolve(false);
        }, 10000);

        let stderr = '';

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;

            if (code === 0) {
                console.log(`   ✅ Tesseract completed in ${duration}ms`);

                // Check output file
                const outputFile = outputPath + '.txt';
                if (fs.existsSync(outputFile)) {
                    const content = fs.readFileSync(outputFile, 'utf8');
                    console.log(`   📄 OCR Result: ${content.length} characters extracted`);
                    if (content.trim().length > 0) {
                        console.log(`   📝 Sample: "${content.substring(0, 50)}..."`);
                    }
                }
            } else {
                console.log(`   ❌ Tesseract failed with code ${code}`);
                if (stderr) console.log(`   📝 Error: ${stderr}`);
            }

            resolve(code === 0);
        });

        process.on('error', (error) => {
            clearTimeout(timeoutId);
            console.log(`   ❌ Tesseract spawn error: ${error.message}`);
            resolve(false);
        });
    });
}

async function testLibreOfficeConversion() {
    const { spawn } = require('child_process');

    console.log('   → Testing LibreOffice PowerPoint generation...');

    return new Promise((resolve) => {
        const libreOfficePath = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
        const outputDir = path.join(__dirname, 'temp');

        // Create a simple test document
        const testDocPath = path.join(outputDir, 'test-conversion.odt');
        const simpleODT = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" office:version="1.3">
<office:body>
<office:text>
<text:p>Test Document for PowerPoint Conversion</text:p>
</office:text>
</office:body>
</office:document>`;

        try {
            fs.writeFileSync(testDocPath, simpleODT);
        } catch (error) {
            console.log(`   ❌ Failed to create test document: ${error.message}`);
            resolve(false);
            return;
        }

        const args = [
            '--headless',
            '--convert-to', 'pptx',
            '--outdir', outputDir,
            testDocPath
        ];

        console.log(`   → Command: "${libreOfficePath}" ${args.join(' ')}`);

        const startTime = Date.now();

        const process = spawn(libreOfficePath, args, {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // Set 20 second timeout
        const timeoutId = setTimeout(() => {
            console.log('   ❌ LibreOffice TIMEOUT after 20 seconds!');
            process.kill('SIGTERM');
            resolve(false);
        }, 20000);

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;

            if (code === 0) {
                console.log(`   ✅ LibreOffice completed in ${duration}ms`);

                // Check for output file
                const expectedOutput = path.join(outputDir, 'test-conversion.pptx');
                if (fs.existsSync(expectedOutput)) {
                    const stats = fs.statSync(expectedOutput);
                    console.log(`   📊 PowerPoint file created: ${stats.size} bytes`);
                } else {
                    console.log('   ❌ PowerPoint file was not created');
                }
            } else {
                console.log(`   ❌ LibreOffice failed with code ${code}`);
                if (stderr) console.log(`   📝 Error: ${stderr}`);
            }

            resolve(code === 0);
        });

        process.on('error', (error) => {
            clearTimeout(timeoutId);
            console.log(`   ❌ LibreOffice spawn error: ${error.message}`);
            resolve(false);
        });
    });
}

// Run the test
testDirectConversion().catch(console.error);