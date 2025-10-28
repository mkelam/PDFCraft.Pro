const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');
const path = require('path');

/**
 * 🏛️ COMPREHENSIVE MUNICIPAL STATEMENT PDF → PPT CONVERSION TEST
 * Testing the complete BMAD CloudConvert-integrated pipeline
 *
 * Test Target: Municipal Statement.pdf (3-page government document)
 * Expected Results: 4-slide PowerPoint with searchable text
 * Performance Target: <5 seconds for 3-page PDF
 */

class MunicipalConversionTester {
  constructor() {
    this.API_BASE = 'http://localhost:3013';
    this.PDF_PATH = 'C:\\Users\\Mac\\OneDrive\\Desktop\\Projects\\pmo framework\\Municipal Statement.pdf';
    this.startTime = null;
    this.endTime = null;
    this.jobId = null;
    this.testResults = {
      fileExists: false,
      uploadSuccess: false,
      conversionSuccess: false,
      downloadSuccess: false,
      qualityMetrics: {},
      performanceMetrics: {},
      errors: []
    };
  }

  async runComprehensiveTest() {
    console.log('🏛️ MUNICIPAL STATEMENT COMPREHENSIVE CONVERSION TEST');
    console.log('==================================================');
    console.log(`📁 Source File: ${this.PDF_PATH}`);
    console.log(`🎯 Backend API: ${this.API_BASE}`);
    console.log(`⏰ Test Started: ${new Date().toISOString()}`);
    console.log('');

    try {
      // Phase 1: File Verification
      await this.verifySourceFile();

      // Phase 2: Upload and Initiate Conversion
      await this.uploadAndConvert();

      // Phase 3: Monitor Progress
      await this.monitorConversion();

      // Phase 4: Download and Validate
      await this.downloadAndValidate();

      // Phase 5: Performance Analysis
      await this.analyzePerformance();

      // Phase 6: Generate Report
      this.generateTestReport();

    } catch (error) {
      console.error('❌ TEST FAILED:', error.message);
      this.testResults.errors.push(error.message);
      this.generateTestReport();
    }
  }

  async verifySourceFile() {
    console.log('📋 PHASE 1: SOURCE FILE VERIFICATION');
    console.log('------------------------------------');

    if (!fs.existsSync(this.PDF_PATH)) {
      throw new Error(`Source file not found: ${this.PDF_PATH}`);
    }

    const stats = fs.statSync(this.PDF_PATH);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ File exists: ${path.basename(this.PDF_PATH)}`);
    console.log(`📊 File size: ${fileSizeMB} MB`);
    console.log(`📅 Modified: ${stats.mtime.toISOString()}`);

    this.testResults.fileExists = true;
    this.testResults.sourceFileSize = stats.size;
    console.log('');
  }

  async uploadAndConvert() {
    console.log('📤 PHASE 2: UPLOAD & CONVERSION INITIATION');
    console.log('------------------------------------------');

    this.startTime = Date.now();

    // Create form data
    const formData = new FormData();
    formData.append('files', fs.createReadStream(this.PDF_PATH));
    formData.append('ocrEnabled', 'true');
    formData.append('preserveImages', 'true');
    formData.append('textOverlays', 'true');
    formData.append('ocrAccuracy', 'high');
    formData.append('enginePreference', 'intelligent');

    console.log('🚀 Sending conversion request...');
    console.log('📋 Options: OCR enabled, preserve images, text overlays, high accuracy');

    const response = await fetch(`${this.API_BASE}/api/convert/pdf-to-ppt`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    console.log(`📊 Upload Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    this.jobId = result.jobId;

    console.log(`✅ Conversion initiated successfully`);
    console.log(`🔑 Job ID: ${this.jobId}`);
    console.log(`📋 Status: ${result.status}`);
    console.log(`⏱️  Estimated time: ${result.estimatedTime || 'N/A'}`);

    this.testResults.uploadSuccess = true;
    this.testResults.jobId = this.jobId;
    console.log('');
  }

  async monitorConversion() {
    console.log('👀 PHASE 3: CONVERSION PROGRESS MONITORING');
    console.log('-----------------------------------------');

    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    let lastProgress = 0;

    console.log('🔄 Polling conversion status...');

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        const statusResponse = await fetch(`${this.API_BASE}/api/job/${this.jobId}/status`);
        const statusData = await statusResponse.json();

        const job = statusData.job || statusData;
        const progress = job.progress || 0;
        const status = job.status;

        // Only log progress changes to avoid spam
        if (progress !== lastProgress || attempts === 0) {
          console.log(`📊 Poll ${attempts + 1}: ${status} (${progress}%)`);
          lastProgress = progress;
        }

        if (status === 'completed') {
          this.endTime = Date.now();
          console.log('✅ Conversion completed successfully!');
          console.log(`📁 Output file: ${job.outputFile}`);
          console.log(`⏱️  Total time: ${this.endTime - this.startTime}ms`);

          this.testResults.conversionSuccess = true;
          this.testResults.outputFile = job.outputFile;
          this.testResults.conversionTime = this.endTime - this.startTime;
          this.testResults.qualityMetrics = job.qualityMetrics || {};
          break;

        } else if (status === 'failed') {
          throw new Error(`Conversion failed: ${job.errorMessage || 'Unknown error'}`);
        }

        attempts++;
      } catch (error) {
        console.error(`❌ Status check failed: ${error.message}`);
        attempts++;
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('Conversion timeout - exceeded maximum polling attempts');
    }

    console.log('');
  }

  async downloadAndValidate() {
    console.log('💾 PHASE 4: DOWNLOAD & VALIDATION');
    console.log('---------------------------------');

    if (!this.testResults.outputFile) {
      throw new Error('No output file specified for download');
    }

    const encodedFilename = encodeURIComponent(this.testResults.outputFile);
    const downloadUrl = `${this.API_BASE}/api/download/${encodedFilename}`;

    console.log(`📥 Downloading: ${this.testResults.outputFile}`);
    console.log(`🔗 URL: ${downloadUrl}`);

    const downloadResponse = await fetch(downloadUrl);

    if (!downloadResponse.ok) {
      throw new Error(`Download failed: ${downloadResponse.status} - ${downloadResponse.statusText}`);
    }

    const fileBuffer = await downloadResponse.buffer();
    const outputSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);

    // Save to test results directory
    const testOutputPath = path.join(__dirname, 'test-results', `municipal-test-${Date.now()}.pptx`);

    // Ensure directory exists
    const testDir = path.dirname(testOutputPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    fs.writeFileSync(testOutputPath, fileBuffer);

    console.log(`✅ Download successful`);
    console.log(`📊 Output size: ${outputSizeMB} MB`);
    console.log(`💾 Saved to: ${testOutputPath}`);

    // Basic validation
    const isValidPPTX = fileBuffer.length > 0 && this.testResults.outputFile.endsWith('.pptx');

    if (isValidPPTX) {
      console.log('✅ File appears to be a valid PowerPoint file');
    } else {
      console.log('⚠️  File validation concerns detected');
    }

    this.testResults.downloadSuccess = true;
    this.testResults.outputFileSize = fileBuffer.length;
    this.testResults.testOutputPath = testOutputPath;
    console.log('');
  }

  async analyzePerformance() {
    console.log('📈 PHASE 5: PERFORMANCE ANALYSIS');
    console.log('--------------------------------');

    const conversionTimeSeconds = (this.testResults.conversionTime / 1000).toFixed(2);
    const compressionRatio = ((this.testResults.sourceFileSize - this.testResults.outputFileSize) / this.testResults.sourceFileSize * 100).toFixed(1);

    console.log(`⏱️  Conversion Time: ${conversionTimeSeconds}s`);
    console.log(`📊 Source Size: ${(this.testResults.sourceFileSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`📊 Output Size: ${(this.testResults.outputFileSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`📈 Size Change: ${compressionRatio > 0 ? '+' : ''}${Math.abs(compressionRatio)}% ${compressionRatio > 0 ? 'larger' : 'smaller'}`);

    // Performance benchmarks
    const targetTime = 5000; // 5 seconds
    const meetsPerfTarget = this.testResults.conversionTime <= targetTime;

    console.log('');
    console.log('🎯 PERFORMANCE BENCHMARKS:');
    console.log(`   Target: <5 seconds → ${meetsPerfTarget ? '✅ PASSED' : '❌ FAILED'} (${conversionTimeSeconds}s)`);

    this.testResults.performanceMetrics = {
      conversionTimeSeconds: parseFloat(conversionTimeSeconds),
      meetsPerfTarget,
      compressionRatio: parseFloat(compressionRatio),
      targetTime
    };

    console.log('');
  }

  generateTestReport() {
    console.log('📋 COMPREHENSIVE TEST REPORT');
    console.log('============================');

    const allPassed = this.testResults.fileExists &&
                     this.testResults.uploadSuccess &&
                     this.testResults.conversionSuccess &&
                     this.testResults.downloadSuccess;

    console.log(`🏛️ Municipal Statement PDF Conversion Test`);
    console.log(`📅 Test Date: ${new Date().toISOString()}`);
    console.log(`🎯 Overall Result: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('');

    console.log('📊 TEST PHASES:');
    console.log(`   1. File Verification: ${this.testResults.fileExists ? '✅' : '❌'}`);
    console.log(`   2. Upload & Initiation: ${this.testResults.uploadSuccess ? '✅' : '❌'}`);
    console.log(`   3. Conversion Processing: ${this.testResults.conversionSuccess ? '✅' : '❌'}`);
    console.log(`   4. Download & Validation: ${this.testResults.downloadSuccess ? '✅' : '❌'}`);
    console.log('');

    if (this.testResults.conversionSuccess) {
      console.log('📈 PERFORMANCE METRICS:');
      console.log(`   • Conversion Time: ${this.testResults.performanceMetrics.conversionTimeSeconds}s`);
      console.log(`   • Performance Target: ${this.testResults.performanceMetrics.meetsPerfTarget ? 'MET' : 'MISSED'}`);
      console.log(`   • File Size Change: ${this.testResults.performanceMetrics.compressionRatio}%`);
      console.log('');

      if (this.testResults.qualityMetrics && Object.keys(this.testResults.qualityMetrics).length > 0) {
        console.log('🎨 QUALITY METRICS:');
        Object.entries(this.testResults.qualityMetrics).forEach(([key, value]) => {
          console.log(`   • ${key}: ${value}`);
        });
        console.log('');
      }
    }

    if (this.testResults.errors.length > 0) {
      console.log('❌ ERRORS ENCOUNTERED:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
      console.log('');
    }

    console.log('🏁 TEST COMPLETE');
    console.log(`⏰ Total Test Duration: ${Date.now() - this.startTime}ms`);

    // Save detailed results to JSON
    const reportPath = path.join(__dirname, 'test-results', `municipal-test-report-${Date.now()}.json`);
    const testDir = path.dirname(reportPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
    console.log(`📋 Detailed report saved: ${reportPath}`);
  }
}

// Execute the comprehensive test
async function runMunicipalTest() {
  const tester = new MunicipalConversionTester();
  await tester.runComprehensiveTest();
}

// Check if running directly or being imported
if (require.main === module) {
  runMunicipalTest().catch(console.error);
}

module.exports = MunicipalConversionTester;