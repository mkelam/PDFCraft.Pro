/**
 * FORMAT VALIDATION MIDDLEWARE
 *
 * Validates output format parameter in conversion requests
 * Ensures only valid formats (pptx, docx, xlsx) are accepted
 * Rejects invalid requests early with clear error messages
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Valid output formats for PDF-to-Office conversion
 */
const VALID_OUTPUT_FORMATS = ['pptx', 'docx', 'xlsx'] as const;
type ValidOutputFormat = typeof VALID_OUTPUT_FORMATS[number];

/**
 * Extended Request interface with validated outputFormat
 */
export interface FormatValidatedRequest extends Request {
  validatedFormat?: ValidOutputFormat;
}

/**
 * Middleware to validate output format parameter
 *
 * Usage:
 * router.post('/convert/pdf-to-office', validateOutputFormat, controller.convertPDFToOffice);
 *
 * Expected request body:
 * {
 *   "outputFormat": "pptx" | "docx" | "xlsx"
 * }
 */
export function validateOutputFormat(
  req: FormatValidatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Extract outputFormat from request body
    const { outputFormat } = req.body;

    // Check if outputFormat is provided
    if (!outputFormat) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: outputFormat',
        message: 'Please specify output format (pptx, docx, or xlsx)',
        validFormats: VALID_OUTPUT_FORMATS
      });
      return;
    }

    // Check if outputFormat is a string
    if (typeof outputFormat !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid parameter type: outputFormat must be a string',
        message: `Received: ${typeof outputFormat}`,
        validFormats: VALID_OUTPUT_FORMATS
      });
      return;
    }

    // Normalize to lowercase for case-insensitive comparison
    const normalizedFormat = outputFormat.toLowerCase().trim();

    // Validate against allowed formats
    if (!VALID_OUTPUT_FORMATS.includes(normalizedFormat as ValidOutputFormat)) {
      res.status(400).json({
        success: false,
        error: `Invalid output format: ${outputFormat}`,
        message: `Format must be one of: ${VALID_OUTPUT_FORMATS.join(', ')}`,
        received: outputFormat,
        validFormats: VALID_OUTPUT_FORMATS
      });
      return;
    }

    // Store validated format for use in controller
    req.validatedFormat = normalizedFormat as ValidOutputFormat;

    // Also normalize in request body for backward compatibility
    req.body.outputFormat = normalizedFormat;

    console.log(`✅ [FORMAT-VALIDATION] Valid format: ${normalizedFormat}`);

    // Proceed to next middleware/controller
    next();

  } catch (error) {
    console.error('❌ [FORMAT-VALIDATION] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Format validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Optional: Middleware to set default format if not provided
 * Use this if you want to allow conversions without explicit format specification
 */
export function setDefaultFormat(defaultFormat: ValidOutputFormat = 'pptx') {
  return (req: FormatValidatedRequest, res: Response, next: NextFunction): void => {
    if (!req.body.outputFormat) {
      req.body.outputFormat = defaultFormat;
      console.log(`ℹ️ [FORMAT-VALIDATION] Using default format: ${defaultFormat}`);
    }
    next();
  };
}

/**
 * Format validation for query parameters (for GET requests)
 */
export function validateOutputFormatQuery(
  req: FormatValidatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const { format } = req.query;

    if (!format) {
      res.status(400).json({
        success: false,
        error: 'Missing required query parameter: format',
        validFormats: VALID_OUTPUT_FORMATS
      });
      return;
    }

    if (typeof format !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid query parameter type: format must be a string',
        validFormats: VALID_OUTPUT_FORMATS
      });
      return;
    }

    const normalizedFormat = format.toLowerCase().trim();

    if (!VALID_OUTPUT_FORMATS.includes(normalizedFormat as ValidOutputFormat)) {
      res.status(400).json({
        success: false,
        error: `Invalid format: ${format}`,
        validFormats: VALID_OUTPUT_FORMATS
      });
      return;
    }

    req.validatedFormat = normalizedFormat as ValidOutputFormat;
    next();

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Format validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default validateOutputFormat;
