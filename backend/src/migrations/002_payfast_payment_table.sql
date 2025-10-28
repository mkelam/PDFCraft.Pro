-- ================================
-- PAYFAST PAYMENT TRANSACTIONS TABLE
-- ================================
-- Migration: 002_payfast_payment_table
-- Created: 2025-10-23
-- Description: Additional payment tracking table for PayFast integration

-- Note: The main payment_transactions table exists in 001_initial_schema.sql
-- This migration adds PayFast-specific columns and indexes

-- Add PayFast-specific columns if they don't exist
ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS email VARCHAR(255) AFTER user_id,
ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255) AFTER transaction_id,
ADD COLUMN IF NOT EXISTS payfast_payment_id VARCHAR(255) AFTER provider_transaction_id,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP NULL AFTER webhook_received;

-- Update payment_id column to be unique if not already
ALTER TABLE payment_transactions
ADD UNIQUE INDEX IF NOT EXISTS idx_payment_id (payment_id);

-- Add index for PayFast payment ID lookups
ALTER TABLE payment_transactions
ADD INDEX IF NOT EXISTS idx_payfast_payment_id (payfast_payment_id);

-- Add index for email lookups
ALTER TABLE payment_transactions
ADD INDEX IF NOT EXISTS idx_email (email);

-- ================================
-- MIGRATION COMPLETE
-- ================================
SELECT 'PayFast payment table updated successfully!' as status;
