// Simple test to verify PDF processor is working
import { pdfProcessor } from '../services/pdfProcessor'

export const testPDFProcessor = () => {
  console.log('Testing PDF Processor...')

  // Test 1: Check if processor instance exists
  console.log('PDF Processor instance:', pdfProcessor)

  // Test 2: Check if methods exist
  console.log('Compress method exists:', typeof pdfProcessor.compressPDF === 'function')
  console.log('Split method exists:', typeof pdfProcessor.splitPDF === 'function')
  console.log('Merge method exists:', typeof pdfProcessor.mergePDFs === 'function')
  console.log('Rotate method exists:', typeof pdfProcessor.rotatePDF === 'function')
  console.log('Watermark method exists:', typeof pdfProcessor.addWatermark === 'function')
  console.log('Convert method exists:', typeof pdfProcessor.convertToJPG === 'function')

  // Test 3: Check file info method
  console.log('Get file info method exists:', typeof pdfProcessor.getFileInfo === 'function')

  console.log('PDF Processor tests completed')
}

// Auto-run test in development
if (typeof window !== 'undefined') {
  // Wait for DOM to load then run test
  setTimeout(() => {
    testPDFProcessor()
  }, 1000)
}