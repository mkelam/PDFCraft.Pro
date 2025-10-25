import mysql from 'mysql2/promise';
import { DatabaseConfig } from '../types';
import { connectSQLite, getSQLiteConnection, getSQLite as getSQLiteDB, closeSQLite } from './sqlite';
import { logger } from '../utils/logger';

let connection: mysql.Connection;
const isProduction = process.env.NODE_ENV === 'production';

export const connectDatabase = async (config?: DatabaseConfig): Promise<void> => {
  try {
    if (isProduction && config) {
      // Use MySQL in production (basic setup for now)
      connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
        charset: 'utf8mb4',
        timezone: 'Z'
      });

      logger.info('✅ MySQL database connected successfully');
      await createTables();
    } else {
      // Use SQLite for local development
      await connectSQLite();
      logger.info('✅ SQLite database connected for development');
    }
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
};

export const getConnection = (): mysql.Connection => {
  if (!connection) {
    throw new Error('MySQL connection not available');
  }
  return connection;
};

// Export connection for production use (compatibility)
export const getOptimizedConnection = () => {
  return {
    executeQuery: async (query: string, values: any[] = []) => {
      if (isProduction) {
        const [rows] = await connection.execute(query, values);
        return rows;
      } else {
        // Use SQLite
        const db = getSQLite();
        if (query.toLowerCase().includes('insert')) {
          const stmt = db.prepare(query);
          const result = stmt.run(...values);
          return [{ insertId: result.lastInsertRowid, affectedRows: result.changes }];
        } else if (query.toLowerCase().includes('update')) {
          const stmt = db.prepare(query);
          const result = stmt.run(...values);
          return [{ affectedRows: result.changes }];
        } else {
          const stmt = db.prepare(query);
          return stmt.all(...values);
        }
      }
    },
    healthCheck: async () => ({ status: 'healthy', details: {} }),
    shutdown: async () => {}
  };
};

export const getSQLite = () => {
  return getSQLiteDB();
};

// Legacy table creation for backward compatibility
const createTables = async (): Promise<void> => {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      plan ENUM('free', 'starter', 'pro', 'enterprise') DEFAULT 'free',
      conversions_used INT DEFAULT 0,
      conversions_limit INT DEFAULT 3,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_plan (plan)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const createJobsTable = `
    CREATE TABLE IF NOT EXISTS conversion_jobs (
      id VARCHAR(36) PRIMARY KEY,
      user_id INT,
      type ENUM('pdf-to-ppt', 'pdf-merge', 'pdf-to-images') NOT NULL,
      status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
      progress INT DEFAULT 0,
      input_files JSON NOT NULL,
      output_file VARCHAR(255),
      error_message TEXT,
      processing_time INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const createAnalyticsTable = `
    CREATE TABLE IF NOT EXISTS analytics (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      event_type VARCHAR(50) NOT NULL,
      event_data JSON,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_event_type (event_type),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const createPaymentTransactionsTable = `
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      reference VARCHAR(255) UNIQUE NULL,
      payment_id VARCHAR(255) UNIQUE NULL,
      payfast_payment_id VARCHAR(255) NULL,
      user_id INT,
      email VARCHAR(255) NOT NULL,
      plan ENUM('starter', 'pro', 'enterprise') NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'ZAR',
      payment_provider ENUM('payfast') DEFAULT 'payfast',
      status ENUM('pending', 'success', 'failed', 'abandoned', 'cancelled', 'COMPLETE', 'FAILED', 'CANCELLED') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      verified_at TIMESTAMP NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_reference (reference),
      INDEX idx_payment_id (payment_id),
      INDEX idx_payfast_payment_id (payfast_payment_id),
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_payment_provider (payment_provider),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  try {
    await connection.execute(createUsersTable);
    await connection.execute(createJobsTable);
    await connection.execute(createAnalyticsTable);
    await connection.execute(createPaymentTransactionsTable);
    console.log('✅ Database tables created/verified');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

export const closeConnection = async (): Promise<void> => {
  if (isProduction && connection) {
    // Close MySQL connection
    await connection.end();
    logger.info('✅ MySQL connection closed');
  } else {
    // Close SQLite for development
    closeSQLite();
    logger.info('✅ SQLite connection closed');
  }
};