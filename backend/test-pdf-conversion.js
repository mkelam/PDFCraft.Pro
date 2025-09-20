const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Simple test server to test PDF conversion
const app = express();
const port = 3002;

// Setup file upload
const upload = multer({
  dest: 'temp/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

app.use(express.json());

// Test endpoint for PDF to PPT conversion
app.post('/test-convert', upload.single('pdf'), async (req, res) => {
  console.log('\n=== Testing PDF to PowerPoint Conversion ===\n');

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Import the TypeScript service (compiled)
    const { PDFService } = require('./dist/services/pdf.service');

    const inputPath = req.file.path;
    const outputDir = path.join(__dirname, 'uploads');

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    console.log(`📄 Input file: ${req.file.originalname}`);
    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`🚀 Starting conversion...`);

    const startTime = Date.now();

    // Perform conversion
    const outputFilename = await PDFService.convertPDFToPPT(inputPath, outputDir);

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log(`\n✅ Conversion completed!`);
    console.log(`⏱️  Processing time: ${processingTime}ms (${(processingTime / 1000).toFixed(2)}s)`);
    console.log(`📄 Output file: ${outputFilename}`);

    // Get file stats
    const outputPath = path.join(outputDir, outputFilename);
    const stats = await fs.stat(outputPath);

    // Clean up temp file
    await fs.unlink(inputPath);

    res.json({
      success: true,
      message: 'PDF converted successfully',
      outputFile: outputFilename,
      processingTime: `${processingTime}ms`,
      outputSize: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
      downloadUrl: `/download/${outputFilename}`
    });

  } catch (error) {
    console.error('❌ Conversion failed:', error);
    res.status(500).json({
      error: 'Conversion failed',
      message: error.message
    });
  }
});

// Download endpoint
app.get('/download/:filename', async (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);

  try {
    await fs.access(filePath);
    res.download(filePath);
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

// Test page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>PDF to PowerPoint Test</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          text-align: center;
          margin-bottom: 40px;
        }
        .upload-area {
          border: 3px dashed #667eea;
          border-radius: 8px;
          padding: 40px;
          text-align: center;
          transition: all 0.3s;
          cursor: pointer;
        }
        .upload-area:hover {
          border-color: #764ba2;
          background: #f8f9ff;
        }
        .upload-area.dragover {
          background: #f0f4ff;
          border-color: #4c51bf;
        }
        input[type="file"] {
          display: none;
        }
        .btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 30px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          margin-top: 20px;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        #result {
          margin-top: 30px;
          padding: 20px;
          border-radius: 8px;
          display: none;
        }
        .success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        .loading {
          display: none;
          text-align: center;
          margin: 20px 0;
        }
        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎯 PDF to PowerPoint Converter Test</h1>

        <div class="upload-area" id="uploadArea">
          <p style="font-size: 48px; margin: 0;">📄</p>
          <p style="font-size: 18px; color: #666;">Click to upload or drag & drop your PDF here</p>
          <p style="font-size: 14px; color: #999;">Maximum file size: 100MB</p>
          <input type="file" id="fileInput" accept=".pdf">
        </div>

        <button class="btn" id="convertBtn" disabled>Convert to PowerPoint</button>

        <div class="loading" id="loading">
          <div class="spinner"></div>
          <p>Converting your PDF... This may take a moment for quality conversion.</p>
        </div>

        <div id="result"></div>
      </div>

      <script>
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const convertBtn = document.getElementById('convertBtn');
        const loading = document.getElementById('loading');
        const result = document.getElementById('result');
        let selectedFile = null;

        // Click to upload
        uploadArea.addEventListener('click', () => fileInput.click());

        // File selection
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file && file.type === 'application/pdf') {
            selectedFile = file;
            uploadArea.innerHTML = \`
              <p style="font-size: 48px; margin: 0;">✅</p>
              <p style="font-size: 18px; color: #333;">\\${file.name}</p>
              <p style="font-size: 14px; color: #666;">\\${(file.size / 1024 / 1024).toFixed(2)} MB</p>
            \`;
            convertBtn.disabled = false;
          }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
          e.preventDefault();
          uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
          uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
          e.preventDefault();
          uploadArea.classList.remove('dragover');

          const file = e.dataTransfer.files[0];
          if (file && file.type === 'application/pdf') {
            selectedFile = file;
            fileInput.files = e.dataTransfer.files;
            uploadArea.innerHTML = \`
              <p style="font-size: 48px; margin: 0;">✅</p>
              <p style="font-size: 18px; color: #333;">\\${file.name}</p>
              <p style="font-size: 14px; color: #666;">\\${(file.size / 1024 / 1024).toFixed(2)} MB</p>
            \`;
            convertBtn.disabled = false;
          }
        });

        // Convert button
        convertBtn.addEventListener('click', async () => {
          if (!selectedFile) return;

          const formData = new FormData();
          formData.append('pdf', selectedFile);

          loading.style.display = 'block';
          result.style.display = 'none';
          convertBtn.disabled = true;

          try {
            const response = await fetch('/test-convert', {
              method: 'POST',
              body: formData
            });

            const data = await response.json();

            if (data.success) {
              result.className = 'success';
              result.innerHTML = \`
                <h3>✅ Conversion Successful!</h3>
                <p><strong>Processing Time:</strong> \\${data.processingTime}</p>
                <p><strong>Output Size:</strong> \\${data.outputSize}</p>
                <a href="\\${data.downloadUrl}" class="btn" style="display: inline-block; text-decoration: none;">
                  Download PowerPoint
                </a>
              \`;
            } else {
              throw new Error(data.error || 'Conversion failed');
            }
          } catch (error) {
            result.className = 'error';
            result.innerHTML = \`
              <h3>❌ Conversion Failed</h3>
              <p>\\${error.message}</p>
            \`;
          } finally {
            loading.style.display = 'none';
            result.style.display = 'block';
            convertBtn.disabled = false;
          }
        });
      </script>
    </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`\n🚀 PDF Conversion Test Server running at http://localhost:${port}`);
  console.log('📄 Upload a PDF file to test the conversion quality\n');
});