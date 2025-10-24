// Comprehensive PDF to Office Formats Test
// Tests conversion to PowerPoint, Word, and Excel

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');

const API_BASE_URL = 'http://localhost:3010';

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

// Create a simple test PDF with mixed content
async function createTestPDF() {
    const testFile = `test-office-${Date.now()}.pdf`;
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(testFile);

    doc.pipe(writeStream);

    // Page 1: Title and text
    doc.fontSize(28).text('Office Format Test Document', 50, 50, { align: 'center' });
    doc.fontSize(14).text('\nThis document tests PDF conversion to various Office formats.\n', 50, 120);

    // Add a table-like structure
    doc.fontSize(12);
    doc.text('Format', 50, 180);
    doc.text('Extension', 200, 180);
    doc.text('Application', 350, 180);
    doc.moveDown();
    doc.text('PowerPoint', 50, 200);
    doc.text('.pptx', 200, 200);
    doc.text('Microsoft PowerPoint', 350, 200);
    doc.text('Word', 50, 220);
    doc.text('.docx', 200, 220);
    doc.text('Microsoft Word', 350, 220);
    doc.text('Excel', 50, 240);
    doc.text('.xlsx', 200, 240);
    doc.text('Microsoft Excel', 350, 240);

    // Page 2: More content
    doc.addPage();
    doc.fontSize(20).text('Page 2: Additional Content', 50, 50);
    doc.fontSize(12).text('\nThis page contains additional text to test multi-page conversion.\n', 50, 100);

    // Add some bullet points
    doc.text('• Feature 1: Fast conversion speed', 50, 150);
    doc.text('• Feature 2: High quality output', 50, 170);
    doc.text('• Feature 3: Preserves formatting', 50, 190);
    doc.text('• Feature 4: Multiple format support', 50, 210);

    doc.end();

    return new Promise((resolve) => {
        writeStream.on('finish', () => resolve(testFile));
    });
}

// Test conversion to a specific format
async function testConversion(pdfPath, format, endpoint) {
    const formatColors = {
        pptx: colors.magenta,
        docx: colors.blue,
        xlsx: colors.green
    };
    const color = formatColors[format] || colors.cyan;

    console.log(`\n${color}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${color}Testing PDF to ${format.toUpperCase()} Conversion${colors.reset}`);
    console.log(`${color}${'═'.repeat(60)}${colors.reset}\n`);

    try {
        // Upload and convert
        const form = new FormData();
        form.append('files', fs.createReadStream(pdfPath), {
            filename: path.basename(pdfPath),
            contentType: 'application/pdf'
        });

        // Add format parameter for generic endpoint
        if (endpoint === '/api/convert/pdf-to-office') {
            form.append('format', format);
        }

        console.log(`📤 Uploading PDF for ${format} conversion...`);
        const response = await axios.post(`${API_BASE_URL}${endpoint}`, form, {
            headers: form.getHeaders(),
            validateStatus: () => true
        });

        if (response.status !== 202) {
            console.error(`❌ Upload failed with status ${response.status}:`, response.data);
            return { success: false, format, error: response.data };
        }

        const jobId = response.data.jobId;
        console.log(`✅ Job created: ${jobId}`);
        console.log(`💰 Cost optimized: ${response.data.routingInfo?.costOptimized ? 'Yes' : 'No'}`);
        console.log(`🎯 Service: ${response.data.routingInfo?.preferredService || 'local'}`);

        // Monitor job status
        console.log(`\n⏳ Monitoring conversion progress...`);

        for (let attempt = 1; attempt <= 60; attempt++) {
            const statusResponse = await axios.get(`${API_BASE_URL}/api/job/${jobId}/status`);
            const job = statusResponse.data.job;

            // Show progress bar
            const progress = job.progress || 0;
            const barLength = 30;
            const filled = Math.floor((progress / 100) * barLength);
            const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
            process.stdout.write(`\r[${bar}] ${progress}% - ${job.status}`);

            if (job.status === 'completed') {
                console.log('\n✅ Conversion completed successfully!');

                // Download the file
                const downloadUrl = `${API_BASE_URL}${job.downloadUrl}`;
                console.log(`📥 Downloading from: ${downloadUrl}`);

                const outputFile = `output-${Date.now()}.${format}`;
                const downloadResponse = await axios.get(downloadUrl, { responseType: 'stream' });
                const writer = fs.createWriteStream(outputFile);
                downloadResponse.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                const stats = fs.statSync(outputFile);
                console.log(`💾 Saved as: ${outputFile} (${(stats.size / 1024).toFixed(2)} KB)`);

                // Show quality metrics if available
                if (job.quality) {
                    console.log('\n📊 Quality Metrics:');
                    console.log(`   - Valid: ${job.quality.isValid ? '✓' : '✗'}`);
                    console.log(`   - Has Content: ${job.quality.hasContent ? '✓' : '✗'}`);
                    if (job.quality.slideCount !== undefined) {
                        console.log(`   - Slides/Pages: ${job.quality.slideCount}`);
                    }
                }

                return {
                    success: true,
                    format,
                    jobId,
                    processingTime: job.processingTime,
                    outputFile,
                    fileSize: stats.size,
                    quality: job.quality
                };
            } else if (job.status === 'failed') {
                console.log(`\n❌ Conversion failed: ${job.errorMessage}`);
                return { success: false, format, error: job.errorMessage };
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\n❌ Conversion timed out');
        return { success: false, format, error: 'Timeout' };

    } catch (error) {
        console.error(`❌ Test failed:`, error.message);
        return { success: false, format, error: error.message };
    }
}

// Main test function
async function runAllTests() {
    console.log(`${colors.bright}${colors.cyan}`);
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     COMPREHENSIVE PDF TO OFFICE FORMATS TEST SUITE      ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(colors.reset);

    // Check server health
    console.log('\n🏥 Checking server health...');
    try {
        const health = await axios.get(`${API_BASE_URL}/health`);
        console.log(`✅ Server is healthy (uptime: ${Math.floor(health.data.uptime)}s)`);
    } catch (error) {
        console.error('❌ Server health check failed. Is the backend running on port 3010?');
        return;
    }

    // Create test PDF
    console.log('\n📄 Creating test PDF with mixed content...');
    const testPDF = await createTestPDF();
    const stats = fs.statSync(testPDF);
    console.log(`✅ Test PDF created: ${testPDF} (${(stats.size / 1024).toFixed(2)} KB)`);

    const results = [];

    // Test 1: PDF to PowerPoint
    results.push(await testConversion(testPDF, 'pptx', '/api/convert/pdf-to-ppt'));

    // Test 2: PDF to Word
    results.push(await testConversion(testPDF, 'docx', '/api/convert/pdf-to-word'));

    // Test 3: PDF to Excel
    results.push(await testConversion(testPDF, 'xlsx', '/api/convert/pdf-to-excel'));

    // Test 4: Generic endpoint with format parameter
    console.log(`\n${colors.yellow}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.yellow}Testing Generic /pdf-to-office Endpoint${colors.reset}`);
    console.log(`${colors.yellow}${'═'.repeat(60)}${colors.reset}`);

    results.push(await testConversion(testPDF, 'pptx', '/api/convert/pdf-to-office'));
    results.push(await testConversion(testPDF, 'docx', '/api/convert/pdf-to-office'));
    results.push(await testConversion(testPDF, 'xlsx', '/api/convert/pdf-to-office'));

    // Clean up test PDF
    fs.unlinkSync(testPDF);

    // Final Report
    console.log(`\n${colors.bright}${colors.cyan}`);
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                      TEST RESULTS                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(colors.reset);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`\n📊 Summary:`);
    console.log(`   Total Tests: ${results.length}`);
    console.log(`   ${colors.green}✅ Successful: ${successCount}${colors.reset}`);
    console.log(`   ${colors.red}❌ Failed: ${failCount}${colors.reset}`);
    console.log(`   Success Rate: ${((successCount / results.length) * 100).toFixed(1)}%`);

    console.log(`\n📋 Detailed Results:`);
    results.forEach((result, index) => {
        const endpoint = index < 3 ? 'Specific Endpoint' : 'Generic Endpoint';
        const status = result.success ? `${colors.green}✅ SUCCESS${colors.reset}` : `${colors.red}❌ FAILED${colors.reset}`;
        console.log(`\n   Test ${index + 1}: ${result.format.toUpperCase()} (${endpoint})`);
        console.log(`   Status: ${status}`);

        if (result.success) {
            console.log(`   Processing Time: ${result.processingTime}ms`);
            console.log(`   Output File: ${result.outputFile}`);
            console.log(`   File Size: ${(result.fileSize / 1024).toFixed(2)} KB`);
        } else {
            console.log(`   Error: ${result.error}`);
        }
    });

    // Performance metrics
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length > 0) {
        const avgTime = successfulResults.reduce((sum, r) => sum + r.processingTime, 0) / successfulResults.length;
        console.log(`\n⚡ Performance Metrics:`);
        console.log(`   Average Processing Time: ${avgTime.toFixed(0)}ms`);
        console.log(`   Fastest: ${Math.min(...successfulResults.map(r => r.processingTime))}ms`);
        console.log(`   Slowest: ${Math.max(...successfulResults.map(r => r.processingTime))}ms`);
    }

    // Overall status
    console.log(`\n${colors.bright}`);
    if (successCount === results.length) {
        console.log(`${colors.green}🎉 ALL TESTS PASSED! PDF to Office conversion is working perfectly!${colors.reset}`);
    } else if (successCount > 0) {
        console.log(`${colors.yellow}⚠️ PARTIAL SUCCESS: Some conversions are working, but issues remain.${colors.reset}`);
    } else {
        console.log(`${colors.red}❌ ALL TESTS FAILED: Critical issues with conversion pipeline.${colors.reset}`);
    }

    console.log(`\n${colors.cyan}Test suite completed.${colors.reset}\n`);
}

// Run the comprehensive test suite
runAllTests().catch(console.error);