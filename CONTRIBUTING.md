# Contributing to PDF SaaS Platform

Thank you for your interest in contributing to the PDF SaaS Platform! This document provides guidelines and information for contributors to ensure consistency and quality across the codebase.

## 📋 Table of Contents

- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Component Development](#component-development)
- [State Management](#state-management)
- [Testing Guidelines](#testing-guidelines)
- [Performance Standards](#performance-standards)
- [Pull Request Process](#pull-request-process)
- [Architecture Alignment](#architecture-alignment)

## 🚀 Development Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0
- Git
- VS Code (recommended) with the following extensions:
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - ESLint
  - Prettier
  - Auto Rename Tag

### Initial Setup
```bash
# Clone the repository
git clone https://github.com/pdf-saas-platform/pdf-saas-platform.git
cd pdf-saas-platform

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Start development server
npm run dev
```

### Development Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and test
npm run lint        # Check code quality
npm run typecheck   # Verify TypeScript
npm run test        # Run tests
npm run format      # Format code

# Commit changes
git add .
git commit -m "feat: your descriptive commit message"

# Push and create PR
git push origin feature/your-feature-name
```

## 📝 Coding Standards

### TypeScript Standards

#### Component Props Interface
```tsx
// ✅ Good - Clear interface with JSDoc
interface DocumentProcessorProps {
  /** Maximum file size in MB */
  maxFileSize?: number
  /** Callback fired when processing completes */
  onProcessingComplete?: (result: ProcessingResult) => void
  /** Enable drag and drop functionality */
  enableDragDrop?: boolean
}

// ❌ Bad - No documentation, unclear types
interface Props {
  size?: any
  callback?: Function
  enabled?: boolean
}
```

#### Hook Implementation
```tsx
// ✅ Good - Custom hook with proper typing
export const useDocumentProcessing = () => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  const processDocument = useCallback(async (file: File): Promise<ProcessingResult> => {
    // Implementation
  }, [])

  return {
    isProcessing,
    progress,
    error,
    processDocument
  }
}
```

#### Error Handling
```tsx
// ✅ Good - Comprehensive error handling
try {
  const result = await apiClient.processDocument(file)
  return result
} catch (error) {
  if (error instanceof APIError) {
    console.error('API Error:', error.message, { context: error.context })
    throw new ProcessingError('Document processing failed', error.code)
  }

  console.error('Unexpected error:', error)
  throw new ProcessingError('An unexpected error occurred')
}
```

### Naming Conventions

#### Files and Directories
- **Components**: PascalCase (`DocumentProcessor.tsx`)
- **Hooks**: camelCase with 'use' prefix (`useDocumentProcessing.ts`)
- **Utilities**: camelCase (`fileUtils.ts`)
- **Stores**: camelCase with 'Store' suffix (`processingStore.ts`)
- **Types**: PascalCase with 'Type' suffix (`DocumentType.ts`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_ENDPOINTS.ts`)

#### Variables and Functions
```tsx
// ✅ Good - Descriptive names
const isProcessingDocument = true
const handleFileUpload = (file: File) => { }
const calculateProcessingTime = (startTime: Date, endTime: Date) => { }

// ❌ Bad - Unclear abbreviations
const isProcDoc = true
const handleFU = (f: File) => { }
const calcTime = (s: Date, e: Date) => { }
```

## 🧩 Component Development

### Component Structure
Every component should follow this structure:

```tsx
// src/components/ui/DocumentProcessor/DocumentProcessor.tsx
import React from 'react'
import { cn } from '@/lib/utils'
import { useDocumentProcessing } from '@/hooks/useDocumentProcessing'

interface DocumentProcessorProps {
  className?: string
  onComplete?: (result: ProcessingResult) => void
}

export const DocumentProcessor: React.FC<DocumentProcessorProps> = ({
  className,
  onComplete
}) => {
  const { isProcessing, progress, processDocument } = useDocumentProcessing()

  return (
    <div className={cn('document-processor', className)}>
      {/* Component implementation */}
    </div>
  )
}
```

### Glassmorphic Components
Follow the established glassmorphic design patterns:

```tsx
// ✅ Good - Proper glassmorphic implementation
<GlassmorphicCard
  intensity="medium"
  animated={true}
  className="hover:scale-[1.02] transition-transform"
>
  <div className="backdrop-blur-responsive bg-white/70">
    Content with performance-optimized blur
  </div>
</GlassmorphicCard>

// ❌ Bad - Inefficient blur implementation
<div className="backdrop-blur-3xl bg-white/90"> {/* Too intensive for mobile */}
  Content
</div>
```

### Accessibility Requirements
All components must meet WCAG 2.1 AA standards:

```tsx
// ✅ Good - Accessible component
<button
  type="button"
  className="btn-primary"
  onClick={handleClick}
  disabled={isProcessing}
  aria-label="Process PDF document"
  aria-describedby="process-description"
>
  {isProcessing ? (
    <>
      <Spinner aria-hidden="true" />
      <span className="sr-only">Processing...</span>
      Processing
    </>
  ) : (
    'Process Document'
  )}
</button>
```

## 🗃️ State Management

### Zustand Store Patterns

#### Store Structure
```tsx
// stores/processingStore.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface ProcessingState {
  // State
  jobs: ProcessingJob[]
  isProcessing: boolean

  // Actions
  addJob: (file: File) => Promise<string>
  updateProgress: (jobId: string, progress: number) => void

  // Computed values (via selectors)
  getActiveJob: () => ProcessingJob | null
}

export const useProcessingStore = create<ProcessingState>()(
  devtools(
    immer((set, get) => ({
      // Implementation following established patterns
    })),
    { name: 'processing-store' }
  )
)
```

#### Store Usage in Components
```tsx
// ✅ Good - Selective subscriptions for performance
const isProcessing = useProcessingStore(state => state.isProcessing)
const addJob = useProcessingStore(state => state.addJob)

// ❌ Bad - Subscribing to entire store causes unnecessary re-renders
const store = useProcessingStore()
```

## 🧪 Testing Guidelines

### Component Testing
```tsx
// ComponentName.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { DocumentProcessor } from './DocumentProcessor'

describe('DocumentProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders upload interface when not processing', () => {
    render(<DocumentProcessor />)

    expect(screen.getByText(/upload pdf/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /select file/i })).toBeInTheDocument()
  })

  it('handles file upload and validation', async () => {
    const onComplete = vi.fn()
    render(<DocumentProcessor onComplete={onComplete} />)

    const fileInput = screen.getByLabelText(/upload pdf/i)
    const validFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })

    fireEvent.change(fileInput, { target: { files: [validFile] } })

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          filename: 'test.pdf'
        })
      )
    })
  })

  it('maintains 60fps during animations', async () => {
    // Performance testing implementation
  })
})
```

### Test Coverage Requirements
- **Minimum Coverage**: 80% for all new code
- **Critical Paths**: 100% coverage for processing logic, authentication, and payment flows
- **Performance Tests**: Include animation performance and memory leak tests

## ⚡ Performance Standards

### Performance Requirements
1. **Processing Speed**: Sub-6 second target for 50-page documents
2. **UI Performance**: 60fps for all animations
3. **Bundle Size**: <500KB initial load
4. **Mobile Performance**: <3 second load on 3G

### Performance Optimization Checklist
```tsx
// ✅ Good - Performance optimized
const MemoizedComponent = React.memo(({ data }) => {
  const expensiveValue = useMemo(() =>
    calculateExpensiveValue(data), [data]
  )

  const handleClick = useCallback(() => {
    // Handle click
  }, [])

  return <div>{expensiveValue}</div>
})

// ✅ Good - Lazy loading
const DocumentViewer = React.lazy(() => import('./DocumentViewer'))

// ✅ Good - Debounced input
const debouncedSearch = useMemo(
  () => debounce(handleSearch, 300),
  [handleSearch]
)
```

### Glassmorphic Performance Guidelines
```tsx
// ✅ Good - Mobile-optimized blur
className={cn(
  'backdrop-blur-lg sm:backdrop-blur-xl', // 8px mobile, 20px desktop
  'will-change-transform', // Hardware acceleration
  'transition-transform duration-200' // Smooth animations
)}

// ❌ Bad - Performance-heavy effects
className="backdrop-blur-3xl filter drop-shadow-2xl" // Too intensive
```

## 🔄 Pull Request Process

### PR Requirements Checklist
- [ ] **Code Quality**: Passes `npm run lint` and `npm run typecheck`
- [ ] **Tests**: All tests pass with `npm run test`
- [ ] **Coverage**: Maintains or improves test coverage
- [ ] **Performance**: No performance regressions
- [ ] **Accessibility**: Meets WCAG 2.1 AA standards
- [ ] **Documentation**: README updated if needed

### PR Description Template
```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Performance testing (if applicable)

## Screenshots/GIFs
For UI changes, include visual proof

## Performance Impact
Describe any performance implications

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added for new functionality
- [ ] Documentation updated
```

### Review Process
1. **Automated Checks**: CI must pass (lint, typecheck, tests)
2. **Code Review**: At least one team member approval
3. **Performance Review**: For performance-critical changes
4. **Accessibility Review**: For UI/UX changes

## 🏗️ Architecture Alignment

### Following Architecture Documents
All code must align with the established architecture:

1. **Frontend Architecture**: Follow component patterns in `docs/ui-architecture.md`
2. **Design System**: Implement glassmorphic patterns from `docs/pdf-saas-interface-architecture.md`
3. **Performance Targets**: Meet sub-6 second processing goals
4. **State Management**: Use Zustand patterns as specified

### Integration Patterns
```tsx
// ✅ Good - Following established API patterns
const apiClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  circuitBreakerEnabled: true,
  retryAttempts: 3
})

// ✅ Good - WebSocket integration following architecture
const websocketService = useWebSocket({
  url: import.meta.env.VITE_WEBSOCKET_URL,
  onProcessingUpdate: handleProcessingUpdate,
  reconnectAttempts: 5
})
```

## ❓ Questions and Support

- **Architecture Questions**: Reference `docs/` directory
- **Development Issues**: Create GitHub issue with detailed description
- **Performance Concerns**: Include performance profiling data
- **Design Questions**: Reference glassmorphic design system documentation

## 🎯 Success Metrics

Your contributions should help achieve:
- **10x Speed Advantage**: Sub-6 second processing vs Adobe's 45+ seconds
- **60fps UI Performance**: Smooth animations across all devices
- **80%+ Test Coverage**: Comprehensive testing for reliability
- **WCAG 2.1 AA Compliance**: Accessible to all users

Thank you for contributing to the future of PDF processing! 🚀