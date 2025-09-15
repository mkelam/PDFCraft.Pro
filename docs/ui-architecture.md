# PDF Creator Frontend Architecture Document

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2024-12-14 | 1.0 | Initial frontend architecture aligned with pdf-saas-interface-architecture.md | Winston |

## Frontend Tech Stack

Technology Stack Table extracted from main architecture document and optimized for AI development tools.

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Framework | React.js | 18.x | UI component library and state management | Industry standard with excellent ecosystem, TypeScript support, and performance optimizations for glassmorphic interfaces |
| UI Library | Tailwind CSS | 3.4+ | Utility-first CSS framework | Optimal for glassmorphic design system implementation, excellent performance with JIT compilation |
| State Management | Zustand | 4.4+ | Lightweight state management | Minimal boilerplate, excellent TypeScript support, perfect for real-time collaboration state |
| Routing | React Router | 6.8+ | Client-side routing | Standard React routing solution with lazy loading and nested route support |
| Build Tool | Vite | 5.0+ | Fast build tool and dev server | Lightning-fast HMR, optimal for TypeScript and React development |
| Styling | CSS-in-JS + Tailwind | Latest | Component styling approach | Combines utility classes with dynamic glassmorphic effects |
| Testing | Vitest + Testing Library | Latest | Unit and integration testing | Fast test runner with React Testing Library for component testing |
| Component Library | Headless UI + Custom | 1.7+ | Accessible UI primitives | Unstyled, accessible components perfect for glassmorphic customization |
| Form Handling | React Hook Form | 7.48+ | Performant form handling | Minimal re-renders, excellent validation, perfect for document processing forms |
| Animation | Framer Motion | 10.16+ | Smooth animations | Hardware-accelerated animations for glassmorphic effects and micro-interactions |
| Dev Tools | TypeScript + ESLint + Prettier | Latest | Development tooling | Type safety, code quality, and consistent formatting |

## Project Structure

Exact directory structure optimized for AI tools and React.js best practices:

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (Button, Modal, Card)
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── GlassmorphicCard/
│   │   │   ├── GlassmorphicCard.tsx
│   │   │   ├── GlassmorphicCard.test.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── forms/           # Form-specific components
│   │   ├── DocumentUploader/
│   │   ├── UserSettings/
│   │   └── index.ts
│   ├── layout/          # Layout components
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   ├── Navigation/
│   │   └── index.ts
│   └── features/        # Feature-specific components
│       ├── DocumentProcessing/
│       │   ├── ProcessingQueue/
│       │   ├── ProcessingStatus/
│       │   └── index.ts
│       ├── Collaboration/
│       │   ├── UserPresence/
│       │   ├── CommentSystem/
│       │   └── index.ts
│       └── Analytics/
├── pages/               # Route components (lazy loaded)
│   ├── Dashboard/
│   │   ├── Dashboard.tsx
│   │   ├── Dashboard.test.tsx
│   │   └── index.ts
│   ├── DocumentViewer/
│   ├── Settings/
│   └── index.ts
├── stores/              # Zustand state stores
│   ├── userStore.ts
│   ├── processingStore.ts
│   ├── collaborationStore.ts
│   └── index.ts
├── services/            # API and external service clients
│   ├── apiClient.ts
│   ├── websocketService.ts
│   ├── fileService.ts
│   └── index.ts
├── hooks/               # Custom React hooks
│   ├── useDocumentProcessing.ts
│   ├── useWebSocket.ts
│   ├── useGlassmorphic.ts
│   └── index.ts
├── lib/                 # Utility functions and configurations
│   ├── utils.ts
│   ├── fileUtils.ts
│   ├── performance.ts
│   ├── constants.ts
│   └── types.ts
├── styles/              # Global styles and theme
│   ├── globals.css
│   ├── glassmorphic.css
│   └── animations.css
├── assets/              # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
└── __tests__/           # Test utilities and setup
    ├── setup.ts
    ├── mocks/
    └── utils/
```

## Component Standards

Exact patterns for component creation following React.js and TypeScript best practices.

### Component Template

```typescript
// src/components/ui/GlassmorphicCard/GlassmorphicCard.tsx
import React from 'react'
import { cn } from '@/lib/utils'

interface GlassmorphicCardProps {
  children: React.ReactNode
  className?: string
  intensity?: 'light' | 'medium' | 'strong'
  animated?: boolean
  onClick?: () => void
}

export const GlassmorphicCard: React.FC<GlassmorphicCardProps> = ({
  children,
  className,
  intensity = 'medium',
  animated = false,
  onClick
}) => {
  const intensityClasses = {
    light: 'backdrop-blur-sm bg-white/50 border-white/10',
    medium: 'backdrop-blur-xl bg-white/70 border-white/20',
    strong: 'backdrop-blur-2xl bg-white/80 border-white/30'
  }

  return (
    <div
      className={cn(
        // Base glassmorphic styles
        'border rounded-2xl shadow-lg shadow-black/5',
        // Performance-optimized blur levels
        'will-change-transform',
        // Responsive blur reduction on mobile
        'sm:backdrop-blur-xl backdrop-blur-lg',
        // Intensity variant
        intensityClasses[intensity],
        // Animation support
        animated && 'transition-all duration-200 hover:scale-[1.02]',
        // Interactive styles
        onClick && 'cursor-pointer hover:bg-white/75 active:scale-[0.98]',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {children}
    </div>
  )
}

export default GlassmorphicCard
```

### Naming Conventions

**Components**: PascalCase with descriptive names
- `DocumentProcessor` - Main processing component
- `GlassmorphicCard` - Reusable UI component
- `ProcessingStatusIndicator` - Specific feature component

**Files**: Match component names exactly
- `DocumentProcessor.tsx` - Component implementation
- `DocumentProcessor.test.tsx` - Component tests
- `index.ts` - Barrel export

**Props**: camelCase with TypeScript interfaces
- `isProcessing` - Boolean state
- `onDocumentProcessed` - Event handler
- `processingProgress` - Numeric value

**Hooks**: camelCase with 'use' prefix
- `useDocumentProcessing` - Processing logic
- `useGlassmorphicAnimation` - Animation utilities
- `useWebSocketConnection` - Real-time communication

**Stores**: camelCase with 'Store' suffix
- `processingStore` - Document processing state
- `userStore` - User authentication and preferences
- `collaborationStore` - Real-time collaboration state

## State Management

Zustand-based state management patterns optimized for real-time document processing.

### Store Structure

```
stores/
├── userStore.ts              # Authentication, preferences, billing
├── processingStore.ts        # Document processing, queue, progress
├── collaborationStore.ts     # Real-time editing, user presence
├── uiStore.ts               # UI state, modals, notifications
└── index.ts                 # Combined store exports
```

### State Management Template

```typescript
// src/stores/processingStore.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface ProcessingJob {
  id: string
  filename: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  startTime: Date
  estimatedCompletion?: Date
  error?: string
}

interface ProcessingState {
  // State
  jobs: ProcessingJob[]
  activeJobId: string | null
  isProcessing: boolean
  totalProgress: number

  // Actions
  addJob: (file: File) => Promise<string>
  updateJobProgress: (jobId: string, progress: number) => void
  completeJob: (jobId: string, result: any) => void
  failJob: (jobId: string, error: string) => void
  clearCompletedJobs: () => void
  retryJob: (jobId: string) => Promise<void>
}

export const useProcessingStore = create<ProcessingState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      jobs: [],
      activeJobId: null,
      isProcessing: false,
      totalProgress: 0,

      // Add new processing job
      addJob: async (file: File) => {
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        set((state) => {
          state.jobs.push({
            id: jobId,
            filename: file.name,
            status: 'queued',
            progress: 0,
            startTime: new Date()
          })

          if (!state.activeJobId) {
            state.activeJobId = jobId
            state.isProcessing = true
          }
        })

        // Trigger processing via API
        try {
          await get().processDocument(jobId, file)
        } catch (error) {
          get().failJob(jobId, error.message)
        }

        return jobId
      },

      // Update job progress
      updateJobProgress: (jobId: string, progress: number) => {
        set((state) => {
          const job = state.jobs.find(j => j.id === jobId)
          if (job) {
            job.progress = progress
            job.status = progress === 100 ? 'completed' : 'processing'

            // Update estimated completion
            if (progress > 0 && job.status === 'processing') {
              const elapsed = Date.now() - job.startTime.getTime()
              const estimatedTotal = (elapsed / progress) * 100
              job.estimatedCompletion = new Date(job.startTime.getTime() + estimatedTotal)
            }
          }

          // Calculate total progress
          const totalJobs = state.jobs.length
          const totalProgress = state.jobs.reduce((sum, job) => sum + job.progress, 0)
          state.totalProgress = totalJobs > 0 ? totalProgress / totalJobs : 0
        })
      },

      // Complete job successfully
      completeJob: (jobId: string, result: any) => {
        set((state) => {
          const job = state.jobs.find(j => j.id === jobId)
          if (job) {
            job.status = 'completed'
            job.progress = 100
          }

          // Move to next job or stop processing
          if (state.activeJobId === jobId) {
            const nextJob = state.jobs.find(j => j.status === 'queued')
            state.activeJobId = nextJob?.id || null
            state.isProcessing = !!nextJob
          }
        })
      },

      // Fail job with error
      failJob: (jobId: string, error: string) => {
        set((state) => {
          const job = state.jobs.find(j => j.id === jobId)
          if (job) {
            job.status = 'failed'
            job.error = error
          }

          // Move to next job
          if (state.activeJobId === jobId) {
            const nextJob = state.jobs.find(j => j.status === 'queued')
            state.activeJobId = nextJob?.id || null
            state.isProcessing = !!nextJob
          }
        })
      },

      // Clear completed jobs
      clearCompletedJobs: () => {
        set((state) => {
          state.jobs = state.jobs.filter(job => job.status !== 'completed')
        })
      },

      // Retry failed job
      retryJob: async (jobId: string) => {
        set((state) => {
          const job = state.jobs.find(j => j.id === jobId)
          if (job) {
            job.status = 'queued'
            job.progress = 0
            job.error = undefined
            job.startTime = new Date()
          }
        })
      }
    })),
    { name: 'processing-store' }
  )
)
```

## API Integration

Service patterns for API communication with circuit breaker and retry logic.

### Service Template

```typescript
// src/services/apiClient.ts
import axios, { AxiosInstance, AxiosError } from 'axios'

class CircuitBreaker {
  private failures = 0
  private lastFailTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private failureThreshold = 5,
    private timeout = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime < this.timeout) {
        throw new Error('Circuit breaker is OPEN')
      }
      this.state = 'HALF_OPEN'
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failures++
    this.lastFailTime = Date.now()

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }
}

class ApiClient {
  private client: AxiosInstance
  private circuitBreaker = new CircuitBreaker()

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor for auth
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle authentication error
          localStorage.removeItem('authToken')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // Document processing API
  async processDocument(file: File): Promise<{ jobId: string }> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('options', JSON.stringify({
      quality: 'high',
      preserveFormatting: true
    }))

    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/documents/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    })
  }

  // Get processing status
  async getProcessingStatus(jobId: string): Promise<ProcessingStatus> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.get(`/documents/status/${jobId}`)
      return response.data
    })
  }

  // Download processed document
  async downloadDocument(documentId: string): Promise<Blob> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.get(`/documents/download/${documentId}`, {
        responseType: 'blob'
      })
      return response.data
    })
  }
}

export const apiClient = new ApiClient()
```

### API Client Configuration

```typescript
// src/services/websocketService.ts
import { io, Socket } from 'socket.io-client'
import { useProcessingStore } from '@/stores/processingStore'

class WebSocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect(): void {
    if (this.socket?.connected) return

    this.socket = io(import.meta.env.VITE_WEBSOCKET_URL, {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('authToken')
      }
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      if (reason === 'io server disconnect') {
        // Server disconnected, need manual reconnection
        this.reconnect()
      }
    })

    this.socket.on('processing_update', (data: {
      jobId: string
      progress: number
      status: string
    }) => {
      useProcessingStore.getState().updateJobProgress(data.jobId, data.progress)
    })

    this.socket.on('processing_complete', (data: {
      jobId: string
      result: any
    }) => {
      useProcessingStore.getState().completeJob(data.jobId, data.result)
    })

    this.socket.on('processing_error', (data: {
      jobId: string
      error: string
    }) => {
      useProcessingStore.getState().failJob(data.jobId, data.error)
    })
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    setTimeout(() => {
      console.log(`Reconnection attempt ${this.reconnectAttempts}`)
      this.connect()
    }, Math.pow(2, this.reconnectAttempts) * 1000) // Exponential backoff
  }

  disconnect(): void {
    this.socket?.disconnect()
    this.socket = null
  }
}

export const websocketService = new WebSocketService()
```

## Routing

React Router configuration with lazy loading and authentication guards.

### Route Configuration

```typescript
// src/App.tsx
import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useUserStore } from '@/stores/userStore'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Lazy loaded pages
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const DocumentViewer = lazy(() => import('@/pages/DocumentViewer'))
const Settings = lazy(() => import('@/pages/Settings'))
const Login = lazy(() => import('@/pages/Login'))
const NotFound = lazy(() => import('@/pages/NotFound'))

// Auth guard component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useUserStore(state => state.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

// Public route component (redirect if authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useUserStore(state => state.isAuthenticated)
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <LoadingSpinner size="lg" />
          </div>
        }>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />

            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />

            <Route path="/document/:id" element={
              <ProtectedRoute>
                <DocumentViewer />
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />

            {/* Default redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  )
}

export default App
```

## Styling Guidelines

Glassmorphic design system implementation with performance optimization.

### Styling Approach

The styling methodology combines Tailwind CSS utility classes with CSS custom properties for the glassmorphic design system. This approach ensures optimal performance while maintaining design consistency across the application.

**Key principles:**
- Utility-first approach with Tailwind CSS
- CSS custom properties for dynamic theming
- Performance-optimized blur effects (8px mobile, 20px desktop)
- Smooth animations with hardware acceleration
- Responsive design with mobile-first approach

### Global Theme Variables

```css
/* src/styles/globals.css */
:root {
  /* Colors - PDF SaaS Platform Brand */
  --color-primary: 59 130 246; /* blue-500 */
  --color-primary-foreground: 255 255 255;
  --color-secondary: 148 163 184; /* slate-400 */
  --color-secondary-foreground: 15 23 42; /* slate-900 */
  --color-accent: 124 58 237; /* violet-500 */
  --color-accent-foreground: 255 255 255;

  /* Glassmorphic backgrounds */
  --glass-light: rgb(255 255 255 / 0.5);
  --glass-medium: rgb(255 255 255 / 0.7);
  --glass-strong: rgb(255 255 255 / 0.8);
  --glass-border: rgb(255 255 255 / 0.2);
  --glass-shadow: rgb(0 0 0 / 0.05);

  /* Blur levels - Performance optimized */
  --blur-mobile: 8px;
  --blur-desktop: 20px;
  --blur-light: 4px;
  --blur-strong: 24px;

  /* Spacing - Consistent rhythm */
  --spacing-xs: 0.25rem; /* 4px */
  --spacing-sm: 0.5rem;  /* 8px */
  --spacing-md: 1rem;    /* 16px */
  --spacing-lg: 1.5rem;  /* 24px */
  --spacing-xl: 2rem;    /* 32px */
  --spacing-2xl: 3rem;   /* 48px */
  --spacing-3xl: 4rem;   /* 64px */

  /* Typography - Optimized for readability */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', Consolas, monospace;

  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */

  /* Shadows - Glassmorphic depth */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);

  /* Animations - Smooth and performant */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --easing-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --glass-light: rgb(15 23 42 / 0.5);   /* slate-800 with opacity */
    --glass-medium: rgb(15 23 42 / 0.7);
    --glass-strong: rgb(15 23 42 / 0.8);
    --glass-border: rgb(148 163 184 / 0.2); /* slate-400 with opacity */
    --glass-shadow: rgb(0 0 0 / 0.2);
  }
}

/* Base styles */
* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Performance optimizations */
.glassmorphic-base {
  will-change: transform;
  transform: translateZ(0); /* Force hardware acceleration */
}

/* Responsive blur effects */
.glass-blur {
  backdrop-filter: blur(var(--blur-mobile));
}

@media (min-width: 640px) {
  .glass-blur {
    backdrop-filter: blur(var(--blur-desktop));
  }
}

/* Utility classes for glassmorphic effects */
.glass-light {
  background: var(--glass-light);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-lg) var(--glass-shadow);
}

.glass-medium {
  background: var(--glass-medium);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-lg) var(--glass-shadow);
}

.glass-strong {
  background: var(--glass-strong);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-xl) var(--glass-shadow);
}

/* Animation utilities */
.animate-smooth {
  transition: all var(--duration-normal) var(--easing-smooth);
}

.animate-bounce-in {
  animation: bounceIn var(--duration-slow) var(--easing-bounce);
}

@keyframes bounceIn {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); opacity: 1; }
}

/* Focus styles for accessibility */
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
}

/* Print styles */
@media print {
  .no-print { display: none !important; }
  .glass-blur { backdrop-filter: none; }
  .glass-light, .glass-medium, .glass-strong {
    background: white !important;
    border: 1px solid #e5e7eb !important;
  }
}
```

## Testing Requirements

Minimal testing requirements to ensure component reliability and performance while maintaining development velocity.

### Component Test Template

```typescript
// src/components/__tests__/DocumentProcessor.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { DocumentProcessor } from '../DocumentProcessor'
import { useProcessingStore } from '../../stores/processingStore'
import { apiClient } from '../../services/apiClient'

// Mock dependencies
vi.mock('../../stores/processingStore')
vi.mock('../../services/apiClient')
vi.mock('socket.io-client')

const mockUseProcessingStore = useProcessingStore as vi.MockedFunction<typeof useProcessingStore>
const mockApiClient = apiClient as vi.Mocked<typeof apiClient>

describe('DocumentProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseProcessingStore.mockReturnValue({
      isProcessing: false,
      progress: 0,
      processDocument: vi.fn(),
      resetProcessing: vi.fn()
    })
  })

  it('renders upload interface when not processing', () => {
    render(<DocumentProcessor />)

    expect(screen.getByText(/upload pdf/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /select file/i })).toBeInTheDocument()
  })

  it('shows processing state with glassmorphic loading indicator', async () => {
    mockUseProcessingStore.mockReturnValue({
      isProcessing: true,
      progress: 45,
      processDocument: vi.fn(),
      resetProcessing: vi.fn()
    })

    render(<DocumentProcessor />)

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()

    // Test glassmorphic effect is applied
    const loadingContainer = screen.getByTestId('processing-indicator')
    expect(loadingContainer).toHaveClass('backdrop-blur-xl')
  })

  it('handles file upload and triggers processing', async () => {
    const mockProcessDocument = vi.fn()
    mockUseProcessingStore.mockReturnValue({
      isProcessing: false,
      progress: 0,
      processDocument: mockProcessDocument,
      resetProcessing: vi.fn()
    })

    render(<DocumentProcessor />)

    const fileInput = screen.getByLabelText(/upload pdf/i)
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })

    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    await waitFor(() => {
      expect(mockProcessDocument).toHaveBeenCalledWith(mockFile)
    })
  })

  it('maintains 60fps during glassmorphic animations', async () => {
    const performanceObserver = vi.fn()
    global.PerformanceObserver = vi.fn().mockImplementation(() => ({
      observe: performanceObserver
    }))

    render(<DocumentProcessor />)

    // Trigger hover animation
    const uploadButton = screen.getByRole('button', { name: /select file/i })
    fireEvent.mouseEnter(uploadButton)

    // Verify no frame drops during animation
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(performanceObserver).toHaveBeenCalled()
  })

  it('handles WebSocket connection errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock WebSocket error
    const mockSocket = {
      on: vi.fn((event, callback) => {
        if (event === 'error') callback(new Error('Connection failed'))
      }),
      emit: vi.fn(),
      disconnect: vi.fn()
    }

    vi.doMock('socket.io-client', () => ({ io: () => mockSocket }))

    render(<DocumentProcessor />)

    expect(consoleSpy).toHaveBeenCalledWith(
      'WebSocket connection error:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('meets accessibility standards', () => {
    render(<DocumentProcessor />)

    // Check ARIA labels
    expect(screen.getByLabelText(/upload pdf/i)).toBeInTheDocument()

    // Check keyboard navigation
    const uploadButton = screen.getByRole('button', { name: /select file/i })
    expect(uploadButton).toHaveAttribute('tabIndex', '0')

    // Check focus indicators
    fireEvent.focus(uploadButton)
    expect(uploadButton).toHaveClass('focus:ring-2')
  })
})
```

### Testing Best Practices

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test critical user flows (using Cypress/Playwright)
4. **Coverage Goals**: Aim for 80% code coverage
5. **Test Structure**: Arrange-Act-Assert pattern
6. **Mock External Dependencies**: API calls, routing, state management

## Environment Configuration

Required environment variables for React.js application following Vite naming conventions.

```bash
# .env.local - Local development environment

# API Configuration
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_WEBSOCKET_URL=ws://localhost:8080
VITE_CDN_BASE_URL=http://localhost:9000

# Processing Configuration
VITE_MAX_FILE_SIZE_MB=100
VITE_SUPPORTED_FORMATS=pdf,docx,txt,rtf
VITE_PROCESSING_TIMEOUT_MS=300000
VITE_CHUNK_SIZE_MB=10

# Feature Flags
VITE_ENABLE_COLLABORATION=true
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_ANALYTICS=false

# Performance Settings
VITE_GLASSMORPHIC_BLUR_MOBILE=8
VITE_GLASSMORPHIC_BLUR_DESKTOP=20
VITE_ANIMATION_DURATION_MS=200
VITE_DEBOUNCE_MS=300

# Security Configuration
VITE_OAUTH_CLIENT_ID=your_oauth_client_id
VITE_SENTRY_DSN=your_sentry_dsn
VITE_APP_VERSION=${npm_package_version}
```

```bash
# .env.production - Production environment

# API Configuration
VITE_API_BASE_URL=https://api.pdf-saas-platform.com/v1
VITE_WEBSOCKET_URL=wss://ws.pdf-saas-platform.com
VITE_CDN_BASE_URL=https://cdn.pdf-saas-platform.com

# Processing Configuration
VITE_MAX_FILE_SIZE_MB=500
VITE_SUPPORTED_FORMATS=pdf,docx,txt,rtf,pptx,xlsx
VITE_PROCESSING_TIMEOUT_MS=600000
VITE_CHUNK_SIZE_MB=50

# Feature Flags
VITE_ENABLE_COLLABORATION=true
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_ANALYTICS=true

# Performance Settings
VITE_GLASSMORPHIC_BLUR_MOBILE=8
VITE_GLASSMORPHIC_BLUR_DESKTOP=20
VITE_ANIMATION_DURATION_MS=200
VITE_DEBOUNCE_MS=300

# Security Configuration
VITE_OAUTH_CLIENT_ID=prod_oauth_client_id
VITE_SENTRY_DSN=prod_sentry_dsn
VITE_APP_VERSION=${npm_package_version}
```

## Frontend Developer Standards

### Critical Coding Rules

**Performance-First Development**
- Always implement `useMemo` and `useCallback` for expensive operations
- Lazy load all route components with `React.lazy()`
- Use `React.memo` for pure components to prevent unnecessary re-renders
- Implement virtual scrolling for lists exceeding 100 items
- Optimize glassmorphic effects: 8px blur mobile, 20px desktop max
- Debounce user input (search, form validation) with 300ms default

**State Management Discipline**
- Use Zustand stores for cross-component state only
- Keep local component state with `useState` for UI-only data
- Implement optimistic updates for user actions (file upload, editing)
- Never mutate state directly - always create new objects/arrays
- Use `immer` integration for complex state updates

**API Integration Standards**
- Implement circuit breaker pattern for all external API calls
- Use React Query for server state management and caching
- Handle loading, error, and success states for every API call
- Implement retry logic with exponential backoff
- Always show user feedback for async operations

**Accessibility Requirements**
- Every interactive element must have proper ARIA labels
- Implement keyboard navigation for all UI components
- Maintain focus management in modal dialogs and dropdowns
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`)
- Ensure 4.5:1 color contrast ratio minimum
- Test with screen readers during development

**Error Handling Patterns**
- Implement Error Boundaries for component error isolation
- Log errors to Sentry with user context and stack traces
- Show user-friendly error messages, never technical details
- Provide recovery actions when possible (retry, refresh)
- Handle offline scenarios gracefully with Service Workers

**Security Best Practices**
- Sanitize all user input before rendering (use DOMPurify)
- Implement Content Security Policy headers
- Never expose sensitive data in client-side code
- Use HTTPS-only cookies for authentication tokens
- Validate file uploads on both client and server

### Quick Reference

**Development Commands**
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run type checking
npm run typecheck

# Run tests
npm run test
npm run test:coverage

# Lint and format
npm run lint
npm run format
```

**Key Import Patterns**
```typescript
// State Management
import { useProcessingStore } from '@/stores/processingStore'
import { useUserStore } from '@/stores/userStore'

// API Services
import { apiClient } from '@/services/apiClient'
import { websocketService } from '@/services/websocketService'

// UI Components
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { GlassmorphicCard } from '@/components/ui/GlassmorphicCard'

// Utilities
import { cn } from '@/lib/utils'
import { formatFileSize, validatePDF } from '@/lib/fileUtils'
import { debounce } from '@/lib/performance'
```

**File Naming Conventions**
- Components: PascalCase (`DocumentProcessor.tsx`)
- Hooks: camelCase with 'use' prefix (`useDocumentProcessing.ts`)
- Utilities: camelCase (`fileUtils.ts`)
- Stores: camelCase with 'Store' suffix (`processingStore.ts`)
- Types: PascalCase with 'Type' suffix (`DocumentType.ts`)
- Constants: SCREAMING_SNAKE_CASE (`API_ENDPOINTS.ts`)

**Project-Specific Patterns**
```typescript
// Glassmorphic styling utility
const glassmorphic = cn(
  'backdrop-blur-xl bg-white/70 border border-white/20',
  'shadow-lg shadow-black/5 rounded-2xl'
)

// Processing state pattern
const { isProcessing, progress, error } = useProcessingStore()

// File validation pattern
const validateFile = (file: File) => {
  if (file.size > MAX_FILE_SIZE) throw new Error('File too large')
  if (!SUPPORTED_FORMATS.includes(file.type)) throw new Error('Unsupported format')
}

// Real-time collaboration pattern
const { socket, isConnected } = useWebSocket({
  onDocumentUpdate: (update) => handleCollaborativeUpdate(update),
  onUserJoined: (user) => showUserNotification(user)
})
```

This frontend architecture ensures optimal performance, maintainability, and user experience while aligning with the glassmorphic design system and performance targets outlined in the interface architecture specifications.