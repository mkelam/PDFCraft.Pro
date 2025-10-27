# ☁️ CloudConvert Quick Start - PDFLab.Pro

## 🚀 Get Started in 3 Steps

### Step 1: Configure API Key
Edit `backend/.env.production`:
```env
CLOUDCONVERT_API_KEY=your_api_key_here
CLOUDCONVERT_SANDBOX=false
```

### Step 2: Start Server
```bash
cd backend
npm run dev
```

### Step 3: Test Conversion
Open: http://localhost:3001/test-cloudconvert.html

---

## 📋 API Endpoints

### Convert PDF to PowerPoint
```bash
POST /api/cloudconvert/pdf-to-ppt
Content-Type: multipart/form-data

file: [PDF file]
```

### Check Status
```bash
GET /api/cloudconvert/status/:jobId
```

### Test Connection
```bash
GET /api/cloudconvert/test
```

### Get Account Info
```bash
GET /api/cloudconvert/info
```

---

## 💻 Code Examples

### JavaScript/Fetch
```javascript
const formData = new FormData();
formData.append('file', pdfFile);

const response = await fetch('http://localhost:3001/api/cloudconvert/pdf-to-ppt', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.data.downloadUrl);
```

### cURL
```bash
curl -X POST http://localhost:3001/api/cloudconvert/pdf-to-ppt \
  -F "file=@document.pdf"
```

### React Component
```tsx
const convertPDF = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/cloudconvert/pdf-to-ppt', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();

  if (data.success) {
    window.location.href = data.data.downloadUrl;
  }
};
```

---

## 🎯 File Limits

- **Max File Size**: 100MB
- **Supported Format**: PDF only
- **Output Format**: PPTX (PowerPoint)

---

## 💰 Pricing Guide

- **Free**: 25 conversion minutes/month
- **Small PDF** (~5 pages): ~5 seconds
- **Medium PDF** (~20 pages): ~15 seconds
- **Large PDF** (~50 pages): ~30 seconds

**Example**: 100 conversions of 20-page PDFs = ~25 minutes = FREE!

---

## 🔧 Troubleshooting

### Error: "API key not configured"
→ Update `.env` file with your CloudConvert API key

### Error: "File too large"
→ File exceeds 100MB limit, reduce file size

### Error: "Conversion failed"
→ Check CloudConvert dashboard for quota/status

---

## 📚 Resources

- **Full Documentation**: [CLOUDCONVERT_INTEGRATION_COMPLETE.md](../CLOUDCONVERT_INTEGRATION_COMPLETE.md)
- **Test Interface**: http://localhost:3001/test-cloudconvert.html
- **CloudConvert Dashboard**: https://cloudconvert.com/dashboard

---

**Ready to convert?** Upload a PDF at the test interface and see CloudConvert in action! 🎉
