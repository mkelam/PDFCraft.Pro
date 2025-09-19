import Queue from 'bull';
import { PDFService } from '../services/pdf.service';
import { getConnection, getSQLite } from '../config/database';
import { conversionQueue } from '../config/redis';
import { EmailQueue } from './email.worker';
import { logger } from '../utils/logger';
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

  // Process PDF to PowerPoint conversion jobs with optimized concurrency
  conversionQueue.process('convert-pdf-to-ppt', 3, async (job: Queue.Job) => {
  const { jobId, inputPath, outputDir, userId, metadata } = job.data;

  try {
    // Update job status to processing
    await updateJobStatus(jobId, 'processing', 10);

    // Create output directory and start conversion in parallel
    const [_, outputFilename] = await Promise.all([
      fs.mkdir(outputDir, { recursive: true }),
      (async () => {
        await updateJobStatus(jobId, 'processing', 30);
        const filename = await PDFService.convertPDFToPPT(inputPath, outputDir);
        await updateJobStatus(jobId, 'processing', 80);
        return filename;
      })()
    ]);

    // Calculate processing time
    const startTime = new Date(job.timestamp);
    const processingTime = Date.now() - startTime.getTime();

    // Update job as completed
    await updateJobStatus(jobId, 'completed', 100, outputFilename, processingTime);

    // Send email and cleanup in parallel (non-blocking)
    const emailPromise = userId ? (async () => {
      try {
        const userEmail = await getUserEmail(userId);
        if (userEmail) {
          const downloadUrl = `${process.env.API_URL || 'https://pdfcraft.pro'}/api/download/${outputFilename}`;
          await EmailQueue.sendConversionCompleteEmail(userEmail, jobId, 'pdf-to-ppt', downloadUrl);
        }
      } catch (error) {
        logger.warn('Failed to send completion email:', error);
      }
    })() : Promise.resolve();

    const cleanupPromise = PDFService.cleanupFiles([inputPath]);

    // Run email and cleanup in parallel
    await Promise.allSettled([emailPromise, cleanupPromise]);

    // Schedule output file cleanup (1 hour)
    setTimeout(async () => {
      try {
        await PDFService.cleanupFiles([path.join(outputDir, outputFilename)]);
      } catch (error) {
        console.warn('Failed to cleanup output file:', error);
      }
    }, 3600000); // 1 hour

    console.log(`✅ PDF→PPT conversion completed: ${jobId} in ${processingTime}ms`);

    return { success: true, outputFilename, processingTime };

  } catch (error) {
    console.error(`❌ PDF→PPT conversion failed: ${jobId}`, error);

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
      await PDFService.cleanupFiles([inputPath]);
    } catch (cleanupError) {
      console.warn('Failed to cleanup input file:', cleanupError);
    }

    throw error;
  }
  });

  // Process PDF merge jobs
  conversionQueue.process('merge-pdfs', 3, async (job: Queue.Job) => {
  const { jobId, inputFiles, outputDir, userId } = job.data;

  try {
    // Update job status to processing
    await updateJobStatus(jobId, 'processing', 10);

    // Create output directory and start merge in parallel
    const [_, outputFilename] = await Promise.all([
      fs.mkdir(outputDir, { recursive: true }),
      (async () => {
        await updateJobStatus(jobId, 'processing', 30);
        const filename = await PDFService.mergePDFs(inputFiles, outputDir);
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
          const downloadUrl = `${process.env.API_URL || 'https://pdfcraft.pro'}/api/download/${outputFilename}`;
          await EmailQueue.sendConversionCompleteEmail(userEmail, jobId, 'pdf-merge', downloadUrl);
        }
      } catch (error) {
        logger.warn('Failed to send completion email:', error);
      }
    }

    // Cleanup input files
    await PDFService.cleanupFiles(inputFiles);

    // Schedule output file cleanup (1 hour)
    setTimeout(async () => {
      try {
        await PDFService.cleanupFiles([path.join(outputDir, outputFilename)]);
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
      await PDFService.cleanupFiles(inputFiles);
    } catch (cleanupError) {
      console.warn('Failed to cleanup input files:', cleanupError);
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