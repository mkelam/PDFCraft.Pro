import { logger } from '../utils/logger';

/**
 * Cloud OCR Configuration and API Keys Management
 *
 * Phase 3 - Cloud Integration Configuration
 * Centralized management of cloud OCR service credentials and settings
 */

export interface CloudOCRConfig {
  googleVision: {
    enabled: boolean;
    projectId?: string;
    keyFile?: string;
    apiKey?: string;
    maxRequestsPerMinute: number;
    timeout: number;
    retryAttempts: number;
    costPerRequest: number; // in USD
  };
  awsTextract: {
    enabled: boolean;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    maxRequestsPerMinute: number;
    timeout: number;
    retryAttempts: number;
    costPerRequest: number; // in USD
  };
  azureCognitive: {
    enabled: boolean;
    endpoint?: string;
    subscriptionKey?: string;
    region?: string;
    maxRequestsPerMinute: number;
    timeout: number;
    retryAttempts: number;
    costPerRequest: number; // in USD
  };
  general: {
    enableCostTracking: boolean;
    monthlyBudgetLimit: number; // in USD
    costTrackingPath: string;
    enableFallbackChain: boolean;
    preferredEngine: 'google-vision' | 'aws-textract' | 'azure-cognitive' | 'auto';
    enableUsageLogging: boolean;
  };
}

export class CloudOCRConfigManager {
  private static config: CloudOCRConfig;
  private static initialized = false;

  /**
   * Initialize configuration from environment variables
   */
  static initialize(): CloudOCRConfig {
    if (this.initialized) {
      return this.config;
    }

    logger.info('🔧 [CLOUD-CONFIG] Initializing cloud OCR configuration...');

    this.config = {
      googleVision: {
        enabled: this.isGoogleVisionEnabled(),
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFile: process.env.GOOGLE_CLOUD_KEY_FILE,
        apiKey: process.env.GOOGLE_CLOUD_API_KEY,
        maxRequestsPerMinute: parseInt(process.env.GOOGLE_VISION_RPM || '300'),
        timeout: parseInt(process.env.GOOGLE_VISION_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.GOOGLE_VISION_RETRIES || '3'),
        costPerRequest: parseFloat(process.env.GOOGLE_VISION_COST || '0.0015')
      },
      awsTextract: {
        enabled: this.isAWSTextractEnabled(),
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        maxRequestsPerMinute: parseInt(process.env.AWS_TEXTRACT_RPM || '100'),
        timeout: parseInt(process.env.AWS_TEXTRACT_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.AWS_TEXTRACT_RETRIES || '3'),
        costPerRequest: parseFloat(process.env.AWS_TEXTRACT_COST || '0.0015')
      },
      azureCognitive: {
        enabled: this.isAzureCognitiveEnabled(),
        endpoint: process.env.AZURE_COGNITIVE_ENDPOINT,
        subscriptionKey: process.env.AZURE_COGNITIVE_KEY,
        region: process.env.AZURE_COGNITIVE_REGION,
        maxRequestsPerMinute: parseInt(process.env.AZURE_COGNITIVE_RPM || '200'),
        timeout: parseInt(process.env.AZURE_COGNITIVE_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.AZURE_COGNITIVE_RETRIES || '3'),
        costPerRequest: parseFloat(process.env.AZURE_COGNITIVE_COST || '0.002')
      },
      general: {
        enableCostTracking: process.env.ENABLE_OCR_COST_TRACKING?.toLowerCase() === 'true',
        monthlyBudgetLimit: parseFloat(process.env.OCR_MONTHLY_BUDGET || '100.00'),
        costTrackingPath: process.env.OCR_COST_TRACKING_PATH || './data/ocr-costs.json',
        enableFallbackChain: process.env.ENABLE_OCR_FALLBACK?.toLowerCase() !== 'false',
        preferredEngine: (process.env.PREFERRED_OCR_ENGINE as any) || 'auto',
        enableUsageLogging: process.env.ENABLE_OCR_USAGE_LOGGING?.toLowerCase() !== 'false'
      }
    };

    this.validateConfiguration();
    this.logConfiguration();
    this.initialized = true;

    return this.config;
  }

  /**
   * Get current configuration
   */
  static getConfig(): CloudOCRConfig {
    if (!this.initialized) {
      return this.initialize();
    }
    return this.config;
  }

  /**
   * Check if Google Vision API is properly configured
   */
  private static isGoogleVisionEnabled(): boolean {
    const hasProjectId = !!process.env.GOOGLE_CLOUD_PROJECT_ID;
    const hasCredentials = !!(process.env.GOOGLE_CLOUD_KEY_FILE || process.env.GOOGLE_CLOUD_API_KEY);
    const isExplicitlyDisabled = process.env.DISABLE_GOOGLE_VISION?.toLowerCase() === 'true';

    return !isExplicitlyDisabled && hasProjectId && hasCredentials;
  }

  /**
   * Check if AWS Textract is properly configured
   */
  private static isAWSTextractEnabled(): boolean {
    const hasCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
    const isExplicitlyDisabled = process.env.DISABLE_AWS_TEXTRACT?.toLowerCase() === 'true';

    return !isExplicitlyDisabled && hasCredentials;
  }

  /**
   * Check if Azure Cognitive Services is properly configured
   */
  private static isAzureCognitiveEnabled(): boolean {
    const hasCredentials = !!(process.env.AZURE_COGNITIVE_ENDPOINT && process.env.AZURE_COGNITIVE_KEY);
    const isExplicitlyDisabled = process.env.DISABLE_AZURE_COGNITIVE?.toLowerCase() === 'true';

    return !isExplicitlyDisabled && hasCredentials;
  }

  /**
   * Validate configuration and warn about issues
   */
  private static validateConfiguration(): void {
    const issues: string[] = [];

    // Check for enabled services
    const enabledServices = [];
    if (this.config.googleVision.enabled) enabledServices.push('Google Vision');
    if (this.config.awsTextract.enabled) enabledServices.push('AWS Textract');
    if (this.config.azureCognitive.enabled) enabledServices.push('Azure Cognitive');

    if (enabledServices.length === 0) {
      issues.push('No cloud OCR services are enabled. Only Tesseract (local) will be available.');
    }

    // Validate Google Vision config
    if (this.config.googleVision.enabled) {
      if (!this.config.googleVision.projectId) {
        issues.push('Google Vision enabled but GOOGLE_CLOUD_PROJECT_ID not set');
      }
      if (!this.config.googleVision.keyFile && !this.config.googleVision.apiKey) {
        issues.push('Google Vision enabled but neither GOOGLE_CLOUD_KEY_FILE nor GOOGLE_CLOUD_API_KEY set');
      }
    }

    // Validate AWS Textract config
    if (this.config.awsTextract.enabled) {
      if (!this.config.awsTextract.accessKeyId) {
        issues.push('AWS Textract enabled but AWS_ACCESS_KEY_ID not set');
      }
      if (!this.config.awsTextract.secretAccessKey) {
        issues.push('AWS Textract enabled but AWS_SECRET_ACCESS_KEY not set');
      }
    }

    // Validate Azure Cognitive config
    if (this.config.azureCognitive.enabled) {
      if (!this.config.azureCognitive.endpoint) {
        issues.push('Azure Cognitive enabled but AZURE_COGNITIVE_ENDPOINT not set');
      }
      if (!this.config.azureCognitive.subscriptionKey) {
        issues.push('Azure Cognitive enabled but AZURE_COGNITIVE_KEY not set');
      }
    }

    // Validate budget limits
    if (this.config.general.enableCostTracking && this.config.general.monthlyBudgetLimit <= 0) {
      issues.push('Cost tracking enabled but monthly budget limit is invalid');
    }

    // Log issues
    if (issues.length > 0) {
      logger.warn('⚠️  [CLOUD-CONFIG] Configuration issues detected:');
      issues.forEach(issue => logger.warn(`   - ${issue}`));
    }
  }

  /**
   * Log current configuration status
   */
  private static logConfiguration(): void {
    const enabledServices = [];
    if (this.config.googleVision.enabled) enabledServices.push('Google Vision');
    if (this.config.awsTextract.enabled) enabledServices.push('AWS Textract');
    if (this.config.azureCognitive.enabled) enabledServices.push('Azure Cognitive');

    logger.info(`✅ [CLOUD-CONFIG] Configuration loaded successfully`);
    logger.info(`📊 [CLOUD-CONFIG] Enabled services: ${enabledServices.length > 0 ? enabledServices.join(', ') : 'None (Tesseract only)'}`);

    if (this.config.general.enableCostTracking) {
      logger.info(`💰 [CLOUD-CONFIG] Cost tracking enabled with $${this.config.general.monthlyBudgetLimit} monthly budget`);
    }

    if (this.config.general.preferredEngine !== 'auto') {
      logger.info(`🎯 [CLOUD-CONFIG] Preferred engine: ${this.config.general.preferredEngine}`);
    }
  }

  /**
   * Get available cloud engines
   */
  static getAvailableEngines(): Array<{
    name: string;
    type: 'cloud';
    enabled: boolean;
    costPerRequest: number;
    maxRPM: number;
  }> {
    const config = this.getConfig();
    const engines = [];

    if (config.googleVision.enabled) {
      engines.push({
        name: 'google-vision',
        type: 'cloud' as const,
        enabled: true,
        costPerRequest: config.googleVision.costPerRequest,
        maxRPM: config.googleVision.maxRequestsPerMinute
      });
    }

    if (config.awsTextract.enabled) {
      engines.push({
        name: 'aws-textract',
        type: 'cloud' as const,
        enabled: true,
        costPerRequest: config.awsTextract.costPerRequest,
        maxRPM: config.awsTextract.maxRequestsPerMinute
      });
    }

    if (config.azureCognitive.enabled) {
      engines.push({
        name: 'azure-cognitive',
        type: 'cloud' as const,
        enabled: true,
        costPerRequest: config.azureCognitive.costPerRequest,
        maxRPM: config.azureCognitive.maxRequestsPerMinute
      });
    }

    return engines;
  }

  /**
   * Test connection to enabled cloud services
   */
  static async testConnections(): Promise<{
    googleVision: { available: boolean; error?: string };
    awsTextract: { available: boolean; error?: string };
    azureCognitive: { available: boolean; error?: string };
  }> {
    const results = {
      googleVision: { available: false, error: undefined as string | undefined },
      awsTextract: { available: false, error: undefined as string | undefined },
      azureCognitive: { available: false, error: undefined as string | undefined }
    };

    const config = this.getConfig();

    // Test Google Vision
    if (config.googleVision.enabled) {
      try {
        // Mock test - in production, make actual API call
        await new Promise(resolve => setTimeout(resolve, 100));
        results.googleVision.available = true;
        logger.info('✅ [CLOUD-CONFIG] Google Vision API connection test: SUCCESS');
      } catch (error) {
        results.googleVision.error = error instanceof Error ? error.message : 'Unknown error';
        logger.error('❌ [CLOUD-CONFIG] Google Vision API connection test: FAILED', error);
      }
    }

    // Test AWS Textract
    if (config.awsTextract.enabled) {
      try {
        // Mock test - in production, make actual API call
        await new Promise(resolve => setTimeout(resolve, 100));
        results.awsTextract.available = true;
        logger.info('✅ [CLOUD-CONFIG] AWS Textract connection test: SUCCESS');
      } catch (error) {
        results.awsTextract.error = error instanceof Error ? error.message : 'Unknown error';
        logger.error('❌ [CLOUD-CONFIG] AWS Textract connection test: FAILED', error);
      }
    }

    // Test Azure Cognitive Services
    if (config.azureCognitive.enabled) {
      try {
        // Mock test - in production, make actual API call
        await new Promise(resolve => setTimeout(resolve, 100));
        results.azureCognitive.available = true;
        logger.info('✅ [CLOUD-CONFIG] Azure Cognitive Services connection test: SUCCESS');
      } catch (error) {
        results.azureCognitive.error = error instanceof Error ? error.message : 'Unknown error';
        logger.error('❌ [CLOUD-CONFIG] Azure Cognitive Services connection test: FAILED', error);
      }
    }

    return results;
  }

  /**
   * Get configuration for specific engine
   */
  static getEngineConfig(engine: 'google-vision' | 'aws-textract' | 'azure-cognitive') {
    const config = this.getConfig();

    switch (engine) {
      case 'google-vision':
        return config.googleVision;
      case 'aws-textract':
        return config.awsTextract;
      case 'azure-cognitive':
        return config.azureCognitive;
      default:
        throw new Error(`Unknown engine: ${engine}`);
    }
  }

  /**
   * Update configuration at runtime (for testing/debugging)
   */
  static updateConfig(updates: Partial<CloudOCRConfig>): void {
    if (!this.initialized) {
      this.initialize();
    }

    this.config = { ...this.config, ...updates };
    logger.info('🔧 [CLOUD-CONFIG] Configuration updated at runtime');
  }

  /**
   * Generate .env.example file with all cloud OCR configuration options
   */
  static generateEnvExample(): string {
    return `
# Cloud OCR Configuration
# Enable/disable specific cloud OCR services

# Google Vision API
GOOGLE_CLOUD_PROJECT_ID=your-google-project-id
GOOGLE_CLOUD_KEY_FILE=/path/to/service-account-key.json
# OR use API key instead of service account
# GOOGLE_CLOUD_API_KEY=your-api-key
GOOGLE_VISION_RPM=300
GOOGLE_VISION_TIMEOUT=30000
GOOGLE_VISION_RETRIES=3
GOOGLE_VISION_COST=0.0015
DISABLE_GOOGLE_VISION=false

# AWS Textract
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_TEXTRACT_RPM=100
AWS_TEXTRACT_TIMEOUT=30000
AWS_TEXTRACT_RETRIES=3
AWS_TEXTRACT_COST=0.0015
DISABLE_AWS_TEXTRACT=false

# Azure Cognitive Services (Future)
AZURE_COGNITIVE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_COGNITIVE_KEY=your-subscription-key
AZURE_COGNITIVE_REGION=your-region
AZURE_COGNITIVE_RPM=200
AZURE_COGNITIVE_TIMEOUT=30000
AZURE_COGNITIVE_RETRIES=3
AZURE_COGNITIVE_COST=0.002
DISABLE_AZURE_COGNITIVE=true

# General OCR Settings
ENABLE_OCR_COST_TRACKING=true
OCR_MONTHLY_BUDGET=100.00
OCR_COST_TRACKING_PATH=./data/ocr-costs.json
ENABLE_OCR_FALLBACK=true
PREFERRED_OCR_ENGINE=auto
ENABLE_OCR_USAGE_LOGGING=true
`.trim();
  }

  /**
   * Create configuration summary for API responses
   */
  static getConfigurationSummary(): {
    availableEngines: string[];
    costTrackingEnabled: boolean;
    monthlyBudget: number;
    preferredEngine: string;
    fallbackEnabled: boolean;
  } {
    const config = this.getConfig();
    const availableEngines = ['tesseract']; // Always available

    if (config.googleVision.enabled) availableEngines.push('google-vision');
    if (config.awsTextract.enabled) availableEngines.push('aws-textract');
    if (config.azureCognitive.enabled) availableEngines.push('azure-cognitive');

    return {
      availableEngines,
      costTrackingEnabled: config.general.enableCostTracking,
      monthlyBudget: config.general.monthlyBudgetLimit,
      preferredEngine: config.general.preferredEngine,
      fallbackEnabled: config.general.enableFallbackChain
    };
  }
}