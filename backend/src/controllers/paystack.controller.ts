import { Request, Response } from 'express';
import { PaystackService } from '../services/paystack.service';
import { logger } from '../utils/logger';
import { getConnection, getSQLite } from '../config/database';

/**
 * Paystack Payment Controller
 * Handles payment-related API endpoints
 */
export class PaystackController {
  /**
   * Initialize payment session
   * POST /api/paystack/initialize
   */
  static async initializePayment(req: Request, res: Response): Promise<void> {
    try {
      const { email, plan, userId } = req.body;

      // Validate required fields
      if (!email || !plan) {
        res.status(400).json({
          success: false,
          message: 'Email and plan are required'
        });
        return;
      }

      // Validate email format
      if (!PaystackService.validateEmail(email)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
        return;
      }

      // Get plan details
      const planDetails = PaystackService.getPlanDetails();
      const selectedPlan = planDetails[plan as keyof typeof planDetails];

      if (!selectedPlan) {
        res.status(400).json({
          success: false,
          message: 'Invalid plan selected'
        });
        return;
      }

      // Free plan doesn't require payment
      if (plan === 'free') {
        res.status(400).json({
          success: false,
          message: 'Free plan does not require payment'
        });
        return;
      }

      // Generate unique reference
      const reference = PaystackService.generateReference('pdfcraft');

      // Initialize Paystack transaction
      const paystackResponse = await PaystackService.initializeTransaction({
        email,
        amount: selectedPlan.price, // Amount already in kobo
        currency: selectedPlan.currency as 'NGN',
        reference,
        metadata: {
          userId: userId || null,
          plan,
          custom_fields: [
            {
              display_name: 'Plan',
              variable_name: 'plan',
              value: selectedPlan.name
            }
          ]
        },
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
      });

      // Store transaction in database for tracking
      const isProduction = process.env.NODE_ENV === 'production';

      try {
        if (isProduction) {
          const connection = getConnection();
          await connection.execute(`
            INSERT INTO payment_transactions
            (reference, user_id, email, plan, amount, currency, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
          `, [reference, userId || null, email, plan, selectedPlan.price, selectedPlan.currency]);
        } else {
          const db = getSQLite();
          const stmt = db.prepare(`
            INSERT INTO payment_transactions
            (reference, user_id, email, plan, amount, currency, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
          `);
          stmt.run(reference, userId || null, email, plan, selectedPlan.price, selectedPlan.currency);
        }
      } catch (dbError) {
        logger.warn('Failed to store transaction in database', dbError);
        // Continue even if database storage fails
      }

      logger.info('Payment initialization successful', {
        reference,
        email,
        plan,
        amount: selectedPlan.price
      });

      res.status(200).json({
        success: true,
        message: 'Payment initialized successfully',
        data: {
          authorization_url: paystackResponse.data.authorization_url,
          access_code: paystackResponse.data.access_code,
          reference: paystackResponse.data.reference,
          plan: selectedPlan,
          amount: selectedPlan.price / 100 // Convert back to naira for display
        }
      });

    } catch (error) {
      logger.error('Payment initialization failed', error);
      res.status(500).json({
        success: false,
        message: 'Payment initialization failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Verify payment
   * GET /api/paystack/verify/:reference
   */
  static async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      const { reference } = req.params;

      if (!reference) {
        res.status(400).json({
          success: false,
          message: 'Transaction reference is required'
        });
        return;
      }

      // Verify transaction with Paystack
      const verification = await PaystackService.verifyTransaction(reference);

      // Update transaction status in database
      const isProduction = process.env.NODE_ENV === 'production';

      try {
        if (isProduction) {
          const connection = getConnection();
          await connection.execute(
            'UPDATE payment_transactions SET status = ?, verified_at = NOW() WHERE reference = ?',
            [verification.data.status, reference]
          );
        } else {
          const db = getSQLite();
          const stmt = db.prepare(
            'UPDATE payment_transactions SET status = ?, verified_at = datetime("now") WHERE reference = ?'
          );
          stmt.run(verification.data.status, reference);
        }
      } catch (dbError) {
        logger.warn('Failed to update transaction status in database', dbError);
      }

      logger.info('Payment verification completed', {
        reference,
        status: verification.data.status,
        amount: verification.data.amount / 100
      });

      res.status(200).json({
        success: true,
        message: 'Payment verification completed',
        data: {
          status: verification.data.status,
          reference: verification.data.reference,
          amount: verification.data.amount / 100,
          currency: verification.data.currency,
          paid_at: verification.data.paid_at,
          customer: verification.data.customer,
          metadata: verification.data.metadata
        }
      });

    } catch (error) {
      logger.error('Payment verification failed', error);
      res.status(500).json({
        success: false,
        message: 'Payment verification failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle Paystack webhooks
   * POST /api/paystack/webhook
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      const payload = JSON.stringify(req.body);

      // Verify webhook signature
      if (!PaystackService.verifyWebhookSignature(payload, signature)) {
        logger.warn('Invalid webhook signature received', { signature });
        res.status(400).json({
          success: false,
          message: 'Invalid signature'
        });
        return;
      }

      // Process the webhook event
      await PaystackService.processWebhookEvent(req.body);

      logger.info('Webhook processed successfully', {
        event: req.body.event,
        reference: req.body.data?.reference
      });

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully'
      });

    } catch (error) {
      logger.error('Webhook processing failed', error);
      res.status(500).json({
        success: false,
        message: 'Webhook processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get payment plans
   * GET /api/paystack/plans
   */
  static async getPaymentPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = PaystackService.getPlanDetails();

      res.status(200).json({
        success: true,
        message: 'Payment plans retrieved successfully',
        data: plans
      });

    } catch (error) {
      logger.error('Failed to get payment plans', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payment plans'
      });
    }
  }

  /**
   * Get user's payment history
   * GET /api/paystack/history
   */
  static async getPaymentHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id; // Assuming auth middleware sets req.user

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const isProduction = process.env.NODE_ENV === 'production';
      let transactions: any[] = [];

      try {
        if (isProduction) {
          const connection = getConnection();
          const [rows] = await connection.execute(
            'SELECT * FROM payment_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
          );
          transactions = rows as any[];
        } else {
          const db = getSQLite();
          const stmt = db.prepare('SELECT * FROM payment_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50');
          transactions = stmt.all(userId) as any[];
        }
      } catch (dbError) {
        logger.error('Failed to fetch payment history from database', dbError);
        transactions = [];
      }

      res.status(200).json({
        success: true,
        message: 'Payment history retrieved successfully',
        data: transactions
      });

    } catch (error) {
      logger.error('Failed to get payment history', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payment history'
      });
    }
  }

  /**
   * Get supported currencies
   * GET /api/paystack/currencies
   */
  static async getSupportedCurrencies(req: Request, res: Response): Promise<void> {
    try {
      const currencies = PaystackService.getSupportedCurrencies();

      res.status(200).json({
        success: true,
        message: 'Supported currencies retrieved successfully',
        data: currencies
      });

    } catch (error) {
      logger.error('Failed to get supported currencies', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get supported currencies'
      });
    }
  }
}