/**
 * Authentication API Client - PDFCraft.Pro
 * Frontend integration for user authentication and session management
 */
import { CONFIG } from '@/config/shared.config'

export interface User {
  id: number;
  email: string;
  email_verified: boolean;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  conversions_used: number;
  conversions_limit: number;
  created_at: string;
}

export interface AuthResult {
  user: User;
  token: string;
  refreshToken?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: AuthResult;
  message?: string;
  error?: {
    message: string;
    code: string;
  };
}

export class AuthAPI {
  private static baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://api.pdfcraft.pro'
    : CONFIG.API_BASE_URL;

  /**
   * Get authentication headers for API requests
   */
  private static getHeaders(): HeadersInit {
    const token = AuthAPI.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  /**
   * Handle API responses with error checking
   */
  private static async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();

    if (!response.ok) {
      // If there are validation details, include them in the error message
      if (data.error?.details && Array.isArray(data.error.details)) {
        const detailedErrors = data.error.details
          .map((detail: any) => detail.message)
          .join(', ');
        throw new Error(detailedErrors || data.error.message);
      }

      throw new Error(data.error?.message || data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  }

  /**
   * Store authentication token
   */
  static setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  /**
   * Get stored authentication token
   */
  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  }

  /**
   * Remove authentication token
   */
  static removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  /**
   * Store user data
   */
  static setUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  /**
   * Get stored user data
   */
  static getUser(): User | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!AuthAPI.getToken();
  }

  /**
   * Register new user
   */
  static async register(userData: SignupData): Promise<AuthResult> {
    try {
      // Send all data including confirmPassword to backend for validation
      // Backend validation middleware will check password match and other requirements
      console.log('[AUTH-API] Sending registration data:', {
        ...userData,
        password: '***',
        confirmPassword: userData.confirmPassword ? '***' : undefined
      });

      const response = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const result: AuthResponse = await this.handleResponse(response);

      if (result.success && result.data) {
        // Store authentication data
        this.setToken(result.data.token);
        this.setUser(result.data.user);

        if (result.data.refreshToken) {
          localStorage.setItem('refreshToken', result.data.refreshToken);
        }

        return result.data;
      }

      throw new Error(result.message || 'Registration failed');
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(loginData: LoginData): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
      });

      const result: AuthResponse = await this.handleResponse(response);

      if (result.success && result.data) {
        // Store authentication data
        this.setToken(result.data.token);
        this.setUser(result.data.user);

        if (result.data.refreshToken) {
          localStorage.setItem('refreshToken', result.data.refreshToken);
        }

        return result.data;
      }

      throw new Error(result.message || 'Login failed');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      // Call backend logout endpoint
      await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders()
      });
    } catch (error) {
      console.error('Logout request failed:', error);
      // Continue with local cleanup even if backend call fails
    } finally {
      // Always clear local authentication data
      this.removeToken();
    }
  }

  /**
   * Get current user from backend
   */
  static async getCurrentUser(): Promise<User> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/me`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result: AuthResponse = await this.handleResponse(response);

      if (result.success && result.data) {
        // Update stored user data
        this.setUser(result.data.user);
        return result.data.user;
      }

      throw new Error(result.message || 'Failed to get user data');
    } catch (error) {
      console.error('Get current user failed:', error);
      // If token is invalid, clear local data
      this.removeToken();
      throw error;
    }
  }

  /**
   * Refresh authentication token
   */
  static async refreshToken(): Promise<string> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      });

      const result: AuthResponse = await this.handleResponse(response);

      if (result.success && result.data) {
        this.setToken(result.data.token);

        if (result.data.refreshToken) {
          localStorage.setItem('refreshToken', result.data.refreshToken);
        }

        return result.data.token;
      }

      throw new Error(result.message || 'Token refresh failed');
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.removeToken();
      throw error;
    }
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { isValid: boolean; message: string } {
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/(?=.*\d)/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number' };
    }

    return { isValid: true, message: 'Password is strong' };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get user's plan limits
   */
  static getPlanLimits(plan: string): { conversionsPerMonth: number; maxFileSize: number } {
    switch (plan) {
      case 'starter':
        return { conversionsPerMonth: 100, maxFileSize: 25 * 1024 * 1024 }; // 25MB
      case 'pro':
        return { conversionsPerMonth: -1, maxFileSize: 100 * 1024 * 1024 }; // 100MB, unlimited conversions
      default: // free
        return { conversionsPerMonth: 3, maxFileSize: 10 * 1024 * 1024 }; // 10MB
    }
  }

  /**
   * Check if user can perform conversion
   */
  static canPerformConversion(user: User): boolean {
    if (user.plan === 'pro') return true; // Unlimited for pro users
    return user.conversions_used < user.conversions_limit;
  }

  /**
   * Get remaining conversions for user
   */
  static getRemainingConversions(user: User): number | 'unlimited' {
    if (user.plan === 'pro') return 'unlimited';
    return Math.max(0, user.conversions_limit - user.conversions_used);
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/verify-email/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await this.handleResponse(response);

      if (result.success && result.data?.user) {
        // Update stored user data with verified status
        const currentUser = this.getUser();
        if (currentUser) {
          this.setUser({ ...currentUser, email_verified: true });
        }
      }

      return result;
    } catch (error) {
      console.error('Email verification failed:', error);
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const result = await this.handleResponse(response);
      return result;
    } catch (error) {
      console.error('Resend verification failed:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  static async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const result = await this.handleResponse(response);
      return result;
    } catch (error) {
      console.error('Forgot password failed:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword })
      });

      const result = await this.handleResponse(response);
      return result;
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }

  /**
   * Update password (authenticated user)
   */
  static async updatePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/update-password`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const result = await this.handleResponse(response);
      return result;
    } catch (error) {
      console.error('Password update failed:', error);
      throw error;
    }
  }
}

export default AuthAPI;