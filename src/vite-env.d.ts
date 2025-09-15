/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_MAX_FILE_SIZE_MB: string
  readonly VITE_ENABLE_MOCK_BACKEND: string
  readonly VITE_DEV_MODE: string
  readonly VITE_ENVIRONMENT: string
  readonly VITE_DEBUG_MODE: string
  readonly VITE_LOG_LEVEL: string
  readonly VITE_WEBSOCKET_URL: string
  readonly VITE_APP_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}