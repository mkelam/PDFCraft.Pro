// API utilities for PDFCraft.Pro backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

export interface ConversionResponse {
  success: boolean;
  message: string;
  jobId?: string;
  downloadUrl?: string;
  originalFile?: string;
  outputFile?: string;
  processingTime?: string;
  status?: string;
  error?: string;
  originalFiles?: string[];
  fileCount?: number;
}

export interface HealthResponse {
  success: boolean;
  status: string;
  services: {
    database: string;
    redis: string;
    libreoffice: string;
    storage: string;
  };
  uptime?: number;
}

// Global token expiration warning handler
let onTokenWarning: ((warning: any) => void) | null = null;

export class PDFCraftAPI {
  /**
   * Set global token warning handler
   */
  static setTokenWarningHandler(handler: (warning: any) => void): void {
    onTokenWarning = handler;
  }

  /**
   * Make authenticated API request with token warning detection
   */
  private static async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Check for token expiration warning in response headers
    const tokenWarning = response.headers.get('X-Token-Warning');
    if (tokenWarning && onTokenWarning) {
      try {
        const warning = JSON.parse(tokenWarning);
        onTokenWarning(warning);
      } catch (e) {
        console.warn('Failed to parse token warning:', e);
      }
    }

    // Handle expired token
    if (response.status === 401) {
      const errorData = await response.json();
      if (errorData.error?.code === 'AUTH_TOKEN_EXPIRED') {
        // Clear stored token and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          // You can customize this based on your routing setup
          window.location.href = '/login';
        }
        throw new Error(errorData.error.message);
      }
    }

    return response;
  }
  /**
   * Check API health status
   */
  static async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert PDF to PowerPoint with job polling
   */
  static async convertPDFToPPT(file: File): Promise<ConversionResponse> {
    try {
      // Validate file type
      if (file.type !== 'application/pdf') {
        throw new Error('Only PDF files are allowed');
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File size exceeds 10MB limit');
      }

      const formData = new FormData();
      formData.append('files', file);

      // Submit conversion job
      const response = await fetch(`${API_BASE_URL}/api/convert/pdf-to-ppt`, {
        method: 'POST',
        body: formData,
      });

      const jobResponse = await response.json();

      if (!response.ok) {
        throw new Error(jobResponse.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Poll for job completion
      return await this.pollJobCompletion(jobResponse.jobId);

    } catch (error) {
      throw new Error(`PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Poll job status until completion
   */
  private static async pollJobCompletion(jobId: string): Promise<ConversionResponse> {
    const maxAttempts = 60; // 60 attempts = 60 seconds max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/job/${jobId}/status`);
        const statusData = await response.json();

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const job = statusData.job;

        if (job.status === 'completed') {
          return {
            success: true,
            message: 'Conversion completed successfully',
            jobId: job.id,
            outputFile: job.outputFile,
            downloadUrl: job.downloadUrl,
            processingTime: `${job.processingTime}ms`,
            status: 'completed'
          };
        }

        if (job.status === 'failed') {
          throw new Error(job.errorMessage || 'Conversion failed');
        }

        // Wait 1 second before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

      } catch (error) {
        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    throw new Error('Conversion timeout - please try again');
  }

  /**
   * Merge multiple PDF files with job polling
   */
  static async mergePDFs(files: File[]): Promise<ConversionResponse> {
    try {
      // Validate we have at least 2 files
      if (files.length < 2) {
        throw new Error('At least 2 PDF files are required for merging');
      }

      // Validate all files are PDFs
      for (const file of files) {
        if (file.type !== 'application/pdf') {
          throw new Error(`File ${file.name} is not a PDF`);
        }
      }

      // Validate total size
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const maxTotalSize = 50 * 1024 * 1024; // 50MB total
      if (totalSize > maxTotalSize) {
        throw new Error('Total file size exceeds 50MB limit');
      }

      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      // Submit merge job
      const response = await fetch(`${API_BASE_URL}/api/convert/merge`, {
        method: 'POST',
        body: formData,
      });

      const jobResponse = await response.json();

      if (!response.ok) {
        throw new Error(jobResponse.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Poll for job completion
      const result = await this.pollJobCompletion(jobResponse.jobId);

      // Add file count for merge operations
      return {
        ...result,
        fileCount: files.length,
        originalFiles: files.map(f => f.name)
      };

    } catch (error) {
      throw new Error(`PDF merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download a file by filename
   */
  static getDownloadUrl(filename: string): string {
    return `${API_BASE_URL}/api/download/${filename}`;
  }

  /**
   * Download a file with proper headers
   */
  static async downloadFile(filename: string): Promise<Blob> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/download/${filename}`);

      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      throw new Error(`File download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Validate PDF file
   */
  static validatePDFFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'Only PDF files are allowed' };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    // Check file extension
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return { valid: false, error: 'File must have .pdf extension' };
    }

    return { valid: true };
  }

  /**
   * Create download trigger for a file
   */
  static triggerDownload(filename: string, originalName?: string): void {
    const downloadUrl = this.getDownloadUrl(filename);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = originalName || filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Export individual functions for convenience
export const {
  checkHealth,
  convertPDFToPPT,
  mergePDFs,
  getDownloadUrl,
  downloadFile,
  formatFileSize,
  validatePDFFile,
  triggerDownload,
} = PDFCraftAPI;