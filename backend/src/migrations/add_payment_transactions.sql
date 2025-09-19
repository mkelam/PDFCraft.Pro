-- Migration: Add payment transactions table for Paystack integration
-- Created: 2024-12-20

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reference VARCHAR(255) UNIQUE NOT NULL,
  user_id INT,
  email VARCHAR(255) NOT NULL,
  plan ENUM('starter', 'pro') NOT NULL,
  amount INT NOT NULL, -- Amount in kobo (NGN) or cents (USD)
  currency VARCHAR(3) DEFAULT 'NGN',
  status ENUM('pending', 'success', 'failed', 'abandoned') DEFAULT 'pending',
  paystack_reference VARCHAR(255),
  access_code VARCHAR(255),
  authorization_url TEXT,
  gateway_response TEXT,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP NULL,
  metadata JSON,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_reference (reference),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add payment-related columns to users table if they don't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS subscription_status ENUM('active', 'expired', 'cancelled') DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_expires ON users(subscription_expires_at);
CREATE INDEX IF NOT EXISTS idx_users_last_payment ON users(last_payment_at);

-- Update existing plan limits to match Paystack pricing
UPDATE users SET conversions_limit = CASE
  WHEN plan = 'starter' THEN 100
  WHEN plan = 'pro' THEN -1
  ELSE conversions_limit
END;