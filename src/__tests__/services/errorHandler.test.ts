/**
 * Error Handler Service Tests
 * Tests for error categorization, retry logic, and user message generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ErrorHandlingService, ErrorType } from '../../services/errorHandler'

describe('ErrorHandlingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createError', () => {
    it('should categorize network errors correctly', () => {
      const networkError = { code: 'NETWORK_ERROR', message: 'Network failed' }
      const error = ErrorHandlingService.createError(networkError)

      expect(error.type).toBe(ErrorType.NETWORK)
      expect(error.retryable).toBe(true)
      expect(error.userMessage).toContain('Network connection failed')
    })

    it('should categorize timeout errors correctly', () => {
      const timeoutError = { code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' }
      const error = ErrorHandlingService.createError(timeoutError)

      expect(error.type).toBe(ErrorType.TIMEOUT)
      expect(error.retryable).toBe(true)
      expect(error.userMessage).toContain('Request timed out')
    })

    it('should categorize file size errors correctly', () => {
      const fileSizeError = { response: { status: 413, data: { message: 'File too large' } } }
      const error = ErrorHandlingService.createError(fileSizeError)

      expect(error.type).toBe(ErrorType.VALIDATION)
      expect(error.retryable).toBe(false)
      expect(error.userMessage).toContain('File is too large')
    })

    it('should categorize server errors correctly', () => {
      const serverError = { response: { status: 500, statusText: 'Internal Server Error' } }
      const error = ErrorHandlingService.createError(serverError)

      expect(error.type).toBe(ErrorType.SERVER)
      expect(error.retryable).toBe(true)
      expect(error.userMessage).toContain('Server error occurred')
    })

    it('should handle context-specific errors', () => {
      const uploadError = new Error('Upload failed')
      const error = ErrorHandlingService.createError(uploadError, 'upload')

      expect(error.type).toBe(ErrorType.UPLOAD)
      expect(error.retryable).toBe(true)
    })
  })

  describe('retry', () => {
    it('should retry failed operations up to maxAttempts', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce('Success')

      const result = await ErrorHandlingService.retry(
        mockOperation,
        { maxAttempts: 3, baseDelay: 10 }
      )

      expect(result).toBe('Success')
      expect(mockOperation).toHaveBeenCalledTimes(3)
    })

    it('should fail after maxAttempts exceeded', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'))

      await expect(
        ErrorHandlingService.retry(mockOperation, { maxAttempts: 2, baseDelay: 10 })
      ).rejects.toThrow('Always fails')

      expect(mockOperation).toHaveBeenCalledTimes(2)
    })

    it('should call onRetry callback for failed attempts', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('Success')

      const onRetry = vi.fn()

      await ErrorHandlingService.retry(
        mockOperation,
        { maxAttempts: 3, baseDelay: 10 },
        onRetry
      )

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
    })

    it('should not retry for non-retryable errors', async () => {
      const mockOperation = vi.fn().mockRejectedValue({
        response: { status: 400 }
      })

      await expect(
        ErrorHandlingService.retry(
          mockOperation,
          {
            maxAttempts: 3,
            baseDelay: 10,
            retryCondition: (error) => error.response?.status >= 500
          }
        )
      ).rejects.toThrow()

      expect(mockOperation).toHaveBeenCalledTimes(1)
    })
  })

  describe('getErrorMessage', () => {
    it('should provide user-friendly messages with context', () => {
      const networkError = ErrorHandlingService.createError({ code: 'NETWORK_ERROR' })
      const message = ErrorHandlingService.getErrorMessage(networkError)

      expect(message).toContain('Network connection failed')
      expect(message).toContain('refreshing the page')
    })

    it('should provide specific guidance for different error types', () => {
      const uploadError = ErrorHandlingService.createError(new Error('Upload failed'), 'upload')
      const message = ErrorHandlingService.getErrorMessage(uploadError)

      expect(message).toContain('valid PDF or DOCX under 100MB')
    })
  })

  describe('shouldShowRetry', () => {
    it('should return true for retryable errors', () => {
      const retryableError = ErrorHandlingService.createError({ code: 'NETWORK_ERROR' })
      expect(ErrorHandlingService.shouldShowRetry(retryableError)).toBe(true)
    })

    it('should return false for non-retryable errors', () => {
      const nonRetryableError = ErrorHandlingService.createError(
        { response: { status: 413 } }
      )
      expect(ErrorHandlingService.shouldShowRetry(nonRetryableError)).toBe(false)
    })
  })

  describe('getRecommendedAction', () => {
    it('should provide appropriate actions for different error types', () => {
      const networkError = ErrorHandlingService.createError({ code: 'NETWORK_ERROR' })
      expect(ErrorHandlingService.getRecommendedAction(networkError)).toBe('Check your internet connection')

      const validationError = ErrorHandlingService.createError({ response: { status: 413 } })
      expect(ErrorHandlingService.getRecommendedAction(validationError)).toBe('Check file format and size')
    })
  })
})