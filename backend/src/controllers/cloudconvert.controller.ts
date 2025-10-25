import { Request, Response } from 'express';
import { CloudConvertPDFService, OfficeFormat } from '../services/cloudconvert-pdf.service';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';

/**
 * CloudConvert Controller
 * Handles PDF to Office format conversions using CloudConvert API
 * Supports: DOCX, PPTX, XLSX
 */
export class CloudConvertController {
  private static cloudConvertService: CloudConvertPDFService;

  /**
   * Initialize CloudConvert service
   */
  private static getService(): CloudConvertPDFService {
    if (!CloudConvertController.cloudConvertService) {
      const apiKey = process.env.CLOUDCONVERT_API_KEY;

      if (!apiKey) {
        throw new Error('CloudConvert API key not configured');
      }

      CloudConvertController.cloudConvertService = new CloudConvertPDFService({
        apiKey: apiKey,
        sandboxMode: process.env.CLOUDCONVERT_SANDBOX === 'true'
      });
    }

    return CloudConvertController.cloudConvertService;
  }

  /**
   * Generic PDF to Office format conversion handler
   * Used internally by specific conversion endpoints
   */
  private static async handleConversion(
    req: Request,
    res: Response,
    outputFormat: OfficeFormat,
    formatName: string
  ): Promise<void> {
    try {
      // Check if file was uploaded
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No PDF file uploaded'
        });
        return;
      }

      const inputPath = req.file.path;
      const outputDir = process.env.TEMP_DIR || './temp';

      logger.info(`CloudConvert PDF to ${formatName} conversion started`, {
        filename: req.file.originalname,
        size: req.file.size,
        outputFormat
      });

      // Validate PDF file
      const service = CloudConvertController.getService();

      try {
        await service.validatePDFFile(inputPath);
      } catch (validationError) {
        // Clean up uploaded file
        await fs.unlink(inputPath).catch(() => {});

        res.status(400).json({
          success: false,
          message: validationError instanceof Error ? validationError.message : 'File validation failed'
        });
        return;
      }

      // Perform conversion
      const result = await service.convertPDFToOffice(
        inputPath,
        outputDir,
        outputFormat,
        req.file.originalname
      );

      // Clean up input file
      await fs.unlink(inputPath).catch(() => {});

      if (result.success && result.outputPath) {
        logger.info(`CloudConvert conversion to ${formatName} successful`, {
          jobId: result.jobId,
          processingTime: result.processingTime,
          outputFormat
        });

        res.status(200).json({
          success: true,
          message: `PDF converted to ${formatName} successfully`,
          data: {
            outputFilename: path.basename(result.outputPath),
            downloadUrl: `/api/download/${path.basename(result.outputPath)}`,
            jobId: result.jobId,
            processingTime: result.processingTime,
            outputFormat: result.outputFormat
          }
        });
      } else {
        logger.error(`CloudConvert conversion to ${formatName} failed`, {
          error: result.error
        });

        res.status(500).json({
          success: false,
          message: 'Conversion failed',
          error: result.error
        });
      }

    } catch (error) {
      logger.error('CloudConvert controller error', error);

      res.status(500).json({
        success: false,
        message: 'Internal server error during conversion',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Convert PDF to Word (DOCX)
   * POST /api/cloudconvert/pdf-to-word
   */
  static async convertPDFToWord(req: Request, res: Response): Promise<void> {
    await CloudConvertController.handleConversion(req, res, 'docx', 'Word');
  }

  /**
   * Convert PDF to PowerPoint (PPTX)
   * POST /api/cloudconvert/pdf-to-ppt
   */
  static async convertPDFToPowerPoint(req: Request, res: Response): Promise<void> {
    await CloudConvertController.handleConversion(req, res, 'pptx', 'PowerPoint');
  }

  /**
   * Convert PDF to Excel (XLSX)
   * POST /api/cloudconvert/pdf-to-excel
   */
  static async convertPDFToExcel(req: Request, res: Response): Promise<void> {
    await CloudConvertController.handleConversion(req, res, 'xlsx', 'Excel');
  }

  /**
   * Generic PDF to Office conversion with format selection
   * POST /api/cloudconvert/convert
   * Body: { format: 'docx' | 'pptx' | 'xlsx' }
   */
  static async convertPDFToOffice(req: Request, res: Response): Promise<void> {
    const format = req.body.format as OfficeFormat;

    if (!format || !['docx', 'pptx', 'xlsx'].includes(format)) {
      res.status(400).json({
        success: false,
        message: 'Invalid or missing format. Supported formats: docx, pptx, xlsx'
      });
      return;
    }

    const formatNames = {
      docx: 'Word',
      pptx: 'PowerPoint',
      xlsx: 'Excel'
    };

    await CloudConvertController.handleConversion(req, res, format, formatNames[format]);
  }

  /**
   * Get supported Office formats
   * GET /api/cloudconvert/formats
   */
  static async getSupportedFormats(req: Request, res: Response): Promise<void> {
    try {
      const formats = CloudConvertPDFService.getSupportedFormats();

      res.status(200).json({
        success: true,
        data: {
          formats,
          totalFormats: formats.length
        }
      });

    } catch (error) {
      logger.error('Failed to get supported formats', error);

      res.status(500).json({
        success: false,
        message: 'Failed to get supported formats',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get CloudConvert job status
   * GET /api/cloudconvert/status/:jobId
   */
  static async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          success: false,
          message: 'Job ID is required'
        });
        return;
      }

      const service = CloudConvertController.getService();
      const status = await service.getJobStatus(jobId);

      res.status(200).json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Failed to get CloudConvert job status', error);

      res.status(500).json({
        success: false,
        message: 'Failed to get job status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get CloudConvert account info
   * GET /api/cloudconvert/info
   */
  static async getAccountInfo(req: Request, res: Response): Promise<void> {
    try {
      const apiKey = process.env.CLOUDCONVERT_API_KEY;

      if (!apiKey) {
        res.status(500).json({
          success: false,
          message: 'CloudConvert API key not configured'
        });
        return;
      }

      const formats = CloudConvertPDFService.getSupportedFormats();

      res.status(200).json({
        success: true,
        data: {
          configured: true,
          sandboxMode: process.env.CLOUDCONVERT_SANDBOX === 'true',
          service: 'CloudConvert API v2',
          supportedFormats: formats,
          features: [
            'PDF to Word (DOCX) conversion',
            'PDF to PowerPoint (PPTX) conversion',
            'PDF to Excel (XLSX) conversion',
            'Industry-leading accuracy',
            'Preserves formatting and layout',
            'Restores tables and complex documents',
            'Support for large files (up to 100MB)'
          ]
        }
      });

    } catch (error) {
      logger.error('Failed to get CloudConvert account info', error);

      res.status(500).json({
        success: false,
        message: 'Failed to get account info',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test CloudConvert connection
   * GET /api/cloudconvert/test
   */
  static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const apiKey = process.env.CLOUDCONVERT_API_KEY;

      if (!apiKey) {
        res.status(500).json({
          success: false,
          message: 'CloudConvert API key not configured',
          configured: false
        });
        return;
      }

      // Try to initialize the service
      const service = CloudConvertController.getService();
      const formats = CloudConvertPDFService.getSupportedFormats();

      res.status(200).json({
        success: true,
        message: 'CloudConvert connection successful',
        configured: true,
        sandboxMode: process.env.CLOUDCONVERT_SANDBOX === 'true',
        supportedFormats: formats.length
      });

    } catch (error) {
      logger.error('CloudConvert connection test failed', error);

      res.status(500).json({
        success: false,
        message: 'CloudConvert connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default CloudConvertController;
