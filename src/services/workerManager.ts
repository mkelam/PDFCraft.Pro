import type {
  WorkerMessage,
  WorkerResponse,
  PDFProcessingOptions,
  WorkerPayload,
  MergePayload,
  CompressPayload,
  ValidatePayload
} from '../workers/pdfWorker'

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

export interface ProcessingResult {
  success: boolean
  message: string
  fileSize?: number
  processingTime?: number
  pdfBytes?: number[]
  fileName?: string
  pageCount?: number
  security?: {
    level: string
    hasJavaScript: boolean
    hasEmbeddedFiles: boolean
    hasFormFields: boolean
  }
}

export class WorkerManager {
  private static instance: WorkerManager
  private worker: Worker | null = null
  private activeJobs = new Map<string, {
    resolve: (result: ProcessingResult) => void
    reject: (error: Error) => void
    onProgress?: (progress: ProcessingProgress) => void
  }>()
  private jobIdCounter = 0

  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager()
    }
    return WorkerManager.instance
  }

  private constructor() {
    this.initializeWorker()
  }

  private initializeWorker() {
    try {
      // Create worker from TypeScript file - Vite will handle the bundling
      this.worker = new Worker(
        new URL('../workers/pdfWorker.ts', import.meta.url),
        { type: 'module' }
      )

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(event.data)
      }

      this.worker.onerror = (error) => {
        console.error('Worker error:', error)
        this.rejectAllJobs(new Error('Worker encountered an error'))
      }

      this.worker.onmessageerror = (error) => {
        console.error('Worker message error:', error)
        this.rejectAllJobs(new Error('Worker message error'))
      }

    } catch (error) {
      console.error('Failed to initialize worker:', error)
      throw new Error('Web Worker is not supported in this environment')
    }
  }

  private handleWorkerMessage(response: WorkerResponse) {
    const job = this.activeJobs.get(response.id)
    if (!job) {
      console.warn(`Received message for unknown job: ${response.id}`)
      return
    }

    switch (response.type) {
      case 'progress':
        if (job.onProgress) {
          job.onProgress(response.payload as ProcessingProgress)
        }
        break

      case 'result':
        this.activeJobs.delete(response.id)
        job.resolve(response.payload as ProcessingResult)
        break

      case 'error':
        this.activeJobs.delete(response.id)
        const error = new Error(response.payload.message)
        error.name = response.payload.name || 'WorkerError'
        if (response.payload.stack) {
          error.stack = response.payload.stack
        }
        job.reject(error)
        break

      default:
        console.warn(`Unknown response type: ${response.type}`)
    }
  }

  private generateJobId(): string {
    return `job_${++this.jobIdCounter}_${Date.now()}`
  }

  private rejectAllJobs(error: Error) {
    for (const [id, job] of this.activeJobs) {
      job.reject(error)
    }
    this.activeJobs.clear()
  }

  private async sendMessage(
    type: WorkerMessage['type'],
    payload: WorkerPayload,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ProcessingResult> {
    if (!this.worker) {
      throw new Error('Worker not initialized')
    }

    const id = this.generateJobId()

    return new Promise((resolve, reject) => {
      this.activeJobs.set(id, { resolve, reject, onProgress })

      const message: WorkerMessage = { id, type, payload }
      this.worker!.postMessage(message)

      // Set timeout to prevent hanging jobs
      setTimeout(() => {
        if (this.activeJobs.has(id)) {
          this.activeJobs.delete(id)
          reject(new Error('Worker operation timed out'))
        }
      }, 5 * 60 * 1000) // 5 minutes timeout
    })
  }

  async mergePDFs(
    files: File[],
    options: PDFProcessingOptions = {},
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ProcessingResult> {
    // Convert files to ArrayBuffer for transfer to worker
    const fileBuffers = await Promise.all(
      files.map(file => file.arrayBuffer())
    )

    const payload: MergePayload = {
      files: fileBuffers,
      options
    }
    return this.sendMessage('merge', payload, onProgress)
  }

  async compressPDF(
    file: File,
    options: PDFProcessingOptions = {},
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ProcessingResult> {
    const fileBuffer = await file.arrayBuffer()

    const payload: CompressPayload = {
      file: fileBuffer,
      options: {
        ...options,
        outputName: options.outputName || `optimized_${file.name}`
      }
    }
    return this.sendMessage('compress', payload, onProgress)
  }

  async validatePDF(
    file: File,
    options: PDFProcessingOptions = {},
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ProcessingResult> {
    const fileBuffer = await file.arrayBuffer()

    const payload: ValidatePayload = {
      file: fileBuffer,
      options
    }
    return this.sendMessage('validate', payload, onProgress)
  }

  // Utility method to check if Web Workers are supported
  static isSupported(): boolean {
    return typeof Worker !== 'undefined'
  }

  // Method to terminate worker and clean up
  terminate() {
    if (this.worker) {
      this.rejectAllJobs(new Error('Worker terminated'))
      this.worker.terminate()
      this.worker = null
    }
  }

  // Method to restart worker if needed
  restart() {
    this.terminate()
    this.initializeWorker()
  }

  // Get current job count
  getActiveJobCount(): number {
    return this.activeJobs.size
  }

  // Cancel specific job (if possible)
  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId)
    if (job) {
      this.activeJobs.delete(jobId)
      job.reject(new Error('Job cancelled by user'))
      return true
    }
    return false
  }

  // Cancel all active jobs
  cancelAllJobs() {
    this.rejectAllJobs(new Error('All jobs cancelled'))
  }
}

export const workerManager = WorkerManager.getInstance()