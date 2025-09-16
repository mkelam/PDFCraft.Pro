#!/bin/bash

# PDFCraft.Pro Backend Deployment Script for Hostinger VPS
# Usage: ./deploy.sh [production|staging]

set -e  # Exit on any error

ENVIRONMENT=${1:-production}
VPS_HOST="your-vps-ip"
VPS_USER="your-username"
DEPLOY_PATH="/var/www/pdfcraft"
APP_NAME="pdfcraft-api"

echo "🚀 Starting deployment to $ENVIRONMENT environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

function log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

function log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed locally
if ! command -v scp &> /dev/null; then
    log_error "scp is required but not installed"
    exit 1
fi

if ! command -v ssh &> /dev/null; then
    log_error "ssh is required but not installed"
    exit 1
fi

# Validate environment
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" ]]; then
    log_error "Environment must be 'production' or 'staging'"
    exit 1
fi

log_info "Building application locally..."

# Install dependencies and build
npm ci --production=false
npm run build

if [ ! -d "dist" ]; then
    log_error "Build failed - dist directory not found"
    exit 1
fi

log_info "Build completed successfully"

# Create deployment package
log_info "Creating deployment package..."
tar -czf deploy.tar.gz \
    dist/ \
    package.json \
    package-lock.json \
    .env.example

log_info "Uploading to VPS..."

# Upload files to VPS
scp deploy.tar.gz $VPS_USER@$VPS_HOST:/tmp/

# Connect to VPS and deploy
ssh $VPS_USER@$VPS_HOST << EOF
set -e

# Create deployment directory if it doesn't exist
sudo mkdir -p $DEPLOY_PATH
sudo chown $VPS_USER:$VPS_USER $DEPLOY_PATH

# Backup current deployment
if [ -d "$DEPLOY_PATH/backend" ]; then
    echo "📦 Creating backup..."
    sudo mv $DEPLOY_PATH/backend $DEPLOY_PATH/backend_backup_\$(date +%Y%m%d_%H%M%S)
fi

# Extract new deployment
cd $DEPLOY_PATH
tar -xzf /tmp/deploy.tar.gz -C .
mv dist backend

# Install production dependencies
cd $DEPLOY_PATH
npm ci --production

# Set up environment file
if [ ! -f ".env" ]; then
    echo "📝 Creating environment file from template..."
    cp .env.example .env
    echo "⚠️  WARNING: Please edit .env file with your actual configuration"
fi

# Set proper permissions
sudo chown -R $VPS_USER:$VPS_USER $DEPLOY_PATH
chmod +x $DEPLOY_PATH/backend/server.js

# Create necessary directories
mkdir -p /tmp/uploads
mkdir -p /tmp/processing
chmod 755 /tmp/uploads /tmp/processing

# Restart the application
if pm2 list | grep -q "$APP_NAME"; then
    echo "🔄 Restarting existing application..."
    pm2 restart $APP_NAME
else
    echo "🚀 Starting new application..."
    cd $DEPLOY_PATH
    pm2 start backend/server.js --name "$APP_NAME" --env $ENVIRONMENT
fi

# Save PM2 configuration
pm2 save

# Clean up
rm /tmp/deploy.tar.gz

echo "✅ Deployment completed successfully!"
pm2 status
EOF

# Clean up local files
rm deploy.tar.gz

log_info "Deployment completed!"
log_warn "Don't forget to:"
log_warn "1. Update .env file on the server with your actual configuration"
log_warn "2. Set up MySQL database and run migrations"
log_warn "3. Configure Redis if not already done"
log_warn "4. Set up SSL certificate"
log_warn "5. Configure domain DNS"

echo ""
log_info "To check application status:"
echo "ssh $VPS_USER@$VPS_HOST 'pm2 status'"

log_info "To view logs:"
echo "ssh $VPS_USER@$VPS_HOST 'pm2 logs $APP_NAME'"

log_info "To check health:"
echo "curl http://$VPS_HOST:3001/health"