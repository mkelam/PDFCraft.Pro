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
  const [activeTab, setActiveTab] = useState<TabMode>("convert")
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
                  className={`
                    p-3 rounded-lg text-center font-medium transition-all duration-300 border
                    ${activeTab === "convert"
                      ? "bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-primary/10 hover:border-primary/50"
                    }
                  `}
                >
                  Convert
                </button>
                <button
                  onClick={() => handleTabChange("merge")}
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
              <div className="flex flex-col justify-center flex-1">
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={activeTab === "merge"}
                    className={`
                      w-full p-3 rounded-lg border text-foreground transition-all flex items-center justify-between
                      ${activeTab === "merge"
                        ? "opacity-40 cursor-not-allowed border-muted"
                        : "border-border hover:border-primary focus:border-primary focus:outline-none hover:bg-white/5"
                      }
                    `}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <span>
                      {outputFormat === "image" && "📷 Image"}
                      {outputFormat === "powerpoint" && "📊 PowerPoint"}
                      {outputFormat === "word" && "📝 Word"}
                      {outputFormat === "excel" && "📈 Excel"}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && activeTab !== "merge" && (
                    <div
                      className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border z-50"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      {(["image", "powerpoint", "word", "excel"] as OutputFormat[]).map((format) => (
                        <button
                          key={format}
                          onClick={() => {
                            handleOutputFormatChange(format)
                            setIsDropdownOpen(false)
                          }}
                          className="w-full p-3 text-left hover:bg-white/10 first:rounded-t-lg last:rounded-b-lg transition-colors text-foreground"
                        >
                          {format === "image" && "📷 Image"}
                          {format === "powerpoint" && "📊 PowerPoint"}
                          {format === "word" && "📝 Word"}
                          {format === "excel" && "📈 Excel"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
                      <Button onClick={downloadFile} className="bg-green-600 hover:bg-green-700 text-xs px-3 py-2">
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button variant="outline" onClick={reset} className="text-xs px-3 py-2">
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
          <Alert className="border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-700">
              {processing.error}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}