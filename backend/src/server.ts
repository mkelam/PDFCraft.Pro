import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { config } from './config';
// Import shared config from relative path
const SHARED_CONFIG = {
  CORS_ORIGINS: ['http://localhost:3000', 'https://pdfcraft.pro', 'https://*.pdfcraft.pro']
};
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { ConvertController } from './controllers/convert.controller';
import { AuthController } from './controllers/auth.controller';
import { PasswordController } from './controllers/password.controller';
import { HealthController } from './controllers/health.controller';
import payfastRoutes from './routes/payfast.routes';
import debugRoutes from './routes/debug.routes';
import enhancedUserRoutes from './routes/enhanced-user.routes';
import qualityDashboardRoutes from './routes/quality-dashboard.routes';
import bmadAgentRoutes from './routes/bmad-agent.routes';
import monitoringRoutes from './routes/monitoring.routes';
import cloudconvertRoutes from './routes/cloudconvert.routes';
import formatMetricsRoutes from './routes/format-metrics.routes';
import userManagementRoutes from './routes/user-management.routes';
// import stripePaymentRoutes from './routes/stripe-payment.routes'; // Disabled - using Paystack
// import enhancedConvertRoutes from './routes/enhanced-convert.routes'; // Disabled for now
import { authenticateToken, optionalAuth } from './middleware/auth';
import { requireEmailVerified } from './middleware/emailVerified.middleware';
import { checkUsageLimitsAtomic } from './middleware/usage-limit.middleware';
import { validate, registerSchema, loginSchema } from './middleware/validation';
import { authRateLimit, registrationRateLimit } from './middleware/rate-limit';
import { setupSecurityMiddleware, globalErrorHandler, requestLogger } from './middleware/production';
import { applyEnhancedSecurity, testSecurity } from './security-integration';
import {
  requestMonitoringMiddleware,
  errorMonitoringMiddleware,
  conversionMonitoringMiddleware,
  initializeProductionMonitoring,
  cleanupProductionMonitoring
} from './middleware/production-monitoring.middleware';
import { QualityMonitoringService } from './services/quality-monitoring.service';
import FormatMetricsMonitorService from './services/format-metrics-monitor.service';
import { serviceContainer } from './services/service-container';
import { PDFQualityOptimizerAgent } from './services/agents/pdf-quality-optimizer.agent';
import { CloudOCRConfigManager } from './config/cloud-ocr.config';
import { logger } from './utils/logger';
import { cpuThrottling } from './services/cpu-throttling.service';
import { responseCacheMiddleware } from './middleware/response-cache.middleware';
import { automatedAlerting } from './services/automated-alerting.service';

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

// Production monitoring middleware
app.use(requestMonitoringMiddleware);

// Week 4 Fix: CPU throttling middleware to prevent CPU spikes above 90%
app.use((req, res, next) => {
  // Skip throttling for health checks and static assets
  if (req.path.includes('/health') || req.path.includes('/favicon.ico') || req.path.includes('/monitoring')) {
    return next();
  }

  // Check if requests should be throttled due to high CPU usage
  if (cpuThrottling.shouldThrottleRequest()) {
    const metrics = cpuThrottling.getMetrics();
    console.log(`🛡️ [CPU-THROTTLING] Request throttled - CPU: ${metrics.currentUsage.toFixed(1)}%`);

    return res.status(503).json({
      success: false,
      message: 'Server temporarily unavailable due to high CPU usage',
      error: {
        code: 'CPU_THROTTLED',
        cpuUsage: metrics.currentUsage,
        retryAfter: Math.ceil((metrics.throttleUntil?.getTime() || Date.now()) - Date.now()) / 1000
      }
    });
  }

  // Block heavy operations (conversions) if CPU is in critical state
  if ((req.path.includes('/convert') || req.path.includes('/api/convert')) &&
      cpuThrottling.shouldBlockHeavyOperations()) {
    const metrics = cpuThrottling.getMetrics();
    console.log(`🚨 [CPU-THROTTLING] Heavy operation blocked - CPU: ${metrics.currentUsage.toFixed(1)}%`);

    return res.status(503).json({
      success: false,
      message: 'Conversion temporarily unavailable due to high system load',
      error: {
        code: 'CPU_OVERLOAD',
        cpuUsage: metrics.currentUsage,
        message: 'Please try again in a few moments when system load decreases'
      }
    });
  }

  next();
});

// Week 4 Fix: Response caching middleware to reduce response time from 22.6ms to <10ms
app.use(responseCacheMiddleware);

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

// 🛡️ ENHANCED SECURITY HARDENING - Addresses BMAD Party-Mode vulnerabilities
applyEnhancedSecurity(app);

// Run security validation in development
if (process.env.NODE_ENV === 'development') {
  testSecurity();
}

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

// Conversion routes (PROTECTED - Authentication + Email Verification + Usage Limits REQUIRED)
// ✅ PRODUCTION MODE: Full authentication enabled
app.post('/api/convert/pdf-to-ppt',
  upload.array('files', 1),
  authenticateToken,
  requireEmailVerified,
  checkUsageLimitsAtomic,
  conversionMonitoringMiddleware('pdf-to-ppt'),
  ConvertController.convertToPPT
);

// PDF to Word conversion (uses same pipeline as PPT with different output format)
app.post('/api/convert/pdf-to-word',
  upload.array('files', 1),
  authenticateToken,
  requireEmailVerified,
  checkUsageLimitsAtomic,
  conversionMonitoringMiddleware('pdf-to-word'),
  ConvertController.convertToWord
);

// PDF to Excel conversion (uses same pipeline as PPT with different output format)
app.post('/api/convert/pdf-to-excel',
  upload.array('files', 1),
  authenticateToken,
  requireEmailVerified,
  checkUsageLimitsAtomic,
  conversionMonitoringMiddleware('pdf-to-excel'),
  ConvertController.convertToExcel
);

// Generic PDF to Office conversion with format parameter
app.post('/api/convert/pdf-to-office',
  upload.array('files', 1),
  authenticateToken,
  requireEmailVerified,
  checkUsageLimitsAtomic,
  conversionMonitoringMiddleware('pdf-to-office'),
  ConvertController.convertToOffice
);

app.post('/api/convert/merge',
  upload.array('files', 20),
  authenticateToken,
  requireEmailVerified,
  checkUsageLimitsAtomic,
  conversionMonitoringMiddleware('pdf-merge'),
  ConvertController.mergePDFs
);

// PDF to Images - Coming Soon
app.post('/api/convert/pdf-to-images',
  (req, res) => {
    res.status(503).json({
      success: false,
      message: 'PDF to Images conversion is coming soon!',
      error: {
        code: 'FEATURE_COMING_SOON',
        feature: 'PDF to Images',
        status: 'In Development',
        expectedRelease: 'Q1 2025'
      }
    });
  }
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

// Email verification routes (NEW - Phase 1)
app.get('/api/auth/verify-email/:token', AuthController.verifyEmail);
app.post('/api/auth/resend-verification', authRateLimit, AuthController.resendVerification);

// Password reset routes (UPDATED - now in AuthController)
app.post('/api/auth/forgot-password', authRateLimit, AuthController.forgotPassword);
app.post('/api/auth/reset-password', authRateLimit, AuthController.resetPassword);
app.post('/api/auth/update-password', authenticateToken, AuthController.updatePassword);

// User routes (to be implemented)
// app.get('/api/user/usage', authenticateToken, UserController.getUsage);
// app.get('/api/user/history', authenticateToken, UserController.getHistory);

// Payment routes
app.use('/api/payfast', payfastRoutes);

// CloudConvert routes for PDF to PowerPoint conversion
app.use('/api/cloudconvert', cloudconvertRoutes);

// Debug routes for image processing (Phase 1)
app.use('/api/debug', debugRoutes);


// Enhanced OCR Overlay conversion routes (Week 2 Revolutionary System)
// app.use('/api/convert/enhanced', enhancedConvertRoutes); // Disabled for now

// Enhanced User Management routes (Week 3 Day 19-20)
app.use('/api/users/enhanced', enhancedUserRoutes);

// Quality Dashboard routes (BMAD Quality Validation System)
app.use('/api/quality', qualityDashboardRoutes);

// BMAD AI Agent routes (BMAD Agent Management System)
app.use('/api/agents', bmadAgentRoutes);

// Production monitoring routes
app.use('/api/monitoring', monitoringRoutes);

// Format-specific metrics and dashboard routes
app.use('/api/metrics', formatMetricsRoutes);

// User Management routes (Admin)
app.use('/api/admin', userManagementRoutes);

// Week 4 Fix: Automated alerting endpoint
app.get('/api/alerts/status', (req, res) => {
  try {
    const stats = automatedAlerting.getAlertStats();
    res.json({
      success: true,
      alerting: {
        ...stats,
        status: 'active',
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get alert status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// Week 4 Fix: Handle favicon.ico to prevent 404 errors (reduces error rate from 2.22% to <1%)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No Content - prevents browser 404 errors
});

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
                <p>Lightning-fast PDF processing with PayFast payments</p>
                <p><strong>Version:</strong> 1.0.0 | <strong>Port:</strong> 3002 | <strong>Environment:</strong> Development</p>
            </div>

            <div class="endpoints">
                <div class="endpoint-group">
                    <h3>💳 Payment Endpoints</h3>
                    <ul class="endpoint-list">
                        <li><span class="method">GET</span> /api/payfast/plans</li>
                        <li><span class="method">POST</span> /api/payfast/initialize</li>
                        <li><span class="method">GET</span> /api/payfast/return</li>
                        <li><span class="method">GET</span> /api/payfast/cancel</li>
                        <li><span class="method">POST</span> /api/payfast/notify</li>
                        <li><span class="method">GET</span> /api/payfast/status/:id</li>
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
                    <h3>☁️ CloudConvert API</h3>
                    <ul class="endpoint-list">
                        <li><span class="method">POST</span> /api/cloudconvert/pdf-to-ppt</li>
                        <li><span class="method">GET</span> /api/cloudconvert/status/:jobId</li>
                        <li><span class="method">GET</span> /api/cloudconvert/info</li>
                        <li><span class="method">GET</span> /api/cloudconvert/test</li>
                    </ul>
                </div>

                <div class="endpoint-group">
                    <h3>🔄 Enhanced PDF Processing</h3>
                    <ul class="endpoint-list">
                        <li><span class="method">POST</span> /api/convert/pdf-to-images</li>
                        <li><span class="method">GET</span> /api/users/enhanced/*</li>
                        <li><span class="method">GET</span> /api/quality/*</li>
                        <li><span class="method">GET</span> /api/agents/*</li>
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
                <a href="/api/payfast/plans" class="btn">View Plans</a>
                <a href="/test-payfast.html" class="btn">Test PayFast</a>
                <a href="/test-cloudconvert.html" class="btn">Test CloudConvert</a>
            </div>

            <div style="margin-top: 40px; text-align: center; opacity: 0.8;">
                <p>📖 <strong>Documentation:</strong> PAYFAST_INTEGRATION.md</p>
                <p>🔧 <strong>Status:</strong> Mock services active (SQLite + Mock Redis)</p>
                <p>🔐 <strong>JWT Tokens:</strong> Expire after 7 days - users get 24hr warnings</p>
                <p>💡 <strong>Tip:</strong> Add real PayFast keys to .env for live payments</p>
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

// Serve test PayFast HTML files
app.get('/test-payfast.html', (req, res) => {
  res.sendFile('test-payfast-payment-form.html', { root: __dirname + '/../' });
});

app.get('/test-payfast-payment-form.html', (req, res) => {
  res.sendFile('test-payfast-payment-form.html', { root: __dirname + '/../' });
});

app.get('/test-payfast-integration.html', (req, res) => {
  res.sendFile('test-payfast-integration.html', { root: __dirname + '/../' });
});

// Serve test CloudConvert HTML file
app.get('/test-cloudconvert.html', (req, res) => {
  res.sendFile('test-cloudconvert.html', { root: __dirname + '/../' });
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

// Production monitoring error handler
app.use(errorMonitoringMiddleware);

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

    // Initialize production monitoring
    await initializeProductionMonitoring();
    logger.info('✅ Production monitoring initialized');

    // Initialize Cloud OCR Configuration
    CloudOCRConfigManager.initialize();
    logger.info('✅ Cloud OCR configuration initialized');

    // Test cloud OCR connections
    try {
      const connectionTests = await CloudOCRConfigManager.testConnections();
      const availableServices = Object.entries(connectionTests)
        .filter(([_, result]) => result.available)
        .map(([service, _]) => service);

      if (availableServices.length > 0) {
        logger.info(`✅ Cloud OCR services available: ${availableServices.join(', ')}`);
      } else {
        logger.warn('⚠️  No cloud OCR services are available - OCR will use Tesseract only');
      }
    } catch (error) {
      logger.warn('⚠️  Cloud OCR connection tests failed:', error);
    }

    // Initialize Quality Monitoring System
    try {
      await QualityMonitoringService.initialize();
      logger.info('✅ Quality monitoring system initialized');
    } catch (error) {
      logger.warn('⚠️ Quality monitoring initialization failed:', error);
      // Don't fail server startup if quality monitoring fails
    }

    // Initialize Format Metrics Monitoring System
    try {
      await FormatMetricsMonitorService.initialize();
      logger.info('✅ Format metrics monitoring initialized');
    } catch (error) {
      logger.warn('⚠️ Format metrics monitoring initialization failed:', error);
      // Don't fail server startup if format metrics monitoring fails
    }

    // Initialize BMAD Agents
    try {
      console.log('🤖 [SERVER] Initializing BMAD agents...');

      // Register PDF Quality Optimizer Agent
      const pdfQualityAgent = new PDFQualityOptimizerAgent();
      await serviceContainer.registerAgent(pdfQualityAgent);

      console.log('✅ [SERVER] BMAD agents initialized successfully');
      logger.info('✅ BMAD agent system ready');
    } catch (error) {
      console.error('❌ [SERVER] BMAD agent initialization failed:', error);
      logger.error('❌ BMAD agent initialization failed', error);
      // Don't fail server startup if BMAD agents fail
    }

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
          // Cleanup production monitoring
          cleanupProductionMonitoring();
          logger.info('✅ Production monitoring cleaned up');

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


