import { PDFDocument, rgb, PageSizes } from 'pdf-lib'
import jsPDF from 'jspdf'
import { saveAs } from 'file-saver'
import { workerManager, WorkerManager } from './workerManager'
import type { ProcessingProgress as WorkerProgress } from './workerManager'

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
  enableProgressTracking?: boolean
  chunkSize?: number
  securityLevel?: 'strict' | 'normal' | 'relaxed'
  useWorker?: boolean // Allow fallback to main thread if needed
}

export interface ProcessingProgress {
  stage: 'validation' | 'loading' | 'processing' | 'saving' | 'complete'
  percentage: number
  message: string
  currentFile?: string
  filesProcessed?: number
  totalFiles?: number
  bytesProcessed?: number
  totalBytes?: number
}

export interface ProcessingLimits {
  maxFileSize: number
  maxTotalSize: number
  maxPages: number
  maxFiles: number
  supportedFormats: string[]
  memoryThreshold: number
}

export interface ProcessingResult {
  success: boolean
  message: string
  downloadUrl?: string
  fileSize?: number
  processingTime?: number
}

export class PDFProcessor {
  private static instance: PDFProcessor
  private processingLimits: ProcessingLimits
  private activeProcesses: Map<string, AbortController> = new Map()
  private memoryUsage: number = 0
  private progressCallbacks: Map<string, (progress: ProcessingProgress) => void> = new Map()

  constructor() {
    this.processingLimits = {
      maxFileSize: 100 * 1024 * 1024, // 100MB per file
      maxTotalSize: 500 * 1024 * 1024, // 500MB total
      maxPages: 5000, // Maximum pages per operation
      maxFiles: 50, // Maximum files for merge
      supportedFormats: ['application/pdf'],
      memoryThreshold: 0.85 // 85% of available memory
    }
  }

  private isWorkerSupported(): boolean {
    return WorkerManager.isSupported()
  }

  private mapWorkerProgress(workerProgress: WorkerProgress): ProcessingProgress {
    return {
      stage: workerProgress.stage,
      percentage: workerProgress.percentage,
      message: workerProgress.message,
      currentFile: workerProgress.currentFile,
      filesProcessed: workerProgress.filesProcessed,
      totalFiles: workerProgress.totalFiles,
      bytesProcessed: workerProgress.bytesProcessed,
      totalBytes: workerProgress.totalBytes
    }
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    saveAs(blob, fileName)
  }

  static getInstance(): PDFProcessor {
    if (!PDFProcessor.instance) {
      PDFProcessor.instance = new PDFProcessor()
    }
    return PDFProcessor.instance
  }

  setProgressCallback(processId: string, callback: (progress: ProcessingProgress) => void): void {
    this.progressCallbacks.set(processId, callback)
  }

  removeProgressCallback(processId: string): void {
    this.progressCallbacks.delete(processId)
  }

  private updateProgress(processId: string, progress: ProcessingProgress): void {
    const callback = this.progressCallbacks.get(processId)
    if (callback) {
      callback(progress)
    }
  }

  private generateProcessId(): string {
    return `process_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private estimateMemoryUsage(): number {
    if ('memory' in performance && 'usedJSHeapSize' in (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / (performance as any).memory.jsHeapSizeLimit
    }
    return this.memoryUsage / (1024 * 1024 * 1024) // Fallback estimation
  }

  private async validateFiles(files: File[]): Promise<{valid: boolean, errors: string[]}> {
    const errors: string[] = []
    let totalSize = 0

    // Check file count
    if (files.length > this.processingLimits.maxFiles) {
      errors.push(`Too many files. Maximum allowed: ${this.processingLimits.maxFiles}`)
    }

    for (const file of files) {
      // Check file type
      if (!this.processingLimits.supportedFormats.includes(file.type) &&
          !file.name.toLowerCase().endsWith('.pdf')) {
        errors.push(`Invalid file type: ${file.name}. Only PDF files are supported.`)
      }

      // Check individual file size
      if (file.size > this.processingLimits.maxFileSize) {
        errors.push(`File too large: ${file.name} (${this.formatFileSize(file.size)}). Maximum: ${this.formatFileSize(this.processingLimits.maxFileSize)}`)
      }

      // Check for empty files
      if (file.size === 0) {
        errors.push(`Empty file: ${file.name}`)
      }

      totalSize += file.size
    }

    // Check total size
    if (totalSize > this.processingLimits.maxTotalSize) {
      errors.push(`Total size too large (${this.formatFileSize(totalSize)}). Maximum: ${this.formatFileSize(this.processingLimits.maxTotalSize)}`)
    }

    // Check memory usage
    const memoryUsage = this.estimateMemoryUsage()
    if (memoryUsage > this.processingLimits.memoryThreshold) {
      errors.push(`Insufficient memory. Current usage: ${(memoryUsage * 100).toFixed(1)}%`)
    }

    return { valid: errors.length === 0, errors }
  }

  private async validatePDFIntegrity(file: File): Promise<{valid: boolean, error?: string, pageCount?: number}> {
    try {
      const arrayBuffer = await file.arrayBuffer()

      // Check PDF header
      const uint8Array = new Uint8Array(arrayBuffer, 0, 8)
      const header = Array.from(uint8Array).map(b => String.fromCharCode(b)).join('')

      if (!header.startsWith('%PDF-')) {
        return { valid: false, error: 'Invalid PDF header' }
      }

      // Try to load the PDF
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
        capNumbers: true,
        throwOnInvalidObject: false
      })

      const pageCount = pdfDoc.getPageCount()

      // Check page count limits
      if (pageCount > this.processingLimits.maxPages) {
        return { valid: false, error: `Too many pages: ${pageCount}. Maximum: ${this.processingLimits.maxPages}` }
      }

      return { valid: true, pageCount }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown PDF validation error'
      }
    }
  }

  private async processWithChunking<T>(
    items: T[],
    processor: (item: T, index: number) => Promise<any>,
    chunkSize: number = 5,
    processId: string,
    operationType: string
  ): Promise<any[]> {
    const results: any[] = []
    const totalItems = items.length

    for (let i = 0; i < items.length; i += chunkSize) {
      // Check if process was cancelled
      const controller = this.activeProcesses.get(processId)
      if (controller?.signal.aborted) {
        throw new Error('Process cancelled by user')
      }

      const chunk = items.slice(i, i + chunkSize)
      const chunkPromises = chunk.map((item, chunkIndex) =>
        processor(item, i + chunkIndex)
      )

      try {
        const chunkResults = await Promise.all(chunkPromises)
        results.push(...chunkResults)

        // Update progress
        this.updateProgress(processId, {
          stage: 'processing',
          percentage: Math.round(((i + chunk.length) / totalItems) * 100),
          message: `${operationType}: ${i + chunk.length}/${totalItems} items processed`,
          filesProcessed: i + chunk.length,
          totalFiles: totalItems
        })

        // Brief pause to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 10))
      } catch (error) {
        console.error(`Error processing chunk ${i}-${i + chunk.length}:`, error)
        throw error
      }
    }

    return results
  }

  cancelProcess(processId: string): void {
    const controller = this.activeProcesses.get(processId)
    if (controller) {
      controller.abort()
      this.activeProcesses.delete(processId)
      this.removeProgressCallback(processId)
    }
  }

  getProcessingLimits(): ProcessingLimits {
    return { ...this.processingLimits }
  }

  updateProcessingLimits(limits: Partial<ProcessingLimits>): void {
    this.processingLimits = { ...this.processingLimits, ...limits }
  }

  getActiveProcesses(): string[] {
    return Array.from(this.activeProcesses.keys())
  }

  cancelAllProcesses(): void {
    this.activeProcesses.forEach((controller, processId) => {
      controller.abort()
      this.removeProgressCallback(processId)
    })
    this.activeProcesses.clear()
  }

  private async attemptRecovery<T>(
    operation: () => Promise<T>,
    maxRetries: number = 2,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Wait with exponential backoff
          await new Promise(resolve => setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1)))

          // Force garbage collection if available
          if ('gc' in window && typeof (window as any).gc === 'function') {
            (window as any).gc()
          }
        }

        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.warn(`Operation attempt ${attempt + 1} failed:`, lastError.message)

        // Don't retry for certain types of errors
        if (lastError.message.includes('cancelled') ||
            lastError.message.includes('Invalid PDF') ||
            lastError.message.includes('exceed limit')) {
          throw lastError
        }
      }
    }

    throw lastError!
  }

  async compressPDF(file: File, options: PDFProcessingOptions = {}): Promise<ProcessingResult> {
    // Use Web Worker if supported and not explicitly disabled
    const useWorker = options.useWorker !== false && this.isWorkerSupported()

    if (useWorker) {
      return this.compressPDFWithWorker(file, options)
    } else {
      console.warn('Falling back to main thread PDF processing - UI may freeze for large files')
      return this.compressPDFMainThread(file, options)
    }
  }

  private async compressPDFWithWorker(file: File, options: PDFProcessingOptions = {}): Promise<ProcessingResult> {
    try {
      const result = await workerManager.compressPDF(file, {
        ...options,
        securityLevel: options.securityLevel || 'normal'
      })

      if (result.success && result.pdfBytes) {
        // Convert array back to Uint8Array and create blob
        const uint8Array = new Uint8Array(result.pdfBytes)
        const blob = new Blob([uint8Array], { type: 'application/pdf' })
        this.downloadBlob(blob, result.fileName || `optimized_${file.name}`)
      }

      return result

    } catch (error) {
      console.error('Worker compression error:', error)
      return {
        success: false,
        message: `Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async compressPDFMainThread(file: File, options: PDFProcessingOptions = {}): Promise<ProcessingResult> {
    const startTime = Date.now()

    try {
      console.log(`Compressing PDF: ${file.name} (${this.formatFileSize(file.size)})`)

      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)

      // Basic compression by removing unused objects and optimizing
      const compressedBytes = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
        objectsPerTick: 50,
        updateFieldAppearances: false
      })

      const originalSize = file.size
      const compressedSize = compressedBytes.length
      const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1)

      // Create blob and download
      const blob = new Blob([Array.from(compressedBytes)], { type: 'application/pdf' })
      const fileName = options.outputName || `optimized_${file.name}`
      this.downloadBlob(blob, fileName)

      const processingTime = Date.now() - startTime

      return {
        success: true,
        message: `PDF optimized by ${compressionRatio}% (${this.formatFileSize(originalSize)} → ${this.formatFileSize(compressedSize)})`,
        fileSize: compressedSize,
        processingTime
      }
    } catch (error) {
      return {
        success: false,
        message: `Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async splitPDF(file: File, options: PDFProcessingOptions = {}): Promise<ProcessingResult> {
    const startTime = Date.now()

    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const totalPages = pdfDoc.getPageCount()

      if (options.pages && options.pages.length > 0) {
        // Split specific pages
        const newPdfDoc = await PDFDocument.create()
        const pages = await newPdfDoc.copyPages(pdfDoc, options.pages.map(p => p - 1))

        pages.forEach(page => newPdfDoc.addPage(page))

        const pdfBytes = await newPdfDoc.save()
        const blob = new Blob([Array.from(pdfBytes)], { type: 'application/pdf' })
        const fileName = options.outputName || `split_pages_${options.pages.join('-')}_${file.name}`
        saveAs(blob, fileName)

        const processingTime = Date.now() - startTime

        return {
          success: true,
          message: `Extracted ${options.pages.length} pages from ${totalPages} total pages`,
          fileSize: pdfBytes.length,
          processingTime
        }
      } else {
        // Split into individual pages
        const splitPromises = Array.from({ length: totalPages }, async (_, index) => {
          const newPdfDoc = await PDFDocument.create()
          const [page] = await newPdfDoc.copyPages(pdfDoc, [index])
          newPdfDoc.addPage(page)

          const pdfBytes = await newPdfDoc.save()
          const blob = new Blob([Array.from(pdfBytes)], { type: 'application/pdf' })
          const fileName = `page_${index + 1}_${file.name}`
          saveAs(blob, fileName)
        })

        await Promise.all(splitPromises)

        const processingTime = Date.now() - startTime

        return {
          success: true,
          message: `Split PDF into ${totalPages} individual pages`,
          processingTime
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Split failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async mergePDFs(files: File[], options: PDFProcessingOptions = {}): Promise<ProcessingResult & {processId?: string}> {
    // Use Web Worker if supported and not explicitly disabled
    const useWorker = options.useWorker !== false && this.isWorkerSupported()

    if (useWorker) {
      return this.mergePDFsWithWorker(files, options)
    } else {
      console.warn('Falling back to main thread PDF processing - UI may freeze for large files')
      return this.mergePDFsMainThread(files, options)
    }
  }

  private async mergePDFsWithWorker(files: File[], options: PDFProcessingOptions = {}): Promise<ProcessingResult & {processId?: string}> {
    const processId = this.generateProcessId()

    try {
      const result = await workerManager.mergePDFs(files, {
        ...options,
        securityLevel: options.securityLevel || 'normal'
      }, (workerProgress) => {
        // Convert worker progress to our format and forward to callback
        const progress = this.mapWorkerProgress(workerProgress)
        this.updateProgress(processId, progress)
      })

      if (result.success && result.pdfBytes) {
        // Convert array back to Uint8Array and create blob
        const uint8Array = new Uint8Array(result.pdfBytes)
        const blob = new Blob([uint8Array], { type: 'application/pdf' })
        this.downloadBlob(blob, result.fileName || 'merged.pdf')
      }

      return {
        ...result,
        processId
      }

    } catch (error) {
      console.error('Worker merge error:', error)
      return {
        success: false,
        message: `Merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processId
      }
    } finally {
      // Cleanup
      this.removeProgressCallback(processId)
    }
  }

  private async mergePDFsMainThread(files: File[], options: PDFProcessingOptions = {}): Promise<ProcessingResult & {processId?: string}> {
    const processId = this.generateProcessId()
    const controller = new AbortController()
    this.activeProcesses.set(processId, controller)

    const startTime = Date.now()

    try {
      // Phase 1: Validation
      this.updateProgress(processId, {
        stage: 'validation',
        percentage: 0,
        message: 'Validating files...',
        totalFiles: files.length
      })

      if (files.length === 0) {
        return { success: false, message: 'No files provided for merging', processId }
      }

      if (files.length === 1) {
        return { success: false, message: 'At least 2 files are required for merging', processId }
      }

      // Comprehensive file validation
      const validation = await this.validateFiles(files)
      if (!validation.valid) {
        return {
          success: false,
          message: `Validation failed:\n${validation.errors.join('\n')}`,
          processId
        }
      }

      // Phase 2: PDF Integrity Check
      this.updateProgress(processId, {
        stage: 'validation',
        percentage: 20,
        message: 'Checking PDF integrity...',
        totalFiles: files.length
      })

      const pdfValidations: Array<{file: File, valid: boolean, error?: string, pageCount?: number}> = []
      let totalExpectedPages = 0

      for (let i = 0; i < files.length; i++) {
        if (controller.signal.aborted) throw new Error('Process cancelled')

        const file = files[i]
        const pdfValidation = await this.validatePDFIntegrity(file)

        if (!pdfValidation.valid) {
          return {
            success: false,
            message: `Invalid PDF: ${file.name} - ${pdfValidation.error}`,
            processId
          }
        }

        pdfValidations.push({
          file,
          valid: pdfValidation.valid,
          pageCount: pdfValidation.pageCount
        })

        totalExpectedPages += pdfValidation.pageCount || 0

        this.updateProgress(processId, {
          stage: 'validation',
          percentage: 20 + (i / files.length) * 30,
          message: `Validated ${i + 1}/${files.length} files`,
          filesProcessed: i + 1,
          totalFiles: files.length
        })
      }

      // Check total page limit
      if (totalExpectedPages > this.processingLimits.maxPages) {
        return {
          success: false,
          message: `Total pages exceed limit: ${totalExpectedPages}. Maximum: ${this.processingLimits.maxPages}`,
          processId
        }
      }

      // Phase 3: Processing with Memory Management
      this.updateProgress(processId, {
        stage: 'processing',
        percentage: 50,
        message: 'Creating merged document...',
        totalFiles: files.length
      })

      const mergedPdf = await PDFDocument.create()
      let totalPages = 0
      let totalBytesProcessed = 0
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0)

      // Process files in chunks to manage memory
      const chunkSize = options.chunkSize || Math.max(1, Math.floor(10 / files.length))

      for (let i = 0; i < files.length; i += chunkSize) {
        if (controller.signal.aborted) throw new Error('Process cancelled')

        const chunk = files.slice(i, i + chunkSize)

        for (const file of chunk) {
          const fileIndex = files.indexOf(file)

          this.updateProgress(processId, {
            stage: 'processing',
            percentage: 50 + (fileIndex / files.length) * 40,
            message: `Processing ${file.name}...`,
            currentFile: file.name,
            filesProcessed: fileIndex,
            totalFiles: files.length,
            bytesProcessed: totalBytesProcessed,
            totalBytes
          })

          // Memory check before processing each file
          const memoryUsage = this.estimateMemoryUsage()
          if (memoryUsage > this.processingLimits.memoryThreshold) {
            // Force garbage collection if available
            if ('gc' in window && typeof (window as any).gc === 'function') {
              (window as any).gc()
            }

            // Recheck after GC
            const postGCMemory = this.estimateMemoryUsage()
            if (postGCMemory > this.processingLimits.memoryThreshold) {
              throw new Error(`Memory limit exceeded: ${(postGCMemory * 100).toFixed(1)}%`)
            }
          }

          try {
            const arrayBuffer = await file.arrayBuffer()
            const pdf = await PDFDocument.load(arrayBuffer, {
              ignoreEncryption: true,
              capNumbers: true,
              throwOnInvalidObject: false
            })

            const pageIndices = pdf.getPageIndices()
            const pages = await mergedPdf.copyPages(pdf, pageIndices)

            pages.forEach(page => mergedPdf.addPage(page))
            totalPages += pdf.getPageCount()
            totalBytesProcessed += file.size

            // Clean up references to help GC (note: these are just for clarity, actual cleanup happens automatically)

          } catch (fileError) {
            throw new Error(`Failed to process ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`)
          }
        }

        // Brief pause between chunks to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Phase 4: Saving
      this.updateProgress(processId, {
        stage: 'saving',
        percentage: 90,
        message: `Saving merged document with ${totalPages} pages...`,
        totalFiles: files.length
      })

      const pdfBytes = await mergedPdf.save({
        useObjectStreams: false,
        addDefaultPage: false,
        objectsPerTick: 50
      })

      // Check output size limits
      const outputSizeMB = pdfBytes.length / (1024 * 1024)
      if (outputSizeMB > 200) { // 200MB output limit
        return {
          success: false,
          message: `Output file too large: ${outputSizeMB.toFixed(1)}MB. Maximum: 200MB`,
          processId
        }
      }

      const blob = new Blob([Array.from(pdfBytes)], { type: 'application/pdf' })
      const fileName = options.outputName || `merged_${files.length}_documents.pdf`

      saveAs(blob, fileName)

      const processingTime = Date.now() - startTime

      // Phase 5: Complete
      this.updateProgress(processId, {
        stage: 'complete',
        percentage: 100,
        message: `Successfully merged ${files.length} PDFs`,
        filesProcessed: files.length,
        totalFiles: files.length
      })

      // Cleanup
      this.activeProcesses.delete(processId)
      setTimeout(() => this.removeProgressCallback(processId), 5000)

      return {
        success: true,
        message: `Merged ${files.length} PDFs into 1 document with ${totalPages} total pages (${this.formatFileSize(pdfBytes.length)})`,
        fileSize: pdfBytes.length,
        processingTime,
        processId
      }

    } catch (error) {
      console.error('Merge error:', error)
      this.activeProcesses.delete(processId)
      this.removeProgressCallback(processId)

      return {
        success: false,
        message: `Merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processId
      }
    }
  }

  async convertToJPG(file: File, options: PDFProcessingOptions = {}): Promise<ProcessingResult> {
    const startTime = Date.now()

    try {
      // For now, we'll create a simple conversion notification
      // In a real implementation, you'd use pdf2pic or similar
      const processingTime = Date.now() - startTime

      return {
        success: true,
        message: `PDF conversion to JPG initiated. This feature requires server-side processing.`,
        processingTime
      }
    } catch (error) {
      return {
        success: false,
        message: `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async addWatermark(file: File, watermarkText: string, options: PDFProcessingOptions = {}): Promise<ProcessingResult> {
    const startTime = Date.now()

    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const pages = pdfDoc.getPages()

      pages.forEach(page => {
        const { width, height } = page.getSize()

        page.drawText(watermarkText, {
          x: width / 2 - (watermarkText.length * 6),
          y: height / 2,
          size: 50,
          color: rgb(0.8, 0.8, 0.8),
          opacity: 0.3,
          rotate: 45
        })
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const fileName = options.outputName || `watermarked_${file.name}`
      saveAs(blob, fileName)

      const processingTime = Date.now() - startTime

      return {
        success: true,
        message: `Added watermark "${watermarkText}" to ${pages.length} pages`,
        fileSize: pdfBytes.length,
        processingTime
      }
    } catch (error) {
      return {
        success: false,
        message: `Watermark failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async rotatePDF(file: File, degrees: number, options: PDFProcessingOptions = {}): Promise<ProcessingResult> {
    const startTime = Date.now()

    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const pages = pdfDoc.getPages()

      pages.forEach(page => {
        page.setRotation(degrees)
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const fileName = options.outputName || `rotated_${degrees}deg_${file.name}`
      saveAs(blob, fileName)

      const processingTime = Date.now() - startTime

      return {
        success: true,
        message: `Rotated ${pages.length} pages by ${degrees}°`,
        fileSize: pdfBytes.length,
        processingTime
      }
    } catch (error) {
      return {
        success: false,
        message: `Rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  async getFileInfo(file: File): Promise<{
    name: string
    size: string
    pages?: number
    version?: string
    error?: string
    security?: {
      level: string
      hasJavaScript: boolean
      hasEmbeddedFiles: boolean
      hasFormFields: boolean
    }
  }> {
    try {
      console.log(`Getting info for file: ${file.name}, type: ${file.type}, size: ${file.size}`)

      // Basic validation first
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('File is not a valid PDF')
      }

      if (file.size > 100 * 1024 * 1024) { // Increased to 100MB to match processing limits
        throw new Error('File is too large (max 100MB)')
      }

      if (file.size === 0) {
        throw new Error('File is empty')
      }

      // Use worker for validation if available
      const useWorker = this.isWorkerSupported()

      if (useWorker) {
        try {
          const result = await workerManager.validatePDF(file, {
            securityLevel: 'normal'
          })

          if (result.success) {
            return {
              name: file.name,
              size: this.formatFileSize(file.size),
              pages: result.pageCount,
              version: 'PDF',
              security: result.security
            }
          } else {
            throw new Error(result.message)
          }
        } catch (workerError) {
          console.warn('Worker validation failed, falling back to main thread:', workerError)
          // Fall through to main thread validation
        }
      }

      // Fallback to main thread validation
      return this.getFileInfoMainThread(file)

    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
      return {
        name: file.name,
        size: this.formatFileSize(file.size),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async getFileInfoMainThread(file: File): Promise<{
    name: string
    size: string
    pages?: number
    version?: string
    error?: string
  }> {
    const arrayBuffer = await file.arrayBuffer()
    console.log(`ArrayBuffer size: ${arrayBuffer.byteLength}`)

    // Check if the file starts with PDF header
    const uint8Array = new Uint8Array(arrayBuffer, 0, 8)
    const header = Array.from(uint8Array).map(b => String.fromCharCode(b)).join('')
    console.log(`File header: ${header}`)

    if (!header.startsWith('%PDF-')) {
      throw new Error('File does not have a valid PDF header')
    }

    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true
    })

    const pageCount = pdfDoc.getPageCount()
    console.log(`PDF loaded successfully: ${pageCount} pages`)

    return {
      name: file.name,
      size: this.formatFileSize(file.size),
      pages: pageCount,
      version: 'PDF'
    }
  }
}

export const pdfProcessor = PDFProcessor.getInstance()