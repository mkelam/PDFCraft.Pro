import React, { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { cn } from '../../../lib/utils'
import { validatePDF, formatFileSize } from '../../../lib/utils'
import { useProcessingStore } from '../../../stores/processingStore'
import { SpeedVisualization } from '../../ui/SpeedVisualization'
import { ErrorDisplay } from '../../ui/ErrorDisplay'
import { apiUtils } from '../../../services/api'
import { ErrorHandlingService, AppError } from '../../../services/errorHandler'

interface DocumentProcessorProps {
  className?: string
  onComplete?: (result: ProcessingResult) => void
}

interface ProcessingResult {
  success: boolean
  filename: string
  processingTime?: number
  error?: string
}

export const DocumentProcessor: React.FC<DocumentProcessorProps> = ({
  className,
  onComplete
}) => {
  const [error, setError] = useState<AppError | null>(null)
  const [completedJob, setCompletedJob] = useState<any | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const { addJob, isProcessing, jobs } = useProcessingStore()

  // Monitor for completed jobs
  useEffect(() => {
    const completedJobItem = jobs.find(job => job.status === 'completed')
    if (completedJobItem && completedJobItem.processingTimeMs) {
      setCompletedJob(completedJobItem)

      // Call completion callback if provided
      onComplete?.({
        success: true,
        filename: completedJobItem.filename,
        processingTime: completedJobItem.processingTimeMs
      })
    }
  }, [jobs, onComplete])

  const handleFileProcess = useCallback(async (file: File) => {
    setError(null)
    setRetryCount(0)

    // Validate file
    const validation = validatePDF(file)
    if (!validation.valid) {
      const validationError = ErrorHandlingService.createError(
        new Error(validation.error || 'Invalid file'),
        'validation'
      )
      setError(validationError)
      ErrorHandlingService.logError(validationError)
      return
    }

    // Use retry mechanism for processing
    try {
      await ErrorHandlingService.retry(
        async () => {
          const jobId = await addJob(file)
          console.log('Processing started:', jobId)
          return jobId
        },
        {
          maxAttempts: 3,
          baseDelay: 2000,
          exponentialBackoff: true
        },
        (attempt, error) => {
          setRetryCount(attempt)
          console.log(`Processing attempt ${attempt} failed, retrying...`, error)
        }
      )
    } catch (err) {
      const processError = ErrorHandlingService.createError(err, 'processing')
      setError(processError)
      ErrorHandlingService.logError(processError)

      onComplete?.({
        success: false,
        filename: file.name,
        error: processError.message
      })
    }
  }, [addJob, onComplete])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleFileProcess(acceptedFiles[0])
    }
  }, [handleFileProcess])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    maxSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE_MB || '100') * 1024 * 1024
  })

  const activeJob = jobs.find(job => job.status === 'processing' || job.status === 'queued')

  return (
    <div className={cn('document-processor', className)}>
      {/* File Upload Area */}
      {!isProcessing && (
        <div
          {...getRootProps()}
          className={cn(
            'drop-zone cursor-pointer transition-all duration-200',
            isDragActive && 'active',
            'hover:border-primary-400 hover:bg-primary-50/50'
          )}
        >
          <input {...getInputProps()} />
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            <h3 className="text-lg font-semibold mb-2">
              {isDragActive ? 'Drop your file here' : 'Upload PDF'}
            </h3>

            <p className="text-sm text-slate-600 mb-4">
              Drag and drop your PDF here, or click to browse
            </p>

            <button
              type="button"
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Select File
            </button>

            <p className="text-xs text-slate-500 mt-3">
              Maximum file size: {formatFileSize(parseInt(import.meta.env.VITE_MAX_FILE_SIZE_MB || '100') * 1024 * 1024)}
            </p>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && activeJob && (
        <div
          className="processing-indicator p-6 text-center space-y-6"
          data-testid="processing-indicator"
        >
          {/* File Info */}
          <div className="space-y-2">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center animate-pulse">
              <div className="h-8 w-8 rounded-full border-4 border-white border-t-transparent animate-spin" />
            </div>

            <h3 className="text-lg font-semibold">Processing Document</h3>
            <p className="text-sm text-slate-600">{activeJob.filename}</p>
            <p className="text-xs text-slate-500">
              {formatFileSize(activeJob.file_size_bytes || 0)}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-violet-600 h-3 rounded-full transition-all duration-300 relative overflow-hidden"
                style={{ width: `${activeJob.progress}%` }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite]" />
              </div>
            </div>

            <div className="flex justify-between text-sm text-slate-600">
              <span>{activeJob.progress}% complete</span>
              {activeJob.estimatedCompletion && (
                <span>
                  ETA: {Math.round((activeJob.estimatedCompletion.getTime() - Date.now()) / 1000)}s
                </span>
              )}
            </div>
          </div>

          {/* Speed Visualization */}
          <SpeedVisualization
            isProcessing={true}
            showComparison={true}
            className="bg-white rounded-lg p-4"
          />

          {/* Real-time Performance Stats */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <div className="font-semibold text-blue-700">Target Time</div>
              <div className="text-blue-600">&lt; 6 seconds</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <div className="font-semibold text-green-700">Speed Advantage</div>
              <div className="text-green-600">10x faster than Adobe</div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={() => {
            setError(null)
            const files = (document.querySelector('input[type="file"]') as HTMLInputElement)?.files
            if (files && files.length > 0) {
              handleFileProcess(files[0])
            }
          }}
          onDismiss={() => setError(null)}
          showDetails={import.meta.env.VITE_DEV_MODE === 'true'}
        />
      )}

      {/* Retry indicator */}
      {retryCount > 0 && !error && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center text-blue-800">
            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">
              Retry attempt {retryCount}/3... Our servers process millions of PDFs daily with 99.9% reliability.
            </span>
          </div>
        </div>
      )}

      {/* Completion Display */}
      {completedJob && !isProcessing && (
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg space-y-4">
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-lg font-semibold text-green-800 mb-2">Processing Complete!</h3>
            <p className="text-sm text-green-700">{completedJob.filename}</p>
          </div>

          {/* Speed Visualization for completed job */}
          <SpeedVisualization
            processingTimeMs={completedJob.processingTimeMs}
            showComparison={true}
            className="bg-white rounded-lg p-4"
          />

          {/* Performance Summary */}
          <div className="bg-white rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-slate-700">Performance Summary</h4>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Processing Time:</span>
                <div className="font-semibold text-green-700">
                  {apiUtils.formatProcessingTime(completedJob.processingTimeMs)}
                </div>
              </div>

              <div>
                <span className="text-slate-600">Speed Advantage:</span>
                <div className="font-semibold text-green-700">
                  {apiUtils.calculateSpeedAdvantage(completedJob.processingTimeMs)}
                </div>
              </div>

              <div>
                <span className="text-slate-600">File Size:</span>
                <div className="font-semibold">
                  {formatFileSize(completedJob.file_size_bytes || 0)}
                </div>
              </div>

              <div>
                <span className="text-slate-600">Status:</span>
                <div className="font-semibold text-green-700">
                  {apiUtils.getPerformanceRating(completedJob.processingTimeMs).emoji} Excellent
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              onClick={async () => {
                try {
                  const { PDFProcessingAPI } = await import('../../../services/api')
                  const blob = await PDFProcessingAPI.downloadFile(completedJob.id)

                  // Create download link
                  const url = window.URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `processed_${completedJob.filename}`
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                  window.URL.revokeObjectURL(url)
                } catch (err) {
                  console.error('Download failed:', err)
                  const downloadError = ErrorHandlingService.createError(err, 'download')
                  setError(downloadError)
                  ErrorHandlingService.logError(downloadError)
                }
              }}
            >
              Download Result
            </button>

            <button
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              onClick={() => {
                setCompletedJob(null)
                setError(null)
              }}
            >
              Process Another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}