import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { config } from '@/config';
import { connectDatabase } from '@/config/database';
import { connectRedis } from '@/config/redis';
import { ConvertController } from '@/controllers/convert.controller';
import { authenticateToken, optionalAuth, checkUsageLimits } from '@/middleware/auth';

// Import worker to start background processing
import '@/workers/conversion.worker';

const app = express();

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://pdfcraft.pro', 'https://www.pdfcraft.pro']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', rateLimiter);

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'PDFCraft.Pro API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes

// Conversion routes
app.post('/api/convert/pdf-to-ppt',
  upload.array('files', 1),
  optionalAuth,
  checkUsageLimits,
  ConvertController.convertToPPT
);

app.post('/api/convert/merge',
  upload.array('files', 20),
  optionalAuth,
  checkUsageLimits,
  ConvertController.mergePDFs
);

app.get('/api/job/:jobId/status', ConvertController.getJobStatus);

app.get('/api/download/:filename', ConvertController.downloadFile);

// Authentication routes (to be implemented)
// app.post('/api/auth/register', AuthController.register);
// app.post('/api/auth/login', AuthController.login);
// app.post('/api/auth/logout', AuthController.logout);
// app.get('/api/auth/me', authenticateToken, AuthController.getMe);

// User routes (to be implemented)
// app.get('/api/user/usage', authenticateToken, UserController.getUsage);
// app.get('/api/user/history', authenticateToken, UserController.getHistory);

// Payment routes (to be implemented)
// app.post('/api/stripe/create-checkout', authenticateToken, StripeController.createCheckout);
// app.post('/api/stripe/webhook', StripeController.handleWebhook);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);

  // Multer errors
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File size too large'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        success: false,
        message: 'Too many files'
      });
    }
  }

  // File type errors
  if (error.message === 'Only PDF files are allowed') {
    return res.status(400).json({
      success: false,
      message: 'Only PDF files are allowed'
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: config.nodeEnv === 'production'
      ? 'Internal server error'
      : error.message
  });
});

// Initialize connections and start server
async function startServer() {
  try {
    console.log('🚀 Starting PDFCraft.Pro API Server...');

    // Connect to database
    await connectDatabase(config.database);

    // Connect to Redis
    connectRedis(config.redis);

    // Create upload directories
    const fs = require('fs').promises;
    await fs.mkdir(config.upload.uploadDir, { recursive: true });
    await fs.mkdir(config.upload.tempDir, { recursive: true });

    // Start server
    app.listen(config.port, () => {
      console.log(`✅ Server running on port ${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`💾 Database: ${config.database.host}:${config.database.port}`);
      console.log(`🔄 Redis: ${config.redis.host}:${config.redis.port}`);
      console.log(`📁 Upload dir: ${config.upload.uploadDir}`);
      console.log(`⚡ Ready to process PDFs!`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received, shutting down gracefully');
  // Add cleanup logic here
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received, shutting down gracefully');
  // Add cleanup logic here
  process.exit(0);
});

// Start the server
startServer();

export default app;