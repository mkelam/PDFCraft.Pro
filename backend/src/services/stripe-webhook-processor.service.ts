/**
 * Stripe Webhook Processor Service - PDFCraft.Pro
 * CRITICAL FIX: Eliminates race conditions in subscription webhook processing
 * Implements atomic processing with distributed locking and idempotency
 */

import Redis from 'ioredis';
import Stripe from 'stripe';
import { getOptimizedConnection } from '../config/database';
import { logger } from '../utils/logger';

interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

interface ProcessingResult {
  success: boolean;
  processed: boolean;
  error?: string;
  retryable?: boolean;
}

interface SubscriptionUpdateData {
  planId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  status?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}

export class StripeWebhookProcessor {
  private redis: Redis;
  private database: any;
  private lockTimeout = 30000; // 30 seconds
  private lockRetryDelay = 500; // 500ms
  private maxRetryAttempts = 5;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
    });

    this.database = getOptimizedConnection();
  }

  /**
   * CRITICAL FIX: Process webhook with distributed locking and idempotency
   */
  async processWebhookEvent(event: WebhookEvent): Promise<ProcessingResult> {
    const lockKey = `webhook_lock:${event.id}`;
    const processingKey = `webhook_processed:${event.id}`;
    const lockValue = `${Date.now()}_${Math.random()}`;

    // Check if already processed (idempotency)
    const alreadyProcessed = await this.redis.get(processingKey);
    if (alreadyProcessed) {
      logger.info('Webhook already processed', {
        eventId: event.id,
        eventType: event.type,
        processedAt: alreadyProcessed
      });
      return { success: true, processed: false };
    }

    let attempt = 0;
    while (attempt < this.maxRetryAttempts) {
      try {
        // Acquire distributed lock
        const lockAcquired = await this.redis.set(
          lockKey,
          lockValue,
          'PX',
          this.lockTimeout,
          'NX'
        );

        if (!lockAcquired) {
          // Lock not acquired, wait and retry
          await this.sleep(this.lockRetryDelay * (attempt + 1));
          attempt++;
          continue;
        }

        try {
          // Double-check if processed (race condition protection)
          const stillNotProcessed = await this.redis.get(processingKey);
          if (stillNotProcessed) {
            logger.debug('Event processed by another instance during lock wait', {
              eventId: event.id
            });
            return { success: true, processed: false };
          }

          // Process the webhook event atomically
          const result = await this.processEventAtomically(event);

          if (result.success) {
            // Mark as processed with 7-day expiration
            await this.redis.setex(processingKey, 7 * 24 * 60 * 60, new Date().toISOString());

            logger.info('Webhook processed successfully', {
              eventId: event.id,
              eventType: event.type,
              attempt: attempt + 1
            });
          }

          return result;

        } finally {
          // Always release the lock
          await this.releaseLock(lockKey, lockValue);
        }

      } catch (error) {
        logger.error('Error processing webhook event', {
          eventId: event.id,
          eventType: event.type,
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Release lock on error
        await this.releaseLock(lockKey, lockValue);

        if (attempt === this.maxRetryAttempts - 1) {
          return {
            success: false,
            processed: false,
            error: 'Failed to process webhook after maximum attempts',
            retryable: true
          };
        }

        attempt++;
        await this.sleep(this.lockRetryDelay * (attempt + 1));
      }
    }

    return {
      success: false,
      processed: false,
      error: 'Failed to acquire lock after maximum attempts',
      retryable: true
    };
  }

  /**
   * Process webhook event with atomic database operations
   */
  private async processEventAtomically(event: WebhookEvent): Promise<ProcessingResult> {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
          return await this.handleSubscriptionCreatedAtomic(event.data.object as Stripe.Subscription);

        case 'customer.subscription.updated':
          return await this.handleSubscriptionUpdatedAtomic(event.data.object as Stripe.Subscription);

        case 'customer.subscription.deleted':
          return await this.handleSubscriptionCanceledAtomic(event.data.object as Stripe.Subscription);

        case 'invoice.payment_succeeded':
          return await this.handlePaymentSucceededAtomic(event.data.object as Stripe.Invoice);

        case 'invoice.payment_failed':
          return await this.handlePaymentFailedAtomic(event.data.object as Stripe.Invoice);

        case 'checkout.session.completed':
          return await this.handleCheckoutCompletedAtomic(event.data.object as Stripe.Checkout.Session);

        default:
          logger.debug('Unhandled webhook event type', {
            eventId: event.id,
            eventType: event.type
          });
          return { success: true, processed: false };
      }
    } catch (error) {
      logger.error('Atomic webhook processing failed', {
        eventId: event.id,
        eventType: event.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown processing error',
        retryable: true
      };
    }
  }

  /**
   * Handle subscription created with atomic transaction
   */
  private async handleSubscriptionCreatedAtomic(subscription: Stripe.Subscription): Promise<ProcessingResult> {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      logger.warn('Subscription created without userId metadata', {
        subscriptionId: subscription.id
      });
      return { success: true, processed: false };
    }

    const planId = subscription.metadata?.planId || 'starter';

    const updateData: SubscriptionUpdateData = {
      planId: planId,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000)
    };

    await this.updateUserSubscriptionAtomic(userId, updateData);

    logger.info('Subscription created and user updated', {
      userId,
      subscriptionId: subscription.id,
      planId,
      status: subscription.status
    });

    return { success: true, processed: true };
  }

  /**
   * Handle subscription updated with atomic transaction
   */
  private async handleSubscriptionUpdatedAtomic(subscription: Stripe.Subscription): Promise<ProcessingResult> {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      logger.warn('Subscription updated without userId metadata', {
        subscriptionId: subscription.id
      });
      return { success: true, processed: false };
    }

    const updateData: SubscriptionUpdateData = {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000)
    };

    // If subscription is being canceled, downgrade plan
    if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      updateData.planId = 'free';
    }

    await this.updateUserSubscriptionAtomic(userId, updateData);

    logger.info('Subscription updated', {
      userId,
      subscriptionId: subscription.id,
      status: subscription.status
    });

    return { success: true, processed: true };
  }

  /**
   * Handle subscription canceled with atomic transaction
   */
  private async handleSubscriptionCanceledAtomic(subscription: Stripe.Subscription): Promise<ProcessingResult> {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      logger.warn('Subscription canceled without userId metadata', {
        subscriptionId: subscription.id
      });
      return { success: true, processed: false };
    }

    const updateData: SubscriptionUpdateData = {
      planId: 'free',
      status: 'canceled'
    };

    await this.updateUserSubscriptionAtomic(userId, updateData);

    logger.info('Subscription canceled and user downgraded', {
      userId,
      subscriptionId: subscription.id
    });

    return { success: true, processed: true };
  }

  /**
   * Handle payment succeeded with atomic transaction
   */
  private async handlePaymentSucceededAtomic(invoice: Stripe.Invoice): Promise<ProcessingResult> {
    if (!invoice.subscription) {
      return { success: true, processed: false };
    }

    // Get subscription details to find userId
    const subscriptionId = invoice.subscription as string;
    const userQuery = `
      SELECT id FROM users
      WHERE stripe_subscription_id = ?
      LIMIT 1
    `;

    const result = await this.database.executeQuery(userQuery, [subscriptionId]);
    if (!result || result.length === 0) {
      logger.warn('Payment succeeded for unknown subscription', {
        subscriptionId,
        invoiceId: invoice.id
      });
      return { success: true, processed: false };
    }

    const userId = result[0][0];

    // Reset usage counters atomically
    await this.resetUserUsageAtomic(userId);

    logger.info('Payment succeeded and usage reset', {
      userId,
      subscriptionId,
      invoiceId: invoice.id
    });

    return { success: true, processed: true };
  }

  /**
   * Handle payment failed with atomic transaction
   */
  private async handlePaymentFailedAtomic(invoice: Stripe.Invoice): Promise<ProcessingResult> {
    if (!invoice.subscription) {
      return { success: true, processed: false };
    }

    const subscriptionId = invoice.subscription as string;
    logger.warn('Payment failed for subscription', {
      subscriptionId,
      invoiceId: invoice.id,
      amountDue: invoice.amount_due
    });

    // Optionally implement grace period or downgrade logic here
    // For now, just log the event

    return { success: true, processed: true };
  }

  /**
   * Handle checkout session completed with atomic transaction
   */
  private async handleCheckoutCompletedAtomic(session: Stripe.Checkout.Session): Promise<ProcessingResult> {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;

    if (!userId || !planId) {
      logger.warn('Checkout completed without required metadata', {
        sessionId: session.id
      });
      return { success: true, processed: false };
    }

    if (session.subscription) {
      const updateData: SubscriptionUpdateData = {
        planId: planId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        status: 'active'
      };

      await this.updateUserSubscriptionAtomic(userId, updateData);

      logger.info('Checkout completed and subscription activated', {
        userId,
        sessionId: session.id,
        subscriptionId: session.subscription,
        planId
      });
    }

    return { success: true, processed: true };
  }

  /**
   * Update user subscription with atomic database transaction
   */
  private async updateUserSubscriptionAtomic(userId: string, updates: SubscriptionUpdateData): Promise<void> {
    await this.database.executeTransaction(async (connection: any) => {
      const setParts = [];
      const values = [];

      if (updates.planId !== undefined) {
        setParts.push('plan = ?');
        values.push(updates.planId);
      }

      if (updates.stripeCustomerId !== undefined) {
        setParts.push('stripe_customer_id = ?');
        values.push(updates.stripeCustomerId);
      }

      if (updates.stripeSubscriptionId !== undefined) {
        setParts.push('stripe_subscription_id = ?');
        values.push(updates.stripeSubscriptionId);
      }

      if (updates.status !== undefined) {
        setParts.push('subscription_status = ?');
        values.push(updates.status);
      }

      if (updates.currentPeriodStart !== undefined) {
        setParts.push('current_period_start = ?');
        values.push(updates.currentPeriodStart);
      }

      if (updates.currentPeriodEnd !== undefined) {
        setParts.push('current_period_end = ?');
        values.push(updates.currentPeriodEnd);
      }

      setParts.push('updated_at = NOW()');
      values.push(userId);

      const updateQuery = `
        UPDATE users
        SET ${setParts.join(', ')}
        WHERE id = ?
      `;

      await connection.execute(updateQuery, values);

      // Also update conversion limits based on plan
      if (updates.planId) {
        const planLimits = this.getPlanLimits(updates.planId);
        if (planLimits) {
          await connection.execute(
            'UPDATE users SET conversions_limit = ? WHERE id = ?',
            [planLimits.conversionsPerMonth, userId]
          );
        }
      }
    }, {
      timeout: 15000,
      isolationLevel: 'READ_COMMITTED'
    });
  }

  /**
   * Reset user usage counters atomically
   */
  private async resetUserUsageAtomic(userId: string): Promise<void> {
    await this.database.executeTransaction(async (connection: any) => {
      // Reset conversions used
      await connection.execute(
        'UPDATE users SET conversions_used = 0 WHERE id = ?',
        [userId]
      );

      // Reset usage tracking table
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      await connection.execute(`
        INSERT INTO usage_tracking (user_id, usage_month, conversions_count, last_reset_at)
        VALUES (?, ?, 0, NOW())
        ON DUPLICATE KEY UPDATE
        conversions_count = 0,
        last_reset_at = NOW()
      `, [userId, currentMonth]);
    }, {
      timeout: 10000,
      isolationLevel: 'READ_COMMITTED'
    });
  }

  /**
   * Get plan limits for subscription updates
   */
  private getPlanLimits(planId: string): { conversionsPerMonth: number } | null {
    const planLimits: { [key: string]: { conversionsPerMonth: number } } = {
      'free': { conversionsPerMonth: 3 },
      'starter': { conversionsPerMonth: 100 },
      'pro': { conversionsPerMonth: -1 }, // Unlimited
      'enterprise': { conversionsPerMonth: -1 } // Unlimited
    };

    return planLimits[planId] || null;
  }

  /**
   * Release distributed lock safely
   */
  private async releaseLock(lockKey: string, lockValue: string): Promise<void> {
    try {
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      await this.redis.eval(luaScript, 1, lockKey, lockValue);
    } catch (error) {
      logger.error('Error releasing webhook lock', {
        lockKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for webhook processor
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      // Test Redis connection
      await this.redis.ping();

      // Test database connection
      const dbHealth = await this.database.healthCheck();

      return {
        status: dbHealth.status === 'healthy' ? 'healthy' : 'degraded',
        details: {
          redis: 'connected',
          database: dbHealth.status,
          lockTimeout: this.lockTimeout,
          maxRetryAttempts: this.maxRetryAttempts
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Shutdown webhook processor
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down webhook processor');
    await this.redis.quit();
  }
}

export default new StripeWebhookProcessor();