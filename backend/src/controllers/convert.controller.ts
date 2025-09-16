import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { promises as fs } from 'fs';
import { conversionQueue } from '@/config/redis';
import { PDFService } from '@/services/pdf.service';
import { getConnection } from '@/config/database';
import { ConversionJob, AuthRequest } from '@/types';
import { config } from '@/config';

export class ConvertController {
  /**
   * Convert PDF to PowerPoint
   */
  static async convertToPPT(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No PDF file provided'
        });
        return;
      }

      if (req.files.length > 1) {
        res.status(400).json({
          success: false,
          message: 'Only one PDF file allowed for conversion'
        });
        return;
      }

      const file = req.files[0];
      const jobId = uuidv4();

      // Validate file type
      if (!file.mimetype.includes('pdf')) {
        res.status(400).json({
          success: false,
          message: 'Only PDF files are allowed'
        });
        return;
      }

      // Save uploaded file
      const uploadDir = config.upload.uploadDir;
      await fs.mkdir(uploadDir, { recursive: true });

      const inputFilename = `${jobId}_input.pdf`;
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
      const connection = getConnection();
      await connection.execute(
        `INSERT INTO conversion_jobs (id, user_id, type, status, input_files, created_at)
         VALUES (?, ?, 'pdf-to-ppt', 'pending', ?, NOW())`,
        [jobId, req.user?.id || null, JSON.stringify([inputFilename])]
      );

      // Add job to queue
      await conversionQueue.add('convert-pdf-to-ppt', {
        jobId,
        inputPath,
        outputDir: config.upload.tempDir,
        userId: req.user?.id,
        metadata
      }, {
        jobId,
        delay: 0,
      });

      // Update user conversion count if authenticated
      if (req.user) {
        await connection.execute(
          'UPDATE users SET conversions_used = conversions_used + 1 WHERE id = ?',
          [req.user.id]
        );
      }

      res.status(202).json({
        success: true,
        message: 'PDF conversion started',
        jobId,
        estimatedTime,
        metadata: {
          pages: metadata.pages,
          size: metadata.size
        }
      });

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
  static async mergePDFs(req: AuthRequest, res: Response): Promise<void> {
    try {
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
      const connection = getConnection();
      await connection.execute(
        `INSERT INTO conversion_jobs (id, user_id, type, status, input_files, created_at)
         VALUES (?, ?, 'pdf-merge', 'pending', ?, NOW())`,
        [jobId, req.user?.id || null, JSON.stringify(inputFiles)]
      );

      // Add job to queue
      await conversionQueue.add('merge-pdfs', {
        jobId,
        inputFiles: inputFiles.map(f => path.join(uploadDir, f)),
        outputDir: config.upload.tempDir,
        userId: req.user?.id
      }, {
        jobId,
        delay: 0,
      });

      // Update user conversion count if authenticated
      if (req.user) {
        await connection.execute(
          'UPDATE users SET conversions_used = conversions_used + 1 WHERE id = ?',
          [req.user.id]
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
      const connection = getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM conversion_jobs WHERE id = ?',
        [jobId]
      );

      const jobs = rows as any[];
      if (jobs.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Job not found'
        });
        return;
      }

      const job = jobs[0];

      // Get additional status from Bull queue if needed
      let queueJob;
      try {
        queueJob = await conversionQueue.getJob(jobId);
      } catch (error) {
        // Job might not be in queue anymore
      }

      const response: any = {
        success: true,
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          progress: job.progress,
          createdAt: job.created_at,
          completedAt: job.completed_at,
          processingTime: job.processing_time
        }
      };

      if (job.status === 'completed' && job.output_file) {
        response.job.downloadUrl = `/api/download/${job.output_file}`;
      }

      if (job.status === 'failed' && job.error_message) {
        response.job.errorMessage = job.error_message;
      }

      // Add queue progress if available
      if (queueJob) {
        response.job.progress = queueJob.progress() || job.progress;
      }

      res.json(response);

    } catch (error) {
      console.error('Get job status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
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

      const filePath = path.join(config.upload.tempDir, filename);

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