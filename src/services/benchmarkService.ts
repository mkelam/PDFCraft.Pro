/**
 * Performance Benchmark Service
 * Frontend integration for performance benchmarks and comparisons
 */

import axios, { AxiosResponse } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

// Types
export interface BenchmarkResult {
  test_name: string
  our_time_ms: number
  adobe_time_ms: number
  speed_advantage: number
  file_size_mb: number
  page_count: number
}

export interface BenchmarkSummary {
  average_speed_advantage: number
  best_performance: number
  total_tests: number
  last_updated: string
  status: 'live_data' | 'demo_data' | 'no_data'
  breakdown?: {
    compression: { tests: number; avg_advantage: number }
    merge: { tests: number; avg_advantage: number }
    split: { tests: number; avg_advantage: number }
  }
}

export interface BenchmarkStatus {
  status: 'ready' | 'error'
  has_recent_data: boolean
  last_benchmark: string | null
  system_health: 'operational' | 'degraded'
  available_operations: string[]
  error?: string
}

// Benchmark API Client
const benchmarkClient = axios.create({
  baseURL: `${API_BASE_URL}/benchmark`,
  timeout: 30000,
})

// Add authentication token if available
benchmarkClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pdf_saas_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export class BenchmarkService {
  /**
   * Get performance benchmark summary
   */
  static async getBenchmarkSummary(): Promise<BenchmarkSummary> {
    const response: AxiosResponse<BenchmarkSummary> = await benchmarkClient.get('/summary')
    return response.data
  }

  /**
   * Get detailed performance comparison data
   */
  static async getPerformanceComparison(): Promise<BenchmarkResult[]> {
    const response: AxiosResponse<BenchmarkResult[]> = await benchmarkClient.get('/comparison')
    return response.data
  }

  /**
   * Get benchmark system status
   */
  static async getBenchmarkStatus(): Promise<BenchmarkStatus> {
    const response: AxiosResponse<BenchmarkStatus> = await benchmarkClient.get('/status')
    return response.data
  }

  /**
   * Run new benchmark (admin only)
   */
  static async runBenchmark(): Promise<{ message: string; status: string }> {
    const response: AxiosResponse<{ message: string; status: string }> =
      await benchmarkClient.post('/run')
    return response.data
  }

  /**
   * Get full benchmark results
   */
  static async getFullResults(): Promise<any> {
    const response: AxiosResponse<any> = await benchmarkClient.get('/results')
    return response.data
  }

  /**
   * Format time for display
   */
  static formatTime(timeMs: number): string {
    if (timeMs < 1000) {
      return `${timeMs}ms`
    } else if (timeMs < 60000) {
      return `${(timeMs / 1000).toFixed(1)}s`
    } else {
      const minutes = Math.floor(timeMs / 60000)
      const seconds = Math.floor((timeMs % 60000) / 1000)
      return `${minutes}m ${seconds}s`
    }
  }

  /**
   * Get speed advantage color for UI
   */
  static getSpeedAdvantageColor(advantage: number): string {
    if (advantage >= 15) return 'text-green-600'
    if (advantage >= 10) return 'text-blue-600'
    if (advantage >= 5) return 'text-yellow-600'
    return 'text-red-600'
  }

  /**
   * Get speed advantage badge style
   */
  static getSpeedAdvantageBadge(advantage: number): string {
    if (advantage >= 15) return 'bg-green-100 text-green-800 border-green-200'
    if (advantage >= 10) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (advantage >= 5) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  /**
   * Calculate estimated savings per document
   */
  static calculateTimeSavings(adobeTimeMs: number, ourTimeMs: number): {
    saved_ms: number
    saved_formatted: string
    percentage_saved: number
  } {
    const savedMs = adobeTimeMs - ourTimeMs
    const percentageSaved = Math.round((savedMs / adobeTimeMs) * 100)

    return {
      saved_ms: savedMs,
      saved_formatted: this.formatTime(savedMs),
      percentage_saved: percentageSaved
    }
  }

  /**
   * Generate performance insight text
   */
  static generateInsight(result: BenchmarkResult): string {
    const savings = this.calculateTimeSavings(result.adobe_time_ms, result.our_time_ms)

    if (result.speed_advantage >= 15) {
      return `🚀 Lightning fast! You save ${savings.saved_formatted} on every ${result.test_name.toLowerCase()}.`
    } else if (result.speed_advantage >= 10) {
      return `⚡ Excellent performance! ${savings.percentage_saved}% time savings vs Adobe.`
    } else if (result.speed_advantage >= 5) {
      return `📈 Good performance improvement of ${result.speed_advantage.toFixed(1)}x speed.`
    } else {
      return `📊 Consistent performance with ${savings.percentage_saved}% time reduction.`
    }
  }

  /**
   * Get demo performance data for development
   */
  static getDemoData(): BenchmarkResult[] {
    return [
      {
        test_name: "Small PDF Compression",
        our_time_ms: 280,
        adobe_time_ms: 3500,
        speed_advantage: 12.5,
        file_size_mb: 0.15,
        page_count: 1
      },
      {
        test_name: "Medium PDF Compression",
        our_time_ms: 950,
        adobe_time_ms: 16200,
        speed_advantage: 17.1,
        file_size_mb: 1.4,
        page_count: 12
      },
      {
        test_name: "Large PDF Compression",
        our_time_ms: 2300,
        adobe_time_ms: 45000,
        speed_advantage: 19.6,
        file_size_mb: 6.2,
        page_count: 55
      },
      {
        test_name: "PDF Merge Operation",
        our_time_ms: 420,
        adobe_time_ms: 8800,
        speed_advantage: 21.0,
        file_size_mb: 2.3,
        page_count: 18
      },
      {
        test_name: "PDF Split Operation",
        our_time_ms: 350,
        adobe_time_ms: 7200,
        speed_advantage: 20.6,
        file_size_mb: 5.1,
        page_count: 42
      }
    ]
  }
}