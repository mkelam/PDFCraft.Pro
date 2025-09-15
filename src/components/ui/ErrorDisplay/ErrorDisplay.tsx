/**
 * Error Display Component
 * Shows user-friendly error messages with retry options and helpful context
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../../lib/utils'
import { AppError, ErrorHandlingService } from '../../../services/errorHandler'

interface ErrorDisplayProps {
  error: AppError | string | null
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
  showDetails?: boolean
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  className,
  showDetails = false
}) => {
  if (!error) return null

  // Convert string errors to AppError objects
  const appError = typeof error === 'string'
    ? ErrorHandlingService.createError(new Error(error))
    : error

  const errorMessage = ErrorHandlingService.getErrorMessage(appError)
  const shouldShowRetry = ErrorHandlingService.shouldShowRetry(appError)
  const recommendedAction = ErrorHandlingService.getRecommendedAction(appError)

  const getErrorIcon = () => {
    switch (appError.type) {
      case 'network':
        return (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 3h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'validation':
        return (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'timeout':
        return (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 3h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
    }
  }

  const getErrorColor = () => {
    switch (appError.type) {
      case 'network':
      case 'timeout':
        return 'orange'
      case 'validation':
        return 'yellow'
      case 'server':
      case 'processing':
        return 'red'
      default:
        return 'red'
    }
  }

  const colorClass = getErrorColor()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'rounded-lg border p-4 shadow-sm',
          colorClass === 'red' && 'bg-red-50 border-red-200 text-red-800',
          colorClass === 'orange' && 'bg-orange-50 border-orange-200 text-orange-800',
          colorClass === 'yellow' && 'bg-yellow-50 border-yellow-200 text-yellow-800',
          className
        )}
      >
        <div className="flex items-start">
          <div className={cn(
            'flex-shrink-0',
            colorClass === 'red' && 'text-red-400',
            colorClass === 'orange' && 'text-orange-400',
            colorClass === 'yellow' && 'text-yellow-400'
          )}>
            {getErrorIcon()}
          </div>

          <div className="ml-3 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {appError.type === 'network' && 'Connection Error'}
                {appError.type === 'upload' && 'Upload Failed'}
                {appError.type === 'processing' && 'Processing Failed'}
                {appError.type === 'download' && 'Download Failed'}
                {appError.type === 'validation' && 'Invalid File'}
                {appError.type === 'timeout' && 'Request Timed Out'}
                {appError.type === 'server' && 'Server Error'}
                {appError.type === 'unknown' && 'Error Occurred'}
              </h3>

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className={cn(
                    'ml-2 flex-shrink-0 rounded-md p-1.5 hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2',
                    colorClass === 'red' && 'text-red-500 hover:bg-red-500 focus:ring-red-500',
                    colorClass === 'orange' && 'text-orange-500 hover:bg-orange-500 focus:ring-orange-500',
                    colorClass === 'yellow' && 'text-yellow-500 hover:bg-yellow-500 focus:ring-yellow-500'
                  )}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            <div className="mt-1 text-sm">
              <p>{errorMessage}</p>

              {showDetails && appError.details && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs opacity-75 hover:opacity-100">
                    Technical Details
                  </summary>
                  <pre className="mt-1 text-xs opacity-75 overflow-x-auto">
                    {JSON.stringify(appError.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>

            {(shouldShowRetry || onRetry) && (
              <div className="mt-4 flex items-center gap-3">
                {onRetry && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onRetry}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium shadow-sm transition-colors',
                      colorClass === 'red' && 'bg-red-600 text-white hover:bg-red-700',
                      colorClass === 'orange' && 'bg-orange-600 text-white hover:bg-orange-700',
                      colorClass === 'yellow' && 'bg-yellow-600 text-white hover:bg-yellow-700'
                    )}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {recommendedAction}
                  </motion.button>
                )}

                <div className="text-xs opacity-75">
                  {appError.retryDelay && appError.retryDelay > 5000 &&
                    `Recommended wait: ${Math.round(appError.retryDelay / 1000)}s`
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ErrorDisplay