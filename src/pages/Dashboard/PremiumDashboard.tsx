import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Upload,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  Settings,
  BarChart3,
  Key,
  Code,
  Plus,
  ArrowRight
} from 'lucide-react'

const PremiumDashboard: React.FC = () => {
  const [dragActive, setDragActive] = useState(false)

  const stats = [
    { label: 'Documents Processed', value: '1,247', change: '+12%', icon: FileText },
    { label: 'Processing Speed', value: '5.2s', change: 'avg', icon: Zap },
    { label: 'Success Rate', value: '99.8%', change: '+0.2%', icon: CheckCircle },
    { label: 'API Calls', value: '15.6K', change: '+18%', icon: BarChart3 }
  ]

  const recentJobs = [
    { id: 1, name: 'annual-report.pdf', status: 'completed', time: '2m ago', size: '2.4 MB' },
    { id: 2, name: 'contract-docs.pdf', status: 'processing', time: '5m ago', size: '1.8 MB' },
    { id: 3, name: 'presentation.pdf', status: 'completed', time: '12m ago', size: '5.2 MB' },
    { id: 4, name: 'invoice-batch.pdf', status: 'completed', time: '18m ago', size: '892 KB' }
  ]

  const quickActions = [
    {
      title: 'API Documentation',
      description: 'Integrate PDF processing into your applications',
      icon: Code,
      href: '/developers',
      color: 'bg-blue-500/10 border-blue-500/20'
    },
    {
      title: 'API Keys',
      description: 'Manage your authentication keys',
      icon: Key,
      href: '/api-keys',
      color: 'bg-purple-500/10 border-purple-500/20'
    },
    {
      title: 'Performance Analytics',
      description: 'View detailed processing metrics',
      icon: BarChart3,
      href: '/performance',
      color: 'bg-green-500/10 border-green-500/20'
    }
  ]

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    // Handle file drop
  }

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
              <a href="/" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                Dashboard
              </a>
              <a href="/performance" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
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
              <button className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded-md transition-colors">
                <Settings className="w-5 h-5 text-[var(--color-text-tertiary)]" />
              </button>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-white">U</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-container py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-display text-4xl text-white mb-2">
            Welcome back
          </h1>
          <p className="text-[var(--color-text-tertiary)] text-lg">
            Process PDFs 10x faster than Adobe with enterprise-grade reliability.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="premium-card">
                <div className="flex items-center justify-between mb-4">
                  <Icon className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                  <span className="text-sm text-green-400 font-medium">
                    {stat.change}
                  </span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-[var(--color-text-tertiary)]">
                  {stat.label}
                </div>
              </div>
            )
          })}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Upload Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="premium-card h-96">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  Process Document
                </h2>
                <button className="premium-button premium-button-secondary text-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Batch Upload
                </button>
              </div>

              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-2xl h-64 flex flex-col items-center justify-center transition-all ${
                  dragActive
                    ? 'border-white bg-[var(--color-bg-elevated)]'
                    : 'border-[var(--color-border-secondary)] hover:border-[var(--color-border-accent)]'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="w-16 h-16 bg-[var(--color-bg-elevated)] rounded-2xl flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-[var(--color-text-secondary)]" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  Drop your PDF here
                </h3>
                <p className="text-[var(--color-text-tertiary)] text-center mb-4">
                  Or click to browse files
                </p>
                <button className="premium-button premium-button-primary">
                  Select Files
                </button>
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Quick Actions */}
            <div className="premium-card">
              <h3 className="text-lg font-semibold text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <a
                      key={action.title}
                      href={action.href}
                      className={`block p-4 rounded-lg border ${action.color} hover:bg-opacity-50 transition-all group`}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className="w-5 h-5 text-[var(--color-text-secondary)] mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-white mb-1">
                            {action.title}
                          </h4>
                          <p className="text-sm text-[var(--color-text-tertiary)]">
                            {action.description}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Recent Jobs */}
            <div className="premium-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Recent Jobs
                </h3>
                <a href="/jobs" className="text-sm text-[var(--color-text-tertiary)] hover:text-white transition-colors">
                  View all
                </a>
              </div>
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-[var(--color-bg-tertiary)] rounded-md flex items-center justify-center">
                        <FileText className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      </div>
                      <div>
                        <div className="font-medium text-white text-sm">
                          {job.name}
                        </div>
                        <div className="text-xs text-[var(--color-text-tertiary)]">
                          {job.size} • {job.time}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {job.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : job.status === 'processing' ? (
                        <Clock className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      {job.status === 'completed' && (
                        <button className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded transition-colors">
                          <Download className="w-3 h-3 text-[var(--color-text-tertiary)]" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default PremiumDashboard