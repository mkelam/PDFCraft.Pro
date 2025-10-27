# CLAUDE.md - pdflab.pro Project Guide

This file provides comprehensive guidance to Claude Code when working with the pdflab.pro codebase.

## Project Overview

**pdflab.pro** is a revolutionary PDF processing application with one core breakthrough feature:
1. **OCR-Enhanced PDF-to-PowerPoint Conversion** - Transform any PDF (including scanned/image-heavy documents) into fully editable PowerPoints while preserving visual layout and structure (<5 second target)
2. **PDF Merging** - Combine multiple PDFs efficiently (<2 second target)

**Mission**: Build the world's first OCR-integrated PDF-to-PowerPoint converter that creates truly editable presentations from any PDF - even scanned documents - 10x faster than Adobe Acrobat at 65% less cost.

**Revolutionary Value Proposition**: Upload any PDF → Get back a PowerPoint where you can edit all text while images and layout remain perfectly intact. No more retyping content from PDFs or being stuck with uneditable presentations.

## Project Architecture

### Technology Stack
```
Frontend (COMPLETED)
├── Next.js 14 + TypeScript
├── Tailwind CSS + Glassmorphic Design
├── Radix UI Components
├── Vercel Deployment (auto-sync with v0.app)
└── Responsive Mobile/Desktop

Backend (COMPLETED)
├── Node.js + Express + TypeScript
├── MySQL Database (Hostinger)
├── Redis + Bull Queue System
├── OCR-Enhanced PDF Processing Pipeline:
│   ├── Tesseract OCR (text extraction with positioning)
│   ├── ImageMagick (image preprocessing)
│   ├── LibreOffice (PPT generation with OCR integration)
│   └── Quality validation & confidence scoring
├── pdf-lib (PDF merging)
├── Stripe (payments)
└── Hostinger VPS Hosting
```

## Development Environment

**Primary Platform**: Windows 11
**Hosting**: Hostinger VPS ($8.99/mo)
**Deployment**: Hostinger + Vercel
**Domain**: pdflab.pro

### Key Directories
```
pdflab.pro/
├── app/                    # Next.js frontend (COMPLETE)
├── components/             # React components (COMPLETE)
├── backend/               # Express API (IN DEVELOPMENT)
│   ├── src/
│   │   ├── controllers/   # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── config/        # Database, Redis setup
│   │   ├── middleware/    # Auth, validation
│   │   └── workers/       # Background jobs
├── Docs/                  # Project documentation
├── .bmad-core/           # BMAD development tools
└── CLAUDE.md             # This file
```

## Current Development Status

### ✅ COMPLETED (Frontend - 90%)
- Landing page with glassmorphic design
- Features page detailing capabilities
- Pricing page (Free/$7/$19 tiers)
- User authentication UI (login/signup)
- File upload interface with drag & drop for PDF-to-PPT conversion
- Responsive design for all devices
- Component library (buttons, cards, forms)
- ❌ **Removed**: Standalone OCR page (integrated into main conversion flow)

### ✅ COMPLETED (Backend - OCR-Enhanced PDF Processing)
- Express.js server setup with TypeScript ✅
- Database schema (MySQL) ✅
- Redis + Bull queue system ✅
- **Core OCR-Enhanced PDF-to-PPT Pipeline**:
  - Tesseract OCR integration with 96%+ accuracy ✅
  - ImageMagick preprocessing ✅
  - LibreOffice conversion with OCR integration ✅
  - Quality validation and confidence scoring ✅
  - BMAD agent system for optimization ✅
- Conversion controllers with OCR workflow ✅
- File upload handling ✅
- Security hardening (military-grade) ✅

### 🚧 INTEGRATION REQUIRED (Next Phase)
- Merge OCR capabilities into PDF-to-PPT conversion endpoint
- Update frontend to remove standalone OCR, focus on enhanced PDF-to-PPT
- Refactor conversion flow to include OCR processing stages

### ❌ PENDING (Critical for Launch)
- Authentication middleware
- User management system
- Stripe payment integration
- Background job workers
- Production deployment pipeline
- Email notifications

## Key Features & Acceptance Criteria

### OCR-Enhanced PDF-to-PowerPoint Conversion (Core Feature)
- **Input**: Any PDF files up to 100MB (including scanned documents, image-heavy PDFs)
- **Output**: Fully editable .pptx files with preserved visual layout
- **Target Speed**: <5 seconds for 20-page documents
- **OCR Integration**:
  - Automatic text extraction from images using Tesseract OCR
  - Text positioning and confidence scoring (96%+ accuracy achieved)
  - Editable text overlays while preserving original images as backgrounds
- **Accuracy**: 80% layout preservation + 96% OCR text accuracy
- **Engine**: Integrated LibreOffice + Tesseract OCR pipeline
- **Revolutionary Benefit**: Transform ANY PDF into truly editable presentations

### PDF Merging
- **Input**: 2-20 PDF files simultaneously
- **Output**: Single combined PDF
- **Target Speed**: <2 seconds for 5 files
- **Features**: Maintain page order, preserve bookmarks

### User Tiers & Limits
```
Free Tier:     3 operations/day, 10MB files
Starter ($7):  100 operations/month, 25MB files
Pro ($19):     Unlimited operations, 100MB files
Enterprise:    Custom limits, API access
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  plan ENUM('free', 'starter', 'pro', 'enterprise') DEFAULT 'free',
  conversions_used INT DEFAULT 0,
  conversions_limit INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Conversion Jobs Table
```sql
CREATE TABLE conversion_jobs (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT,
  type ENUM('pdf-to-ppt', 'pdf-merge') NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  progress INT DEFAULT 0,
  input_files JSON NOT NULL,
  output_file VARCHAR(255),
  processing_time INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
);
```

## API Endpoints

### Conversion Endpoints
```
POST   /api/convert/pdf-to-ppt    # OCR-Enhanced PDF to PowerPoint (with editable text)
POST   /api/convert/merge         # Merge multiple PDFs
GET    /api/job/:jobId/status     # Check conversion status with OCR progress
GET    /api/download/:filename    # Download processed file
```

### OCR Integration Details
The `/api/convert/pdf-to-ppt` endpoint now includes:
- Automatic OCR processing for text extraction
- Image preprocessing via ImageMagick
- Text positioning and confidence scoring
- Generation of editable PowerPoint with text overlays

### Authentication Endpoints
```
POST   /api/auth/register         # User registration
POST   /api/auth/login           # User login
POST   /api/auth/logout          # User logout
GET    /api/auth/me              # Get current user
```

### Payment Endpoints
```
POST   /api/stripe/create-checkout    # Create Stripe checkout
POST   /api/stripe/webhook           # Handle Stripe webhooks
GET    /api/user/usage               # Get usage statistics
```

## Environment Variables

### Required for Development
```bash
# Server
PORT=3001
NODE_ENV=development

# Database (Hostinger MySQL)
DB_HOST=localhost
DB_NAME=pdflab_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication
JWT_SECRET=your_jwt_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# File Processing
MAX_FILE_SIZE=104857600
UPLOAD_DIR=/tmp/uploads
LIBREOFFICE_PATH=/usr/bin/libreoffice
```

## Development Commands

### Backend Development
```bash
cd backend
npm install                 # Install dependencies
npm run dev                # Start development server
npm run build              # Compile TypeScript
npm start                  # Start production server
npm test                   # Run tests
```

### Frontend Development
```bash
npm run dev                # Start Next.js dev server
npm run build              # Build for production
npm run lint               # Run ESLint
npm start                  # Start production server
```

### Database Operations
```bash
# Connect to Hostinger MySQL
mysql -h hostname -u username -p database_name

# Run migrations (manual for now)
# Execute SQL files in /backend/migrations/
```

## Deployment Strategy

### Hostinger VPS Setup
1. **VPS Plan**: VPS 2 ($8.99/mo) - 2 vCPU, 8GB RAM
2. **Operating System**: Ubuntu 20.04 LTS
3. **Node.js**: Version 18+ via NodeSource
4. **Process Manager**: PM2 for production
5. **Reverse Proxy**: Nginx (optional)
6. **SSL**: Let's Encrypt via Certbot

### Deployment Steps
```bash
# 1. Upload code to VPS
scp -r backend/ user@vps-ip:/var/www/pdflab/

# 2. Install dependencies
cd /var/www/pdflab/backend
npm ci --production

# 3. Build TypeScript
npm run build

# 4. Start with PM2
pm2 start dist/server.js --name "pdflab-api"
pm2 startup
pm2 save
```

## Performance Targets

### Processing Speed Goals
- **PDF→PPT**: <5 seconds for 20-page documents
- **PDF Merge**: <2 seconds for 5 files (10MB total)
- **File Upload**: <3 seconds for 25MB files
- **API Response**: <200ms for status endpoints

### Quality Targets
- **Success Rate**: >95% for both operations
- **Uptime**: 99.9% after launch
- **Error Recovery**: Automatic retry with exponential backoff

## Testing Strategy

### Manual Testing Checklist
- [ ] Upload various PDF types (text-heavy, image-heavy, mixed)
- [ ] Test file size limits (10MB, 25MB, 100MB)
- [ ] Verify conversion accuracy on complex layouts
- [ ] Test merge with different PDF sources
- [ ] Validate error handling (corrupted PDFs, oversized files)
- [ ] Check processing speed benchmarks
- [ ] Test user authentication flow
- [ ] Verify payment processing (Stripe test mode)

### Automated Testing
```bash
# Unit tests for services
npm test -- services/

# Integration tests for controllers
npm test -- controllers/

# End-to-end tests
npm run test:e2e
```

## Monitoring & Analytics

### Key Metrics to Track
- **Conversion Success Rate**: Successful/Total conversions
- **Processing Speed**: Average time per operation type
- **User Engagement**: Daily/Monthly active users
- **Revenue Metrics**: MRR, conversion rates, churn
- **System Performance**: CPU, memory, disk usage

### Error Monitoring
- **Sentry**: Application error tracking
- **Winston**: Application logging
- **PM2 Logs**: Process monitoring
- **MySQL Logs**: Database error tracking

## Security Considerations

### File Upload Security
- MIME type validation
- File size limits enforced
- Temporary file cleanup (1-hour expiry)
- No executable file uploads
- Virus scanning (future enhancement)

### Authentication Security
- JWT tokens with expiration
- bcrypt password hashing
- Rate limiting on auth endpoints
- CORS configuration
- Helmet.js security headers

### Data Protection
- Temporary file storage only
- No permanent file retention
- User data encryption at rest
- GDPR compliance ready

## Troubleshooting Guide

### Common Development Issues

**LibreOffice Not Found**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install libreoffice

# Check installation
which libreoffice
```

**Redis Connection Failed**
```bash
# Install Redis
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**MySQL Connection Issues**
```bash
# Check MySQL status
sudo systemctl status mysql

# Reset password if needed
sudo mysql_secure_installation
```

**File Permission Errors**
```bash
# Set proper permissions for upload directories
sudo chown -R www-data:www-data /tmp/uploads
sudo chmod -R 755 /tmp/uploads
```

## Launch Checklist

### Pre-Launch (T-7 Days)
- [ ] Backend fully deployed on Hostinger VPS
- [ ] Database migrated and populated
- [ ] Stripe integration tested end-to-end
- [ ] Load testing completed (100 concurrent users)
- [ ] Error monitoring configured
- [ ] Backup system verified

### Launch Day (T-0)
- [ ] DNS pointed to production servers
- [ ] SSL certificates active
- [ ] Payment processing live
- [ ] User registration enabled
- [ ] Analytics tracking active
- [ ] Support email configured

### Post-Launch (T+1 Week)
- [ ] Monitor conversion success rates
- [ ] Track processing speed metrics
- [ ] Address user feedback
- [ ] Optimize performance bottlenecks
- [ ] Plan feature enhancements

## Success Metrics (60-Day Targets)

- **Revenue**: $1,000 MRR
- **Users**: 200 active users
- **Conversion Rate**: 5% free-to-paid
- **Processing Speed**: <5s PDF→PPT, <2s merge
- **Uptime**: 99.9%
- **User Satisfaction**: NPS >50

## Team Roles & Responsibilities

- **Product Manager (John)**: Roadmap, requirements, user feedback
- **Frontend Developer**: Next.js UI, user experience
- **Backend Developer**: API, processing engine, database
- **DevOps Engineer**: Deployment, monitoring, scaling
- **QA Engineer**: Testing, quality assurance

## Code Style & Standards

### TypeScript Guidelines
- Strict type checking enabled
- Interface definitions for all data structures
- Proper error handling with typed exceptions
- Async/await pattern for promises
- ESLint + Prettier for code formatting

### Git Workflow
```bash
# Feature development
git checkout -b feature/pdf-conversion-improvements
git commit -m "feat: improve PDF conversion speed by 20%"
git push origin feature/pdf-conversion-improvements

# Create PR for review
# Merge to main after approval
```

### Commit Message Format
```
feat: add PDF merge functionality
fix: resolve memory leak in conversion process
docs: update API documentation
test: add unit tests for PDF service
perf: optimize LibreOffice conversion pipeline
```

## Future Enhancements (Post-MVP)

### Month 2-3 Features
- PDF to Excel conversion
- PDF to Word conversion
- Batch processing UI
- API access for developers
- Advanced analytics dashboard

### Quarter 2 Features
- OCR functionality
- PDF editing capabilities
- Team workspaces
- White-label solutions
- Mobile applications

## Support & Documentation

### User Documentation
- Getting started guide
- FAQ section
- Video tutorials
- API documentation (for Pro users)

### Developer Documentation
- API reference
- SDK examples
- Integration guides
- Webhook documentation

---

## Quick Reference Commands

```bash
# Start development environment
cd backend && npm run dev

# Check backend logs
pm2 logs pdflab-api

# Database backup
mysqldump -u user -p pdflab_db > backup.sql

# Redis monitoring
redis-cli monitor

# Check system resources
htop
df -h
free -m
```

## Important Notes for Claude

1. **Focus on Backend Completion**: Frontend is 90% done, backend needs 100% focus
2. **Performance First**: Speed is our core differentiator vs Adobe
3. **Hostinger-Specific**: All deployment assumes Hostinger VPS environment
4. **MVP Scope**: Only PDF→PPT and PDF merge for initial launch
5. **Revenue Target**: $1,000 MRR in 60 days drives all decisions

---

*Last Updated: December 2024*
*Project Status: Backend Development Phase*
*Next Milestone: Complete backend API and deploy to production*