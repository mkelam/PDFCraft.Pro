/**
 * Session Status Component - PDFCraft.Pro
 * Development component for monitoring session status and testing
 */

'use client';

import React from 'react';
import { useSession } from '@/contexts/SessionContext';

interface SessionStatusProps {
  showDebugInfo?: boolean;
  className?: string;
}

export function SessionStatus({ showDebugInfo = false, className = '' }: SessionStatusProps) {
  const {
    user,
    isAuthenticated,
    isLoading,
    sessionStats,
    getTimeUntilExpiry,
    getRemainingConversions,
    canPerformConversion,
    refreshToken,
    logout
  } = useSession();

  if (isLoading) {
    return (
      <div className={`session-status loading ${className}`}>
        <div className="animate-pulse">Loading session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`session-status unauthenticated ${className}`}>
        <div className="text-gray-500">Not authenticated</div>
      </div>
    );
  }

  const handleRefreshToken = async () => {
    try {
      await refreshToken();
    } catch (error) {
      console.error('Manual refresh failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className={`session-status authenticated ${className} p-4 bg-gray-50 rounded-lg border`}>
      {/* User Info */}
      <div className="mb-3">
        <div className="text-sm font-medium text-gray-900">
          👤 {user?.email}
        </div>
        <div className="text-xs text-gray-600">
          Plan: {user?.plan?.toUpperCase()} |
          Conversions: {user?.conversions_used}/{user?.conversions_limit === -1 ? '∞' : user?.conversions_limit}
        </div>
      </div>

      {/* Session Status */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-xs">
          <div className="font-medium text-gray-700">Token Expires</div>
          <div className={`${sessionStats.timeUntilExpiry < 300000 ? 'text-red-600' : 'text-green-600'}`}>
            {getTimeUntilExpiry()}
          </div>
        </div>
        <div className="text-xs">
          <div className="font-medium text-gray-700">Can Convert</div>
          <div className={canPerformConversion() ? 'text-green-600' : 'text-red-600'}>
            {canPerformConversion() ? '✅ Yes' : '❌ No'}
          </div>
        </div>
      </div>

      {/* Remaining Conversions */}
      <div className="mb-3 text-xs">
        <div className="font-medium text-gray-700">Remaining Conversions</div>
        <div className="text-blue-600">
          {getRemainingConversions() === 'unlimited' ? '∞ Unlimited' : `${getRemainingConversions()} left`}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleRefreshToken}
          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          🔄 Refresh Token
        </button>
        <button
          onClick={handleLogout}
          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          🚪 Logout
        </button>
      </div>

      {/* Debug Information */}
      {showDebugInfo && (
        <details className="mt-3">
          <summary className="text-xs font-medium text-gray-700 cursor-pointer">
            🔍 Debug Info
          </summary>
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs space-y-1">
            <div>
              <strong>Session Active:</strong> {sessionStats.isActive ? '✅' : '❌'}
            </div>
            <div>
              <strong>Time Until Expiry:</strong> {sessionStats.timeUntilExpiry}ms
            </div>
            <div>
              <strong>Last Activity:</strong> {Math.round(sessionStats.timeSinceLastActivity / 1000)}s ago
            </div>
            <div>
              <strong>User ID:</strong> {user?.id}
            </div>
            <div>
              <strong>Created:</strong> {user?.created_at}
            </div>
            <div>
              <strong>Updated:</strong> {user?.updated_at}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

export default SessionStatus;