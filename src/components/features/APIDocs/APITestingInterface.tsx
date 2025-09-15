import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Send, Key, Upload, Download, AlertCircle, CheckCircle, Clock, Code } from 'lucide-react'
import { GlassmorphicCard } from '../../ui/GlassmorphicCard'

interface TestRequest {
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers: Record<string, string>
  body?: any
  file?: File
}

interface TestResponse {
  status: number
  statusText: string
  data: any
  headers: Record<string, string>
  duration: number
}

export const APITestingInterface: React.FC = () => {
  const [apiKey, setApiKey] = useState('')
  const [selectedEndpoint, setSelectedEndpoint] = useState('/api/v1/processing/upload')
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('POST')
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>({})
  const [requestBody, setRequestBody] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<TestResponse | null>(null)
  const [error, setError] = useState('')

  const endpoints = [
    { path: '/api/v1/processing/upload', method: 'POST', description: 'Upload PDF for processing' },
    { path: '/api/v1/processing/jobs/{job_id}', method: 'GET', description: 'Get job status' },
    { path: '/api/v1/processing/compress', method: 'POST', description: 'Compress PDF' },
    { path: '/api/v1/processing/convert', method: 'POST', description: 'Convert PDF format' },
    { path: '/api/v1/processing/split', method: 'POST', description: 'Split PDF into multiple files' },
    { path: '/api/v1/processing/merge', method: 'POST', description: 'Merge multiple PDFs' },
    { path: '/api/v1/files/download/{file_id}', method: 'GET', description: 'Download processed file' },
    { path: '/api/v1/account/usage', method: 'GET', description: 'Get usage statistics' }
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const addCustomHeader = () => {
    const key = prompt('Header name:')
    const value = prompt('Header value:')
    if (key && value) {
      setCustomHeaders(prev => ({ ...prev, [key]: value }))
    }
  }

  const removeCustomHeader = (key: string) => {
    setCustomHeaders(prev => {
      const newHeaders = { ...prev }
      delete newHeaders[key]
      return newHeaders
    })
  }

  const sendTestRequest = async () => {
    if (!apiKey) {
      setError('API key is required')
      return
    }

    setIsLoading(true)
    setError('')
    setResponse(null)

    try {
      const startTime = Date.now()

      // Simulate API request (in real implementation, this would make actual HTTP requests)
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate network delay

      // Mock response based on endpoint
      let mockResponse: any = {}

      switch (selectedEndpoint) {
        case '/api/v1/processing/upload':
          mockResponse = {
            status: 201,
            statusText: 'Created',
            data: {
              job_id: `job_${Date.now()}`,
              status: 'queued',
              estimated_time: '6s',
              file_info: {
                name: selectedFile?.name || 'test.pdf',
                size: selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)}MB` : '2.4MB',
                pages: 15
              }
            },
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': `req_${Date.now()}`
            },
            duration: Date.now() - startTime
          }
          break

        case '/api/v1/processing/jobs/{job_id}':
          mockResponse = {
            status: 200,
            statusText: 'OK',
            data: {
              job_id: 'job_1234567890',
              status: 'completed',
              progress: 100,
              processing_time: '4.2s',
              result: {
                download_url: 'https://api.pdfsaas.com/v1/files/download/abc123',
                file_size: '1.8MB',
                compression_ratio: '25%',
                expires_at: new Date(Date.now() + 3600000).toISOString()
              }
            },
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': `req_${Date.now()}`
            },
            duration: Date.now() - startTime
          }
          break

        case '/api/v1/account/usage':
          mockResponse = {
            status: 200,
            statusText: 'OK',
            data: {
              current_period: {
                requests_used: 145,
                requests_limit: 1000,
                period_start: '2024-12-01T00:00:00Z',
                period_end: '2024-12-31T23:59:59Z'
              },
              total_usage: {
                files_processed: 2847,
                data_processed: '142.3GB',
                average_processing_time: '5.2s'
              }
            },
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': `req_${Date.now()}`
            },
            duration: Date.now() - startTime
          }
          break

        default:
          mockResponse = {
            status: 200,
            statusText: 'OK',
            data: { message: 'Mock response for testing' },
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': `req_${Date.now()}`
            },
            duration: Date.now() - startTime
          }
      }

      setResponse(mockResponse)

    } catch (err: any) {
      setError(err.message || 'Request failed')
    } finally {
      setIsLoading(false)
    }
  }

  const generateCurlCommand = () => {
    let curl = `curl -X ${method} "https://api.pdfsaas.com${selectedEndpoint}"`
    curl += ` \\\n  -H "X-API-Key: ${apiKey || 'your_api_key'}"`

    Object.entries(customHeaders).forEach(([key, value]) => {
      curl += ` \\\n  -H "${key}: ${value}"`
    })

    if (method === 'POST' && selectedFile) {
      curl += ` \\\n  -H "Content-Type: multipart/form-data"`
      curl += ` \\\n  -F "file=@${selectedFile.name}"`
    }

    if (requestBody && method !== 'GET') {
      curl += ` \\\n  -d '${requestBody}'`
    }

    return curl
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Builder */}
        <GlassmorphicCard className="p-6">
          <h3 className="text-xl font-semibold text-slate-800 mb-6 flex items-center">
            <Send className="w-5 h-5 mr-2" />
            Request Builder
          </h3>

          {/* API Key */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              API Key *
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your API key"
              />
            </div>
          </div>

          {/* Endpoint Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Endpoint
            </label>
            <select
              value={selectedEndpoint}
              onChange={(e) => {
                setSelectedEndpoint(e.target.value)
                const endpoint = endpoints.find(ep => ep.path === e.target.value)
                if (endpoint) {
                  setMethod(endpoint.method as any)
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {endpoints.map(endpoint => (
                <option key={endpoint.path} value={endpoint.path}>
                  {endpoint.method} {endpoint.path} - {endpoint.description}
                </option>
              ))}
            </select>
          </div>

          {/* Method */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              HTTP Method
            </label>
            <div className="flex space-x-2">
              {(['GET', 'POST', 'PUT', 'DELETE'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    method === m
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* File Upload */}
          {(selectedEndpoint.includes('upload') || selectedEndpoint.includes('compress') ||
            selectedEndpoint.includes('convert') || selectedEndpoint.includes('split')) && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                File Upload
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-sm text-slate-600">
                    {selectedFile ? selectedFile.name : 'Click to select PDF file'}
                  </span>
                  {selectedFile && (
                    <span className="text-xs text-slate-500 mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* Request Body */}
          {method !== 'GET' && !selectedEndpoint.includes('upload') && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Request Body (JSON)
              </label>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder='{"key": "value"}'
              />
            </div>
          )}

          {/* Custom Headers */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Custom Headers
              </label>
              <button
                onClick={addCustomHeader}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                + Add Header
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(customHeaders).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={key}
                    readOnly
                    className="flex-1 px-3 py-1 border border-slate-300 rounded bg-slate-50 text-sm"
                  />
                  <input
                    type="text"
                    value={value}
                    readOnly
                    className="flex-1 px-3 py-1 border border-slate-300 rounded bg-slate-50 text-sm"
                  />
                  <button
                    onClick={() => removeCustomHeader(key)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={sendTestRequest}
            disabled={isLoading || !apiKey}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>Sending Request...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Send Request</span>
              </>
            )}
          </button>
        </GlassmorphicCard>

        {/* Response Display */}
        <GlassmorphicCard className="p-6">
          <h3 className="text-xl font-semibold text-slate-800 mb-6 flex items-center">
            <Download className="w-5 h-5 mr-2" />
            Response
          </h3>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start"
            >
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </motion.div>
          )}

          {response && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Status */}
              <div className="flex items-center space-x-4">
                <div className={`px-3 py-1 rounded text-sm font-medium ${
                  response.status >= 200 && response.status < 300
                    ? 'bg-green-100 text-green-700'
                    : response.status >= 400
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {response.status} {response.statusText}
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <Clock className="w-4 h-4 mr-1" />
                  {response.duration}ms
                </div>
              </div>

              {/* Response Body */}
              <div>
                <h4 className="font-medium text-slate-800 mb-2">Response Body</h4>
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-green-400">
                    <code>{JSON.stringify(response.data, null, 2)}</code>
                  </pre>
                </div>
              </div>

              {/* Response Headers */}
              <div>
                <h4 className="font-medium text-slate-800 mb-2">Response Headers</h4>
                <div className="bg-slate-50 rounded-lg p-3">
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{key}:</span>
                      <span className="text-slate-600">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {!response && !error && !isLoading && (
            <div className="text-center py-8">
              <Code className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-slate-900 mb-2">Ready to Test</h4>
              <p className="text-slate-600">Configure your request and click "Send Request" to see the response here.</p>
            </div>
          )}
        </GlassmorphicCard>
      </div>

      {/* cURL Command */}
      <GlassmorphicCard className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Generated cURL Command</h3>
        <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-green-400">
            <code>{generateCurlCommand()}</code>
          </pre>
        </div>
      </GlassmorphicCard>

      {/* Demo Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">Demo Mode</h4>
            <p className="text-sm text-blue-700 mt-1">
              This interface currently returns mock responses for demonstration purposes.
              In production, it would make real API calls to our processing endpoints.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}