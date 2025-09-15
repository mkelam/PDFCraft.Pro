/**
 * Authentication Service
 * Frontend integration with PDF SaaS Platform authentication
 */

import axios, { AxiosResponse } from 'axios'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

// Types
export interface User {
  id: string
  email: string
  full_name: string
  company?: string
  role: 'admin' | 'enterprise' | 'business' | 'individual' | 'trial'
  plan_type: 'free' | 'starter' | 'business' | 'enterprise' | 'custom'
  is_active: boolean
  created_at: string
  updated_at: string
  monthly_documents_processed: number
  total_documents_processed: number
  monthly_limit: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
  company?: string
  role?: string
  plan_type?: string
}

export interface AuthToken {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
}

export interface APIKey {
  id: string
  name: string
  key?: string // Full key only shown once
  key_prefix: string
  scopes: string[]
  expires_at?: string
  rate_limit_per_hour: number
  created_at: string
  last_used?: string
  is_active: boolean
}

export interface UsageStats {
  user_id: string
  current_month: number
  current_year: number
  documents_processed: number
  processing_time_total_ms: number
  api_requests_count: number
  storage_used_bytes: number
  monthly_limit: number
  plan_type: string
}

export interface RateLimitInfo {
  user_id: string
  requests_remaining: number
  requests_limit: number
  reset_time: string
  plan_type: string
  monthly_documents_remaining: number
}

// Authentication API Client
const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

// Add token to requests
authClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pdf_saas_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle token expiration
authClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true // Prevent infinite loops

      // Clean logout and dispatch non-disruptive event
      AuthService.logout()

      // Dispatch a global event instead of hard redirect
      // This allows the UI to handle auth expiration gracefully
      window.dispatchEvent(new CustomEvent('auth-expired', {
        detail: {
          message: 'Your session has expired. Please log in again.',
          redirectTo: '/login',
          originalRequest: originalRequest
        }
      }))
    }

    return Promise.reject(error)
  }
)

export class AuthService {
  /**
   * User Registration
   */
  static async register(userData: RegisterRequest): Promise<User> {
    const response: AxiosResponse<User> = await authClient.post('/auth/register', userData)
    return response.data
  }

  /**
   * User Login
   */
  static async login(credentials: LoginRequest): Promise<AuthToken> {
    const response: AxiosResponse<AuthToken> = await authClient.post('/auth/login', credentials)

    // Store token in localStorage
    localStorage.setItem('pdf_saas_token', response.data.access_token)

    // Store expiration time
    const expiresAt = new Date(Date.now() + response.data.expires_in * 1000)
    localStorage.setItem('pdf_saas_token_expires', expiresAt.toISOString())

    return response.data
  }

  /**
   * Logout
   */
  static logout(): void {
    localStorage.removeItem('pdf_saas_token')
    localStorage.removeItem('pdf_saas_token_expires')
    localStorage.removeItem('pdf_saas_user')
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = localStorage.getItem('pdf_saas_token')
    const expiresAt = localStorage.getItem('pdf_saas_token_expires')

    if (!token || !expiresAt) {
      return false
    }

    // Check if token is expired
    const now = new Date()
    const expiration = new Date(expiresAt)

    if (now >= expiration) {
      this.logout()
      return false
    }

    return true
  }

  /**
   * Get stored authentication token
   */
  static getToken(): string | null {
    return localStorage.getItem('pdf_saas_token')
  }

  /**
   * Get current user information
   */
  static async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<User> = await authClient.get('/auth/me')

    // Cache user info
    localStorage.setItem('pdf_saas_user', JSON.stringify(response.data))

    return response.data
  }

  /**
   * Get cached user info
   */
  static getCachedUser(): User | null {
    const userStr = localStorage.getItem('pdf_saas_user')
    return userStr ? JSON.parse(userStr) : null
  }

  /**
   * Get user usage statistics
   */
  static async getUsageStats(): Promise<UsageStats> {
    const response: AxiosResponse<UsageStats> = await authClient.get('/auth/usage')
    return response.data
  }

  /**
   * Create new API key
   */
  static async createAPIKey(keyData: {
    name: string
    description?: string
    scopes?: string[]
    expires_at?: string
    rate_limit_per_hour?: number
  }): Promise<APIKey> {
    const response: AxiosResponse<APIKey> = await authClient.post('/auth/api-keys', keyData)
    return response.data
  }

  /**
   * List user's API keys
   */
  static async listAPIKeys(): Promise<APIKey[]> {
    const response: AxiosResponse<APIKey[]> = await authClient.get('/auth/api-keys')
    return response.data
  }

  /**
   * Delete API key
   */
  static async deleteAPIKey(keyId: string): Promise<void> {
    await authClient.delete(`/auth/api-keys/${keyId}`)
  }

  /**
   * Get rate limit information
   */
  static async getRateLimitInfo(): Promise<RateLimitInfo> {
    // Use API key authentication for this endpoint
    const token = this.getToken()
    const response: AxiosResponse<RateLimitInfo> = await authClient.get('/auth/rate-limit', {
      headers: {
        'X-API-Key': token // This would normally be an API key, not JWT
      }
    })
    return response.data
  }

  /**
   * Create demo users (development only)
   */
  static async createDemoUsers(): Promise<void> {
    await authClient.post('/auth/demo/create-users')
  }

  /**
   * Test API key authentication
   */
  static async testAPIKey(apiKey: string): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/auth/demo/test-api-key`, {
      headers: {
        'X-API-Key': apiKey
      }
    })
    return response.data
  }
}

// React Hook for Authentication State
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(AuthService.getCachedUser())
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated())

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true)
    try {
      await AuthService.login(credentials)
      const userData = await AuthService.getCurrentUser()
      setUser(userData)
      setIsAuthenticated(true)
      return userData
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    AuthService.logout()
    setUser(null)
    setIsAuthenticated(false)
  }

  const register = async (userData: RegisterRequest) => {
    setIsLoading(true)
    try {
      return await AuthService.register(userData)
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUser = async () => {
    if (!isAuthenticated) return null

    try {
      const userData = await AuthService.getCurrentUser()
      setUser(userData)
      return userData
    } catch (error) {
      console.error('Failed to refresh user:', error)
      logout()
      return null
    }
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    refreshUser
  }
}

// Import React for the hook
import { useState } from 'react'