import React, { useState, useRef } from 'react'
import { X, Upload, AlertCircle } from 'lucide-react'
import { PDFProcessingAPI } from '../../../services/api'
import { ErrorHandlingService } from '../../../services/errorHandler'

export interface CancellableUploadProps {
  onUploadComplete: (response: any) => void
  onError: (error: any) => void
  accept?: string
  maxSize?: number
  disabled?: boolean
}

interface UploadProgress {
  progress: number
  loaded: number
  total: number
}

export const CancellableUpload: React.FC<CancellableUploadProps> = ({
  onUploadComplete,
  onError,
  accept = '.pdf',
  maxSize = 100 * 1024 * 1024, // 100MB
  disabled = false
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > maxSize) {
      onError(ErrorHandlingService.createError(
        { response: { status: 413 } },
        'upload'
      ))
      return
    }

    // Validate file type
    if (accept && !file.name.toLowerCase().endsWith(accept.replace('.', ''))) {
      onError(ErrorHandlingService.createError(
        { response: { status: 415 } },
        'upload'
      ))
      return
    }

    setSelectedFile(file)
  }

  const startUpload = async () => {
    if (!selectedFile) return

    // Create new AbortController for this upload
    abortControllerRef.current = new AbortController()

    setIsUploading(true)
    setUploadProgress({ progress: 0, loaded: 0, total: selectedFile.size })

    // Listen for upload progress events
    const handleUploadProgress = (event: CustomEvent<UploadProgress>) => {
      setUploadProgress(event.detail)
    }

    window.addEventListener('upload-progress', handleUploadProgress as EventListener)

    try {
      const response = await PDFProcessingAPI.uploadAndProcess(selectedFile, {
        signal: abortControllerRef.current.signal,
        operation: 'compress',
        quality: 'medium'
      })

      onUploadComplete(response)
      setSelectedFile(null)
      setUploadProgress(null)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Upload cancelled by user')
        return
      }

      const appError = ErrorHandlingService.createError(error, 'upload')
      onError(appError)
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
      abortControllerRef.current = null
      window.removeEventListener('upload-progress', handleUploadProgress as EventListener)
    }
  }

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsUploading(false)
      setUploadProgress(null)
      setSelectedFile(null)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="w-full">
      {/* File Selection */}
      {!selectedFile && !isUploading && (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={disabled}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`cursor-pointer flex flex-col items-center space-y-4 ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Choose a file to upload
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {accept} files up to {formatFileSize(maxSize)}
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && !isUploading && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <span className="text-red-600 dark:text-red-400 font-semibold text-sm">PDF</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={startUpload}
                disabled={disabled}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Upload
              </button>
              <button
                onClick={() => {
                  setSelectedFile(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && uploadProgress && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">PDF</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedFile?.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Uploading... {uploadProgress.progress}%
                </p>
              </div>
            </div>
            <button
              onClick={cancelUpload}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-3 py-1 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <X className="w-4 h-4" />
              <span className="text-sm font-medium">Cancel</span>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress.progress}%` }}
            />
          </div>

          {/* Progress Details */}
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>{formatFileSize(uploadProgress.loaded)} uploaded</span>
            <span>{formatFileSize(uploadProgress.total)} total</span>
          </div>
        </div>
      )}

      {/* Upload Tips */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Upload Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
              <li>Files are processed using secure Web Workers</li>
              <li>You can cancel the upload at any time</li>
              <li>Large files may take longer to process</li>
              <li>All uploads are validated for security</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CancellableUpload