# PDFCraft.Pro Backend

Lightning-fast PDF processing API with conversion and merging capabilities.

## Features

- **PDF to PowerPoint Conversion**: Convert PDFs to editable PPTX files in <5 seconds
- **PDF Merging**: Combine multiple PDFs into a single document in <2 seconds
- **User Authentication**: JWT-based auth with plan-based usage limits
- **Real-time Progress**: WebSocket updates for long-running operations
- **Stripe Integration**: Payment processing for premium plans
- **Queue System**: Redis-backed job processing with Bull

## Quick Start

### Development Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database Setup**
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE pdfcraft_db;
```

4. **Start Redis**
```bash
# Ubuntu/Debian
sudo systemctl start redis-server

# macOS
brew services start redis
```

5. **Start Development Server**
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Conversion
```
POST   /api/convert/pdf-to-ppt    - Convert PDF to PowerPoint
POST   /api/convert/merge         - Merge multiple PDFs
GET    /api/job/:jobId/status     - Check conversion status
GET    /api/download/:filename    - Download processed file
```

### Authentication (Coming Soon)
```
POST   /api/auth/register         - User registration
POST   /api/auth/login           - User login
GET    /api/auth/me              - Get current user
```

### Health Check
```
GET    /health                   - Server health status
```

## Usage Examples

### Convert PDF to PowerPoint
```bash
curl -X POST http://localhost:3001/api/convert/pdf-to-ppt \
  -F "files=@document.pdf" \
  -H "Content-Type: multipart/form-data"
```

### Merge PDFs
```bash
curl -X POST http://localhost:3001/api/convert/merge \
  -F "files=@file1.pdf" \
  -F "files=@file2.pdf" \
  -F "files=@file3.pdf"
```

### Check Job Status
```bash
curl http://localhost:3001/api/job/your-job-id/status
```

## Environment Variables

### Required
```bash
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_NAME=pdfcraft_db
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_key
```

### Optional
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
MAX_FILE_SIZE=104857600
UPLOAD_DIR=/tmp/uploads
LIBREOFFICE_PATH=/usr/bin/libreoffice
```

## Deployment

### Hostinger VPS Deployment

1. **Prepare VPS**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install LibreOffice
sudo apt-get install -y libreoffice

# Install Redis
sudo apt install redis-server
sudo systemctl enable redis-server
```

2. **Deploy Application**
```bash
# Upload code
scp -r backend/ user@your-vps:/var/www/pdfcraft/

# Install dependencies
cd /var/www/pdfcraft/backend
npm ci --production

# Build TypeScript
npm run build

# Install PM2
sudo npm install -g pm2

# Start application
pm2 start dist/server.js --name "pdfcraft-api"
pm2 startup
pm2 save
```

3. **Configure Nginx (Optional)**
```nginx
server {
    listen 80;
    server_name api.pdfcraft.pro;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Performance Benchmarks

### Target Performance
- PDF→PPT Conversion: <5 seconds for 20-page documents
- PDF Merge: <2 seconds for 5 files (10MB total)
- API Response: <200ms for status endpoints
- Concurrent Users: 10+ on VPS 2

### Optimization Tips
- Use SSD storage for temp files
- Ensure adequate RAM (8GB+ recommended)
- Monitor LibreOffice memory usage
- Implement file cleanup schedules

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Express API   │    │   Background    │
│   (Next.js)     │───▶│   (TypeScript)  │───▶│   Workers       │
│                 │    │                 │    │   (Bull Queue)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │     MySQL       │    │     Redis       │
                       │   (User Data)   │    │   (Job Queue)   │
                       └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   LibreOffice   │
                       │   (PDF→PPT)     │
                       └─────────────────┘
```

## File Processing Flow

1. **Upload**: Client uploads PDF files via multipart/form-data
2. **Validation**: Server validates file type, size, and user limits
3. **Queue**: Job added to Redis queue for background processing
4. **Processing**: Worker converts/merges files using LibreOffice/pdf-lib
5. **Storage**: Output saved to temporary directory
6. **Download**: Client downloads via secure temporary URL
7. **Cleanup**: Files auto-deleted after 1 hour

## Error Handling

### Common Errors
- `400`: Invalid file type or size
- `413`: File size exceeds limit
- `429`: Rate limit exceeded
- `500`: Processing failed

### Retry Logic
- Failed jobs automatically retry with exponential backoff
- Maximum 3 retry attempts
- Jobs removed from queue after final failure

## Monitoring

### Health Checks
```bash
# API Health
curl http://localhost:3001/health

# Redis Status
redis-cli ping

# MySQL Status
mysqladmin -u root -p status

# PM2 Status
pm2 status
```

### Log Files
```bash
# Application logs
pm2 logs pdfcraft-api

# System logs
tail -f /var/log/syslog

# MySQL logs
tail -f /var/log/mysql/error.log
```

## Security

### File Upload Security
- MIME type validation
- File signature verification
- Size limits enforced
- Temporary storage only
- No executable uploads

### Authentication
- JWT tokens with expiration
- bcrypt password hashing
- Rate limiting per IP
- CORS properly configured

## Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Compile TypeScript
npm start            # Start production server
npm test             # Run tests
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
```

### Project Structure
```
backend/
├── src/
│   ├── config/          # Database, Redis, app config
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, validation, etc.
│   ├── services/        # Business logic
│   ├── workers/         # Background job processors
│   ├── types/           # TypeScript interfaces
│   └── server.ts        # Express app entry point
├── dist/                # Compiled JavaScript (production)
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── .env.example         # Environment template
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details