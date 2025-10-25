import { Request, Response } from 'express';
import { PayFastService } from '../services/payfast.service';
import { logger } from '../utils/logger';
import { getConnection, getSQLite } from '../config/database';

/**
 * PayFast Payment Controller
 * Handles PayFast payment-related API endpoints for South African users
 */
export class PayFastController {
  private static payFastService = new PayFastService();

  /**
   * Initialize PayFast payment
   * POST /api/payfast/initialize
   */
  static async initializePayment(req: Request, res: Response): Promise<void> {
    try {
      const { email, firstName, lastName, plan, userId } = req.body;

      // Validate required fields
      if (!email || !firstName || !lastName || !plan) {
        res.status(400).json({
          success: false,
          message: 'Email, firstName, lastName, and plan are required'
        });
        return;
      }

      // Validate email format
      if (!PayFastController.validateEmail(email)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
        return;
      }

      // Get plan details
      const planDetails = PayFastController.payFastService.getPlan(plan);

      if (!planDetails) {
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

      // Create PayFast payment form
      const returnUrl = `${req.protocol}://${req.get('host')}/api/payfast/return`;
      const cancelUrl = `${req.protocol}://${req.get('host')}/api/payfast/cancel`;
      const notifyUrl = `${req.protocol}://${req.get('host')}/api/payfast/notify`;

      const paymentResult = await PayFastController.payFastService.createPaymentForm(
        userId || 'guest',
        email,
        firstName,
        lastName,
        plan,
        returnUrl,
        cancelUrl,
        notifyUrl
      );

      if (!paymentResult.success) {
        res.status(400).json({
          success: false,
          message: paymentResult.error || 'Payment initialization failed'
        });
        return;
      }

      // Store transaction in database for tracking
      const isProduction = process.env.NODE_ENV === 'production';

      try {
        if (isProduction) {
          const connection = getConnection();
          await connection.execute(`
            INSERT INTO payment_transactions
            (payment_id, user_id, email, plan, amount, currency, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
          `, [paymentResult.paymentId, userId || null, email, plan, planDetails.price, planDetails.currency]);
        } else {
          const db = getSQLite();
          const stmt = db.prepare(`
            INSERT INTO payment_transactions
            (payment_id, user_id, email, plan, amount, currency, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
          `);
          stmt.run(paymentResult.paymentId, userId || null, email, plan, planDetails.price, planDetails.currency);
        }
      } catch (dbError) {
        logger.warn('Failed to store transaction in database', dbError);
        // Continue even if database storage fails
      }

      logger.info('PayFast payment initialization successful', {
        paymentId: paymentResult.paymentId,
        email,
        plan,
        amount: planDetails.price
      });

      res.status(200).json({
        success: true,
        message: 'Payment initialized successfully',
        data: {
          payment_url: paymentResult.paymentUrl,
          payment_id: paymentResult.paymentId,
          plan: planDetails,
          amount: planDetails.price
        }
      });

    } catch (error) {
      logger.error('PayFast payment initialization failed', error);
      res.status(500).json({
        success: false,
        message: 'Payment initialization failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle PayFast return URL (success)
   * GET /api/payfast/return
   */
  static async handleReturn(req: Request, res: Response): Promise<void> {
    try {
      const { m_payment_id, pf_payment_id } = req.query;

      logger.info('PayFast return URL accessed', {
        paymentId: m_payment_id,
        payfastPaymentId: pf_payment_id
      });

      // Redirect to frontend success page
      const frontendUrl = process.env.FRONTEND_URL || 'https://pdflab.pro';
      res.redirect(`${frontendUrl}/payment/success?payment_id=${m_payment_id}&pf_payment_id=${pf_payment_id}`);

    } catch (error) {
      logger.error('PayFast return handling failed', error);
      const frontendUrl = process.env.FRONTEND_URL || 'https://pdflab.pro';
      res.redirect(`${frontendUrl}/payment/error`);
    }
  }

  /**
   * Handle PayFast cancel URL
   * GET /api/payfast/cancel
   */
  static async handleCancel(req: Request, res: Response): Promise<void> {
    try {
      const { m_payment_id } = req.query;

      logger.info('PayFast payment cancelled', {
        paymentId: m_payment_id
      });

      // Update transaction status in database
      const isProduction = process.env.NODE_ENV === 'production';

      try {
        if (isProduction) {
          const connection = getConnection();
          await connection.execute(
            'UPDATE payment_transactions SET status = ?, updated_at = NOW() WHERE payment_id = ?',
            ['cancelled', m_payment_id]
          );
        } else {
          const db = getSQLite();
          const stmt = db.prepare(
            'UPDATE payment_transactions SET status = ?, updated_at = datetime("now") WHERE payment_id = ?'
          );
          stmt.run('cancelled', m_payment_id);
        }
      } catch (dbError) {
        logger.warn('Failed to update transaction status in database', dbError);
      }

      // Redirect to frontend cancel page
      const frontendUrl = process.env.FRONTEND_URL || 'https://pdflab.pro';
      res.redirect(`${frontendUrl}/payment/cancelled?payment_id=${m_payment_id}`);

    } catch (error) {
      logger.error('PayFast cancel handling failed', error);
      const frontendUrl = process.env.FRONTEND_URL || 'https://pdflab.pro';
      res.redirect(`${frontendUrl}/payment/error`);
    }
  }

  /**
   * Handle PayFast IPN (Instant Payment Notification) webhook
   * POST /api/payfast/notify
   */
  static async handleNotification(req: Request, res: Response): Promise<void> {
    try {
      const notificationData = req.body;

      logger.info('PayFast IPN received', {
        paymentId: notificationData.m_payment_id,
        status: notificationData.payment_status,
        amount: notificationData.amount_gross
      });

      // Verify the notification
      if (!PayFastController.payFastService.verifyNotification(notificationData, req.headers)) {
        logger.warn('Invalid PayFast notification received');
        res.status(400).send('Invalid notification');
        return;
      }

      // Process the notification
      await PayFastController.payFastService.handleNotification(notificationData);

      // Update transaction status in database
      const isProduction = process.env.NODE_ENV === 'production';

      try {
        if (isProduction) {
          const connection = getConnection();
          await connection.execute(`
            UPDATE payment_transactions
            SET status = ?, payfast_payment_id = ?, verified_at = NOW(), updated_at = NOW()
            WHERE payment_id = ?
          `, [notificationData.payment_status, notificationData.pf_payment_id, notificationData.m_payment_id]);
        } else {
          const db = getSQLite();
          const stmt = db.prepare(`
            UPDATE payment_transactions
            SET status = ?, payfast_payment_id = ?, verified_at = datetime("now"), updated_at = datetime("now")
            WHERE payment_id = ?
          `);
          stmt.run(notificationData.payment_status, notificationData.pf_payment_id, notificationData.m_payment_id);
        }
      } catch (dbError) {
        logger.warn('Failed to update transaction status in database', dbError);
      }

      logger.info('PayFast notification processed successfully', {
        paymentId: notificationData.m_payment_id,
        status: notificationData.payment_status
      });

      res.status(200).send('OK');

    } catch (error) {
      logger.error('PayFast notification processing failed', error);
      res.status(500).send('Processing failed');
    }
  }

  /**
   * Get payment plans
   * GET /api/payfast/plans
   */
  static async getPaymentPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = PayFastController.payFastService.getPlans();

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
   * GET /api/payfast/history
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
   * Cancel subscription
   * POST /api/payfast/cancel
   */
  static async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { payfastPaymentId } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!payfastPaymentId) {
        res.status(400).json({
          success: false,
          message: 'PayFast payment ID is required'
        });
        return;
      }

      const result = await PayFastController.payFastService.cancelSubscription(userId, payfastPaymentId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'Cancellation failed'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Subscription cancelled successfully'
      });

    } catch (error) {
      logger.error('Subscription cancellation failed', error);
      res.status(500).json({
        success: false,
        message: 'Subscription cancellation failed'
      });
    }
  }

  /**
   * Check payment status
   * GET /api/payfast/status/:paymentId
   */
  static async checkPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        res.status(400).json({
          success: false,
          message: 'Payment ID is required'
        });
        return;
      }

      const isProduction = process.env.NODE_ENV === 'production';
      let transaction: any = null;

      try {
        if (isProduction) {
          const connection = getConnection();
          const [rows] = await connection.execute(
            'SELECT * FROM payment_transactions WHERE payment_id = ?',
            [paymentId]
          );
          transaction = (rows as any[])[0] || null;
        } else {
          const db = getSQLite();
          const stmt = db.prepare('SELECT * FROM payment_transactions WHERE payment_id = ?');
          transaction = stmt.get(paymentId) || null;
        }
      } catch (dbError) {
        logger.error('Failed to fetch payment status from database', dbError);
      }

      if (!transaction) {
        res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Payment status retrieved successfully',
        data: {
          payment_id: transaction.payment_id,
          status: transaction.status,
          amount: transaction.amount,
          currency: transaction.currency,
          plan: transaction.plan,
          created_at: transaction.created_at,
          verified_at: transaction.verified_at
        }
      });

    } catch (error) {
      logger.error('Failed to check payment status', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check payment status'
      });
    }
  }

  /**
   * Validate email format
   */
  private static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export default PayFastController;