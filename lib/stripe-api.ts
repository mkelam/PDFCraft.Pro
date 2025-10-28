/**
 * Stripe API Client - pdflab.pro
 * Frontend integration for OCR Overlay subscription management
 * Handles checkout sessions, billing portal, and subscription details
 */

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: {
    conversionsPerMonth: number;
    maxFileSize: number;
    ocrOverlayAccess: boolean;
    advancedFeatures: boolean;
    priorityProcessing: boolean;
    apiAccess: boolean;
  };
  formattedPrice: string;
}

export interface SubscriptionDetails {
  currentPlan: SubscriptionPlan | null;
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  } | null;
  hasOCROverlayAccess: boolean;
  limits: SubscriptionPlan['features'] | null;
}

export interface UserFeatures {
  planId: string;
  hasOCROverlayAccess: boolean;
  features: SubscriptionPlan['features'] | null;
  usage: {
    conversionsUsed: number;
    conversionsLimit: number;
    isUnlimited: boolean;
  };
}

export interface CheckoutResult {
  success: boolean;
  sessionId?: string;
  customerId?: string;
  plan?: SubscriptionPlan;
  error?: string;
}

export interface BillingPortalResult {
  success: boolean;
  portalUrl?: string;
  error?: string;
}

export class StripeAPI {
  private static baseUrl = '/api/stripe';

  /**
   * Get authentication headers for API requests
   */
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  /**
   * Handle API responses with error checking
   */
  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'API request failed');
    }

    return data.data;
  }

  /**
   * Get all available subscription plans
   */
  static async getPlans(): Promise<SubscriptionPlan[]> {
    try {
      const response = await fetch(`${this.baseUrl}/plans`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await this.handleResponse<{ plans: SubscriptionPlan[] }>(response);
      return data.plans;
    } catch (error) {
      console.error('Failed to fetch subscription plans:', error);
      throw error;
    }
  }

  /**
   * Create Stripe checkout session for subscription
   */
  static async createCheckoutSession(
    planId: string,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<CheckoutResult> {
    try {
      const response = await fetch(`${this.baseUrl}/create-checkout`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          planId,
          successUrl,
          cancelUrl
        })
      });

      const data = await this.handleResponse<CheckoutResult>(response);
      return { success: true, ...data };
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Checkout creation failed'
      };
    }
  }

  /**
   * Handle successful checkout completion
   */
  static async handleCheckoutSuccess(sessionId: string): Promise<CheckoutResult> {
    try {
      const response = await fetch(`${this.baseUrl}/checkout-success`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ sessionId })
      });

      const data = await this.handleResponse<CheckoutResult>(response);
      return { success: true, ...data };
    } catch (error) {
      console.error('Failed to handle checkout success:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Checkout processing failed'
      };
    }
  }

  /**
   * Create billing portal session
   */
  static async createBillingPortalSession(returnUrl?: string): Promise<BillingPortalResult> {
    try {
      const response = await fetch(`${this.baseUrl}/billing-portal`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ returnUrl })
      });

      const data = await this.handleResponse<{ portalUrl: string }>(response);
      return { success: true, portalUrl: data.portalUrl };
    } catch (error) {
      console.error('Failed to create billing portal session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Billing portal creation failed'
      };
    }
  }

  /**
   * Cancel user subscription
   */
  static async cancelSubscription(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/cancel-subscription`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      await this.handleResponse(response);
      return { success: true };
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Subscription cancellation failed'
      };
    }
  }

  /**
   * Get user's subscription details
   */
  static async getSubscriptionDetails(): Promise<SubscriptionDetails> {
    try {
      const response = await fetch(`${this.baseUrl}/subscription`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      return await this.handleResponse<SubscriptionDetails>(response);
    } catch (error) {
      console.error('Failed to get subscription details:', error);
      throw error;
    }
  }

  /**
   * Get user's feature access and limits
   */
  static async getUserFeatures(): Promise<UserFeatures> {
    try {
      const response = await fetch(`${this.baseUrl}/features`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      return await this.handleResponse<UserFeatures>(response);
    } catch (error) {
      console.error('Failed to get user features:', error);
      throw error;
    }
  }

  /**
   * Redirect to Stripe checkout
   */
  static async redirectToCheckout(
    planId: string,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<void> {
    try {
      const result = await this.createCheckoutSession(planId, successUrl, cancelUrl);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create checkout session');
      }

      // For demo mode, show a message instead of redirecting
      if (result.sessionId?.startsWith('cs_test_')) {
        alert(`Demo Mode: Would redirect to Stripe checkout for ${planId} plan.\n\nIn production, this would open the Stripe payment form.`);
        return;
      }

      // Load Stripe.js dynamically for real sessions
      const stripe = await this.loadStripe();
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      // Redirect to checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId: result.sessionId
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Checkout redirect failed:', error);
      throw error;
    }
  }

  /**
   * Open billing portal in same window
   */
  static async openBillingPortal(returnUrl?: string): Promise<void> {
    try {
      const result = await this.createBillingPortalSession(returnUrl);

      if (!result.success || !result.portalUrl) {
        throw new Error(result.error || 'Failed to create billing portal session');
      }

      // Navigate to billing portal
      window.location.href = result.portalUrl;
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      throw error;
    }
  }

  /**
   * Load Stripe.js dynamically
   */
  private static async loadStripe(): Promise<any> {
    // Check if Stripe is already loaded
    if ((window as any).Stripe) {
      return (window as any).Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    }

    // Dynamically load Stripe.js
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => {
        if ((window as any).Stripe) {
          resolve((window as any).Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY));
        } else {
          reject(new Error('Stripe failed to load'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Stripe script'));
      document.head.appendChild(script);
    });
  }

  /**
   * Format price for display
   */
  static formatPrice(price: number, currency: string = 'usd'): string {
    if (price === 0) return 'Free';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0
    }).format(price);
  }

  /**
   * Format date for subscription display
   */
  static formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);
  }

  /**
   * Get days until subscription renewal/expiry
   */
  static getDaysUntilRenewal(endDate: Date | string): number {
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if user has specific feature access
   */
  static hasFeatureAccess(features: UserFeatures, feature: keyof SubscriptionPlan['features']): boolean {
    return features.features?.[feature] || false;
  }

  /**
   * Get conversion usage percentage
   */
  static getUsagePercentage(features: UserFeatures): number {
    if (features.usage.isUnlimited) return 0;

    const used = features.usage.conversionsUsed;
    const limit = features.usage.conversionsLimit;

    return Math.min((used / limit) * 100, 100);
  }

  /**
   * Get remaining conversions
   */
  static getRemainingConversions(features: UserFeatures): number | 'unlimited' {
    if (features.usage.isUnlimited) return 'unlimited';

    return Math.max(0, features.usage.conversionsLimit - features.usage.conversionsUsed);
  }
}

export default StripeAPI;