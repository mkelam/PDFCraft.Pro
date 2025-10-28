#!/bin/bash

# ============================================
# PDFCraft.Pro - End-to-End Docker Test Suite
# ============================================
# This script performs comprehensive testing of the Docker setup
# Run with: bash test-docker-setup.sh

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
    ((TESTS_TOTAL++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
    ((TESTS_TOTAL++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test result tracking
TEST_RESULTS_FILE="docker-test-results.log"
echo "=== PDFCraft.Pro Docker Test Results ===" > "$TEST_RESULTS_FILE"
echo "Date: $(date)" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"

# ============================================
# PHASE 1: Pre-Flight Checks
# ============================================
echo ""
echo "============================================"
echo "PHASE 1: Pre-Flight Checks"
echo "============================================"
echo ""

# Test 1: Docker installed
log_info "Test 1: Checking Docker installation..."
if docker --version &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    log_success "Docker is installed: $DOCKER_VERSION"
    echo "✅ Docker installed: $DOCKER_VERSION" >> "$TEST_RESULTS_FILE"
else
    log_error "Docker is not installed"
    echo "❌ Docker not installed" >> "$TEST_RESULTS_FILE"
    exit 1
fi

# Test 2: Docker daemon running
log_info "Test 2: Checking Docker daemon status..."
if docker info &> /dev/null; then
    log_success "Docker daemon is running"
    echo "✅ Docker daemon running" >> "$TEST_RESULTS_FILE"
else
    log_error "Docker daemon is not running. Please start Docker Desktop."
    echo "❌ Docker daemon not running" >> "$TEST_RESULTS_FILE"
    exit 1
fi

# Test 3: Docker Compose available
log_info "Test 3: Checking Docker Compose..."
if docker-compose --version &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    log_success "Docker Compose is available: $COMPOSE_VERSION"
    echo "✅ Docker Compose: $COMPOSE_VERSION" >> "$TEST_RESULTS_FILE"
else
    log_error "Docker Compose is not available"
    echo "❌ Docker Compose not available" >> "$TEST_RESULTS_FILE"
    exit 1
fi

# Test 4: docker-compose.yml exists and is valid
log_info "Test 4: Validating docker-compose.yml..."
if [ -f "docker-compose.yml" ]; then
    if docker-compose config > /dev/null 2>&1; then
        log_success "docker-compose.yml is valid"
        echo "✅ docker-compose.yml valid" >> "$TEST_RESULTS_FILE"
    else
        log_error "docker-compose.yml has syntax errors"
        echo "❌ docker-compose.yml invalid" >> "$TEST_RESULTS_FILE"
        docker-compose config 2>&1 | head -10
        exit 1
    fi
else
    log_error "docker-compose.yml not found"
    echo "❌ docker-compose.yml not found" >> "$TEST_RESULTS_FILE"
    exit 1
fi

# Test 5: Required Dockerfiles exist
log_info "Test 5: Checking required Dockerfiles..."
DOCKERFILES_MISSING=0

if [ -f "backend/Dockerfile" ]; then
    log_success "backend/Dockerfile exists"
    echo "✅ backend/Dockerfile exists" >> "$TEST_RESULTS_FILE"
else
    log_error "backend/Dockerfile not found"
    echo "❌ backend/Dockerfile missing" >> "$TEST_RESULTS_FILE"
    ((DOCKERFILES_MISSING++))
fi

if [ -f "Dockerfile.frontend" ]; then
    log_success "Dockerfile.frontend exists"
    echo "✅ Dockerfile.frontend exists" >> "$TEST_RESULTS_FILE"
else
    log_error "Dockerfile.frontend not found"
    echo "❌ Dockerfile.frontend missing" >> "$TEST_RESULTS_FILE"
    ((DOCKERFILES_MISSING++))
fi

if [ $DOCKERFILES_MISSING -gt 0 ]; then
    exit 1
fi

# Test 6: Check .env file
log_info "Test 6: Checking .env file..."
if [ -f ".env" ]; then
    log_success ".env file exists"
    echo "✅ .env file exists" >> "$TEST_RESULTS_FILE"

    # Check critical variables
    REQUIRED_VARS=("DB_PASSWORD" "MYSQL_ROOT_PASSWORD" "JWT_SECRET")
    for VAR in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${VAR}=" .env 2>/dev/null; then
            log_success "  Required variable $VAR is set"
        else
            log_warning "  Required variable $VAR is missing or commented"
            echo "⚠️  Missing: $VAR" >> "$TEST_RESULTS_FILE"
        fi
    done
else
    log_warning ".env file not found (will use defaults)"
    echo "⚠️  .env file not found" >> "$TEST_RESULTS_FILE"
fi

# ============================================
# PHASE 2: Configuration Validation
# ============================================
echo ""
echo "============================================"
echo "PHASE 2: Configuration Validation"
echo "============================================"
echo ""

# Test 7: Service count in default mode
log_info "Test 7: Counting services in default mode..."
SERVICE_COUNT=$(docker-compose config --services | wc -l)
if [ "$SERVICE_COUNT" -eq 4 ]; then
    log_success "Default mode has 4 services (mysql, redis, backend, frontend)"
    echo "✅ Default mode: 4 services" >> "$TEST_RESULTS_FILE"
else
    log_error "Default mode should have 4 services, found $SERVICE_COUNT"
    echo "❌ Default mode: $SERVICE_COUNT services (expected 4)" >> "$TEST_RESULTS_FILE"
fi

# Test 8: Service count in production mode
log_info "Test 8: Counting services in production mode..."
SERVICE_COUNT_PROD=$(docker-compose --profile production config --services | wc -l)
if [ "$SERVICE_COUNT_PROD" -eq 5 ]; then
    log_success "Production mode has 5 services (+nginx)"
    echo "✅ Production mode: 5 services" >> "$TEST_RESULTS_FILE"
else
    log_error "Production mode should have 5 services, found $SERVICE_COUNT_PROD"
    echo "❌ Production mode: $SERVICE_COUNT_PROD services (expected 5)" >> "$TEST_RESULTS_FILE"
fi

# Test 9: Verify no profile on core services
log_info "Test 9: Verifying core services have no profile requirements..."
MYSQL_HAS_PROFILE=$(docker-compose config | grep -A 20 "mysql:" | grep -c "profiles:" || true)
REDIS_HAS_PROFILE=$(docker-compose config | grep -A 20 "redis:" | grep -c "profiles:" || true)

if [ "$MYSQL_HAS_PROFILE" -eq 0 ] && [ "$REDIS_HAS_PROFILE" -eq 0 ]; then
    log_success "MySQL and Redis have no profile requirements (always run)"
    echo "✅ Core services always run" >> "$TEST_RESULTS_FILE"
else
    log_error "MySQL or Redis has profile requirement (should always run)"
    echo "❌ Core services have profile requirements" >> "$TEST_RESULTS_FILE"
fi

# Test 10: Check backend dependencies
log_info "Test 10: Verifying backend dependencies..."
DEPENDS_ON=$(docker-compose config | grep -A 5 "backend:" | grep -A 5 "depends_on:")
if echo "$DEPENDS_ON" | grep -q "mysql" && echo "$DEPENDS_ON" | grep -q "redis"; then
    log_success "Backend correctly depends on mysql and redis"
    echo "✅ Backend dependencies correct" >> "$TEST_RESULTS_FILE"
else
    log_error "Backend dependencies not configured correctly"
    echo "❌ Backend dependencies incorrect" >> "$TEST_RESULTS_FILE"
fi

# ============================================
# PHASE 3: Environment Cleanup
# ============================================
echo ""
echo "============================================"
echo "PHASE 3: Environment Cleanup"
echo "============================================"
echo ""

log_info "Stopping any running containers..."
docker-compose down -v 2>&1 | tee -a "$TEST_RESULTS_FILE" || log_warning "No containers to stop"

log_info "Cleaning up old images (optional)..."
# Uncomment to clean old images: docker system prune -a -f

# ============================================
# PHASE 4: Build Phase
# ============================================
echo ""
echo "============================================"
echo "PHASE 4: Build Phase"
echo "============================================"
echo ""

# Test 11: Build backend image
log_info "Test 11: Building backend image..."
if docker-compose build --no-cache backend 2>&1 | tee -a "$TEST_RESULTS_FILE"; then
    log_success "Backend image built successfully"
    echo "✅ Backend build successful" >> "$TEST_RESULTS_FILE"

    # Check image size
    BACKEND_SIZE=$(docker images | grep pdfcraft.*backend | awk '{print $7}')
    log_info "Backend image size: $BACKEND_SIZE"
    echo "  Image size: $BACKEND_SIZE" >> "$TEST_RESULTS_FILE"
else
    log_error "Backend image build failed"
    echo "❌ Backend build failed" >> "$TEST_RESULTS_FILE"
    exit 1
fi

# Test 12: Build frontend image
log_info "Test 12: Building frontend image..."
if docker-compose build --no-cache frontend 2>&1 | tee -a "$TEST_RESULTS_FILE"; then
    log_success "Frontend image built successfully"
    echo "✅ Frontend build successful" >> "$TEST_RESULTS_FILE"

    FRONTEND_SIZE=$(docker images | grep pdfcraft.*frontend | awk '{print $7}')
    log_info "Frontend image size: $FRONTEND_SIZE"
    echo "  Image size: $FRONTEND_SIZE" >> "$TEST_RESULTS_FILE"
else
    log_error "Frontend image build failed"
    echo "❌ Frontend build failed" >> "$TEST_RESULTS_FILE"
    exit 1
fi

# ============================================
# PHASE 5: Startup Phase (Default Mode)
# ============================================
echo ""
echo "============================================"
echo "PHASE 5: Startup Phase (Default Mode)"
echo "============================================"
echo ""

# Test 13: Start services
log_info "Test 13: Starting all services in default mode..."
if docker-compose up -d 2>&1 | tee -a "$TEST_RESULTS_FILE"; then
    log_success "Services started successfully"
    echo "✅ Services started" >> "$TEST_RESULTS_FILE"
else
    log_error "Failed to start services"
    echo "❌ Service startup failed" >> "$TEST_RESULTS_FILE"
    exit 1
fi

log_info "Waiting 30 seconds for services to initialize..."
sleep 30

# Test 14: Verify container count
log_info "Test 14: Verifying container count..."
RUNNING_CONTAINERS=$(docker-compose ps --services | wc -l)
if [ "$RUNNING_CONTAINERS" -eq 4 ]; then
    log_success "All 4 containers are running"
    echo "✅ 4 containers running (expected 4)" >> "$TEST_RESULTS_FILE"
else
    log_error "Expected 4 containers, found $RUNNING_CONTAINERS"
    echo "❌ $RUNNING_CONTAINERS containers running (expected 4)" >> "$TEST_RESULTS_FILE"
    docker-compose ps
fi

# Test 15: Check container health status
log_info "Test 15: Checking container health status..."
docker-compose ps --format "table {{.Name}}\t{{.Status}}" | tee -a "$TEST_RESULTS_FILE"

# ============================================
# PHASE 6: Service Health Checks
# ============================================
echo ""
echo "============================================"
echo "PHASE 6: Service Health Checks"
echo "============================================"
echo ""

# Test 16: MySQL health
log_info "Test 16: Testing MySQL health..."
if docker-compose exec -T mysql mysqladmin ping -h localhost --silent 2>&1; then
    log_success "MySQL is healthy"
    echo "✅ MySQL healthy" >> "$TEST_RESULTS_FILE"
else
    log_error "MySQL health check failed"
    echo "❌ MySQL unhealthy" >> "$TEST_RESULTS_FILE"
fi

# Test 17: Redis health
log_info "Test 17: Testing Redis health..."
if docker-compose exec -T redis redis-cli ping 2>&1 | grep -q "PONG"; then
    log_success "Redis is healthy"
    echo "✅ Redis healthy" >> "$TEST_RESULTS_FILE"
else
    log_error "Redis health check failed"
    echo "❌ Redis unhealthy" >> "$TEST_RESULTS_FILE"
fi

# Test 18: Backend health endpoint
log_info "Test 18: Testing backend health endpoint..."
sleep 5  # Give backend extra time
if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
    BACKEND_RESPONSE=$(curl -s http://localhost:3001/health)
    log_success "Backend health endpoint responding"
    log_info "Response: $BACKEND_RESPONSE"
    echo "✅ Backend healthy: $BACKEND_RESPONSE" >> "$TEST_RESULTS_FILE"
else
    log_error "Backend health endpoint not responding"
    echo "❌ Backend unhealthy" >> "$TEST_RESULTS_FILE"
    log_info "Checking backend logs..."
    docker-compose logs --tail=50 backend
fi

# Test 19: Frontend accessibility
log_info "Test 19: Testing frontend accessibility..."
if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    log_success "Frontend is accessible"
    echo "✅ Frontend accessible" >> "$TEST_RESULTS_FILE"
else
    log_error "Frontend not accessible"
    echo "❌ Frontend not accessible" >> "$TEST_RESULTS_FILE"
fi

# ============================================
# PHASE 7: Inter-Service Communication
# ============================================
echo ""
echo "============================================"
echo "PHASE 7: Inter-Service Communication"
echo "============================================"
echo ""

# Test 20: Backend to MySQL connectivity
log_info "Test 20: Testing backend → mysql connectivity..."
if docker-compose exec -T backend sh -c "nc -zv mysql 3306" 2>&1 | grep -q "open"; then
    log_success "Backend can connect to MySQL"
    echo "✅ Backend → MySQL connected" >> "$TEST_RESULTS_FILE"
else
    log_error "Backend cannot connect to MySQL"
    echo "❌ Backend → MySQL failed" >> "$TEST_RESULTS_FILE"
fi

# Test 21: Backend to Redis connectivity
log_info "Test 21: Testing backend → redis connectivity..."
if docker-compose exec -T backend sh -c "nc -zv redis 6379" 2>&1 | grep -q "open"; then
    log_success "Backend can connect to Redis"
    echo "✅ Backend → Redis connected" >> "$TEST_RESULTS_FILE"
else
    log_error "Backend cannot connect to Redis"
    echo "❌ Backend → Redis failed" >> "$TEST_RESULTS_FILE"
fi

# ============================================
# PHASE 8: Security Validation
# ============================================
echo ""
echo "============================================"
echo "PHASE 8: Security Validation"
echo "============================================"
echo ""

# Test 22: MySQL port NOT exposed to host
log_info "Test 22: Verifying MySQL port 3306 NOT exposed to host..."
if ! nc -zv localhost 3306 2>&1 | grep -q "succeeded"; then
    log_success "MySQL port 3306 is NOT exposed (secure)"
    echo "✅ MySQL port secured" >> "$TEST_RESULTS_FILE"
else
    log_error "MySQL port 3306 IS exposed to host (security risk)"
    echo "❌ MySQL port exposed" >> "$TEST_RESULTS_FILE"
fi

# Test 23: Redis port NOT exposed to host
log_info "Test 23: Verifying Redis port 6379 NOT exposed to host..."
if ! nc -zv localhost 6379 2>&1 | grep -q "succeeded"; then
    log_success "Redis port 6379 is NOT exposed (secure)"
    echo "✅ Redis port secured" >> "$TEST_RESULTS_FILE"
else
    log_error "Redis port 6379 IS exposed to host (security risk)"
    echo "❌ Redis port exposed" >> "$TEST_RESULTS_FILE"
fi

# Test 24: Backend port IS exposed
log_info "Test 24: Verifying backend port 3001 IS exposed..."
if nc -zv localhost 3001 2>&1 | grep -q "succeeded\|open"; then
    log_success "Backend port 3001 is exposed (correct)"
    echo "✅ Backend port exposed" >> "$TEST_RESULTS_FILE"
else
    log_error "Backend port 3001 is NOT exposed"
    echo "❌ Backend port not exposed" >> "$TEST_RESULTS_FILE"
fi

# ============================================
# PHASE 9: Resource Limits
# ============================================
echo ""
echo "============================================"
echo "PHASE 9: Resource Limits Validation"
echo "============================================"
echo ""

# Test 25: Check backend resource limits
log_info "Test 25: Checking backend resource limits..."
BACKEND_STATS=$(docker stats pdflab-backend --no-stream --format "{{.MemUsage}} | {{.CPUPerc}}")
log_info "Backend stats: $BACKEND_STATS"
echo "Backend resources: $BACKEND_STATS" >> "$TEST_RESULTS_FILE"

# Verify limits are enforced
BACKEND_INSPECT=$(docker inspect pdflab-backend | grep -A 10 "Memory\|NanoCpus")
if echo "$BACKEND_INSPECT" | grep -q "4294967296\|2000000000"; then
    log_success "Backend resource limits are configured"
    echo "✅ Resource limits configured" >> "$TEST_RESULTS_FILE"
else
    log_warning "Resource limits may not be enforced (check docker-compose version)"
    echo "⚠️  Resource limits unclear" >> "$TEST_RESULTS_FILE"
fi

# ============================================
# PHASE 10: Image-to-Container Mapping
# ============================================
echo ""
echo "============================================"
echo "PHASE 10: Image-to-Container Mapping"
echo "============================================"
echo ""

# Test 26: Verify 1:1 mapping
log_info "Test 26: Verifying image-to-container mapping..."
echo "" >> "$TEST_RESULTS_FILE"
echo "=== Image-to-Container Mapping ===" >> "$TEST_RESULTS_FILE"
docker-compose ps --format "table {{.Service}}\t{{.Image}}\t{{.Name}}" | tee -a "$TEST_RESULTS_FILE"

IMAGE_COUNT=$(docker-compose config --services | wc -l)
CONTAINER_COUNT=$(docker-compose ps --services | wc -l)

if [ "$IMAGE_COUNT" -eq "$CONTAINER_COUNT" ]; then
    log_success "Perfect 1:1 mapping: $IMAGE_COUNT images → $CONTAINER_COUNT containers"
    echo "✅ 1:1 mapping verified" >> "$TEST_RESULTS_FILE"
else
    log_error "Mapping mismatch: $IMAGE_COUNT images → $CONTAINER_COUNT containers"
    echo "❌ Mapping incorrect" >> "$TEST_RESULTS_FILE"
fi

# ============================================
# PHASE 11: Production Mode Testing
# ============================================
echo ""
echo "============================================"
echo "PHASE 11: Production Mode Testing"
echo "============================================"
echo ""

log_info "Stopping default mode containers..."
docker-compose down

log_info "Starting production mode (with Nginx)..."
if docker-compose --profile production up -d 2>&1 | tee -a "$TEST_RESULTS_FILE"; then
    log_success "Production mode started"
    echo "✅ Production mode started" >> "$TEST_RESULTS_FILE"

    sleep 10

    # Test 27: Verify 5 containers in production mode
    log_info "Test 27: Verifying container count in production mode..."
    PROD_CONTAINERS=$(docker-compose ps --services | wc -l)
    if [ "$PROD_CONTAINERS" -eq 5 ]; then
        log_success "All 5 containers running in production mode"
        echo "✅ Production: 5 containers" >> "$TEST_RESULTS_FILE"
    else
        log_error "Expected 5 containers in production, found $PROD_CONTAINERS"
        echo "❌ Production: $PROD_CONTAINERS containers (expected 5)" >> "$TEST_RESULTS_FILE"
    fi

    # Test 28: Nginx accessibility
    log_info "Test 28: Testing Nginx accessibility..."
    if nc -zv localhost 80 2>&1 | grep -q "succeeded\|open"; then
        log_success "Nginx is accessible on port 80"
        echo "✅ Nginx accessible" >> "$TEST_RESULTS_FILE"
    else
        log_error "Nginx not accessible on port 80"
        echo "❌ Nginx not accessible" >> "$TEST_RESULTS_FILE"
    fi
else
    log_error "Failed to start production mode"
    echo "❌ Production mode failed" >> "$TEST_RESULTS_FILE"
fi

# ============================================
# PHASE 12: Cleanup
# ============================================
echo ""
echo "============================================"
echo "PHASE 12: Cleanup"
echo "============================================"
echo ""

log_info "Stopping all containers..."
docker-compose down

# ============================================
# FINAL REPORT
# ============================================
echo ""
echo "============================================"
echo "FINAL TEST REPORT"
echo "============================================"
echo ""
echo "Total Tests: $TESTS_TOTAL"
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo "Your Docker setup is production-ready!"
    echo ""
    echo "✅ ALL TESTS PASSED - Production Ready" >> "$TEST_RESULTS_FILE"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo "Please review the test results above."
    echo ""
    echo "❌ $TESTS_FAILED TESTS FAILED" >> "$TEST_RESULTS_FILE"
    exit 1
fi

echo ""
echo "Full test log saved to: $TEST_RESULTS_FILE"
