# Docker Quick Reference - PDFCraft.Pro

## 🚀 Quick Start

```bash
# Production deployment (databases internal only)
docker-compose up -d

# Development with database access
docker-compose --profile debug up -d

# Production with Nginx
docker-compose --profile production up -d
```

## 🔧 Common Commands

### Build & Start
```bash
docker-compose build                    # Build all images
docker-compose build --no-cache         # Fresh build
docker-compose up -d                    # Start detached
docker-compose restart backend          # Restart service
docker-compose down                     # Stop all
docker-compose down -v                  # Stop + remove volumes
```

### Logs & Monitoring
```bash
docker-compose logs -f                  # All logs (follow)
docker-compose logs -f backend          # Backend logs
docker-compose logs --tail=100 backend  # Last 100 lines
docker-compose ps                       # Service status
docker stats                            # Resource usage
```

### Access Containers
```bash
docker-compose exec backend sh          # Backend shell
docker-compose exec mysql mysql -u root -p pdfcraft_db
docker-compose exec redis redis-cli
docker-compose exec frontend sh
```

## 🏥 Health Checks

```bash
# Backend API
curl http://localhost:3001/health

# Frontend
curl http://localhost:3000

# Check all services
docker-compose ps
```

## 🗄️ Database Operations

### MySQL
```bash
# Backup
docker-compose exec mysql mysqldump -u root -p pdfcraft_db > backup.sql

# Restore
docker-compose exec -T mysql mysql -u root -p pdfcraft_db < backup.sql

# Access console
docker-compose exec mysql mysql -u root -p pdfcraft_db

# View users
docker-compose exec mysql mysql -u root -p pdfcraft_db -e "SELECT id, email, plan FROM users"
```

### Redis
```bash
# Access CLI
docker-compose exec redis redis-cli

# Monitor commands
docker-compose exec redis redis-cli MONITOR

# View keys
docker-compose exec redis redis-cli KEYS '*'
```

## 🔒 Security Profiles

### Production Mode (Default)
```bash
docker-compose up -d
```
- ✅ Databases NOT exposed to host
- ✅ Secure for production deployment

### Debug Mode
```bash
docker-compose --profile debug up -d
```
- ⚠️ MySQL exposed on port 3306
- ⚠️ Redis exposed on port 6379
- 🔧 For development/debugging only

## 📊 Resource Monitoring

```bash
# Real-time stats
docker stats

# Container resource limits
docker inspect pdflab-backend | grep -A 10 "Resources"

# Disk usage
docker system df

# Clean unused images
docker system prune -a
```

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check logs
docker-compose logs backend

# Check environment
docker-compose exec backend printenv

# Verify build
docker images | grep pdflab-backend
```

### Database Connection Issues
```bash
# Check MySQL health
docker-compose exec mysql mysqladmin ping -h localhost

# Verify password
echo $DB_PASSWORD

# Test connection from backend
docker-compose exec backend sh -c "nc -zv mysql 3306"
```

### High Memory Usage
```bash
# Check stats
docker stats

# Adjust limits in docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 4G  # Increase if needed
```

## 🔄 Updates & Rebuilds

```bash
# Pull latest code
git pull origin main

# Rebuild specific service
docker-compose build --no-cache backend

# Restart with new image
docker-compose up -d backend

# Full rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📦 Image Management

```bash
# List images
docker images

# Remove old images
docker image prune -a

# Check image size
docker images pdflab-backend --format "{{.Size}}"

# Remove specific image
docker rmi pdfcraft-pro-backend
```

## 🌐 Nginx Operations

```bash
# Start with Nginx
docker-compose --profile production up -d

# Test Nginx config
docker-compose exec nginx nginx -t

# Reload Nginx
docker-compose exec nginx nginx -s reload

# View Nginx logs
docker-compose logs nginx
```

## ⚙️ Environment Variables

```bash
# View backend env vars
docker-compose exec backend printenv

# Check specific variable
docker-compose exec backend printenv DB_HOST

# Load from .env file
docker-compose --env-file .env.production up -d
```

## 🔐 SSL Certificate Setup

```bash
# Generate Let's Encrypt certificate
sudo certbot certonly --standalone \
  -d pdfcraft.pro \
  -d www.pdfcraft.pro

# Copy to nginx directory
sudo cp /etc/letsencrypt/live/pdfcraft.pro/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/pdfcraft.pro/privkey.pem nginx/ssl/

# Restart nginx
docker-compose restart nginx
```

## 📈 Performance Testing

```bash
# Load test backend
ab -n 1000 -c 10 http://localhost:3001/health

# Monitor during load
docker stats --no-stream

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/health
```

## 🛠️ Maintenance

```bash
# Clean everything (⚠️ removes volumes)
docker-compose down -v
docker system prune -a --volumes

# Restart all services
docker-compose restart

# Update base images
docker-compose pull
docker-compose up -d

# Export logs
docker-compose logs > logs_$(date +%Y%m%d).txt
```

## 📱 Network Debugging

```bash
# List networks
docker network ls

# Inspect network
docker network inspect pdfcraft-pro_pdflab-network

# Test connectivity between containers
docker-compose exec backend ping mysql
docker-compose exec backend ping redis
```

## 💾 Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect pdfcraft-pro_mysql_data

# Backup volume
docker run --rm -v pdfcraft-pro_mysql_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/mysql_backup.tar.gz /data

# Restore volume
docker run --rm -v pdfcraft-pro_mysql_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/mysql_backup.tar.gz -C /
```

## 🔍 Useful Inspections

```bash
# Container details
docker inspect pdflab-backend

# Container IP address
docker inspect pdflab-backend | grep IPAddress

# Container logs location
docker inspect pdflab-backend | grep LogPath

# Container port mappings
docker port pdflab-backend
```

## 🎯 Quick Fixes

### Reset Everything
```bash
docker-compose down -v
rm -rf mysql_data redis_data uploads temp logs
docker-compose up -d
```

### Force Rebuild Backend
```bash
docker-compose stop backend
docker-compose rm -f backend
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Clear Redis Cache
```bash
docker-compose exec redis redis-cli FLUSHALL
```

### Reset MySQL Password
```bash
docker-compose exec mysql mysql -u root -p -e \
  "ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';"
```

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Service orchestration |
| `backend/Dockerfile` | Backend image definition |
| `Dockerfile.frontend` | Frontend image definition |
| `nginx/nginx.conf` | Nginx reverse proxy config |
| `.env` | Environment variables |
| `DOCKER_SETUP.md` | Full documentation |
| `DOCKER_IMPROVEMENTS_SUMMARY.md` | What changed |

---

## 🆘 Emergency Commands

```bash
# Kill all containers immediately
docker kill $(docker ps -q)

# Remove all containers
docker rm -f $(docker ps -aq)

# Free disk space
docker system prune -a --volumes -f

# Restart Docker daemon (Linux)
sudo systemctl restart docker

# Check Docker daemon status
docker info
```

---

**Pro Tip**: Add these aliases to your shell:

```bash
alias dcup='docker-compose up -d'
alias dcdown='docker-compose down'
alias dclogs='docker-compose logs -f'
alias dcps='docker-compose ps'
alias dcbuild='docker-compose build --no-cache'
alias dcrestart='docker-compose restart'
```

---

**Last Updated**: January 2025
**For**: PDFCraft.Pro Production Deployment
