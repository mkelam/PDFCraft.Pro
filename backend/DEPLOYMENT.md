# PDFCraft.Pro Backend Deployment Guide

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04 LTS or newer
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: Minimum 20GB free space
- **CPU**: 2+ cores recommended
- **Network**: Static IP with ports 80, 443, 3001 accessible

### Required Software
```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 Process Manager
sudo npm install -g pm2

# LibreOffice (for PDF conversion)
sudo apt-get install -y libreoffice fonts-liberation

# MySQL 8.0
sudo apt-get install -y mysql-server

# Redis
sudo apt-get install -y redis-server

# Nginx (optional, for reverse proxy)
sudo apt-get install -y nginx

# SSL Certificate tools
sudo apt-get install -y certbot python3-certbot-nginx
```

## Deployment Options

### Option 1: Traditional VPS Deployment (Recommended for Hostinger)

1. **Clone Repository**
```bash
cd /var/www
sudo git clone https://github.com/yourusername/pdfcraft-pro.git pdfcraft
cd pdfcraft/backend
sudo chown -R $USER:$USER /var/www/pdfcraft
```

2. **Configure Environment**
```bash
cp .env.production .env
# Edit .env with your production values
nano .env
```

3. **Deploy Application**
```bash
npm run deploy
```

### Option 2: Docker Deployment

1. **Build and Run with Docker Compose**
```bash
# Copy environment template
cp .env.production .env.docker

# Edit environment variables
nano .env.docker

# Start all services
npm run docker:run
```

2. **Verify Deployment**
```bash
docker-compose ps
curl http://localhost:3001/health
```

## Environment Configuration

### Required Environment Variables

Create `.env` file with these values:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001

# Database (Hostinger MySQL)
DB_HOST=your-mysql-host.hostinger.com
DB_NAME=u123456789_pdfcraft
DB_USER=u123456789_pdfcraft
DB_PASSWORD=your-secure-password
DB_PORT=3306

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
JWT_EXPIRES_IN=24h

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_live_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key

# File Configuration
MAX_FILE_SIZE=104857600
UPLOAD_DIR=/var/www/pdfcraft/uploads
TEMP_DIR=/var/www/pdfcraft/temp

# LibreOffice
LIBREOFFICE_PATH=/usr/bin/libreoffice
LIBREOFFICE_AVAILABLE=true

# Security
CORS_ORIGIN=https://pdfcraft.pro,https://www.pdfcraft.pro
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_DIR=/var/log/pdfcraft

# Email (Hostinger SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@pdfcraft.pro
SMTP_PASSWORD=your-email-password
```

## SSL Certificate Setup

### Using Let's Encrypt (Free)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d pdfcraft.pro -d www.pdfcraft.pro

# Auto-renewal (check)
sudo certbot renew --dry-run
```

### Using Custom Certificate
```bash
# Copy certificate files
sudo mkdir -p /etc/nginx/ssl
sudo cp your-certificate.crt /etc/nginx/ssl/pdfcraft.pro.crt
sudo cp your-private-key.key /etc/nginx/ssl/pdfcraft.pro.key
sudo chmod 600 /etc/nginx/ssl/*
```

## Database Setup

### Initialize Database
```bash
# Connect to MySQL
mysql -h your-mysql-host -u your-user -p

# Create database and run initialization
mysql> CREATE DATABASE pdfcraft_db;
mysql> USE pdfcraft_db;
mysql> source /var/www/pdfcraft/backend/init.sql;
```

### Backup Strategy
```bash
# Daily backup script
cat > /var/www/pdfcraft/scripts/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/pdfcraft"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD pdfcraft_db > $BACKUP_DIR/pdfcraft_$DATE.sql
gzip $BACKUP_DIR/pdfcraft_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
EOF

chmod +x /var/www/pdfcraft/scripts/backup-db.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/pdfcraft/scripts/backup-db.sh") | crontab -
```

## Performance Optimization

### PM2 Cluster Configuration
```bash
# The ecosystem.config.js is already configured for:
# - Multiple worker processes
# - Automatic restart on crashes
# - Memory limit enforcement
# - Log rotation

# Start in cluster mode
pm2 start ecosystem.config.js --env production
```

### Nginx Configuration
```bash
# Copy Nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/pdfcraft.pro
sudo ln -s /etc/nginx/sites-available/pdfcraft.pro /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

## Monitoring and Alerting

### Health Monitoring Endpoints
- **Detailed Health**: `GET /health` - Full system status
- **Simple Health**: `GET /health/simple` - Basic status for load balancers
- **Readiness**: `GET /health/ready` - Kubernetes readiness probe
- **Liveness**: `GET /health/live` - Kubernetes liveness probe

### Log Monitoring
```bash
# View real-time application logs
pm2 logs pdfcraft-api

# View system logs
tail -f /var/log/pdfcraft/combined.log

# Error logs only
tail -f /var/log/pdfcraft/error.log
```

### Performance Monitoring
```bash
# PM2 monitoring dashboard
pm2 monit

# Custom monitoring dashboard
/var/www/pdfcraft/monitoring/dashboard.sh

# System resources
htop
```

## Security Checklist

### Firewall Configuration
```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp  # Only if direct access needed
```

### File Permissions
```bash
# Set secure permissions
sudo chown -R www-data:www-data /var/www/pdfcraft
sudo chmod -R 755 /var/www/pdfcraft
sudo chmod 600 /var/www/pdfcraft/backend/.env
```

### Database Security
```bash
# Run MySQL security script
sudo mysql_secure_installation

# Create dedicated database user (don't use root)
mysql -u root -p << EOF
CREATE USER 'pdfcraft'@'localhost' IDENTIFIED BY 'secure-password';
GRANT ALL PRIVILEGES ON pdfcraft_db.* TO 'pdfcraft'@'localhost';
FLUSH PRIVILEGES;
EOF
```

## Troubleshooting

### Common Issues

**LibreOffice Not Working**
```bash
# Test LibreOffice
libreoffice --version
libreoffice --headless --convert-to pdf test.txt

# Install additional fonts if needed
sudo apt-get install fonts-noto fonts-dejavu
```

**High Memory Usage**
```bash
# Check memory usage by process
ps aux --sort=-%mem | head -10

# Restart PM2 cluster
pm2 restart pdfcraft-api
```

**Queue Processing Issues**
```bash
# Check Redis status
redis-cli ping

# Monitor queue
redis-cli monitor

# Clear stuck jobs
redis-cli FLUSHDB
```

**SSL Certificate Issues**
```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Check certificate expiry
openssl x509 -in /etc/nginx/ssl/pdfcraft.pro.crt -text -noout | grep "Not After"
```

### Performance Tuning

**Optimize Node.js**
```bash
# Increase memory limit for large files
export NODE_OPTIONS="--max-old-space-size=2048"
```

**Optimize MySQL**
```bash
# Add to /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
innodb_buffer_pool_size = 1G
max_connections = 200
query_cache_size = 64M
```

**Optimize Redis**
```bash
# Add to /etc/redis/redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
```

## Maintenance

### Regular Maintenance Tasks
```bash
# Weekly maintenance script
cat > /var/www/pdfcraft/scripts/weekly-maintenance.sh << 'EOF'
#!/bin/bash

echo "🧹 Running weekly maintenance..."

# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Clean up old uploads
find /var/www/pdfcraft/uploads -type f -mtime +7 -delete
find /var/www/pdfcraft/temp -type f -mtime +1 -delete

# Restart PM2 processes
pm2 restart all

# Check disk space
df -h

echo "✅ Weekly maintenance completed"
EOF

chmod +x /var/www/pdfcraft/scripts/weekly-maintenance.sh

# Add to crontab (weekly on Sunday at 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * 0 /var/www/pdfcraft/scripts/weekly-maintenance.sh") | crontab -
```

## Rollback Procedure

```bash
# Emergency rollback script
cat > /var/www/pdfcraft/scripts/rollback.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/pdfcraft/code"
CURRENT_DIR="/var/www/pdfcraft"

echo "🔄 Starting emergency rollback..."

# Stop application
pm2 stop pdfcraft-api

# Restore previous version
if [[ -d "$BACKUP_DIR/previous" ]]; then
    sudo cp -r $BACKUP_DIR/previous/* $CURRENT_DIR/
    echo "✅ Previous version restored"
else
    echo "❌ No backup found"
    exit 1
fi

# Restart application
pm2 start pdfcraft-api

echo "✅ Rollback completed"
EOF

chmod +x /var/www/pdfcraft/scripts/rollback.sh
```

## Go-Live Checklist

- [ ] Environment variables configured
- [ ] Database initialized and accessible
- [ ] Redis running and accessible
- [ ] LibreOffice installed and working
- [ ] SSL certificates installed
- [ ] Nginx configured (if using)
- [ ] PM2 processes running
- [ ] Health endpoints responding
- [ ] File upload/download working
- [ ] Queue processing working
- [ ] Monitoring set up
- [ ] Backup procedures configured
- [ ] DNS pointing to server
- [ ] Stripe webhooks configured

## Support

For deployment issues:
1. Check application logs: `pm2 logs pdfcraft-api`
2. Check system logs: `journalctl -u nginx -f`
3. Run health check: `curl http://localhost:3001/health`
4. Check PM2 status: `pm2 status`

---

*Generated for PDFCraft.Pro v1.0.0*
*Last Updated: December 2024*