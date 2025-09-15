import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Book, Code, Play, ExternalLink, Copy, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import { GlassmorphicCard } from '../../ui/GlassmorphicCard'
import { APITestingInterface } from './APITestingInterface'
import { CodeExamples } from './CodeExamples'

interface APIEndpoint {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  title: string
  description: string
  category: string
  authentication: boolean
  rateLimit: string
  example: {
    request: any
    response: any
    curl: string
  }
}

const API_ENDPOINTS: APIEndpoint[] = [
  {
    id: 'upload-pdf',
    method: 'POST',
    path: '/api/v1/processing/upload',
    title: 'Upload PDF',
    description: 'Upload a PDF file for processing',
    category: 'Processing',
    authentication: true,
    rateLimit: '100/hour',
    example: {
      request: {
        file: 'binary',
        processing_type: 'compress',
        options: {
          quality: 'high',
          preserve_metadata: true
        }
      },
      response: {
        job_id: 'job_1234567890',
        status: 'queued',
        estimated_time: '6s',
        file_info: {
          name: 'document.pdf',
          size: '2.4MB',
          pages: 15
        }
      },
      curl: `curl -X POST "https://api.pdfsaas.com/v1/processing/upload" \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@document.pdf" \\
  -F "processing_type=compress" \\
  -F "options[quality]=high"`
    }
  },
  {
    id: 'job-status',
    method: 'GET',
    path: '/api/v1/processing/jobs/{job_id}',
    title: 'Get Job Status',
    description: 'Check the status of a processing job',
    category: 'Processing',
    authentication: true,
    rateLimit: '1000/hour',
    example: {
      request: null,
      response: {
        job_id: 'job_1234567890',
        status: 'completed',
        progress: 100,
        processing_time: '4.2s',
        result: {
          download_url: 'https://api.pdfsaas.com/v1/files/download/abc123',
          file_size: '1.8MB',
          compression_ratio: '25%',
          expires_at: '2024-12-15T10:30:00Z'
        }
      },
      curl: `curl -X GET "https://api.pdfsaas.com/v1/processing/jobs/job_1234567890" \\
  -H "X-API-Key: your_api_key"`
    }
  },
  {
    id: 'compress-pdf',
    method: 'POST',
    path: '/api/v1/processing/compress',
    title: 'Compress PDF',
    description: 'Compress a PDF file with specified quality settings',
    category: 'Processing',
    authentication: true,
    rateLimit: '100/hour',
    example: {
      request: {
        file: 'binary',
        quality: 'medium',
        preserve_images: true,
        preserve_fonts: true
      },
      response: {
        job_id: 'job_compress_123',
        original_size: '5.2MB',
        estimated_compressed_size: '2.1MB',
        estimated_time: '5s'
      },
      curl: `curl -X POST "https://api.pdfsaas.com/v1/processing/compress" \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@large_document.pdf" \\
  -F "quality=medium"`
    }
  },
  {
    id: 'convert-pdf',
    method: 'POST',
    path: '/api/v1/processing/convert',
    title: 'Convert PDF',
    description: 'Convert PDF to various formats (DOCX, JPG, PNG, etc.)',
    category: 'Processing',
    authentication: true,
    rateLimit: '50/hour',
    example: {
      request: {
        file: 'binary',
        output_format: 'docx',
        options: {
          include_images: true,
          preserve_layout: true
        }
      },
      response: {
        job_id: 'job_convert_456',
        output_format: 'docx',
        estimated_time: '8s',
        file_info: {
          pages: 12,
          images: 5,
          tables: 3
        }
      },
      curl: `curl -X POST "https://api.pdfsaas.com/v1/processing/convert" \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@document.pdf" \\
  -F "output_format=docx"`
    }
  },
  {
    id: 'split-pdf',
    method: 'POST',
    path: '/api/v1/processing/split',
    title: 'Split PDF',
    description: 'Split PDF into multiple files by pages or size',
    category: 'Processing',
    authentication: true,
    rateLimit: '50/hour',
    example: {
      request: {
        file: 'binary',
        split_type: 'pages',
        pages_per_file: 5
      },
      response: {
        job_id: 'job_split_789',
        total_pages: 20,
        estimated_files: 4,
        estimated_time: '3s'
      },
      curl: `curl -X POST "https://api.pdfsaas.com/v1/processing/split" \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@multi_page.pdf" \\
  -F "split_type=pages" \\
  -F "pages_per_file=5"`
    }
  },
  {
    id: 'merge-pdfs',
    method: 'POST',
    path: '/api/v1/processing/merge',
    title: 'Merge PDFs',
    description: 'Merge multiple PDF files into a single document',
    category: 'Processing',
    authentication: true,
    rateLimit: '25/hour',
    example: {
      request: {
        files: ['binary', 'binary'],
        order: [0, 1],
        add_bookmarks: true
      },
      response: {
        job_id: 'job_merge_101',
        total_files: 2,
        total_pages: 35,
        estimated_time: '4s'
      },
      curl: `curl -X POST "https://api.pdfsaas.com/v1/processing/merge" \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: multipart/form-data" \\
  -F "files[]=@doc1.pdf" \\
  -F "files[]=@doc2.pdf" \\
  -F "add_bookmarks=true"`
    }
  }
]

export const APIDashboard: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint>(API_ENDPOINTS[0])
  const [activeTab, setActiveTab] = useState<'overview' | 'endpoints' | 'examples' | 'sdks'>('overview')
  const [copiedCode, setCopiedCode] = useState<string>('')

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(type)
      setTimeout(() => setCopiedCode(''), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800'
      case 'POST': return 'bg-blue-100 text-blue-800'
      case 'PUT': return 'bg-yellow-100 text-yellow-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const categories = Array.from(new Set(API_ENDPOINTS.map(ep => ep.category)))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">API Documentation</h1>
        <p className="text-slate-600 mb-6">
          Integrate PDF processing into your applications with our powerful REST API
        </p>

        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">99.9% Uptime</span>
          </div>
          <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">Sub-6s Processing</span>
          </div>
          <div className="flex items-center space-x-2 bg-purple-50 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-purple-700">Rate Limited</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <GlassmorphicCard className="p-1">
        <div className="flex space-x-1">
          {[
            { id: 'overview', label: 'Overview', icon: Book },
            { id: 'endpoints', label: 'API Endpoints', icon: Code },
            { id: 'examples', label: 'Live Examples', icon: Play },
            { id: 'sdks', label: 'SDKs & Libraries', icon: ExternalLink }
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
              <span className="hidden sm:block">{label}</span>
            </button>
          ))}
        </div>
      </GlassmorphicCard>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Start */}
          <GlassmorphicCard className="p-6">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Quick Start</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-slate-800">Get API Key</h4>
                  <p className="text-sm text-slate-600">Sign up and generate your API key from the dashboard</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-slate-800">Make Request</h4>
                  <p className="text-sm text-slate-600">Send PDF files to our processing endpoints</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-slate-800">Get Results</h4>
                  <p className="text-sm text-slate-600">Download processed files or get conversion results</p>
                </div>
              </div>
            </div>
          </GlassmorphicCard>

          {/* Rate Limits */}
          <GlassmorphicCard className="p-6">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Rate Limits</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">File Upload</span>
                <span className="font-medium text-slate-800">100/hour</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Job Status Check</span>
                <span className="font-medium text-slate-800">1,000/hour</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">File Download</span>
                <span className="font-medium text-slate-800">500/hour</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Webhook Calls</span>
                <span className="font-medium text-slate-800">Unlimited</span>
              </div>
            </div>
          </GlassmorphicCard>

          {/* Authentication */}
          <GlassmorphicCard className="p-6 lg:col-span-2">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Authentication</h3>
            <p className="text-slate-600 mb-4">
              All API requests require authentication using your API key in the request header.
            </p>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-800">Header Authentication</h4>
                <button
                  onClick={() => copyToClipboard('X-API-Key: your_api_key_here', 'auth')}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {copiedCode === 'auth' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <code className="text-sm text-slate-700">X-API-Key: your_api_key_here</code>
            </div>
          </GlassmorphicCard>
        </div>
      )}

      {activeTab === 'endpoints' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Endpoint List */}
          <div className="lg:col-span-1">
            <GlassmorphicCard className="p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Endpoints</h3>
              <div className="space-y-2">
                {categories.map(category => (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-slate-600 mb-2">{category}</h4>
                    <div className="space-y-1 mb-4">
                      {API_ENDPOINTS.filter(ep => ep.category === category).map(endpoint => (
                        <button
                          key={endpoint.id}
                          onClick={() => setSelectedEndpoint(endpoint)}
                          className={`w-full text-left p-2 rounded-lg transition-colors ${
                            selectedEndpoint.id === endpoint.id
                              ? 'bg-blue-50 border border-blue-200'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMethodColor(endpoint.method)}`}>
                              {endpoint.method}
                            </span>
                            <span className="text-sm font-medium text-slate-800">{endpoint.title}</span>
                          </div>
                          <p className="text-xs text-slate-600">{endpoint.path}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </GlassmorphicCard>
          </div>

          {/* Endpoint Details */}
          <div className="lg:col-span-2">
            <GlassmorphicCard className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className={`px-3 py-1 rounded text-sm font-medium ${getMethodColor(selectedEndpoint.method)}`}>
                  {selectedEndpoint.method}
                </span>
                <h3 className="text-xl font-semibold text-slate-800">{selectedEndpoint.title}</h3>
              </div>

              <p className="text-slate-600 mb-4">{selectedEndpoint.description}</p>

              <div className="bg-slate-50 rounded-lg p-3 mb-4">
                <code className="text-sm text-slate-700">{selectedEndpoint.path}</code>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="font-medium text-slate-800 mb-2">Authentication</h4>
                  <span className={`px-2 py-1 rounded text-xs ${
                    selectedEndpoint.authentication ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {selectedEndpoint.authentication ? 'Required' : 'Not Required'}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-slate-800 mb-2">Rate Limit</h4>
                  <span className="text-sm text-slate-600">{selectedEndpoint.rateLimit}</span>
                </div>
              </div>

              {/* Request Example */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-slate-800">Request</h4>
                  <button
                    onClick={() => copyToClipboard(selectedEndpoint.example.curl, 'request')}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {copiedCode === 'request' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-green-400">
                    <code>{selectedEndpoint.example.curl}</code>
                  </pre>
                </div>
              </div>

              {/* Response Example */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-slate-800">Response</h4>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(selectedEndpoint.example.response, null, 2), 'response')}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {copiedCode === 'response' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-green-400">
                    <code>{JSON.stringify(selectedEndpoint.example.response, null, 2)}</code>
                  </pre>
                </div>
              </div>
            </GlassmorphicCard>
          </div>
        </div>
      )}

      {activeTab === 'examples' && <APITestingInterface />}

      {activeTab === 'sdks' && <CodeExamples />}
    </div>
  )
}