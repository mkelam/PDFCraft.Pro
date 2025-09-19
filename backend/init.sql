-- PDFCraft.Pro Database Initialization Script
-- This script creates the required tables for production deployment

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    plan ENUM('free', 'starter', 'pro', 'enterprise') DEFAULT 'free',
    stripe_customer_id VARCHAR(255),
    conversions_used INT DEFAULT 0,
    conversions_limit INT DEFAULT 3,
    last_reset_date DATE DEFAULT (CURRENT_DATE),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_email (email),
    INDEX idx_stripe_customer (stripe_customer_id),
    INDEX idx_plan (plan),
    INDEX idx_active (is_active)
);

-- Conversion jobs table
CREATE TABLE IF NOT EXISTS conversion_jobs (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT,
    type ENUM('pdf-to-ppt', 'pdf-merge') NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    progress INT DEFAULT 0,
    input_files JSON NOT NULL,
    output_file VARCHAR(255),
    file_size BIGINT,
    processing_time INT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 24 HOUR),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at),
    INDEX idx_expires_at (expires_at)
);

-- Subscriptions table for Stripe integration
CREATE TABLE IF NOT EXISTS subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_price_id VARCHAR(255) NOT NULL,
    status ENUM('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid') NOT NULL,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_stripe_subscription (stripe_subscription_id),
    INDEX idx_status (status)
);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS usage_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    job_id VARCHAR(36),
    operation_type ENUM('pdf-to-ppt', 'pdf-merge') NOT NULL,
    file_size BIGINT,
    processing_time INT,
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (job_id) REFERENCES conversion_jobs(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_operation_type (operation_type),
    INDEX idx_created_at (created_at),
    INDEX idx_success (success)
);

-- API keys table for enterprise customers
CREATE TABLE IF NOT EXISTS api_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    last_used_at TIMESTAMP NULL,
    requests_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_key_hash (key_hash),
    INDEX idx_active (is_active)
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_resets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at),
    UNIQUE KEY unique_user_token (user_id, token)
);

-- Insert default admin user (password: 'admin123' - change in production!)
INSERT IGNORE INTO users (email, password, plan, conversions_limit, first_name, last_name, email_verified)
VALUES (
    'admin@pdfcraft.pro',
    '$2b$10$rqYwgpR0.Lq1.YrJ6WZUJuE7kP8p.Xkh5LW3GvqKbLh5TzXs1wGlO',
    'enterprise',
    -1,
    'Admin',
    'User',
    TRUE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_user_created ON conversion_jobs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_logs(user_id, created_at);

-- Set up automatic cleanup of expired jobs (optional, can be handled by application)
-- CREATE EVENT IF NOT EXISTS cleanup_expired_jobs
-- ON SCHEDULE EVERY 1 HOUR
-- DO
--   DELETE FROM conversion_jobs WHERE expires_at < NOW() AND status IN ('completed', 'failed');