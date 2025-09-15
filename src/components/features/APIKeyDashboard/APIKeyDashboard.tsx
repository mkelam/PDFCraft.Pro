import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Settings,
  BarChart3,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Code,
  Zap,
  Shield
} from 'lucide-react'
import { AuthService, APIKey, UsageStats } from '../../../services/authService'
import { GlassmorphicCard } from '../../ui/GlassmorphicCard'
import { CreateAPIKeyModal } from './CreateAPIKeyModal'
import { APIKeyUsageChart } from './APIKeyUsageChart'

interface APIKeyWithUsage extends APIKey {
  usage_stats?: {
    requests_today: number
    requests_month: number
    last_request: string | null
  }
}

export const APIKeyDashboard: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKeyWithUsage[]>([])
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string>('')

  useEffect(() => {
    loadAPIKeys()
    loadUsageStats()
  }, [])

  const loadAPIKeys = async () => {
    try {
      setIsLoading(true)
      const keys = await AuthService.listAPIKeys()

      // Add mock usage stats for demo
      const keysWithUsage: APIKeyWithUsage[] = keys.map(key => ({
        ...key,
        usage_stats: {
          requests_today: Math.floor(Math.random() * 100) + 10,
          requests_month: Math.floor(Math.random() * 2000) + 200,
          last_request: new Date(Date.now() - Math.random() * 86400000).toISOString()
        }
      }))

      setApiKeys(keysWithUsage)
    } catch (err: any) {
      console.error('Failed to load API keys:', err)
      setError('Failed to load API keys')
      // Demo data for development
      setApiKeys([
        {
          id: 'demo-1',
          name: 'Production API Key',
          key_prefix: 'pdfsaas_',
          scopes: ['read', 'write'],
          rate_limit_per_hour: 1000,
          created_at: new Date().toISOString(),
          is_active: true,
          usage_stats: {
            requests_today: 47,
            requests_month: 1234,
            last_request: new Date(Date.now() - 3600000).toISOString()
          }
        },
        {
          id: 'demo-2',
          name: 'Development Key',
          key_prefix: 'pdfsaas_',
          scopes: ['read'],
          rate_limit_per_hour: 100,
          created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
          is_active: true,
          usage_stats: {
            requests_today: 12,
            requests_month: 345,
            last_request: new Date(Date.now() - 7200000).toISOString()
          }
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const loadUsageStats = async () => {
    try {
      const stats = await AuthService.getUsageStats()
      setUsageStats(stats)
    } catch (err) {
      // Demo stats
      setUsageStats({
        user_id: 'demo',
        current_month: new Date().getMonth() + 1,
        current_year: new Date().getFullYear(),
        documents_processed: 147,
        processing_time_total_ms: 23450,
        api_requests_count: 1579,
        storage_used_bytes: 45678900,
        monthly_limit: 1000,
        plan_type: 'business'
      })
    }
  }

  const handleCreateAPIKey = async (keyData: any) => {
    try {
      const newKey = await AuthService.createAPIKey(keyData)
      await loadAPIKeys() // Reload the list
      setShowCreateModal(false)

      // Show the new key temporarily
      setVisibleKeys(new Set([newKey.id]))
      setTimeout(() => {
        setVisibleKeys(new Set())
      }, 30000) // Hide after 30 seconds

    } catch (err: any) {
      console.error('Failed to create API key:', err)
      setError('Failed to create API key')
    }
  }

  const handleDeleteAPIKey = async (keyId: string) => {
    try {
      await AuthService.deleteAPIKey(keyId)
      await loadAPIKeys()
    } catch (err: any) {
      console.error('Failed to delete API key:', err)
      setError('Failed to delete API key')
    }
  }

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys)
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId)
    } else {
      newVisible.add(keyId)
    }
    setVisibleKeys(newVisible)
  }

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(keyId)
      setTimeout(() => setCopiedKey(''), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading API keys...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Key Management</h2>
          <p className="text-gray-600 mt-1">Manage your API keys and monitor usage</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create API Key
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
            <p className="text-yellow-600 text-xs mt-1">Showing demo data</p>
          </div>
        </motion.div>
      )}

      {/* Usage Overview */}
      {usageStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GlassmorphicCard className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-lg font-semibold text-gray-900">
                  {usageStats.api_requests_count.toLocaleString()}
                </p>
                <p className="text-xs text-gray-600">API Requests</p>
              </div>
            </div>
          </GlassmorphicCard>

          <GlassmorphicCard className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-lg font-semibold text-gray-900">
                  {usageStats.documents_processed}
                </p>
                <p className="text-xs text-gray-600">Documents Processed</p>
              </div>
            </div>
          </GlassmorphicCard>

          <GlassmorphicCard className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-lg font-semibold text-gray-900">
                  {(usageStats.processing_time_total_ms / 1000).toFixed(1)}s
                </p>
                <p className="text-xs text-gray-600">Processing Time</p>
              </div>
            </div>
          </GlassmorphicCard>

          <GlassmorphicCard className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-lg font-semibold text-gray-900">{apiKeys.length}</p>
                <p className="text-xs text-gray-600">Active Keys</p>
              </div>
            </div>
          </GlassmorphicCard>
        </div>
      )}

      {/* API Keys List */}
      <GlassmorphicCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Your API Keys</h3>

        {apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No API Keys</h4>
            <p className="text-gray-600 mb-4">Create your first API key to start integrating</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create API Key
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((apiKey, index) => (
              <motion.div
                key={apiKey.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-gray-100 rounded-lg mr-3">
                      <Key className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{apiKey.name}</h4>
                      <p className="text-sm text-gray-600">
                        Created {formatDate(apiKey.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      apiKey.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {apiKey.is_active ? 'Active' : 'Inactive'}
                    </div>
                    <button
                      onClick={() => handleDeleteAPIKey(apiKey.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* API Key Display */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-50 rounded-lg p-3 font-mono text-sm">
                      {visibleKeys.has(apiKey.id)
                        ? `${apiKey.key_prefix}${'•'.repeat(32)}`
                        : `${apiKey.key_prefix}${'•'.repeat(32)}`
                      }
                    </div>
                    <div className="flex ml-2">
                      <button
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title={visibleKeys.has(apiKey.id) ? 'Hide key' : 'Show key'}
                      >
                        {visibleKeys.has(apiKey.id) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(`${apiKey.key_prefix}${'demo_key_' + apiKey.id}`, apiKey.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedKey === apiKey.id ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Usage Stats */}
                {apiKey.usage_stats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-lg font-semibold text-blue-800">
                        {apiKey.usage_stats.requests_today}
                      </div>
                      <div className="text-sm text-blue-600">Requests Today</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-lg font-semibold text-green-800">
                        {apiKey.usage_stats.requests_month}
                      </div>
                      <div className="text-sm text-green-600">Requests This Month</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-lg font-semibold text-purple-800">
                        {apiKey.usage_stats.last_request
                          ? formatTimeAgo(apiKey.usage_stats.last_request)
                          : 'Never'
                        }
                      </div>
                      <div className="text-sm text-purple-600">Last Request</div>
                    </div>
                  </div>
                )}

                {/* Configuration */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span>Rate Limit: {apiKey.rate_limit_per_hour}/hour</span>
                    <span>Scopes: {apiKey.scopes.join(', ')}</span>
                  </div>
                  <button className="flex items-center text-blue-600 hover:text-blue-700">
                    <Settings className="w-4 h-4 mr-1" />
                    Configure
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </GlassmorphicCard>

      {/* Usage Analytics */}
      <APIKeyUsageChart apiKeys={apiKeys} />

      {/* Quick Start Guide */}
      <GlassmorphicCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Code className="w-5 h-5 mr-2" />
          Quick Start
        </h3>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-green-400 text-sm">
{`# Example API usage
curl -X POST "https://api.pdfsaas.com/processing/compress" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@document.pdf" \\
  -F "quality=high"`}
          </pre>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            See our <a href="/docs" className="text-blue-600 hover:text-blue-700">API documentation</a> for more examples
          </p>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View Full Documentation →
          </button>
        </div>
      </GlassmorphicCard>

      {/* Create API Key Modal */}
      <CreateAPIKeyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateAPIKey}
      />
    </div>
  )
}