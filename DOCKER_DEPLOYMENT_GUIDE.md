# pdflab.pro Docker Deployment Guide

This guide explains how to run pdflab.pro using Docker containers.

## 📋 Prerequisites

- **Docker**: Version 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose**: Version 2.0+ (included with Docker Desktop)
- **Git**: For cloning the repository
- **4GB RAM**: Minimum for running all containers
- **10GB Disk Space**: For images and volumes

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/mkelam/pdflab.pro.git
cd pdflab.pro
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.docker.example .env.docker

# Edit the file with your actual values
# On Windows:
notepad .env.docker

# On Linux/Mac:
nano .env.docker
```

**Required variables to configure:**
- `JWT_SECRET` - Generate with: `openssl rand -base64 64`
- `SMTP_USER` - Your email account
- `SMTP_PASSWORD` - Your email password
- `SMTP_FROM` - Your from address

### 3. Start the Application

```bash
# Build and start all containers
docker-compose -f docker-compose.simple.yml --env-file .env.docker up -d

# View logs
docker-compose -f docker-compose.simple.yml logs -f
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3016
- **Health Check**: http://localhost:3016/api/health

## 📦 What Gets Installed

The Docker setup includes:

### Backend Container (`pdflab-backend`)
- **Node.js 20 Alpine**
- **LibreOffice** - For Office file conversions
- **ImageMagick** - For image processing
- **Tesseract OCR** - For text extraction from images
- **Ghostscript** - For PDF manipulation
- **All fonts** - For proper text rendering

### Frontend Container (`pdflab-frontend`)
- **Node.js 20 Alpine**
- **Next.js Production Build**
- **Optimized static assets**

### Persistent Data Volumes
- `pdflab_uploads` - User uploaded files
- `pdflab_temp` - Temporary processing files
- `pdflab_logs` - Application logs
- `pdflab_data` - SQLite database

## 🔧 Docker Commands

### Start/Stop Services

```bash
# Start all services
docker-compose -f docker-compose.simple.yml --env-file .env.docker up -d

# Stop all services
docker-compose -f docker-compose.simple.yml down

# Stop and remove all volumes (CAUTION: Deletes all data!)
docker-compose -f docker-compose.simple.yml down -v
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.simple.yml logs -f

# Backend only
docker-compose -f docker-compose.simple.yml logs -f backend

# Frontend only
docker-compose -f docker-compose.simple.yml logs -f frontend

# Last 100 lines
docker-compose -f docker-compose.simple.yml logs --tail=100
```

### Rebuild Containers

```bash
# Rebuild all containers
docker-compose -f docker-compose.simple.yml build --no-cache

# Rebuild and restart
docker-compose -f docker-compose.simple.yml up -d --build
```

### Access Container Shell

```bash
# Backend container
docker exec -it pdflab-backend sh

# Frontend container
docker exec -it pdflab-frontend sh
```

### Check Container Status

```bash
# List running containers
docker-compose -f docker-compose.simple.yml ps

# Check health status
docker inspect pdflab-backend --format='{{.State.Health.Status}}'
```

## 🗄️ Database Management

pdflab.pro uses SQLite by default in Docker.

### Backup Database

```bash
# Create backup
docker cp pdflab-backend:/app/data/pdflab.db ./backup-$(date +%Y%m%d).db

# Verify backup
ls -lh backup-*.db
```

### Restore Database

```bash
# Stop the backend
docker-compose -f docker-compose.simple.yml stop backend

# Restore from backup
docker cp ./backup-20250126.db pdflab-backend:/app/data/pdflab.db

# Restart backend
docker-compose -f docker-compose.simple.yml start backend
```

### Access Database

```bash
# Access SQLite database
docker exec -it pdflab-backend sqlite3 /app/data/pdflab.db

# Run SQL query
docker exec pdflab-backend sqlite3 /app/data/pdflab.db "SELECT * FROM users LIMIT 5;"
```

## 📊 Monitoring

### Check Resource Usage

```bash
# Real-time stats
docker stats pdflab-backend pdflab-frontend

# Disk usage
docker system df

# Container resource limits
docker inspect pdflab-backend --format='{{.HostConfig.Memory}}'
```

### Health Checks

```bash
# Check backend health
curl http://localhost:3016/api/health

# Check if LibreOffice is available
docker exec pdflab-backend libreoffice --version

# Check if ImageMagick is available
docker exec pdflab-backend convert --version

# Check if Tesseract OCR is available
docker exec pdflab-backend tesseract --version
```

## 🔒 Production Deployment

### 1. Use Production Environment File

```bash
cp .env.docker.example .env.production
# Edit .env.production with production values
```

### 2. Enable HTTPS (Recommended)

Create `nginx` directory with SSL certificates:

```bash
mkdir -p nginx/ssl
# Copy your SSL certificates to nginx/ssl/
```

### 3. Use Production Docker Compose

```bash
# Use the full docker-compose.yml with Nginx
docker-compose --env-file .env.production --profile production up -d
```

### 4. Set Resource Limits

Edit `docker-compose.simple.yml` to add resource limits:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

### 5. Enable Automatic Restarts

```yaml
services:
  backend:
    restart: always  # Change from 'unless-stopped' to 'always'
```

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker-compose -f docker-compose.simple.yml logs backend

# Check if port is already in use
netstat -tulpn | grep 3016  # Linux
netstat -ano | findstr :3016  # Windows

# Remove and recreate containers
docker-compose -f docker-compose.simple.yml down
docker-compose -f docker-compose.simple.yml up -d
```

### PDF Processing Fails

```bash
# Verify LibreOffice is installed
docker exec pdflab-backend libreoffice --version

# Check temp directory permissions
docker exec pdflab-backend ls -la /app/temp

# View backend logs during conversion
docker-compose -f docker-compose.simple.yml logs -f backend
```

### Email Not Sending

```bash
# Check SMTP configuration
docker exec pdflab-backend printenv | grep SMTP

# Test SMTP connection manually
docker exec -it pdflab-backend sh
# Inside container:
telnet smtp.hostinger.com 587
```

### Database is Locked

```bash
# Stop all containers
docker-compose -f docker-compose.simple.yml down

# Remove temp files
docker volume rm pdflab_temp

# Restart
docker-compose -f docker-compose.simple.yml up -d
```

### Out of Disk Space

```bash
# Clean up unused images
docker system prune -a

# Clean up volumes (CAUTION: Deletes data!)
docker volume prune

# Check volume sizes
docker system df -v
```

## 🔄 Updates and Maintenance

### Update to Latest Version

```bash
# Pull latest code
git pull origin main

# Rebuild containers
docker-compose -f docker-compose.simple.yml build --no-cache

# Restart with new images
docker-compose -f docker-compose.simple.yml up -d
```

### Clean Up Old Data

```bash
# Remove old uploaded files (older than 7 days)
docker exec pdflab-backend find /app/uploads -type f -mtime +7 -delete

# Remove temp files
docker exec pdflab-backend rm -rf /app/temp/*

# Clean up logs (keep last 7 days)
docker exec pdflab-backend find /app/logs -type f -mtime +7 -delete
```

## 📈 Performance Optimization

### 1. Use Docker BuildKit

```bash
# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Build with BuildKit
docker-compose -f docker-compose.simple.yml build
```

### 2. Optimize Image Size

```bash
# View image sizes
docker images | grep pdflab

# Remove unused layers
docker image prune
```

### 3. Enable Caching

Add to `docker-compose.simple.yml`:

```yaml
services:
  backend:
    environment:
      - ENABLE_RESPONSE_CACHE=true
      - CACHE_TTL=3600
```

## 🌐 Scaling

### Run Multiple Backend Instances

```bash
# Scale backend to 3 instances
docker-compose -f docker-compose.simple.yml up -d --scale backend=3

# Use nginx for load balancing
docker-compose --profile production up -d
```

## 🔐 Security Best Practices

1. **Never commit `.env.docker` to Git**
2. **Use strong JWT_SECRET** (minimum 32 characters)
3. **Enable HTTPS** in production
4. **Regularly update** Docker images
5. **Limit resource** usage
6. **Use non-root** user (already configured)
7. **Enable firewall** rules
8. **Regular backups** of database

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Review this guide
3. Check [GitHub Issues](https://github.com/mkelam/pdflab.pro/issues)
4. Contact support

## 📝 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Last Updated**: January 2025
**Version**: 1.0
**Maintainer**: pdflab.pro Team
