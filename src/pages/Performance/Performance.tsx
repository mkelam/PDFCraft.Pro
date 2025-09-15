import React from 'react'
import { motion } from 'framer-motion'
import {
  Zap,
  TrendingUp,
  Clock,
  Server,
  Users,
  Activity,
  BarChart3,
  Globe,
  Shield,
  CheckCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

export const Performance: React.FC = () => {
  const stats = [
    {
      title: 'Average Processing Time',
      value: '5.2s',
      change: '-15%',
      changeType: 'positive',
      icon: Clock,
      description: 'vs industry average 45s'
    },
    {
      title: 'Throughput',
      value: '2.4M',
      change: '+23%',
      changeType: 'positive',
      icon: TrendingUp,
      description: 'docs per month'
    },
    {
      title: 'Uptime',
      value: '99.98%',
      change: '+0.02%',
      changeType: 'positive',
      icon: Shield,
      description: 'last 30 days'
    },
    {
      title: 'Response Time',
      value: '89ms',
      change: '-12ms',
      changeType: 'positive',
      icon: Zap,
      description: 'API response avg'
    }
  ]

  const regionalStats = [
    { region: 'North America', latency: '45ms', uptime: '99.99%', load: '67%' },
    { region: 'Europe', latency: '38ms', uptime: '99.97%', load: '54%' },
    { region: 'Asia Pacific', latency: '52ms', uptime: '99.98%', load: '71%' },
    { region: 'South America', latency: '78ms', uptime: '99.94%', load: '43%' }
  ]

  const performanceMetrics = [
    { time: '00:00', cpu: 45, memory: 67, requests: 1240 },
    { time: '04:00', cpu: 32, memory: 54, requests: 890 },
    { time: '08:00', cpu: 78, memory: 82, requests: 2340 },
    { time: '12:00', cpu: 65, memory: 74, requests: 1890 },
    { time: '16:00', cpu: 89, memory: 91, requests: 3120 },
    { time: '20:00', cpu: 67, memory: 73, requests: 2450 }
  ]

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border-primary)]">
        <div className="premium-container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                <span className="text-black font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-semibold text-white">PDF</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="/dashboard" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                Dashboard
              </a>
              <a href="/performance" className="text-white font-medium">
                Performance
              </a>
              <a href="/developers" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                Developers
              </a>
              <a href="/api-keys" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                API Keys
              </a>
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-white">U</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-container py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-display text-4xl text-white mb-2">
            Performance Analytics
          </h1>
          <p className="text-[var(--color-text-tertiary)] text-lg">
            Real-time monitoring of our PDF processing infrastructure performance.
          </p>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={stat.title} className="premium-card">
                <div className="flex items-center justify-between mb-4">
                  <Icon className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                  <div className={`flex items-center space-x-1 text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stat.changeType === 'positive' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )}
                    <span>{stat.change}</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-[var(--color-text-tertiary)]">
                  {stat.title}
                </div>
                <div className="text-xs text-[var(--color-text-quaternary)] mt-1">
                  {stat.description}
                </div>
              </div>
            )
          })}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Performance Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="premium-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  System Performance
                </h2>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-[var(--color-text-tertiary)]">CPU</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-[var(--color-text-tertiary)]">Memory</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-[var(--color-text-tertiary)]">Requests</span>
                  </div>
                </div>
              </div>

              {/* Simple Chart Visualization */}
              <div className="h-64 flex items-end justify-between space-x-2">
                {performanceMetrics.map((metric, index) => (
                  <div key={metric.time} className="flex-1 flex flex-col items-center space-y-2">
                    <div className="w-full flex flex-col space-y-1">
                      <div
                        className="bg-blue-500 rounded-t"
                        style={{ height: `${(metric.cpu / 100) * 80}px` }}
                      ></div>
                      <div
                        className="bg-green-500"
                        style={{ height: `${(metric.memory / 100) * 80}px` }}
                      ></div>
                      <div
                        className="bg-purple-500 rounded-b"
                        style={{ height: `${(metric.requests / 3500) * 80}px` }}
                      ></div>
                    </div>
                    <span className="text-xs text-[var(--color-text-quaternary)]">
                      {metric.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* System Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <div className="premium-card">
              <h3 className="text-lg font-semibold text-white mb-4">
                System Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-white">API Gateway</span>
                  </div>
                  <span className="text-sm text-green-400">Operational</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-white">Processing Engine</span>
                  </div>
                  <span className="text-sm text-green-400">Operational</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-white">File Storage</span>
                  </div>
                  <span className="text-sm text-green-400">Operational</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-white">Database</span>
                  </div>
                  <span className="text-sm text-green-400">Operational</span>
                </div>
              </div>
            </div>

            <div className="premium-card">
              <h3 className="text-lg font-semibold text-white mb-4">
                Resource Usage
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--color-text-secondary)]">CPU Usage</span>
                    <span className="text-white">67%</span>
                  </div>
                  <div className="w-full bg-[var(--color-bg-secondary)] rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '67%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--color-text-secondary)]">Memory</span>
                    <span className="text-white">74%</span>
                  </div>
                  <div className="w-full bg-[var(--color-bg-secondary)] rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '74%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--color-text-secondary)]">Disk Space</span>
                    <span className="text-white">45%</span>
                  </div>
                  <div className="w-full bg-[var(--color-bg-secondary)] rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Regional Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="premium-card">
            <h2 className="text-xl font-semibold text-white mb-6">
              Regional Performance
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border-primary)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-tertiary)]">
                      Region
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-tertiary)]">
                      Latency
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-tertiary)]">
                      Uptime
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-tertiary)]">
                      Load
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {regionalStats.map((region, index) => (
                    <tr key={region.region} className="border-b border-[var(--color-border-primary)] last:border-b-0">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <Globe className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                          <span className="text-white font-medium">{region.region}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                        {region.latency}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-green-400">{region.uptime}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-[var(--color-bg-secondary)] rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: region.load }}
                            ></div>
                          </div>
                          <span className="text-[var(--color-text-secondary)] text-sm">{region.load}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}