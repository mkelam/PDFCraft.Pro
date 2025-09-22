# PDFCraft.Pro Docker Deployment Guide

This guide will help you deploy PDFCraft.Pro using Docker on your Hostinger VPS or any other server.

## 🚀 Quick Start

### Prerequisites

- Server with at least 2GB RAM and 20GB storage
- Docker and Docker Compose installed
- Domain name pointed to your server (optional but recommended)

### 1. Prepare Environment

```bash
# Clone the repository
git clone <your-repo-url> /var/www/pdfcraft
cd /var/www/pdfcraft

# Copy environment file
cp .env.production .env

# Edit environment variables
nano .env
```

### 2. Configure Environment Variables

Edit `.env` file with your actual values:

```bash
# Database passwords (use strong passwords)
MYSQL_ROOT_PASSWORD=your_very_strong_root_password
MYSQL_PASSWORD=your_strong_db_password

# JWT secrets (generate random 64+ character strings)
JWT_SECRET=your_super_secure_jwt_secret_min_64_chars
JWT_REFRESH_SECRET=your_super_secure_refresh_secret

# Paystack API keys
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key

# Your domain
APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### 3. Deploy Application

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

## 🛠️ Manual Deployment

If you prefer manual deployment:

### Build and Start

```bash
# Build containers
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f pdfcraft-app
```

### Verify Deployment

```bash
# Check if application is running
curl http://localhost:3001/api/health

# Check all services
docker-compose ps
```

## 🔧 Development Setup

For local development with Docker:

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Access development app
curl http://localhost:3002/api/health
```

## 📊 Service Architecture

The Docker setup includes:

- **pdfcraft-app**: Main Node.js application
- **mysql**: MySQL 8.0 database
- **redis**: Redis for job queues
- **nginx**: Reverse proxy (optional, for production)

## 🔐 Security Configuration

### Firewall Setup

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Optional: Allow direct app access during setup
sudo ufw allow 3001
```

### SSL Configuration

For production, set up SSL certificates:

```bash
# Install Certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Start nginx proxy
docker-compose --profile production up -d nginx
```

## 📈 Monitoring and Maintenance

### View Application Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs pdfcraft-app
docker-compose logs mysql
docker-compose logs redis

# Follow logs in real-time
docker-compose logs -f pdfcraft-app
```

### Monitor Resources

```bash
# Container resource usage
docker stats

# System resources
htop
df -h
```

### Backup Database

```bash
# Create backup
docker-compose exec mysql mysqldump -u root -p pdfcraft_db > backup_$(date +%Y%m%d).sql

# Restore backup
docker-compose exec -T mysql mysql -u root -p pdfcraft_db < backup_20241201.sql
```

## 🔄 Updates and Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Scale Services

```bash
# Scale app instances
docker-compose up -d --scale pdfcraft-app=3

# Use load balancer (nginx) to distribute requests
```

## 🐛 Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs <service-name>

# Check system resources
docker system df
df -h
free -h
```

**Database connection issues:**
```bash
# Check MySQL status
docker-compose exec mysql mysql -u root -p -e "SHOW DATABASES;"

# Reset database
docker-compose down -v
docker-compose up -d
```

**File processing errors:**
```bash
# Check if LibreOffice is working
docker-compose exec pdfcraft-app libreoffice --version

# Check available disk space
docker-compose exec pdfcraft-app df -h /app/uploads
```

### Performance Optimization

**For high traffic:**

1. **Increase container resources:**
```yaml
# In docker-compose.yml
services:
  pdfcraft-app:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
```

2. **Add Redis persistence:**
```yaml
redis:
  command: redis-server --appendonly yes --maxmemory 512mb
```

3. **Enable MySQL performance schema:**
```yaml
mysql:
  command: --performance-schema=ON --innodb-buffer-pool-size=512M
```

## 🚨 Production Checklist

Before going live:

- [ ] Set strong passwords in `.env`
- [ ] Configure SSL certificates
- [ ] Set up firewall rules
- [ ] Configure domain DNS
- [ ] Test all API endpoints
- [ ] Set up monitoring
- [ ] Configure automated backups
- [ ] Test file upload/processing
- [ ] Verify Paystack integration
- [ ] Set up log rotation

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose logs`
2. Verify environment variables
3. Ensure all required ports are open
4. Check system resources
5. Review this documentation

## 🔗 Useful Commands

```bash
# Quick status check
docker-compose ps && curl -s http://localhost:3001/api/health

# Restart specific service
docker-compose restart pdfcraft-app

# Update single service
docker-compose up -d --no-deps pdfcraft-app

# Clean up unused containers
docker system prune -f

# View real-time container stats
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```