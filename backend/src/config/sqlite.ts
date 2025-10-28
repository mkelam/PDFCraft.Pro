import Database from 'better-sqlite3';
import path from 'path';
import { promises as fs } from 'fs';

let db: Database.Database;

export const connectSQLite = async (): Promise<void> => {
  try {
    // Create database directory if it doesn't exist
    const dbDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dbDir, { recursive: true });

    // Connect to SQLite database
    const dbPath = path.join(dbDir, 'pdflab.db');
    db = new Database(dbPath);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    console.log('✅ SQLite database connected successfully');

    // Run migrations first
    await runMigrations();

    // Create tables
    await createTables();
  } catch (error) {
    console.error('❌ SQLite connection failed:', error);
    throw error;
  }
};

export const getSQLiteConnection = (): Database.Database => {
  if (!db) {
    throw new Error('SQLite database not connected');
  }
  return db;
};

const runMigrations = async (): Promise<void> => {
  try {
    console.log('🔧 Running database migrations...');

    // Migration 1: Check if users table has verification_token column
    const usersTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as any;

    if (usersTableInfo && usersTableInfo.sql && !usersTableInfo.sql.includes('verification_token')) {
      console.log('📋 Migrating users table to add verification columns...');

      // Drop the old users table if it exists (only in development)
      db.exec('DROP TABLE IF EXISTS users');
      console.log('✅ Migration completed: users table will be recreated with verification columns');
    }

    // Migration 2: Check if conversion_jobs table exists and has the old constraint
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='conversion_jobs'").get() as any;

    if (tableInfo && tableInfo.sql && !tableInfo.sql.includes("'pdf-to-images'")) {
      console.log('📋 Migrating conversion_jobs table to include pdf-to-images type...');

      // Create new table with correct constraints
      db.exec(`
        CREATE TABLE conversion_jobs_new (
          id TEXT PRIMARY KEY,
          user_id INTEGER,
          type TEXT NOT NULL CHECK (type IN ('pdf-to-ppt', 'pdf-merge', 'pdf-to-images')),
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
          progress INTEGER DEFAULT 0,
          input_files TEXT NOT NULL,
          output_file TEXT,
          error_message TEXT,
          processing_time INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      // Copy data from old table to new table
      const existingData = db.prepare("SELECT COUNT(*) as count FROM conversion_jobs").get() as any;
      if (existingData && existingData.count > 0) {
        console.log(`📦 Copying ${existingData.count} existing records...`);
        db.exec(`
          INSERT INTO conversion_jobs_new
          SELECT * FROM conversion_jobs
        `);
      }

      // Drop old table and rename new one
      db.exec('DROP TABLE conversion_jobs');
      db.exec('ALTER TABLE conversion_jobs_new RENAME TO conversion_jobs');

      // Recreate indexes
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON conversion_jobs(user_id);
        CREATE INDEX IF NOT EXISTS idx_jobs_status ON conversion_jobs(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON conversion_jobs(created_at);
      `);

      console.log('✅ Migration completed: pdf-to-images type now supported');
    }

    console.log('✅ All database migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    // Don't throw error here - let the app continue with existing schema
  }
};

const createTables = async (): Promise<void> => {
  try {
    // Users table (with email verification fields)
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT, -- password_hash in MySQL, can be NULL for OAuth users
        full_name TEXT,

        -- Authentication & Verification
        email_verified INTEGER DEFAULT 0, -- BOOLEAN (0/1)
        verification_token TEXT UNIQUE,
        verification_token_expires DATETIME,
        password_reset_token TEXT UNIQUE,
        password_reset_expires DATETIME,

        -- OAuth Integration
        oauth_provider TEXT DEFAULT 'local' CHECK (oauth_provider IN ('google', 'local')),
        oauth_id TEXT,
        avatar_url TEXT,

        -- Subscription & Plan
        plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
        billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
        subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),

        -- Usage Tracking (Rolling 30-Day Windows)
        registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        usage_reset_date DATETIME, -- registration_date + 30 days
        conversions_used INTEGER DEFAULT 0,
        conversions_limit INTEGER DEFAULT 3, -- Free: 3, Starter: 100, Pro: 999999

        -- File Size Limits (in bytes)
        file_size_limit INTEGER DEFAULT 10485760, -- Free: 10MB, Starter: 25MB, Pro: 100MB

        -- PayFast Integration
        payfast_subscription_token TEXT,
        payfast_customer_id TEXT,

        -- Session & Security
        last_login DATETIME,
        login_attempts INTEGER DEFAULT 0,
        locked_until DATETIME,

        -- Metadata
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Conversion jobs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversion_jobs (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        type TEXT NOT NULL CHECK (type IN ('pdf-to-ppt', 'pdf-merge', 'pdf-to-images')),
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        progress INTEGER DEFAULT 0,
        input_files TEXT NOT NULL,
        output_file TEXT,
        error_message TEXT,
        processing_time INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Analytics table
    db.exec(`
      CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        event_type TEXT NOT NULL,
        event_data TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Payment transactions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference TEXT UNIQUE,
        payment_id TEXT UNIQUE,
        payfast_payment_id TEXT,
        user_id INTEGER,
        email TEXT NOT NULL,
        plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro', 'enterprise')),
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'ZAR',
        payment_provider TEXT DEFAULT 'payfast' CHECK (payment_provider IN ('payfast')),
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'abandoned', 'cancelled', 'COMPLETE', 'FAILED', 'CANCELLED')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        verified_at DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Email logs table (for email verification tracking)
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        recipient_email TEXT NOT NULL,
        email_type TEXT NOT NULL CHECK (email_type IN (
          'verification', 'welcome', 'password_reset', 'limit_warning',
          'limit_reached', 'limit_reset', 'payment_success',
          'payment_failed', 'subscription_canceled'
        )),
        subject TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
        sent_at DATETIME,
        failure_reason TEXT,
        esp_message_id TEXT,
        esp_response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Refresh tokens table (for JWT token management)
    db.exec(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        token_family TEXT,
        expires_at DATETIME NOT NULL,
        revoked INTEGER DEFAULT 0, -- BOOLEAN (0/1)
        revoked_at DATETIME,
        replaced_by_token TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Audit logs table (for security tracking)
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL CHECK (action IN (
          'user_registered', 'user_login', 'user_logout', 'email_verified',
          'password_changed', 'password_reset_requested', 'plan_upgraded',
          'plan_downgraded', 'subscription_canceled', 'file_uploaded',
          'conversion_completed', 'conversion_failed'
        )),
        description TEXT,
        ip_address TEXT,
        user_agent TEXT,
        metadata TEXT, -- JSON string
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create indexes for better performance
    db.exec(`
      -- Users table indexes
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
      CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
      CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);

      -- Conversion jobs indexes
      CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON conversion_jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON conversion_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON conversion_jobs(created_at);

      -- Analytics indexes
      CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);

      -- Payment transactions indexes
      CREATE INDEX IF NOT EXISTS idx_payment_reference ON payment_transactions(reference);
      CREATE INDEX IF NOT EXISTS idx_payment_id ON payment_transactions(payment_id);
      CREATE INDEX IF NOT EXISTS idx_payfast_payment_id ON payment_transactions(payfast_payment_id);
      CREATE INDEX IF NOT EXISTS idx_payment_user_id ON payment_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_transactions(status);
      CREATE INDEX IF NOT EXISTS idx_payment_provider ON payment_transactions(payment_provider);
      CREATE INDEX IF NOT EXISTS idx_payment_created_at ON payment_transactions(created_at);

      -- Email logs indexes
      CREATE INDEX IF NOT EXISTS idx_email_user_id ON email_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_recipient ON email_logs(recipient_email);
      CREATE INDEX IF NOT EXISTS idx_email_type_status ON email_logs(email_type, status);

      -- Refresh tokens indexes
      CREATE INDEX IF NOT EXISTS idx_refresh_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_token ON refresh_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_refresh_expires ON refresh_tokens(expires_at);

      -- Audit logs indexes
      CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    `);

    console.log('✅ SQLite tables created/verified');
  } catch (error) {
    console.error('❌ Error creating SQLite tables:', error);
    throw error;
  }
};

export const closeSQLite = (): void => {
  if (db) {
    db.close();
    console.log('SQLite database connection closed');
  }
};

// Alias for getSQLiteConnection to match database.ts export
export const getSQLite = getSQLiteConnection;