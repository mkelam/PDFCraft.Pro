import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import { Express } from 'express';
import { logger } from '../utils/logger';

// Rate limiting configuration
export const createRateLimit = () => {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many requests from this IP, please try again later.',
      });
    },
  });
};

// Stricter rate limit for conversion endpoints
export const conversionRateLimit = rateLimit({
  windowMs: 60000, // 1 minute
  max: 5, // 5 conversions per minute
  message: {
    success: false,
    message: 'Conversion rate limit exceeded. Please wait before submitting another conversion.',
  },
  skip: (req) => {
    // Skip rate limit for authenticated pro users
    const user = (req as any).user;
    return user && (user.plan === 'pro' || user.plan === 'enterprise');
  },
});

// Security middleware configuration
export const setupSecurityMiddleware = (app: Express) => {
  // Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.stripe.com"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Needed for file uploads
  }));

  // Compression middleware
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
  }));

  // Rate limiting
  app.use('/api/', createRateLimit());
  app.use('/api/convert/', conversionRateLimit);

  logger.info('Security middleware configured');
};

// Global error handler for production
export const globalErrorHandler = (err: any, req: any, res: any, next: any) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error
  logger.error('Global error handler:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Send appropriate response
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = isProduction ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

// Request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      size: res.get('Content-Length'),
    };

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
};