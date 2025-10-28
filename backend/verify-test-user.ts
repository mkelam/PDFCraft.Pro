/**
 * Verify and setup test user for e2e testing
 */

import Database from 'better-sqlite3';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';

const dbPath = path.join(__dirname, 'data', 'pdflab.db');
const db = new Database(dbPath);

const TEST_EMAIL = 'mmkela@gmail.com';
const TEST_PASSWORD = 'Test@1234';

async function verifyAndSetupUser() {
  console.log('🔍 Checking test user in database...\n');

  // Check if user exists
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(TEST_EMAIL);

  if (!user) {
    console.log('❌ User not found. Creating new user...');

    // Hash password
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    // Create user
    const result = db.prepare(`
      INSERT INTO users (email, password, plan, email_verified, conversions_limit)
      VALUES (?, ?, ?, ?, ?)
    `).run(TEST_EMAIL, hashedPassword, 'pro', 1, 999999);

    console.log('✅ User created successfully');
    console.log('   ID:', result.lastInsertRowid);
    console.log('   Email:', TEST_EMAIL);
    console.log('   Plan: pro');
    console.log('   Email Verified: Yes');
    console.log('   Password:', TEST_PASSWORD);
  } else {
    console.log('✅ User found in database');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Plan:', user.plan);
    console.log('   Email Verified:', user.email_verified === 1 ? 'Yes' : 'No');
    console.log('   Conversions Limit:', user.conversions_limit);

    // Update user: reset password, verify email, upgrade to pro
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    db.prepare(`
      UPDATE users
      SET password = ?,
          email_verified = 1,
          plan = 'pro',
          conversions_limit = 999999
      WHERE email = ?
    `).run(hashedPassword, TEST_EMAIL);

    console.log('\n✅ User updated for testing:');
    console.log('   ✓ Password reset to:', TEST_PASSWORD);
    console.log('   ✓ Email verified: Yes');
    console.log('   ✓ Plan upgraded to: Pro');
    console.log('   ✓ Conversions limit: 999,999');
  }

  // Verify password works
  const updatedUser = db.prepare('SELECT * FROM users WHERE email = ?').get(TEST_EMAIL);
  const passwordMatch = await bcrypt.compare(TEST_PASSWORD, updatedUser.password);

  console.log('\n🔐 Password verification:', passwordMatch ? '✅ PASS' : '❌ FAIL');

  db.close();
}

verifyAndSetupUser().catch(console.error);
