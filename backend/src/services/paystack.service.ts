import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';

// Paystack API Types
export interface PaystackInitializeRequest {
  email: string;
  amount: number; // Amount in kobo (NGN) or cents (USD)
  currency?: 'NGN' | 'USD' | 'GHS' | 'ZAR' | 'KES';
  reference?: string;
  callback_url?: string;
  metadata?: {
    userId?: number;
    plan?: string;
    custom_fields?: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
  };
  channels?: string[];
  split_code?: string;
  subaccount?: string;
  transaction_charge?: number;
  bearer?: 'account' | 'subaccount';
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string | null;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: any;
    log: any;
    fees: number;
    fees_split: any;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: any;
      risk_action: string;
      international_format_phone: string | null;
    };
    plan: any;
    order_id: string | null;
    paidAt: string | null;
    createdAt: string;
    requested_amount: number;
    pos_transaction_data: any;
    source: any;
    fees_breakdown: any;
  };
}

export interface PaystackWebhookEvent {
  event: string;
  data: PaystackVerifyResponse['data'];
}

/**
 * Paystack Payment Service
 * Handles payment initialization, verification, and webhook processing
 */
export class PaystackService {
  private static readonly BASE_URL = 'https://api.paystack.co';
  private static readonly SECRET_KEY = config.paystack.secretKey;

  /**
   * Initialize a payment transaction
   */
  static async initializeTransaction(
    request: PaystackInitializeRequest
  ): Promise<PaystackInitializeResponse> {
    try {
      logger.info('Initializing Paystack transaction', {
        email: request.email,
        amount: request.amount,
        currency: request.currency || 'NGN'
      });

      // Generate unique reference if not provided
      if (!request.reference) {
        request.reference = `pdfcraft_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      }

      // Convert amount to kobo/cents if needed
      const amountInSubunits = Math.round(request.amount * 100);

      const payload = {
        ...request,
        amount: amountInSubunits,
        currency: request.currency || 'NGN',
        callback_url: request.callback_url || `${config.app.frontendUrl}/payment/callback`,
        metadata: {
          ...request.metadata,
          cancel_action: `${config.app.frontendUrl}/pricing`
        }
      };

      const response = await fetch(`${this.BASE_URL}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as PaystackInitializeResponse;

      if (!data.status) {
        throw new Error(`Paystack initialization failed: ${data.message}`);
      }

      logger.info('Paystack transaction initialized successfully', {
        reference: data.data.reference,
        authorization_url: data.data.authorization_url
      });

      return data;

    } catch (error) {
      logger.error('Failed to initialize Paystack transaction', error);
      throw new Error(`Payment initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify a payment transaction
   */
  static async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    try {
      logger.info('Verifying Paystack transaction', { reference });

      const response = await fetch(`${this.BASE_URL}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json() as PaystackVerifyResponse;

      if (!data.status) {
        throw new Error(`Paystack verification failed: ${data.message}`);
      }

      logger.info('Paystack transaction verified successfully', {
        reference,
        status: data.data.status,
        amount: data.data.amount / 100, // Convert back from kobo/cents
        currency: data.data.currency
      });

      return data;

    } catch (error) {
      logger.error('Failed to verify Paystack transaction', error);
      throw new Error(`Payment verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify webhook signature for security
   */
  static verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const hash = crypto
        .createHmac('sha512', this.SECRET_KEY)
        .update(payload, 'utf8')
        .digest('hex');

      return hash === signature;
    } catch (error) {
      logger.error('Failed to verify webhook signature', error);
      return false;
    }
  }

  /**
   * Process webhook event
   */
  static async processWebhookEvent(event: PaystackWebhookEvent): Promise<void> {
    try {
      logger.info('Processing Paystack webhook event', {
        event: event.event,
        reference: event.data.reference
      });

      switch (event.event) {
        case 'charge.success':
          await this.handleSuccessfulPayment(event.data);
          break;

        case 'charge.dispute.create':
          await this.handleDispute(event.data);
          break;

        case 'charge.dispute.remind':
          await this.handleDisputeReminder(event.data);
          break;

        case 'charge.dispute.resolve':
          await this.handleDisputeResolution(event.data);
          break;

        case 'invoice.create':
        case 'invoice.update':
          await this.handleInvoiceEvent(event.data);
          break;

        case 'subscription.create':
        case 'subscription.disable':
        case 'subscription.enable':
          await this.handleSubscriptionEvent(event.data);
          break;

        default:
          logger.warn('Unhandled webhook event type', { event: event.event });
      }

    } catch (error) {
      logger.error('Failed to process webhook event', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  private static async handleSuccessfulPayment(data: PaystackVerifyResponse['data']): Promise<void> {
    try {
      // Update user's plan and limits based on payment
      const metadata = data.metadata;
      const userId = metadata?.userId;
      const plan = metadata?.plan;

      if (userId && plan) {
        // Import database service
        const { getConnection, getSQLite } = await import('../config/database');
        const isProduction = process.env.NODE_ENV === 'production';

        // Update user's subscription plan
        const planLimits = {
          starter: { limit: 100, max_file_size: 25 * 1024 * 1024 }, // 25MB
          pro: { limit: -1, max_file_size: 100 * 1024 * 1024 }, // 100MB, unlimited conversions
        };

        const limits = planLimits[plan as keyof typeof planLimits];

        if (limits) {
          if (isProduction) {
            const connection = getConnection();
            await connection.execute(
              'UPDATE users SET plan = ?, conversions_limit = ?, updated_at = NOW() WHERE id = ?',
              [plan, limits.limit, userId]
            );
          } else {
            const db = getSQLite();
            const stmt = db.prepare('UPDATE users SET plan = ?, conversions_limit = ? WHERE id = ?');
            stmt.run(plan, limits.limit, userId);
          }

          logger.info('User plan updated successfully', { userId, plan, limits });

          // Send success email (implement later)
          // await EmailService.sendPlanUpgradeConfirmation(data.customer.email, plan);
        }
      }

    } catch (error) {
      logger.error('Failed to handle successful payment', error);
      throw error;
    }
  }

  /**
   * Handle payment disputes
   */
  private static async handleDispute(data: PaystackVerifyResponse['data']): Promise<void> {
    logger.warn('Payment dispute created', { reference: data.reference });
    // Implement dispute handling logic
    // Send notification to admin, log for review, etc.
  }

  /**
   * Handle dispute reminders
   */
  private static async handleDisputeReminder(data: PaystackVerifyResponse['data']): Promise<void> {
    logger.warn('Payment dispute reminder', { reference: data.reference });
    // Send reminder to handle dispute
  }

  /**
   * Handle dispute resolution
   */
  private static async handleDisputeResolution(data: PaystackVerifyResponse['data']): Promise<void> {
    logger.info('Payment dispute resolved', { reference: data.reference });
    // Update records, notify relevant parties
  }

  /**
   * Handle invoice events
   */
  private static async handleInvoiceEvent(data: PaystackVerifyResponse['data']): Promise<void> {
    logger.info('Invoice event received', { reference: data.reference });
    // Handle invoice creation/updates
  }

  /**
   * Handle subscription events
   */
  private static async handleSubscriptionEvent(data: PaystackVerifyResponse['data']): Promise<void> {
    logger.info('Subscription event received', { reference: data.reference });
    // Handle subscription changes
  }

  /**
   * Get supported currencies
   */
  static getSupportedCurrencies(): string[] {
    return ['NGN', 'USD', 'GHS', 'ZAR', 'KES'];
  }

  /**
   * Convert amount to subunits (kobo/cents)
   */
  static convertToSubunits(amount: number, currency: string = 'NGN'): number {
    // Most currencies use 100 subunits per main unit
    return Math.round(amount * 100);
  }

  /**
   * Convert amount from subunits to main units
   */
  static convertFromSubunits(amount: number, currency: string = 'NGN'): number {
    return amount / 100;
  }

  /**
   * Generate transaction reference
   */
  static generateReference(prefix: string = 'pdfcraft'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get plan details
   */
  static getPlanDetails() {
    return {
      free: {
        name: 'Free',
        price: 0,
        currency: 'NGN',
        conversions_limit: 3,
        max_file_size: 10 * 1024 * 1024, // 10MB
        features: ['3 conversions per day', '10MB file size limit', 'PDF to PowerPoint', 'PDF merge']
      },
      starter: {
        name: 'Starter',
        price: 2500, // NGN 25.00
        currency: 'NGN',
        conversions_limit: 100,
        max_file_size: 25 * 1024 * 1024, // 25MB
        features: ['100 conversions per month', '25MB file size limit', 'PDF to PowerPoint', 'PDF merge', 'Priority processing']
      },
      pro: {
        name: 'Pro',
        price: 7500, // NGN 75.00
        currency: 'NGN',
        conversions_limit: -1, // Unlimited
        max_file_size: 100 * 1024 * 1024, // 100MB
        features: ['Unlimited conversions', '100MB file size limit', 'PDF to PowerPoint', 'PDF merge', 'Priority processing', 'API access', 'Advanced features']
      }
    };
  }
}