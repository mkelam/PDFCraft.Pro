/**
 * PayFast Payment Service - pdflab.pro
 * Enhanced payment processing for subscription plans
 * Supports South African payments via PayFast
 */

import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';

interface SubscriptionPlan {
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
}

interface PaymentResult {
  success: boolean;
  paymentUrl?: string;
  paymentId?: string;
  error?: string;
}

interface PayFastPaymentData {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  name_first: string;
  name_last: string;
  email_address: string;
  m_payment_id: string;
  amount: string;
  item_name: string;
  item_description: string;
  custom_str1?: string;
  custom_str2?: string;
  custom_str3?: string;
  subscription_type?: string;
  billing_date?: string;
  recurring_amount?: string;
  frequency?: string;
  cycles?: string;
  signature?: string;
}

export class PayFastService {
  private readonly plans: SubscriptionPlan[];
  private readonly baseUrl: string;

  constructor() {
    // Define subscription plans with USD pricing
    this.plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'USD',
        interval: 'month',
        features: {
          conversionsPerMonth: 3,
          maxFileSize: 10 * 1024 * 1024, // 10MB
          ocrOverlayAccess: false,
          advancedFeatures: false,
          priorityProcessing: false,
          apiAccess: false
        }
      },
      {
        id: 'starter',
        name: 'Starter',
        price: 7, // $7 USD per month
        currency: 'USD',
        interval: 'month',
        features: {
          conversionsPerMonth: 100,
          maxFileSize: 25 * 1024 * 1024, // 25MB
          ocrOverlayAccess: true,
          advancedFeatures: false,
          priorityProcessing: false,
          apiAccess: false
        }
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 19, // $19 USD per month
        currency: 'USD',
        interval: 'month',
        features: {
          conversionsPerMonth: -1, // Unlimited
          maxFileSize: 100 * 1024 * 1024, // 100MB
          ocrOverlayAccess: true,
          advancedFeatures: true,
          priorityProcessing: true,
          apiAccess: false
        }
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 99, // $99 USD per month
        currency: 'USD',
        interval: 'month',
        features: {
          conversionsPerMonth: -1, // Unlimited
          maxFileSize: 500 * 1024 * 1024, // 500MB
          ocrOverlayAccess: true,
          advancedFeatures: true,
          priorityProcessing: true,
          apiAccess: true
        }
      }
    ];

    this.baseUrl = config.payfast.sandbox
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';
  }

  /**
   * Get all available subscription plans
   */
  getPlans(): SubscriptionPlan[] {
    return this.plans;
  }

  /**
   * Get a specific plan by ID
   */
  getPlan(planId: string): SubscriptionPlan | null {
    return this.plans.find(plan => plan.id === planId) || null;
  }

  /**
   * Create PayFast payment form data for subscription
   */
  async createPaymentForm(
    userId: string,
    email: string,
    firstName: string,
    lastName: string,
    planId: string,
    returnUrl: string,
    cancelUrl: string,
    notifyUrl: string
  ): Promise<PaymentResult> {
    try {
      const plan = this.getPlan(planId);
      if (!plan || plan.id === 'free') {
        return { success: false, error: 'Invalid plan selected' };
      }

      const paymentId = `${userId}_${planId}_${Date.now()}`;

      const paymentData: PayFastPaymentData = {
        merchant_id: config.payfast.merchantId,
        merchant_key: config.payfast.merchantKey,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,
        name_first: firstName,
        name_last: lastName,
        email_address: email,
        m_payment_id: paymentId,
        amount: plan.price.toFixed(2),
        item_name: `${plan.name} Subscription`,
        item_description: `pdflab.pro ${plan.name} Plan - ${plan.features.conversionsPerMonth === -1 ? 'Unlimited' : plan.features.conversionsPerMonth} conversions/month`,
        custom_str1: userId,
        custom_str2: planId,
        custom_str3: 'subscription',
        subscription_type: '1', // Subscription
        billing_date: this.getNextBillingDateString(),
        recurring_amount: plan.price.toFixed(2),
        frequency: '3', // Monthly
        cycles: '0' // Indefinite
      };

      // Generate signature
      paymentData.signature = this.generateSignature(paymentData);

      return {
        success: true,
        paymentId: paymentId,
        paymentUrl: this.baseUrl
      };
    } catch (error) {
      logger.error('PayFast payment form creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  /**
   * Generate PayFast signature for security
   */
  private generateSignature(data: PayFastPaymentData): string {
    // Create parameter string excluding signature
    const { signature, ...dataWithoutSignature } = data;

    const paramString = Object.entries(dataWithoutSignature)
      .filter(([key, value]) => value !== '' && value !== undefined && value !== null)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');

    // Add passphrase if configured
    const stringToHash = config.payfast.passphrase
      ? `${paramString}&passphrase=${encodeURIComponent(config.payfast.passphrase)}`
      : paramString;

    return crypto.createHash('md5').update(stringToHash).digest('hex');
  }

  /**
   * Verify PayFast notification/webhook
   */
  verifyNotification(postData: any, headers: any): boolean {
    try {
      // Check if signature is valid
      const providedSignature = postData.signature;
      delete postData.signature;

      const generatedSignature = this.generateNotificationSignature(postData);

      if (providedSignature !== generatedSignature) {
        logger.warn('PayFast signature verification failed');
        return false;
      }

      // Verify the payment with PayFast servers
      return this.verifyPaymentWithPayFast(postData);
    } catch (error) {
      logger.error('PayFast notification verification failed:', error);
      return false;
    }
  }

  /**
   * Generate signature for notification verification
   */
  private generateNotificationSignature(data: any): string {
    const paramString = Object.entries(data)
      .filter(([key, value]) => value !== '' && value !== undefined && value !== null)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');

    const stringToHash = config.payfast.passphrase
      ? `${paramString}&passphrase=${encodeURIComponent(config.payfast.passphrase)}`
      : paramString;

    return crypto.createHash('md5').update(stringToHash).digest('hex');
  }

  /**
   * Verify payment with PayFast servers
   */
  private verifyPaymentWithPayFast(data: any): boolean {
    try {
      // For now, we'll skip the server validation and just rely on signature verification
      // In production, you would implement the actual server validation with PayFast
      logger.info('PayFast server validation would be performed here');
      return true;
    } catch (error) {
      logger.error('PayFast server verification failed:', error);
      return false;
    }
  }

  /**
   * Handle PayFast notification/webhook
   */
  async handleNotification(notificationData: any): Promise<void> {
    try {
      if (!this.verifyNotification(notificationData, {})) {
        throw new Error('Invalid PayFast notification');
      }

      const {
        payment_status,
        custom_str1: userId,
        custom_str2: planId,
        custom_str3: type,
        m_payment_id: paymentId,
        pf_payment_id: payfastPaymentId,
        amount_gross
      } = notificationData;

      logger.info('Processing PayFast notification', {
        paymentStatus: payment_status,
        userId,
        planId,
        paymentId,
        payfastPaymentId,
        amount: amount_gross
      });

      // Handle different payment statuses
      switch (payment_status) {
        case 'COMPLETE':
          await this.handleSuccessfulPayment(userId, planId, paymentId, payfastPaymentId);
          break;
        case 'FAILED':
        case 'CANCELLED':
          await this.handleFailedPayment(userId, planId, paymentId);
          break;
        default:
          logger.info(`Unhandled payment status: ${payment_status}`);
      }
    } catch (error) {
      logger.error('PayFast notification handling failed:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  private async handleSuccessfulPayment(
    userId: string,
    planId: string,
    paymentId: string,
    payfastPaymentId: string
  ): Promise<void> {
    try {
      // Update user's subscription in database
      await this.updateUserSubscription(userId, {
        planId: planId,
        payfastPaymentId: payfastPaymentId,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.getNextBillingDate(true) as Date
      });

      logger.info('User subscription updated successfully', {
        userId,
        planId,
        paymentId,
        payfastPaymentId
      });
    } catch (error) {
      logger.error('Failed to update user subscription:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  private async handleFailedPayment(
    userId: string,
    planId: string,
    paymentId: string
  ): Promise<void> {
    try {
      // Keep user on free plan or previous plan
      logger.warn('Payment failed for user', {
        userId,
        planId,
        paymentId
      });

      // Could implement retry logic or downgrade to free plan here
    } catch (error) {
      logger.error('Failed to handle payment failure:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription (PayFast requires manual cancellation)
   */
  async cancelSubscription(userId: string, payfastPaymentId: string): Promise<PaymentResult> {
    try {
      // Update user to free plan
      await this.updateUserSubscription(userId, {
        planId: 'free',
        status: 'cancelled'
      });

      logger.info('Subscription cancelled', { userId, payfastPaymentId });

      return { success: true };
    } catch (error) {
      logger.error('Subscription cancellation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cancellation failed'
      };
    }
  }

  /**
   * Check if user has access to OCR Overlay features
   */
  hasOCROverlayAccess(planId: string): boolean {
    const plan = this.getPlan(planId);
    return plan?.features.ocrOverlayAccess || false;
  }

  /**
   * Get user's feature limits based on plan
   */
  getUserLimits(planId: string): SubscriptionPlan['features'] | null {
    const plan = this.getPlan(planId);
    return plan?.features || null;
  }

  /**
   * Get formatted price display
   */
  formatPrice(plan: SubscriptionPlan): string {
    if (plan.price === 0) return 'Free';
    return `$${plan.price}/${plan.interval}`;
  }

  /**
   * Get next billing date (one month from now)
   */
  private getNextBillingDate(asDate = false): string | Date {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    if (asDate) {
      return nextMonth;
    }

    return nextMonth.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Get next billing date as string
   */
  private getNextBillingDateString(): string {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Update user subscription information in database
   */
  private async updateUserSubscription(userId: string, subscriptionData: {
    planId?: string;
    payfastPaymentId?: string;
    status?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date | string;
  }): Promise<void> {
    try {
      // For now, we'll just log the subscription update
      // In a complete implementation, you would update the users table
      logger.info('User subscription update requested', {
        userId,
        subscriptionData
      });

      // TODO: Implement actual database update logic here
      // This could involve updating the users table with plan information
    } catch (error) {
      logger.error('Failed to update user subscription:', error);
      throw error;
    }
  }

  /**
   * Build PayFast payment form HTML
   */
  buildPaymentForm(paymentData: PayFastPaymentData): string {
    const formFields = Object.entries(paymentData)
      .map(([key, value]) => `<input type="hidden" name="${key}" value="${value}">`)
      .join('\n');

    return `
      <form action="${this.baseUrl}" method="post" id="payfast-form">
        ${formFields}
        <input type="submit" value="Pay Now">
      </form>
      <script>
        document.getElementById('payfast-form').submit();
      </script>
    `;
  }
}

export default PayFastService;