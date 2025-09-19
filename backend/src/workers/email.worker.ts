import Queue from 'bull';
import { EmailService } from '../services/email.service';
import { logger } from '../utils/logger';

export interface EmailJobData {
  type: 'welcome' | 'conversion-complete' | 'conversion-failed' | 'usage-limit' | 'password-reset';
  to: string;
  data: any;
}

const isTestEnvironment = process.env.NODE_ENV === 'test';

// Create email queue only in non-test environments
let emailQueue: Queue.Queue<EmailJobData> | null = null;

if (!isTestEnvironment) {
  emailQueue = new Queue('email notifications', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    },
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });
}

// Wait for queue initialization (only in production environment)
if (!isTestEnvironment && emailQueue) {
  setTimeout(() => {
    if (!emailQueue) {
      console.error('❌ Email queue not initialized');
      return;
    }

    logger.info('📧 Starting email notification workers...');

    // Process email jobs
    emailQueue.process('send-email', 5, async (job: Queue.Job<EmailJobData>) => {
      const { type, to, data } = job.data;

      try {
        logger.info(`📧 Processing email: ${type} to ${to}`);

        let success = false;

        switch (type) {
          case 'welcome':
            success = await EmailService.sendWelcomeEmail(to, data.userName);
            break;

          case 'conversion-complete':
            success = await EmailService.sendConversionCompleteEmail(
              to,
              data.jobId,
              data.jobType,
              data.downloadUrl
            );
            break;

          case 'conversion-failed':
            success = await EmailService.sendConversionFailedEmail(
              to,
              data.jobId,
              data.jobType,
              data.errorMessage
            );
            break;

          case 'usage-limit':
            success = await EmailService.sendUsageLimitEmail(
              to,
              data.userName,
              data.currentPlan,
              data.usageCount,
              data.limit
            );
            break;

          case 'password-reset':
            success = await EmailService.sendPasswordResetEmail(to, data.resetToken);
            break;

          default:
            throw new Error(`Unknown email type: ${type}`);
        }

        if (success) {
          logger.info(`✅ Email sent successfully: ${type} to ${to}`);
          return { success: true, type, to };
        } else {
          throw new Error('Email sending failed');
        }

      } catch (error) {
        logger.error(`❌ Email sending failed: ${type} to ${to}`, error);
        throw error;
      }
    });

    // Email queue event handlers
    emailQueue.on('completed', (job, result) => {
      logger.info(`📧 Email job completed: ${job.id}`, result);
    });

    emailQueue.on('failed', (job, err) => {
      logger.error(`📧 Email job failed: ${job.id}`, {
        error: err.message,
        data: job.data,
      });
    });

    emailQueue.on('stalled', (job) => {
      logger.warn(`📧 Email job stalled: ${job.id}`);
    });

  }, 1000);
}

// Utility functions to add email jobs to queue
export const EmailQueue = {
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    if (isTestEnvironment) {
      logger.info(`📧 [TEST] Would send welcome email to: ${userEmail} (${userName})`);
      return;
    }

    if (!emailQueue) {
      logger.error('❌ Email queue not available');
      return;
    }

    await emailQueue.add('send-email', {
      type: 'welcome',
      to: userEmail,
      data: { userName },
    }, {
      delay: 1000, // Send welcome email after 1 second
    });
  },

  async sendConversionCompleteEmail(userEmail: string, jobId: string, jobType: string, downloadUrl: string): Promise<void> {
    if (isTestEnvironment) {
      logger.info(`📧 [TEST] Would send conversion complete email to: ${userEmail} (${jobType})`);
      return;
    }

    if (!emailQueue) {
      logger.error('❌ Email queue not available');
      return;
    }

    await emailQueue.add('send-email', {
      type: 'conversion-complete',
      to: userEmail,
      data: { jobId, jobType, downloadUrl },
    });
  },

  async sendConversionFailedEmail(userEmail: string, jobId: string, jobType: string, errorMessage: string): Promise<void> {
    if (isTestEnvironment) {
      logger.info(`📧 [TEST] Would send conversion failed email to: ${userEmail} (${jobType})`);
      return;
    }

    if (!emailQueue) {
      logger.error('❌ Email queue not available');
      return;
    }

    await emailQueue.add('send-email', {
      type: 'conversion-failed',
      to: userEmail,
      data: { jobId, jobType, errorMessage },
    });
  },

  async sendUsageLimitEmail(userEmail: string, userName: string, currentPlan: string, usageCount: number, limit: number): Promise<void> {
    if (isTestEnvironment) {
      logger.info(`📧 [TEST] Would send usage limit email to: ${userEmail} (${currentPlan})`);
      return;
    }

    if (!emailQueue) {
      logger.error('❌ Email queue not available');
      return;
    }

    await emailQueue.add('send-email', {
      type: 'usage-limit',
      to: userEmail,
      data: { userName, currentPlan, usageCount, limit },
    });
  },

  async sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<void> {
    if (isTestEnvironment) {
      logger.info(`📧 [TEST] Would send password reset email to: ${userEmail}`);
      return;
    }

    if (!emailQueue) {
      logger.error('❌ Email queue not available');
      return;
    }

    await emailQueue.add('send-email', {
      type: 'password-reset',
      to: userEmail,
      data: { resetToken },
    }, {
      delay: 0, // Send password reset immediately
      priority: 10, // High priority
    });
  },

  // Get email queue statistics
  async getQueueStats(): Promise<any> {
    if (isTestEnvironment) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      };
    }

    if (!emailQueue) {
      return null;
    }

    try {
      const waiting = await emailQueue.getWaiting();
      const active = await emailQueue.getActive();
      const completed = await emailQueue.getCompleted();
      const failed = await emailQueue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      };
    } catch (error) {
      logger.error('Failed to get email queue stats:', error);
      return null;
    }
  },
};

export { emailQueue };