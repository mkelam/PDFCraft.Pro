#!/bin/bash

# PDFCraft.Pro Production Deployment Script
# Usage: ./scripts/deploy.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
DEPLOY_DIR="/var/www/pdfcraft"
LOG_DIR="/var/log/pdfcraft"
SERVICE_NAME="pdfcraft-api"

echo "🚀 Starting deployment to $ENVIRONMENT environment..."

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
   echo "⚠️  This script should not be run as root for security reasons"
   exit 1
fi

# Verify environment
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" ]]; then
    echo "❌ Invalid environment. Use 'production' or 'staging'"
    exit 1
fi

echo "📋 Pre-deployment checks..."

# Check Node.js version
NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"

# Check PM2 installation
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Check LibreOffice installation
if ! command -v libreoffice &> /dev/null; then
    echo "📦 Installing LibreOffice..."
    sudo apt-get update
    sudo apt-get install -y libreoffice fonts-liberation
fi

echo "🏗️  Building application..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Create necessary directories
echo "📁 Setting up directories..."
sudo mkdir -p $LOG_DIR $DEPLOY_DIR/uploads $DEPLOY_DIR/temp
sudo chown -R $USER:$USER $LOG_DIR $DEPLOY_DIR/uploads $DEPLOY_DIR/temp

# Set proper permissions
echo "🔐 Setting permissions..."
chmod -R 755 $DEPLOY_DIR/uploads $DEPLOY_DIR/temp
chmod -R 644 $LOG_DIR

echo "🔄 Deploying application..."

# Stop existing PM2 processes
echo "⏹️  Stopping existing processes..."
pm2 stop $SERVICE_NAME 2>/dev/null || echo "No existing process to stop"

# Copy built files to deployment directory (if different from current)
if [[ "$PWD" != "$DEPLOY_DIR" ]]; then
    echo "📋 Copying files to deployment directory..."
    sudo rsync -av --delete \
        --exclude node_modules \
        --exclude uploads \
        --exclude temp \
        --exclude logs \
        --exclude .git \
        . $DEPLOY_DIR/
fi

# Start application with PM2
echo "🚀 Starting application..."
if [[ "$ENVIRONMENT" == "production" ]]; then
    pm2 start ecosystem.config.js --env production
else
    pm2 start ecosystem.config.js --env staging
fi

# Save PM2 configuration
pm2 save

# Setup PM2 startup script (if not already done)
echo "💾 Setting up PM2 startup..."
pm2 startup | grep -E '^sudo' | bash || echo "PM2 startup already configured"

echo "🔍 Verifying deployment..."

# Wait for application to start
sleep 5

# Check if application is responding
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Application is responding"
else
    echo "❌ Application health check failed"
    pm2 logs $SERVICE_NAME --lines 20
    exit 1
fi

# Show PM2 status
echo "📊 PM2 Status:"
pm2 status

echo "🎉 Deployment completed successfully!"
echo "📋 Next steps:"
echo "   • Update DNS to point to this server"
echo "   • Configure SSL certificates"
echo "   • Set up monitoring alerts"
echo "   • Configure backup procedures"
echo ""
echo "📞 Useful commands:"
echo "   • View logs: pm2 logs $SERVICE_NAME"
echo "   • Restart: pm2 restart $SERVICE_NAME"
echo "   • Monitor: pm2 monit"
echo "   • Health check: curl http://localhost:3001/health"