import rateLimit from 'express-rate-limit';

/**
 * Rate limiting for authentication endpoints
 * More restrictive to prevent brute force attacks
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.round((req as any).rateLimit.resetTime! / 1000),
      },
    });
  },
});

/**
 * Rate limiting for registration endpoint
 * Even more restrictive to prevent spam registrations
 */
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registration attempts per hour
  message: {
    success: false,
    error: {
      message: 'Too many registration attempts. Please try again in 1 hour.',
      code: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many registration attempts. Please try again in 1 hour.',
        code: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.round((req as any).rateLimit.resetTime! / 1000),
      },
    });
  },
});

/**
 * General API rate limiting
 * Applied to all API routes
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many API requests. Please try again later.',
      code: 'API_RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: false,
  // Skip failed requests
  skipFailedRequests: false,
});

/**
 * Strict rate limiting for sensitive operations (Stripe payments)
 * Used for: payment operations, subscription changes, account modifications
 */
export const rateLimitStrict = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    message: 'Too many requests for this operation. Please try again in 15 minutes.',
    code: 'RATE_LIMIT_STRICT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    const user = (req as any).user;
    return user ? `strict_${user.id}` : `strict_ip_${req.ip}`;
  }
});

/**
 * Moderate rate limiting for general API operations (Stripe)
 * Used for: user management, subscription queries, billing portal
 */
export const rateLimitModerate = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: {
    success: false,
    message: 'Too many requests. Please try again in 15 minutes.',
    code: 'RATE_LIMIT_MODERATE'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const user = (req as any).user;
    return user ? `moderate_${user.id}` : `moderate_ip_${req.ip}`;
  }
});