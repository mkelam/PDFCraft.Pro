import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface ProcessingJob {
  id: string
  filename: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  startTime: Date
  estimatedCompletion?: Date
  error?: string
  processingTimeMs?: number
  file_size_bytes?: number
}

interface ProcessingState {
  // State
  jobs: ProcessingJob[]
  activeJobId: string | null
  isProcessing: boolean
  totalProgress: number
  performanceMetrics: {
    averageProcessingTime: number
    successRate: number
    totalProcessed: number
  }

  // Actions
  addJob: (file: File) => Promise<string>
  updateJobProgress: (jobId: string, progress: number) => void
  completeJob: (jobId: string, processingTimeMs: number) => void
  failJob: (jobId: string, error: string) => void
  clearCompletedJobs: () => void
  retryJob: (jobId: string) => Promise<void>
}

export const useProcessingStore = create<ProcessingState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      jobs: [],
      activeJobId: null,
      isProcessing: false,
      totalProgress: 0,
      performanceMetrics: {
        averageProcessingTime: 0,
        successRate: 0,
        totalProcessed: 0
      },

      // Add new processing job with API integration
      addJob: async (file: File) => {
        try {
          // Import API service
          const { PDFProcessingAPI, ProcessingWebSocket } = await import('../services/api')

          // Upload file and start processing
          const response = await PDFProcessingAPI.uploadAndProcess(file, {
            operation: 'optimize',
            quality: 'medium'
          })

          const jobId = response.job_id

          // Add job to store
          set((state) => {
            state.jobs.push({
              id: jobId,
              filename: file.name,
              status: 'queued',
              progress: 0,
              startTime: new Date(),
              estimatedCompletion: new Date(Date.now() + response.estimated_time_seconds * 1000)
            })

            if (!state.activeJobId) {
              state.activeJobId = jobId
              state.isProcessing = true
            }
          })

          // Set up WebSocket for real-time updates
          new ProcessingWebSocket(
            jobId,
            (data) => {
              get().updateJobProgress(data.job_id, data.progress)

              // Update job status if provided
              if (data.status === 'completed') {
                get().completeJob(data.job_id, data.processing_time_ms || 0)
              } else if (data.status === 'failed') {
                get().failJob(data.job_id, 'Processing failed')
              }
            },
            (error) => {
              console.error('WebSocket error for job:', jobId, error)
            }
          )

          console.log('✅ Job created with backend integration:', jobId, file.name)

          return jobId

        } catch (error) {
          console.error('❌ Failed to create processing job:', error)
          throw error
        }
      },

      // Update job progress (called by WebSocket updates)
      updateJobProgress: (jobId: string, progress: number) => {
        set((state) => {
          const job = state.jobs.find(j => j.id === jobId)
          if (job) {
            job.progress = progress
            job.status = progress === 100 ? 'completed' : 'processing'

            // Update estimated completion
            if (progress > 0 && job.status === 'processing') {
              const elapsed = Date.now() - job.startTime.getTime()
              const estimatedTotal = (elapsed / progress) * 100
              job.estimatedCompletion = new Date(job.startTime.getTime() + estimatedTotal)
            }
          }

          // Calculate total progress
          const totalJobs = state.jobs.length
          if (totalJobs > 0) {
            const totalProgress = state.jobs.reduce((sum, job) => sum + job.progress, 0)
            state.totalProgress = totalProgress / totalJobs
          }
        })
      },

      // Complete job successfully
      completeJob: (jobId: string, processingTimeMs: number) => {
        set((state) => {
          const job = state.jobs.find(j => j.id === jobId)
          if (job) {
            job.status = 'completed'
            job.progress = 100
            job.processingTimeMs = processingTimeMs
          }

          // Update performance metrics
          const completedJobs = state.jobs.filter(j => j.status === 'completed')
          const failedJobs = state.jobs.filter(j => j.status === 'failed')

          state.performanceMetrics.totalProcessed = completedJobs.length + failedJobs.length
          state.performanceMetrics.successRate = completedJobs.length / (completedJobs.length + failedJobs.length) * 100

          const processingTimes = completedJobs
            .filter(j => j.processingTimeMs)
            .map(j => j.processingTimeMs!)

          if (processingTimes.length > 0) {
            state.performanceMetrics.averageProcessingTime =
              processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
          }

          // Move to next job or stop processing
          if (state.activeJobId === jobId) {
            const nextJob = state.jobs.find(j => j.status === 'queued')
            state.activeJobId = nextJob?.id || null
            state.isProcessing = !!nextJob
          }
        })
      },

      // Fail job with error
      failJob: (jobId: string, error: string) => {
        set((state) => {
          const job = state.jobs.find(j => j.id === jobId)
          if (job) {
            job.status = 'failed'
            job.error = error
          }

          // Move to next job
          if (state.activeJobId === jobId) {
            const nextJob = state.jobs.find(j => j.status === 'queued')
            state.activeJobId = nextJob?.id || null
            state.isProcessing = !!nextJob
          }
        })
      },

      // Clear completed jobs
      clearCompletedJobs: () => {
        set((state) => {
          state.jobs = state.jobs.filter(job =>
            job.status !== 'completed' && job.status !== 'failed'
          )
        })
      },

      // Retry failed job
      retryJob: async (jobId: string) => {
        set((state) => {
          const job = state.jobs.find(j => j.id === jobId)
          if (job) {
            job.status = 'queued'
            job.progress = 0
            job.error = undefined
            job.startTime = new Date()
          }
        })

        // TODO: Re-trigger processing
        console.log('Retrying job:', jobId)
      }
    })),
    { name: 'processing-store' }
  )
)