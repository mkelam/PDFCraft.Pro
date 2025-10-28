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
  Image,
  FilePresentation,
  FileSpreadsheet,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { pdflabAPI, ConversionResponse, formatFileSize, validatePDFFile } from "@/lib/api"

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
  mode?: "convert" | "merge" | "image"
  onSuccess?: (result: ConversionResponse) => void
  onError?: (error: string) => void
}

export function PDFUpload({ mode = "convert", onSuccess, onError }: PDFUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [outputFormat, setOutputFormat] = useState<"pptx" | "docx" | "xlsx">("pptx")
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    stage: "",
  })

  const maxFiles = mode === "convert" || mode === "image" ? 1 : 10
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

    if (mode === "convert" || mode === "image") {
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

    if (mode === "image" && validFiles.length !== 1) {
      onError?.("Please select one PDF file for image export")
      return
    }

    setProcessing({
      isProcessing: true,
      progress: 0,
      stage: mode === "convert" ? "Processing PDF conversion..." : mode === "image" ? "Extracting images from PDF..." : "Merging PDF files...",
    })

    try {
      // Progress updates for conversion mode
      let progressTimer: NodeJS.Timeout | null = null;
      let currentStage = 0;

      const formatName = outputFormat === "pptx" ? "PowerPoint" : outputFormat === "docx" ? "Word" : "Excel";
      const conversionStages = mode === "convert" ? [
        { progress: 20, stage: "Analyzing PDF structure..." },
        { progress: 40, stage: "Extracting text content..." },
        { progress: 60, stage: "Processing layout..." },
        { progress: 80, stage: `Creating editable ${formatName}...` },
        { progress: 90, stage: "Finalizing conversion..." }
      ] : [];

      if (mode === "convert") {
        progressTimer = setInterval(() => {
          if (currentStage < conversionStages.length) {
            const currentStageData = conversionStages[currentStage];
            if (currentStageData) {
              setProcessing((prev) => ({
                ...prev,
                progress: currentStageData.progress,
                stage: currentStageData.stage,
              }))
              currentStage++;
            }
          } else {
            // Clear the timer once we've gone through all stages
            if (progressTimer) {
              clearInterval(progressTimer);
              progressTimer = null;
            }
          }
        }, 800)
      } else {
        // Simple progress for non-convert modes
        progressTimer = setInterval(() => {
          setProcessing((prev) => ({
            ...prev,
            progress: Math.min(prev.progress + 20, 90),
          }))
        }, 400)
      }

      let result: ConversionResponse

      if (mode === "convert") {
        result = await pdflabAPI.convertPDFToOffice(validFiles[0].file, outputFormat)
      } else if (mode === "image") {
        result = await pdflabAPI.convertPDFToImages(validFiles[0].file)
      } else {
        result = await pdflabAPI.mergePDFs(validFiles.map((f) => f.file))
      }

      if (progressTimer) clearInterval(progressTimer)

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
      pdflabAPI.triggerDownload(
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
  const canProcess = validFiles.length > 0 && (mode === "convert" || mode === "image" || validFiles.length >= 2)

  return (
    <div className="space-y-6">

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold">Uploaded Files</h4>
              {mode === "convert" && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Convert to:</span>
                  <Select value={outputFormat} onValueChange={(value: "pptx" | "docx" | "xlsx") => setOutputFormat(value)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pptx">
                        <div className="flex items-center">
                          <FilePresentation className="w-4 h-4 mr-2" />
                          PowerPoint (.pptx)
                        </div>
                      </SelectItem>
                      <SelectItem value="docx">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-2" />
                          Word (.docx)
                        </div>
                      </SelectItem>
                      <SelectItem value="xlsx">
                        <div className="flex items-center">
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Excel (.xlsx)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {uploadedFiles.map((fileItem) => (
                <div
                  key={fileItem.id}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
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
                {mode === "convert" ? "Conversion Complete!" : mode === "image" ? "Export Complete!" : "Merge Complete!"}
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
                {outputFormat === "pptx" && <FilePresentation className="w-4 h-4 mr-2" />}
                {outputFormat === "docx" && <FileText className="w-4 h-4 mr-2" />}
                {outputFormat === "xlsx" && <FileSpreadsheet className="w-4 h-4 mr-2" />}
                Convert to {outputFormat === "pptx" ? "PowerPoint" : outputFormat === "docx" ? "Word" : "Excel"}
              </>
            ) : mode === "image" ? (
              <>
                <Image className="w-4 h-4 mr-2" />
                Export to Images
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