import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth, AuthService, UsageStats } from '../../services/authService'
import {
  User,
  LogOut,
  Key,
  BarChart3,
  Settings,
  Crown,
  Clock,
  FileText,
  Zap,
  RefreshCw
} from 'lucide-react'

interface UserProfileProps {
  onClose?: () => void
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { user, logout, refreshUser } = useAuth()
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  useEffect(() => {
    if (user) {
      loadUsageStats()
    }
  }, [user])

  const loadUsageStats = async () => {
    if (!user) return

    setIsLoadingStats(true)
    try {
      const stats = await AuthService.getUsageStats()
      setUsageStats(stats)
    } catch (error) {
      console.error('Failed to load usage stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const handleLogout = () => {
    logout()
    onClose?.()
  }

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'enterprise': return 'text-purple-600 bg-purple-100'
      case 'business': return 'text-blue-600 bg-blue-100'
      case 'starter': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'enterprise': return <Crown className="w-4 h-4" />
      case 'business': return <Zap className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  if (!user) return null

  const usagePercentage = usageStats
    ? Math.round((usageStats.documents_processed / usageStats.monthly_limit) * 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg shadow-xl border border-gray-200 w-80"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{user.full_name}</h3>
            <p className="text-sm text-gray-500 truncate">{user.email}</p>
          </div>
        </div>

        {/* Plan Badge */}
        <div className="mt-4">
          <div
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPlanColor(
              user.plan_type
            )}`}
          >
            {getPlanIcon(user.plan_type)}
            <span className="ml-1 capitalize">{user.plan_type} Plan</span>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Monthly Usage
          </h4>
          <button
            onClick={loadUsageStats}
            disabled={isLoadingStats}
            className="text-blue-600 hover:text-blue-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {usageStats ? (
          <div className="space-y-3">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Documents Processed</span>
                <span>
                  {usageStats.documents_processed} / {usageStats.monthly_limit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    usagePercentage >= 90
                      ? 'bg-red-500'
                      : usagePercentage >= 70
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center text-gray-600 mb-1">
                  <FileText className="w-4 h-4 mr-1" />
                  Total Docs
                </div>
                <div className="font-semibold text-gray-900">
                  {user.total_documents_processed.toLocaleString()}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center text-gray-600 mb-1">
                  <Clock className="w-4 h-4 mr-1" />
                  Requests
                </div>
                <div className="font-semibold text-gray-900">
                  {usageStats.api_requests_count.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Warning if approaching limit */}
            {usagePercentage >= 80 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                <p className="text-yellow-800">
                  {usagePercentage >= 90
                    ? '⚠️ Approaching monthly limit'
                    : '📊 High usage this month'}
                </p>
                <p className="text-yellow-600 text-xs mt-1">
                  Consider upgrading your plan for unlimited processing
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-gray-500">
            {isLoadingStats ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <p className="text-sm">Unable to load usage stats</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 space-y-2">
        <button className="w-full flex items-center px-3 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
          <Key className="w-4 h-4 mr-3" />
          <span className="text-sm">Manage API Keys</span>
        </button>

        <button className="w-full flex items-center px-3 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
          <Settings className="w-4 h-4 mr-3" />
          <span className="text-sm">Account Settings</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4 mr-3" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4">
        <div className="text-xs text-gray-500 text-center">
          Member since{' '}
          {new Date(user.created_at).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
          })}
        </div>
      </div>
    </motion.div>
  )
}