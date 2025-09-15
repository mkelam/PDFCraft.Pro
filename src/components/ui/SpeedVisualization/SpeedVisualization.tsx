/**
 * Speed Visualization Component
 * Shows processing speed comparison with Adobe (10x advantage visualization)
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../../lib/utils'
import { apiUtils } from '../../../services/api'

interface SpeedVisualizationProps {
  processingTimeMs?: number
  isProcessing?: boolean
  showComparison?: boolean
  className?: string
}

export const SpeedVisualization: React.FC<SpeedVisualizationProps> = ({
  processingTimeMs,
  isProcessing = false,
  showComparison = true,
  className
}) => {
  const [animatedTime, setAnimatedTime] = useState(0)
  const [animatedAdobeTime, setAnimatedAdobeTime] = useState(0)

  const targetTime = processingTimeMs ? processingTimeMs / 1000 : 6 // Default to 6s target
  const adobeTime = 45 // Adobe's typical processing time

  // Animate counters
  useEffect(() => {
    if (!processingTimeMs) return

    const duration = 1000
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3)

      setAnimatedTime(targetTime * easeOut)

      if (showComparison) {
        setAnimatedAdobeTime(adobeTime * easeOut)
      }

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }, [processingTimeMs, targetTime, adobeTime, showComparison])

  const performanceRating = processingTimeMs
    ? apiUtils.getPerformanceRating(processingTimeMs)
    : { rating: 'excellent' as const, color: 'green', emoji: '🚀' }

  const speedAdvantage = processingTimeMs
    ? apiUtils.calculateSpeedAdvantage(processingTimeMs)
    : '10x faster'

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Speed Display */}
      <div className="text-center space-y-2">
        <div className="relative">
          <motion.div
            className={cn(
              'text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent',
              performanceRating.color === 'green'
                ? 'from-green-600 to-emerald-600'
                : performanceRating.color === 'yellow'
                ? 'from-yellow-600 to-orange-600'
                : 'from-red-600 to-rose-600'
            )}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-pulse">Processing...</div>
                <div className="animate-spin h-6 w-6 rounded-full border-2 border-current border-t-transparent"></div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>{performanceRating.emoji}</span>
                <span>
                  {animatedTime < 1
                    ? `${Math.round(animatedTime * 1000)}ms`
                    : `${animatedTime.toFixed(1)}s`
                  }
                </span>
              </div>
            )}
          </motion.div>

          {/* Performance Badge */}
          <motion.div
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium mt-1',
              performanceRating.color === 'green'
                ? 'bg-green-100 text-green-800'
                : performanceRating.color === 'yellow'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            )}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {performanceRating.rating.replace('_', ' ').toUpperCase()}
          </motion.div>
        </div>

        <p className="text-sm text-slate-600">Processing Time</p>
      </div>

      {/* Speed Comparison */}
      {showComparison && (
        <AnimatePresence>
          <motion.div
            className="bg-slate-50 rounded-lg p-4 space-y-3"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h4 className="text-sm font-semibold text-center text-slate-700">
              Speed Comparison
            </h4>

            {/* Visual Speed Bars */}
            <div className="space-y-2">
              {/* Our Platform */}
              <div className="flex items-center gap-3">
                <div className="w-16 text-xs font-medium text-blue-700">Our Platform</div>
                <div className="flex-1 bg-blue-100 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${(animatedTime / adobeTime) * 100}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                <div className="w-12 text-xs text-slate-600 text-right">
                  {animatedTime.toFixed(1)}s
                </div>
              </div>

              {/* Adobe */}
              <div className="flex items-center gap-3">
                <div className="w-16 text-xs font-medium text-slate-500">Adobe</div>
                <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-slate-400 to-slate-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1, delay: 0.7 }}
                  />
                </div>
                <div className="w-12 text-xs text-slate-600 text-right">
                  {Math.round(animatedAdobeTime)}s
                </div>
              </div>
            </div>

            {/* Speed Advantage */}
            <motion.div
              className="text-center p-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <div className="text-lg font-bold text-green-800">
                {speedAdvantage}
              </div>
              <div className="text-xs text-green-600">Speed Advantage</div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Real-time Performance Indicator */}
      {isProcessing && (
        <motion.div
          className="flex items-center justify-center gap-2 text-sm text-blue-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-4 bg-blue-500 rounded-full"
                animate={{
                  scaleY: [1, 2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1
                }}
              />
            ))}
          </div>
          <span>Optimizing at light speed...</span>
        </motion.div>
      )}
    </div>
  )
}

export default SpeedVisualization