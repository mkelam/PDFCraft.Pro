import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  Minimize,
  Scissors,
  Merge,
  RotateCw,
  Image,
  Type,
  Download,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Settings
} from 'lucide-react'
import { pdfProcessor, PDFProcessingOptions, ProcessingResult, ProcessingProgress } from '../../../services/pdfProcessor'
import { downloadTestPDF } from '../../../utils/createTestPDF'
import { ProgressIndicator } from '../../ui/ProgressIndicator'

interface UploadedFile {
  id: string
  file: File
  preview: {
    name: string
    size: string
    pages?: number
    version?: string
    error?: string
  }
  status: 'idle' | 'processing' | 'completed' | 'error'
  result?: ProcessingResult
}

export const PDFUploadProcessor: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [activeOperation, setActiveOperation] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState<string | null>(null)
  const [mergeProgress, setMergeProgress] = useState<ProcessingProgress | null>(null)
  const [mergeProcessId, setMergeProcessId] = useState<string | null>(null)

  const operations = [
    {
      id: 'compress',
      title: 'Compress PDF',
      description: 'Reduce file size while maintaining quality',
      icon: Minimize,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20'
    },
    {
      id: 'split',
      title: 'Split PDF',
      description: 'Extract specific pages or split into multiple files',
      icon: Scissors,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10 border-green-500/20'
    },
    {
      id: 'merge',
      title: 'Merge PDFs',
      description: 'Combine multiple PDF files into one',
      icon: Merge,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/20'
    },
    {
      id: 'rotate',
      title: 'Rotate Pages',
      description: 'Rotate pages 90°, 180°, or 270°',
      icon: RotateCw,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10 border-orange-500/20'
    },
    {
      id: 'watermark',
      title: 'Add Watermark',
      description: 'Add text watermark to all pages',
      icon: Type,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/20'
    },
    {
      id: 'convert',
      title: 'Convert to JPG',
      description: 'Convert PDF pages to image format',
      icon: Image,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10 border-pink-500/20'
    }
  ]

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    await handleFiles(droppedFiles)
  }, [])

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      await handleFiles(selectedFiles)
    }
  }, [])

  const handleFiles = async (fileList: File[]) => {
    // Accept PDF files and files with .pdf extension
    const pdfFiles = fileList.filter(file =>
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    )

    if (pdfFiles.length === 0) {
      alert('Please select PDF files only.')
      return
    }

    for (const file of pdfFiles) {
      const fileId = Math.random().toString(36).substr(2, 9)

      console.log(`Processing uploaded file: ${file.name}`)

      const preview = await pdfProcessor.getFileInfo(file)

      const uploadedFile: UploadedFile = {
        id: fileId,
        file,
        preview,
        status: preview.error ? 'error' : 'idle'
      }

      if (preview.error) {
        console.error(`File ${file.name} has error: ${preview.error}`)
      }

      setFiles(prev => [...prev, uploadedFile])
    }

    // Show warning for non-PDF files
    const nonPdfFiles = fileList.filter(file =>
      file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')
    )

    if (nonPdfFiles.length > 0) {
      alert(`Skipped ${nonPdfFiles.length} non-PDF files. Only PDF files are supported.`)
    }
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId))
  }

  const processFile = async (fileId: string, operation: string, options: PDFProcessingOptions = {}) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return

    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: 'processing' } : f
    ))

    setActiveOperation(`${fileId}-${operation}`)

    let result: ProcessingResult

    try {
      switch (operation) {
        case 'compress':
          result = await pdfProcessor.compressPDF(file.file, options)
          break
        case 'split':
          result = await pdfProcessor.splitPDF(file.file, options)
          break
        case 'rotate':
          result = await pdfProcessor.rotatePDF(file.file, options.rotation || 90, options)
          break
        case 'watermark':
          result = await pdfProcessor.addWatermark(file.file, options.watermarkText || 'CONFIDENTIAL', options)
          break
        case 'convert':
          result = await pdfProcessor.convertToJPG(file.file, options)
          break
        default:
          result = { success: false, message: 'Unknown operation' }
      }

      setFiles(prev => prev.map(f =>
        f.id === fileId ? {
          ...f,
          status: result.success ? 'completed' : 'error',
          result
        } : f
      ))
    } catch (error) {
      setFiles(prev => prev.map(f =>
        f.id === fileId ? {
          ...f,
          status: 'error',
          result: { success: false, message: 'Processing failed' }
        } : f
      ))
    }

    setActiveOperation(null)
    setShowOptions(null)
  }

  const processMerge = async () => {
    if (files.length < 2) {
      alert('Please upload at least 2 PDF files to merge')
      return
    }

    setActiveOperation('merge-all')
    setMergeProgress(null)

    try {
      const fileList = files.map(f => f.file)
      const result = await pdfProcessor.mergePDFs(fileList, {
        outputName: 'merged_document.pdf',
        enableProgressTracking: true
      })

      // Set up progress tracking
      if (result.processId) {
        setMergeProcessId(result.processId)
        pdfProcessor.setProgressCallback(result.processId, (progress) => {
          setMergeProgress(progress)
        })
      }

      if (result.success) {
        // Show success message
        alert(`Successfully merged ${files.length} PDFs! Download should start automatically.`)
        // Clear all files after successful merge
        setFiles([])
        setMergeProgress(null)
        setMergeProcessId(null)
      } else {
        // Show error message
        alert(`Merge failed: ${result.message}`)
        setMergeProgress(null)
        setMergeProcessId(null)
      }
    } catch (error) {
      alert(`Merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMergeProgress(null)
      setMergeProcessId(null)
    }

    setActiveOperation(null)
  }

  const cancelMerge = () => {
    if (mergeProcessId) {
      pdfProcessor.cancelProcess(mergeProcessId)
      setMergeProgress(null)
      setMergeProcessId(null)
      setActiveOperation(null)
      alert('Merge operation cancelled')
    }
  }

  return (
    <div className="space-y-8">
      {/* Upload Area */}
      <div className="premium-card">
        <h2 className="text-xl font-semibold text-white mb-6">PDF Document Processor</h2>

        <div
          className={`border-2 border-dashed rounded-2xl h-32 flex flex-col items-center justify-center transition-all cursor-pointer ${
            dragActive
              ? 'border-white bg-[var(--color-bg-elevated)]'
              : 'border-[var(--color-border-secondary)] hover:border-[var(--color-border-accent)]'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Upload className="w-8 h-8 text-[var(--color-text-secondary)] mb-2" />
          <p className="text-[var(--color-text-secondary)] text-center">
            Drop PDF files here or click to browse
          </p>
          <p className="text-[var(--color-text-tertiary)] text-sm mb-4">
            Supports multiple files for batch processing
          </p>
          <div className="flex space-x-3">
            <button
              onClick={downloadTestPDF}
              className="premium-button premium-button-secondary text-sm"
            >
              Download Test PDF
            </button>
          </div>
        </div>

        <input
          id="file-upload"
          type="file"
          multiple
          accept=".pdf"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* Progress Indicator */}
      <AnimatePresence>
        {mergeProgress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ProgressIndicator
              progress={mergeProgress}
              onCancel={cancelMerge}
              showCancel={mergeProgress.stage !== 'complete'}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="premium-card"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                Uploaded Files ({files.length})
              </h3>
              {files.length > 1 && (
                <button
                  onClick={processMerge}
                  disabled={activeOperation === 'merge-all'}
                  className="premium-button premium-button-primary flex items-center space-x-2"
                >
                  {activeOperation === 'merge-all' ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <Merge className="w-4 h-4" />
                  )}
                  <span>Merge All</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="w-10 h-10 bg-[var(--color-bg-tertiary)] rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[var(--color-text-secondary)]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate">
                          {file.preview.name}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-[var(--color-text-tertiary)] mt-1">
                          <span>{file.preview.size}</span>
                          {file.preview.pages && <span>{file.preview.pages} pages</span>}
                          <div className="flex items-center space-x-1">
                            {file.status === 'processing' && (
                              <>
                                <Clock className="w-3 h-3 animate-spin" />
                                <span>Processing...</span>
                              </>
                            )}
                            {file.status === 'completed' && (
                              <>
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                <span className="text-green-400">Completed</span>
                              </>
                            )}
                            {file.status === 'error' && (
                              <>
                                <AlertCircle className="w-3 h-3 text-red-400" />
                                <span className="text-red-400">Error</span>
                              </>
                            )}
                          </div>
                        </div>

                        {(file.result || file.preview.error) && (
                          <div className="mt-2 p-2 rounded bg-[var(--color-bg-tertiary)] text-sm">
                            {file.preview.error && (
                              <p className="text-red-400">
                                Load Error: {file.preview.error}
                              </p>
                            )}
                            {file.result && (
                              <p className={file.result.success ? 'text-green-400' : 'text-red-400'}>
                                {file.result.message}
                              </p>
                            )}
                            {file.result?.processingTime && (
                              <p className="text-[var(--color-text-tertiary)] text-xs mt-1">
                                Processed in {file.result.processingTime}ms
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => setShowOptions(showOptions === file.id ? null : file.id)}
                        className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded transition-colors"
                        disabled={file.status === 'processing'}
                      >
                        <Settings className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      </button>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-2 hover:bg-red-500/20 rounded transition-colors"
                        disabled={file.status === 'processing'}
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Operations Panel */}
                  <AnimatePresence>
                    {showOptions === file.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-[var(--color-border-primary)]"
                      >
                        <h5 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">
                          Choose Operation:
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {operations.map((operation) => {
                            const Icon = operation.icon
                            const isActive = activeOperation === `${file.id}-${operation.id}`

                            return (
                              <button
                                key={operation.id}
                                onClick={() => processFile(file.id, operation.id)}
                                disabled={file.status === 'processing' || isActive}
                                className={`p-3 rounded-lg border ${operation.bgColor} hover:bg-opacity-80 transition-all text-left disabled:opacity-50`}
                              >
                                <div className="flex items-center space-x-2 mb-1">
                                  {isActive ? (
                                    <Clock className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Icon className={`w-4 h-4 ${operation.color}`} />
                                  )}
                                  <span className="text-sm font-medium text-white">
                                    {operation.title}
                                  </span>
                                </div>
                                <p className="text-xs text-[var(--color-text-tertiary)]">
                                  {operation.description}
                                </p>
                              </button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing Stats */}
      {files.some(f => f.result) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-card bg-green-500/5 border-green-500/20"
        >
          <div className="flex items-center space-x-3 mb-4">
            <Zap className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Processing Summary</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-[var(--color-text-tertiary)]">Total Processed</span>
              <div className="text-white font-medium">
                {files.filter(f => f.status === 'completed').length} files
              </div>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">Success Rate</span>
              <div className="text-green-400 font-medium">
                {Math.round((files.filter(f => f.status === 'completed').length / files.length) * 100)}%
              </div>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">Avg Processing Time</span>
              <div className="text-white font-medium">
                {Math.round(
                  files
                    .filter(f => f.result?.processingTime)
                    .reduce((acc, f) => acc + (f.result?.processingTime || 0), 0) /
                  files.filter(f => f.result?.processingTime).length
                )}ms
              </div>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">Total Operations</span>
              <div className="text-white font-medium">
                {files.filter(f => f.result).length}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}