import React, { useState } from 'react'
import { useAuth } from '../../services/authService'
import { GlassmorphicCard } from '../ui/GlassmorphicCard'
import { AuthModal, UserProfile } from '../auth'
import { User, ChevronDown } from 'lucide-react'

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [showUserProfile, setShowUserProfile] = useState(false)

  const handleLoginClick = () => {
    setAuthMode('login')
    setShowAuthModal(true)
  }

  const handleRegisterClick = () => {
    setAuthMode('register')
    setShowAuthModal(true)
  }

  return (
    <GlassmorphicCard className="p-4 mb-6">
      <div className="flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">PDF SaaS</h1>
              <p className="text-xs text-slate-500">10x faster than Adobe</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-4">
            <a
              href="/"
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              Dashboard
            </a>
            <a
              href="/performance"
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              Performance
            </a>
            <a
              href="/developers"
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              Developers
            </a>
            {isAuthenticated && (
              <a
                href="/api-keys"
                className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                API Keys
              </a>
            )}
          </nav>
        </div>

        {/* Navigation & User Menu */}
        <div className="flex items-center space-x-4">
          {isAuthenticated && user ? (
            <div className="relative">
              {/* User Button */}
              <button
                onClick={() => setShowUserProfile(!showUserProfile)}
                className="flex items-center space-x-3 hover:bg-white/50 rounded-lg p-2 transition-colors"
              >
                {/* User Info */}
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-700">{user.full_name}</p>
                  <p className="text-xs text-slate-500 capitalize">{user.plan_type} Plan</p>
                </div>

                {/* User Avatar */}
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {/* User Profile Dropdown */}
              {showUserProfile && (
                <div className="absolute top-full right-0 mt-2 z-50">
                  <UserProfile onClose={() => setShowUserProfile(false)} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleLoginClick}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors text-sm font-medium"
              >
                Sign In
              </button>
              <button
                onClick={handleRegisterClick}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </GlassmorphicCard>
  )
}