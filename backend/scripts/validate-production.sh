#!/bin/bash

# PDFCraft.Pro Production Validation Script
# Validates that all production requirements are met

set -e

echo "🔍 Validating PDFCraft.Pro production readiness..."

ERRORS=0
WARNINGS=0

# Check function
check_requirement() {
    local name="$1"
    local command="$2"
    local required="$3"

    echo -n "   $name: "

    if eval "$command" >/dev/null 2>&1; then
        echo "✅ PASS"
    else
        if [[ "$required" == "true" ]]; then
            echo "❌ FAIL (REQUIRED)"
            ((ERRORS++))
        else
            echo "⚠️  WARN (OPTIONAL)"
            ((WARNINGS++))
        fi
    fi
}

echo ""
echo "📋 System Requirements"
check_requirement "Node.js 18+" "node --version | grep -E 'v1[8-9]|v[2-9][0-9]'" true
check_requirement "NPM installed" "npm --version" true
check_requirement "LibreOffice" "libreoffice --version" true
check_requirement "MySQL Client" "mysql --version" true
check_requirement "Redis Client" "redis-cli --version" true
check_requirement "PM2" "pm2 --version" true
check_requirement "Nginx" "nginx -v" false
check_requirement "Certbot" "certbot --version" false

echo ""
echo "📁 Directory Structure"
check_requirement "Project directory" "test -d /var/www/pdfcraft" false
check_requirement "Upload directory" "test -d uploads || test -d /var/www/pdfcraft/uploads" true
check_requirement "Temp directory" "test -d temp || test -d /var/www/pdfcraft/temp" true
check_requirement "Log directory" "test -d logs || test -d /var/log/pdfcraft" true

echo ""
echo "🔧 Configuration Files"
check_requirement "Environment file" "test -f .env || test -f .env.production" true
check_requirement "PM2 ecosystem" "test -f ecosystem.config.js" true
check_requirement "Package.json" "test -f package.json" true
check_requirement "TypeScript config" "test -f tsconfig.json" true
check_requirement "Database init" "test -f init.sql" true

echo ""
echo "📦 Dependencies"
check_requirement "Node modules" "test -d node_modules" true
check_requirement "Built application" "test -f dist/server.js" true

echo ""
echo "🔌 Services"
check_requirement "MySQL service" "systemctl is-active mysql" true
check_requirement "Redis service" "systemctl is-active redis" true
check_requirement "Nginx service" "systemctl is-active nginx" false

echo ""
echo "🌐 Network"
check_requirement "Port 3001 free" "! netstat -tuln | grep :3001" false
check_requirement "Port 80 available" "! netstat -tuln | grep :80 || systemctl is-active nginx" true
check_requirement "Port 443 available" "! netstat -tuln | grep :443 || systemctl is-active nginx" false

echo ""
echo "🔐 Security"
if [[ -f ".env" ]]; then
    check_requirement "JWT Secret set" "grep -q 'JWT_SECRET=' .env && grep 'JWT_SECRET=' .env | grep -v 'your-'" true
    check_requirement "DB Password set" "grep -q 'DB_PASSWORD=' .env && grep 'DB_PASSWORD=' .env | grep -v 'your-'" true
    check_requirement "Stripe Key set" "grep -q 'STRIPE_SECRET_KEY=' .env && grep 'STRIPE_SECRET_KEY=' .env | grep -v 'your-'" true
else
    echo "   ❌ .env file not found"
    ((ERRORS++))
fi

echo ""
echo "📊 Resource Checks"
MEMORY_GB=$(free -g | grep Mem | awk '{print $2}')
DISK_GB=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
CPU_CORES=$(nproc)

echo "   Memory: ${MEMORY_GB}GB $(if [[ $MEMORY_GB -ge 2 ]]; then echo "✅"; else echo "⚠️"; fi)"
echo "   Storage: ${DISK_GB}GB $(if [[ $DISK_GB -ge 20 ]]; then echo "✅"; else echo "⚠️"; fi)"
echo "   CPU Cores: ${CPU_CORES} $(if [[ $CPU_CORES -ge 2 ]]; then echo "✅"; else echo "⚠️"; fi)"

echo ""
echo "==================== VALIDATION SUMMARY ===================="

if [[ $ERRORS -eq 0 ]]; then
    echo "🎉 PRODUCTION READY!"
    echo "   All critical requirements are met."

    if [[ $WARNINGS -gt 0 ]]; then
        echo "   ⚠️  $WARNINGS optional feature(s) missing (non-critical)"
    fi

    echo ""
    echo "🚀 Ready to deploy with:"
    echo "   npm run pm2:start"
    echo "   # or"
    echo "   ./scripts/deploy.sh production"
    echo ""
    echo "📊 Monitor with:"
    echo "   pm2 status"
    echo "   curl http://localhost:3001/health"

    exit 0
else
    echo "❌ NOT READY FOR PRODUCTION"
    echo "   $ERRORS critical requirement(s) failed"
    echo "   $WARNINGS warning(s) found"
    echo ""
    echo "🔧 Fix the critical issues above before deploying"
    exit 1
fi