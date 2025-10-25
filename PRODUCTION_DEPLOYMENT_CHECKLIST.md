# 🚀 PDFCraft.Pro Production Deployment Checklist

**Project Status**: 87% Complete | **Target Launch**: 7-10 Days
**Last Updated**: October 23, 2025
**BMAD Certification**: Grade A+ (EXCEPTIONAL)

---

## 📋 **PRE-DEPLOYMENT CHECKLIST**

### ✅ **Phase 1: Infrastructure Setup** (Est: 4-6 hours)

#### **1.1 Hostinger VPS Setup**
- [ ] Login to Hostinger VPS control panel
- [ ] Verify VPS plan: VPS 2 (2 vCPU, 8GB RAM) - $8.99/month
- [ ] Note down VPS IP address: `_________________`
- [ ] Note down SSH credentials
- [ ] Test SSH connection: `ssh root@YOUR_VPS_IP`

#### **1.2 Server Software Installation**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version   # Should be 10.x.x

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install LibreOffice
sudo apt install -y libreoffice libreoffice-writer libreoffice-impress

# Install Tesseract OCR
sudo apt install -y tesseract-ocr tesseract-ocr-eng

# Install ImageMagick
sudo apt install -y imagemagick

# Install Ghostscript
sudo apt install -y ghostscript

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (optional - for reverse proxy)
sudo apt install -y nginx
```

- [ ] Node.js 20+ installed and verified
- [ ] MySQL 8.0+ installed and secured
- [ ] Redis server installed and running
- [ ] LibreOffice installed (`/usr/bin/libreoffice`)
- [ ] Tesseract OCR installed (`/usr/bin/tesseract`)
- [ ] ImageMagick installed (`/usr/bin/convert`)
- [ ] PM2 process manager installed
- [ ] Nginx installed (optional)

#### **1.3 MySQL Database Setup**
```bash
# Login to MySQL
sudo mysql -u root -p

# Create database
CREATE DATABASE pdfcraft_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user
CREATE USER 'pdfcraft_user'@'localhost' IDENTIFIED BY 'SECURE_PASSWORD_HERE';

# Grant privileges
GRANT ALL PRIVILEGES ON pdfcraft_prod.* TO 'pdfcraft_user'@'localhost';
FLUSH PRIVILEGES;

# Exit
EXIT;
```

- [ ] Database `pdfcraft_prod` created
- [ ] User `pdfcraft_user` created with secure password
- [ ] Privileges granted
- [ ] Connection tested: `mysql -u pdfcraft_user -p pdfcraft_prod`
- [ ] **Record credentials**:
  - DB_HOST: `localhost`
  - DB_NAME: `pdfcraft_prod`
  - DB_USER: `pdfcraft_user`
  - DB_PASSWORD: `_________________`

#### **1.4 Redis Configuration**
```bash
# Configure Redis password
sudo nano /etc/redis/redis.conf

# Find and uncomment this line, set password:
# requirepass YOUR_SECURE_REDIS_PASSWORD

# Restart Redis
sudo systemctl restart redis-server

# Test connection
redis-cli
AUTH YOUR_SECURE_REDIS_PASSWORD
PING  # Should return "PONG"
```

- [ ] Redis password configured
- [ ] Redis restarted
- [ ] Connection tested
- [ ] **Record credentials**:
  - REDIS_HOST: `localhost`
  - REDIS_PORT: `6379`
  - REDIS_PASSWORD: `_________________`

---

### ✅ **Phase 2: Project Deployment** (Est: 2-3 hours)

#### **2.1 Create Project Directory**
```bash
# Create project directory
sudo mkdir -p /var/www/pdfcraft
sudo chown -R $USER:$USER /var/www/pdfcraft

# Create subdirectories
mkdir -p /var/www/pdfcraft/{uploads,temp,output,logs}

# Set permissions
chmod -R 755 /var/www/pdfcraft
```

- [ ] Directory `/var/www/pdfcraft` created
- [ ] Upload, temp, output, logs subdirectories created
- [ ] Permissions set correctly

#### **2.2 Upload Code to VPS**
```bash
# Option 1: Using Git (Recommended)
cd /var/www/pdfcraft
git clone https://github.com/YOUR_USERNAME/pdfcraft-pro.git .

# Option 2: Using SCP from local machine
scp -r C:\Users\Mac\OneDrive\Desktop\Projects\PDFCraft.Pro\backend root@YOUR_VPS_IP:/var/www/pdfcraft/
```

- [ ] Code uploaded to VPS
- [ ] Git repository initialized (if using Git)

#### **2.3 Install Dependencies**
```bash
cd /var/www/pdfcraft/backend
npm ci --production
```

- [ ] Backend dependencies installed
- [ ] No errors during installation

#### **2.4 Build TypeScript**
```bash
cd /var/www/pdfcraft/backend
npm run build
```

- [ ] TypeScript compiled successfully
- [ ] `dist/` directory created
- [ ] No build errors

---

### ✅ **Phase 3: Environment Configuration** (Est: 1-2 hours)

#### **3.1 Create Production Environment File**
```bash
cd /var/www/pdfcraft/backend
cp .env.production.template .env.production
nano .env.production
```

**Fill in ALL placeholders with actual values:**

- [ ] **Database credentials** (from Phase 1.3)
  - DB_HOST, DB_NAME, DB_USER, DB_PASSWORD

- [ ] **Redis credentials** (from Phase 1.4)
  - REDIS_HOST, REDIS_PORT, REDIS_PASSWORD

- [ ] **JWT Secret** (generate new secure key)
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
  - JWT_SECRET, SESSION_SECRET

- [ ] **PayFast credentials** (from PayFast dashboard)
  - PAYFAST_MERCHANT_ID
  - PAYFAST_MERCHANT_KEY
  - PAYFAST_PASSPHRASE
  - PAYFAST_MODE=production

- [ ] **Email SMTP credentials** (from Hostinger email panel)
  - SMTP_HOST, SMTP_USER, SMTP_PASS

- [ ] **File paths** (should match VPS structure)
  - UPLOAD_DIR=/var/www/pdfcraft/uploads
  - TEMP_DIR=/var/www/pdfcraft/temp
  - OUTPUT_DIR=/var/www/pdfcraft/output
  - LOG_DIR=/var/www/pdfcraft/logs

- [ ] **Security settings**
  - CORS_ORIGINS=https://pdfcraft.pro
  - API_URL=https://api.pdfcraft.pro
  - FORCE_HTTPS=true

#### **3.2 Generate Secrets**
```bash
# Generate JWT Secret (64 characters)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
echo "JWT_SECRET=$JWT_SECRET"

# Generate Session Secret (64 characters)
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
echo "SESSION_SECRET=$SESSION_SECRET"

# Save these to .env.production
```

- [ ] JWT_SECRET generated and saved
- [ ] SESSION_SECRET generated and saved
- [ ] Both secrets are 64+ characters

#### **3.3 Database Migration**
```bash
# Run database migrations
cd /var/www/pdfcraft/backend
NODE_ENV=production node dist/config/migrate.js

# Or manually run SQL migration
mysql -u pdfcraft_user -p pdfcraft_prod < src/migrations/001_initial_schema.sql
```

- [ ] Database tables created
- [ ] Migration completed without errors
- [ ] Tables verified: `users`, `conversion_jobs`, `payment_transactions`

---

### ✅ **Phase 4: Payment Integration** (Est: 2-3 hours)

#### **4.1 PayFast Setup**
1. [ ] Login to [PayFast Dashboard](https://www.payfast.co.za/login)
2. [ ] Navigate to **Settings → Integration**
3. [ ] Copy **Merchant ID**: `_________________`
4. [ ] Copy **Merchant Key**: `_________________`
5. [ ] Generate **Passphrase**: `_________________`
6. [ ] Set **Return URL**: `https://pdfcraft.pro/payment/success`
7. [ ] Set **Cancel URL**: `https://pdfcraft.pro/payment/cancel`
8. [ ] Set **Notify URL**: `https://api.pdfcraft.pro/api/payfast/webhook`
9. [ ] Enable **Instant Transaction Notification (ITN)**
10. [ ] Switch to **Live Mode** (not Sandbox)

#### **4.2 Test Payment Flow**
```bash
# Test PayFast sandbox first
curl -X POST http://YOUR_VPS_IP:3010/api/payfast/initiate \
  -H "Content-Type: application/json" \
  -d '{"plan":"starter","userId":1}'
```

- [ ] Sandbox payment initiated successfully
- [ ] Redirect URL received
- [ ] Webhook endpoint responding
- [ ] Payment notification received
- [ ] User subscription updated

#### **4.3 Live Payment Test**
- [ ] Create test account in PayFast
- [ ] Initiate real R1 payment
- [ ] Complete payment successfully
- [ ] Verify webhook received
- [ ] Verify database updated
- [ ] Verify user tier upgraded

---

### ✅ **Phase 5: Domain & SSL Setup** (Est: 1-2 hours)

#### **5.1 Domain DNS Configuration**
Login to your domain registrar and configure:

**A Records:**
```
Type    Name    Value               TTL
A       @       YOUR_VPS_IP         3600
A       www     YOUR_VPS_IP         3600
A       api     YOUR_VPS_IP         3600
```

- [ ] A record for `pdfcraft.pro` → VPS IP
- [ ] A record for `www.pdfcraft.pro` → VPS IP
- [ ] A record for `api.pdfcraft.pro` → VPS IP
- [ ] DNS propagation tested (dig/nslookup)
- [ ] Wait 30-60 minutes for propagation

#### **5.2 SSL Certificate (Let's Encrypt)**
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d pdfcraft.pro -d www.pdfcraft.pro -d api.pdfcraft.pro

# Test auto-renewal
sudo certbot renew --dry-run
```

- [ ] Certbot installed
- [ ] SSL certificates obtained
- [ ] HTTPS working for all domains
- [ ] Auto-renewal configured
- [ ] Certificate expiry: `_________________` (90 days)

#### **5.3 Nginx Configuration** (Optional - Reverse Proxy)
```nginx
# /etc/nginx/sites-available/pdfcraft
server {
    listen 80;
    server_name api.pdfcraft.pro;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.pdfcraft.pro;

    ssl_certificate /etc/letsencrypt/live/pdfcraft.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdfcraft.pro/privkey.pem;

    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/pdfcraft /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

- [ ] Nginx configured
- [ ] SSL enabled
- [ ] Reverse proxy working
- [ ] HTTPS redirect enabled

---

### ✅ **Phase 6: Process Management** (Est: 1 hour)

#### **6.1 PM2 Configuration**
```bash
# Create PM2 ecosystem file
cd /var/www/pdfcraft/backend
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'pdfcraft-api',
    script: './dist/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3010
    },
    error_file: '/var/www/pdfcraft/logs/pm2-error.log',
    out_file: '/var/www/pdfcraft/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    restart_delay: 4000
  }]
};
```

```bash
# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command it outputs

# Monitor
pm2 monit
```

- [ ] PM2 ecosystem configured
- [ ] Application started with PM2
- [ ] 2 instances running (cluster mode)
- [ ] PM2 startup script configured
- [ ] Logs accessible: `pm2 logs pdfcraft-api`

#### **6.2 Health Check**
```bash
# Test health endpoint
curl http://localhost:3010/health

# Expected response:
# {"status":"healthy","uptime":123,"timestamp":"..."}
```

- [ ] Health check endpoint responding
- [ ] Database connection verified
- [ ] Redis connection verified
- [ ] All services healthy

---

### ✅ **Phase 7: Final Testing** (Est: 2-3 hours)

#### **7.1 API Endpoint Testing**
```bash
# Test PDF upload
curl -X POST https://api.pdfcraft.pro/api/convert/pdf-to-ppt \
  -F "files=@test.pdf" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test job status
curl https://api.pdfcraft.pro/api/job/JOB_ID/status

# Test file download
curl https://api.pdfcraft.pro/api/download/OUTPUT_FILE
```

- [ ] PDF upload working
- [ ] Conversion processing
- [ ] Job status tracking
- [ ] File download working
- [ ] Conversion completes in <5 seconds

#### **7.2 Authentication Testing**
```bash
# Test user registration
curl -X POST https://api.pdfcraft.pro/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# Test login
curl -X POST https://api.pdfcraft.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'
```

- [ ] User registration working
- [ ] Login working
- [ ] JWT token generated
- [ ] Password hashing verified

#### **7.3 Payment Integration Testing**
- [ ] Initiate Starter plan payment ($7)
- [ ] Complete payment on PayFast
- [ ] Verify webhook received
- [ ] Verify user upgraded to "starter"
- [ ] Verify conversion limit increased to 100/month
- [ ] Test Pro plan upgrade ($19)

#### **7.4 Performance Testing**
```bash
# Run load test (if you have Apache Bench)
ab -n 100 -c 10 https://api.pdfcraft.pro/health

# Or use the comprehensive test script
npm run test:production
```

- [ ] Server handles 100 requests
- [ ] Average response time <200ms
- [ ] No errors under load
- [ ] Memory usage stable
- [ ] CPU usage <80%

#### **7.5 End-to-End User Flow**
- [ ] User visits pdfcraft.pro
- [ ] User signs up (free tier)
- [ ] User uploads PDF
- [ ] Conversion completes successfully
- [ ] User downloads PowerPoint
- [ ] File is valid and opens in PowerPoint
- [ ] User hits free tier limit (3/day)
- [ ] User upgrades to Starter plan
- [ ] Payment completes successfully
- [ ] User can now convert more files

---

### ✅ **Phase 8: Monitoring & Alerts** (Est: 1 hour)

#### **8.1 Setup Monitoring**
```bash
# Install monitoring tools
npm install -g pm2-logrotate

# Configure log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

- [ ] Log rotation configured
- [ ] Logs retained for 7 days
- [ ] Max log size: 10MB

#### **8.2 Health Check Monitoring**
```bash
# Create health check cron job
crontab -e

# Add this line (check every 5 minutes)
*/5 * * * * curl -f http://localhost:3010/health || systemctl restart pdfcraft-api
```

- [ ] Cron job for health checks
- [ ] Auto-restart on failure
- [ ] Health check interval: 5 minutes

#### **8.3 Setup Alerts** (Optional - Email Alerts)
```bash
# Install mailutils for system emails
sudo apt install -y mailutils

# Test email
echo "Test email from PDFCraft.Pro server" | mail -s "Test" your@email.com
```

- [ ] Email alerts configured
- [ ] Test email received
- [ ] Error alerts enabled

---

### ✅ **Phase 9: Security Hardening** (Est: 1-2 hours)

#### **9.1 Firewall Configuration**
```bash
# Enable UFW firewall
sudo ufw allow 22/tcp        # SSH
sudo ufw allow 80/tcp        # HTTP
sudo ufw allow 443/tcp       # HTTPS
sudo ufw allow 3010/tcp      # API (if not using Nginx)
sudo ufw enable

# Verify
sudo ufw status
```

- [ ] Firewall enabled
- [ ] Only required ports open
- [ ] SSH access maintained

#### **9.2 Secure MySQL**
```bash
# Disable remote MySQL access
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Ensure this line exists:
bind-address = 127.0.0.1

# Restart MySQL
sudo systemctl restart mysql
```

- [ ] MySQL bound to localhost only
- [ ] No remote access to database

#### **9.3 Secure Redis**
```bash
# Ensure Redis is bound to localhost
sudo nano /etc/redis/redis.conf

# Verify:
bind 127.0.0.1 ::1

# Restart Redis
sudo systemctl restart redis-server
```

- [ ] Redis bound to localhost only
- [ ] Password authentication required

#### **9.4 Regular Updates**
```bash
# Setup auto-updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

- [ ] Auto-updates enabled
- [ ] Security patches applied automatically

---

### ✅ **Phase 10: Backup & Disaster Recovery** (Est: 1 hour)

#### **10.1 Database Backup Script**
```bash
# Create backup script
sudo nano /var/www/pdfcraft/scripts/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/pdfcraft"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u pdfcraft_user -p'YOUR_PASSWORD' pdfcraft_prod > $BACKUP_DIR/db_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete

echo "Backup completed: db_$DATE.sql"
```

```bash
# Make executable
chmod +x /var/www/pdfcraft/scripts/backup-db.sh

# Test backup
sudo /var/www/pdfcraft/scripts/backup-db.sh

# Setup daily backup cron
crontab -e
# Add: 0 2 * * * /var/www/pdfcraft/scripts/backup-db.sh
```

- [ ] Backup script created
- [ ] Script tested successfully
- [ ] Daily backup cron configured (2 AM)
- [ ] 7-day retention policy set

#### **10.2 Application Backup**
```bash
# Create app backup script
sudo nano /var/www/pdfcraft/scripts/backup-app.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/pdfcraft"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup application code
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/pdfcraft/backend

# Keep only last 3 backups
ls -t $BACKUP_DIR/app_*.tar.gz | tail -n +4 | xargs rm -f
```

- [ ] App backup script created
- [ ] Weekly backup scheduled

---

## 🎉 **DEPLOYMENT GO-LIVE CHECKLIST**

### **Final Pre-Launch Verification**
- [ ] All environment variables configured
- [ ] Database connected and migrated
- [ ] Redis connected and operational
- [ ] PM2 running with 2 instances
- [ ] SSL certificates installed and valid
- [ ] Domain pointing to VPS
- [ ] PayFast live payments working
- [ ] Email notifications working
- [ ] Conversion pipeline tested end-to-end
- [ ] Performance benchmarks met (<5s conversion)
- [ ] Backups configured and tested
- [ ] Monitoring and alerts active
- [ ] Security hardening complete

### **Launch Procedure**
1. [ ] Final backup of current state
2. [ ] Announce maintenance window (if needed)
3. [ ] Switch DNS to production servers
4. [ ] Verify all services running
5. [ ] Test with real user account
6. [ ] Monitor logs for errors
7. [ ] Announce launch! 🚀

---

## 📊 **POST-LAUNCH MONITORING** (First 24 Hours)

### **Hourly Checks (First 6 Hours)**
- [ ] Hour 1: Server running, no errors
- [ ] Hour 2: Conversions processing successfully
- [ ] Hour 3: Payments working
- [ ] Hour 4: Memory usage stable
- [ ] Hour 5: No critical errors
- [ ] Hour 6: Performance metrics good

### **Daily Checks (First Week)**
- [ ] Day 1: System stable, backups running
- [ ] Day 2: Payment processing verified
- [ ] Day 3: User feedback reviewed
- [ ] Day 4: Performance optimizations
- [ ] Day 5: Scale testing
- [ ] Day 6: Backup restoration tested
- [ ] Day 7: Weekly review and optimization

---

## 📞 **EMERGENCY CONTACTS**

| Service | Contact | Notes |
|---------|---------|-------|
| **Hostinger Support** | support@hostinger.com | VPS issues |
| **PayFast Support** | support@payfast.co.za | Payment issues |
| **Domain Registrar** | ___________________ | DNS issues |
| **Developer** | ___________________ | Code issues |

---

## 🎯 **SUCCESS METRICS**

Track these metrics post-launch:

| Metric | Target | Day 1 | Week 1 | Month 1 |
|--------|--------|-------|--------|---------|
| Uptime | 99.9% | ___ | ___ | ___ |
| Avg Conversion Time | <5s | ___ | ___ | ___ |
| Successful Conversions | >95% | ___ | ___ | ___ |
| Active Users | 200 | ___ | ___ | ___ |
| Revenue (MRR) | $1,000 | ___ | ___ | ___ |
| Free→Paid Conversion | 5% | ___ | ___ | ___ |

---

## ✅ **DEPLOYMENT SIGN-OFF**

**Deployed By**: _________________
**Date**: _________________
**Time**: _________________
**Version**: 1.0.0
**Environment**: Production
**Status**: ☐ Success ☐ Failed ☐ Rolled Back

**Notes**:
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________

---

**🎉 CONGRATULATIONS! PDFCraft.Pro is now LIVE!** 🎉

