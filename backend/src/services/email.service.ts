import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private static transporter: Transporter;
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Configure SMTP transporter
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false, // For self-signed certificates
        },
      });

      // Verify SMTP connection
      if (process.env.NODE_ENV === 'production') {
        await this.transporter.verify();
        logger.info('✅ SMTP connection verified');
      } else {
        logger.info('📧 Email service initialized (development mode)');
      }

      this.isInitialized = true;
    } catch (error) {
      logger.error('❌ Failed to initialize email service:', error);
      throw error;
    }
  }

  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'PDFCraft.Pro <noreply@pdfcraft.pro>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
        attachments: options.attachments,
      };

      // In development, just log the email
      if (process.env.NODE_ENV !== 'production') {
        logger.info('📧 [DEV] Email would be sent:', {
          to: mailOptions.to,
          subject: mailOptions.subject,
          hasAttachments: !!mailOptions.attachments?.length,
        });
        return true;
      }

      // Send email in production
      const result = await this.transporter.sendMail(mailOptions);

      logger.info('📧 Email sent successfully:', {
        to: options.to,
        subject: options.subject,
        messageId: result.messageId,
      });

      return true;
    } catch (error) {
      logger.error('❌ Failed to send email:', {
        to: options.to,
        subject: options.subject,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  // Email Templates
  static getWelcomeEmail(userEmail: string, userName: string): EmailTemplate {
    return {
      subject: 'Welcome to PDFCraft.Pro - Your PDF Processing Journey Begins!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to PDFCraft.Pro</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: white; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
            .feature { display: flex; align-items: center; margin: 20px 0; }
            .feature-icon { font-size: 24px; margin-right: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">Welcome to PDFCraft.Pro!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 18px;">Lightning-fast PDF processing at your fingertips</p>
            </div>

            <div class="content">
              <h2 style="color: #1e293b; margin-bottom: 20px;">Hi ${userName}! 👋</h2>

              <p style="color: #475569; line-height: 1.6; font-size: 16px;">
                Thank you for joining PDFCraft.Pro! You now have access to the world's fastest PDF processing platform.
              </p>

              <div style="margin: 30px 0;">
                <div class="feature">
                  <span class="feature-icon">⚡</span>
                  <div>
                    <strong>PDF to PowerPoint</strong><br>
                    <span style="color: #64748b;">Convert PDFs to editable presentations in under 5 seconds</span>
                  </div>
                </div>

                <div class="feature">
                  <span class="feature-icon">🔗</span>
                  <div>
                    <strong>PDF Merging</strong><br>
                    <span style="color: #64748b;">Combine multiple PDFs instantly with perfect quality</span>
                  </div>
                </div>

                <div class="feature">
                  <span class="feature-icon">🚀</span>
                  <div>
                    <strong>10x Faster</strong><br>
                    <span style="color: #64748b;">Outperform Adobe Acrobat at 65% less cost</span>
                  </div>
                </div>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://pdfcraft.pro/dashboard" class="button">Start Converting PDFs</a>
              </div>

              <p style="color: #475569; line-height: 1.6;">
                Your <strong>Free Plan</strong> includes 3 conversions per day. Ready for more?
                <a href="https://pdfcraft.pro/pricing" style="color: #667eea;">Upgrade to Pro</a> for unlimited processing.
              </p>
            </div>

            <div class="footer">
              <p>Questions? Reply to this email or visit our <a href="https://pdfcraft.pro/support">support center</a>.</p>
              <p>PDFCraft.Pro - The fastest PDF processor on the planet 🌍</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to PDFCraft.Pro!

Hi ${userName}!

Thank you for joining PDFCraft.Pro! You now have access to the world's fastest PDF processing platform.

What you can do:
• Convert PDFs to PowerPoint presentations in under 5 seconds
• Merge multiple PDFs instantly with perfect quality
• Process files 10x faster than Adobe Acrobat at 65% less cost

Your Free Plan includes 3 conversions per day. Ready for more? Upgrade to Pro for unlimited processing.

Get started: https://pdfcraft.pro/dashboard
Questions? Visit: https://pdfcraft.pro/support

PDFCraft.Pro - The fastest PDF processor on the planet!`,
    };
  }

  static getConversionCompleteEmail(userEmail: string, jobId: string, jobType: string, downloadUrl: string): EmailTemplate {
    const operationType = jobType === 'pdf-to-ppt' ? 'PDF to PowerPoint conversion' : 'PDF merge';

    return {
      subject: `Your ${operationType} is ready! - PDFCraft.Pro`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white; }
            .content { padding: 30px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">✅ Conversion Complete!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your file is ready for download</p>
            </div>

            <div class="content">
              <p style="color: #475569; line-height: 1.6; font-size: 16px;">
                Great news! Your <strong>${operationType}</strong> has been completed successfully.
              </p>

              <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #475569;"><strong>Job ID:</strong> ${jobId}</p>
                <p style="margin: 10px 0 0 0; color: #475569;"><strong>Processing Type:</strong> ${operationType}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${downloadUrl}" class="button">Download Your File</a>
              </div>

              <p style="color: #ef4444; font-size: 14px; text-align: center;">
                ⏰ <strong>Download expires in 24 hours</strong> - Save your file now!
              </p>

              <p style="color: #475569; line-height: 1.6; font-size: 14px;">
                Need to process more files?
                <a href="https://pdfcraft.pro/dashboard" style="color: #667eea;">Upload another PDF</a> or
                <a href="https://pdfcraft.pro/pricing" style="color: #667eea;">upgrade your plan</a> for unlimited processing.
              </p>
            </div>

            <div class="footer">
              <p>Thanks for using PDFCraft.Pro!</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your ${operationType} is ready!

Job ID: ${jobId}
Processing Type: ${operationType}

Download your file: ${downloadUrl}

⏰ Download expires in 24 hours - Save your file now!

Need to process more files? Visit: https://pdfcraft.pro/dashboard

Thanks for using PDFCraft.Pro!`,
    };
  }

  static getConversionFailedEmail(userEmail: string, jobId: string, jobType: string, errorMessage: string): EmailTemplate {
    const operationType = jobType === 'pdf-to-ppt' ? 'PDF to PowerPoint conversion' : 'PDF merge';

    return {
      subject: `Conversion failed - We're here to help! - PDFCraft.Pro`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; color: white; }
            .content { padding: 30px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">❌ Conversion Failed</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">We're here to help you resolve this</p>
            </div>

            <div class="content">
              <p style="color: #475569; line-height: 1.6; font-size: 16px;">
                We encountered an issue processing your <strong>${operationType}</strong> request.
              </p>

              <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #dc2626;"><strong>Job ID:</strong> ${jobId}</p>
                <p style="margin: 10px 0 0 0; color: #dc2626;"><strong>Error:</strong> ${errorMessage}</p>
              </div>

              <h3 style="color: #1e293b; margin: 30px 0 15px 0;">Common Solutions:</h3>
              <ul style="color: #475569; line-height: 1.6;">
                <li>Ensure your PDF file is not corrupted or password-protected</li>
                <li>Check that your file is under the size limit (10MB Free, 25MB Starter, 100MB Pro)</li>
                <li>Try uploading the file again - temporary network issues can cause failures</li>
                <li>For merge operations, ensure all files are valid PDF documents</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://pdfcraft.pro/dashboard" class="button">Try Again</a>
                <a href="https://pdfcraft.pro/support" class="button" style="background: #64748b; margin-left: 10px;">Get Support</a>
              </div>

              <p style="color: #475569; line-height: 1.6; font-size: 14px;">
                Still having trouble? Reply to this email and our team will help you resolve the issue quickly.
              </p>
            </div>

            <div class="footer">
              <p>PDFCraft.Pro Support Team</p>
              <p>We're committed to making PDF processing effortless for you!</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Conversion Failed - We're here to help!

We encountered an issue processing your ${operationType} request.

Job ID: ${jobId}
Error: ${errorMessage}

Common Solutions:
• Ensure your PDF file is not corrupted or password-protected
• Check that your file is under the size limit (10MB Free, 25MB Starter, 100MB Pro)
• Try uploading the file again - temporary network issues can cause failures
• For merge operations, ensure all files are valid PDF documents

Try again: https://pdfcraft.pro/dashboard
Get support: https://pdfcraft.pro/support

Still having trouble? Reply to this email and our team will help you resolve the issue quickly.

PDFCraft.Pro Support Team`,
    };
  }

  static getUsageLimitEmail(userEmail: string, userName: string, currentPlan: string, usageCount: number, limit: number): EmailTemplate {
    return {
      subject: 'Usage Limit Reached - Upgrade for Unlimited Processing!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; color: white; }
            .content { padding: 30px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
            .plan-card { border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; background: #f8fafc; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">📊 Usage Limit Reached</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">You've used ${usageCount}/${limit} conversions</p>
            </div>

            <div class="content">
              <p style="color: #475569; line-height: 1.6; font-size: 16px;">
                Hi ${userName}! You've reached your ${currentPlan} plan limit of ${limit} conversions.
              </p>

              <div class="plan-card">
                <h3 style="margin: 0 0 10px 0; color: #1e293b;">🚀 Upgrade to Pro Plan - $19/month</h3>
                <ul style="color: #475569; margin: 10px 0;">
                  <li><strong>Unlimited</strong> PDF conversions</li>
                  <li><strong>100MB</strong> file size limit</li>
                  <li><strong>Priority</strong> processing queue</li>
                  <li><strong>Advanced</strong> features coming soon</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://pdfcraft.pro/pricing" class="button">Upgrade Now - $19/month</a>
              </div>

              <p style="color: #475569; line-height: 1.6; font-size: 14px; text-align: center;">
                Your conversions will reset ${currentPlan === 'free' ? 'tomorrow' : 'next month'}.<br>
                Or upgrade now for immediate unlimited access!
              </p>
            </div>

            <div class="footer">
              <p>Need help choosing a plan? <a href="mailto:support@pdfcraft.pro">Contact our team</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Usage Limit Reached

Hi ${userName}! You've reached your ${currentPlan} plan limit of ${limit} conversions.

Upgrade to Pro Plan - $19/month:
• Unlimited PDF conversions
• 100MB file size limit
• Priority processing queue
• Advanced features coming soon

Upgrade now: https://pdfcraft.pro/pricing

Your conversions will reset ${currentPlan === 'free' ? 'tomorrow' : 'next month'}.

Need help? Contact: support@pdfcraft.pro`,
    };
  }

  static getPasswordResetEmail(userEmail: string, resetToken: string): EmailTemplate {
    const resetUrl = `https://pdfcraft.pro/reset-password?token=${resetToken}`;

    return {
      subject: 'Reset Your PDFCraft.Pro Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
            .content { padding: 30px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
            .warning { background: #fef3cd; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🔐 Password Reset</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Secure access to your PDFCraft.Pro account</p>
            </div>

            <div class="content">
              <p style="color: #475569; line-height: 1.6; font-size: 16px;">
                We received a request to reset your PDFCraft.Pro password. Click the button below to create a new password:
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="button">Reset My Password</a>
              </div>

              <div class="warning">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>⚠️ Security Notice:</strong> This link expires in 1 hour. If you didn't request this reset, please ignore this email.
                </p>
              </div>

              <p style="color: #475569; line-height: 1.6; font-size: 14px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>

            <div class="footer">
              <p>PDFCraft.Pro Security Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Password Reset - PDFCraft.Pro

We received a request to reset your PDFCraft.Pro password.

Reset your password: ${resetUrl}

⚠️ Security Notice: This link expires in 1 hour. If you didn't request this reset, please ignore this email.

PDFCraft.Pro Security Team`,
    };
  }

  // Helper method to convert HTML to plain text
  private static htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();
  }

  // Utility methods for sending specific emails
  static async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const template = this.getWelcomeEmail(userEmail, userName);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  static async sendConversionCompleteEmail(userEmail: string, jobId: string, jobType: string, downloadUrl: string): Promise<boolean> {
    const template = this.getConversionCompleteEmail(userEmail, jobId, jobType, downloadUrl);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  static async sendConversionFailedEmail(userEmail: string, jobId: string, jobType: string, errorMessage: string): Promise<boolean> {
    const template = this.getConversionFailedEmail(userEmail, jobId, jobType, errorMessage);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  static async sendUsageLimitEmail(userEmail: string, userName: string, currentPlan: string, usageCount: number, limit: number): Promise<boolean> {
    const template = this.getUsageLimitEmail(userEmail, userName, currentPlan, usageCount, limit);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  static async sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<boolean> {
    const template = this.getPasswordResetEmail(userEmail, resetToken);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }
}