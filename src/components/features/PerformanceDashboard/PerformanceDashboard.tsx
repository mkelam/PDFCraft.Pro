import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Zap,
  Clock,
  TrendingUp,
  FileText,
  BarChart3,
  Target,
  Award,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { BenchmarkService, BenchmarkResult, BenchmarkSummary } from '../../../services/benchmarkService'
import { GlassmorphicCard } from '../../ui/GlassmorphicCard'

export const PerformanceDashboard: React.FC = () => {
  const [summary, setSummary] = useState<BenchmarkSummary | null>(null)
  const [comparison, setComparison] = useState<BenchmarkResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadBenchmarkData()
  }, [])

  const loadBenchmarkData = async () => {
    try {
      setIsLoading(true)
      setError('')

      const [summaryData, comparisonData] = await Promise.all([
        BenchmarkService.getBenchmarkSummary(),
        BenchmarkService.getPerformanceComparison()
      ])

      setSummary(summaryData)
      setComparison(comparisonData)
    } catch (err: any) {
      console.error('Failed to load benchmark data:', err)
      setError('Failed to load performance data')

      // Fallback to demo data
      setSummary({
        average_speed_advantage: 16.8,
        best_performance: 21.0,
        total_tests: 5,
        last_updated: new Date().toISOString(),
        status: 'demo_data'
      })
      setComparison(BenchmarkService.getDemoData())
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadBenchmarkData()
    setIsRefreshing(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading performance data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Benchmarks</h2>
          <p className="text-gray-600 mt-1">Real-time comparisons against Adobe Acrobat</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start"
        >
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-yellow-800 text-sm">{error}</p>
            <p className="text-yellow-600 text-xs mt-1">Showing demo performance data</p>
          </div>
        </motion.div>
      )}

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassmorphicCard className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {summary?.average_speed_advantage.toFixed(1)}x
                </p>
                <p className="text-sm text-gray-600">Average Speed Advantage</p>
              </div>
            </div>
          </GlassmorphicCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassmorphicCard className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {summary?.best_performance.toFixed(1)}x
                </p>
                <p className="text-sm text-gray-600">Best Performance</p>
              </div>
            </div>
          </GlassmorphicCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassmorphicCard className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {summary?.total_tests}
                </p>
                <p className="text-sm text-gray-600">Tests Completed</p>
              </div>
            </div>
          </GlassmorphicCard>
        </motion.div>
      </div>

      {/* Detailed Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <GlassmorphicCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Performance Comparison</h3>
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-1" />
              Updated {summary?.last_updated ? new Date(summary.last_updated).toLocaleDateString() : 'recently'}
            </div>
          </div>

          <div className="space-y-4">
            {comparison.map((result, index) => (
              <motion.div
                key={result.test_name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <h4 className="font-medium text-gray-900">{result.test_name}</h4>
                      <p className="text-sm text-gray-600">
                        {result.file_size_mb.toFixed(1)}MB • {result.page_count} pages
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium border ${BenchmarkService.getSpeedAdvantageBadge(result.speed_advantage)}`}>
                    {result.speed_advantage.toFixed(1)}x faster
                  </div>
                </div>

                {/* Time Comparison Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Our Platform</span>
                    <span className="font-medium text-green-600">
                      {BenchmarkService.formatTime(result.our_time_ms)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min((result.our_time_ms / result.adobe_time_ms) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Adobe Acrobat</span>
                    <span className="font-medium text-red-600">
                      {BenchmarkService.formatTime(result.adobe_time_ms)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full w-full" />
                  </div>
                </div>

                {/* Insight */}
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    {BenchmarkService.generateInsight(result)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassmorphicCard>
      </motion.div>

      {/* Performance Breakdown */}
      {summary?.breakdown && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <GlassmorphicCard className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance by Operation</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {summary.breakdown.compression.avg_advantage.toFixed(1)}x
                </div>
                <div className="text-sm text-blue-800 font-medium">Compression</div>
                <div className="text-xs text-blue-600 mt-1">
                  {summary.breakdown.compression.tests} tests
                </div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {summary.breakdown.merge.avg_advantage.toFixed(1)}x
                </div>
                <div className="text-sm text-green-800 font-medium">Merge</div>
                <div className="text-xs text-green-600 mt-1">
                  {summary.breakdown.merge.tests} tests
                </div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {summary.breakdown.split.avg_advantage.toFixed(1)}x
                </div>
                <div className="text-sm text-purple-800 font-medium">Split</div>
                <div className="text-xs text-purple-600 mt-1">
                  {summary.breakdown.split.tests} tests
                </div>
              </div>
            </div>
          </GlassmorphicCard>
        </motion.div>
      )}

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <GlassmorphicCard className="p-6 bg-gradient-to-r from-blue-50 to-violet-50 border-blue-200">
          <div className="text-center">
            <Target className="w-8 h-8 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Experience the Speed Advantage
            </h3>
            <p className="text-gray-600 mb-4">
              Join thousands of users processing PDFs up to {summary?.best_performance.toFixed(0)}x faster than Adobe
            </p>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Start Processing
            </button>
          </div>
        </GlassmorphicCard>
      </motion.div>
    </div>
  )
}