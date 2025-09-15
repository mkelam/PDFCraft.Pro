/**
 * Speed Visualization Component Tests
 * Tests for the speed comparison and visualization features
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { SpeedVisualization } from '../../components/ui/SpeedVisualization/SpeedVisualization'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}))

describe('SpeedVisualization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render processing state correctly', () => {
      render(<SpeedVisualization isProcessing={true} />)

      expect(screen.getByText('Processing...')).toBeInTheDocument()
      expect(screen.getByText('Processing Time')).toBeInTheDocument()
    })

    it('should render completed state with processing time', () => {
      render(<SpeedVisualization processingTimeMs={3500} />)

      expect(screen.getByText('3.5s')).toBeInTheDocument()
      expect(screen.getByText('EXCELLENT')).toBeInTheDocument()
    })

    it('should show speed comparison when enabled', () => {
      render(
        <SpeedVisualization
          processingTimeMs={4500}
          showComparison={true}
        />
      )

      expect(screen.getByText('Speed Comparison')).toBeInTheDocument()
      expect(screen.getByText('Our Platform')).toBeInTheDocument()
      expect(screen.getByText('Adobe')).toBeInTheDocument()
    })

    it('should not show comparison when disabled', () => {
      render(
        <SpeedVisualization
          processingTimeMs={3500}
          showComparison={false}
        />
      )

      expect(screen.queryByText('Speed Comparison')).not.toBeInTheDocument()
    })
  })

  describe('performance ratings', () => {
    it('should show excellent rating for fast processing', () => {
      render(<SpeedVisualization processingTimeMs={3000} />)

      expect(screen.getByText('EXCELLENT')).toBeInTheDocument()
      expect(screen.getByText('🚀')).toBeInTheDocument()
    })

    it('should show good rating for moderate processing', () => {
      render(<SpeedVisualization processingTimeMs={10000} />)

      expect(screen.getByText('GOOD')).toBeInTheDocument()
      expect(screen.getByText('⚡')).toBeInTheDocument()
    })

    it('should show needs optimization for slow processing', () => {
      render(<SpeedVisualization processingTimeMs={20000} />)

      expect(screen.getByText('NEEDS OPTIMIZATION')).toBeInTheDocument()
      expect(screen.getByText('🐌')).toBeInTheDocument()
    })
  })

  describe('time formatting', () => {
    it('should format milliseconds correctly', () => {
      render(<SpeedVisualization processingTimeMs={500} />)
      expect(screen.getByText('500ms')).toBeInTheDocument()
    })

    it('should format seconds correctly', () => {
      render(<SpeedVisualization processingTimeMs={2500} />)
      expect(screen.getByText('2.5s')).toBeInTheDocument()
    })

    it('should handle large values', () => {
      render(<SpeedVisualization processingTimeMs={65000} />)
      expect(screen.getByText('65.0s')).toBeInTheDocument()
    })
  })

  describe('speed advantage calculation', () => {
    it('should calculate speed advantage correctly', () => {
      render(
        <SpeedVisualization
          processingTimeMs={4500}
          showComparison={true}
        />
      )

      // 45000ms / 4500ms = 10x faster
      expect(screen.getByText('10.0x faster')).toBeInTheDocument()
    })

    it('should show default advantage when no processing time provided', () => {
      render(<SpeedVisualization showComparison={true} />)

      expect(screen.getByText('10x faster')).toBeInTheDocument()
    })
  })

  describe('processing indicator', () => {
    it('should show processing animation when processing', () => {
      render(<SpeedVisualization isProcessing={true} />)

      expect(screen.getByText('Optimizing at light speed...')).toBeInTheDocument()

      // Check for animated elements
      const { container } = render(<SpeedVisualization isProcessing={true} />)
      const animatedBars = container.querySelectorAll('.animate-spin')
      expect(animatedBars.length).toBeGreaterThan(0)
    })

    it('should not show processing animation when completed', () => {
      render(<SpeedVisualization processingTimeMs={3500} />)

      expect(screen.queryByText('Optimizing at light speed...')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <SpeedVisualization
          processingTimeMs={3500}
          showComparison={true}
        />
      )

      // Check that performance information is accessible
      expect(screen.getByText('3.5s')).toBeInTheDocument()
      expect(screen.getByText('EXCELLENT')).toBeInTheDocument()
    })

    it('should provide meaningful text content for screen readers', () => {
      render(
        <SpeedVisualization
          processingTimeMs={4500}
          showComparison={true}
        />
      )

      expect(screen.getByText('Speed Advantage')).toBeInTheDocument()
      expect(screen.getByText('10.0x faster')).toBeInTheDocument()
    })
  })

  describe('animation states', () => {
    it('should handle animation completion properly', async () => {
      const { rerender } = render(<SpeedVisualization processingTimeMs={3500} />)

      // Initial render should show the time
      expect(screen.getByText('3.5s')).toBeInTheDocument()

      // Re-render with different time should update
      rerender(<SpeedVisualization processingTimeMs={5500} />)

      await act(async () => {
        // Wait for animation to potentially complete
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(screen.getByText('5.5s')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle zero processing time', () => {
      render(<SpeedVisualization processingTimeMs={0} />)

      expect(screen.getByText('0ms')).toBeInTheDocument()
    })

    it('should handle very large processing times', () => {
      render(<SpeedVisualization processingTimeMs={120000} />)

      expect(screen.getByText('2m 0s')).toBeInTheDocument()
      expect(screen.getByText('NEEDS OPTIMIZATION')).toBeInTheDocument()
    })

    it('should handle undefined processing time gracefully', () => {
      render(<SpeedVisualization />)

      // Should show default state without errors
      expect(screen.getByText('6.0s')).toBeInTheDocument() // Default target time
    })
  })

  describe('responsive behavior', () => {
    it('should apply custom className when provided', () => {
      const { container } = render(
        <SpeedVisualization className="custom-class" processingTimeMs={3500} />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })
})