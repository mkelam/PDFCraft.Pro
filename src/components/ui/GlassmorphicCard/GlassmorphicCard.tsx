import React from 'react'
import { cn } from '../../../lib/utils'

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