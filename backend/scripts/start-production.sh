#!/bin/bash

# PDFCraft.Pro Production Startup Script
# This script starts the application in production mode

set -e

PROJECT_DIR="/var/www/pdfcraft/backend"
LOG_DIR="/var/log/pdfcraft"

echo "🚀 Starting PDFCraft.Pro in production mode..."

# Change to project directory
cd "$PROJECT_DIR"

# Ensure log directory exists
sudo mkdir -p "$LOG_DIR"
sudo chown -R $USER:$USER "$LOG_DIR"

# Load production environment
if [[ -f ".env.production" ]]; then
    echo "📝 Loading production environment..."
    export $(cat .env.production | grep -v '^#' | xargs)
else
    echo "⚠️  Warning: .env.production file not found"
fi

# Verify Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [[ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]]; then
    echo "❌ Node.js version $NODE_VERSION is below required version $REQUIRED_VERSION"
    exit 1
fi

echo "✅ Node.js version: $NODE_VERSION"

# Install production dependencies if needed
if [[ ! -d "node_modules" ]] || [[ "package.json" -nt "node_modules" ]]; then
    echo "📦 Installing production dependencies..."
    npm ci --production
fi

# Build application
echo "🔨 Building application..."
npm run build

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads temp logs
sudo mkdir -p /var/www/pdfcraft/uploads /var/www/pdfcraft/temp

# Set proper permissions
echo "🔐 Setting permissions..."
sudo chown -R $USER:$USER uploads temp logs
chmod -R 755 uploads temp
chmod -R 644 logs

# Check if LibreOffice is available
if command -v libreoffice &> /dev/null; then
    echo "✅ LibreOffice found: $(libreoffice --version | head -1)"
    export LIBREOFFICE_AVAILABLE=true
else
    echo "⚠️  LibreOffice not found. PDF conversion will use mock service."
    export LIBREOFFICE_AVAILABLE=false
fi

# Start with PM2
echo "🚀 Starting application with PM2..."

# Stop existing processes
pm2 stop pdfcraft-api 2>/dev/null || echo "No existing process to stop"

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup startup script if not already done
pm2 startup | grep -E '^sudo' | bash 2>/dev/null || echo "PM2 startup already configured"

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 5

# Health check
echo "🔍 Performing health check..."
if curl -f http://localhost:${PORT:-3001}/health > /dev/null 2>&1; then
    echo "✅ Application started successfully!"
    echo "🌍 API available at: http://localhost:${PORT:-3001}"
    echo "📊 Health check: http://localhost:${PORT:-3001}/health"
    echo "📈 Monitoring: pm2 monit"
else
    echo "❌ Health check failed!"
    echo "📋 Checking logs..."
    pm2 logs pdfcraft-api --lines 20
    exit 1
fi

echo ""
echo "🎉 PDFCraft.Pro is now running in production mode!"
echo ""
echo "📋 Useful commands:"
echo "   • View logs: pm2 logs pdfcraft-api"
echo "   • Restart: pm2 restart pdfcraft-api"
echo "   • Stop: pm2 stop pdfcraft-api"
echo "   • Monitor: pm2 monit"
echo "   • Status: pm2 status"