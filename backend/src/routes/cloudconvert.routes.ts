import { Router } from 'express';
import multer from 'multer';
import { CloudConvertController } from '../controllers/cloudconvert.controller';
import { validateOutputFormat } from '../middleware/format-validation.middleware';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './temp/uploads';

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `cloudconvert-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size for CloudConvert
  },
  fileFilter: (req, file, cb) => {
    // Only accept PDF files
    if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

/**
 * CloudConvert Routes
 * Handles PDF to Office format conversions using CloudConvert API
 * Supports: DOCX, PPTX, XLSX
 */

// POST /api/cloudconvert/pdf-to-word
// Convert PDF to Word (DOCX) using CloudConvert
router.post(
  '/pdf-to-word',
  upload.single('file'),
  CloudConvertController.convertPDFToWord
);

// POST /api/cloudconvert/pdf-to-ppt
// Convert PDF to PowerPoint (PPTX) using CloudConvert
router.post(
  '/pdf-to-ppt',
  upload.single('file'),
  CloudConvertController.convertPDFToPowerPoint
);

// POST /api/cloudconvert/pdf-to-excel
// Convert PDF to Excel (XLSX) using CloudConvert
router.post(
  '/pdf-to-excel',
  upload.single('file'),
  CloudConvertController.convertPDFToExcel
);

// POST /api/cloudconvert/convert
// Generic conversion endpoint with format selection in body
// ✅ CRITICAL: Format validation middleware ensures valid outputFormat
router.post(
  '/convert',
  upload.single('file'),
  validateOutputFormat,
  CloudConvertController.convertPDFToOffice
);

// GET /api/cloudconvert/formats
// Get list of supported Office formats
router.get(
  '/formats',
  CloudConvertController.getSupportedFormats
);

// GET /api/cloudconvert/status/:jobId
// Get CloudConvert job status
router.get(
  '/status/:jobId',
  CloudConvertController.getJobStatus
);

// GET /api/cloudconvert/info
// Get CloudConvert account information
router.get(
  '/info',
  CloudConvertController.getAccountInfo
);

// GET /api/cloudconvert/test
// Test CloudConvert connection
router.get(
  '/test',
  CloudConvertController.testConnection
);

export default router;
