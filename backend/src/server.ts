import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { CONFIG as SHARED_CONFIG } from '../../config/shared.config';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { ConvertController } from './controllers/convert.controller';
import { AuthController } from './controllers/auth.controller';
import { PasswordController } from './controllers/password.controller';
import { HealthController } from './controllers/health.controller';
import paystackRoutes from './routes/paystack.routes';
import debugRoutes from './routes/debug.routes';
import enhancedUserRoutes from './routes/enhanced-user.routes';
// import stripePaymentRoutes from './routes/stripe-payment.routes'; // Disabled - using Paystack
import enhancedConvertRoutes from './routes/enhanced-convert.routes';
import { authenticateToken, optionalAuth } from './middleware/auth';
import { validate, registerSchema, loginSchema } from './middleware/validation';
import { authRateLimit, registrationRateLimit } from './middleware/rate-limit';
import { setupSecurityMiddleware, globalErrorHandler, requestLogger } from './middleware/production';
import { logger } from './utils/logger';

// Import type extensions
// import '@/types/express';

// Import workers to start background processing
import './workers/conversion.worker';
import './workers/email.worker';

const app = express();

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Request logging
app.use(requestLogger);

// CORS configuration using BMAD shared config
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : SHARED_CONFIG.CORS_ORIGINS;

// Manual CORS middleware to ensure headers are set properly
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Always set CORS headers for allowed origins
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // For requests without origin (like from server tools)
    res.header('Access-Control-Allow-Origin', '*');
  } else {
    // For unknown origins, still set basic headers but don't allow credentials
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cache-Control,Pragma,Expires,If-None-Match,If-Modified-Since');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// Log CORS configuration for debugging
console.log('🔧 BMAD CORS Origins:', SHARED_CONFIG.CORS_ORIGINS);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Setup security middleware (includes helmet, compression, rate limiting)
setupSecurityMiddleware(app);

// Legacy Morgan logging for development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 20, // Maximum 20 files for merge operations
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Multer error handling middleware
const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError || err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds limit',
        error: {
          code: 'FILE_TOO_LARGE',
          limit: config.upload.maxFileSize
        }
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field',
        error: {
          code: 'UNEXPECTED_FILE_FIELD'
        }
      });
    }
  }

  // Handle empty form submission
  if (err.message && err.message.includes('Unexpected end of form')) {
    return res.status(400).json({
      success: false,
      message: 'No files were uploaded',
      error: {
        code: 'NO_FILES_UPLOADED'
      }
    });
  }

  next(err);
};

app.use(handleMulterError);

// Health check endpoints
app.get('/health', HealthController.getHealth);
app.get('/health/simple', HealthController.getSimpleHealth);
app.get('/health/ready', HealthController.getReadiness);
app.get('/health/live', HealthController.getLiveness);
app.get('/api/status', HealthController.getHealth); // API status endpoint for frontend compatibility

// API routes

// Conversion routes
app.post('/api/convert/pdf-to-ppt',
  upload.array('files', 1),
  optionalAuth,
  // checkUsageLimits will be added in Story 2.3
  ConvertController.convertToPPT
);

app.post('/api/convert/merge',
  upload.array('files', 20),
  optionalAuth,
  // checkUsageLimits will be added in Story 2.3
  ConvertController.mergePDFs
);

// Middleware to prevent 304 responses for job status endpoints
const preventCaching = (req: any, res: any, next: any) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.removeHeader('ETag');
  res.removeHeader('Last-Modified');

  // Remove conditional request headers from request
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];

  next();
};

app.get('/api/job/:jobId/status', preventCaching, ConvertController.getJobStatus);

app.get('/api/download/:filename', ConvertController.downloadFile);

// Authentication routes
app.post('/api/auth/register',
  registrationRateLimit,
  validate(registerSchema),
  AuthController.register
);

app.post('/api/auth/login',
  authRateLimit,
  validate(loginSchema),
  AuthController.login
);

app.post('/api/auth/logout', AuthController.logout);

app.get('/api/auth/me', authenticateToken, AuthController.getMe);

app.post('/api/auth/refresh', AuthController.refreshToken);

// Password reset routes
app.post('/api/auth/forgot-password', authRateLimit, PasswordController.requestReset);
app.post('/api/auth/reset-password', authRateLimit, PasswordController.resetPassword);

// User routes (to be implemented)
// app.get('/api/user/usage', authenticateToken, UserController.getUsage);
// app.get('/api/user/history', authenticateToken, UserController.getHistory);

// Paystack payment routes
app.use('/api/paystack', paystackRoutes);

// Debug routes for image processing (Phase 1)
app.use('/api/debug', debugRoutes);

// Enhanced OCR Overlay conversion routes (Week 2 Revolutionary System)
app.use('/api/convert/enhanced', enhancedConvertRoutes);

// Enhanced User Management routes (Week 3 Day 19-20)
app.use('/api/users/enhanced', enhancedUserRoutes);

// Stripe Payment routes (Week 3 Day 19-20)
// app.use('/api/stripe', stripePaymentRoutes); // Disabled - using Paystack

// Root welcome page - HTML instead of JSON for better browser experience
app.get('/', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PDFCraft.Pro API Server</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                line-height: 1.6;
            }
            .container {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                padding: 40px;
                border-radius: 20px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
            }
            .status-badge {
                display: inline-block;
                background: #10b981;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 20px;
            }
            .endpoints {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-top: 30px;
            }
            .endpoint-group {
                background: rgba(255, 255, 255, 0.1);
                padding: 20px;
                border-radius: 10px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .endpoint-group h3 {
                margin-top: 0;
                color: #fbbf24;
            }
            .endpoint-list {
                list-style: none;
                padding: 0;
            }
            .endpoint-list li {
                margin: 8px 0;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 6px;
                font-family: monospace;
                font-size: 14px;
            }
            .method {
                color: #10b981;
                font-weight: bold;
            }
            .quick-actions {
                margin-top: 30px;
                text-align: center;
            }
            .btn {
                display: inline-block;
                background: #3b82f6;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 8px;
                margin: 0 10px;
                font-weight: 600;
                transition: background 0.2s;
            }
            .btn:hover {
                background: #2563eb;
            }
            .btn.success {
                background: #10b981;
            }
            .btn.success:hover {
                background: #059669;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="status-badge">✅ SERVER RUNNING</div>
                <h1>🎯 PDFCraft.Pro API Server</h1>
                <p>Lightning-fast PDF processing with Paystack payments</p>
                <p><strong>Version:</strong> 1.0.0 | <strong>Port:</strong> 3002 | <strong>Environment:</strong> Development</p>
            </div>

            <div class="endpoints">
                <div class="endpoint-group">
                    <h3>💳 Payment Endpoints</h3>
                    <ul class="endpoint-list">
                        <li><span class="method">GET</span> /api/paystack/plans</li>
                        <li><span class="method">GET</span> /api/paystack/currencies</li>
                        <li><span class="method">POST</span> /api/paystack/initialize</li>
                        <li><span class="method">GET</span> /api/paystack/verify/:ref</li>
                        <li><span class="method">POST</span> /api/paystack/webhook</li>
                    </ul>
                </div>

                <div class="endpoint-group">
                    <h3>🔄 PDF Processing</h3>
                    <ul class="endpoint-list">
                        <li><span class="method">POST</span> /api/convert/pdf-to-ppt</li>
                        <li><span class="method">POST</span> /api/convert/merge</li>
                        <li><span class="method">GET</span> /api/job/:id/status</li>
                        <li><span class="method">GET</span> /api/download/:filename</li>
                    </ul>
                </div>

                <div class="endpoint-group">
                    <h3>🚀 OCR Overlay System (NEW!)</h3>
                    <ul class="endpoint-list">
                        <li><span class="method">POST</span> /api/convert/enhanced/pdf-to-powerpoint</li>
                        <li><span class="method">GET</span> /api/convert/enhanced/status/:jobId</li>
                        <li><span class="method">GET</span> /api/convert/enhanced/service-status</li>
                        <li><span class="method">GET</span> /api/convert/enhanced/health</li>
                    </ul>
                </div>

                <div class="endpoint-group">
                    <h3>📊 System Endpoints</h3>
                    <ul class="endpoint-list">
                        <li><span class="method">GET</span> /health</li>
                        <li><span class="method">GET</span> /health/simple</li>
                        <li><span class="method">GET</span> /health/ready</li>
                        <li><span class="method">GET</span> /health/live</li>
                    </ul>
                </div>
            </div>

            <div class="quick-actions">
                <h3>🧪 Quick Actions</h3>
                <a href="/health" class="btn success">Health Check</a>
                <a href="/api/paystack/plans" class="btn">View Plans</a>
                <a href="/api/paystack/currencies" class="btn">View Currencies</a>
                <a href="test-paystack.html" class="btn">Test Interface</a>
            </div>

            <div style="margin-top: 40px; text-align: center; opacity: 0.8;">
                <p>📖 <strong>Documentation:</strong> PAYSTACK_INTEGRATION.md</p>
                <p>🔧 <strong>Status:</strong> Mock services active (SQLite + Mock Redis)</p>
                <p>🔐 <strong>JWT Tokens:</strong> Expire after 7 days - users get 24hr warnings</p>
                <p>💡 <strong>Tip:</strong> Add real Paystack keys to .env for live payments</p>
            </div>
        </div>

        <script>
            // Auto-refresh status every 30 seconds
            setInterval(() => {
                fetch('/health')
                    .then(response => response.json())
                    .then(data => {
                        console.log('Server health:', data);
                    })
                    .catch(error => {
                        console.warn('Health check failed:', error);
                    });
            }, 30000);
        </script>
    </body>
    </html>
  `;

  res.send(html);
});

// Serve test Paystack HTML file
app.get('/test-paystack.html', (req, res) => {
  res.sendFile('test-paystack.html', { root: __dirname + '/../' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use(globalErrorHandler);

// Initialize connections and start server
async function startServer() {
  try {
    logger.info('🚀 Starting PDFCraft.Pro API Server...');

    // Create log and upload directories
    const fs = require('fs').promises;
    const logDir = process.env.LOG_DIR || './logs';
    await fs.mkdir(logDir, { recursive: true });
    await fs.mkdir(config.upload.uploadDir, { recursive: true });
    await fs.mkdir(config.upload.tempDir, { recursive: true });

    // Connect to database
    await connectDatabase(config.database);
    logger.info('✅ Database connected successfully');

    // Connect to Redis
    connectRedis(config.redis);
    logger.info('✅ Redis connected successfully');

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`✅ Server running on port ${config.port}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`💾 Database: ${config.database.host}:${config.database.port}`);
      logger.info(`🔄 Redis: ${config.redis.host}:${config.redis.port}`);
      logger.info(`📁 Upload dir: ${config.upload.uploadDir}`);
      logger.info(`⚡ Ready to process PDFs!`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`📴 ${signal} received, shutting down gracefully`);

      server.close(async () => {
        try {
          // Import closeConnection dynamically to avoid circular dependency
          const { closeConnection } = await import('./config/database');
          await closeConnection();
          logger.info('✅ HTTP server and database connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during graceful shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('⚠️ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
// Trigger restart


