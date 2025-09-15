/**
 * API Service Layer
 * Handles communication with PDF SaaS Platform backend
 * Supports high-performance processing with real-time updates
 */

import axios, { AxiosResponse } from 'axios'
import { MockBackendService } from './mockBackend'

// Check if mock backend should be used
const USE_MOCK_BACKEND = import.meta.env.VITE_ENABLE_MOCK_BACKEND === 'true'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8080/ws'

// API Client with default configuration
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout for file uploads
  headers: {
    'Content-Type': 'multipart/form-data',
  },
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// Types for API responses
export interface ProcessingJobResponse {
  success: boolean
  job_id: string
  message: string
  estimated_time_seconds: number
  status_endpoint: string
}

export interface JobStatusResponse {
  job_id: string
  filename: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  processing_time_ms?: number
  estimated_remaining_seconds?: number
  created_at: number
  started_at?: number
  completed_at?: number
  file_size_bytes: number
  error?: string
  performance_note: string
  download_url?: string
}

export interface JobResultResponse {
  job_id: string
  result: {
    success: boolean
    pages_processed: number
    operation_performed: string
    engine_used: string
    size_reduction_bytes?: number
    warnings: string[]
    metadata: Record<string, any>
  }
  performance: {
    processing_time_ms: number
    target_time_ms: number
    performance_rating: 'excellent' | 'good' | 'needs_optimization'
    compared_to_adobe: string
  }
  download_url: string
}

export interface SystemCapabilitiesResponse {
  supported_operations: string[]
  supported_input_formats: string[]
  supported_output_formats: string[]
  max_file_size_mb: number
  max_concurrent_jobs: number
  performance_targets: {
    processing_time_seconds: number
    adobe_comparison: string
    speed_advantage: string
  }
  engines: {
    primary: string
    fallback: string
    enterprise_compliance: boolean
  }
  features: {
    real_time_progress: boolean
    batch_processing: boolean
    websocket_updates: boolean
    enterprise_compliance: boolean
    ai_features: boolean
  }
}

export interface HealthResponse {
  status: string
  timestamp: number
  service: string
  version: string
  message: string
}

export interface WebSocketMessage {
  job_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  message?: string
  error?: string
  result?: JobResultResponse
}

// API Service Class
export class PDFProcessingAPI {

  /**
   * Upload file and start processing
   */
  static async uploadAndProcess(
    file: File,
    options: {
      operation?: string
      quality?: string
      output_format?: string
      page_range?: string
      compression_level?: number
      require_enterprise_compliance?: boolean
      preserve_metadata?: boolean
      optimize_for_web?: boolean
      signal?: AbortSignal // Add AbortSignal for cancellation
    } = {}
  ): Promise<ProcessingJobResponse> {

    // Extract signal and other options
    const { signal, ...processingOptions } = options

    // Use mock backend if enabled
    if (USE_MOCK_BACKEND) {
      return MockBackendService.uploadAndProcess(file, processingOptions)
    }

    const formData = new FormData()
    formData.append('file', file)

    // Add processing options (excluding signal)
    Object.entries(processingOptions).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, String(value))
      }
    })

    const response: AxiosResponse<ProcessingJobResponse> = await apiClient.post(
      '/processing/upload',
      formData,
      {
        signal, // Pass AbortSignal to axios
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Progress tracking for uploads
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            // Emit upload progress event
            window.dispatchEvent(new CustomEvent('upload-progress', {
              detail: { progress, loaded: progressEvent.loaded, total: progressEvent.total }
            }))
          }
        }
      }
    )

    return response.data
  }

  /**
   * Get job status and progress
   */
  static async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    if (USE_MOCK_BACKEND) {
      return MockBackendService.getJobStatus(jobId)
    }

    const response: AxiosResponse<JobStatusResponse> = await apiClient.get(
      `/processing/status/${jobId}`
    )
    return response.data
  }

  /**
   * Get detailed job result
   */
  static async getJobResult(jobId: string): Promise<JobResultResponse> {
    if (USE_MOCK_BACKEND) {
      return MockBackendService.getJobResult(jobId)
    }

    const response: AxiosResponse<JobResultResponse> = await apiClient.get(
      `/processing/result/${jobId}`
    )
    return response.data
  }

  /**
   * Download processed file
   */
  static async downloadFile(jobId: string): Promise<Blob> {
    if (USE_MOCK_BACKEND) {
      return MockBackendService.downloadFile(jobId)
    }

    const response: AxiosResponse<Blob> = await apiClient.get(
      `/processing/download/${jobId}`,
      {
        responseType: 'blob'
      }
    )
    return response.data
  }

  /**
   * Get system capabilities
   */
  static async getSystemCapabilities(): Promise<SystemCapabilitiesResponse> {
    if (USE_MOCK_BACKEND) {
      return MockBackendService.getSystemCapabilities()
    }

    const response: AxiosResponse<SystemCapabilitiesResponse> = await apiClient.get(
      '/processing/capabilities'
    )
    return response.data
  }

  /**
   * Batch process multiple files
   */
  static async batchProcess(
    files: File[],
    options: {
      operation?: string
      quality?: string
    } = {}
  ): Promise<{ success: boolean; batch_id: string; jobs: Array<{ filename: string; job_id?: string; error?: string }> }> {
    const formData = new FormData()

    files.forEach((file) => {
      formData.append('files', file)
    })

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, String(value))
      }
    })

    const response = await apiClient.post('/processing/batch', formData)
    return response.data
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<HealthResponse> {
    const response: AxiosResponse<HealthResponse> = await apiClient.get('/api/health/')
    return response.data
  }
}

// WebSocket Service for Real-time Updates
export class ProcessingWebSocket {
  private ws: WebSocket | null = null
  private jobId: string
  private onUpdate: (data: WebSocketMessage) => void
  private onError: (error: Error | Event) => void
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5 // Increased from 3 to 5
  private isConnected = false
  private isManuallyDisconnected = false
  private reconnectTimeoutId: NodeJS.Timeout | null = null

  constructor(
    jobId: string,
    onUpdate: (data: WebSocketMessage) => void,
    onError: (error: Error | Event) => void = console.error
  ) {
    this.jobId = jobId
    this.onUpdate = onUpdate
    this.onError = onError

    // Use mock WebSocket if enabled
    if (USE_MOCK_BACKEND) {
      this.setupMockWebSocket()
    } else {
      this.connect()
    }
  }

  private setupMockWebSocket() {
    // Set up mock WebSocket connection using the mock backend service
    const cleanup = MockBackendService.simulateWebSocket(this.jobId, this.onUpdate)

    // Store cleanup function for later use
    this.disconnect = () => {
      cleanup()
      this.ws = null
    }

    console.log(`🔗 Mock WebSocket connected for job ${this.jobId}`)
  }

  private connect() {
    try {
      const wsUrl = `${WS_BASE_URL}/processing/${this.jobId}`
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log(`🔗 WebSocket connected for job ${this.jobId}`)
        this.isConnected = true
        this.reconnectAttempts = 0

        // Clear any pending reconnection timeouts
        if (this.reconnectTimeoutId) {
          clearTimeout(this.reconnectTimeoutId)
          this.reconnectTimeoutId = null
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data)
          this.onUpdate(data)

          // Close connection when job is complete
          if (data.status === 'completed' || data.status === 'failed') {
            this.isManuallyDisconnected = true
            this.disconnect()
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error)
          this.onError(error instanceof Error ? error : new Error('WebSocket parse error'))
        }
      }

      this.ws.onclose = (event) => {
        this.isConnected = false
        console.log(`📡 WebSocket disconnected for job ${this.jobId}. Code: ${event.code}, Reason: ${event.reason}`)

        // Only attempt reconnect if not manually disconnected and not a normal closure
        if (!this.isManuallyDisconnected && event.code !== 1000) {
          this.attemptReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error(`🔥 WebSocket error for job ${this.jobId}:`, error)
        this.isConnected = false
        this.onError(error instanceof Error ? error : new Error('WebSocket connection error'))
      }

    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.onError(error instanceof Error ? error : new Error('WebSocket initialization error'))
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max WebSocket reconnection attempts reached')
      return
    }

    this.reconnectAttempts++

    // Exponential backoff with jitter
    const baseDelay = 1000 // 1 second
    const maxDelay = 30000 // 30 seconds
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts - 1), maxDelay)

    // Add jitter (random factor between 0.5 and 1.5)
    const jitter = 0.5 + Math.random()
    const delayWithJitter = Math.floor(exponentialDelay * jitter)

    console.log(
      `🔄 Attempting to reconnect WebSocket in ${Math.round(delayWithJitter / 1000)}s ` +
      `(attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    )

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = null
      if (!this.isManuallyDisconnected) {
        this.connect()
      }
    }, delayWithJitter)
  }

  disconnect() {
    this.isManuallyDisconnected = true

    // Clear any pending reconnection timeouts
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect') // Normal closure
      this.ws = null
    }

    this.isConnected = false
  }

  // Add method to check connection status
  isWebSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN
  }

  // Add method to get connection info
  getConnectionInfo(): {
    connected: boolean
    reconnectAttempts: number
    maxReconnectAttempts: number
    jobId: string
  } {
    return {
      connected: this.isWebSocketConnected(),
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      jobId: this.jobId
    }
  }
}

// Utility functions for API integration
export const apiUtils = {
  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  /**
   * Format processing time for display
   */
  formatProcessingTime(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`
    const seconds = ms / 1000
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  },

  /**
   * Get performance rating based on processing time
   */
  getPerformanceRating(processingTimeMs: number): {
    rating: 'excellent' | 'good' | 'needs_optimization'
    color: string
    emoji: string
  } {
    if (processingTimeMs <= 6000) {
      return { rating: 'excellent', color: 'green', emoji: '🚀' }
    } else if (processingTimeMs <= 15000) {
      return { rating: 'good', color: 'yellow', emoji: '⚡' }
    } else {
      return { rating: 'needs_optimization', color: 'red', emoji: '🐌' }
    }
  },

  /**
   * Calculate speed advantage over Adobe
   */
  calculateSpeedAdvantage(processingTimeMs: number): string {
    const adobeTimeMs = 45000 // Adobe's average processing time
    const advantage = adobeTimeMs / processingTimeMs
    return `${advantage.toFixed(1)}x faster`
  }
}

export default PDFProcessingAPI