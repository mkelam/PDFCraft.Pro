"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  X,
  Merge,
  Zap,
} from "lucide-react"
import { PDFCraftAPI, ConversionResponse, formatFileSize, validatePDFFile } from "@/lib/api"

interface UploadedFile {
  file: File
  id: string
  valid: boolean
  error?: string
}

interface ProcessingState {
  isProcessing: boolean
  progress: number
  stage: string
  result?: ConversionResponse
  error?: string
}

interface PDFUploadProps {
  mode?: "convert" | "merge"
  onSuccess?: (result: ConversionResponse) => void
  onError?: (error: string) => void
}

export function PDFUpload({ mode = "convert", onSuccess, onError }: PDFUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    stage: "",
  })

  const maxFiles = mode === "convert" ? 1 : 10
  const acceptedFiles = { "application/pdf": [".pdf"] }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => {
      const validation = validatePDFFile(file)
      return {
        file,
        id: Math.random().toString(36).substr(2, 9),
        valid: validation.valid,
        error: validation.error,
      }
    })

    if (mode === "convert") {
      setUploadedFiles(newFiles.slice(0, 1))
    } else {
      setUploadedFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles))
    }
  }, [mode, maxFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFiles,
    maxFiles,
    disabled: processing.isProcessing,
  })

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const processFiles = async () => {
    const validFiles = uploadedFiles.filter((f) => f.valid)

    if (validFiles.length === 0) {
      onError?.("No valid files to process")
      return
    }

    if (mode === "merge" && validFiles.length < 2) {
      onError?.("At least 2 PDF files are required for merging")
      return
    }

    setProcessing({
      isProcessing: true,
      progress: 0,
      stage: mode === "convert" ? "Converting PDF to PowerPoint..." : "Merging PDF files...",
    })

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProcessing((prev) => ({
          ...prev,
          progress: Math.min(prev.progress + 20, 90),
        }))
      }, 400)

      let result: ConversionResponse

      if (mode === "convert") {
        result = await PDFCraftAPI.convertPDFToPPT(validFiles[0].file)
      } else {
        result = await PDFCraftAPI.mergePDFs(validFiles.map((f) => f.file))
      }

      clearInterval(progressInterval)

      setProcessing({
        isProcessing: false,
        progress: 100,
        stage: "Complete!",
        result,
      })

      onSuccess?.(result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Processing failed"
      setProcessing({
        isProcessing: false,
        progress: 0,
        stage: "",
        error: errorMessage,
      })
      onError?.(errorMessage)
    }
  }

  const downloadFile = () => {
    if (processing.result?.outputFile) {
      PDFCraftAPI.triggerDownload(
        processing.result.outputFile,
        processing.result.originalFile || processing.result.outputFile
      )
    }
  }

  const reset = () => {
    setUploadedFiles([])
    setProcessing({ isProcessing: false, progress: 0, stage: "" })
  }

  const validFiles = uploadedFiles.filter((f) => f.valid)
  const canProcess = validFiles.length > 0 && (mode === "convert" || validFiles.length >= 2)

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="glass">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            data-testid={`pdf-dropzone-${mode}`}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all dropzone pdf-upload-zone
              ${isDragActive ? "border-primary bg-primary/5" : "border-border"}
              ${processing.isProcessing ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:bg-primary/5"}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                {mode === "convert" ? (
                  <Zap className="w-6 h-6 text-primary" />
                ) : (
                  <Merge className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-xl mb-2">
                  {mode === "convert"
                    ? "Convert PDF to editable PowerPoint"
                    : "Combine multiple PDFs into one"
                  }
                </h3>
                <p className="text-sm text-muted-foreground">
                  {mode === "convert"
                    ? "Drop your PDF here • Maximum 10MB"
                    : `Drop your PDFs here • Up to ${maxFiles} files`
                  }
                </p>
              </div>
              {isDragActive && (
                <Badge className="bg-primary/20 text-primary">
                  Drop files here
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <Card className="glass">
          <CardContent className="p-6">
            <h4 className="font-semibold mb-4">Uploaded Files</h4>
            <div className="space-y-3">
              {uploadedFiles.map((fileItem) => (
                <div
                  key={fileItem.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{fileItem.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(fileItem.file.size)}
                      </p>
                    </div>
                    {fileItem.valid ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileItem.id)}
                    disabled={processing.isProcessing}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {uploadedFiles.some((f) => !f.valid) && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Some files have validation errors. Only valid PDF files will be processed.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Processing */}
      {processing.isProcessing && (
        <Card className="glass">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
              </div>
              <h3 className="font-semibold">{processing.stage}</h3>
              <Progress value={processing.progress} className="w-full" />
              <p className="text-sm text-muted-foreground">{processing.progress}% complete</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Result */}
      {processing.result && (
        <Card className="glass border-green-200">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <h3 className="font-semibold text-lg text-green-700">
                {mode === "convert" ? "Conversion Complete!" : "Merge Complete!"}
              </h3>
              <p className="text-muted-foreground">
                {processing.result.message}
              </p>
              <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
                <p>Processing time: {processing.result.processingTime}</p>
                <p>Output: {processing.result.outputFile}</p>
                {processing.result.fileCount && (
                  <p>Files merged: {processing.result.fileCount}</p>
                )}
              </div>
              <div className="flex space-x-4 justify-center">
                <Button onClick={downloadFile} className="bg-green-600 hover:bg-green-700">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" onClick={reset}>
                  Process Another
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {processing.error && (
        <Alert className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-700">
            {processing.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      {uploadedFiles.length > 0 && !processing.result && !processing.isProcessing && (
        <div className="flex space-x-4 justify-center">
          <Button
            onClick={processFiles}
            disabled={!canProcess}
            className="bg-primary hover:bg-primary/90"
            data-testid={`process-button-${mode}`}
          >
            {mode === "convert" ? (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Convert to PowerPoint
              </>
            ) : (
              <>
                <Merge className="w-4 h-4 mr-2" />
                Merge PDFs
              </>
            )}
          </Button>
          <Button variant="outline" onClick={reset}>
            Clear All
          </Button>
        </div>
      )}
    </div>
  )
}