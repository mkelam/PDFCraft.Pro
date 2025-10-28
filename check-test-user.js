/**
 * Check if test user exists and create if needed
 */

const API_BASE_URL = 'http://localhost:3015';

async function checkAndCreateUser() {
  console.log('🔍 Checking test user...\n');

  // Try to register the user (will fail if exists)
  const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'mmkela@gmail.com',
      password: 'Test@1234',
      name: 'Test User'
    }),
  });

  if (registerResponse.ok) {
    const data = await registerResponse.json();
    console.log('✅ User registered successfully');
    console.log('   User ID:', data.user.id);
    console.log('   Email:', data.user.email);
    console.log('   Email Verified:', data.user.email_verified);
    console.log('\n⚠️  Note: Email needs to be verified before testing conversions');
    return data;
  } else {
    const error = await registerResponse.json();
    if (error.error?.code === 'USER_EXISTS') {
      console.log('✅ User already exists');
      console.log('   Attempting login...\n');

      // Try to login
      const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'mmkela@gmail.com',
          password: 'Test@1234'
        }),
      });

      if (loginResponse.ok) {
        const data = await loginResponse.json();
        console.log('✅ Login successful');
        console.log('   User ID:', data.user.id);
        console.log('   Email:', data.user.email);
        console.log('   Plan:', data.user.plan);
        console.log('   Email Verified:', data.user.email_verified);
        console.log('   Token:', data.token.substring(0, 30) + '...');
        return data;
      } else {
        const loginError = await loginResponse.json();
        console.error('❌ Login failed:', loginError);
        console.log('\n💡 The user exists but password might be different.');
        console.log('   You can manually verify the user in the database:');
        console.log('   1. Open backend/data/pdflab.db with DB Browser for SQLite');
        console.log('   2. Check the users table');
        console.log('   3. Or manually set email_verified = 1 for mmkela@gmail.com');
      }
    } else {
      console.error('❌ Registration failed:', error);
    }
  }
}

checkAndCreateUser().catch(console.error);
