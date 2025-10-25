/**
 * 🌍 ENVIRONMENT-AGNOSTIC CONFIGURATION
 * Removes LibreOffice dependencies and ensures CloudConvert-first architecture
 */

interface EnvironmentConfig {
  // Core service settings
  cloudConvert: {
    enabled: boolean;
    apiKey: string;
    maxRetries: number;
    timeout: number;
  };

  // Legacy LibreOffice settings (DISABLED)
  libreOffice: {
    enabled: boolean;
    path?: string;
    note: string;
  };

  // OCR settings (fallback only)
  ocr: {
    enabled: boolean;
    tesseractPath?: string;
    fallbackOnly: boolean;
  };

  // Processing settings
  processing: {
    tempDir: string;
    maxFileSize: number;
    timeout: number;
    cleanupInterval: number;
  };

  // Queue settings
  queue: {
    redis: {
      host: string;
      port: number;
      retryDelayOnFailure: number;
    };
  };
}

const createEnvironmentConfig = (): EnvironmentConfig => {
  return {
    cloudConvert: {
      enabled: true,
      apiKey: process.env.CLOUDCONVERT_API_KEY || '',
      maxRetries: 3,
      timeout: 60000
    },

    libreOffice: {
      enabled: false, // ✅ DISABLED - CloudConvert handles all conversions
      path: undefined,
      note: 'LibreOffice removed in favor of CloudConvert API'
    },

    ocr: {
      enabled: true,
      tesseractPath: process.env.TESSERACT_PATH,
      fallbackOnly: true // Only used as fallback for text extraction
    },

    processing: {
      tempDir: process.env.TEMP_DIR || '/tmp/pdfcraft',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB
      timeout: 60000,
      cleanupInterval: 3600000 // 1 hour
    },

    queue: {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        retryDelayOnFailure: 5000
      }
    }
  };
};

export const environmentConfig = createEnvironmentConfig();

/**
 * Environment validation - ensures CloudConvert is configured
 */
export const validateEnvironment = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // CloudConvert API key is required
  if (!environmentConfig.cloudConvert.apiKey) {
    errors.push('CLOUDCONVERT_API_KEY environment variable is required');
  }

  // Warn if LibreOffice paths are still set
  if (process.env.LIBREOFFICE_PATH) {
    console.warn('⚠️ [ENV-CONFIG] LIBREOFFICE_PATH detected but LibreOffice is disabled. Using CloudConvert instead.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Get processing configuration based on environment
 */
export const getProcessingConfig = () => {
  return {
    primaryEngine: 'cloudconvert' as const,
    fallbackEngines: ['visual-fidelity', 'improved', 'enhanced-fallback'] as const,
    libreOfficeDisabled: true,
    cloudConvertEnabled: environmentConfig.cloudConvert.enabled,
    maxRetries: environmentConfig.cloudConvert.maxRetries,
    timeout: environmentConfig.processing.timeout
  };
};

/**
 * Environment info for debugging
 */
export const getEnvironmentInfo = () => {
  const validation = validateEnvironment();

  return {
    cloudConvert: {
      enabled: environmentConfig.cloudConvert.enabled,
      configured: !!environmentConfig.cloudConvert.apiKey
    },
    libreOffice: {
      enabled: environmentConfig.libreOffice.enabled,
      status: 'REMOVED - CloudConvert primary'
    },
    ocr: {
      enabled: environmentConfig.ocr.enabled,
      mode: 'fallback-only'
    },
    validation: {
      valid: validation.valid,
      errors: validation.errors
    },
    processing: {
      primaryEngine: 'cloudconvert',
      fallbackAvailable: true,
      tempDir: environmentConfig.processing.tempDir
    }
  };
};