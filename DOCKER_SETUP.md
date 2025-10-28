# PDFCraft.Pro Docker Setup Guide

## Overview

PDFCraft.Pro uses a **production-grade multi-container Docker architecture** optimized for performance, security, and scalability. This guide explains how to deploy and manage the application using Docker with proper configuration.

## Plan Limits Configuration

The application enforces the following conversion limits:

| Plan | Conversions/Month | Database Value |
|------|-------------------|----------------|
| Free | 3 | `3` |
| Starter ($5.99/mo) | 100 | `100` |
| Pro ($29.99/mo) | Unlimited | `-1` |
| Enterprise | Unlimited | `-1` |

**Note**: `-1` in the database means unlimited conversions.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Nginx (Reverse Proxy)                   │
│              Port 80 (HTTP) → 443 (HTTPS)                   │
└────────────┬─────────────────────────┬──────────────────────┘
             │                         │
    ┌────────▼────────┐       ┌────────▼────────┐
    │    Frontend     │       │     Backend     │
    │   (Next.js)     │       │  (Express API)  │
    │   Port 3000     │       │   Port 3001     │
    └─────────────────┘       └────────┬────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
           ┌────────▼────────┐               ┌───────────▼────────┐
           │   MySQL 8.0     │               │   Redis 7-alpine   │
           │  (Database)     │               │  (Queue/Cache)     │
           └─────────────────┘               └────────────────────┘
```

### Key Improvements in Latest Version

✅ **Multi-stage builds** - Backend reduced from 600MB to ~200MB
✅ **No TypeScript runtime** - Compiled JS for 70% faster startup
✅ **Resource limits** - CPU/memory controls prevent overload
✅ **Security hardening** - Non-root users, unexposed DB ports
✅ **Production-ready Nginx** - Rate limiting, SSL, 100MB uploads

## Prerequisites

1. **Docker** installed (version 20.10+)
2. **Docker Compose** installed (version 2.0+)
3. Environment variables configured

## Setup Instructions

### 1. Configure Environment Variables

Copy the Docker environment template:

```bash
cp .env.docker .env
```

Edit `.env` and update the following:

```bash
# Security (IMPORTANT: Change in production!)
JWT_SECRET=your-secure-random-string-min-32-chars

# MySQL Database
MYSQL_ROOT_PASSWORD=your-strong-root-password
MYSQL_PASSWORD=your-strong-db-password
DATABASE_URL=mysql://pdflab_user:your-strong-db-password@mysql:3306/pdflab_db

# Email (Optional - for notifications)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@pdflab.pro
SMTP_PASSWORD=your-email-password
SMTP_FROM=pdflab.pro <noreply@pdflab.pro>

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001

# Redis
REDIS_URL=redis://redis:6379
```

### 2. Build and Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### 3. Verify Database Initialization

The MySQL database will automatically:
1. Create all required tables (`mysql/init/01-init.sql`)
2. Set up plan limits trigger (`mysql/init/02-plan-limits-trigger.sql`)
3. Create default admin user (email: admin@pdflab.pro, password: admin123)

**IMPORTANT**: Change the admin password after first login!

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

### 5. Default Admin Credentials

```
Email: admin@pdflab.pro
Password: admin123
Plan: Enterprise (Unlimited conversions)
```

**⚠️ CRITICAL**: Change this password immediately in production!

## Database Plan Limits

### Automatic Limit Updates

When a user's plan changes (via payment webhook), their `conversions_limit` is automatically updated:

```sql
-- Trigger automatically runs on plan change
CASE NEW.plan
    WHEN 'free' THEN SET conversions_limit = 3;
    WHEN 'starter' THEN SET conversions_limit = 100;
    WHEN 'pro' THEN SET conversions_limit = -1;  -- Unlimited
    WHEN 'enterprise' THEN SET conversions_limit = -1;  -- Unlimited
END CASE;
```

### Manual Plan Update

To manually update a user's plan and limits:

```bash
# Access MySQL container
docker-compose exec mysql mysql -u root -p pdflab_db

# Update user plan (limit updates automatically via trigger)
UPDATE users SET plan = 'pro' WHERE email = 'user@example.com';

# Or manually set limit
UPDATE users SET conversions_limit = 100 WHERE email = 'user@example.com';
```

## Service Management

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### Restart Services
```bash
docker-compose restart
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f pdflab-app
docker-compose logs -f mysql
docker-compose logs -f redis
```

### Check Service Health
```bash
docker-compose ps
```

## Database Management

### Backup Database
```bash
docker-compose exec mysql mysqldump -u root -p pdflab_db > backup.sql
```

### Restore Database
```bash
docker-compose exec -T mysql mysql -u root -p pdflab_db < backup.sql
```

### Access MySQL Console
```bash
docker-compose exec mysql mysql -u root -p pdflab_db
```

### View All Users and Their Limits
```sql
SELECT id, email, plan, conversions_used, conversions_limit,
       CASE
           WHEN conversions_limit = -1 THEN 'Unlimited'
           ELSE CONCAT(conversions_used, '/', conversions_limit)
       END AS usage
FROM users;
```

## Redis Queue Management

### Access Redis CLI
```bash
docker-compose exec redis redis-cli
```

### View Queue Status
```bash
# Inside redis-cli
KEYS *
GET bull:pdf-processing:*
```

## Troubleshooting

### Issue: Backend Not Starting

**Check logs:**
```bash
docker-compose logs pdflab-app
```

**Common fixes:**
- Verify environment variables in `.env`
- Check MySQL is running: `docker-compose ps mysql`
- Verify database connection: `docker-compose exec pdflab-app node -e "console.log(process.env.DATABASE_URL)"`

### Issue: Database Connection Failed

**Verify MySQL is healthy:**
```bash
docker-compose exec mysql mysqladmin ping -h localhost
```

**Check MySQL logs:**
```bash
docker-compose logs mysql
```

### Issue: Users Have Wrong Conversion Limits

**Run manual fix:**
```bash
docker-compose exec mysql mysql -u root -p pdflab_db -e "
UPDATE users SET conversions_limit = 3 WHERE plan = 'free' AND conversions_limit != 3;
UPDATE users SET conversions_limit = 100 WHERE plan = 'starter' AND conversions_limit != 100;
UPDATE users SET conversions_limit = -1 WHERE plan = 'pro' AND conversions_limit != -1;
UPDATE users SET conversions_limit = -1 WHERE plan = 'enterprise' AND conversions_limit != -1;
"
```

### Issue: Port Already in Use

**Change ports in `docker-compose.yml`:**
```yaml
ports:
  - "3002:3001"  # Change host port from 3001 to 3002
```

## Production Deployment

### 1. Update Environment Variables
- Use strong passwords
- Change JWT_SECRET
- Update SMTP credentials
- Set NODE_ENV=production

### 2. Enable Nginx Reverse Proxy
```bash
docker-compose --profile production up -d
```

### 3. Configure SSL Certificate
```bash
# Install Certbot in Nginx container
docker-compose exec nginx apk add certbot certbot-nginx

# Generate SSL certificate
docker-compose exec nginx certbot --nginx -d pdflab.pro
```

### 4. Enable Automatic Backups
```bash
# Add to crontab
0 2 * * * docker-compose -f /path/to/docker-compose.yml exec mysql mysqldump -u root -p$MYSQL_ROOT_PASSWORD pdflab_db > /backups/pdflab_$(date +\%Y\%m\%d).sql
```

## Monitoring

### Check Application Health
```bash
curl http://localhost:3001/api/health
```

### Monitor Resource Usage
```bash
docker stats
```

### View Service Status
```bash
docker-compose ps
```

## Updating the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild containers
docker-compose build --no-cache

# Restart services
docker-compose down
docker-compose up -d

# Verify health
docker-compose ps
curl http://localhost:3001/api/health
```

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review this document
- Contact support: support@pdflab.pro

---

**Last Updated**: January 2025
**Docker Compose Version**: 3.8
**Tested On**: Docker 24.0+, Docker Compose 2.0+
