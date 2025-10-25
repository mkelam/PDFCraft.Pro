const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'pdfcraft.db');
const db = new Database(dbPath);

// Update the test user to be verified
const result = db.prepare(`
  UPDATE users
  SET email_verified = 1,
      verification_token = NULL,
      verification_token_expires = NULL
  WHERE email = 'testuser@example.com'
`).run();

console.log(`Updated ${result.changes} user(s)`);

// Check the user
const user = db.prepare('SELECT id, email, email_verified, plan FROM users WHERE email = ?').get('testuser@example.com');

if (user) {
  console.log('\n✅ User verified successfully:');
  console.log(JSON.stringify(user, null, 2));
  console.log('\n📧 You can now login with:');
  console.log('   Email: testuser@example.com');
  console.log('   Password: (the password you set when registering)');
} else {
  console.log('❌ User not found');
}

db.close();
