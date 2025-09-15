/**
 * Streaming PDF Processor
 * Handles large file processing using chunked streaming to prevent memory issues
 */

export interface StreamingChunk {
  data: ArrayBuffer
  index: number
  total: number
  isLast: boolean
}

export interface StreamingProgress {
  stage: 'reading' | 'processing' | 'combining' | 'complete'
  percentage: number
  chunksProcessed: number
  totalChunks: number
  currentChunkSize?: number
  memoryUsage?: number
}

export interface StreamingOptions {
  chunkSize?: number // Size in bytes for each chunk (default: 5MB)
  maxMemoryUsage?: number // Maximum memory usage in MB (default: 100MB)
  concurrentChunks?: number // Number of chunks to process concurrently (default: 2)
  enableMemoryMonitoring?: boolean // Monitor memory usage during processing
}

export class StreamingPDFProcessor {
  private readonly DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024 // 5MB
  private readonly DEFAULT_MAX_MEMORY = 100 * 1024 * 1024 // 100MB
  private readonly DEFAULT_CONCURRENT_CHUNKS = 2

  private abortController: AbortController | null = null
  private memoryMonitorInterval: NodeJS.Timeout | null = null

  /**
   * Process a large PDF file using streaming chunks
   */
  async processFileStream(
    file: File,
    operation: 'compress' | 'merge' | 'validate',
    options: StreamingOptions = {},
    onProgress?: (progress: StreamingProgress) => void
  ): Promise<ArrayBuffer> {
    const {
      chunkSize = this.DEFAULT_CHUNK_SIZE,
      maxMemoryUsage = this.DEFAULT_MAX_MEMORY,
      concurrentChunks = this.DEFAULT_CONCURRENT_CHUNKS,
      enableMemoryMonitoring = true
    } = options

    // Create abort controller for cancellation
    this.abortController = new AbortController()

    // Start memory monitoring if enabled
    if (enableMemoryMonitoring) {
      this.startMemoryMonitoring(maxMemoryUsage)
    }

    try {
      // Step 1: Read file in chunks
      onProgress?.({
        stage: 'reading',
        percentage: 0,
        chunksProcessed: 0,
        totalChunks: Math.ceil(file.size / chunkSize)
      })

      const chunks = await this.readFileInChunks(file, chunkSize, onProgress)

      // Step 2: Process chunks
      onProgress?.({
        stage: 'processing',
        percentage: 0,
        chunksProcessed: 0,
        totalChunks: chunks.length
      })

      const processedChunks = await this.processChunksConcurrently(
        chunks,
        operation,
        concurrentChunks,
        onProgress
      )

      // Step 3: Combine results
      onProgress?.({
        stage: 'combining',
        percentage: 0,
        chunksProcessed: 0,
        totalChunks: processedChunks.length
      })

      const result = await this.combineProcessedChunks(processedChunks, onProgress)

      onProgress?.({
        stage: 'complete',
        percentage: 100,
        chunksProcessed: processedChunks.length,
        totalChunks: processedChunks.length
      })

      return result

    } finally {
      this.cleanup()
    }
  }

  /**
   * Read file in manageable chunks
   */
  private async readFileInChunks(
    file: File,
    chunkSize: number,
    onProgress?: (progress: StreamingProgress) => void
  ): Promise<StreamingChunk[]> {
    const chunks: StreamingChunk[] = []
    const totalChunks = Math.ceil(file.size / chunkSize)

    for (let i = 0; i < totalChunks; i++) {
      this.checkAborted()

      const start = i * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const blob = file.slice(start, end)
      const data = await blob.arrayBuffer()

      chunks.push({
        data,
        index: i,
        total: totalChunks,
        isLast: i === totalChunks - 1
      })

      onProgress?.({
        stage: 'reading',
        percentage: Math.round(((i + 1) / totalChunks) * 100),
        chunksProcessed: i + 1,
        totalChunks,
        currentChunkSize: data.byteLength
      })

      // Small delay to prevent blocking the main thread
      await this.delay(1)
    }

    return chunks
  }

  /**
   * Process chunks concurrently with memory management
   */
  private async processChunksConcurrently(
    chunks: StreamingChunk[],
    operation: string,
    concurrentChunks: number,
    onProgress?: (progress: StreamingProgress) => void
  ): Promise<ArrayBuffer[]> {
    const results: (ArrayBuffer | null)[] = new Array(chunks.length).fill(null)
    const semaphore = new Semaphore(concurrentChunks)
    let processedCount = 0

    const processingPromises = chunks.map(async (chunk, index) => {
      await semaphore.acquire()

      try {
        this.checkAborted()

        // Simulate chunk processing (in real implementation, this would use the worker)
        const processedChunk = await this.processChunk(chunk, operation)
        results[index] = processedChunk

        processedCount++
        onProgress?.({
          stage: 'processing',
          percentage: Math.round((processedCount / chunks.length) * 100),
          chunksProcessed: processedCount,
          totalChunks: chunks.length,
          memoryUsage: this.getMemoryUsage()
        })

      } finally {
        semaphore.release()
      }
    })

    await Promise.all(processingPromises)

    // Filter out any null results and return as ArrayBuffer[]
    return results.filter((result): result is ArrayBuffer => result !== null)
  }

  /**
   * Process a single chunk
   */
  private async processChunk(chunk: StreamingChunk, operation: string): Promise<ArrayBuffer> {
    // In a real implementation, this would delegate to the appropriate processor
    switch (operation) {
      case 'compress':
        return this.compressChunk(chunk.data)
      case 'validate':
        return this.validateChunk(chunk.data)
      default:
        return chunk.data
    }
  }

  /**
   * Compress a single chunk (placeholder implementation)
   */
  private async compressChunk(data: ArrayBuffer): Promise<ArrayBuffer> {
    // Simulate compression processing
    await this.delay(100)

    // In real implementation, this would use pdf-lib or similar
    // For now, just return the data (no actual compression)
    return data
  }

  /**
   * Validate a single chunk (placeholder implementation)
   */
  private async validateChunk(data: ArrayBuffer): Promise<ArrayBuffer> {
    // Simulate validation processing
    await this.delay(50)

    // Basic validation - check if it looks like PDF data
    const view = new Uint8Array(data)
    const header = String.fromCharCode(...view.slice(0, 4))

    if (!header.startsWith('%PDF')) {
      throw new Error('Invalid PDF chunk detected')
    }

    return data
  }

  /**
   * Combine processed chunks back into a single file
   */
  private async combineProcessedChunks(
    chunks: ArrayBuffer[],
    onProgress?: (progress: StreamingProgress) => void
  ): Promise<ArrayBuffer> {
    let combinedSize = 0
    chunks.forEach(chunk => {
      combinedSize += chunk.byteLength
    })

    const combined = new Uint8Array(combinedSize)
    let offset = 0

    for (let i = 0; i < chunks.length; i++) {
      this.checkAborted()

      const chunk = new Uint8Array(chunks[i])
      combined.set(chunk, offset)
      offset += chunk.length

      onProgress?.({
        stage: 'combining',
        percentage: Math.round(((i + 1) / chunks.length) * 100),
        chunksProcessed: i + 1,
        totalChunks: chunks.length
      })

      // Small delay to prevent blocking
      await this.delay(1)
    }

    return combined.buffer
  }

  /**
   * Start monitoring memory usage
   */
  private startMemoryMonitoring(maxMemoryUsage: number) {
    this.memoryMonitorInterval = setInterval(() => {
      const memoryUsage = this.getMemoryUsage()

      if (memoryUsage > maxMemoryUsage) {
        console.warn(`Memory usage exceeded limit: ${memoryUsage}MB > ${maxMemoryUsage / 1024 / 1024}MB`)

        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }

        // If still over limit, abort processing
        const newMemoryUsage = this.getMemoryUsage()
        if (newMemoryUsage > maxMemoryUsage) {
          this.abort('Memory usage exceeded maximum limit')
        }
      }
    }, 1000) // Check every second
  }

  /**
   * Get current memory usage estimate
   */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0 // Fallback if memory info not available
  }

  /**
   * Check if processing has been aborted
   */
  private checkAborted() {
    if (this.abortController?.signal.aborted) {
      throw new Error('Streaming processing was aborted')
    }
  }

  /**
   * Abort the streaming process
   */
  abort(reason?: string) {
    if (this.abortController) {
      this.abortController.abort()
    }
    console.log(`Streaming processing aborted: ${reason || 'User requested'}`)
  }

  /**
   * Clean up resources
   */
  private cleanup() {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval)
      this.memoryMonitorInterval = null
    }
    this.abortController = null
  }

  /**
   * Promise-based delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Simple semaphore implementation for controlling concurrency
 */
class Semaphore {
  private permits: number
  private waiting: (() => void)[] = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--
        resolve()
      } else {
        this.waiting.push(resolve)
      }
    })
  }

  release(): void {
    this.permits++
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()
      if (resolve) {
        this.permits--
        resolve()
      }
    }
  }
}

export const streamingProcessor = new StreamingPDFProcessor()