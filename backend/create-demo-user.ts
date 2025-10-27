/**
 * Create a verified demo account for testing PDF conversion
 */

import { db } from './src/config/sqlite';
import bcrypt from 'bcryptjs';

async function createDemoAccount() {
  console.log('🎯 Creating Demo Account for PDF Conversion Testing\n');

  const demoEmail = 'demo@pdflab.pro';
  const demoPassword = 'Demo123!';

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(demoPassword, 10);

    // Try to insert user (will fail if exists)
    try {
      db.prepare(`
        INSERT INTO users (email, password, plan, email_verified, conversions_limit, conversions_used)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(demoEmail, hashedPassword, 'pro', 1, 999999, 0);
      console.log('✅ Demo account created successfully\n');
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint')) {
        console.log('ℹ️  Demo account already exists, updating...\n');

        // Update existing account
        db.prepare(`
          UPDATE users
          SET email_verified = 1,
              plan = 'pro',
              conversions_limit = 999999,
              conversions_used = 0
          WHERE email = ?
        `).run(demoEmail);
        console.log('✅ Demo account updated\n');
      } else {
        throw error;
      }
    }

    // Get user details
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(demoEmail);

    console.log('═'.repeat(60));
    console.log('🎉 DEMO ACCOUNT READY FOR TESTING');
    console.log('═'.repeat(60));
    console.log('\n📧 Email:', demoEmail);
    console.log('🔑 Password:', demoPassword);
    console.log('📦 Plan:', (user as any).plan.toUpperCase());
    console.log('✅ Email Verified:', (user as any).email_verified ? 'YES' : 'NO');
    console.log('🔢 Conversions Used:', (user as any).conversions_used);
    console.log('🎯 Conversions Limit:', (user as any).conversions_limit === 999999 ? 'UNLIMITED' : (user as any).conversions_limit);
    console.log('\n' + '═'.repeat(60));
    console.log('\n🚀 READY TO TEST PDF CONVERSION!');
    console.log('\n📝 HOW TO USE:');
    console.log('   1. Go to: http://localhost:3002');
    console.log('   2. Click "Login" or "Sign In"');
    console.log(`   3. Enter email: ${demoEmail}`);
    console.log(`   4. Enter password: ${demoPassword}`);
    console.log('   5. Upload a PDF and convert to PowerPoint!');
    console.log('\n✨ This account has:');
    console.log('   - Pro plan (unlimited conversions)');
    console.log('   - Email already verified');
    console.log('   - Ready to use immediately');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createDemoAccount();
