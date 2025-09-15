import React from 'react'
import { ProcessingProgress } from '../../services/pdfProcessor'

interface ProgressIndicatorProps {
  progress: ProcessingProgress
  onCancel?: () => void
  showCancel?: boolean
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  onCancel,
  showCancel = true
}) => {
  const getStageColor = (stage: ProcessingProgress['stage']) => {
    switch (stage) {
      case 'validation':
        return 'bg-blue-500'
      case 'loading':
        return 'bg-yellow-500'
      case 'processing':
        return 'bg-blue-500'
      case 'saving':
        return 'bg-green-500'
      case 'complete':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStageIcon = (stage: ProcessingProgress['stage']) => {
    switch (stage) {
      case 'validation':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'loading':
        return (
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'processing':
        return (
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'saving':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        )
      case 'complete':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      default:
        return null
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${getStageColor(progress.stage)} text-white`}>
            {getStageIcon(progress.stage)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white capitalize">
              {progress.stage === 'complete' ? 'Complete' : progress.stage}
            </h3>
            <p className="text-sm text-gray-400">
              {progress.stage === 'complete' ? 'Processing completed successfully' : 'Processing...'}
            </p>
          </div>
        </div>

        {showCancel && onCancel && progress.stage !== 'complete' && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-300">{progress.message}</span>
          <span className="text-gray-400">{progress.percentage}%</span>
        </div>

        <div className="w-full bg-gray-800 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${getStageColor(progress.stage)}`}
            style={{ width: `${Math.max(0, Math.min(100, progress.percentage))}%` }}
          />
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {progress.currentFile && (
          <div>
            <span className="text-gray-400">Current File:</span>
            <p className="text-white font-medium truncate" title={progress.currentFile}>
              {progress.currentFile}
            </p>
          </div>
        )}

        {progress.filesProcessed !== undefined && progress.totalFiles !== undefined && (
          <div>
            <span className="text-gray-400">Files:</span>
            <p className="text-white font-medium">
              {progress.filesProcessed} / {progress.totalFiles}
            </p>
          </div>
        )}

        {progress.bytesProcessed !== undefined && progress.totalBytes !== undefined && (
          <div>
            <span className="text-gray-400">Data Processed:</span>
            <p className="text-white font-medium">
              {formatBytes(progress.bytesProcessed)} / {formatBytes(progress.totalBytes)}
            </p>
          </div>
        )}

        <div>
          <span className="text-gray-400">Stage:</span>
          <p className="text-white font-medium capitalize">{progress.stage}</p>
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="flex items-center space-x-2 pt-2">
        {['validation', 'loading', 'processing', 'saving', 'complete'].map((stage, index) => {
          const isActive = stage === progress.stage
          const isCompleted = ['validation', 'loading', 'processing', 'saving', 'complete'].indexOf(progress.stage) > index

          return (
            <React.Fragment key={stage}>
              <div
                className={`w-3 h-3 rounded-full transition-colors ${
                  isCompleted || isActive
                    ? getStageColor(progress.stage).replace('bg-', 'bg-')
                    : 'bg-gray-600'
                } ${isActive ? 'ring-2 ring-white ring-opacity-50' : ''}`}
              />
              {index < 4 && (
                <div
                  className={`h-1 w-8 ${
                    isCompleted ? getStageColor(progress.stage) : 'bg-gray-600'
                  }`}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}