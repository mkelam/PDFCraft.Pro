import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_BASE_URL: 'http://localhost:8080/api/v1',
    VITE_WEBSOCKET_URL: 'ws://localhost:8080',
    VITE_MAX_FILE_SIZE_MB: '100',
    VITE_SUPPORTED_FORMATS: 'pdf,docx,txt,rtf',
    VITE_PROCESSING_TIMEOUT_MS: '300000',
    VITE_GLASSMORPHIC_BLUR_MOBILE: '8',
    VITE_GLASSMORPHIC_BLUR_DESKTOP: '20',
    VITE_ANIMATION_DURATION_MS: '200',
    VITE_DEBOUNCE_MS: '300',
    VITE_ENABLE_COLLABORATION: 'true',
    VITE_ENABLE_AI_FEATURES: 'false',
    VITE_ENABLE_OFFLINE_MODE: 'true',
    VITE_ENABLE_ANALYTICS: 'false',
    VITE_DEBUG_MODE: 'true',
    VITE_APP_ENVIRONMENT: 'test'
  }
})

// Mock WebSocket
class MockWebSocket {
  constructor(url: string) {
    console.log('Mock WebSocket created:', url)
  }

  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
}

global.WebSocket = MockWebSocket as any

// Mock file upload
Object.defineProperty(window, 'FileReader', {
  writable: true,
  value: class MockFileReader {
    addEventListener = vi.fn()
    readAsDataURL = vi.fn(() => {
      this.result = 'data:application/pdf;base64,mock-data'
      const event = new Event('load')
      this.addEventListener.mock.calls
        .filter(call => call[0] === 'load')
        .forEach(call => call[1](event))
    })
    result: string | null = null
  }
})

// Mock performance observer
const MockPerformanceObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
}))
MockPerformanceObserver.supportedEntryTypes = ['navigation', 'resource']
global.PerformanceObserver = MockPerformanceObserver as any

// Suppress console.log in tests unless debugging
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  }
}