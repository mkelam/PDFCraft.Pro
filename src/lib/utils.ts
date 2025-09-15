import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes with proper override handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Validate PDF file
 */
export function validatePDF(file: File): { valid: boolean; error?: string } {
  const maxSize = parseInt(import.meta.env.VITE_MAX_FILE_SIZE_MB || '100') * 1024 * 1024
  const supportedFormats = (import.meta.env.VITE_SUPPORTED_FORMATS || 'pdf').split(',')

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${formatFileSize(maxSize)} limit`
    }
  }

  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  if (!fileExtension || !supportedFormats.includes(fileExtension)) {
    return {
      valid: false,
      error: `Unsupported format. Supported formats: ${supportedFormats.join(', ')}`
    }
  }

  return { valid: true }
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout

  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(null, args), wait)
  }
}

/**
 * Format processing time in human readable format
 */
export function formatProcessingTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }

  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}

/**
 * Generate unique ID for processing jobs
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Calculate estimated completion time
 */
export function calculateETA(startTime: Date, progress: number): Date | null {
  if (progress <= 0) return null

  const elapsed = Date.now() - startTime.getTime()
  const estimatedTotal = (elapsed / progress) * 100
  return new Date(startTime.getTime() + estimatedTotal)
}

/**
 * Check if feature is enabled via environment variables
 */
export function isFeatureEnabled(feature: string): boolean {
  const envVar = `VITE_ENABLE_${feature.toUpperCase()}`
  return import.meta.env[envVar] === 'true'
}

/**
 * Get performance settings based on device capabilities
 */
export function getPerformanceSettings() {
  const isMobile = window.innerWidth < 640

  return {
    blurIntensity: isMobile
      ? parseInt(import.meta.env.VITE_GLASSMORPHIC_BLUR_MOBILE || '8')
      : parseInt(import.meta.env.VITE_GLASSMORPHIC_BLUR_DESKTOP || '20'),
    animationDuration: parseInt(import.meta.env.VITE_ANIMATION_DURATION_MS || '200'),
    debounceMs: parseInt(import.meta.env.VITE_DEBOUNCE_MS || '300')
  }
}