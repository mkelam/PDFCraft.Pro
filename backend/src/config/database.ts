import mysql from 'mysql2/promise';
import { DatabaseConfig } from '@/types';

let connection: mysql.Connection;

export const connectDatabase = async (config: DatabaseConfig): Promise<void> => {
  try {
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      charset: 'utf8mb4',
      timezone: 'Z',
      acquireTimeout: 60000,
      timeout: 60000,
    });

    console.log('✅ Database connected successfully');

    // Create tables if they don't exist
    await createTables();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

export const getConnection = (): mysql.Connection => {
  if (!connection) {
    throw new Error('Database not connected');
  }
  return connection;
};

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
      type ENUM('pdf-to-ppt', 'pdf-merge') NOT NULL,
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

  try {
    await connection.execute(createUsersTable);
    await connection.execute(createJobsTable);
    await connection.execute(createAnalyticsTable);
    console.log('✅ Database tables created/verified');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

export const closeConnection = async (): Promise<void> => {
  if (connection) {
    await connection.end();
    console.log('Database connection closed');
  }
};