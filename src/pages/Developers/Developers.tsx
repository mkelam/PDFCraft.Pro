import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Code, BookOpen, Zap, Webhook, Download, Github, Star, Users } from 'lucide-react'
import { APIDashboard } from '../../components/features/APIDocs'
import { WebhookDashboard } from '../../components/features/WebhookManagement'

const Developers: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'api-docs', label: 'API Documentation', icon: Code },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  ]

  const features = [
    {
      icon: Zap,
      title: '10x Faster Processing',
      description: 'Our optimized PDF processing engine delivers industry-leading performance'
    },
    {
      icon: Code,
      title: 'RESTful API',
      description: 'Simple, intuitive REST API with comprehensive documentation and examples'
    },
    {
      icon: Webhook,
      title: 'Real-time Webhooks',
      description: 'Get instant notifications when your PDF processing jobs complete'
    },
    {
      icon: Download,
      title: 'Multiple SDKs',
      description: 'Official SDKs for JavaScript, Python, PHP, and more coming soon'
    }
  ]

  const stats = [
    { label: 'API Calls/Month', value: '50M+' },
    { label: 'Developers', value: '10K+' },
    { label: 'Uptime', value: '99.9%' },
    { label: 'Avg Response', value: '<100ms' }
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
              <a href="/performance" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                Performance
              </a>
              <a href="/developers" className="text-white font-medium">
                Developers
              </a>
              <a href="/api-keys" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                API Keys
              </a>
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <motion.a
                href="https://github.com/pdfsaas/sdk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-white rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </motion.a>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-white">U</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-[var(--color-border-primary)]">
        <div className="premium-container">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-white text-white'
                      : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-secondary)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="premium-container py-8">
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <h1 className="text-display text-6xl md:text-7xl text-white mb-6 tracking-tight">
                Build Powerful
                <br />
                <span className="text-[var(--color-text-secondary)]">PDF Applications</span>
              </h1>
              <p className="text-body text-xl text-[var(--color-text-tertiary)] max-w-3xl mx-auto leading-relaxed">
                The fastest and most reliable PDF processing API. Transform, compress, split, merge,
                and manipulate PDFs at scale with our lightning-fast infrastructure.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center premium-card"
                >
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-[var(--color-text-tertiary)] mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-2 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="premium-card"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                          <Icon className="w-6 h-6 text-black" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-[var(--color-text-tertiary)] leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Quick Start */}
            <div className="premium-card">
              <h2 className="text-2xl font-bold text-white mb-6">Quick Start</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">1. Get Your API Key</h3>
                  <p className="text-[var(--color-text-tertiary)] mb-4">
                    Sign up for a free account and get your API key from the dashboard.
                  </p>
                  <motion.a
                    href="/api-keys"
                    className="premium-button premium-button-primary inline-flex items-center"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Get API Key
                  </motion.a>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">2. Make Your First Call</h3>
                  <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 text-mono text-sm border border-[var(--color-border-primary)]">
                    <div className="text-[var(--color-text-tertiary)]">curl -X POST \</div>
                    <div className="text-[var(--color-text-tertiary)]">  https://api.pdfsaas.com/v1/processing/upload \</div>
                    <div className="text-[var(--color-text-tertiary)]">  -H "Authorization: Bearer YOUR_API_KEY" \</div>
                    <div className="text-[var(--color-text-tertiary)]">  -F "file=@document.pdf"</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Community */}
            <div className="premium-card bg-gradient-to-r from-blue-600/20 to-blue-700/20 border-blue-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Join Our Developer Community</h2>
                  <p className="text-[var(--color-text-tertiary)]">
                    Connect with other developers, get help, and stay updated with the latest features.
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <motion.a
                    href="#"
                    className="flex items-center space-x-2 premium-button premium-button-secondary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Users className="w-4 h-4" />
                    <span>Join Discord</span>
                  </motion.a>
                  <motion.a
                    href="#"
                    className="flex items-center space-x-2 premium-button premium-button-primary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Star className="w-4 h-4" />
                    <span>Star on GitHub</span>
                  </motion.a>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'api-docs' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <APIDashboard />
          </motion.div>
        )}

        {activeTab === 'webhooks' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <WebhookDashboard />
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default Developers