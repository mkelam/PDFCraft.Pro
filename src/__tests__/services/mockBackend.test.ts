/**
 * Mock Backend Service Tests
 * Tests for mock API responses and processing simulation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MockBackendService } from '../../services/mockBackend'

// Mock File constructor for testing
global.File = class MockFile {
  name: string
  size: number
  type: string

  constructor(content: string[], filename: string, options: any = {}) {
    this.name = filename
    this.size = content.join('').length
    this.type = options.type || 'application/pdf'
  }
} as any

describe('MockBackendService', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    MockBackendService.clearAllJobs()
    // Allow any pending async operations to complete
    await new Promise(resolve => setTimeout(resolve, 50))
  })

  afterEach(async () => {
    MockBackendService.clearAllJobs()
    // Allow any pending async operations to complete
    await new Promise(resolve => setTimeout(resolve, 50))
  })

  describe('uploadAndProcess', () => {
    it('should create a processing job and return job response', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const options = { operation: 'compress', quality: 'high' }

      const response = await MockBackendService.uploadAndProcess(mockFile, options)

      expect(response).toMatchObject({
        success: true,
        job_id: expect.stringMatching(/^job_\d+_\w+$/),
        message: 'File uploaded successfully. Processing started.',
        estimated_time_seconds: expect.any(Number),
        status_endpoint: expect.stringContaining('/api/processing/status/')
      })

      expect(response.estimated_time_seconds).toBeGreaterThan(0)
      expect(response.estimated_time_seconds).toBeLessThanOrEqual(6)
    })

    it('should estimate processing time based on file size', async () => {
      const smallFile = new File(['small'], 'small.pdf')
      const largeFile = new File([new Array(100000).fill('x').join('')], 'large.pdf')

      const smallResponse = await MockBackendService.uploadAndProcess(smallFile)
      const largeResponse = await MockBackendService.uploadAndProcess(largeFile)

      expect(largeResponse.estimated_time_seconds).toBeGreaterThanOrEqual(
        smallResponse.estimated_time_seconds
      )
    })
  })

  describe('getJobStatus', () => {
    it('should return job status for existing jobs', async () => {
      const mockFile = new File(['test'], 'test.pdf')
      const uploadResponse = await MockBackendService.uploadAndProcess(mockFile)

      const statusResponse = await MockBackendService.getJobStatus(uploadResponse.job_id)

      expect(statusResponse).toMatchObject({
        job_id: uploadResponse.job_id,
        filename: 'test.pdf',
        status: expect.stringMatching(/^(queued|processing|completed|failed)$/),
        progress: expect.any(Number),
        file_size_bytes: 4,
        performance_note: '🚀 Target: <6 seconds (10x faster than Adobe)'
      })

      expect(statusResponse.progress).toBeGreaterThanOrEqual(0)
      expect(statusResponse.progress).toBeLessThanOrEqual(100)
    })

    it('should throw error for non-existent jobs', async () => {
      await expect(
        MockBackendService.getJobStatus('non-existent-job')
      ).rejects.toThrow('Job not found')
    })

    it('should include estimated remaining time for processing jobs', async () => {
      const mockFile = new File(['test'], 'test.pdf')
      const uploadResponse = await MockBackendService.uploadAndProcess(mockFile)

      // Wait a bit for processing to start
      await new Promise(resolve => setTimeout(resolve, 600))

      const statusResponse = await MockBackendService.getJobStatus(uploadResponse.job_id)

      if (statusResponse.status === 'processing') {
        expect(statusResponse.estimated_remaining_seconds).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('getJobResult', () => {
    it('should return detailed results for completed jobs', async () => {
      const mockFile = new File(['test content'], 'test.pdf')
      const uploadResponse = await MockBackendService.uploadAndProcess(mockFile)

      // Wait longer for processing to complete and poll for completion
      let attempts = 0
      let statusResponse
      do {
        await new Promise(resolve => setTimeout(resolve, 1000))
        statusResponse = await MockBackendService.getJobStatus(uploadResponse.job_id)
        attempts++
      } while (statusResponse.status !== 'completed' && attempts < 10)

      const resultResponse = await MockBackendService.getJobResult(uploadResponse.job_id)

      expect(resultResponse).toMatchObject({
        job_id: uploadResponse.job_id,
        result: {
          success: true,
          pages_processed: expect.any(Number),
          operation_performed: expect.any(String),
          engine_used: 'MuPDF (Mock)',
          size_reduction_bytes: expect.any(Number),
          warnings: [],
          metadata: expect.objectContaining({
            original_size: expect.any(Number),
            compression_ratio: expect.any(Number),
            quality_score: expect.any(Number)
          })
        },
        performance: {
          processing_time_ms: expect.any(Number),
          target_time_ms: 6000,
          performance_rating: expect.stringMatching(/^(excellent|good|needs_optimization)$/),
          compared_to_adobe: expect.stringMatching(/\d+\.?\d*s vs Adobe 45s/)
        }
      })

      expect(resultResponse.result.pages_processed).toBeGreaterThan(0)
      expect(resultResponse.performance.processing_time_ms).toBeGreaterThan(0)
    })

    it('should throw error for incomplete jobs', async () => {
      const mockFile = new File(['test'], 'test.pdf')
      const uploadResponse = await MockBackendService.uploadAndProcess(mockFile)

      await expect(
        MockBackendService.getJobResult(uploadResponse.job_id)
      ).rejects.toThrow('Job not completed')
    })
  })

  describe('downloadFile', () => {
    it('should return a blob for completed jobs', async () => {
      const mockFile = new File(['test'], 'test.pdf')
      const uploadResponse = await MockBackendService.uploadAndProcess(mockFile)

      // Wait longer for processing to complete and poll for completion
      let attempts = 0
      let statusResponse
      do {
        await new Promise(resolve => setTimeout(resolve, 1000))
        statusResponse = await MockBackendService.getJobStatus(uploadResponse.job_id)
        attempts++
      } while (statusResponse.status !== 'completed' && attempts < 10)

      const blob = await MockBackendService.downloadFile(uploadResponse.job_id)

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/pdf')
      expect(blob.size).toBeGreaterThan(0)
    })

    it('should throw error for incomplete jobs', async () => {
      const mockFile = new File(['test'], 'test.pdf')
      const uploadResponse = await MockBackendService.uploadAndProcess(mockFile)

      await expect(
        MockBackendService.downloadFile(uploadResponse.job_id)
      ).rejects.toThrow('File not ready for download')
    })
  })

  describe('getSystemCapabilities', () => {
    it('should return system capabilities', async () => {
      const capabilities = await MockBackendService.getSystemCapabilities()

      expect(capabilities).toMatchObject({
        supported_operations: expect.arrayContaining(['merge', 'split', 'compress']),
        supported_input_formats: expect.arrayContaining(['pdf', 'docx']),
        supported_output_formats: expect.arrayContaining(['pdf', 'jpg', 'png']),
        max_file_size_mb: 100,
        max_concurrent_jobs: 10,
        performance_targets: {
          processing_time_seconds: 6,
          adobe_comparison: '45+ seconds',
          speed_advantage: '10x faster'
        },
        engines: {
          primary: 'MuPDF (Mock)',
          fallback: 'PDFium (Mock)',
          enterprise_compliance: true
        },
        features: {
          real_time_progress: true,
          batch_processing: true,
          websocket_updates: true,
          enterprise_compliance: true,
          ai_features: false
        }
      })
    })
  })

  describe('simulateWebSocket', () => {
    it('should call onUpdate when job updates are received', async () => {
      const mockFile = new File(['test'], 'test.pdf')
      const response = await MockBackendService.uploadAndProcess(mockFile)

      return new Promise((resolve) => {
        const cleanup = MockBackendService.simulateWebSocket(
          response.job_id,
          (data) => {
            expect(data).toMatchObject({
              job_id: response.job_id,
              status: expect.stringMatching(/^(processing|completed)$/),
              progress: expect.any(Number)
            })

            cleanup()
            resolve(undefined)
          }
        )
      })
    })
  })

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const health = await MockBackendService.healthCheck()

      expect(health).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(Number),
        service: 'PDF SaaS Platform API (Mock)',
        version: '1.0.0-mock',
        message: expect.stringContaining('Mock service operating at peak performance')
      })
    })
  })

  describe('utility methods', () => {
    it('should clear all jobs', async () => {
      // Create a few jobs
      const mockFile1 = new File(['test1'], 'test1.pdf')
      const mockFile2 = new File(['test2'], 'test2.pdf')

      await MockBackendService.uploadAndProcess(mockFile1)
      await MockBackendService.uploadAndProcess(mockFile2)

      // Verify we have some jobs
      expect(MockBackendService.getAllJobs().length).toBeGreaterThan(0)

      // Clear all jobs
      MockBackendService.clearAllJobs()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify all jobs are cleared
      expect(MockBackendService.getAllJobs()).toHaveLength(0)
    })

    it('should get all jobs', async () => {
      // Ensure clean state
      MockBackendService.clearAllJobs()

      const mockFile1 = new File(['test1'], 'test1.pdf')
      const mockFile2 = new File(['test2'], 'test2.pdf')

      await MockBackendService.uploadAndProcess(mockFile1)
      await MockBackendService.uploadAndProcess(mockFile2)

      const allJobs = MockBackendService.getAllJobs()

      expect(allJobs).toHaveLength(2)
      expect(allJobs[0]).toMatchObject({
        id: expect.any(String),
        filename: 'test1.pdf'
      })
      expect(allJobs[1]).toMatchObject({
        id: expect.any(String),
        filename: 'test2.pdf'
      })
    })
  })
})