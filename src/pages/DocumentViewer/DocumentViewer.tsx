import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GlassmorphicCard } from '../../components/ui/GlassmorphicCard'
import { Header } from '../../components/layout'

export const DocumentViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isLoading] = useState(false)

  // Mock document data - replace with actual API call
  const document = {
    id: id || '1',
    name: 'Sample Document.pdf',
    pages: 15,
    processingTime: '3.2s',
    size: '2.4 MB'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-6">
        <Header />

        {/* Toolbar */}
        <GlassmorphicCard className="p-4 mb-6">
          <div className="flex items-center justify-between">
            {/* Back Button & Document Info */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center px-3 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>

              <div className="h-6 w-px bg-slate-300" />

              <div>
                <h1 className="text-lg font-semibold text-slate-800">{document.name}</h1>
                <div className="flex items-center space-x-4 text-sm text-slate-500">
                  <span>{document.pages} pages</span>
                  <span>•</span>
                  <span>{document.size}</span>
                  <span>•</span>
                  <span className="text-green-600">Processed in {document.processingTime}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button className="px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-700 transition-colors">
                Share
              </button>
              <button className="px-3 py-2 bg-green-50 hover:bg-green-100 rounded-lg text-sm text-green-700 transition-colors">
                Download
              </button>
              <button className="px-3 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-sm text-purple-700 transition-colors">
                Annotate
              </button>
            </div>
          </div>
        </GlassmorphicCard>

        {/* Main Content */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Document Viewer */}
          <div className="lg:col-span-4">
            <GlassmorphicCard className="p-6 min-h-[600px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center animate-pulse mx-auto mb-4">
                      <div className="h-8 w-8 rounded-full border-4 border-white border-t-transparent animate-spin" />
                    </div>
                    <p className="text-slate-600">Loading document...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Document Preview Placeholder */}
                  <div className="bg-white rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
                    <svg className="h-16 w-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-slate-700 mb-2">PDF Viewer Coming Soon</h3>
                    <p className="text-slate-500 mb-4">
                      High-resolution PDF rendering with mobile-optimized viewing
                    </p>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p>📄 Document: {document.name}</p>
                      <p>📊 Pages: {document.pages}</p>
                      <p>⚡ Processing Speed: {document.processingTime} (vs Adobe 45s+)</p>
                    </div>
                  </div>
                </div>
              )}
            </GlassmorphicCard>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Processing Stats */}
            <GlassmorphicCard className="p-4">
              <h3 className="font-semibold mb-3 text-slate-700">Processing Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Speed</span>
                  <span className="text-green-600 font-medium">{document.processingTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">vs Adobe</span>
                  <span className="text-blue-600 font-medium">14x faster</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">File Size</span>
                  <span className="text-slate-700">{document.size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Pages</span>
                  <span className="text-slate-700">{document.pages}</span>
                </div>
              </div>
            </GlassmorphicCard>

            {/* Tools */}
            <GlassmorphicCard className="p-4">
              <h3 className="font-semibold mb-3 text-slate-700">Tools</h3>
              <div className="space-y-2">
                <button className="w-full px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left">
                  🖊️ Annotate
                </button>
                <button className="w-full px-3 py-2 text-sm bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left">
                  📝 Add Notes
                </button>
                <button className="w-full px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left">
                  🔍 Search Text
                </button>
                <button className="w-full px-3 py-2 text-sm bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors text-left">
                  📑 Split Pages
                </button>
              </div>
            </GlassmorphicCard>

            {/* Collaboration */}
            <GlassmorphicCard className="p-4">
              <h3 className="font-semibold mb-3 text-slate-700">Collaboration</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="h-6 w-6 rounded-full bg-green-500"></div>
                  <span className="text-slate-600">You</span>
                </div>
                <div className="text-xs text-slate-500">
                  Invite others to collaborate on this document
                </div>
                <button className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Share Document
                </button>
              </div>
            </GlassmorphicCard>
          </div>
        </div>
      </div>
    </div>
  )
}