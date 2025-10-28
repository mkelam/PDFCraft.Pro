import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import multer from 'multer';
import ImageDetectionService from '../services/imageDetection.service';
import QuickImageFixService from '../services/quickfix/quickImageFix.service';
import { logger } from '../utils/logger';

// Helper function for error message extraction
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for testing
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

export class DebugController {
  /**
   * Image detection test endpoint
   */
  static async testImageDetection(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No PDF file provided'
        });
        return;
      }

      const startTime = Date.now();

      // Save uploaded file temporarily
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.mkdir(tempDir, { recursive: true });

      const tempFile = path.join(tempDir, `debug_${Date.now()}.pdf`);
      await fs.writeFile(tempFile, req.file.buffer);

      try {
        // Run image detection analysis
        const imageAnalysis = await ImageDetectionService.analyzeForImages(req.file.buffer);

        // Get processing recommendations
        const recommendations = await ImageDetectionService.getProcessingRecommendations(req.file.buffer);

        // Get file stats
        const stats = await QuickImageFixService.getConversionStats(tempFile);

        const processingTime = Date.now() - startTime;

        logger.info('Debug image detection completed', {
          fileSize: req.file.size,
          fileName: req.file.originalname,
          processingTime,
          imageAnalysis,
          recommendations
        });

        res.json({
          success: true,
          processingTime,
          file: {
            name: req.file.originalname,
            size: req.file.size,
            sizeFormatted: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`
          },
          imageAnalysis,
          recommendations,
          stats,
          timestamp: new Date().toISOString()
        });

      } finally {
        // Cleanup
        try {
          await fs.unlink(tempFile);
        } catch (error) {
          logger.warn('Failed to cleanup debug file', { tempFile, error: getErrorMessage(error) });
        }
      }

    } catch (error) {
      logger.error('Debug image detection failed', {
        error: getErrorMessage(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        success: false,
        error: 'Image detection analysis failed',
        details: getErrorMessage(error)
      });
    }
  }

  /**
   * Quick image fix test endpoint
   */
  static async testQuickImageFix(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No PDF file provided'
        });
        return;
      }

      const startTime = Date.now();

      // Save uploaded file temporarily
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.mkdir(tempDir, { recursive: true });

      const tempFile = path.join(tempDir, `quickfix_test_${Date.now()}.pdf`);
      await fs.writeFile(tempFile, req.file.buffer);

      try {
        // Run QuickImageFix conversion
        const result = await QuickImageFixService.convertWithImages(tempFile);

        const totalProcessingTime = Date.now() - startTime;

        logger.info('Debug QuickImageFix completed', {
          fileSize: req.file.size,
          fileName: req.file.originalname,
          totalProcessingTime,
          result
        });

        if (result.success) {
          // Return download link for the converted file
          const outputFilename = path.basename(result.outputPath);

          res.json({
            success: true,
            processingTime: totalProcessingTime,
            quickFixTime: result.processingTime,
            imageCount: result.imageCount,
            file: {
              name: req.file.originalname,
              size: req.file.size,
              sizeFormatted: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`
            },
            output: {
              filename: outputFilename,
              downloadUrl: `/api/debug/download/${outputFilename}`,
              path: result.outputPath
            },
            timestamp: new Date().toISOString()
          });
        } else {
          res.status(500).json({
            success: false,
            error: 'QuickImageFix conversion failed',
            details: result.error,
            processingTime: result.processingTime
          });
        }

      } finally {
        // Cleanup input file
        try {
          await fs.unlink(tempFile);
        } catch (error) {
          logger.warn('Failed to cleanup debug input file', { tempFile, error: getErrorMessage(error) });
        }
      }

    } catch (error) {
      logger.error('Debug QuickImageFix failed', {
        error: getErrorMessage(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        success: false,
        error: 'QuickImageFix test failed',
        details: getErrorMessage(error)
      });
    }
  }

  /**
   * Download test result files
   */
  static async downloadTestFile(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;

      if (!filename || !filename.endsWith('.pptx')) {
        res.status(400).json({
          success: false,
          error: 'Invalid filename'
        });
        return;
      }

      const filePath = path.join(process.cwd(), 'temp', filename);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        res.status(404).json({
          success: false,
          error: 'File not found'
        });
        return;
      }

      // Set headers for download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Stream the file
      const fileStream = require('fs').createReadStream(filePath);
      fileStream.pipe(res);

      // Schedule cleanup after download
      setTimeout(async () => {
        try {
          await fs.unlink(filePath);
          logger.info('Debug file cleaned up', { filename });
        } catch (error) {
          logger.warn('Failed to cleanup debug download file', { filename, error: getErrorMessage(error) });
        }
      }, 300000); // 5 minutes

    } catch (error) {
      logger.error('Debug file download failed', {
        filename: req.params.filename,
        error: getErrorMessage(error)
      });

      res.status(500).json({
        success: false,
        error: 'Download failed',
        details: getErrorMessage(error)
      });
    }
  }

  /**
   * System status for image processing
   */
  static async getImageProcessingStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = {
        timestamp: new Date().toISOString(),
        services: {
          imageDetection: {
            available: true,
            description: 'PDF image detection and analysis service'
          },
          quickImageFix: {
            available: true,
            description: 'Emergency image processing service'
          },
          dependencies: {
            pdfjs: true,
            sharp: true,
            pptxgenjs: true,
            pdf2pic: true
          }
        },
        endpoints: {
          imageDetection: '/api/debug/test-image-detection',
          quickImageFix: '/api/debug/test-quick-image-fix',
          download: '/api/debug/download/:filename'
        },
        limits: {
          maxFileSize: '50MB',
          supportedFormats: ['application/pdf'],
          outputFormat: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        }
      };

      res.json({
        success: true,
        status
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Status check failed',
        details: getErrorMessage(error)
      });
    }
  }
}

// Multer middleware for single file upload
export const uploadPDF = upload.single('pdf');

export default DebugController;