import Queue from 'bull';
import { getConnection, getSQLite } from '../config/database';
import { conversionQueue } from '../config/redis';
import { EmailQueue } from './email.worker';
import { logger } from '../utils/logger';
import { PPTXValidatorService } from '../services/pptx-validator.service';
import { serviceContainer } from '../services/service-container';
import { pdfConversionRouter } from '../services/pdf-conversion-router.service';
import { RoutingContext } from '../services/pdf-conversion-router.service';
import { FileCleanupUtil } from '../utils/file-cleanup.util';
import { PDFLegacyUtil } from '../utils/pdf-legacy.util';
import path from 'path';

// Import fs once at the top for better performance
const fs = require('fs').promises;

// Wait for queue initialization
setTimeout(() => {
  if (!conversionQueue) {
    console.error('❌ Conversion queue not initialized');
    return;
  }

  console.log('🚀 Starting PDF conversion workers...');

  // Process PDF to PowerPoint conversion jobs with intelligent routing and fallback
  conversionQueue.process('convert-pdf-to-ppt-intelligent', 2, async (job: Queue.Job) => {
    const { jobId, inputPath, outputDir, outputFormat, userId, metadata, originalFilename, userTier, priority } = job.data;

    console.log(`📋 [INTELLIGENT-WORKER] Output format: ${outputFormat || 'pptx (default)'}`);

    try {
      console.log(`🎯 [INTELLIGENT-WORKER] Starting conversion for job ${jobId}`);

      // Update job status to processing
      await updateJobStatus(jobId, 'processing', 10);

      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      // Get file metadata for routing decisions
      const fileStats = await fs.stat(inputPath);
      const fileSize = fileStats.size;

      // Estimate page count (rough approximation)
      const pageCount = metadata?.pages || Math.max(1, Math.ceil(fileSize / (1024 * 1024 * 2))); // ~2MB per page

      // Determine document type (basic heuristic)
      const documentType = determineDocumentType(originalFilename, fileSize);

      // Create routing context
      const routingContext: RoutingContext = {
        inputPath,
        outputDir,
        options: {
          originalFilename,
          pageCount,
          fileSize,
          requestedOutputFormat: outputFormat || 'pptx' // Pass the requested output format
        },
        userContext: {
          userId,
          userTier: userTier || 'free',
          priority: priority || 'normal',
          previousSuccesses: [], // Could be loaded from user history
          preferredService: undefined
        },
        fileMetadata: {
          size: fileSize,
          pageCount,
          documentType,
          complexity: determineComplexity(fileSize, pageCount)
        }
      };

      await updateJobStatus(jobId, 'processing', 30);

      // Route the conversion intelligently
      console.log(`🎯 [INTELLIGENT-WORKER] Routing conversion with intelligent system...`);
      const result = await pdfConversionRouter.routeConversion(routingContext);

      await updateJobStatus(jobId, 'processing', 80);

      if (!result.success) {
        throw new Error(result.error || 'Intelligent conversion failed');
      }

      const outputFilename = result.filename;

      // FINAL VALIDATION: Double-check the output before marking as completed
      const outputPath = path.join(outputDir, outputFilename);
      console.log(`🔍 [INTELLIGENT-WORKER] Final validation of: ${outputFilename}`);

      // Determine output format from filename or job data
      const actualOutputFormat = (outputFormat || 'pptx').toLowerCase();

      // Only validate PPTX files with PowerPoint validator
      // For DOCX and XLSX, perform basic file validation
      if (actualOutputFormat === 'pptx') {
        const finalValidation = await PPTXValidatorService.validatePowerPointFile(outputPath);

        if (!finalValidation.isValid || !finalValidation.hasContent) {
          // Critical failure - output is invalid
          const issues = finalValidation.issues.join(', ');
          throw new Error(`Final validation failed: ${issues}. Output file is invalid.`);
        }

        // Log quality metrics for PPTX files
        console.log(`📊 [INTELLIGENT-WORKER] Quality metrics: ${finalValidation.slideCount} slides, ` +
          `${finalValidation.quality.hasText ? 'with text, ' : ''}` +
          `${finalValidation.quality.hasImages ? 'with images, ' : ''}` +
          `${Math.round(finalValidation.quality.avgContentPerSlide * 100)}% content density`);
      } else {
        // Basic validation for DOCX and XLSX files
        const fileStats = await fs.stat(outputPath);
        if (fileStats.size === 0) {
          throw new Error(`Final validation failed: Output file is empty (0 bytes).`);
        }
        console.log(`📊 [INTELLIGENT-WORKER] Output file validated: ${Math.round(fileStats.size / 1024)}KB ${actualOutputFormat.toUpperCase()} file`);
      }

      // Calculate processing time
      const startTime = new Date(job.timestamp);
      const processingTime = Date.now() - startTime.getTime();

      // Log routing metrics
      const routingInfo = result.metadata?.orchestrator;
      if (routingInfo) {
        console.log(`🎯 [INTELLIGENT-WORKER] Routing result: ${routingInfo.serviceName}, attempts: ${routingInfo.attemptCount}, fallback used: ${routingInfo.fallbackUsed}`);
      }

      // Update job as completed
      await updateJobStatus(jobId, 'completed', 100, outputFilename, processingTime);

    // Send email and cleanup in parallel (non-blocking)
    const emailPromise = userId ? (async () => {
      try {
        const userEmail = await getUserEmail(userId);
        if (userEmail) {
          const downloadUrl = `${process.env.API_URL || 'https://pdflab.pro'}/api/download/${outputFilename}`;
          await EmailQueue.sendConversionCompleteEmail(userEmail, jobId, 'pdf-to-ppt', downloadUrl);
        }
      } catch (error) {
        logger.warn('Failed to send completion email:', error);
      }
    })() : Promise.resolve();

    const cleanupPromise = FileCleanupUtil.cleanupFiles([inputPath]);

    // Run email and cleanup in parallel
    await Promise.allSettled([emailPromise, cleanupPromise]);

    // Schedule output file cleanup (1 hour)
    setTimeout(async () => {
      try {
        await FileCleanupUtil.cleanupFiles([path.join(outputDir, outputFilename)]);
      } catch (error) {
        console.warn('Failed to cleanup output file:', error);
      }
    }, 3600000); // 1 hour

      console.log(`✅ [INTELLIGENT-WORKER] PDF→PPT conversion completed: ${jobId} in ${processingTime}ms`);

      return { success: true, outputFilename, processingTime };

    } catch (error) {
      console.error(`❌ [INTELLIGENT-WORKER] PDF→PPT conversion failed: ${jobId}`, error);

      // Update job as failed
      await updateJobStatus(jobId, 'failed', 0, undefined, undefined, error instanceof Error ? error.message : 'Unknown error');

      // Send failure notification email
      if (userId) {
        try {
          const userEmail = await getUserEmail(userId);
          if (userEmail) {
            await EmailQueue.sendConversionFailedEmail(
              userEmail,
              jobId,
              'pdf-to-ppt',
              error instanceof Error ? error.message : 'Unknown error occurred'
            );
          }
        } catch (emailError) {
          logger.warn('Failed to send failure email:', emailError);
        }
      }

      // Cleanup input file
      try {
        await FileCleanupUtil.cleanupFiles([inputPath]);
      } catch (cleanupError) {
        console.warn('Failed to cleanup input file:', cleanupError);
      }

      throw error;
    }
  });

  // Legacy CloudConvert worker for backward compatibility
  conversionQueue.process('convert-pdf-to-ppt-cloudconvert', 1, async (job: Queue.Job) => {
    console.log('⚠️ [LEGACY-WORKER] Using legacy CloudConvert worker - consider upgrading to intelligent routing');

    // Redirect to intelligent worker
    const newJobData = {
      ...job.data,
      userTier: 'starter', // Assume starter tier for legacy calls
      priority: 'normal'
    };

    // Re-add as intelligent job
    const intelligentJob = await conversionQueue.add('convert-pdf-to-ppt-intelligent', newJobData, {
      jobId: job.data.jobId + '_intelligent',
    });

    return { redirected: true, newJobId: intelligentJob.id };
  });

  // Process PDF merge jobs with balanced concurrency
  // Limited to 2 concurrent jobs as merging is less resource-intensive than conversion
  conversionQueue.process('merge-pdfs', 2, async (job: Queue.Job) => {
  const { jobId, inputFiles, outputDir, userId } = job.data;

  try {
    // Update job status to processing
    await updateJobStatus(jobId, 'processing', 10);

    // Create output directory and start merge in parallel
    const [_, outputFilename] = await Promise.all([
      fs.mkdir(outputDir, { recursive: true }),
      (async () => {
        await updateJobStatus(jobId, 'processing', 30);
        const filename = await PDFLegacyUtil.mergePDFs(inputFiles, outputDir);
        await updateJobStatus(jobId, 'processing', 80);
        return filename;
      })()
    ]);

    // Calculate processing time
    const startTime = new Date(job.timestamp);
    const processingTime = Date.now() - startTime.getTime();

    // Update job as completed
    await updateJobStatus(jobId, 'completed', 100, outputFilename, processingTime);

    // Send completion notification email
    if (userId) {
      try {
        const userEmail = await getUserEmail(userId);
        if (userEmail) {
          const downloadUrl = `${process.env.API_URL || 'https://pdflab.pro'}/api/download/${outputFilename}`;
          await EmailQueue.sendConversionCompleteEmail(userEmail, jobId, 'pdf-merge', downloadUrl);
        }
      } catch (error) {
        logger.warn('Failed to send completion email:', error);
      }
    }

    // Cleanup input files
    await FileCleanupUtil.cleanupFiles(inputFiles);

    // Schedule output file cleanup (1 hour)
    setTimeout(async () => {
      try {
        await FileCleanupUtil.cleanupFiles([path.join(outputDir, outputFilename)]);
      } catch (error) {
        console.warn('Failed to cleanup output file:', error);
      }
    }, 3600000); // 1 hour

    console.log(`✅ PDF merge completed: ${jobId} in ${processingTime}ms`);

    return { success: true, outputFilename, processingTime };

  } catch (error) {
    console.error(`❌ PDF merge failed: ${jobId}`, error);

    // Update job as failed
    await updateJobStatus(jobId, 'failed', 0, undefined, undefined, error instanceof Error ? error.message : 'Unknown error');

    // Send failure notification email
    if (userId) {
      try {
        const userEmail = await getUserEmail(userId);
        if (userEmail) {
          await EmailQueue.sendConversionFailedEmail(
            userEmail,
            jobId,
            'pdf-merge',
            error instanceof Error ? error.message : 'Unknown error occurred'
          );
        }
      } catch (emailError) {
        logger.warn('Failed to send failure email:', emailError);
      }
    }

    // Cleanup input files
    try {
      await FileCleanupUtil.cleanupFiles(inputFiles);
    } catch (cleanupError) {
      console.warn('Failed to cleanup input files:', cleanupError);
    }

    throw error;
  }
});

  // Process PDF to Images conversion jobs
  conversionQueue.process('convert-pdf-to-images', 2, async (job: Queue.Job) => {
    const { jobId, inputPath, outputDir, userId, metadata, originalFilename } = job.data;

    try {
      // Update job status to processing
      await updateJobStatus(jobId, 'processing', 10);

      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      // Update progress and start PDF to images conversion
      await updateJobStatus(jobId, 'processing', 30);
      const outputFilename = await PDFLegacyUtil.convertPDFToImages(inputPath, outputDir, originalFilename);

      await updateJobStatus(jobId, 'processing', 80);

      // Calculate processing time
      const startTime = new Date(job.timestamp);
      const processingTime = Date.now() - startTime.getTime();

      // Update job as completed
      await updateJobStatus(jobId, 'completed', 100, outputFilename, processingTime);

      // Send completion notification email
      if (userId) {
        try {
          const userEmail = await getUserEmail(userId);
          if (userEmail) {
            const downloadUrl = `${process.env.API_URL || 'https://pdflab.pro'}/api/download/${outputFilename}`;
            await EmailQueue.sendConversionCompleteEmail(userEmail, jobId, 'pdf-to-images', downloadUrl);
          }
        } catch (error) {
          logger.warn('Failed to send completion email:', error);
        }
      }

      // Cleanup input file
      await FileCleanupUtil.cleanupFiles([inputPath]);

      // Schedule output file cleanup (1 hour)
      setTimeout(async () => {
        try {
          await FileCleanupUtil.cleanupFiles([path.join(outputDir, outputFilename)]);
        } catch (error) {
          console.warn('Failed to cleanup output file:', error);
        }
      }, 3600000); // 1 hour

      console.log(`✅ PDF to images completed: ${jobId} in ${processingTime}ms`);

      return { success: true, outputFilename, processingTime };

    } catch (error) {
      console.error(`❌ PDF to images failed: ${jobId}`, error);

      // Update job as failed
      await updateJobStatus(jobId, 'failed', 0, undefined, undefined, error instanceof Error ? error.message : 'Unknown error');

      // Send failure notification email
      if (userId) {
        try {
          const userEmail = await getUserEmail(userId);
          if (userEmail) {
            await EmailQueue.sendConversionFailedEmail(
              userEmail,
              jobId,
              'pdf-to-images',
              error instanceof Error ? error.message : 'Unknown error occurred'
            );
          }
        } catch (emailError) {
          logger.warn('Failed to send failure email:', emailError);
        }
      }

      // Cleanup input file
      try {
        await FileCleanupUtil.cleanupFiles([inputPath]);
      } catch (cleanupError) {
        console.warn('Failed to cleanup input file:', cleanupError);
      }

      throw error;
    }
  });

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

// Helper function to update job status in database
async function updateJobStatus(
  jobId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: number,
  outputFile?: string,
  processingTime?: number,
  errorMessage?: string
): Promise<void> {
  try {
    let query = `
      UPDATE conversion_jobs
      SET status = ?, progress = ?
    `;
    let params: any[] = [status, progress];

    if (outputFile) {
      query += ', output_file = ?';
      params.push(outputFile);
    }

    if (processingTime !== undefined) {
      query += ', processing_time = ?';
      params.push(processingTime);
    }

    if (errorMessage) {
      query += ', error_message = ?';
      params.push(errorMessage);
    }

    if (status === 'completed' || status === 'failed') {
      // Use different datetime function for MySQL vs SQLite
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        query += ', completed_at = NOW()';
      } else {
        query += ", completed_at = datetime('now')";
      }
    }

    query += ' WHERE id = ?';
    params.push(jobId);

    await executeQuery(query, params);

  } catch (error) {
    console.error('Failed to update job status:', error);
  }
}

  // Queue event handlers
  conversionQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  conversionQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message);
  });

  conversionQueue.on('stalled', (job) => {
    console.warn(`Job ${job.id} stalled and will be retried`);
  });

  conversionQueue.on('progress', (job, progress) => {
    console.log(`Job ${job.id} progress: ${progress}%`);
  });

}, 1000); // Wait 1 second for queue initialization

// Helper functions for intelligent routing
function determineDocumentType(filename: string, fileSize: number): string {
  if (!filename) return 'simple';

  const name = filename.toLowerCase();
  const sizeMB = fileSize / (1024 * 1024);

  if (name.includes('presentation') || name.includes('slides') || name.includes('ppt')) {
    return 'presentation';
  } else if (name.includes('technical') || name.includes('manual') || name.includes('guide')) {
    return 'technical';
  } else if (name.includes('financial') || name.includes('report') || name.includes('budget')) {
    return 'financial';
  } else if (name.includes('marketing') || name.includes('brochure') || name.includes('flyer')) {
    return 'marketing';
  } else if (sizeMB < 1) {
    return 'text';
  } else {
    return 'simple';
  }
}

function determineComplexity(fileSize: number, pageCount: number): 'low' | 'medium' | 'high' {
  const sizeMB = fileSize / (1024 * 1024);
  const avgPageSize = sizeMB / pageCount;

  if (sizeMB > 20 || pageCount > 30 || avgPageSize > 2) {
    return 'high';
  } else if (sizeMB > 5 || pageCount > 10 || avgPageSize > 0.5) {
    return 'medium';
  } else {
    return 'low';
  }
}

// Helper function to get user email for notifications
async function getUserEmail(userId: number): Promise<string | null> {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      const connection = getConnection();
      const [rows] = await connection.execute(
        'SELECT email FROM users WHERE id = ?',
        [userId]
      );
      const users = rows as any[];
      return users.length > 0 ? users[0].email : null;
    } else {
      // Use SQLite in development
      const db = getSQLite();
      const stmt = db.prepare('SELECT email FROM users WHERE id = ?');
      const user = stmt.get(userId) as any;
      return user ? user.email : null;
    }
  } catch (error) {
    logger.error('Failed to get user email:', error);
    return null;
  }
}

export { conversionQueue };