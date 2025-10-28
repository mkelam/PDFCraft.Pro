# 🔐 PDFLab.Pro Authentication & Freemium Architecture
## World-Class Authentication + Growth Engine Design

**Author:** Claude (0.1% Architect)
**Date:** October 24, 2025
**Status:** Architecture Design Complete - Ready for Implementation

---

## 📋 Executive Summary

This document defines the complete authentication and freemium monetization system for PDFLab.Pro, designed to maximize user acquisition, engagement, and conversion while maintaining a seamless user experience.

### Core Business Logic
- **Free Tier:** 3 conversions/merges per 30-day rolling period (no email verification required initially)
- **Starter Tier:** $5.99/month (100 conversions) or $57.50/year (20% discount)
- **Pro Tier:** $29.99/month (unlimited) or $287.90/year (20% discount)
- **Enterprise Tier:** Custom pricing (contact sales)

### Key Design Principles
1. **Friction Minimization:** No gate before first conversion (capture intent first)
2. **Psychology-Driven:** Strategic upgrade prompts at peak engagement moments
3. **Privacy-First:** Email verification required before accessing conversions
4. **File Persistence:** Remember uploaded files across signup flow
5. **Rolling Limits:** 30-day windows from registration date (not calendar month)

---

## 🎯 User Journey Flow

### **Scenario 1: New User - First Conversion**

```
1. User lands on homepage
   ↓
2. Uploads PDF for conversion (NO AUTH REQUIRED)
   ↓
3. Backend generates unique session ID, stores file temporarily
   ↓
4. **AUTH GATE APPEARS** - "Sign up to get your file + 2 more free conversions"
   ↓
5. User registers (email/password or Google OAuth)
   ↓
6. Email verification sent (REQUIRED - conversions blocked until verified)
   ↓
7. User clicks verification link
   ↓
8. **AUTO-REDIRECT** to conversion page with file already queued
   ↓
9. Conversion starts automatically
   ↓
10. Success! Usage counter: 1/3 used (resets in 30 days)
```

### **Scenario 2: Free User Hits Limit**

```
1. User attempts 4th conversion in rolling 30-day window
   ↓
2. **HARD PAYWALL MODAL** appears:
   "You've used all 3 free conversions this month
    Next reset: [DATE] ([X] days)

    🚀 Upgrade to Starter for 97 more conversions
    or
    ⚡ Go Pro for unlimited conversions"
   ↓
3. User clicks "Upgrade to Starter"
   ↓
4. Pricing modal with annual discount highlighted
   ↓
5. PayFast checkout flow
   ↓
6. Webhook confirms payment
   ↓
7. Database updates: plan=starter, limits reset
   ↓
8. User redirected back to convert page
   ↓
9. Conversion proceeds automatically (file was saved)
```

### **Scenario 3: Failed Conversion**

```
1. User uploads corrupted PDF
   ↓
2. Conversion fails with error message
   ↓
3. **NO USAGE DECREMENT** (failed conversions are free)
   ↓
4. Error logged for monitoring
   ↓
5. User can retry immediately
```

---

## 🗄️ Database Schema

### **users** Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- NULL for OAuth users
  full_name VARCHAR(255),

  -- Authentication
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  verification_token_expires TIMESTAMP,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,

  -- OAuth
  oauth_provider ENUM('google', 'local') DEFAULT 'local',
  oauth_id VARCHAR(255),
  avatar_url VARCHAR(500),

  -- Subscription
  plan ENUM('free', 'starter', 'pro', 'enterprise') DEFAULT 'free',
  billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
  subscription_status ENUM('active', 'canceled', 'past_due', 'trialing') DEFAULT 'active',

  -- Usage Tracking
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usage_reset_date TIMESTAMP, -- registration_date + 30 days
  conversions_used INT DEFAULT 0,
  conversions_limit INT DEFAULT 3,

  -- PayFast Integration
  payfast_subscription_token VARCHAR(255),
  payfast_customer_id VARCHAR(255),

  -- Metadata
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_verification_token (verification_token),
  INDEX idx_usage_reset (usage_reset_date)
);
```

### **conversion_history** Table
```sql
CREATE TABLE conversion_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,

  -- Conversion Details
  conversion_type ENUM('pdf-to-ppt', 'pdf-to-word', 'pdf-to-excel', 'pdf-merge', 'pdf-to-image') NOT NULL,
  input_file_size INT, -- bytes
  output_file_size INT,

  -- Status
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  error_message TEXT,

  -- Performance
  processing_time INT, -- milliseconds
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Usage Counting
  counted_against_limit BOOLEAN DEFAULT TRUE, -- FALSE if failed

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status),
  INDEX idx_created_at (created_at)
);
```

### **pending_uploads** Table (File Persistence)
```sql
CREATE TABLE pending_uploads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(255) UNIQUE NOT NULL, -- Anonymous user session
  user_id INT, -- NULL until signup

  -- File Info
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INT NOT NULL,
  conversion_type ENUM('pdf-to-ppt', 'pdf-to-word', 'pdf-to-excel', 'pdf-merge') NOT NULL,

  -- State
  status ENUM('pending_auth', 'pending_verification', 'ready', 'expired') DEFAULT 'pending_auth',

  -- Expiry
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- created_at + 1 hour

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session (session_id),
  INDEX idx_expires (expires_at)
);
```

### **subscriptions** Table (PayFast Tracking)
```sql
CREATE TABLE subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,

  -- PayFast Details
  payfast_subscription_token VARCHAR(255) UNIQUE,
  payfast_payment_id VARCHAR(255),

  -- Subscription Info
  plan ENUM('starter', 'pro', 'enterprise') NOT NULL,
  billing_cycle ENUM('monthly', 'yearly') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'ZAR',

  -- Status
  status ENUM('active', 'canceled', 'suspended', 'past_due') DEFAULT 'active',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_status (status)
);
```

---

## 🔧 API Endpoints

### **Authentication Endpoints**

```typescript
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/verify-email/:token
POST   /api/auth/resend-verification
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
POST   /api/auth/refresh-token

// OAuth
GET    /api/auth/google
GET    /api/auth/google/callback
```

### **User Management**

```typescript
GET    /api/user/profile
PATCH  /api/user/profile
GET    /api/user/usage              // Current usage stats
GET    /api/user/history            // Conversion history
DELETE /api/user/account            // Account deletion
```

### **Subscription Management**

```typescript
POST   /api/subscription/create-checkout    // Initialize PayFast payment
POST   /api/subscription/cancel
POST   /api/subscription/reactivate
PATCH  /api/subscription/update-billing
GET    /api/subscription/invoices

// PayFast Webhooks
POST   /api/webhooks/payfast/notify         // Payment notifications
POST   /api/webhooks/payfast/return         // Success redirect
POST   /api/webhooks/payfast/cancel         // Cancel redirect
```

### **Conversion Endpoints (Protected)**

```typescript
// All require authentication + usage check
POST   /api/convert/pdf-to-ppt              // Protected by usage middleware
POST   /api/convert/pdf-to-word             // Protected by usage middleware
POST   /api/convert/pdf-to-excel            // Protected by usage middleware
POST   /api/convert/pdf-merge               // Protected by usage middleware
POST   /api/convert/anonymous               // Stores in pending_uploads

GET    /api/convert/:jobId/status
GET    /api/download/:filename              // Requires ownership verification
```

---

## 🛡️ Middleware Architecture

### **1. Authentication Middleware** (`auth.middleware.ts`)

```typescript
/**
 * Verifies JWT token and attaches user to request
 * Used on ALL protected routes
 */
export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId)

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

### **2. Email Verification Middleware** (`emailVerified.middleware.ts`)

```typescript
/**
 * Ensures user has verified their email
 * Blocks conversions for unverified users
 */
export async function requireEmailVerified(req, res, next) {
  if (!req.user.email_verified) {
    return res.status(403).json({
      error: 'Email verification required',
      message: 'Please verify your email before converting files',
      action: 'resend_verification_email'
    })
  }
  next()
}
```

### **3. Usage Enforcement Middleware** (`usageLimit.middleware.ts`)

```typescript
/**
 * Checks if user has conversions remaining
 * Enforces rolling 30-day limits
 */
export async function enforceUsageLimit(req, res, next) {
  const user = req.user

  // Pro/Enterprise = unlimited
  if (user.plan === 'pro' || user.plan === 'enterprise') {
    return next()
  }

  // Check if usage period needs reset
  const now = new Date()
  if (now >= user.usage_reset_date) {
    await User.update(user.id, {
      conversions_used: 0,
      usage_reset_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    })
    user.conversions_used = 0
  }

  // Check limit
  if (user.conversions_used >= user.conversions_limit) {
    const daysUntilReset = Math.ceil(
      (user.usage_reset_date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    )

    return res.status(429).json({
      error: 'Usage limit exceeded',
      message: `You've used all ${user.conversions_limit} conversions this period`,
      usage: {
        used: user.conversions_used,
        limit: user.conversions_limit,
        resets_in_days: daysUntilReset,
        reset_date: user.usage_reset_date
      },
      upgrade_url: '/pricing'
    })
  }

  next()
}
```

### **4. Middleware Pipeline**

```typescript
// Conversion routes use full pipeline
app.post('/api/convert/pdf-to-ppt', [
  authMiddleware,           // 1. Verify JWT
  requireEmailVerified,     // 2. Check email verified
  enforceUsageLimit,        // 3. Check usage limits
  convertPdfToPptController // 4. Process conversion
])

// Anonymous upload (pre-signup)
app.post('/api/convert/anonymous', [
  sessionMiddleware,        // Generate session ID if none exists
  storeAnonymousUpload      // Save file + show signup modal
])
```

---

## 📧 Email System

### **Required Email Templates**

1. **Welcome Email** (after registration)
   - Subject: "Verify your email - Start converting PDFs!"
   - CTA: Verification link with token
   - Reminder: They have a file waiting

2. **Email Verification** (with pending file)
   - Subject: "Click to verify and get your converted file"
   - CTA: Verify button → auto-redirect to conversion page
   - Urgency: File expires in 1 hour

3. **Limit Warning** (at 2/3 conversions)
   - Subject: "1 free conversion remaining this month"
   - CTA: "Upgrade for 97 more" or "See when your limit resets"

4. **Limit Reached**
   - Subject: "You've used all 3 free conversions"
   - CTA: "Upgrade to Starter" with 20% annual discount highlight

5. **Limit Reset Notification**
   - Subject: "Your free conversions have reset!"
   - CTA: "Convert 3 more PDFs free"

6. **Payment Success**
   - Subject: "Welcome to [Plan Name]!"
   - Details: Receipt, billing info, new limits

7. **Payment Failed**
   - Subject: "Payment issue - Update your billing"
   - CTA: Update payment method

### **Email Service Integration**

```typescript
// Recommended: SendGrid or Mailgun
import sgMail from '@sendgrid/mail'

export async function sendVerificationEmail(user, token) {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`

  await sgMail.send({
    to: user.email,
    from: 'noreply@pdflab.pro',
    subject: 'Verify your email - Start converting PDFs!',
    html: `
      <h1>Welcome to PDFLab.Pro!</h1>
      <p>Click below to verify your email and access your converted file:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `
  })
}
```

---

## 🎨 Frontend Components

### **1. Auth Gate Modal** (shown after anonymous upload)

```tsx
<AuthGateModal>
  <h2>Sign up to get your file + 2 more free conversions</h2>
  <p>Your file is ready! Create a free account to download it.</p>

  <GoogleButton>Continue with Google</GoogleButton>
  <Divider>or</Divider>

  <EmailForm>
    <Input placeholder="Email" />
    <Input type="password" placeholder="Password" />
    <Button>Create Account & Download</Button>
  </EmailForm>

  <LegalText>
    By signing up, you agree to our Terms & Privacy Policy
  </LegalText>
</AuthGateModal>
```

### **2. Usage Dashboard Widget**

```tsx
<UsageDashboard>
  <UsageBar>
    <Progress value={conversionsUsed} max={conversionsLimit} />
    <Label>{conversionsUsed}/{conversionsLimit} conversions used</Label>
  </UsageBar>

  <ResetInfo>
    {conversionsUsed >= conversionsLimit ? (
      <UpgradeNudge>
        Limit reached. <Link to="/pricing">Upgrade for more</Link>
      </UpgradeNudge>
    ) : (
      <ResetTimer>
        Resets in {daysUntilReset} days
      </ResetTimer>
    )}
  </ResetInfo>
</UsageDashboard>
```

### **3. Paywall Modal** (at limit)

```tsx
<PaywallModal>
  <Icon>🚫</Icon>
  <Title>You've used all 3 free conversions this month</Title>
  <Subtitle>Next reset: {resetDate} ({daysRemaining} days)</Subtitle>

  <PricingCards>
    <PricingCard plan="starter" highlighted>
      <Badge>Most Popular</Badge>
      <Price>$5.99/month</Price>
      <Feature>100 conversions/month</Feature>
      <Button>Upgrade to Starter</Button>
      <AnnualOption>or $57.50/year (save 20%)</AnnualOption>
    </PricingCard>

    <PricingCard plan="pro">
      <Price>$29.99/month</Price>
      <Feature>Unlimited conversions</Feature>
      <Button variant="outline">Go Pro</Button>
      <AnnualOption>or $287.90/year (save 20%)</AnnualOption>
    </PricingCard>
  </PricingCards>

  <DismissButton>I'll wait {daysRemaining} days</DismissButton>
</PaywallModal>
```

### **4. Email Verification Banner**

```tsx
<VerificationBanner show={!user.email_verified}>
  <Icon>⚠️</Icon>
  <Message>
    Please verify your email to start converting files
  </Message>
  <Button onClick={resendVerification}>
    Resend Verification Email
  </Button>
</VerificationBanner>
```

---

## 💰 Pricing Page Updates

### **Annual Discount Strategy**

```typescript
const pricingPlans = [
  {
    name: "Free",
    monthly: "Free",
    yearly: "Free",
    features: [
      "3 conversions per 30 days",
      "PDF to PowerPoint, Word, Excel",
      "Email support",
      "10MB file size limit"
    ]
  },
  {
    name: "Starter",
    monthly: "$5.99",
    yearly: "$57.50", // 20% discount
    savings: "Save $14.38/year",
    popular: true,
    features: [
      "100 conversions per month",
      "All conversion formats",
      "Priority processing",
      "25MB file size limit",
      "Priority support"
    ]
  },
  {
    name: "Pro",
    monthly: "$29.99",
    yearly: "$287.90", // 20% discount
    savings: "Save $71.98/year",
    features: [
      "Unlimited conversions",
      "All premium features",
      "API access",
      "100MB file size limit",
      "Dedicated support",
      "Advanced analytics"
    ]
  },
  {
    name: "Enterprise",
    monthly: "Custom",
    yearly: "Custom",
    cta: "Contact Sales",
    features: [
      "Custom volume pricing",
      "Team management",
      "SSO integration",
      "SLA guarantees",
      "White-label options",
      "Dedicated account manager"
    ]
  }
]
```

### **Billing Toggle Component**

```tsx
<BillingToggle>
  <Option active={billingCycle === 'monthly'}>
    Monthly
  </Option>
  <Option active={billingCycle === 'yearly'}>
    Yearly
    <Badge>Save 20%</Badge>
  </Option>
</BillingToggle>
```

---

## 🔄 PayFast Integration Flow

### **Checkout Flow**

```typescript
// 1. User clicks "Upgrade to Starter"
POST /api/subscription/create-checkout
Body: {
  plan: "starter",
  billing_cycle: "yearly" // or "monthly"
}

// 2. Backend generates PayFast payment form
Response: {
  success: true,
  payfast_url: "https://www.payfast.co.za/eng/process",
  form_data: {
    merchant_id: "10000100",
    merchant_key: "46f0cd694581a",
    amount: "57.50",
    item_name: "PDFLab.Pro Starter (Yearly)",
    return_url: "https://pdflab.pro/payment/success",
    cancel_url: "https://pdflab.pro/payment/cancel",
    notify_url: "https://api.pdflab.pro/webhooks/payfast/notify",
    signature: "generated_md5_signature"
  }
}

// 3. Frontend auto-submits PayFast form
// 4. User completes payment on PayFast
// 5. PayFast sends webhook to notify_url
// 6. Backend validates signature, updates user subscription
// 7. User redirected to return_url with success message
```

### **Webhook Handler**

```typescript
app.post('/api/webhooks/payfast/notify', async (req, res) => {
  // 1. Validate PayFast signature
  const isValid = validatePayFastSignature(req.body)
  if (!isValid) {
    return res.status(400).send('Invalid signature')
  }

  // 2. Extract payment details
  const { payment_status, m_payment_id, custom_str1: userId } = req.body

  // 3. Update user subscription
  if (payment_status === 'COMPLETE') {
    await User.update(userId, {
      plan: 'starter', // or 'pro' based on amount
      subscription_status: 'active',
      conversions_used: 0,
      conversions_limit: 100, // or unlimited for pro
      usage_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    })

    // 4. Send welcome email
    await sendPaymentSuccessEmail(userId)
  }

  res.status(200).send('OK')
})
```

---

## 📊 Analytics & Tracking

### **Key Metrics to Track**

```typescript
// Conversion Funnel
1. Anonymous uploads (pre-signup)
2. Signup initiated
3. Email verified
4. First conversion completed
5. Usage limit reached
6. Upgrade clicked
7. Payment completed

// User Segments
- Free users (active vs. dormant)
- Verified vs. unverified emails
- Users at 0/3, 1/3, 2/3, 3/3 usage
- Churned users (canceled subscriptions)

// Revenue Metrics
- MRR (Monthly Recurring Revenue)
- Conversion rate (free → paid)
- Churn rate
- Average revenue per user (ARPU)
```

### **Analytics Events**

```typescript
// Track key user actions
analytics.track('Anonymous Upload', { fileSize, conversionType })
analytics.track('Signup Started', { source: 'auth_gate' })
analytics.track('Email Verified', { timeToVerify })
analytics.track('Conversion Completed', { plan, usageRemaining })
analytics.track('Limit Reached', { plan, daysSinceSignup })
analytics.track('Upgrade Clicked', { plan, source: 'paywall' })
analytics.track('Payment Completed', { plan, billingCycle, amount })
```

---

## 🚀 Implementation Roadmap

### **Phase 1: Core Authentication (Week 1)**
- [ ] Database schema creation
- [ ] JWT authentication endpoints
- [ ] Email verification system
- [ ] Frontend auth UI components
- [ ] Session management

### **Phase 2: Usage Tracking (Week 1-2)**
- [ ] Usage enforcement middleware
- [ ] Rolling 30-day reset logic
- [ ] Usage dashboard UI
- [ ] Conversion counting system
- [ ] Failed conversion handling

### **Phase 3: File Persistence (Week 2)**
- [ ] Anonymous upload storage
- [ ] Session-based file tracking
- [ ] Post-signup file retrieval
- [ ] 1-hour expiry cleanup job

### **Phase 4: Paywall & Upgrade Flow (Week 2-3)**
- [ ] Paywall modal UI
- [ ] Pricing page updates (annual billing)
- [ ] Enterprise tier (contact sales)
- [ ] Upgrade nudges at 2/3 usage

### **Phase 5: PayFast Integration (Week 3)**
- [ ] Checkout flow
- [ ] Webhook handlers
- [ ] Subscription management
- [ ] Payment success/failure flows

### **Phase 6: Email System (Week 3-4)**
- [ ] Email service setup (SendGrid)
- [ ] Welcome + verification emails
- [ ] Limit warning emails
- [ ] Payment confirmation emails

### **Phase 7: Polish & Testing (Week 4)**
- [ ] End-to-end testing
- [ ] Edge case handling
- [ ] Performance optimization
- [ ] Analytics integration

---

## 🎯 Success Metrics (90-Day Targets)

| Metric | Target | Current |
|--------|--------|---------|
| Signups/month | 500 | 0 |
| Email verification rate | >80% | - |
| Free → Paid conversion | >5% | - |
| Monthly churn | <5% | - |
| MRR | $2,000 | $0 |
| Average conversions per free user | 2.5/3 | - |

---

## 🔐 Security Considerations

1. **Password Security**
   - bcrypt hashing (cost factor 12)
   - Password strength validation (min 8 chars, 1 uppercase, 1 number)
   - Rate limiting on login attempts (5 attempts per 15 min)

2. **JWT Security**
   - Short-lived access tokens (15 min)
   - Long-lived refresh tokens (7 days)
   - Token rotation on refresh
   - Blacklist for logged-out tokens

3. **Email Verification**
   - Cryptographically secure tokens (32 bytes)
   - 24-hour expiry
   - Rate limiting on resend (1 per 5 minutes)

4. **File Upload Security**
   - MIME type validation
   - File size limits enforced
   - Virus scanning (future: ClamAV integration)
   - Isolated storage per user

5. **PayFast Security**
   - Signature validation on all webhooks
   - HTTPS-only communication
   - Idempotency keys for duplicate prevention

---

## 📝 Environment Variables

```bash
# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=different-secret-for-refresh-tokens
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email (SendGrid)
SENDGRID_API_KEY=SG.xxx
FROM_EMAIL=noreply@pdflab.pro
SUPPORT_EMAIL=support@pdflab.pro

# PayFast
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=your-passphrase
PAYFAST_SANDBOX=false
PAYFAST_NOTIFY_URL=https://api.pdflab.pro/webhooks/payfast/notify
PAYFAST_RETURN_URL=https://pdflab.pro/payment/success
PAYFAST_CANCEL_URL=https://pdflab.pro/payment/cancel

# OAuth (Google)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=https://pdflab.pro/auth/google/callback

# Pricing
STARTER_MONTHLY_PRICE=5.99
STARTER_YEARLY_PRICE=57.50
PRO_MONTHLY_PRICE=29.99
PRO_YEARLY_PRICE=287.90

# Usage Limits
FREE_CONVERSION_LIMIT=3
FREE_FILE_SIZE_LIMIT=10485760  # 10MB
STARTER_CONVERSION_LIMIT=100
STARTER_FILE_SIZE_LIMIT=26214400  # 25MB
PRO_FILE_SIZE_LIMIT=104857600  # 100MB

# Session
SESSION_SECRET=another-random-secret-key
SESSION_EXPIRY=1h  # For anonymous uploads

# Frontend
FRONTEND_URL=https://pdflab.pro
API_BASE_URL=https://api.pdflab.pro
```

---

## 🎨 UI/UX Psychology Tactics

### **1. Scarcity & Urgency**
- "Only 1 free conversion remaining" (red badge)
- "File expires in 45 minutes" (countdown timer)
- "Resets in 12 days" (creates waiting pain)

### **2. Social Proof**
- "Join 2,847 professionals using PDFLab.Pro"
- "Most popular" badge on Starter plan
- Testimonials on pricing page

### **3. Anchoring**
- Show annual pricing with "Save $14.38/year" (makes monthly feel wasteful)
- Display crossed-out monthly total vs. yearly discount

### **4. Loss Aversion**
- "Don't lose access to your files - verify email now"
- "Your file is ready, just verify your email to download"

### **5. Progress Indicators**
- Usage bar fills as conversions used (gamification)
- "67% of users upgrade after 2nd conversion" (social proof + urgency)

### **6. Strategic Friction**
- Email verification required (reduces spam, increases commitment)
- No anonymous conversions (forces signup, builds user base)
- File persisted (removes re-upload friction post-signup)

---

## 🏆 Competitive Advantages

| Feature | PDFLab.Pro | Adobe Acrobat | Smallpdf |
|---------|------------|---------------|----------|
| Free tier | 3 conversions/month | 0 (7-day trial only) | 2 files/day |
| Privacy-first | ✅ No cloud storage | ❌ Cloud-based | ❌ Cloud-based |
| Pricing | $5.99/month | $22.99/month | $12/month |
| OCR included | ✅ Free tier | ✅ Paid only | ✅ Paid only |
| Multi-format | ✅ PPT/Word/Excel | ✅ | ⚠️ Limited |
| Annual discount | 20% | None | 10% |

---

## 📞 Next Steps

1. **Review & Approve Architecture** - Get stakeholder buy-in
2. **Prioritize Features** - Decide MVP scope
3. **Assign Development Tasks** - Break into sprint tickets
4. **Set Milestones** - Define weekly deliverables
5. **Begin Phase 1** - Start with database schema + auth endpoints

---

**Questions or concerns? Let's iterate on this design before implementation begins!**
