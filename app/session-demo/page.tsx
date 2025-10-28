/**
 * Session Management Demo Page
 * Demonstrates the enhanced session management features
 */

'use client';

import React, { useState } from 'react';
import { useSession, useAuth, useSessionActions, useConversions } from '@/contexts/SessionContext';
import SessionStatus from '@/components/SessionStatus';
import { AuthAPI } from '@/lib/auth-api';

export default function SessionDemoPage() {
  const { sessionStats, getTimeUntilExpiry } = useSession();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { login, logout, refreshToken } = useSessionActions();
  const { remainingConversions, canConvert } = useConversions();

  const [loginForm, setLoginForm] = useState({
    email: 'testuser@example.com',
    password: 'TestPassword123!'
  });
  const [statusMessage, setStatusMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('Logging in...');

    try {
      const result = await AuthAPI.login(loginForm);
      login(result);
      setStatusMessage('✅ Login successful!');
    } catch (error) {
      setStatusMessage(`❌ Login failed: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    setStatusMessage('Logging out...');
    try {
      await logout();
      setStatusMessage('✅ Logout successful!');
    } catch (error) {
      setStatusMessage(`❌ Logout failed: ${error.message}`);
    }
  };

  const handleRefreshToken = async () => {
    setStatusMessage('Refreshing token...');
    try {
      const success = await refreshToken();
      setStatusMessage(success ? '✅ Token refreshed!' : '❌ Token refresh failed!');
    } catch (error) {
      setStatusMessage(`❌ Token refresh failed: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🛡️ Session Management Demo
          </h1>
          <p className="text-gray-600">
            Test the enhanced session management features of pdflab.pro
          </p>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">{statusMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Session Status Panel */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Session Status</h2>

            {isAuthenticated ? (
              <div className="space-y-4">
                <SessionStatus showDebugInfo={true} />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-green-50 p-3 rounded">
                    <div className="font-medium text-green-800">Authentication</div>
                    <div className="text-green-600">✅ Authenticated</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="font-medium text-blue-800">Conversions</div>
                    <div className="text-blue-600">
                      {remainingConversions === 'unlimited' ? '∞' : remainingConversions} remaining
                    </div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <div className="font-medium text-purple-800">Token Expiry</div>
                    <div className="text-purple-600">{getTimeUntilExpiry()}</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded">
                    <div className="font-medium text-orange-800">Can Convert</div>
                    <div className="text-orange-600">{canConvert ? '✅ Yes' : '❌ No'}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleRefreshToken}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    🔄 Refresh Token
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    🚪 Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">🔒</div>
                <p className="text-gray-600">Not authenticated</p>
                <p className="text-sm text-gray-500">Please log in to see session details</p>
              </div>
            )}
          </div>

          {/* Login/Demo Panel */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">🔐 Authentication Demo</h2>

            {!isAuthenticated ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  🔐 Login
                </button>
              </form>
            ) : (
              <div className="text-center py-8">
                <div className="text-green-400 text-6xl mb-4">✅</div>
                <p className="text-green-600 font-medium">Successfully Authenticated</p>
                <p className="text-gray-600 mt-2">Welcome back, {user?.email}!</p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">🧪 Test Features</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Auto Token Refresh</span>
                  <span className="text-green-600">✅ Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cross-Tab Sync</span>
                  <span className="text-green-600">✅ Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Activity Tracking</span>
                  <span className="text-green-600">✅ Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Session Timeout</span>
                  <span className="text-green-600">✅ 60min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Overview */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">🚀 Enhanced Session Management Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-blue-600 text-2xl mb-2">🔐</div>
              <h3 className="font-medium text-blue-900">Secure Storage</h3>
              <p className="text-sm text-blue-700">
                Encrypted session data with automatic cleanup
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-green-600 text-2xl mb-2">🔄</div>
              <h3 className="font-medium text-green-900">Auto Refresh</h3>
              <p className="text-sm text-green-700">
                Seamless token refresh 5 minutes before expiry
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-purple-600 text-2xl mb-2">🌐</div>
              <h3 className="font-medium text-purple-900">Cross-Tab Sync</h3>
              <p className="text-sm text-purple-700">
                Synchronized sessions across browser tabs
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-orange-600 text-2xl mb-2">⏱️</div>
              <h3 className="font-medium text-orange-900">Activity Tracking</h3>
              <p className="text-sm text-orange-700">
                Auto logout after 60 minutes of inactivity
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-red-600 text-2xl mb-2">🛡️</div>
              <h3 className="font-medium text-red-900">Security</h3>
              <p className="text-sm text-red-700">
                JWT validation with proper error handling
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-yellow-600 text-2xl mb-2">📊</div>
              <h3 className="font-medium text-yellow-900">Monitoring</h3>
              <p className="text-sm text-yellow-700">
                Real-time session statistics and alerts
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}