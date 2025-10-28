/**
 * Enhanced Converter Component - pdflab.pro
 * Revolutionary OCR Overlay conversion with real-time progress
 * Provides 90%+ text accuracy with 99% image preservation
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Download, Zap, Brain, Image, BarChart3, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  EnhancedpdflabAPI,
  EnhancedConversionRequest,
  EnhancedConversionResponse,
  EnhancedJobStatus,
  ConversionProgress
} from '@/lib/enhanced-api';

interface ConversionState {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';
  file: File | null;
  jobId: string | null;
  progress: number;
  currentPhase: string;
  message: string;
  timeElapsed: number;
  estimatedTimeRemaining: number;
  result: EnhancedJobStatus | null;
  error: string | null;
}

interface EnhancedConverterProps {
  onConversionComplete?: (result: EnhancedJobStatus) => void;
  onConversionError?: (error: string) => void;
}

export default function EnhancedConverter({ onConversionComplete, onConversionError }: EnhancedConverterProps) {
  const [state, setState] = useState<ConversionState>({
    status: 'idle',
    file: null,
    jobId: null,
    progress: 0,
    currentPhase: '',
    message: '',
    timeElapsed: 0,
    estimatedTimeRemaining: 0,
    result: null,
    error: null
  });

  const [performanceMode, setPerformanceMode] = useState<'speed' | 'balanced' | 'quality'>('balanced');
  const [useEnhancements, setUseEnhancements] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    console.log('🎯 File selected:', file.name, EnhancedpdflabAPI.formatFileSize(file.size));

    // Validate file
    const validation = EnhancedpdflabAPI.validatePDFFile(file);
    if (!validation.valid) {
      setState(prev => ({
        ...prev,
        status: 'failed',
        error: validation.error || 'Invalid file',
        file: null
      }));
      return;
    }

    // Get performance recommendation
    const recommendation = EnhancedpdflabAPI.getPerformanceModeRecommendation(file);
    setPerformanceMode(recommendation.mode);

    setState(prev => ({
      ...prev,
      file,
      status: 'idle',
      error: null,
      result: null,
      progress: 0,
      currentPhase: '',
      message: `Ready to convert with ${recommendation.mode} mode: ${recommendation.reason}`
    }));
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');

    if (pdfFile) {
      handleFileSelect(pdfFile);
    } else {
      setState(prev => ({
        ...prev,
        status: 'failed',
        error: 'Please drop a PDF file',
        file: null
      }));
    }
  }, [handleFileSelect]);

  const startConversion = useCallback(async () => {
    if (!state.file) return;

    try {
      console.log('🚀 Starting OCR Overlay conversion...');
      setState(prev => ({ ...prev, status: 'uploading', error: null }));

      const options: EnhancedConversionRequest = {
        performanceMode,
        useEnhancements,
        realTimeProgress: true
      };

      // Start conversion
      const conversionResponse = await EnhancedpdflabAPI.convertPDFToPowerPoint(state.file, options);

      console.log('✅ Conversion started:', conversionResponse);

      setState(prev => ({
        ...prev,
        status: 'processing',
        jobId: conversionResponse.jobId,
        message: 'OCR Overlay conversion started...'
      }));

      // Poll for progress
      const result = await EnhancedpdflabAPI.pollConversionWithProgress(
        conversionResponse.jobId,
        (progress: ConversionProgress) => {
          setState(prev => ({
            ...prev,
            progress: progress.progress,
            currentPhase: progress.phase,
            message: progress.message,
            timeElapsed: progress.timeElapsed,
            estimatedTimeRemaining: progress.estimatedTimeRemaining
          }));
        }
      );

      console.log('🎉 Conversion completed:', result);

      setState(prev => ({
        ...prev,
        status: 'completed',
        result,
        progress: 100,
        message: 'OCR Overlay conversion completed successfully!'
      }));

      onConversionComplete?.(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
      console.error('❌ Conversion error:', errorMessage);

      setState(prev => ({
        ...prev,
        status: 'failed',
        error: errorMessage,
        progress: 0
      }));

      onConversionError?.(errorMessage);
    }
  }, [state.file, performanceMode, useEnhancements, onConversionComplete, onConversionError]);

  const handleDownload = useCallback(() => {
    if (state.result?.job?.outputFile && state.file) {
      EnhancedpdflabAPI.triggerDownload(state.result.job.outputFile, state.file.name);
    }
  }, [state.result, state.file]);

  const resetConverter = useCallback(() => {
    setState({
      status: 'idle',
      file: null,
      jobId: null,
      progress: 0,
      currentPhase: '',
      message: '',
      timeElapsed: 0,
      estimatedTimeRemaining: 0,
      result: null,
      error: null
    });
    setPerformanceMode('balanced');
    setUseEnhancements(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Brain className="h-8 w-8 text-blue-600" />
            Enhanced OCR Overlay Converter
          </CardTitle>
          <CardDescription className="text-lg">
            Revolutionary PDF-to-PowerPoint conversion with 90%+ text accuracy and 99% image preservation
          </CardDescription>
          <div className="flex justify-center gap-4 mt-4">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Image className="h-4 w-4 mr-1" />
              99% Image Fidelity
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Brain className="h-4 w-4 mr-1" />
              90%+ Text Accuracy
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              <Zap className="h-4 w-4 mr-1" />
              Sub-5 Second Speed
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* File Upload */}
      {state.status === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload PDF for OCR Overlay Conversion
            </CardTitle>
            <CardDescription>
              Drop your PDF file below or click to select. Maximum file size: 100MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop your PDF here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports PDF files up to 100MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {state.file && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900">{state.file.name}</p>
                    <p className="text-sm text-blue-700">
                      {EnhancedpdflabAPI.formatFileSize(state.file.size)}
                    </p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>

                {state.message && (
                  <p className="mt-2 text-sm text-blue-700">{state.message}</p>
                )}

                {/* Performance Mode Selection */}
                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Performance Mode
                  </label>
                  <div className="flex gap-2">
                    {(['speed', 'balanced', 'quality'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setPerformanceMode(mode)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          performanceMode === mode
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Enhancement Toggle */}
                <div className="mt-4 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enhancements"
                    checked={useEnhancements}
                    onChange={(e) => setUseEnhancements(e.target.checked)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <label htmlFor="enhancements" className="text-sm font-medium text-gray-700">
                    Enable all Week 2 enhancements (recommended)
                  </label>
                </div>

                <Button
                  onClick={startConversion}
                  className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="lg"
                >
                  <Brain className="h-5 w-5 mr-2" />
                  Start OCR Overlay Conversion
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Processing Progress */}
      {(state.status === 'uploading' || state.status === 'processing') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {EnhancedpdflabAPI.getPhaseIcon(state.currentPhase)}
              OCR Overlay Processing
            </CardTitle>
            <CardDescription>
              {state.message || 'Processing your PDF with revolutionary OCR Overlay technology...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Progress</span>
                <span>{state.progress.toFixed(1)}%</span>
              </div>
              <Progress value={state.progress} className="h-3" />
            </div>

            {state.currentPhase && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Current Phase:</span>
                <span>{state.currentPhase}</span>
              </div>
            )}

            {state.timeElapsed > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Elapsed: {EnhancedpdflabAPI.formatProcessingTime(state.timeElapsed)}</span>
                </div>
                {state.estimatedTimeRemaining > 0 && (
                  <span>Remaining: {EnhancedpdflabAPI.formatProcessingTime(state.estimatedTimeRemaining)}</span>
                )}
              </div>
            )}

            {useEnhancements && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">Enhanced Features Active:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-blue-700">✓ Advanced Image Processing</span>
                  <span className="text-blue-700">✓ Multi-Quality Extraction</span>
                  <span className="text-blue-700">✓ Enhanced OCR Engine</span>
                  <span className="text-blue-700">✓ Smart Text Analysis</span>
                  <span className="text-blue-700">✓ Advanced PowerPoint</span>
                  <span className="text-blue-700">✓ Performance Optimization</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Success Results */}
      {state.status === 'completed' && state.result && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-6 w-6" />
              OCR Overlay Conversion Completed!
            </CardTitle>
            <CardDescription className="text-green-700">
              Your PDF has been successfully converted to PowerPoint with revolutionary OCR Overlay technology
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quality Metrics */}
            {state.result.job.qualityMetrics && (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">
                    {state.result.job.qualityMetrics.textAccuracy}%
                  </div>
                  <div className="text-sm text-gray-600">Text Accuracy</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <Image className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                    {state.result.job.qualityMetrics.imagePreservation}%
                  </div>
                  <div className="text-sm text-gray-600">Image Preservation</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <CheckCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">
                    {state.result.job.qualityMetrics.overallQuality}%
                  </div>
                  <div className="text-sm text-gray-600">Overall Quality</div>
                </div>
              </div>
            )}

            {/* Processing Info */}
            <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
              <div>
                <p className="font-medium">Processing Time</p>
                <p className="text-sm text-gray-600">
                  {state.result.job.processingTime
                    ? EnhancedpdflabAPI.formatProcessingTime(state.result.job.processingTime)
                    : 'N/A'
                  }
                </p>
              </div>
              <div>
                <p className="font-medium">Performance Mode</p>
                <p className="text-sm text-gray-600">{performanceMode}</p>
              </div>
              <div>
                <p className="font-medium">Enhancements</p>
                <p className="text-sm text-gray-600">{useEnhancements ? 'All Active' : 'Basic'}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleDownload}
                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                size="lg"
              >
                <Download className="h-5 w-5 mr-2" />
                Download PowerPoint
              </Button>
              <Button
                onClick={resetConverter}
                variant="outline"
                size="lg"
              >
                Convert Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {state.status === 'failed' && state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex justify-between items-center">
            <span>{state.error}</span>
            <Button
              onClick={resetConverter}
              variant="outline"
              size="sm"
              className="ml-4"
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}