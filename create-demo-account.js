/**
 * Create a verified demo account for testing PDF conversion
 */

const axios = require('axios');
const Database = require('better-sqlite3');
const path = require('path');

const API_BASE = 'http://localhost:3015/api';
const DB_PATH = path.join(__dirname, 'backend', 'data', 'pdflab.db');

async function createDemoAccount() {
  console.log('🎯 Creating Demo Account for PDF Conversion Testing\n');

  const demoEmail = 'demo@pdflab.pro';
  const demoPassword = 'Demo123!';

  try {
    // Step 1: Try to register (might already exist)
    console.log('📝 Step 1: Registering demo account...');
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        email: demoEmail,
        password: demoPassword,
        plan: 'pro' // Pro plan = unlimited conversions
      });
      console.log('✅ Demo account registered successfully\n');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️  Demo account already exists\n');
      } else {
        throw error;
      }
    }

    // Step 2: Manually verify email in database
    console.log('📝 Step 2: Verifying email in database...');
    const db = new Database(DB_PATH);

    const result = db.prepare(`
      UPDATE users
      SET email_verified = 1,
          plan = 'pro',
          conversions_limit = 999999
      WHERE email = ?
    `).run(demoEmail);

    if (result.changes > 0) {
      console.log('✅ Email verified and upgraded to Pro plan\n');
    } else {
      console.log('⚠️  Account not found in database\n');
    }

    // Step 3: Get user details
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(demoEmail);
    db.close();

    console.log('═'.repeat(60));
    console.log('🎉 DEMO ACCOUNT READY FOR TESTING');
    console.log('═'.repeat(60));
    console.log('\n📧 Email:', demoEmail);
    console.log('🔑 Password:', demoPassword);
    console.log('📦 Plan:', user.plan.toUpperCase());
    console.log('✅ Email Verified:', user.email_verified ? 'YES' : 'NO');
    console.log('🔢 Conversions Used:', user.conversions_used);
    console.log('🎯 Conversions Limit:', user.conversions_limit === 999999 ? 'UNLIMITED' : user.conversions_limit);
    console.log('\n' + '═'.repeat(60));
    console.log('\n🚀 READY TO TEST PDF CONVERSION!');
    console.log('\n📝 HOW TO USE:');
    console.log('   1. Go to: http://localhost:3002');
    console.log('   2. Click "Login" or "Sign In"');
    console.log(`   3. Enter email: ${demoEmail}`);
    console.log(`   4. Enter password: ${demoPassword}`);
    console.log('   5. Upload a PDF and convert to PowerPoint!');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

createDemoAccount();
