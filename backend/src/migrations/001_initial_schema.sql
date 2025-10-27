-- ================================
-- pdflab.pro DATABASE SCHEMA
-- ================================
-- Migration: 001_initial_schema
-- Created: 2025-10-23
-- Description: Initial database schema for pdflab.pro production

-- ================================
-- USERS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),

  -- Subscription Information
  plan ENUM('free', 'starter', 'pro', 'enterprise') DEFAULT 'free' NOT NULL,
  subscription_status ENUM('active', 'cancelled', 'expired', 'trial') DEFAULT 'active',
  subscription_start_date TIMESTAMP NULL,
  subscription_end_date TIMESTAMP NULL,

  -- Usage Tracking
  conversions_used_today INT DEFAULT 0 NOT NULL,
  conversions_used_month INT DEFAULT 0 NOT NULL,
  conversions_total INT DEFAULT 0 NOT NULL,

  -- Usage Limits (based on plan)
  daily_limit INT DEFAULT 3 NOT NULL,
  monthly_limit INT DEFAULT 3 NOT NULL,

  -- Account Status
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  is_admin BOOLEAN DEFAULT FALSE,

  -- Password Reset
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,

  -- Indexes
  INDEX idx_email (email),
  INDEX idx_plan (plan),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- CONVERSION JOBS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS conversion_jobs (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT,

  -- Job Information
  type ENUM('pdf-to-ppt', 'pdf-merge', 'pdf-to-excel', 'pdf-to-word') NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending' NOT NULL,
  progress INT DEFAULT 0,

  -- File Information
  input_files JSON NOT NULL,
  output_file VARCHAR(500),
  original_filename VARCHAR(255),
  file_size BIGINT,
  page_count INT,

  -- Processing Details
  engine_used VARCHAR(100),
  ocr_enabled BOOLEAN DEFAULT FALSE,
  quality_score FLOAT,
  processing_time_ms INT,

  -- Error Handling
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,

  -- Metadata
  metadata JSON,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- PAYMENT TRANSACTIONS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,

  -- Transaction Information
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  payment_provider ENUM('payfast', 'stripe') NOT NULL,

  -- Payment Details
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'ZAR',
  plan ENUM('starter', 'pro', 'enterprise') NOT NULL,

  -- Status
  status ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled') DEFAULT 'pending',
  payment_method VARCHAR(50),

  -- Provider-Specific Data
  provider_transaction_id VARCHAR(255),
  provider_response JSON,

  -- Subscription Information
  subscription_start_date TIMESTAMP NULL,
  subscription_end_date TIMESTAMP NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  billing_cycle ENUM('monthly', 'annually', 'lifetime') DEFAULT 'monthly',

  -- Webhooks & Notifications
  webhook_received BOOLEAN DEFAULT FALSE,
  webhook_data JSON,
  notification_sent BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- API KEYS TABLE (For Enterprise)
-- ================================
CREATE TABLE IF NOT EXISTS api_keys (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,

  -- API Key Information
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,  -- For display (e.g., "pk_live_abc...")
  name VARCHAR(255),

  -- Permissions
  permissions JSON,  -- ["convert", "merge", "download"]

  -- Usage Tracking
  requests_made INT DEFAULT 0,
  requests_limit INT,
  last_used_at TIMESTAMP NULL,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_key_hash (key_hash),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- USAGE ANALYTICS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS usage_analytics (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  job_id VARCHAR(36),

  -- Event Information
  event_type ENUM('conversion_start', 'conversion_complete', 'conversion_failed', 'download', 'payment', 'signup', 'login') NOT NULL,

  -- Metrics
  processing_time_ms INT,
  file_size_bytes BIGINT,
  page_count INT,
  quality_score FLOAT,

  -- User Agent & IP
  ip_address VARCHAR(45),
  user_agent TEXT,
  country VARCHAR(2),

  -- Metadata
  metadata JSON,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (job_id) REFERENCES conversion_jobs(id) ON DELETE SET NULL,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- SESSIONS TABLE (Optional - for session store)
-- ================================
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  user_id INT,

  -- Session Data
  session_data JSON,
  expires_at TIMESTAMP NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- AUDIT LOG TABLE
-- ================================
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,

  -- Action Information
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),

  -- Details
  old_value JSON,
  new_value JSON,

  -- Context
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- DEFAULT ADMIN USER (Development Only)
-- ================================
-- Password: Admin123!@# (hashed with bcrypt)
INSERT INTO users (email, password_hash, name, plan, is_admin, email_verified, daily_limit, monthly_limit)
VALUES (
  'admin@pdflab.pro',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyVpLzjqhZxa',  -- Hash of 'Admin123!@#'
  'System Administrator',
  'enterprise',
  TRUE,
  TRUE,
  999999,
  999999
) ON DUPLICATE KEY UPDATE email=email;

-- ================================
-- VIEWS FOR REPORTING
-- ================================
CREATE OR REPLACE VIEW user_statistics AS
SELECT
  u.id,
  u.email,
  u.name,
  u.plan,
  u.subscription_status,
  u.conversions_total,
  u.created_at,
  COUNT(DISTINCT cj.id) as total_jobs,
  COUNT(DISTINCT CASE WHEN cj.status = 'completed' THEN cj.id END) as successful_jobs,
  COUNT(DISTINCT CASE WHEN cj.status = 'failed' THEN cj.id END) as failed_jobs,
  AVG(cj.processing_time_ms) as avg_processing_time,
  SUM(CASE WHEN pt.status = 'completed' THEN pt.amount ELSE 0 END) as total_revenue
FROM users u
LEFT JOIN conversion_jobs cj ON u.id = cj.user_id
LEFT JOIN payment_transactions pt ON u.id = pt.user_id
GROUP BY u.id;

-- ================================
-- STORED PROCEDURES
-- ================================

-- Reset Daily Usage Counters (Run daily via cron)
DELIMITER //
CREATE PROCEDURE reset_daily_usage()
BEGIN
  UPDATE users SET conversions_used_today = 0;
  SELECT 'Daily usage counters reset' as message;
END//
DELIMITER ;

-- Reset Monthly Usage Counters (Run monthly via cron)
DELIMITER //
CREATE PROCEDURE reset_monthly_usage()
BEGIN
  UPDATE users SET conversions_used_month = 0;
  SELECT 'Monthly usage counters reset' as message;
END//
DELIMITER ;

-- Cleanup Old Jobs (Run daily via cron)
DELIMITER //
CREATE PROCEDURE cleanup_old_jobs()
BEGIN
  -- Delete completed jobs older than 7 days
  DELETE FROM conversion_jobs
  WHERE status = 'completed'
  AND completed_at < DATE_SUB(NOW(), INTERVAL 7 DAY);

  -- Delete failed jobs older than 3 days
  DELETE FROM conversion_jobs
  WHERE status = 'failed'
  AND created_at < DATE_SUB(NOW(), INTERVAL 3 DAY);

  SELECT ROW_COUNT() as jobs_deleted;
END//
DELIMITER ;

-- ================================
-- TRIGGERS
-- ================================

-- Update user statistics after job completion
DELIMITER //
CREATE TRIGGER after_job_complete
AFTER UPDATE ON conversion_jobs
FOR EACH ROW
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE users
    SET conversions_total = conversions_total + 1,
        conversions_used_today = conversions_used_today + 1,
        conversions_used_month = conversions_used_month + 1
    WHERE id = NEW.user_id;
  END IF;
END//
DELIMITER ;

-- ================================
-- GRANT PERMISSIONS (Production)
-- ================================
-- Run these after creating the production user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON pdflab_prod.* TO 'pdflab_user'@'localhost';
-- GRANT EXECUTE ON PROCEDURE pdflab_prod.reset_daily_usage TO 'pdflab_user'@'localhost';
-- GRANT EXECUTE ON PROCEDURE pdflab_prod.reset_monthly_usage TO 'pdflab_user'@'localhost';
-- GRANT EXECUTE ON PROCEDURE pdflab_prod.cleanup_old_jobs TO 'pdflab_user'@'localhost';
-- FLUSH PRIVILEGES;

-- ================================
-- MIGRATION COMPLETE
-- ================================
SELECT 'Database schema created successfully!' as status;
SELECT 'Run SHOW TABLES to verify' as next_step;
