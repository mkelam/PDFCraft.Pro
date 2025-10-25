const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'pdfcraft.db');
const db = new Database(dbPath);

// Hash the password
const password = 'Demo123!';
const hashedPassword = bcrypt.hashSync(password, 10);

// Create demo user directly
const email = 'demo@pdfcraft.pro';

// Check if user already exists
const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

if (existingUser) {
  // Update existing user
  const result = db.prepare(`
    UPDATE users
    SET password = ?,
        email_verified = 1,
        verification_token = NULL,
        verification_token_expires = NULL
    WHERE email = ?
  `).run(hashedPassword, email);

  console.log('✅ Updated existing user:', email);
} else {
  // Create new user
  const result = db.prepare(`
    INSERT INTO users (email, password, email_verified, plan, conversions_used, conversions_limit, created_at, updated_at)
    VALUES (?, ?, 1, 'free', 0, 3, datetime('now'), datetime('now'))
  `).run(email, hashedPassword);

  console.log('✅ Created new user:', email);
}

// Verify the user
const user = db.prepare('SELECT id, email, email_verified, plan, conversions_used, conversions_limit FROM users WHERE email = ?').get(email);

console.log('\n📊 User Details:');
console.log(JSON.stringify(user, null, 2));
console.log('\n🔐 Login Credentials:');
console.log('   Email:', email);
console.log('   Password:', password);
console.log('\n🌐 Login at: http://localhost:3000/login');

db.close();
