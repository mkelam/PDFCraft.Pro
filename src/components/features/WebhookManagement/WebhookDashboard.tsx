import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Webhook, Plus, Settings, Trash2, Edit, Play, Pause,
  CheckCircle, XCircle, Clock, AlertTriangle, ExternalLink,
  Copy, Eye, EyeOff, RotateCcw, Activity
} from 'lucide-react'
import { GlassmorphicCard } from '../../ui/GlassmorphicCard'

interface WebhookEndpoint {
  id: string
  name: string
  url: string
  events: string[]
  status: 'active' | 'paused' | 'failed'
  secret: string
  created_at: string
  last_triggered: string | null
  success_rate: number
  total_deliveries: number
  failed_deliveries: number
}

interface WebhookEvent {
  id: string
  webhook_id: string
  event_type: string
  status: 'success' | 'failed' | 'pending'
  attempts: number
  created_at: string
  response_status?: number
  response_time?: number
  error_message?: string
}

const MOCK_WEBHOOKS: WebhookEndpoint[] = [
  {
    id: 'wh_1',
    name: 'Production Processor',
    url: 'https://api.myapp.com/webhooks/pdf-processed',
    events: ['job.completed', 'job.failed'],
    status: 'active',
    secret: 'whsec_1234567890abcdef',
    created_at: '2024-12-01T10:30:00Z',
    last_triggered: '2024-12-15T09:45:00Z',
    success_rate: 98.5,
    total_deliveries: 1250,
    failed_deliveries: 19
  },
  {
    id: 'wh_2',
    name: 'Analytics Tracker',
    url: 'https://analytics.myapp.com/events',
    events: ['job.started', 'job.completed', 'job.failed'],
    status: 'active',
    secret: 'whsec_abcdef1234567890',
    created_at: '2024-11-15T14:20:00Z',
    last_triggered: '2024-12-15T09:30:00Z',
    success_rate: 99.8,
    total_deliveries: 2850,
    failed_deliveries: 6
  },
  {
    id: 'wh_3',
    name: 'Error Notifications',
    url: 'https://alerts.myapp.com/webhook',
    events: ['job.failed', 'rate_limit.exceeded'],
    status: 'failed',
    secret: 'whsec_fedcba0987654321',
    created_at: '2024-12-10T16:00:00Z',
    last_triggered: '2024-12-14T22:15:00Z',
    success_rate: 85.2,
    total_deliveries: 125,
    failed_deliveries: 18
  }
]

const MOCK_EVENTS: WebhookEvent[] = [
  {
    id: 'evt_1',
    webhook_id: 'wh_1',
    event_type: 'job.completed',
    status: 'success',
    attempts: 1,
    created_at: '2024-12-15T09:45:00Z',
    response_status: 200,
    response_time: 245
  },
  {
    id: 'evt_2',
    webhook_id: 'wh_2',
    event_type: 'job.started',
    status: 'success',
    attempts: 1,
    created_at: '2024-12-15T09:30:00Z',
    response_status: 200,
    response_time: 180
  },
  {
    id: 'evt_3',
    webhook_id: 'wh_3',
    event_type: 'job.failed',
    status: 'failed',
    attempts: 3,
    created_at: '2024-12-14T22:15:00Z',
    response_status: 503,
    error_message: 'Service temporarily unavailable'
  }
]

const AVAILABLE_EVENTS = [
  { id: 'job.started', name: 'Job Started', description: 'Triggered when a processing job begins' },
  { id: 'job.completed', name: 'Job Completed', description: 'Triggered when a job finishes successfully' },
  { id: 'job.failed', name: 'Job Failed', description: 'Triggered when a job fails to complete' },
  { id: 'rate_limit.exceeded', name: 'Rate Limit Exceeded', description: 'Triggered when rate limits are hit' },
  { id: 'account.upgraded', name: 'Account Upgraded', description: 'Triggered when account plan changes' },
  { id: 'file.expired', name: 'File Expired', description: 'Triggered when processed files expire' }
]

export const WebhookDashboard: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(MOCK_WEBHOOKS)
  const [recentEvents, setRecentEvents] = useState<WebhookEvent[]>(MOCK_EVENTS)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEndpoint | null>(null)
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'webhooks' | 'events' | 'logs'>('webhooks')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'success':
        return 'text-green-600 bg-green-100'
      case 'paused':
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const toggleWebhookStatus = (webhookId: string) => {
    setWebhooks(prev => prev.map(webhook =>
      webhook.id === webhookId
        ? { ...webhook, status: webhook.status === 'active' ? 'paused' : 'active' as any }
        : webhook
    ))
  }

  const toggleSecretVisibility = (webhookId: string) => {
    setShowSecrets(prev => {
      const newSet = new Set(prev)
      if (newSet.has(webhookId)) {
        newSet.delete(webhookId)
      } else {
        newSet.add(webhookId)
      }
      return newSet
    })
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Webhook Management</h1>
          <p className="text-slate-600">
            Configure webhooks to receive real-time notifications about processing events
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Webhook</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassmorphicCard className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Webhook className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-lg font-semibold text-gray-900">
                {webhooks.length}
              </p>
              <p className="text-xs text-gray-600">Total Webhooks</p>
            </div>
          </div>
        </GlassmorphicCard>

        <GlassmorphicCard className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-lg font-semibold text-gray-900">
                {webhooks.filter(w => w.status === 'active').length}
              </p>
              <p className="text-xs text-gray-600">Active Endpoints</p>
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
                {webhooks.reduce((sum, w) => sum + w.total_deliveries, 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600">Total Deliveries</p>
            </div>
          </div>
        </GlassmorphicCard>

        <GlassmorphicCard className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-lg font-semibold text-gray-900">
                {((webhooks.reduce((sum, w) => sum + w.success_rate, 0) / webhooks.length) || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-600">Average Success Rate</p>
            </div>
          </div>
        </GlassmorphicCard>
      </div>

      {/* Tab Navigation */}
      <GlassmorphicCard className="p-1">
        <div className="flex space-x-1">
          {[
            { id: 'webhooks', label: 'Webhook Endpoints', icon: Webhook },
            { id: 'events', label: 'Recent Events', icon: Activity },
            { id: 'logs', label: 'Delivery Logs', icon: ExternalLink }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </GlassmorphicCard>

      {/* Content */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          {webhooks.map((webhook, index) => (
            <motion.div
              key={webhook.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassmorphicCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-slate-800">{webhook.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(webhook.status)}`}>
                      {webhook.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleWebhookStatus(webhook.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        webhook.status === 'active'
                          ? 'text-yellow-600 hover:bg-yellow-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={webhook.status === 'active' ? 'Pause webhook' : 'Activate webhook'}
                    >
                      {webhook.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* URL and Events */}
                  <div className="lg:col-span-2 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Endpoint URL</h4>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 bg-slate-50 px-3 py-2 rounded text-sm text-slate-700">
                          {webhook.url}
                        </code>
                        <button
                          onClick={() => copyToClipboard(webhook.url)}
                          className="p-2 text-slate-600 hover:text-slate-800 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Events</h4>
                      <div className="flex flex-wrap gap-2">
                        {webhook.events.map(event => (
                          <span
                            key={event}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                          >
                            {event}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Signing Secret</h4>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 bg-slate-50 px-3 py-2 rounded text-sm text-slate-700">
                          {showSecrets.has(webhook.id) ? webhook.secret : '••••••••••••••••'}
                        </code>
                        <button
                          onClick={() => toggleSecretVisibility(webhook.id)}
                          className="p-2 text-slate-600 hover:text-slate-800 transition-colors"
                        >
                          {showSecrets.has(webhook.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(webhook.secret)}
                          className="p-2 text-slate-600 hover:text-slate-800 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-600 hover:text-slate-800 transition-colors">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-800">{webhook.success_rate}%</div>
                      <div className="text-xs text-slate-600">Success Rate</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-slate-800">
                          {webhook.total_deliveries.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-600">Total</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-red-600">
                          {webhook.failed_deliveries}
                        </div>
                        <div className="text-xs text-slate-600">Failed</div>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-sm text-slate-600">
                        Last triggered: {webhook.last_triggered
                          ? new Date(webhook.last_triggered).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </GlassmorphicCard>
            </motion.div>
          ))}

          {webhooks.length === 0 && (
            <GlassmorphicCard className="p-12 text-center">
              <Webhook className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Webhooks Configured</h3>
              <p className="text-slate-600 mb-4">
                Create your first webhook to start receiving real-time notifications
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Webhook
              </button>
            </GlassmorphicCard>
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <GlassmorphicCard className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Webhook Events</h3>

          <div className="space-y-3">
            {recentEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    event.status === 'success' ? 'bg-green-500' :
                    event.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <div>
                    <div className="font-medium text-slate-900">{event.event_type}</div>
                    <div className="text-sm text-slate-600">
                      {webhooks.find(w => w.id === event.webhook_id)?.name || 'Unknown webhook'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-slate-900">
                    {event.response_status && (
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(event.status)}`}>
                        {event.response_status}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600">
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                  {event.response_time && (
                    <div className="text-xs text-slate-600">
                      {event.response_time}ms
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {recentEvents.length === 0 && (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-slate-900 mb-2">No Recent Events</h4>
              <p className="text-slate-600">Webhook events will appear here once they start firing</p>
            </div>
          )}
        </GlassmorphicCard>
      )}

      {activeTab === 'logs' && (
        <GlassmorphicCard className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Delivery Logs</h3>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Clock className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">Enhanced Logging</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Detailed delivery logs with request/response data, retry attempts, and error analysis coming soon.
                </p>
              </div>
            </div>
          </div>
        </GlassmorphicCard>
      )}

      {/* Create Webhook Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-slate-800 mb-4">Create Webhook</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Webhook Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Production Notifications"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Endpoint URL
                      </label>
                      <input
                        type="url"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://your-app.com/webhooks/pdfsaas"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Events to Subscribe
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {AVAILABLE_EVENTS.map(event => (
                          <label key={event.id} className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              className="mt-1 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                            />
                            <div>
                              <div className="text-sm font-medium text-slate-900">{event.name}</div>
                              <div className="text-xs text-slate-600">{event.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Create Webhook
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}