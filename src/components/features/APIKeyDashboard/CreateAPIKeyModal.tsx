import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Key, Shield, Clock, AlertCircle, CheckCircle, Copy } from 'lucide-react'

interface CreateAPIKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (keyData: any) => Promise<void>
}

interface APIKeyForm {
  name: string
  description: string
  scopes: string[]
  rate_limit_per_hour: number
  expires_at: string
}

export const CreateAPIKeyModal: React.FC<CreateAPIKeyModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<APIKeyForm>({
    name: '',
    description: '',
    scopes: ['read', 'write'],
    rate_limit_per_hour: 1000,
    expires_at: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [createdKey, setCreatedKey] = useState<string>('')
  const [step, setStep] = useState<'form' | 'success'>('form')

  const availableScopes = [
    { id: 'read', name: 'Read', description: 'Get job status, download processed files' },
    { id: 'write', name: 'Write', description: 'Upload and process PDF files' },
    { id: 'admin', name: 'Admin', description: 'Manage API keys and account settings' },
    { id: 'webhook', name: 'Webhook', description: 'Receive webhook notifications' }
  ]

  const rateLimitPresets = [
    { value: 100, label: '100/hour - Development', description: 'Perfect for testing and development' },
    { value: 1000, label: '1,000/hour - Production', description: 'Standard production workloads' },
    { value: 5000, label: '5,000/hour - High Volume', description: 'High-traffic applications' },
    { value: 10000, label: '10,000/hour - Enterprise', description: 'Enterprise-level processing' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      // Validate form
      if (!formData.name.trim()) {
        throw new Error('API key name is required')
      }

      if (formData.scopes.length === 0) {
        throw new Error('At least one scope must be selected')
      }

      // Submit the form
      await onSubmit(formData)

      // For demo, generate a fake key
      const demoKey = `pdfsaas_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
      setCreatedKey(demoKey)
      setStep('success')
    } catch (err: any) {
      setError(err.message || 'Failed to create API key')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleScopeToggle = (scopeId: string) => {
    setFormData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scopeId)
        ? prev.scopes.filter(s => s !== scopeId)
        : [...prev.scopes, scopeId]
    }))
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(createdKey)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const handleClose = () => {
    setStep('form')
    setFormData({
      name: '',
      description: '',
      scopes: ['read', 'write'],
      rate_limit_per_hour: 1000,
      expires_at: ''
    })
    setError('')
    setCreatedKey('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <Key className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {step === 'form' ? 'Create API Key' : 'API Key Created'}
                    </h2>
                    <p className="text-gray-600 text-sm">
                      {step === 'form'
                        ? 'Generate a new API key for your application'
                        : 'Your API key has been generated successfully'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {step === 'form' ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start"
                      >
                        <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                        <p className="text-red-700 text-sm">{error}</p>
                      </motion.div>
                    )}

                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                          Key Name *
                        </label>
                        <input
                          id="name"
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Production API Key"
                        />
                      </div>

                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                          placeholder="Optional description for this API key"
                        />
                      </div>
                    </div>

                    {/* Permissions */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <Shield className="w-5 h-5 mr-2" />
                        Permissions
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableScopes.map((scope) => (
                          <label
                            key={scope.id}
                            className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                              formData.scopes.includes(scope.id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.scopes.includes(scope.id)}
                              onChange={() => handleScopeToggle(scope.id)}
                              className="mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="ml-3">
                              <div className="font-medium text-gray-900">{scope.name}</div>
                              <div className="text-sm text-gray-600">{scope.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Rate Limiting */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <Clock className="w-5 h-5 mr-2" />
                        Rate Limiting
                      </h3>

                      <div className="space-y-3">
                        {rateLimitPresets.map((preset) => (
                          <label
                            key={preset.value}
                            className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                              formData.rate_limit_per_hour === preset.value
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="rate_limit"
                              checked={formData.rate_limit_per_hour === preset.value}
                              onChange={() => setFormData(prev => ({ ...prev, rate_limit_per_hour: preset.value }))}
                              className="mt-1 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="ml-3">
                              <div className="font-medium text-gray-900">{preset.label}</div>
                              <div className="text-sm text-gray-600">{preset.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Expiration */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Expiration</h3>

                      <div>
                        <label htmlFor="expires_at" className="block text-sm font-medium text-gray-700 mb-2">
                          Expiration Date (Optional)
                        </label>
                        <input
                          id="expires_at"
                          type="date"
                          value={formData.expires_at}
                          onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min={new Date().toISOString().split('T')[0]}
                        />
                        <p className="text-sm text-gray-600 mt-1">
                          Leave empty for no expiration
                        </p>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSubmitting ? 'Creating...' : 'Create API Key'}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Success State */
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">API Key Created!</h3>
                      <p className="text-gray-600">
                        Your API key has been generated. Make sure to copy it now - you won't be able to see it again.
                      </p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-yellow-800">Important!</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            This is the only time you'll see the full API key. Make sure to copy and store it securely.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your API Key
                      </label>
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-50 rounded-lg p-3 font-mono text-sm break-all">
                          {createdKey}
                        </div>
                        <button
                          onClick={copyToClipboard}
                          className="ml-2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Quick Start</h4>
                      <pre className="text-sm text-gray-700 overflow-x-auto">
{`curl -X POST "https://api.pdfsaas.com/processing/compress" \\
  -H "X-API-Key: ${createdKey}" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@document.pdf"`}
                      </pre>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleClose}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}