import { Router } from 'express';
import { PayFastController } from '../controllers/payfast.controller';
import { optionalAuth } from '../middleware/auth';
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
    // Skip rate limiting for PayFast IPs
    const payfastIPs = [
      '197.97.145.144',
      '41.74.179.194',
      '41.74.179.195',
      '41.74.179.196',
      '41.74.179.197',
      '197.97.145.145'
    ];
    return payfastIPs.includes(req.ip);
  }
});

// PayFast-specific middleware for form data parsing
const parseFormData = (req: any, res: any, next: any) => {
  // PayFast sends form data, ensure it's parsed correctly
  if (req.is('application/x-www-form-urlencoded')) {
    next();
  } else {
    next();
  }
};

// Payment routes
router.post('/initialize',
  paymentRateLimit,
  validatePayFastInitialization,
  PayFastController.initializePayment
);

// PayFast callback routes (these need to handle form data)
router.get('/return',
  PayFastController.handleReturn
);

router.get('/cancel',
  PayFastController.handleCancel
);

router.post('/notify',
  webhookRateLimit,
  parseFormData,
  PayFastController.handleNotification
);

// Information routes
router.get('/plans', PayFastController.getPaymentPlans);

// Payment status checking
router.get('/status/:paymentId',
  paymentRateLimit,
  PayFastController.checkPaymentStatus
);

// Protected routes (require authentication)
router.get('/history',
  optionalAuth,
  PayFastController.getPaymentHistory
);

router.post('/cancel-subscription',
  optionalAuth,
  PayFastController.cancelSubscription
);

// PayFast-specific validation middleware
function validatePayFastInitialization(req: any, res: any, next: any) {
  const { email, firstName, lastName, plan } = req.body;

  // Validate required fields
  if (!email || !firstName || !lastName || !plan) {
    return res.status(400).json({
      success: false,
      message: 'Email, firstName, lastName, and plan are required'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  // Validate names (basic validation)
  if (firstName.length < 2 || lastName.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'First name and last name must be at least 2 characters'
    });
  }

  // Validate plan
  const validPlans = ['free', 'starter', 'pro', 'enterprise'];
  if (!validPlans.includes(plan)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid plan selected'
    });
  }

  next();
}

export default router;