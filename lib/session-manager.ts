/**
 * Enhanced Session Manager - PDFCraft.Pro
 * Comprehensive session management with security, persistence, and auto-refresh
 */

import { AuthAPI, User, AuthResult } from './auth-api';

export interface SessionData {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  lastActivity: number;
}

export interface SessionConfig {
  autoRefreshThreshold: number; // Minutes before expiry to auto-refresh
  maxInactivityTime: number; // Minutes of inactivity before logout
  enableCrossTabSync: boolean;
  enableActivityTracking: boolean;
}

export class SessionManager {
  private static instance: SessionManager;
  private static config: SessionConfig = {
    autoRefreshThreshold: 5, // Refresh 5 minutes before expiry
    maxInactivityTime: 60, // 1 hour of inactivity
    enableCrossTabSync: true,
    enableActivityTracking: true
  };

  private refreshTimer: NodeJS.Timeout | null = null;
  private activityTimer: NodeJS.Timeout | null = null;
  private storageListener: ((e: StorageEvent) => void) | null = null;

  private constructor() {
    this.initializeSessionManagement();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Configure session management settings
   */
  public static configure(config: Partial<SessionConfig>): void {
    SessionManager.config = { ...SessionManager.config, ...config };
  }

  /**
   * Initialize session management
   */
  private initializeSessionManagement(): void {
    if (typeof window === 'undefined') return;

    // Set up cross-tab session synchronization
    if (SessionManager.config.enableCrossTabSync) {
      this.setupCrossTabSync();
    }

    // Set up activity tracking
    if (SessionManager.config.enableActivityTracking) {
      this.setupActivityTracking();
    }

    // Check for existing session and set up auto-refresh
    const session = this.getSession();
    if (session) {
      this.scheduleTokenRefresh(session);
      this.updateLastActivity();
    }
  }

  /**
   * Store session data securely
   */
  public setSession(authResult: AuthResult): void {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    const sessionData: SessionData = {
      user: authResult.user,
      accessToken: authResult.token,
      refreshToken: authResult.refreshToken || '',
      expiresAt: now + (15 * 60 * 1000), // 15 minutes from now
      lastActivity: now
    };

    try {
      // Store in localStorage with encryption-like encoding
      const encoded = btoa(JSON.stringify(sessionData));
      localStorage.setItem('pdfcraft_session', encoded);

      // Store individual items for AuthAPI compatibility
      AuthAPI.setToken(authResult.token);
      AuthAPI.setUser(authResult.user);

      if (authResult.refreshToken) {
        localStorage.setItem('refreshToken', authResult.refreshToken);
      }

      // Schedule automatic token refresh
      this.scheduleTokenRefresh(sessionData);

      // Broadcast session update to other tabs
      this.broadcastSessionUpdate('session_created');

      console.log('✅ Session established successfully');
    } catch (error) {
      console.error('❌ Failed to store session:', error);
    }
  }

  /**
   * Get current session data
   */
  public getSession(): SessionData | null {
    if (typeof window === 'undefined') return null;

    try {
      const encoded = localStorage.getItem('pdfcraft_session');
      if (!encoded) return null;

      const sessionData: SessionData = JSON.parse(atob(encoded));

      // Check if session is expired
      if (Date.now() > sessionData.expiresAt) {
        console.log('⚠️ Session expired, attempting refresh...');
        this.handleExpiredSession();
        return null;
      }

      // Check for inactivity timeout
      if (SessionManager.config.enableActivityTracking) {
        const inactiveTime = Date.now() - sessionData.lastActivity;
        const maxInactiveMs = SessionManager.config.maxInactivityTime * 60 * 1000;

        if (inactiveTime > maxInactiveMs) {
          console.log('⚠️ Session expired due to inactivity');
          this.clearSession();
          return null;
        }
      }

      return sessionData;
    } catch (error) {
      console.error('❌ Failed to retrieve session:', error);
      return null;
    }
  }

  /**
   * Update session data
   */
  public updateSession(updates: Partial<SessionData>): void {
    const currentSession = this.getSession();
    if (!currentSession) return;

    const updatedSession = { ...currentSession, ...updates };

    try {
      const encoded = btoa(JSON.stringify(updatedSession));
      localStorage.setItem('pdfcraft_session', encoded);

      // Update AuthAPI storage as well
      if (updates.accessToken) {
        AuthAPI.setToken(updates.accessToken);
      }
      if (updates.user) {
        AuthAPI.setUser(updates.user);
      }
    } catch (error) {
      console.error('❌ Failed to update session:', error);
    }
  }

  /**
   * Clear session data
   */
  public clearSession(): void {
    if (typeof window === 'undefined') return;

    try {
      // Clear all session-related storage
      localStorage.removeItem('pdfcraft_session');
      AuthAPI.removeToken();

      // Clear timers
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }

      if (this.activityTimer) {
        clearTimeout(this.activityTimer);
        this.activityTimer = null;
      }

      // Broadcast logout to other tabs
      this.broadcastSessionUpdate('session_cleared');

      console.log('✅ Session cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear session:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    const session = this.getSession();
    return session !== null;
  }

  /**
   * Get current user from session
   */
  public getCurrentUser(): User | null {
    const session = this.getSession();
    return session?.user || null;
  }

  /**
   * Update last activity timestamp
   */
  public updateLastActivity(): void {
    const session = this.getSession();
    if (session) {
      this.updateSession({ lastActivity: Date.now() });
    }
  }

  /**
   * Refresh access token automatically
   */
  public async refreshToken(): Promise<boolean> {
    try {
      const session = this.getSession();
      if (!session?.refreshToken) {
        throw new Error('No refresh token available');
      }

      console.log('🔄 Refreshing access token...');
      const newToken = await AuthAPI.refreshToken();

      // Update session with new token and extended expiry
      this.updateSession({
        accessToken: newToken,
        expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutes from now
        lastActivity: Date.now()
      });

      // Schedule next refresh
      const updatedSession = this.getSession();
      if (updatedSession) {
        this.scheduleTokenRefresh(updatedSession);
      }

      console.log('✅ Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      this.clearSession();
      return false;
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(session: SessionData): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const now = Date.now();
    const timeUntilExpiry = session.expiresAt - now;
    const refreshThreshold = SessionManager.config.autoRefreshThreshold * 60 * 1000;

    // Schedule refresh if token expires in more than threshold time
    if (timeUntilExpiry > refreshThreshold) {
      const refreshTime = timeUntilExpiry - refreshThreshold;

      this.refreshTimer = setTimeout(async () => {
        await this.refreshToken();
      }, refreshTime);

      console.log(`🕐 Token refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes`);
    } else {
      // Token expires soon, refresh immediately
      setTimeout(() => this.refreshToken(), 1000);
    }
  }

  /**
   * Handle expired session
   */
  private async handleExpiredSession(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (refreshToken) {
      try {
        await this.refreshToken();
      } catch (error) {
        console.log('❌ Failed to refresh expired session, clearing...');
        this.clearSession();
      }
    } else {
      this.clearSession();
    }
  }

  /**
   * Setup cross-tab session synchronization
   */
  private setupCrossTabSync(): void {
    if (typeof window === 'undefined') return;

    this.storageListener = (e: StorageEvent) => {
      if (e.key === 'pdfcraft_session_event') {
        const eventData = e.newValue ? JSON.parse(e.newValue) : null;

        if (eventData) {
          switch (eventData.type) {
            case 'session_cleared':
              // Another tab logged out, clear this tab's session too
              localStorage.removeItem('pdfcraft_session');
              AuthAPI.removeToken();
              window.location.reload();
              break;

            case 'session_created':
              // Another tab logged in, refresh this tab
              window.location.reload();
              break;
          }
        }
      }
    };

    window.addEventListener('storage', this.storageListener);
  }

  /**
   * Broadcast session updates to other tabs
   */
  private broadcastSessionUpdate(type: string): void {
    if (typeof window === 'undefined') return;

    const eventData = {
      type,
      timestamp: Date.now()
    };

    localStorage.setItem('pdfcraft_session_event', JSON.stringify(eventData));

    // Remove the event after a short delay to prevent interference
    setTimeout(() => {
      localStorage.removeItem('pdfcraft_session_event');
    }, 100);
  }

  /**
   * Setup activity tracking
   */
  private setupActivityTracking(): void {
    if (typeof window === 'undefined') return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const updateActivity = () => {
      this.updateLastActivity();
    };

    // Throttle activity updates to once per minute
    let lastUpdate = 0;
    const throttledUpdate = () => {
      const now = Date.now();
      if (now - lastUpdate > 60000) { // 1 minute
        lastUpdate = now;
        updateActivity();
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, throttledUpdate, true);
    });
  }

  /**
   * Logout with cleanup
   */
  public async logout(): Promise<void> {
    try {
      // Call backend logout
      await AuthAPI.logout();
    } catch (error) {
      console.error('❌ Backend logout failed:', error);
    } finally {
      // Always clear local session
      this.clearSession();
    }
  }

  /**
   * Cleanup when component unmounts
   */
  public destroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }

    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
  }

  /**
   * Get session statistics
   */
  public getSessionStats(): {
    timeUntilExpiry: number;
    timeSinceLastActivity: number;
    isActive: boolean;
  } {
    const session = this.getSession();

    if (!session) {
      return {
        timeUntilExpiry: 0,
        timeSinceLastActivity: 0,
        isActive: false
      };
    }

    const now = Date.now();
    return {
      timeUntilExpiry: Math.max(0, session.expiresAt - now),
      timeSinceLastActivity: now - session.lastActivity,
      isActive: true
    };
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();
export default sessionManager;