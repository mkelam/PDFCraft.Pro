-- ============================================================================
-- PDFLab.Pro Authentication & Freemium System - Database Migration
-- Version: 003
-- Created: 2025-10-24
-- Description: Complete authentication, subscription, and usage tracking system
-- ============================================================================

-- ============================================================================
-- 1. USERS TABLE
-- Core user authentication and profile management
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- NULL for OAuth users
  full_name VARCHAR(255),

  -- Authentication & Verification
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255) UNIQUE,
  verification_token_expires TIMESTAMP NULL,
  password_reset_token VARCHAR(255) UNIQUE,
  password_reset_expires TIMESTAMP NULL,

  -- OAuth Integration
  oauth_provider ENUM('google', 'local') DEFAULT 'local',
  oauth_id VARCHAR(255),
  avatar_url VARCHAR(500),

  -- Subscription & Plan
  plan ENUM('free', 'starter', 'pro', 'enterprise') DEFAULT 'free',
  billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
  subscription_status ENUM('active', 'canceled', 'past_due', 'trialing') DEFAULT 'active',

  -- Usage Tracking (Rolling 30-Day Windows)
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usage_reset_date TIMESTAMP NULL, -- registration_date + 30 days
  conversions_used INT DEFAULT 0,
  conversions_limit INT DEFAULT 3, -- Free: 3, Starter: 100, Pro: 999999

  -- File Size Limits (in bytes)
  file_size_limit BIGINT DEFAULT 10485760, -- Free: 10MB, Starter: 25MB, Pro: 100MB

  -- PayFast Integration
  payfast_subscription_token VARCHAR(255),
  payfast_customer_id VARCHAR(255),

  -- Session & Security
  last_login TIMESTAMP NULL,
  login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes for Performance
  INDEX idx_email (email),
  INDEX idx_verification_token (verification_token),
  INDEX idx_password_reset_token (password_reset_token),
  INDEX idx_usage_reset (usage_reset_date),
  INDEX idx_plan_status (plan, subscription_status),
  INDEX idx_oauth (oauth_provider, oauth_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. CONVERSION HISTORY TABLE
-- Track all user conversions for analytics and usage counting
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversion_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,

  -- Conversion Details
  conversion_type ENUM('pdf-to-ppt', 'pdf-to-word', 'pdf-to-excel', 'pdf-merge', 'pdf-to-image') NOT NULL,
  input_file_name VARCHAR(255),
  input_file_size INT, -- bytes
  output_file_name VARCHAR(255),
  output_file_size INT, -- bytes

  -- Processing Status
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  error_message TEXT,
  error_code VARCHAR(50),

  -- Performance Metrics
  processing_time INT, -- milliseconds
  queue_time INT, -- milliseconds waiting in queue
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,

  -- Usage Counting
  counted_against_limit BOOLEAN DEFAULT TRUE, -- FALSE if conversion failed

  -- Quality Metrics
  ocr_confidence DECIMAL(5,2), -- 0.00 to 100.00
  pages_processed INT,

  -- Metadata
  ip_address VARCHAR(45), -- IPv6 support
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status),
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_created_at (created_at),
  INDEX idx_conversion_type (conversion_type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. PENDING UPLOADS TABLE
-- Store anonymous uploads before user signup (file persistence)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pending_uploads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(255) UNIQUE NOT NULL, -- Anonymous session identifier
  user_id INT NULL, -- Links to user after signup

  -- File Information
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INT NOT NULL,
  conversion_type ENUM('pdf-to-ppt', 'pdf-to-word', 'pdf-to-excel', 'pdf-merge', 'pdf-to-image') NOT NULL,

  -- Processing State
  status ENUM('pending_auth', 'pending_verification', 'ready', 'expired', 'processed') DEFAULT 'pending_auth',

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Expiry Management
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL, -- created_at + 1 hour

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_session (session_id),
  INDEX idx_user_status (user_id, status),
  INDEX idx_expires (expires_at),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. SUBSCRIPTIONS TABLE
-- Track PayFast subscriptions and billing history
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,

  -- PayFast Details
  payfast_subscription_token VARCHAR(255) UNIQUE,
  payfast_payment_id VARCHAR(255),
  payfast_signature VARCHAR(255),

  -- Subscription Information
  plan ENUM('starter', 'pro', 'enterprise') NOT NULL,
  billing_cycle ENUM('monthly', 'yearly') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'ZAR',

  -- Status & Lifecycle
  status ENUM('active', 'canceled', 'suspended', 'past_due', 'expired') DEFAULT 'active',
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP NULL,

  -- Billing Details
  next_billing_date TIMESTAMP NULL,
  last_payment_date TIMESTAMP NULL,
  last_payment_amount DECIMAL(10, 2),

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_payfast_token (payfast_subscription_token),
  INDEX idx_next_billing (next_billing_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. PAYMENT TRANSACTIONS TABLE
-- Log all payment attempts and results
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  subscription_id INT NULL,

  -- PayFast Transaction Details
  payfast_payment_id VARCHAR(255),
  payfast_signature VARCHAR(255),

  -- Transaction Info
  transaction_type ENUM('subscription_payment', 'upgrade', 'downgrade', 'refund') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'ZAR',

  -- Status
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  failure_reason TEXT,

  -- Metadata
  payment_method VARCHAR(50), -- 'card', 'eft', etc.
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_subscription (subscription_id),
  INDEX idx_status (status),
  INDEX idx_payfast_payment (payfast_payment_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. EMAIL LOGS TABLE
-- Track all emails sent for debugging and compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,

  -- Email Details
  recipient_email VARCHAR(255) NOT NULL,
  email_type ENUM(
    'verification',
    'welcome',
    'password_reset',
    'limit_warning',
    'limit_reached',
    'limit_reset',
    'payment_success',
    'payment_failed',
    'subscription_canceled'
  ) NOT NULL,
  subject VARCHAR(500),

  -- Delivery Status
  status ENUM('pending', 'sent', 'failed', 'bounced') DEFAULT 'pending',
  sent_at TIMESTAMP NULL,
  failure_reason TEXT,

  -- Email Service Provider
  esp_message_id VARCHAR(255), -- SendGrid/Mailgun message ID
  esp_response TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_recipient (recipient_email),
  INDEX idx_type_status (email_type, status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. REFRESH TOKENS TABLE
-- Store JWT refresh tokens for secure session management
-- ============================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,

  -- Token Details
  token VARCHAR(500) UNIQUE NOT NULL,
  token_family VARCHAR(255), -- For token rotation detection

  -- Lifecycle
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP NULL,
  replaced_by_token VARCHAR(500),

  -- Security
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_token (token),
  INDEX idx_expires (expires_at),
  INDEX idx_revoked (revoked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. AUDIT LOGS TABLE
-- Track important user actions for security and compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,

  -- Action Details
  action ENUM(
    'user_registered',
    'user_login',
    'user_logout',
    'email_verified',
    'password_changed',
    'password_reset_requested',
    'plan_upgraded',
    'plan_downgraded',
    'subscription_canceled',
    'file_uploaded',
    'conversion_completed',
    'conversion_failed'
  ) NOT NULL,
  description TEXT,

  -- Context
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSON, -- Additional context as needed

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. TRIGGER: Auto-set usage_reset_date on user registration
-- ============================================================================

DELIMITER //

CREATE TRIGGER set_usage_reset_date_on_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
  IF NEW.usage_reset_date IS NULL THEN
    SET NEW.usage_reset_date = DATE_ADD(NEW.registration_date, INTERVAL 30 DAY);
  END IF;
END//

DELIMITER ;

-- ============================================================================
-- 10. STORED PROCEDURE: Reset user usage (called by cron job)
-- ============================================================================

DELIMITER //

CREATE PROCEDURE reset_expired_usage_limits()
BEGIN
  -- Reset usage for users whose usage_reset_date has passed
  UPDATE users
  SET
    conversions_used = 0,
    usage_reset_date = DATE_ADD(usage_reset_date, INTERVAL 30 DAY)
  WHERE
    usage_reset_date <= NOW()
    AND plan IN ('free', 'starter'); -- Pro has unlimited, no need to reset

  -- Log the reset count
  SELECT ROW_COUNT() AS users_reset;
END//

DELIMITER ;

-- ============================================================================
-- 11. STORED PROCEDURE: Cleanup expired pending uploads
-- ============================================================================

DELIMITER //

CREATE PROCEDURE cleanup_expired_uploads()
BEGIN
  -- Mark uploads as expired
  UPDATE pending_uploads
  SET status = 'expired'
  WHERE expires_at <= NOW() AND status NOT IN ('expired', 'processed');

  -- Log cleanup count
  SELECT ROW_COUNT() AS uploads_expired;

  -- Optionally delete old expired records (older than 7 days)
  DELETE FROM pending_uploads
  WHERE status = 'expired' AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);

  SELECT ROW_COUNT() AS uploads_deleted;
END//

DELIMITER ;

-- ============================================================================
-- 12. VIEW: User statistics for dashboard
-- ============================================================================

CREATE OR REPLACE VIEW user_statistics AS
SELECT
  u.id,
  u.email,
  u.plan,
  u.conversions_used,
  u.conversions_limit,
  CASE
    WHEN u.plan = 'pro' THEN 100 -- Pro has unlimited, show 100% utilization as "active"
    ELSE ROUND((u.conversions_used / u.conversions_limit) * 100, 2)
  END AS usage_percentage,
  DATEDIFF(u.usage_reset_date, NOW()) AS days_until_reset,
  COUNT(ch.id) AS total_conversions,
  COUNT(CASE WHEN ch.status = 'completed' THEN 1 END) AS successful_conversions,
  COUNT(CASE WHEN ch.status = 'failed' THEN 1 END) AS failed_conversions,
  AVG(CASE WHEN ch.status = 'completed' THEN ch.processing_time END) AS avg_processing_time_ms,
  u.created_at AS registration_date,
  u.last_login
FROM users u
LEFT JOIN conversion_history ch ON u.id = ch.user_id
GROUP BY u.id;

-- ============================================================================
-- 13. INITIAL DATA: Create default admin user (CHANGE PASSWORD IMMEDIATELY)
-- ============================================================================

-- Note: Password is 'admin123' hashed with bcrypt (cost=12)
-- IMPORTANT: Change this password immediately after first login!
INSERT INTO users (
  email,
  password_hash,
  full_name,
  email_verified,
  plan,
  conversions_limit
) VALUES (
  'admin@pdflab.pro',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIjU8U7W5.',
  'Admin User',
  TRUE,
  'pro',
  999999
) ON DUPLICATE KEY UPDATE id=id; -- Don't insert if already exists

-- ============================================================================
-- 14. INDEXES FOR ANALYTICS QUERIES
-- ============================================================================

-- Index for daily active users query
CREATE INDEX idx_last_login_date ON users(DATE(last_login));

-- Index for conversion analytics
CREATE INDEX idx_conversion_date_type ON conversion_history(DATE(created_at), conversion_type);

-- Index for revenue calculations
CREATE INDEX idx_subscription_billing ON subscriptions(status, next_billing_date);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables were created
SELECT
  TABLE_NAME,
  TABLE_ROWS,
  CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'users',
    'conversion_history',
    'pending_uploads',
    'subscriptions',
    'payment_transactions',
    'email_logs',
    'refresh_tokens',
    'audit_logs'
  )
ORDER BY TABLE_NAME;
