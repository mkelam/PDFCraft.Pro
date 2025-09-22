import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { promises as fs } from 'fs';
import { conversionQueue } from '../config/redis';
import { PDFService } from '../services/pdf.service';
import { getConnection, getSQLite } from '../config/database';
import { ConversionJob } from '../types';
import { config } from '../config';
import { EmailQueue } from '../workers/email.worker';
import { PPTXValidatorService } from '../services/pptx-validator.service';

// Helper function to create consistent error responses
function createErrorResponse(message: string, code?: string, details?: any) {
  return {
    success: false,
    message,
    code,
    details,
    timestamp: new Date().toISOString()
  };
}

// Helper function to create success responses
function createSuccessResponse(data: any, message?: string) {
  return {
    success: true,
    message: message || 'Operation completed successfully',
    ...data,
    timestamp: new Date().toISOString()
  };
}

// Helper function to execute database queries in both MySQL and SQLite
async function executeQuery(query: string, params: any[]): Promise<any[]> {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const connection = getConnection();
    const [rows] = await connection.execute(query, params);
    return rows as any[];
  } else {
    // Use SQLite in development
    const db = getSQLite();
    if (query.toLowerCase().includes('insert')) {
      const stmt = db.prepare(query);
      const result = stmt.run(...params);
      return [{ insertId: result.lastInsertRowid, affectedRows: result.changes }];
    } else if (query.toLowerCase().includes('update')) {
      const stmt = db.prepare(query);
      const result = stmt.run(...params);
      return [{ affectedRows: result.changes }];
    } else {
      // SELECT query
      const stmt = db.prepare(query);
      const rows = stmt.all(...params);
      return rows;
    }
  }
}

// Helper function to check and update user usage limits
async function checkUsageLimits(userId: number | null): Promise<{ allowed: boolean; user?: any; message?: string }> {
  if (!userId) {
    // Anonymous users get 3 conversions per day (tracked by IP in future)
    return { allowed: true };
  }

  try {
    // Get user data
    const users = await executeQuery(
      'SELECT id, email, plan, conversions_used, conversions_limit, last_reset_date FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return { allowed: false, message: 'User not found' };
    }

    const user = users[0];

    // Check if we need to reset daily limits (for free tier)
    const today = new Date().toISOString().split('T')[0];
    const lastResetDate = user.last_reset_date ? user.last_reset_date.split('T')[0] : null;

    if (user.plan === 'free' && lastResetDate !== today) {
      // Reset daily limit for free users
      await executeQuery(
        'UPDATE users SET conversions_used = 0, last_reset_date = ? WHERE id = ?',
        [today, userId]
      );
      user.conversions_used = 0;
    }

    // Check limits (-1 means unlimited)
    if (user.conversions_limit !== -1 && user.conversions_used >= user.conversions_limit) {
      // Send usage limit email if close to or at limit
      try {
        const userName = user.email.split('@')[0];
        await EmailQueue.sendUsageLimitEmail(
          user.email,
          userName,
          user.plan,
          user.conversions_used,
          user.conversions_limit
        );
      } catch (emailError) {
        console.warn('Failed to send usage limit email:', emailError);
      }

      return {
        allowed: false,
        user,
        message: `Usage limit reached. You have used ${user.conversions_used}/${user.conversions_limit} conversions for your ${user.plan} plan.`
      };
    }

    return { allowed: true, user };
  } catch (error) {
    console.error('Error checking usage limits:', error);
    return { allowed: false, message: 'Error checking usage limits' };
  }
}

// Helper function to increment user usage
async function incrementUsage(userId: number | null): Promise<void> {
  if (!userId) return;

  try {
    await executeQuery(
      'UPDATE users SET conversions_used = conversions_used + 1 WHERE id = ?',
      [userId]
    );
  } catch (error) {
    console.error('Error incrementing usage:', error);
  }
}

export class ConvertController {
  /**
   * Convert PDF to PowerPoint
   */
  static async convertToPPT(req: Request, res: Response): Promise<void> {
    try {
      // Rate limiting check - allow max 3 concurrent conversions per IP
      const clientIP = req.ip || req.connection.remoteAddress;
      const activeJobs = await executeQuery(
        `SELECT COUNT(*) as count FROM conversion_jobs
         WHERE status IN ('pending', 'processing')
         AND created_at > datetime('now', '-1 hour')`,
        []
      );

      // Simple load balancing - reject if too many active jobs
      if (activeJobs[0]?.count >= 10) {
        res.status(429).json(createErrorResponse(
          'System is currently processing many requests. Please try again in a few minutes.',
          'RATE_LIMITED',
          { retryAfter: 60, activeJobs: activeJobs[0]?.count }
        ));
        return;
      }

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json(createErrorResponse(
          'No PDF file provided',
          'INVALID_INPUT'
        ));
        return;
      }

      if (req.files.length > 1) {
        res.status(400).json(createErrorResponse(
          'Only one PDF file allowed for conversion',
          'INVALID_INPUT',
          { filesProvided: req.files.length, maxAllowed: 1 }
        ));
        return;
      }

      const file = req.files[0];
      const jobId = uuidv4();

      // Validate file type
      if (!file.mimetype.includes('pdf')) {
        res.status(400).json(createErrorResponse(
          'Only PDF files are allowed',
          'INVALID_FILE_TYPE',
          { provided: file.mimetype, expected: 'application/pdf' }
        ));
        return;
      }

      // Save uploaded file
      const uploadDir = config.upload.uploadDir;
      await fs.mkdir(uploadDir, { recursive: true });

      // Preserve original filename but add jobId prefix to avoid conflicts
      const originalFilename = file.originalname || 'document.pdf';
      const inputFilename = `${jobId}_${originalFilename}`;
      const inputPath = path.join(uploadDir, inputFilename);
      await fs.writeFile(inputPath, file.buffer);

      // Validate PDF
      const isValidPDF = await PDFService.validatePDF(inputPath);
      if (!isValidPDF) {
        await fs.unlink(inputPath);
        res.status(400).json({
          success: false,
          message: 'Invalid or corrupted PDF file'
        });
        return;
      }

      // Get PDF metadata for estimation
      const metadata = await PDFService.getPDFMetadata(inputPath);
      const estimatedTime = PDFService.estimateProcessingTime('pdf-to-ppt', 1, file.size);

      // Create job record in database
      await executeQuery(
        `INSERT INTO conversion_jobs (id, user_id, type, status, input_files, created_at)
         VALUES (?, ?, 'pdf-to-ppt', 'pending', ?, datetime('now'))`,
        [jobId, (req as any).user?.id || null, JSON.stringify([inputFilename])]
      );

      // Add job to queue
      await conversionQueue.add('convert-pdf-to-ppt', {
        jobId,
        inputPath,
        outputDir: config.upload.uploadDir,
        userId: (req as any).user?.id,
        metadata,
        originalFilename: originalFilename
      }, {
        jobId,
        delay: 0,
      });

      // Update user conversion count if authenticated
      if ((req as any).user) {
        await executeQuery(
          'UPDATE users SET conversions_used = conversions_used + 1 WHERE id = ?',
          [(req as any).user.id]
        );
      }

      res.status(202).json(createSuccessResponse({
        jobId,
        estimatedTime,
        metadata: {
          pages: metadata.pages,
          size: metadata.size
        }
      }, 'PDF conversion started'));

    } catch (error) {
      console.error('Convert controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Merge PDF files
   */
  static async mergePDFs(req: Request, res: Response): Promise<void> {
    try {
      // Rate limiting check - same as conversion
      const activeJobs = await executeQuery(
        `SELECT COUNT(*) as count FROM conversion_jobs
         WHERE status IN ('pending', 'processing')
         AND created_at > datetime('now', '-1 hour')`,
        []
      );

      // Simple load balancing - reject if too many active jobs
      if (activeJobs[0]?.count >= 10) {
        res.status(429).json({
          success: false,
          message: 'System is currently processing many requests. Please try again in a few minutes.',
          retryAfter: 60
        });
        return;
      }

      if (!req.files || !Array.isArray(req.files) || req.files.length < 2) {
        res.status(400).json({
          success: false,
          message: 'At least 2 PDF files required for merging'
        });
        return;
      }

      if (req.files.length > 10) {
        res.status(400).json({
          success: false,
          message: 'Maximum 10 files allowed for merging'
        });
        return;
      }

      const jobId = uuidv4();
      const uploadDir = config.upload.uploadDir;
      await fs.mkdir(uploadDir, { recursive: true });

      const inputFiles: string[] = [];
      const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);

      // Process each uploaded file
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];

        // Validate file type
        if (!file.mimetype.includes('pdf')) {
          // Cleanup already saved files
          await PDFService.cleanupFiles(inputFiles.map(f => path.join(uploadDir, f)));
          res.status(400).json({
            success: false,
            message: `File ${i + 1} is not a PDF`
          });
          return;
        }

        // Save file
        const inputFilename = `${jobId}_input_${i + 1}.pdf`;
        const inputPath = path.join(uploadDir, inputFilename);
        await fs.writeFile(inputPath, file.buffer);

        // Validate PDF
        const isValidPDF = await PDFService.validatePDF(inputPath);
        if (!isValidPDF) {
          // Cleanup files
          await PDFService.cleanupFiles([...inputFiles, inputFilename].map(f => path.join(uploadDir, f)));
          res.status(400).json({
            success: false,
            message: `File ${i + 1} is not a valid PDF`
          });
          return;
        }

        inputFiles.push(inputFilename);
      }

      const estimatedTime = PDFService.estimateProcessingTime('pdf-merge', req.files.length, totalSize);

      // Create job record in database
      await executeQuery(
        `INSERT INTO conversion_jobs (id, user_id, type, status, input_files, created_at)
         VALUES (?, ?, 'pdf-merge', 'pending', ?, datetime('now'))`,
        [jobId, (req as any).user?.id || null, JSON.stringify(inputFiles)]
      );

      // Add job to queue
      await conversionQueue.add('merge-pdfs', {
        jobId,
        inputFiles: inputFiles.map(f => path.join(uploadDir, f)),
        outputDir: config.upload.uploadDir,
        userId: (req as any).user?.id
      }, {
        jobId,
        delay: 0,
      });

      // Update user conversion count if authenticated
      if ((req as any).user) {
        await executeQuery(
          'UPDATE users SET conversions_used = conversions_used + 1 WHERE id = ?',
          [(req as any).user.id]
        );
      }

      res.status(202).json({
        success: true,
        message: 'PDF merge started',
        jobId,
        estimatedTime,
        metadata: {
          fileCount: req.files.length,
          totalSize
        }
      });

    } catch (error) {
      console.error('Merge controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get job status
   */
  static async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          success: false,
          message: 'Job ID required'
        });
        return;
      }

      // Get job from database
      const jobs = await executeQuery(
        'SELECT * FROM conversion_jobs WHERE id = ?',
        [jobId]
      );

      if (!jobs || jobs.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Job not found'
        });
        return;
      }

      const job = jobs[0];

      // Ensure job object has required properties with defaults
      const safeJob = {
        id: job.id || jobId,
        type: job.type || 'unknown',
        status: job.status || 'pending',
        progress: job.progress || 0,
        created_at: job.created_at || new Date().toISOString(),
        completed_at: job.completed_at || null,
        processing_time: job.processing_time || null,
        output_file: job.output_file || null,
        error_message: job.error_message || null
      };

      // Get additional status from Bull queue if needed
      let queueJob;
      try {
        queueJob = await conversionQueue.getJob(jobId);
      } catch (error) {
        // Job might not be in queue anymore - this is normal for completed/failed jobs
        console.debug('Queue job not found (normal for completed jobs):', jobId);
      }

      const response: any = {
        success: true,
        job: {
          id: safeJob.id,
          type: safeJob.type,
          status: safeJob.status,
          progress: safeJob.progress,
          createdAt: safeJob.created_at,
          completedAt: safeJob.completed_at,
          processingTime: safeJob.processing_time
        }
      };

      // Handle completed jobs
      if (safeJob.status === 'completed' && safeJob.output_file) {
        response.job.downloadUrl = `/api/download/${safeJob.output_file}`;
        response.job.outputFile = safeJob.output_file;

        // Add quality validation for completed jobs
        try {
          const outputPath = path.join(config.upload.uploadDir, safeJob.output_file);

          // Check if file exists before validating
          try {
            await fs.access(outputPath);
            const validation = await PPTXValidatorService.validatePowerPointFile(outputPath);

            response.job.quality = {
              isValid: validation.isValid,
              hasContent: validation.hasContent,
              slideCount: validation.slideCount,
              fileSize: validation.fileSize,
              contentMetrics: {
                hasText: validation.quality?.hasText || false,
                hasImages: validation.quality?.hasImages || false,
                hasNotes: validation.quality?.hasNotes || false,
                contentDensity: Math.round((validation.quality?.avgContentPerSlide || 0) * 100)
              },
              warnings: validation.warnings || []
            };
          } catch (fileError) {
            console.warn(`Output file not accessible: ${safeJob.output_file}`);
            response.job.quality = {
              isValid: false,
              hasContent: false,
              warnings: ['Output file not accessible']
            };
          }
        } catch (validationError) {
          console.warn('Failed to validate completed file:', validationError);
          response.job.quality = {
            isValid: false,
            hasContent: false,
            warnings: ['Validation failed']
          };
        }
      }

      // Handle failed jobs
      if (safeJob.status === 'failed') {
        response.job.errorMessage = safeJob.error_message || 'Job failed for unknown reason';
      }

      // Add queue progress if available and job is not completed
      if (queueJob && safeJob.status !== 'completed' && safeJob.status !== 'failed') {
        try {
          // Handle both real Bull queue (progress is function) and mock queue (progress is number)
          let queueProgress = 0;
          if (typeof queueJob.progress === 'function') {
            queueProgress = queueJob.progress() || 0;
          } else if (typeof queueJob.progress === 'number') {
            queueProgress = queueJob.progress;
          }

          // Use queue progress if it's newer than database progress
          if (queueProgress > safeJob.progress) {
            response.job.progress = queueProgress;
          }
        } catch (progressError) {
          console.debug('Could not get queue progress:', progressError);
        }
      }

      // Set cache control headers to prevent caching of dynamic status data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // Remove headers that can cause conditional requests
      res.removeHeader('ETag');
      res.removeHeader('Last-Modified');

      res.json(response);

    } catch (error: unknown) {
      console.error('Get job status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      });
    }
  }

  /**
   * Download converted file
   */
  static async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;

      if (!filename) {
        res.status(400).json({
          success: false,
          message: 'Filename required'
        });
        return;
      }

      const filePath = path.join(config.upload.uploadDir, filename);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        res.status(404).json({
          success: false,
          message: 'File not found or expired'
        });
        return;
      }

      // Set appropriate headers
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.pptx') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      } else if (ext === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
      }

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Stream the file
      const fileStream = await fs.readFile(filePath);
      res.send(fileStream);

      // Schedule file deletion after download
      setTimeout(async () => {
        try {
          await fs.unlink(filePath);
          console.log(`🗑️ Auto-deleted downloaded file: ${filename}`);
        } catch (error) {
          console.warn(`⚠️ Failed to auto-delete: ${filename}`);
        }
      }, 300000); // Delete after 5 minutes

    } catch (error) {
      console.error('Download file error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}