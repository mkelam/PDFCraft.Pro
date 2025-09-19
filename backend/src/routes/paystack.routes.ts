import { Router } from 'express';
import { PaystackController } from '../controllers/paystack.controller';
import { optionalAuth } from '../middleware/auth';
import { validatePaymentInitialization } from '../middleware/validation';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for payment endpoints
const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 payment requests per windowMs
  message: {
    success: false,
    message: 'Too many payment requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Allow more webhook calls
  message: {
    success: false,
    message: 'Webhook rate limit exceeded.'
  },
  skip: (req) => {
    // Skip rate limiting for Paystack IPs (you should verify these)
    const paystackIPs = [
      '52.31.139.75',
      '52.49.173.169',
      '52.214.14.220'
    ];
    return paystackIPs.includes(req.ip);
  }
});

// Payment routes
router.post('/initialize',
  paymentRateLimit,
  validatePaymentInitialization,
  PaystackController.initializePayment
);

router.get('/verify/:reference',
  paymentRateLimit,
  PaystackController.verifyPayment
);

router.post('/webhook',
  webhookRateLimit,
  PaystackController.handleWebhook
);

// Information routes
router.get('/plans', PaystackController.getPaymentPlans);
router.get('/currencies', PaystackController.getSupportedCurrencies);

// Protected routes (require authentication)
router.get('/history',
  optionalAuth,
  PaystackController.getPaymentHistory
);

export default router;