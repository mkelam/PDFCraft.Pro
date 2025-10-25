# Email Setup Guide for PDFCraft.Pro

This guide explains how to configure email sending for user registration, verification, and notifications.

## Quick Setup

### Option 1: Enable Email Sending (Recommended for Testing)

1. **Get Hostinger Email Credentials**:
   - Log into your Hostinger account
   - Go to Email → Email Accounts
   - Create or use existing email: `noreply@pdfcraft.pro`
   - Note the password

2. **Configure Environment Variables**:

   Edit `backend/.env.development` (or `backend/.env`):
   ```env
   # Email Configuration
   SMTP_HOST=smtp.hostinger.com
   SMTP_PORT=587
   SMTP_USER=noreply@pdfcraft.pro
   SMTP_PASSWORD=your_actual_password_here
   SMTP_FROM=PDFCraft.Pro <noreply@pdfcraft.pro>
   FRONTEND_URL=http://localhost:3000
   ```

3. **Restart the Backend Server**:
   ```bash
   cd backend
   PORT=3016 npx ts-node --transpile-only src/server.ts
   ```

4. **Verify Email Sending**:
   - Look for this log message: `✅ SMTP connection verified - Emails will be sent`
   - Register a new user
   - Check the user's inbox for verification email

### Option 2: Disable Email Sending (Development Only)

If you don't want to send actual emails during development:

1. **Leave SMTP Credentials Empty**:

   Edit `backend/.env.development`:
   ```env
   SMTP_HOST=smtp.hostinger.com
   SMTP_PORT=587
   SMTP_USER=
   SMTP_PASSWORD=
   ```

2. **Backend Behavior**:
   - Emails will only be logged to console
   - You'll see: `📧 [DEV] Email would be sent (SMTP not configured)`
   - Users can still register but won't receive verification emails
   - Use admin dashboard to manually verify users

## Email Types

The system sends these emails:

1. **Email Verification** (Registration)
   - Subject: "Verify your email - Start converting PDFs!"
   - Contains verification link
   - Sent immediately after registration

2. **Password Reset**
   - Subject: "Reset Your PDFCraft.Pro Password"
   - Contains reset link (expires in 1 hour)
   - Sent when user requests password reset

3. **Welcome Email** (Optional)
   - Subject: "Welcome to PDFCraft.Pro"
   - Sent after email verification

## Troubleshooting

### Email Not Sending

1. **Check SMTP Credentials**:
   ```bash
   # Verify environment variables are loaded
   cd backend
   node -e "console.log(process.env.SMTP_USER, process.env.SMTP_PASSWORD)"
   ```

2. **Check Backend Logs**:
   - Look for: `✅ SMTP connection verified`
   - If you see `⚠️ SMTP verification failed`, your credentials are wrong

3. **Test Email Manually**:
   ```bash
   # Use a simple nodemailer test
   node -e "
   const nodemailer = require('nodemailer');
   const transporter = nodemailer.createTransport({
     host: 'smtp.hostinger.com',
     port: 587,
     auth: {
       user: 'noreply@pdfcraft.pro',
       pass: 'YOUR_PASSWORD'
     }
   });
   transporter.sendMail({
     from: 'noreply@pdfcraft.pro',
     to: 'your-email@gmail.com',
     subject: 'Test',
     text: 'Test email'
   }).then(() => console.log('Sent!')).catch(console.error);
   "
   ```

### Common Issues

**Issue**: "SMTP verification failed"
- **Solution**: Double-check username and password
- Make sure you're using the app password (not regular password)
- Check if Hostinger email account is active

**Issue**: Emails sent but not received
- **Solution**: Check spam folder
- Verify sender domain (pdfcraft.pro) has proper DNS records
- Check Hostinger email quotas

**Issue**: "Connection timeout"
- **Solution**: Check firewall settings
- Ensure port 587 is open
- Try alternative port (465 with `secure: true`)

## Production Setup

For production deployment:

1. **Set Environment Variables on Server**:
   ```env
   NODE_ENV=production
   SMTP_HOST=smtp.hostinger.com
   SMTP_PORT=587
   SMTP_USER=noreply@pdfcraft.pro
   SMTP_PASSWORD=production_password_here
   SMTP_FROM=PDFCraft.Pro <noreply@pdfcraft.pro>
   FRONTEND_URL=https://pdfcraft.pro
   ```

2. **DNS Configuration**:
   - Add SPF record: `v=spf1 include:_spf.hostinger.com ~all`
   - Add DKIM record (get from Hostinger)
   - Add DMARC record: `v=DMARC1; p=none; rua=mailto:postmaster@pdfcraft.pro`

3. **Email Limits**:
   - Hostinger typically allows 100-200 emails/hour
   - Monitor sending quotas
   - Implement rate limiting if needed

## Email Templates

Email templates are defined in `backend/src/services/email.service.ts`:

- `getVerificationEmail()` - Email verification
- `getPasswordResetEmail()` - Password reset
- `getWelcomeEmail()` - Welcome message
- `getConversionCompleteEmail()` - Conversion success
- `getConversionFailedEmail()` - Conversion failure
- `getUsageLimitEmail()` - Usage limit reached

To customize templates, edit the HTML and text in these methods.

## Testing Emails

### Manual Testing

1. Register a new user with your email
2. Check inbox for verification email
3. Click verification link
4. User should be verified

### Automated Testing

```typescript
// Test email sending
import { EmailService } from './services/email.service';

await EmailService.initialize();
const result = await EmailService.sendVerificationEmail(
  { email: 'test@example.com', full_name: 'Test User' },
  'test-token-123'
);
console.log('Email sent:', result);
```

## Security Best Practices

1. **Never commit .env files** with real credentials
2. **Use environment-specific passwords** (dev vs production)
3. **Enable 2FA** on Hostinger account
4. **Monitor email sending logs** for suspicious activity
5. **Implement rate limiting** to prevent email spam
6. **Use DKIM/SPF** to prevent spoofing

## Support

If you need help:
- Check Hostinger email documentation
- Contact Hostinger support for SMTP issues
- Review backend logs for error messages

---

*Last Updated: October 2025*
*For: PDFCraft.Pro Email System*
