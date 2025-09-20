const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Test routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PDFCraft.Pro API Server is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    services: {
      database: 'mock',
      redis: 'mock',
      libreoffice: 'mock'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
});