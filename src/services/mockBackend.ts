/**
 * Mock Backend Service for Development Testing
 * Simulates PDF processing API responses and WebSocket updates
 */

import {
  ProcessingJobResponse,
  JobStatusResponse,
  JobResultResponse,
  SystemCapabilitiesResponse
} from './api'

// Mock processing jobs store
const mockJobs = new Map<string, any>()

// Generate realistic job IDs
const generateJobId = (): string => {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Simulate processing with realistic timing
const simulateProcessing = async (jobId: string, _filename: string, fileSize: number) => {
  const job = mockJobs.get(jobId)
  if (!job) return

  // Calculate realistic processing time based on file size
  const basePage = Math.ceil(fileSize / (100 * 1024)) // Estimate 100KB per page
  const processingTimeMs = Math.min(Math.max(1000 + (basePage * 150), 2000), 8000) // 2-8 seconds

  const steps = 10
  const stepDelay = processingTimeMs / steps

  for (let i = 1; i <= steps; i++) {
    await new Promise(resolve => setTimeout(resolve, stepDelay))

    const progress = Math.round((i / steps) * 100)
    job.progress = progress
    job.status = progress === 100 ? 'completed' : 'processing'

    if (progress === 100) {
      job.processing_time_ms = processingTimeMs
      job.completed_at = Date.now() / 1000
    }

    // Emit WebSocket-like event for real-time updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mock-job-update', {
        detail: {
          job_id: jobId,
          status: job.status,
          progress: job.progress,
          processing_time_ms: job.processing_time_ms
        }
      }))
    }
  }
}

export class MockBackendService {

  /**
   * Mock file upload and processing
   */
  static async uploadAndProcess(
    file: File,
    options: Record<string, any> = {}
  ): Promise<ProcessingJobResponse> {

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200))

    const jobId = generateJobId()
    const estimatedTimeSeconds = Math.min(6, Math.max(2, Math.ceil(file.size / (50 * 1024))))

    // Create mock job
    const job = {
      id: jobId,
      filename: file.name,
      status: 'queued',
      progress: 0,
      created_at: Date.now() / 1000,
      file_size_bytes: file.size,
      options,
      estimated_completion: Date.now() / 1000 + estimatedTimeSeconds,
      started_at: undefined as number | undefined,
      completed_at: undefined as number | undefined
    }

    mockJobs.set(jobId, job)

    // Start processing simulation
    setTimeout(() => {
      job.status = 'processing'
      job.started_at = Date.now() / 1000
      simulateProcessing(jobId, file.name, file.size)
    }, 500)

    return {
      success: true,
      job_id: jobId,
      message: "File uploaded successfully. Processing started.",
      estimated_time_seconds: estimatedTimeSeconds,
      status_endpoint: `/api/processing/status/${jobId}`
    }
  }

  /**
   * Mock job status retrieval
   */
  static async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100))

    const job = mockJobs.get(jobId)
    if (!job) {
      throw new Error('Job not found')
    }

    const estimatedRemaining = job.status === 'processing' && job.estimated_completion
      ? Math.max(0, job.estimated_completion - Date.now() / 1000)
      : undefined

    return {
      job_id: jobId,
      filename: job.filename,
      status: job.status,
      progress: job.progress,
      processing_time_ms: job.processing_time_ms,
      estimated_remaining_seconds: estimatedRemaining,
      created_at: job.created_at,
      started_at: job.started_at,
      completed_at: job.completed_at,
      file_size_bytes: job.file_size_bytes,
      error: job.error,
      performance_note: "🚀 Target: <6 seconds (10x faster than Adobe)",
      download_url: job.status === 'completed' ? `/api/processing/download/${jobId}` : undefined
    }
  }

  /**
   * Mock detailed job result
   */
  static async getJobResult(jobId: string): Promise<JobResultResponse> {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 150))

    const job = mockJobs.get(jobId)
    if (!job || job.status !== 'completed') {
      throw new Error('Job not completed')
    }

    const processingTimeMs = job.processing_time_ms || 3500
    const performanceRating = processingTimeMs <= 6000 ? 'excellent' :
                            processingTimeMs <= 15000 ? 'good' : 'needs_optimization'

    return {
      job_id: jobId,
      result: {
        success: true,
        pages_processed: Math.ceil(job.file_size_bytes / (100 * 1024)),
        operation_performed: job.options.operation || 'optimize',
        engine_used: 'MuPDF (Mock)',
        size_reduction_bytes: Math.floor(job.file_size_bytes * 0.25), // 25% reduction
        warnings: [],
        metadata: {
          original_size: job.file_size_bytes,
          compression_ratio: 0.75,
          quality_score: 0.95
        }
      },
      performance: {
        processing_time_ms: processingTimeMs,
        target_time_ms: 6000,
        performance_rating: performanceRating,
        compared_to_adobe: `${processingTimeMs/1000}s vs Adobe 45s`
      },
      download_url: `/api/processing/download/${jobId}`
    }
  }

  /**
   * Mock file download (returns blob URL)
   */
  static async downloadFile(jobId: string): Promise<Blob> {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))

    const job = mockJobs.get(jobId)
    if (!job || job.status !== 'completed') {
      throw new Error('File not ready for download')
    }

    // Create a mock PDF blob
    const mockPdfContent = `%PDF-1.4
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
72 720 Td
(Processed by PDF SaaS Platform) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000206 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
299
%%EOF`

    return new Blob([mockPdfContent], { type: 'application/pdf' })
  }

  /**
   * Mock system capabilities
   */
  static async getSystemCapabilities(): Promise<SystemCapabilitiesResponse> {
    await new Promise(resolve => setTimeout(resolve, 100))

    return {
      supported_operations: ["merge", "split", "compress", "convert", "optimize"],
      supported_input_formats: ["pdf", "docx"],
      supported_output_formats: ["pdf", "jpg", "png", "docx"],
      max_file_size_mb: 100,
      max_concurrent_jobs: 10,
      performance_targets: {
        processing_time_seconds: 6,
        adobe_comparison: "45+ seconds",
        speed_advantage: "10x faster"
      },
      engines: {
        primary: "MuPDF (Mock)",
        fallback: "PDFium (Mock)",
        enterprise_compliance: true
      },
      features: {
        real_time_progress: true,
        batch_processing: true,
        websocket_updates: true,
        enterprise_compliance: true,
        ai_features: false
      }
    }
  }

  /**
   * Mock WebSocket connection simulation
   */
  static simulateWebSocket(jobId: string, onUpdate: (data: any) => void) {
    const handleUpdate = (event: any) => {
      if (event.detail.job_id === jobId) {
        onUpdate(event.detail)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('mock-job-update', handleUpdate)

      // Return cleanup function
      return () => {
        window.removeEventListener('mock-job-update', handleUpdate)
      }
    }

    return () => {} // No-op cleanup for non-browser environments
  }

  /**
   * Mock health check
   */
  static async healthCheck() {
    await new Promise(resolve => setTimeout(resolve, 50))

    return {
      status: "healthy",
      timestamp: Date.now() / 1000,
      service: "PDF SaaS Platform API (Mock)",
      version: "1.0.0-mock",
      message: "🚀 Mock service operating at peak performance - Ready for sub-6 second processing!"
    }
  }

  /**
   * Clear all mock jobs (for testing)
   */
  static clearAllJobs() {
    mockJobs.clear()
  }

  /**
   * Get all mock jobs (for debugging)
   */
  static getAllJobs() {
    return Array.from(mockJobs.entries()).map(([id, job]) => ({ id, ...job }))
  }
}

export default MockBackendService