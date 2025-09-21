/**
 * BMAD Shared Configuration Protocol
 * Single source of truth for all service endpoints and ports
 * Prevents configuration drift between frontend and backend
 */

export interface ServiceConfig {
  BACKEND_PORT: number
  FRONTEND_PORT: number
  API_BASE_URL: string
  CORS_ORIGINS: string[]
  DATABASE_PORT?: number
  REDIS_PORT?: number
}

export const SHARED_CONFIG: Record<'development' | 'production', ServiceConfig> = {
  development: {
    BACKEND_PORT: 3001,
    FRONTEND_PORT: 3000,
    API_BASE_URL: 'http://localhost:3001',
    CORS_ORIGINS: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003'
    ],
    DATABASE_PORT: 3306,
    REDIS_PORT: 6379
  },

  production: {
    BACKEND_PORT: 8080,
    FRONTEND_PORT: 80,
    API_BASE_URL: 'https://api.pdfcraft.pro',
    CORS_ORIGINS: [
      'https://pdfcraft.pro',
      'https://www.pdfcraft.pro'
    ],
    DATABASE_PORT: 3306,
    REDIS_PORT: 6379
  }
}

/**
 * Get configuration for current environment
 */
export function getConfig(): ServiceConfig {
  const env = (process.env.NODE_ENV || 'development') as keyof typeof SHARED_CONFIG
  return SHARED_CONFIG[env]
}

/**
 * Validate configuration integrity
 */
export function validateConfig(config: ServiceConfig): void {
  if (!config.API_BASE_URL) {
    throw new Error('API_BASE_URL is required in configuration')
  }

  if (!config.CORS_ORIGINS || config.CORS_ORIGINS.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one origin')
  }

  if (config.BACKEND_PORT === config.FRONTEND_PORT) {
    throw new Error('Backend and frontend cannot use the same port')
  }

  console.log('✅ BMAD Configuration validated successfully')
}

/**
 * Export current configuration
 */
export const CONFIG = getConfig()

// Validate on import
validateConfig(CONFIG)