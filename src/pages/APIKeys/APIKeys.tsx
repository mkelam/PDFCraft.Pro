import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Calendar,
  Activity,
  Shield,
  AlertCircle,
  CheckCircle,
  MoreVertical
} from 'lucide-react'

export const APIKeys: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  const apiKeys = [
    {
      id: '1',
      name: 'Production API Key',
      key: 'pk_live_1234567890abcdef',
      created: '2024-01-15',
      lastUsed: '2 hours ago',
      requests: 125420,
      status: 'active',
      permissions: ['read', 'write']
    },
    {
      id: '2',
      name: 'Development Key',
      key: 'pk_test_abcdef1234567890',
      created: '2024-01-10',
      lastUsed: '5 minutes ago',
      requests: 8934,
      status: 'active',
      permissions: ['read']
    },
    {
      id: '3',
      name: 'Legacy Integration',
      key: 'pk_live_fedcba0987654321',
      created: '2023-12-01',
      lastUsed: 'Never',
      requests: 0,
      status: 'inactive',
      permissions: ['read', 'write']
    }
  ]

  const stats = [
    { label: 'Total API Keys', value: '3', icon: Key },
    { label: 'Active Keys', value: '2', icon: CheckCircle },
    { label: 'Total Requests', value: '134K', icon: Activity },
    { label: 'Rate Limit', value: '1000/min', icon: Shield }
  ]

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys)
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId)
    } else {
      newVisible.add(keyId)
    }
    setVisibleKeys(newVisible)
  }

  const maskKey = (key: string, visible: boolean) => {
    if (visible) return key
    return key.substring(0, 8) + '••••••••••••••••'
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
              <a href="/dashboard" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                Dashboard
              </a>
              <a href="/performance" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                Performance
              </a>
              <a href="/developers" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                Developers
              </a>
              <a href="/api-keys" className="text-white font-medium">
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
          className="flex items-center justify-between mb-12"
        >
          <div>
            <h1 className="text-display text-4xl text-white mb-2">
              API Key Management
            </h1>
            <p className="text-[var(--color-text-tertiary)] text-lg">
              Create and manage API keys for your applications. Monitor usage, set rate limits, and track performance.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="premium-button premium-button-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create API Key</span>
          </button>
        </motion.div>

        {/* Stats */}
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
                <div className="flex items-center space-x-3 mb-2">
                  <Icon className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                  <span className="text-sm text-[var(--color-text-tertiary)]">{stat.label}</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {stat.value}
                </div>
              </div>
            )
          })}
        </motion.div>

        {/* API Keys List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="premium-card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                Your API Keys
              </h2>
              <span className="text-sm text-[var(--color-text-tertiary)]">
                {apiKeys.length} keys total
              </span>
            </div>

            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="p-6 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-medium text-white">
                          {apiKey.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          apiKey.status === 'active'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {apiKey.status}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 mb-4">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <code className="text-mono text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-3 py-2 rounded border border-[var(--color-border-primary)] flex-1 min-w-0 truncate">
                            {maskKey(apiKey.key, visibleKeys.has(apiKey.id))}
                          </code>
                          <button
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                            className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded transition-colors"
                          >
                            {visibleKeys.has(apiKey.id) ? (
                              <EyeOff className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                            ) : (
                              <Eye className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                            )}
                          </button>
                          <button className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded transition-colors">
                            <Copy className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Created</span>
                          <div className="text-white font-medium">{apiKey.created}</div>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Last Used</span>
                          <div className="text-white font-medium">{apiKey.lastUsed}</div>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Requests</span>
                          <div className="text-white font-medium">{apiKey.requests.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Permissions</span>
                          <div className="flex space-x-1">
                            {apiKey.permissions.map((permission) => (
                              <span
                                key={permission}
                                className="px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] rounded"
                              >
                                {permission}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded transition-colors">
                        <Edit className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      </button>
                      <button className="p-2 hover:bg-red-500/20 rounded transition-colors">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                      <button className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded transition-colors">
                        <MoreVertical className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <div className="premium-card border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <h3 className="text-white font-medium mb-1">Security Best Practices</h3>
                <p className="text-[var(--color-text-tertiary)] text-sm leading-relaxed">
                  Keep your API keys secure and never share them publicly. Rotate keys regularly and use the minimum
                  required permissions for each integration. Monitor usage patterns for any suspicious activity.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-primary)] p-6 w-full max-w-md mx-4"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Create New API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] rounded-md text-white placeholder-[var(--color-text-quaternary)] focus:outline-none focus:border-[var(--color-border-accent)]"
                  placeholder="Enter a name for this key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Permissions
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-[var(--color-text-secondary)]">Read access</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-[var(--color-text-secondary)]">Write access</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="premium-button premium-button-secondary"
              >
                Cancel
              </button>
              <button className="premium-button premium-button-primary">
                Create Key
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}