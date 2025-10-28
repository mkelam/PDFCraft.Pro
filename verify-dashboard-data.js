const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'data', 'pdflab.db');
const db = new Database(dbPath);

console.log('=== Verifying Dashboard Data ===\n');

// Get user information
const user = db.prepare('SELECT id, email, plan, conversions_used, conversions_limit FROM users WHERE email = ?').get('mmkela@gmail.com');
console.log('User:', user);
console.log('');

// Get recent conversions
const conversions = db.prepare(`
  SELECT
    id,
    type,
    status,
    input_files,
    output_file,
    processing_time,
    created_at,
    completed_at
  FROM conversion_jobs
  WHERE user_id = ?
  ORDER BY created_at DESC
  LIMIT 5
`).all(user.id);

console.log('Recent Conversions:');
conversions.forEach((conv, index) => {
  const inputFiles = JSON.parse(conv.input_files);
  const fileName = inputFiles[0].replace(/^[^_]+_/, ''); // Remove job ID prefix
  const fileSize = 25000; // Mock file size for demo

  console.log(`\n${index + 1}. ${fileName}`);
  console.log(`   ID: ${conv.id}`);
  console.log(`   Type: ${conv.type}`);
  console.log(`   Status: ${conv.status}`);
  console.log(`   Processing Time: ${conv.processing_time}ms`);
  console.log(`   Created: ${conv.created_at}`);
});

// Simulate the API response
console.log('\n\n=== Simulated API Response ===');
const apiResponse = {
  success: true,
  data: {
    history: conversions.map(conv => {
      const inputFiles = JSON.parse(conv.input_files);
      const fileName = inputFiles[0].replace(/^[^_]+_/, '');

      return {
        id: conv.id,
        type: conv.type,
        status: conv.status,
        fileName: fileName,
        fileSize: 25000,
        processingTime: conv.processing_time || 0,
        createdAt: conv.created_at,
        completedAt: conv.completed_at
      };
    }),
    pagination: {
      page: 1,
      limit: 5,
      total: conversions.length,
      pages: 1
    }
  },
  message: 'Conversion history retrieved successfully'
};

console.log(JSON.stringify(apiResponse, null, 2));

db.close();
