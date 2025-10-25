# Email Verification Testing Guide

Complete guide for testing the email verification enforcement system.

## Prerequisites

### 1. Database Migration (REQUIRED)
```bash
cd backend
mysql -u root -p pdfcraft_db < src/migrations/003_auth_system.sql
```

### 2. Environment Variables
Ensure `backend/.env` has:
```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email Configuration (Hostinger SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@pdflab.pro
SMTP_PASS=your-email-password
SMTP_FROM="PDFLab.Pro <noreply@pdflab.pro>"

# Frontend URL
FRONTEND_URL=http://localhost:3020

# Database
DB_HOST=localhost
DB_NAME=pdfcraft_db
DB_USER=root
DB_PASSWORD=your-password
```

### 3. Start Servers
```bash
# Terminal 1: Backend
cd backend
PORT=3015 npm run dev

# Terminal 2: Frontend
PORT=3020 npm run dev
```

---

## Test Option 1: Node.js API Tests (Fastest)

**File:** `email-verification-e2e-test.js`

**Tests 8 scenarios:**
1. ✅ User Registration
2. ✅ Unverified Conversion Blocked (403 Forbidden)
3. ✅ Resend Verification Email
4. ✅ Email Enumeration Prevention
5. ⏭️  Email Verification (Manual - requires email/DB access)
6. ✅ Password Reset Flow
7. ✅ Authentication Required
8. ✅ Get Current User Info

**Run:**
```bash
node email-verification-e2e-test.js
```

**Expected Output:**
```
🧪 EMAIL VERIFICATION ENFORCEMENT - E2E TEST
============================================================
📧 Test User Email: test-1234567890@pdflab.test
🔐 Test User Password: SecureTestPass123!
============================================================

📝 TEST 1: User Registration
------------------------------------------------------------
✅ Registration successful
   User ID: 1
   Email: test-1234567890@pdflab.test
   Email Verified: false
   Access Token: eyJhbGciOiJIUzI1NiI...
✅ User correctly marked as unverified
📧 Verification email should have been sent

🚫 TEST 2: Unverified User Attempts Conversion (Should Be BLOCKED)
------------------------------------------------------------
✅ Conversion correctly BLOCKED for unverified user
   Status: 403 Forbidden
   Error Code: EMAIL_NOT_VERIFIED
   Message: Email verification required before converting files
   Action Required: verify_email
✅ Response includes resend verification action
   Endpoint: /api/auth/resend-verification
   Method: POST

📧 TEST 3: Resend Verification Email
------------------------------------------------------------
✅ Resend verification successful
   Message: If an account exists with this email, a verification link has been sent.
📧 New verification email should have been sent

[... more tests ...]

============================================================
📊 TEST SUMMARY
============================================================
Total Tests:  8
✅ Passed:     7
❌ Failed:     0
⏭️  Skipped:    1
Success Rate: 87.5%
============================================================
```

---

## Test Option 2: Playwright Browser Tests (Most Comprehensive)

**File:** `playwright-email-verification-test.js`

**Tests full user journey in real browser:**
1. User registration with form
2. Email verification prompt shown
3. Unverified user conversion blocked in UI
4. Resend verification button
5. Direct API enforcement test
6. Password reset flow

**Setup:**
```bash
npm install -D @playwright/test
npx playwright install chromium
```

**Run:**
```bash
# Headless (fast)
npx playwright test playwright-email-verification-test.js

# Headed (watch it run)
npx playwright test playwright-email-verification-test.js --headed

# Debug mode
npx playwright test playwright-email-verification-test.js --debug
```

**Expected Behavior:**
- Browser opens automatically
- Navigates to signup page
- Fills registration form
- Shows email verification message
- Attempts conversion → BLOCKED with 403
- Takes screenshots at each step
- Saves screenshots in `test-results/`

---

## Test Option 3: Manual Testing Checklist

### 3.1 Registration & Verification
- [ ] Visit http://localhost:3020/signup
- [ ] Fill email: `yourtest@example.com`
- [ ] Fill password: `SecurePass123!`
- [ ] Click "Sign Up"
- [ ] **Expected:** Registration success, verification email sent
- [ ] Check email inbox (or SMTP logs)
- [ ] **Expected:** Email with verification link received

### 3.2 Unverified User Blocked from Conversion
- [ ] Login with unverified account
- [ ] Go to homepage
- [ ] Upload a PDF file
- [ ] Click "Convert"
- [ ] **Expected:** 403 Error - "Email verification required"
- [ ] **Expected:** "Resend Verification Email" button shown

### 3.3 Resend Verification
- [ ] Click "Resend Verification Email" button
- [ ] **Expected:** Success message shown
- [ ] Check email inbox
- [ ] **Expected:** New verification email received

### 3.4 Email Verification
- [ ] Click verification link from email
- [ ] **Expected:** Redirect to success page
- [ ] **Expected:** "Email verified successfully!" message
- [ ] Login again
- [ ] Upload PDF and convert
- [ ] **Expected:** Conversion works! ✅

### 3.5 Password Reset
- [ ] Click "Forgot Password?"
- [ ] Enter email address
- [ ] Click "Send Reset Link"
- [ ] **Expected:** "Reset link sent" message (even if email doesn't exist - security)
- [ ] Check email inbox
- [ ] **Expected:** Password reset email received
- [ ] Click reset link
- [ ] Enter new password
- [ ] **Expected:** "Password reset successful"
- [ ] Login with new password
- [ ] **Expected:** Login successful ✅

---

## Test Option 4: cURL API Tests

### 4.1 Register User
```bash
curl -X POST http://localhost:3015/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "full_name": "Test User"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "test@example.com",
      "email_verified": false,
      "plan": "free"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "..."
  },
  "message": "Registration successful! Please check your email to verify your account."
}
```

### 4.2 Attempt Conversion Without Verification (Should Fail)
```bash
curl -X POST http://localhost:3015/api/convert/pdf-to-ppt \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "files=@test.pdf"
```

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "error": {
    "message": "Email verification required before converting files",
    "code": "EMAIL_NOT_VERIFIED",
    "details": {
      "email": "test@example.com",
      "action_required": "verify_email",
      "message": "Please check your inbox for the verification email. Click the link to verify your account."
    }
  },
  "actions": {
    "resend_verification": {
      "method": "POST",
      "endpoint": "/api/auth/resend-verification",
      "body": { "email": "test@example.com" }
    }
  }
}
```

### 4.3 Resend Verification Email
```bash
curl -X POST http://localhost:3015/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Verification email sent successfully. Please check your inbox."
}
```

### 4.4 Verify Email (Extract Token from Email or Database)
```bash
# First, get token from database:
mysql -u root -p -e "SELECT verification_token FROM pdfcraft_db.users WHERE email = 'test@example.com';"

# Then verify:
curl -X GET http://localhost:3015/api/auth/verify-email/YOUR_VERIFICATION_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "test@example.com",
      "email_verified": true,
      "plan": "free"
    }
  },
  "message": "Email verified successfully! You can now start converting PDFs."
}
```

### 4.5 Conversion After Verification (Should Work)
```bash
curl -X POST http://localhost:3015/api/convert/pdf-to-ppt \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "files=@test.pdf"
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "jobId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "processing",
    "filename": "test.pdf"
  },
  "message": "Conversion started successfully"
}
```

---

## Verification Checklist

After running tests, verify:

### Database State
```sql
-- Check user was created
SELECT id, email, email_verified, plan, conversions_used, conversions_limit
FROM users
WHERE email LIKE 'test%';

-- Check audit logs
SELECT * FROM audit_logs
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com')
ORDER BY created_at DESC
LIMIT 10;

-- Check email logs
SELECT * FROM email_logs
WHERE recipient = 'test@example.com'
ORDER BY created_at DESC;
```

### SMTP Logs
Check backend console for:
```
📧 [EMAIL-SERVICE] Sending verification email to: test@example.com
✅ [EMAIL-SERVICE] Verification email sent successfully
```

### Error Logs
Check for any errors:
```bash
# Backend logs
tail -f backend/logs/error.log

# Or console output
```

---

## Troubleshooting

### Issue: Database Connection Failed
**Error:** `Error: connect ECONNREFUSED`
**Fix:**
```bash
# Check MySQL is running
mysql -u root -p -e "SHOW DATABASES;"

# If not, start MySQL service
# Windows: services.msc → MySQL → Start
# Linux: sudo systemctl start mysql
```

### Issue: Tables Don't Exist
**Error:** `Table 'pdfcraft_db.users' doesn't exist`
**Fix:**
```bash
# Run migration
cd backend
mysql -u root -p pdfcraft_db < src/migrations/003_auth_system.sql

# Verify tables created
mysql -u root -p -e "SHOW TABLES FROM pdfcraft_db;"
```

### Issue: Email Not Sending
**Error:** `[EMAIL-SERVICE] SMTP connection failed`
**Fix:**
1. Check `.env` has correct SMTP credentials
2. Test SMTP manually:
```bash
# Install nodemailer test
npm install -g nodemailer

# Or check Hostinger email settings
```

### Issue: 401 Unauthorized Instead of 403
**Problem:** Getting 401 before 403 email verification check
**Fix:** Middleware order is wrong. Should be:
```javascript
authenticateToken → requireEmailVerified → conversion
```

### Issue: Conversion Works Without Verification
**Problem:** Email verification not enforced
**Fix:** Check server.ts lines 236-287, ensure middleware applied:
```javascript
app.post('/api/convert/pdf-to-ppt',
  upload.array('files', 1),
  authenticateToken,        // ← Must be here
  requireEmailVerified,     // ← Must be here
  conversionMonitoringMiddleware('pdf-to-ppt'),
  ConvertController.convertToPPT
);
```

---

## Success Criteria

All tests pass when:
- ✅ User registration creates unverified account
- ✅ Verification email sent successfully
- ✅ Unverified user BLOCKED from conversion (403)
- ✅ Error message includes resend verification action
- ✅ Resend verification works
- ✅ Email verification updates `email_verified = TRUE`
- ✅ Verified user CAN convert successfully
- ✅ Password reset email sent
- ✅ Password reset works with valid token
- ✅ Email enumeration prevented (same response for non-existent emails)

---

## Next Steps After Testing

1. **Frontend Integration**
   - Create email verification UI components
   - Add "Verify Email" banner for unverified users
   - Implement resend verification button
   - Build verification success page

2. **Usage Limits Enforcement**
   - Implement `checkUsageLimits` middleware
   - Track conversions in `conversion_history` table
   - Enforce 3 free conversions/month for free plan

3. **Payment Integration**
   - Connect PayFast subscription to plan upgrades
   - Update `subscriptions` table on payment success
   - Sync plan limits with payment tier

---

*Testing guide created by Claude Code - December 2024*
