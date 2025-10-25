/**
 * Session Context - PDFCraft.Pro
 * React context for session management with hooks
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { sessionManager, SessionManager } from '@/lib/session-manager';
import { User, AuthResult } from '@/lib/auth-api';

interface SessionContextType {
  // Session state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionStats: {
    timeUntilExpiry: number;
    timeSinceLastActivity: number;
    isActive: boolean;
  };

  // Session actions
  login: (authResult: AuthResult) => void;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  updateActivity: () => void;

  // Session info
  getTimeUntilExpiry: () => string;
  getRemainingConversions: () => number | 'unlimited';
  canPerformConversion: () => boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: React.ReactNode;
  autoRefreshThreshold?: number;
  maxInactivityTime?: number;
  enableCrossTabSync?: boolean;
  enableActivityTracking?: boolean;
}

export function SessionProvider({
  children,
  autoRefreshThreshold = 5,
  maxInactivityTime = 60,
  enableCrossTabSync = true,
  enableActivityTracking = true
}: SessionProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({
    timeUntilExpiry: 0,
    timeSinceLastActivity: 0,
    isActive: false
  });

  // Configure session manager
  useEffect(() => {
    SessionManager.configure({
      autoRefreshThreshold,
      maxInactivityTime,
      enableCrossTabSync,
      enableActivityTracking
    });
  }, [autoRefreshThreshold, maxInactivityTime, enableCrossTabSync, enableActivityTracking]);

  // Initialize session state
  useEffect(() => {
    const initializeSession = () => {
      try {
        const currentUser = sessionManager.getCurrentUser();
        const authenticated = sessionManager.isAuthenticated();

        setUser(currentUser);
        setIsAuthenticated(authenticated);
        setSessionStats(sessionManager.getSessionStats());

        console.log('📊 Session initialized:', { authenticated, user: currentUser?.email });
      } catch (error) {
        console.error('❌ Session initialization failed:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, []);

  // Update session stats periodically
  useEffect(() => {
    const updateStats = () => {
      setSessionStats(sessionManager.getSessionStats());
    };

    const interval = setInterval(updateStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Login function
  const login = useCallback((authResult: AuthResult) => {
    try {
      sessionManager.setSession(authResult);
      setUser(authResult.user);
      setIsAuthenticated(true);
      setSessionStats(sessionManager.getSessionStats());

      console.log('✅ User logged in:', authResult.user.email);
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await sessionManager.logout();
      setUser(null);
      setIsAuthenticated(false);
      setSessionStats({ timeUntilExpiry: 0, timeSinceLastActivity: 0, isActive: false });

      console.log('✅ User logged out');
    } catch (error) {
      console.error('❌ Logout failed:', error);
      throw error;
    }
  }, []);

  // Refresh token function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const success = await sessionManager.refreshToken();

      if (success) {
        const updatedUser = sessionManager.getCurrentUser();
        setUser(updatedUser);
        setSessionStats(sessionManager.getSessionStats());
        console.log('✅ Token refreshed successfully');
      }

      return success;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }
  }, []);

  // Update activity
  const updateActivity = useCallback(() => {
    sessionManager.updateLastActivity();
    setSessionStats(sessionManager.getSessionStats());
  }, []);

  // Get formatted time until expiry
  const getTimeUntilExpiry = useCallback((): string => {
    const { timeUntilExpiry } = sessionStats;

    if (timeUntilExpiry <= 0) return 'Expired';

    const minutes = Math.floor(timeUntilExpiry / (1000 * 60));
    const seconds = Math.floor((timeUntilExpiry % (1000 * 60)) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [sessionStats]);

  // Get remaining conversions
  const getRemainingConversions = useCallback((): number | 'unlimited' => {
    if (!user) return 0;

    if (user.plan === 'pro') return 'unlimited';
    return Math.max(0, user.conversions_limit - user.conversions_used);
  }, [user]);

  // Check if user can perform conversion
  const canPerformConversion = useCallback((): boolean => {
    if (!user) return false;

    if (user.plan === 'pro') return true;
    return user.conversions_used < user.conversions_limit;
  }, [user]);

  // Handle session expiry and cleanup
  useEffect(() => {
    const handleSessionExpiry = () => {
      if (sessionStats.timeUntilExpiry <= 0 && sessionStats.isActive) {
        console.log('⚠️ Session expired, logging out...');
        logout();
      }
    };

    handleSessionExpiry();
  }, [sessionStats, logout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionManager.destroy();
    };
  }, []);

  const value: SessionContextType = {
    // State
    user,
    isAuthenticated,
    isLoading,
    sessionStats,

    // Actions
    login,
    logout,
    refreshToken,
    updateActivity,

    // Utilities
    getTimeUntilExpiry,
    getRemainingConversions,
    canPerformConversion
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

// Custom hook to use session context
export function useSession() {
  const context = useContext(SessionContext);

  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }

  return context;
}

// Hook for authentication status only
export function useAuth() {
  const { isAuthenticated, isLoading, user } = useSession();
  return { isAuthenticated, isLoading, user };
}

// Hook for session management actions
export function useSessionActions() {
  const { login, logout, refreshToken, updateActivity } = useSession();
  return { login, logout, refreshToken, updateActivity };
}

// Hook for user conversion limits
export function useConversions() {
  const { user, getRemainingConversions, canPerformConversion } = useSession();
  return {
    user,
    remainingConversions: getRemainingConversions(),
    canConvert: canPerformConversion()
  };
}

export default SessionContext;