import React from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Clock, Activity } from 'lucide-react'
import { GlassmorphicCard } from '../../ui/GlassmorphicCard'

interface APIKeyWithUsage {
  id: string
  name: string
  usage_stats?: {
    requests_today: number
    requests_month: number
    last_request: string | null
  }
  rate_limit_per_hour: number
}

interface APIKeyUsageChartProps {
  apiKeys: APIKeyWithUsage[]
}

export const APIKeyUsageChart: React.FC<APIKeyUsageChartProps> = ({ apiKeys }) => {
  // Generate mock weekly data for charts
  const generateWeeklyData = (apiKey: APIKeyWithUsage) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.map(day => ({
      day,
      requests: Math.floor(Math.random() * (apiKey.usage_stats?.requests_today || 50)) + 10
    }))
  }

  const totalRequests = apiKeys.reduce((sum, key) =>
    sum + (key.usage_stats?.requests_month || 0), 0
  )

  const averageDaily = Math.floor(totalRequests / 30)

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassmorphicCard className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-lg font-semibold text-gray-900">
                {totalRequests.toLocaleString()}
              </p>
              <p className="text-xs text-gray-600">Total Monthly Requests</p>
            </div>
          </div>
        </GlassmorphicCard>

        <GlassmorphicCard className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-lg font-semibold text-gray-900">
                {averageDaily.toLocaleString()}
              </p>
              <p className="text-xs text-gray-600">Average Daily</p>
            </div>
          </div>
        </GlassmorphicCard>

        <GlassmorphicCard className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-lg font-semibold text-gray-900">
                {apiKeys.filter(k => k.usage_stats?.requests_today && k.usage_stats.requests_today > 0).length}
              </p>
              <p className="text-xs text-gray-600">Active Keys Today</p>
            </div>
          </div>
        </GlassmorphicCard>
      </div>

      {/* Usage Charts */}
      <GlassmorphicCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          API Usage Analytics
        </h3>

        {apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Usage Data</h4>
            <p className="text-gray-600">Create an API key to start tracking usage</p>
          </div>
        ) : (
          <div className="space-y-8">
            {apiKeys.map((apiKey, index) => (
              <motion.div
                key={apiKey.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">{apiKey.name}</h4>
                  <div className="text-sm text-gray-600">
                    {apiKey.usage_stats?.requests_month || 0} requests this month
                  </div>
                </div>

                {/* Weekly Bar Chart */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Weekly Usage Pattern</span>
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Last 7 days
                    </span>
                  </div>

                  <div className="flex items-end space-x-2 h-24">
                    {generateWeeklyData(apiKey).map((data, dayIndex) => {
                      const maxRequests = Math.max(...generateWeeklyData(apiKey).map(d => d.requests))
                      const height = (data.requests / maxRequests) * 100

                      return (
                        <div key={data.day} className="flex-1 flex flex-col items-center">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ delay: 0.5 + dayIndex * 0.1 }}
                            className="w-full bg-blue-500 rounded-t-sm min-h-[4px] relative group"
                          >
                            {/* Tooltip */}
                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap transition-opacity">
                              {data.requests} requests
                            </div>
                          </motion.div>
                          <div className="text-xs text-gray-600 mt-1">{data.day}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Usage Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {apiKey.usage_stats?.requests_today || 0}
                    </div>
                    <div className="text-xs text-gray-600">Today</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {Math.floor((apiKey.usage_stats?.requests_month || 0) / 7)}
                    </div>
                    <div className="text-xs text-gray-600">Weekly Avg</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {apiKey.rate_limit_per_hour}
                    </div>
                    <div className="text-xs text-gray-600">Rate Limit</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-semibold ${
                      (apiKey.usage_stats?.requests_today || 0) / (apiKey.rate_limit_per_hour / 24) > 0.8
                        ? 'text-red-600'
                        : (apiKey.usage_stats?.requests_today || 0) / (apiKey.rate_limit_per_hour / 24) > 0.6
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}>
                      {Math.round(((apiKey.usage_stats?.requests_today || 0) / (apiKey.rate_limit_per_hour / 24)) * 100)}%
                    </div>
                    <div className="text-xs text-gray-600">Daily Usage</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </GlassmorphicCard>

      {/* Real-time Activity */}
      <GlassmorphicCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Recent Activity
        </h3>

        {apiKeys.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-600">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys
              .filter(key => key.usage_stats?.last_request)
              .sort((a, b) =>
                new Date(b.usage_stats?.last_request || 0).getTime() -
                new Date(a.usage_stats?.last_request || 0).getTime()
              )
              .slice(0, 5)
              .map((apiKey, index) => (
                <motion.div
                  key={apiKey.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <div className="font-medium text-gray-900">{apiKey.name}</div>
                      <div className="text-sm text-gray-600">
                        Last request: {apiKey.usage_stats?.last_request
                          ? new Date(apiKey.usage_stats.last_request).toLocaleString()
                          : 'Never'
                        }
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {apiKey.usage_stats?.requests_today || 0} today
                  </div>
                </motion.div>
              ))}
          </div>
        )}
      </GlassmorphicCard>
    </div>
  )
}