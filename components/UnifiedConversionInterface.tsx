"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, ChevronDown, Upload, FileText, Download, CheckCircle, X } from "lucide-react"
import { PDFUpload } from "@/components/PDFUpload"
import { ConversionResponse, pdflabAPI, formatFileSize, validatePDFFile } from "@/lib/api"

interface UnifiedConversionInterfaceProps {
  onSuccess?: (result: ConversionResponse) => void
  onError?: (error: string) => void
}

type TabMode = "convert" | "merge"
type OutputFormat = "image" | "powerpoint" | "word" | "excel"

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
  timeRemaining?: string
  result?: ConversionResponse
  error?: string
}

export function UnifiedConversionInterface({ onSuccess, onError }: UnifiedConversionInterfaceProps) {
  const [activeTab, setActiveTab] = useState<TabMode>("convert") // Auto-select Convert mode (most popular)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("powerpoint")
  const [showFutureFeatureAlert, setShowFutureFeatureAlert] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    stage: "",
  })
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // File handling
  const maxFiles = activeTab === "convert" ? 1 : 10
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

    if (activeTab === "convert") {
      setUploadedFiles(newFiles.slice(0, 1))
    } else {
      setUploadedFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles))
    }
  }, [activeTab, maxFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFiles,
    maxFiles,
    disabled: processing.isProcessing,
  })

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  // Map output format to PDFUpload mode
  const getPDFUploadMode = () => {
    if (activeTab === "merge") return "merge"
    if (outputFormat === "image") return "image"
    if (outputFormat === "powerpoint") return "convert"
    // Word and Excel are future features - default to convert for now
    return "convert"
  }

  const handleTabChange = (tab: TabMode) => {
    setActiveTab(tab)
    setShowFutureFeatureAlert(false)
    setUploadedFiles([]) // Clear files when switching modes
    // Reset to default output format when switching tabs
    if (tab === "convert") {
      setOutputFormat("powerpoint")
    }
  }

  const processFiles = async () => {
    const validFiles = uploadedFiles.filter((f) => f.valid)

    if (validFiles.length === 0) {
      onError?.("No valid files to process")
      return
    }

    if (activeTab === "merge" && validFiles.length < 2) {
      onError?.("At least 2 PDF files are required for merging")
      return
    }

    // Note: Word and Excel are now supported via CloudConvert

    setProcessing({
      isProcessing: true,
      progress: 0,
      stage: activeTab === "convert"
        ? `Converting to ${outputFormat === "image" ? "images" : "PowerPoint"}...`
        : "Merging PDF files...",
    })

    try {
      // Progress updates
      let progressTimer: NodeJS.Timeout | null = null;
      let currentStage = 0;

      const formatName = outputFormat === "powerpoint" ? "PowerPoint" : outputFormat === "word" ? "Word" : outputFormat === "excel" ? "Excel" : "images"
      const stages = activeTab === "convert" ? [
        { progress: 20, stage: "Analyzing PDF structure...", timeRemaining: "4 seconds remaining" },
        { progress: 40, stage: "Extracting content with OCR...", timeRemaining: "3 seconds remaining" },
        { progress: 60, stage: "Processing layout...", timeRemaining: "2 seconds remaining" },
        { progress: 80, stage: outputFormat === "image" ? "Creating images..." : `Creating editable ${formatName}...`, timeRemaining: "1 second remaining" },
        { progress: 90, stage: "Finalizing...", timeRemaining: "Almost done..." }
      ] : [
        { progress: 25, stage: "Preparing files...", timeRemaining: "1 second remaining" },
        { progress: 50, stage: "Merging PDFs...", timeRemaining: "1 second remaining" },
        { progress: 75, stage: "Optimizing output...", timeRemaining: "Almost done..." },
        { progress: 90, stage: "Finalizing merge...", timeRemaining: "Almost done..." }
      ];

      progressTimer = setInterval(() => {
        if (currentStage < stages.length) {
          const currentStageData = stages[currentStage];
          if (currentStageData) {
            setProcessing((prev) => ({
              ...prev,
              progress: currentStageData.progress,
              stage: currentStageData.stage,
              timeRemaining: currentStageData.timeRemaining,
            }))
            currentStage++;
          }
        } else {
          if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
          }
        }
      }, 800)

      let result: ConversionResponse

      if (activeTab === "convert") {
        if (outputFormat === "image") {
          result = await pdflabAPI.convertPDFToImages(validFiles[0].file)
        } else {
          // Map output format to API format
          const apiFormat = outputFormat === "powerpoint" ? "pptx" : outputFormat === "word" ? "docx" : "xlsx"
          result = await pdflabAPI.convertPDFToOffice(validFiles[0].file, apiFormat as "pptx" | "docx" | "xlsx")
        }
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
      let errorMessage = error instanceof Error ? error.message : "Processing failed"

      // Enhanced error messages with actionable suggestions
      if (errorMessage.includes("File too large") || errorMessage.includes("exceeds")) {
        const fileSize = validFiles[0]?.file.size
        const sizeMB = fileSize ? (fileSize / (1024 * 1024)).toFixed(1) : "unknown"
        errorMessage = `File too large (${sizeMB}MB). Free plan limit: 10MB.`
      } else if (errorMessage.includes("corrupt") || errorMessage.includes("invalid") || errorMessage.includes("parse")) {
        errorMessage = "This PDF appears to be corrupted or password-protected. Try a different file or remove the password first."
      } else if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
        errorMessage = "Conversion timed out. This usually happens with large or complex files. Try converting to images instead."
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        errorMessage = "Network error. Please check your connection and try again."
      }

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

  const retryConversion = () => {
    // Clear error state and retry with existing files
    setProcessing({ isProcessing: false, progress: 0, stage: "" })
    // Automatically start processing again
    processFiles()
  }

  const handleOutputFormatChange = (format: OutputFormat) => {
    setOutputFormat(format)
    setShowFutureFeatureAlert(false) // All formats now supported via CloudConvert
  }

  const getUploadText = () => {
    if (activeTab === "merge") {
      return {
        title: "Drop multiple PDFs here",
        subtitle: "Select 2 or more PDF files to merge"
      }
    }
    return {
      title: "Drop your PDF here",
      subtitle: "Or click to browse files"
    }
  }

  const uploadText = getUploadText()

  return (
    <div className="space-y-6">
      {/* Trust Banner */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-primary/10 via-blue-500/10 to-purple-500/10 border border-primary/30 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-center gap-3 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold text-primary">Free: 3 conversions/day</span>
            </div>
            <span className="text-muted-foreground">•</span>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-foreground">Files deleted after 1 hour</span>
            </div>
            <span className="text-muted-foreground">•</span>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-foreground">Bank-grade encryption</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Card Pipeline Interface - Responsive Design */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch justify-center max-w-7xl mx-auto">
        {/* CARD 1: Setup */}
        <Card className="glass w-full lg:flex-1 lg:max-w-[400px]">
          <CardContent className="px-3 lg:px-4 py-2 lg:py-3 flex flex-col min-h-[160px] lg:min-h-[191px] gap-1">
            <div className="text-center border-b border-primary/20 pb-2 mb-2">
              <h3 className="text-primary font-semibold text-sm lg:text-base">Step 1</h3>
            </div>

            {/* Subsection 1: Choose Mode */}
            <div className="flex-1 flex flex-col">
              <h4 className="text-primary/90 text-xs font-semibold mb-2">1. Choose Mode</h4>
              <div className="flex flex-col gap-2 flex-1 justify-center">
                <button
                  onClick={() => handleTabChange("convert")}
                  data-testid="convert-mode-button"
                  className={`
                    p-3 rounded-lg text-center font-medium transition-all duration-300 border relative
                    ${activeTab === "convert"
                      ? "bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-primary/10 hover:border-primary/50"
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>Convert</span>
                    <Badge className="bg-primary/30 text-primary text-[10px] px-1.5 py-0.5 font-normal">
                      Most popular
                    </Badge>
                  </div>
                </button>
                <button
                  onClick={() => handleTabChange("merge")}
                  data-testid="merge-mode-button"
                  className={`
                    p-3 rounded-lg text-center font-medium transition-all duration-300 border
                    ${activeTab === "merge"
                      ? "bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-primary/10 hover:border-primary/50"
                    }
                  `}
                >
                  Merge
                </button>
              </div>
            </div>

            {/* Subsection 2: Drag and Drop */}
            <div className="flex-1 flex flex-col border-t border-primary/10 pt-4">
              <h4 className="text-primary/90 text-xs font-semibold mb-2">2. Drag and Drop</h4>
              <div
                {...getRootProps()}
                data-testid="file-upload-dropzone"
                className={`
                  border-2 border-dashed rounded-lg p-6 lg:p-4 text-center cursor-pointer transition-all flex-1 flex flex-col justify-center min-h-[120px] lg:min-h-auto
                  ${isDragActive ? "border-primary bg-primary/5" : "border-border"}
                  ${processing.isProcessing ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:bg-primary/5"}
                `}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    {processing.isProcessing ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {uploadText.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {uploadText.subtitle}
                    </p>
                  </div>
                  {isDragActive && (
                    <Badge className="bg-primary/20 text-primary text-xs">
                      Drop files here
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  PDF files only • Free: 10MB max • Pro: 100MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: Configure */}
        <Card className="glass w-full lg:flex-1 lg:max-w-[350px]">
          <CardContent className="px-3 lg:px-4 py-2 lg:py-3 flex flex-col min-h-[160px] lg:min-h-[191px] gap-1">
            <div className="text-center border-b border-primary/20 pb-2 mb-2">
              <h3 className="text-primary font-semibold text-sm lg:text-base">Step 2</h3>
            </div>

            {/* Subsection 3: Select Output */}
            <div className="flex-1 flex flex-col">
              <h4 className="text-primary/90 text-xs font-semibold mb-2">3. Select Output</h4>
              <div className="flex flex-col justify-center flex-1 space-y-2">
                {activeTab === "merge" ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    PDF output format
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {(["powerpoint", "word", "excel", "image"] as OutputFormat[]).map((format) => (
                      <button
                        key={format}
                        onClick={() => handleOutputFormatChange(format)}
                        data-testid={`output-format-option-${format}`}
                        className={`
                          p-3 rounded-lg border transition-all duration-200 flex flex-col items-center gap-1
                          ${outputFormat === format
                            ? "bg-primary/20 border-primary text-primary shadow-md"
                            : "bg-muted/20 border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
                          }
                        `}
                      >
                        <span className="text-2xl">
                          {format === "image" && "📷"}
                          {format === "powerpoint" && "📊"}
                          {format === "word" && "📝"}
                          {format === "excel" && "📈"}
                        </span>
                        <span className="text-xs font-medium">
                          {format === "image" && "Image"}
                          {format === "powerpoint" && "PowerPoint"}
                          {format === "word" && "Word"}
                          {format === "excel" && "Excel"}
                        </span>
                        {format === "powerpoint" && (
                          <span className="text-[10px] text-primary/70">Slides/Images</span>
                        )}
                        {format === "word" && (
                          <span className="text-[10px] text-primary/70">Text-heavy</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subsection 4: Files Ready */}
            <div className="flex-1 flex flex-col border-t border-primary/10 pt-4">
              <h4 className="text-primary/90 text-xs font-semibold mb-2">4. Files Ready</h4>
              <div className="flex-1">
                {uploadedFiles.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {uploadedFiles.map((fileItem) => (
                      <div
                        key={fileItem.id}
                        data-testid="uploaded-file-item"
                        className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs truncate">{fileItem.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(fileItem.file.size)}
                            </p>
                          </div>
                          {fileItem.valid ? (
                            <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(fileItem.id)}
                          disabled={processing.isProcessing}
                          data-testid="remove-file-button"
                          className="p-1 h-6 w-6"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No files uploaded yet
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: Execute */}
        <Card className="glass w-full lg:flex-1 lg:max-w-[420px]">
          <CardContent className="px-3 lg:px-4 py-2 lg:py-3 flex flex-col min-h-[160px] lg:min-h-[191px] gap-1">
            <div className="text-center border-b border-primary/20 pb-2 mb-2">
              <h3 className="text-primary font-semibold text-sm lg:text-base">Step 3</h3>
            </div>

            {/* Subsection 5: Processing */}
            <div className="flex-1 flex flex-col">
              <h4 className="text-primary/90 text-xs font-semibold mb-2">5. Processing</h4>
              <div className="flex-1 flex flex-col justify-center">
                {processing.isProcessing ? (
                  <div className="text-center space-y-3">
                    <div className="flex justify-center space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                    </div>
                    <p className="font-medium text-sm">{processing.stage}</p>
                    <Progress value={processing.progress} className="w-full" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{processing.progress}% complete</span>
                      {processing.timeRemaining && (
                        <span className="text-primary">{processing.timeRemaining}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    {uploadedFiles.length > 0 ? (
                      <div className="space-y-4">
                        <p className="text-sm">Ready to process files</p>
                        <Button
                          onClick={processFiles}
                          disabled={uploadedFiles.filter(f => f.valid).length === 0 ||
                            (activeTab === "merge" && uploadedFiles.filter(f => f.valid).length < 2)}
                          data-testid="process-files-button"
                          className="bg-primary hover:bg-primary/90"
                        >
                          {activeTab === "convert" ? (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              {outputFormat === "image" && "Export to Images"}
                              {outputFormat === "powerpoint" && "Convert to PowerPoint"}
                              {outputFormat === "word" && "Convert to Word"}
                              {outputFormat === "excel" && "Convert to Excel"}
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Merge PDFs
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm">Upload files to start processing</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Subsection 6: Download Ready */}
            <div className="flex-1 flex flex-col border-t border-primary/10 pt-4">
              <h4 className="text-primary/90 text-xs font-semibold mb-2">6. Download Ready</h4>
              <div className="flex-1 flex flex-col justify-center">
                {processing.result ? (
                  <div className="text-center space-y-3">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                    <div>
                      <h4 className="font-semibold text-green-700 text-sm">
                        {activeTab === "convert"
                          ? (outputFormat === "image" ? "Export Complete!" : "Conversion Complete!")
                          : "Merge Complete!"
                        }
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {processing.result.message}
                      </p>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Processing time: {processing.result.processingTime}</p>
                      <p>Output: {processing.result.outputFile}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={downloadFile} data-testid="download-button" className="bg-green-600 hover:bg-green-700 text-xs px-3 py-2">
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button variant="outline" onClick={reset} data-testid="reset-button" className="text-xs px-3 py-2">
                        Process Another
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <p className="text-sm">Download will be available after processing</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {processing.error && (
        <div className="max-w-7xl mx-auto">
          <Alert className="border-red-200" data-testid="conversion-error-message">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-700">
              <div className="flex flex-col gap-3">
                <span>{processing.error}</span>
                <div className="flex flex-wrap gap-2">
                  {/* File too large error */}
                  {processing.error.includes("File too large") && (
                    <>
                      <Button
                        onClick={() => window.open("/pricing", "_blank")}
                        size="sm"
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/10"
                      >
                        Upgrade to Pro (100MB)
                      </Button>
                      <Button
                        onClick={reset}
                        size="sm"
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50"
                      >
                        Try Different File
                      </Button>
                    </>
                  )}

                  {/* Corrupted file error */}
                  {processing.error.includes("corrupted") && (
                    <>
                      <Button
                        onClick={reset}
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Upload Different File
                      </Button>
                      <Button
                        onClick={() => window.open("mailto:support@pdflab.pro?subject=Corrupted PDF Help", "_blank")}
                        size="sm"
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50"
                      >
                        Contact Support
                      </Button>
                    </>
                  )}

                  {/* Timeout error */}
                  {processing.error.includes("timed out") && (
                    <>
                      <Button
                        onClick={() => {
                          setOutputFormat("image")
                          retryConversion()
                        }}
                        size="sm"
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/10"
                        data-testid="try-images-button"
                      >
                        Try Converting to Images
                      </Button>
                      <Button
                        onClick={retryConversion}
                        data-testid="retry-conversion-button"
                        size="sm"
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50"
                      >
                        Retry
                      </Button>
                    </>
                  )}

                  {/* Network error or generic error */}
                  {(processing.error.includes("Network") ||
                    (!processing.error.includes("File too large") &&
                     !processing.error.includes("corrupted") &&
                     !processing.error.includes("timed out"))) && (
                    <>
                      <Button
                        onClick={retryConversion}
                        data-testid="retry-conversion-button"
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Try Again
                      </Button>
                      <Button
                        onClick={reset}
                        size="sm"
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50"
                      >
                        Start Over
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}