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
    const dbPath = path.join(dbDir, 'pdfcraft.db');
    db = new Database(dbPath);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    console.log('✅ SQLite database connected successfully');

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

const createTables = async (): Promise<void> => {
  try {
    // Users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
        conversions_used INTEGER DEFAULT 0,
        conversions_limit INTEGER DEFAULT 3,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Conversion jobs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversion_jobs (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        type TEXT NOT NULL CHECK (type IN ('pdf-to-ppt', 'pdf-merge')),
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

    // Create indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON conversion_jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON conversion_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON conversion_jobs(created_at);
      CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
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