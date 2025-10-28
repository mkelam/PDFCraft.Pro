/**
 * E2E FORMAT CONVERSION TESTS
 *
 * Tests the complete PDF-to-Office conversion flow with format validation
 * Verifies all three output formats: PPTX, DOCX, XLSX
 * Tests both successful conversions and error handling
 *
 * Phase 1 Critical Fixes - Test Suite
 * Estimated runtime: 5-10 minutes (with actual CloudConvert API calls)
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios, { AxiosError } from 'axios';

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_PDF_PATH = path.join(__dirname, '../../../test-data/simple-test.pdf');
const OUTPUT_DIR = path.join(__dirname, '../../../test-results/format-tests');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Test utilities
interface ConversionResult {
  success: boolean;
  jobId?: string;
  filename?: string;
  error?: string;
  message?: string;
}

/**
 * Upload PDF and request conversion to specific format
 */
async function convertPDF(outputFormat: string): Promise<ConversionResult> {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_PDF_PATH));
    formData.append('outputFormat', outputFormat);

    const response = await axios.post(
      `${API_BASE_URL}/api/cloudconvert/convert`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 120000, // 2 minutes
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ConversionResult>;
      return axiosError.response?.data || {
        success: false,
        error: axiosError.message,
      };
    }
    throw error;
  }
}

/**
 * Download converted file
 */
async function downloadFile(filename: string): Promise<Buffer> {
  const response = await axios.get(
    `${API_BASE_URL}/api/download/${filename}`,
    {
      responseType: 'arraybuffer',
    }
  );

  return Buffer.from(response.data);
}

/**
 * Verify file extension matches expected format
 */
function verifyFileExtension(filename: string, expectedFormat: string): boolean {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  return ext === expectedFormat.toLowerCase();
}

/**
 * Verify file is a valid Office document (basic check)
 */
function verifyOfficeFile(fileBuffer: Buffer, format: string): boolean {
  // Office Open XML files start with PK (ZIP signature)
  const zipSignature = fileBuffer.slice(0, 2).toString('hex');
  if (zipSignature !== '504b') {
    console.error(`❌ Invalid file signature: ${zipSignature} (expected 504b for ZIP/Office files)`);
    return false;
  }

  // Check minimum file size
  const minSize = 1024; // 1KB
  if (fileBuffer.length < minSize) {
    console.error(`❌ File too small: ${fileBuffer.length} bytes (expected >${minSize})`);
    return false;
  }

  // Office files should contain specific content type markers
  const fileContent = fileBuffer.toString('utf8');
  const formatMarkers: { [key: string]: string[] } = {
    pptx: ['ppt/presentation', 'presentationml'],
    docx: ['word/document', 'wordprocessingml'],
    xlsx: ['xl/workbook', 'spreadsheetml'],
  };

  const markers = formatMarkers[format.toLowerCase()];
  if (markers) {
    const hasMarker = markers.some(marker => fileContent.includes(marker));
    if (!hasMarker) {
      console.error(`❌ Missing format markers for ${format.toUpperCase()}: ${markers.join(', ')}`);
      return false;
    }
  }

  return true;
}

/**
 * Run all format conversion tests
 */
async function runTests() {
  console.log('🧪 Starting E2E Format Conversion Tests\n');
  console.log(`API: ${API_BASE_URL}`);
  console.log(`Test PDF: ${TEST_PDF_PATH}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // Check if test PDF exists
  if (!fs.existsSync(TEST_PDF_PATH)) {
    console.error(`❌ Test PDF not found: ${TEST_PDF_PATH}`);
    console.log('ℹ️  Creating a simple test PDF...');

    // Create a simple test PDF if it doesn't exist
    const testPDFContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
410
%%EOF`;

    const testDir = path.dirname(TEST_PDF_PATH);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    fs.writeFileSync(TEST_PDF_PATH, testPDFContent);
    console.log(`✅ Created test PDF: ${TEST_PDF_PATH}\n`);
  }

  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Convert to PPTX
  console.log('📊 Test 1: PDF → PPTX Conversion');
  console.log('━'.repeat(50));
  try {
    const result = await convertPDF('pptx');

    if (!result.success) {
      throw new Error(result.error || result.message || 'Conversion failed');
    }

    console.log(`✅ Conversion successful: ${result.filename}`);

    // Verify filename extension
    if (!verifyFileExtension(result.filename!, 'pptx')) {
      throw new Error(`Invalid extension: expected .pptx, got ${path.extname(result.filename!)}`);
    }
    console.log('✅ File extension verified: .pptx');

    // Download and verify file
    const fileBuffer = await downloadFile(result.filename!);
    const outputPath = path.join(OUTPUT_DIR, result.filename!);
    fs.writeFileSync(outputPath, fileBuffer);
    console.log(`✅ Downloaded: ${outputPath} (${(fileBuffer.length / 1024).toFixed(1)}KB)`);

    // Verify file is valid PPTX
    if (!verifyOfficeFile(fileBuffer, 'pptx')) {
      throw new Error('Invalid PPTX file structure');
    }
    console.log('✅ File structure verified: Valid PowerPoint\n');

    passedTests++;
  } catch (error) {
    console.error(`❌ Test 1 FAILED:`, error instanceof Error ? error.message : error);
    console.log('');
    failedTests++;
  }

  // Test 2: Convert to DOCX
  console.log('📄 Test 2: PDF → DOCX Conversion');
  console.log('━'.repeat(50));
  try {
    const result = await convertPDF('docx');

    if (!result.success) {
      throw new Error(result.error || result.message || 'Conversion failed');
    }

    console.log(`✅ Conversion successful: ${result.filename}`);

    // Verify filename extension
    if (!verifyFileExtension(result.filename!, 'docx')) {
      throw new Error(`Invalid extension: expected .docx, got ${path.extname(result.filename!)}`);
    }
    console.log('✅ File extension verified: .docx');

    // Download and verify file
    const fileBuffer = await downloadFile(result.filename!);
    const outputPath = path.join(OUTPUT_DIR, result.filename!);
    fs.writeFileSync(outputPath, fileBuffer);
    console.log(`✅ Downloaded: ${outputPath} (${(fileBuffer.length / 1024).toFixed(1)}KB)`);

    // Verify file is valid DOCX
    if (!verifyOfficeFile(fileBuffer, 'docx')) {
      throw new Error('Invalid DOCX file structure');
    }
    console.log('✅ File structure verified: Valid Word document\n');

    passedTests++;
  } catch (error) {
    console.error(`❌ Test 2 FAILED:`, error instanceof Error ? error.message : error);
    console.log('');
    failedTests++;
  }

  // Test 3: Convert to XLSX
  console.log('📊 Test 3: PDF → XLSX Conversion');
  console.log('━'.repeat(50));
  try {
    const result = await convertPDF('xlsx');

    if (!result.success) {
      throw new Error(result.error || result.message || 'Conversion failed');
    }

    console.log(`✅ Conversion successful: ${result.filename}`);

    // Verify filename extension
    if (!verifyFileExtension(result.filename!, 'xlsx')) {
      throw new Error(`Invalid extension: expected .xlsx, got ${path.extname(result.filename!)}`);
    }
    console.log('✅ File extension verified: .xlsx');

    // Download and verify file
    const fileBuffer = await downloadFile(result.filename!);
    const outputPath = path.join(OUTPUT_DIR, result.filename!);
    fs.writeFileSync(outputPath, fileBuffer);
    console.log(`✅ Downloaded: ${outputPath} (${(fileBuffer.length / 1024).toFixed(1)}KB)`);

    // Verify file is valid XLSX
    if (!verifyOfficeFile(fileBuffer, 'xlsx')) {
      throw new Error('Invalid XLSX file structure');
    }
    console.log('✅ File structure verified: Valid Excel spreadsheet\n');

    passedTests++;
  } catch (error) {
    console.error(`❌ Test 3 FAILED:`, error instanceof Error ? error.message : error);
    console.log('');
    failedTests++;
  }

  // Test 4: Invalid format rejection
  console.log('🚫 Test 4: Invalid Format Rejection');
  console.log('━'.repeat(50));
  try {
    const result = await convertPDF('invalid');

    // We expect this to fail
    if (result.success) {
      throw new Error('Expected conversion to fail with invalid format');
    }

    console.log('✅ Invalid format rejected correctly');
    console.log(`✅ Error message: ${result.error || result.message}\n`);

    passedTests++;
  } catch (error) {
    console.error(`❌ Test 4 FAILED:`, error instanceof Error ? error.message : error);
    console.log('');
    failedTests++;
  }

  // Test 5: Missing format parameter
  console.log('🚫 Test 5: Missing Format Parameter');
  console.log('━'.repeat(50));
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_PDF_PATH));
    // Intentionally omit outputFormat

    const response = await axios.post(
      `${API_BASE_URL}/api/cloudconvert/convert`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        validateStatus: () => true, // Don't throw on 4xx
      }
    );

    // We expect this to fail with 400
    if (response.status === 200 || response.data.success) {
      throw new Error('Expected request to fail with missing format');
    }

    console.log('✅ Missing format rejected correctly');
    console.log(`✅ Status code: ${response.status}`);
    console.log(`✅ Error message: ${response.data.error || response.data.message}\n`);

    passedTests++;
  } catch (error) {
    console.error(`❌ Test 5 FAILED:`, error instanceof Error ? error.message : error);
    console.log('');
    failedTests++;
  }

  // Test Summary
  console.log('═'.repeat(50));
  console.log('📋 TEST SUMMARY');
  console.log('═'.repeat(50));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total:  ${passedTests + failedTests}`);
  console.log(`🎯 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  console.log('═'.repeat(50));

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
