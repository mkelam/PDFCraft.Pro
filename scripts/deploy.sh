#!/bin/bash

# PDFCraft.Pro Deployment Script for Hostinger VPS
# Run this script on your Hostinger VPS to deploy the application

set -e  # Exit on any error

echo "🚀 Starting PDFCraft.Pro deployment..."

# Configuration
APP_NAME="pdfcraft-pro"
REPO_URL="https://github.com/yourusername/pdfcraft-pro.git"  # Update with your repo
APP_DIR="/var/www/pdfcraft"
DOCKER_COMPOSE_FILE="docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo_error "This script should not be run as root for security reasons"
   echo "Please run as a regular user with sudo privileges"
   exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo_warn "Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo_info "Docker installed. Please log out and log back in, then run this script again."
    exit 0
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo_warn "Docker Compose not found. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create application directory
echo_info "Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Clone or update repository
if [ -d "$APP_DIR/.git" ]; then
    echo_info "Updating existing repository..."
    cd $APP_DIR
    git pull origin main
else
    echo_info "Cloning repository..."
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo_warn ".env file not found. Creating from template..."
    cp .env.production .env
    echo_error "Please edit .env file with your actual configuration values:"
    echo "  - Database passwords"
    echo "  - JWT secrets"
    echo "  - Paystack API keys"
    echo "  - Domain configuration"
    echo ""
    echo "Run 'nano .env' to edit the file, then run this script again."
    exit 1
fi

# Create necessary directories
echo_info "Creating necessary directories..."
mkdir -p mysql/init nginx/ssl logs

# Build and start containers
echo_info "Building and starting Docker containers..."
docker-compose down --remove-orphans || true
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo_info "Waiting for services to start..."
sleep 30

# Check if services are running
echo_info "Checking service health..."
if docker-compose ps | grep -q "Up"; then
    echo_info "✅ Services are running!"

    # Show running containers
    docker-compose ps

    echo ""
    echo_info "🎉 Deployment completed successfully!"
    echo_info "Your PDFCraft.Pro application should be accessible at:"
    echo_info "  - http://your-server-ip:3001"
    echo_info "  - Health check: http://your-server-ip:3001/api/health"
    echo ""
    echo_warn "Next steps:"
    echo "  1. Configure your domain DNS to point to this server"
    echo "  2. Set up SSL certificates for HTTPS"
    echo "  3. Configure firewall rules"
    echo "  4. Set up monitoring and backups"

else
    echo_error "❌ Some services failed to start. Check logs:"
    docker-compose logs
    exit 1
fi

# Show logs
echo_info "Recent application logs:"
docker-compose logs --tail=20 pdfcraft-app