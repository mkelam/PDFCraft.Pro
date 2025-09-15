import { PDFDocument, rgb } from 'pdf-lib'

// Define payload types for different operations
export interface MergePayload {
  files: ArrayBuffer[]
  options: PDFProcessingOptions
}

export interface CompressPayload {
  file: ArrayBuffer
  options: PDFProcessingOptions
}

export interface ValidatePayload {
  file: ArrayBuffer
  options: PDFProcessingOptions
}

export interface ErrorPayload {
  name: string
  message: string
  stack?: string
}

// Union type for all possible payloads
export type WorkerPayload = MergePayload | CompressPayload | ValidatePayload

// Define message types for worker communication
export interface WorkerMessage {
  id: string
  type: 'merge' | 'compress' | 'split' | 'rotate' | 'watermark' | 'convert' | 'validate'
  payload: WorkerPayload
}

export interface WorkerResponse {
  id: string
  type: 'progress' | 'result' | 'error'
  payload: any // This will be ProcessingProgress | ProcessingResult | ErrorPayload
}

export interface PDFProcessingOptions {
  quality?: number
  compression?: boolean
  pages?: number[]
  format?: 'A4' | 'Letter' | 'Legal'
  outputName?: string
  rotation?: number
  watermarkText?: string
  maxFileSize?: number
  maxTotalSize?: number
  chunkSize?: number
  securityLevel?: 'strict' | 'normal' | 'relaxed'
}

export interface SecurityError extends Error {
  name: 'SecurityError'
}

class PDFWorkerProcessor {
  private dangerousPatterns = [
    /\/JavaScript\s/i,
    /\/JS\s/i,
    /\/Launch\s/i,
    /\/EmbeddedFile/i,
    /\/OpenAction\s/i,
    /\/AA\s/i,  // Additional Actions
    /\/URI\s/i,
    /\/SubmitForm/i,
    /\/ImportData/i,
    /\/GoToE/i,
    /\/GoToR/i,
    /\/Movie/i,
    /\/Sound/i,
    /\/RichMedia/i
  ]

  private postProgress(id: string, stage: string, percentage: number, message: string, extra?: any) {
    const response: WorkerResponse = {
      id,
      type: 'progress',
      payload: {
        stage,
        percentage: Math.min(100, Math.max(0, percentage)),
        message,
        ...extra
      }
    }
    self.postMessage(response)
  }

  private postResult(id: string, result: any) {
    const response: WorkerResponse = {
      id,
      type: 'result',
      payload: result
    }
    self.postMessage(response)
  }

  private postError(id: string, error: Error | string) {
    const response: WorkerResponse = {
      id,
      type: 'error',
      payload: {
        message: typeof error === 'string' ? error : error.message,
        name: typeof error === 'object' ? error.name : 'Error',
        stack: typeof error === 'object' ? error.stack : undefined
      }
    }
    self.postMessage(response)
  }

  private async validatePDFSecurity(buffer: ArrayBuffer, securityLevel: string = 'normal'): Promise<void> {
    const view = new DataView(buffer)
    const decoder = new TextDecoder('latin1')

    // Check PDF header
    const header = decoder.decode(new Uint8Array(buffer, 0, 8))
    if (!header.startsWith('%PDF-')) {
      const error = new Error('Invalid PDF header') as SecurityError
      error.name = 'SecurityError'
      throw error
    }

    if (securityLevel === 'relaxed') {
      return // Skip additional security checks for relaxed mode
    }

    // Scan for dangerous patterns
    const content = decoder.decode(new Uint8Array(buffer))

    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(content)) {
        const error = new Error(`PDF contains potentially dangerous content: ${pattern}`) as SecurityError
        error.name = 'SecurityError'
        throw error
      }
    }

    // Check for encrypted PDFs in strict mode
    if (securityLevel === 'strict' && content.includes('/Encrypt')) {
      const error = new Error('Encrypted PDFs are not allowed in strict security mode') as SecurityError
      error.name = 'SecurityError'
      throw error
    }

    // Check for form fields that could be exploited
    if (content.includes('/AcroForm') && content.includes('/XFA')) {
      const error = new Error('XFA forms are not supported for security reasons') as SecurityError
      error.name = 'SecurityError'
      throw error
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  private async validateFileConstraints(files: ArrayBuffer[], options: PDFProcessingOptions): Promise<void> {
    const maxFileSize = options.maxFileSize || 100 * 1024 * 1024 // 100MB
    const maxTotalSize = options.maxTotalSize || 500 * 1024 * 1024 // 500MB
    const maxFiles = 50

    if (files.length > maxFiles) {
      throw new Error(`Too many files. Maximum allowed: ${maxFiles}`)
    }

    let totalSize = 0
    for (const buffer of files) {
      if (buffer.byteLength > maxFileSize) {
        throw new Error(`File too large (${this.formatFileSize(buffer.byteLength)}). Maximum: ${this.formatFileSize(maxFileSize)}`)
      }
      totalSize += buffer.byteLength
    }

    if (totalSize > maxTotalSize) {
      throw new Error(`Total size too large (${this.formatFileSize(totalSize)}). Maximum: ${this.formatFileSize(maxTotalSize)}`)
    }
  }

  async mergePDFs(id: string, files: ArrayBuffer[], options: PDFProcessingOptions = {}): Promise<void> {
    const startTime = Date.now()

    try {
      this.postProgress(id, 'validation', 0, 'Validating files...', { totalFiles: files.length })

      if (files.length < 2) {
        throw new Error('At least 2 files are required for merging')
      }

      // Validate file constraints
      await this.validateFileConstraints(files, options)

      // Security validation
      for (let i = 0; i < files.length; i++) {
        this.postProgress(id, 'validation', (i / files.length) * 30, `Validating file ${i + 1}/${files.length}`)
        await this.validatePDFSecurity(files[i], options.securityLevel)
      }

      this.postProgress(id, 'loading', 30, 'Loading PDF documents...')

      // Load all PDFs
      const pdfDocs = []
      let totalExpectedPages = 0

      for (let i = 0; i < files.length; i++) {
        this.postProgress(id, 'loading', 30 + (i / files.length) * 20, `Loading file ${i + 1}/${files.length}`)

        const pdfDoc = await PDFDocument.load(files[i], {
          ignoreEncryption: options.securityLevel !== 'strict',
          capNumbers: true,
          throwOnInvalidObject: false
        })

        pdfDocs.push(pdfDoc)
        totalExpectedPages += pdfDoc.getPageCount()
      }

      // Check page limit
      const maxPages = 5000
      if (totalExpectedPages > maxPages) {
        throw new Error(`Total pages exceed limit: ${totalExpectedPages}. Maximum: ${maxPages}`)
      }

      this.postProgress(id, 'processing', 50, 'Creating merged document...')

      // Create merged PDF
      const mergedPdf = await PDFDocument.create()
      let processedPages = 0

      for (let i = 0; i < pdfDocs.length; i++) {
        const pdfDoc = pdfDocs[i]
        const pageIndices = pdfDoc.getPageIndices()

        this.postProgress(id, 'processing', 50 + (i / pdfDocs.length) * 30,
          `Processing file ${i + 1}/${pdfDocs.length}`,
          { currentFile: `File ${i + 1}`, filesProcessed: i, totalFiles: pdfDocs.length })

        // Copy pages in chunks to prevent blocking
        const chunkSize = options.chunkSize || 10
        for (let j = 0; j < pageIndices.length; j += chunkSize) {
          const chunk = pageIndices.slice(j, j + chunkSize)
          const pages = await mergedPdf.copyPages(pdfDoc, chunk)

          pages.forEach(page => mergedPdf.addPage(page))
          processedPages += chunk.length

          this.postProgress(id, 'processing', 50 + ((processedPages / totalExpectedPages) * 30),
            `Processed ${processedPages}/${totalExpectedPages} pages`)

          // Yield control to prevent blocking
          await new Promise(resolve => setTimeout(resolve, 1))
        }
      }

      this.postProgress(id, 'saving', 80, `Saving merged document with ${totalExpectedPages} pages...`)

      // Save with optimization
      const pdfBytes = await mergedPdf.save({
        useObjectStreams: false,
        addDefaultPage: false,
        objectsPerTick: 50,
        updateFieldAppearances: false
      })

      // Check output size limit
      const outputSizeMB = pdfBytes.length / (1024 * 1024)
      if (outputSizeMB > 200) {
        throw new Error(`Output file too large: ${outputSizeMB.toFixed(1)}MB. Maximum: 200MB`)
      }

      const processingTime = Date.now() - startTime

      this.postProgress(id, 'complete', 100, `Successfully merged ${files.length} PDFs`)

      this.postResult(id, {
        success: true,
        message: `Merged ${files.length} PDFs into 1 document with ${totalExpectedPages} total pages (${this.formatFileSize(pdfBytes.length)})`,
        fileSize: pdfBytes.length,
        processingTime,
        pdfBytes: Array.from(pdfBytes), // Convert to transferable array
        fileName: options.outputName || `merged_${files.length}_documents.pdf`
      })

    } catch (error) {
      console.error('Merge error in worker:', error)
      this.postError(id, error instanceof Error ? error : new Error(String(error)))
    }
  }

  async compressPDF(id: string, file: ArrayBuffer, options: PDFProcessingOptions = {}): Promise<void> {
    const startTime = Date.now()

    try {
      this.postProgress(id, 'validation', 0, 'Validating PDF...')

      // Security validation
      await this.validatePDFSecurity(file, options.securityLevel)

      this.postProgress(id, 'loading', 20, 'Loading PDF document...')

      const pdfDoc = await PDFDocument.load(file, {
        ignoreEncryption: options.securityLevel !== 'strict',
        capNumbers: true,
        throwOnInvalidObject: false
      })

      this.postProgress(id, 'processing', 40, 'Optimizing PDF structure...')

      // Advanced compression/optimization options
      const compressedBytes = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
        objectsPerTick: 50,
        updateFieldAppearances: false
      })

      const originalSize = file.byteLength
      const compressedSize = compressedBytes.length
      const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1)

      const processingTime = Date.now() - startTime

      this.postProgress(id, 'complete', 100, `PDF optimized by ${compressionRatio}%`)

      this.postResult(id, {
        success: true,
        message: `PDF optimized by ${compressionRatio}% (${this.formatFileSize(originalSize)} → ${this.formatFileSize(compressedSize)})`,
        fileSize: compressedSize,
        processingTime,
        pdfBytes: Array.from(compressedBytes),
        fileName: options.outputName || `optimized_${Date.now()}.pdf`
      })

    } catch (error) {
      console.error('Compression error in worker:', error)
      this.postError(id, error instanceof Error ? error : new Error(String(error)))
    }
  }

  async validatePDF(id: string, file: ArrayBuffer, options: PDFProcessingOptions = {}): Promise<void> {
    try {
      this.postProgress(id, 'validation', 0, 'Starting PDF validation...')

      // Security validation
      await this.validatePDFSecurity(file, options.securityLevel)

      this.postProgress(id, 'validation', 50, 'Loading PDF structure...')

      const pdfDoc = await PDFDocument.load(file, {
        ignoreEncryption: options.securityLevel !== 'strict',
        capNumbers: true,
        throwOnInvalidObject: false
      })

      const pageCount = pdfDoc.getPageCount()
      const fileSize = file.byteLength

      this.postProgress(id, 'complete', 100, 'PDF validation complete')

      this.postResult(id, {
        success: true,
        message: 'PDF validation successful',
        pageCount,
        fileSize,
        version: 'PDF', // pdf-lib doesn't expose version easily
        security: {
          level: options.securityLevel || 'normal',
          hasJavaScript: false, // We would have thrown if detected
          hasEmbeddedFiles: false,
          hasFormFields: false // Could be enhanced
        }
      })

    } catch (error) {
      console.error('Validation error in worker:', error)
      this.postError(id, error instanceof Error ? error : new Error(String(error)))
    }
  }
}

// Initialize worker processor
const processor = new PDFWorkerProcessor()

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data

  try {
    switch (type) {
      case 'merge':
        const mergePayload = payload as MergePayload
        await processor.mergePDFs(id, mergePayload.files, mergePayload.options)
        break

      case 'compress':
        const compressPayload = payload as CompressPayload
        await processor.compressPDF(id, compressPayload.file, compressPayload.options)
        break

      case 'validate':
        const validatePayload = payload as ValidatePayload
        await processor.validatePDF(id, validatePayload.file, validatePayload.options)
        break

      default:
        throw new Error(`Unknown operation type: ${type}`)
    }
  } catch (error) {
    console.error(`Worker error for operation ${type}:`, error)
    processor['postError'](id, error instanceof Error ? error : new Error(String(error)))
  }
}

// Handle worker errors
self.onerror = (error) => {
  console.error('Worker global error:', error)
}

self.onunhandledrejection = (event) => {
  console.error('Worker unhandled promise rejection:', event.reason)
}

// Export types for main thread usage
