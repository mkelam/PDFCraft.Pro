#!/bin/bash

# pdflab.pro Development Deployment Check Script
# Prevents deployment of code with compilation errors

set -e

echo "🔍 pdflab.pro Deployment Check Starting..."

# Step 1: TypeScript Compilation Check
echo "📝 Step 1: Checking TypeScript compilation..."
cd "$(dirname "$0")/.."

if npm run build > /dev/null 2>&1; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed!"
    echo "🚫 DEPLOYMENT BLOCKED - Fix compilation errors first"
    exit 1
fi

# Step 2: Check for Critical Service Files
echo "📂 Step 2: Checking critical service files..."
CRITICAL_FILES=(
    "src/services/pdf.service.ts"
    "src/services/canvas-pdf.service.ts"
    "src/services/fixed-enhanced-pdf.service.ts"
    "src/controllers/convert.controller.ts"
    "src/server.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Critical file missing: $file"
        exit 1
    fi
done
echo "✅ All critical files present"

# Step 3: Check for TODO/FIXME markers
echo "🔍 Step 3: Checking for unresolved TODO/FIXME items..."
TODO_COUNT=$(grep -r "TODO\|FIXME" src/ || true | wc -l)
if [ "$TODO_COUNT" -gt 10 ]; then
    echo "⚠️  Warning: $TODO_COUNT TODO/FIXME items found"
    echo "📝 Consider addressing critical TODOs before deployment"
fi

# Step 4: Port Availability Check
echo "🌐 Step 4: Checking port availability..."
if command -v netstat > /dev/null; then
    if netstat -an | grep ":3060" > /dev/null; then
        echo "⚠️  Port 3060 is in use - server may need restart"
    else
        echo "✅ Port 3060 available"
    fi
fi

# Step 5: Node Modules Check
echo "📦 Step 5: Checking node_modules integrity..."
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules missing - run npm install"
    exit 1
fi

if [ ! -f "node_modules/.package-lock.json" ]; then
    echo "⚠️  Outdated node_modules - consider npm ci"
fi

echo "✅ Node modules check passed"

echo ""
echo "🎉 pdflab.pro Deployment Check PASSED!"
echo "✅ Ready for deployment to production"
echo ""
echo "Next steps:"
echo "1. Kill existing servers: npm run kill-servers"
echo "2. Start production server: npm run start:prod"
echo "3. Test API endpoints: npm run test:api"