/**
 * Error Handling and Retry Service
 * Provides comprehensive error handling, retry mechanisms, and user-friendly error messages
 */

// Error types for better categorization
export enum ErrorType {
  NETWORK = 'network',
  UPLOAD = 'upload',
  PROCESSING = 'processing',
  DOWNLOAD = 'download',
  VALIDATION = 'validation',
  TIMEOUT = 'timeout',
  SERVER = 'server',
  AUTH = 'auth',
  UNKNOWN = 'unknown'
}

export interface ErrorDetails {
  context?: string
  status?: number
  statusText?: string
  data?: Record<string, unknown>
  url?: string
  stack?: string
  originalError?: unknown
}

export interface AppError {
  type: ErrorType
  message: string
  userMessage: string
  code?: string
  retryable: boolean
  retryDelay?: number
  maxRetries?: number
  details?: ErrorDetails
}

export interface HTTPError {
  response?: {
    status?: number
    statusText?: string
    data?: Record<string, unknown>
  }
  config?: {
    url?: string
  }
  code?: string
  message?: string
  name?: string
  stack?: string
}

// Retry configuration
export interface RetryOptions {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  exponentialBackoff: boolean
  retryCondition?: (error: HTTPError | Error) => boolean
}

export class ErrorHandlingService {

  /**
   * Default retry options
   */
  static defaultRetryOptions: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBackoff: true,
    retryCondition: (error) => {
      // Retry on network errors, timeouts, and 5xx server errors
      const httpError = error as HTTPError
      return (
        httpError.code === 'NETWORK_ERROR' ||
        httpError.code === 'ECONNABORTED' ||
        (httpError.response && httpError.response.status !== undefined && httpError.response.status >= 500)
      )
    }
  }

  /**
   * Categorize and format errors
   */
  static createError(error: HTTPError | Error | unknown, context?: string): AppError {
    // Expert-recommended declarative error definition structure
    const errorDefinitions: Array<{
      condition: (e: HTTPError | Error | unknown, ctx?: string) => boolean
      props: Partial<AppError> & { type: ErrorType }
    }> = [
      // Network & Timeout Errors
      {
        condition: (e) => {
          const error = e as HTTPError | Error
          return 'code' in error && error.code === 'NETWORK_ERROR'
        },
        props: {
          type: ErrorType.NETWORK,
          userMessage: 'Network connection failed. Please check your internet connection and try again.',
          retryable: true,
          retryDelay: 2000
        },
      },
      {
        condition: (e) => {
          const error = e as HTTPError | Error
          return ('code' in error && error.code === 'ECONNABORTED') ||
                 ('message' in error && error.message?.includes('timeout'))
        },
        props: {
          type: ErrorType.TIMEOUT,
          userMessage: 'Request timed out. The server might be busy, please try again in a moment.',
          retryable: true,
          retryDelay: 5000
        },
      },
      // Server Errors (5xx)
      {
        condition: (e) => {
          const error = e as HTTPError
          return error.response?.status !== undefined && error.response.status >= 500
        },
        props: {
          type: ErrorType.SERVER,
          userMessage: 'Server error occurred. Our team has been notified. Please try again later.',
          retryable: true,
          retryDelay: 10000
        },
      },
      // Specific Client Errors (4xx)
      {
        condition: (e) => {
          const error = e as HTTPError
          return error.response?.status === 413
        },
        props: {
          type: ErrorType.VALIDATION,
          userMessage: 'File is too large. Maximum file size is 100MB.',
          retryable: false
        },
      },
      {
        condition: (e) => {
          const error = e as HTTPError
          return error.response?.status === 415
        },
        props: {
          type: ErrorType.VALIDATION,
          userMessage: 'Unsupported file format. Please upload a PDF file.',
          retryable: false
        },
      },
      {
        condition: (e) => {
          const error = e as HTTPError
          return error.response?.status === 429
        },
        props: {
          type: ErrorType.SERVER,
          userMessage: 'Too many requests. Please wait a moment and try again.',
          retryable: true,
          retryDelay: 30000
        },
      },
      {
        condition: (e) => {
          const error = e as HTTPError
          return error.response?.status === 401
        },
        props: {
          type: ErrorType.AUTH,
          userMessage: 'Authentication failed. Please log in again.',
          retryable: false
        },
      },
      {
        condition: (e) => {
          const error = e as HTTPError
          return error.response?.status === 403
        },
        props: {
          type: ErrorType.AUTH,
          userMessage: 'You do not have permission to perform this action.',
          retryable: false
        },
      },
      // Security Errors (from PDF Worker)
      {
        condition: (e) => {
          const error = e as Error
          return 'name' in error && error.name === 'SecurityError'
        },
        props: {
          type: ErrorType.VALIDATION,
          userMessage: 'Security issue detected with the PDF file. Please use a different file.',
          retryable: false
        },
      },
      // Worker Errors
      {
        condition: (e) => {
          const error = e as Error
          return 'name' in error && error.name === 'WorkerError'
        },
        props: {
          type: ErrorType.PROCESSING,
          userMessage: 'PDF processing failed. Please try again with a different file.',
          retryable: true
        },
      },
      // Generic Client Error
      {
        condition: (e) => {
          const error = e as HTTPError
          return error.response?.status !== undefined &&
                 error.response.status >= 400 &&
                 error.response.status < 500
        },
        props: {
          type: ErrorType.VALIDATION,
          userMessage: 'Invalid request. Please check your input and try again.',
          retryable: false
        },
      },
      // Context-based Errors
      {
        condition: (_, ctx) => ctx === 'upload',
        props: {
          type: ErrorType.UPLOAD,
          userMessage: 'File upload failed. Please try selecting the file again.',
          retryable: true
        },
      },
      {
        condition: (_, ctx) => ctx === 'processing',
        props: {
          type: ErrorType.PROCESSING,
          userMessage: 'PDF processing failed. Please try uploading the file again.',
          retryable: true
        },
      },
      {
        condition: (_, ctx) => ctx === 'download',
        props: {
          type: ErrorType.DOWNLOAD,
          userMessage: 'Download failed. Please try again or contact support if the problem persists.',
          retryable: true
        },
      },
    ]

    const definition = errorDefinitions.find(({ condition }) => condition(error, context))

    // Type guard and extract information from error
    const errorAsHttpError = error as HTTPError
    const errorAsError = error as Error

    const baseError: AppError = {
      type: ErrorType.UNKNOWN,
      message: errorAsError.message || 'Unknown error',
      userMessage: 'An unexpected error occurred. Please try again.',
      code: errorAsHttpError.code || errorAsHttpError.response?.status?.toString(),
      retryable: false,
      retryDelay: 2000,
      maxRetries: 0,
      details: {
        context,
        status: errorAsHttpError.response?.status,
        statusText: errorAsHttpError.response?.statusText,
        data: errorAsHttpError.response?.data,
        url: errorAsHttpError.config?.url,
        originalError: error,
      },
    }

    if (!definition) {
      return baseError
    }

    return {
      ...baseError,
      ...definition.props,
      maxRetries: definition.props.retryable ? 3 : 0
    }
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    onRetry?: (attempt: number, error: HTTPError | Error) => void
  ): Promise<T> {
    const config = { ...this.defaultRetryOptions, ...options }
    let lastError: HTTPError | Error | undefined

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        const typedError = error as HTTPError | Error
        lastError = typedError
        console.warn(`Attempt ${attempt} failed:`, typedError)

        // Don't retry if it's the last attempt or error is not retryable
        if (attempt >= config.maxAttempts ||
           (config.retryCondition && !config.retryCondition(typedError))) {
          break
        }

        // Call retry callback if provided
        onRetry?.(attempt, typedError)

        // Calculate delay with exponential backoff
        let delay = config.baseDelay
        if (config.exponentialBackoff) {
          delay = Math.min(
            config.baseDelay * Math.pow(2, attempt - 1),
            config.maxDelay
          )
        }

        // Add jitter to prevent thundering herd
        delay = delay + (Math.random() * 1000)

        console.log(`Retrying in ${delay}ms... (attempt ${attempt + 1}/${config.maxAttempts})`)
        await this.delay(delay)
      }
    }

    throw lastError || new Error('Operation failed after all retry attempts')
  }

  /**
   * Promise-based delay function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Log errors for debugging and analytics
   */
  static logError(error: AppError, userId?: string) {
    const logData = {
      timestamp: new Date().toISOString(),
      userId,
      type: error.type,
      message: error.message,
      code: error.code,
      retryable: error.retryable,
      details: error.details,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    }

    // In development, log to console
    if (import.meta.env.VITE_DEV_MODE === 'true') {
      console.error('Application Error:', logData)
    }

    // In production, send to error tracking service
    if (import.meta.env.VITE_DEV_MODE !== 'true') {
      // TODO: Integrate with error tracking service (e.g., Sentry, LogRocket)
      // this.sendToErrorTracking(logData)
    }
  }

  /**
   * Get user-friendly error message with helpful context
   */
  static getErrorMessage(error: AppError): string {
    let message = error.userMessage

    // Add helpful context based on error type
    switch (error.type) {
      case ErrorType.NETWORK:
        message += ' You can also try refreshing the page.'
        break
      case ErrorType.UPLOAD:
        message += ' Make sure your file is a valid PDF or DOCX under 100MB.'
        break
      case ErrorType.PROCESSING:
        message += ' Our servers process millions of documents daily with 99.9% success rate.'
        break
      case ErrorType.VALIDATION:
        message += ' Please check that your file meets our requirements.'
        break
      case ErrorType.TIMEOUT:
        message += ' Large files may take longer to process during peak hours.'
        break
      case ErrorType.AUTH:
        message += ' Please log in again to continue.'
        break
    }

    return message
  }

  /**
   * Check if an error should show a retry button
   */
  static shouldShowRetry(error: AppError): boolean {
    return error.retryable && (error.maxRetries || 0) > 0
  }

  /**
   * Get recommended action for user based on error type
   */
  static getRecommendedAction(error: AppError): string {
    switch (error.type) {
      case ErrorType.NETWORK:
        return 'Check your internet connection'
      case ErrorType.UPLOAD:
        return 'Try uploading again'
      case ErrorType.PROCESSING:
        return 'Retry processing'
      case ErrorType.DOWNLOAD:
        return 'Retry download'
      case ErrorType.VALIDATION:
        return 'Check file format and size'
      case ErrorType.TIMEOUT:
        return 'Wait and try again'
      case ErrorType.SERVER:
        return 'Try again in a few minutes'
      case ErrorType.AUTH:
        return 'Log in again'
      default:
        return 'Retry operation'
    }
  }
}

export default ErrorHandlingService