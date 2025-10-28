/**
 * Authentication Context - pdflab.pro
 * Global authentication state management using React Context
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AuthAPI, { User, LoginData, SignupData, AuthResult } from '@/lib/auth-api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (loginData: LoginData) => Promise<AuthResult>;
  register: (signupData: SignupData) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize authentication state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);

      // Check if we have a stored token
      const token = AuthAPI.getToken();
      const storedUser = AuthAPI.getUser();

      if (token && storedUser) {
        // Verify token is still valid by fetching current user
        try {
          const currentUser = await AuthAPI.getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          // Token is invalid, clear stored data
          console.warn('Stored token is invalid, clearing auth data:', error);
          AuthAPI.removeToken();
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (loginData: LoginData): Promise<AuthResult> => {
    try {
      setIsLoading(true);
      const result = await AuthAPI.login(loginData);
      setUser(result.user);
      return result;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (signupData: SignupData): Promise<AuthResult> => {
    try {
      setIsLoading(true);
      const result = await AuthAPI.register(signupData);
      // DO NOT set user here - they need to verify email first
      // User will be authenticated after clicking verification link
      // setUser(result.user);
      return result;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await AuthAPI.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      if (!AuthAPI.isAuthenticated()) return;

      const currentUser = await AuthAPI.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If refresh fails, user might be logged out
      setUser(null);
      AuthAPI.removeToken();
    }
  };

  const updateUser = (updatedUser: User): void => {
    setUser(updatedUser);
    AuthAPI.setUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Custom hook for checking authentication status
export function useRequireAuth() {
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login page if not authenticated
      window.location.href = '/login';
    }
  }, [isAuthenticated, isLoading]);

  return { isAuthenticated, isLoading, user };
}

// Custom hook for redirecting authenticated users
export function useGuestOnly() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Redirect to dashboard if already authenticated
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated, isLoading]);

  return { isAuthenticated, isLoading };
}

export default AuthContext;