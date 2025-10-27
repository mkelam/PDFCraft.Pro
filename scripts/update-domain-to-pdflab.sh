#!/bin/bash
# Script to update all domain references from pdflab.pro to pdflab.pro
# Run this script from the project root directory

echo "🔄 Updating domain from pdflab.pro to pdflab.pro..."
echo "================================================"

# Files to update (excluding git, node_modules, etc.)
FILES_TO_UPDATE=(
    "PRODUCTION_DEPLOYMENT_CHECKLIST.md"
    "README.md"
    "CLAUDE.md"
    ".env.production"
    ".env.example"
    ".env.production.example"
    "PAYFAST_INTEGRATION_COMPLETE.md"
    "PAYFAST_CONFIGURATION_SUMMARY.txt"
    "PAYFAST_STATUS.txt"
    "backend/PAYFAST_SETUP_COMPLETE.md"
    "backend/test-payfast-integration.html"
    "backend/src/migrations/001_initial_schema.sql"
    "backend/src/server.ts"
    "config/shared.config.ts"
    "lib/api.ts"
    "lib/enhanced-api.ts"
    "lib/auth-api.ts"
)

# Update database names
echo "📊 Updating database names..."
sed -i 's/pdflab_prod/pdflab_prod/g' "${FILES_TO_UPDATE[@]}" 2>/dev/null
sed -i 's/pdflab_user/pdflab_user/g' "${FILES_TO_UPDATE[@]}" 2>/dev/null
sed -i 's/pdflab_db/pdflab_db/g' "${FILES_TO_UPDATE[@]}" 2>/dev/null
sed -i 's/pdflab-api/pdflab-api/g' "${FILES_TO_UPDATE[@]}" 2>/dev/null

# Update domain names
echo "🌐 Updating domain names..."
sed -i 's/pdflab\.pro/pdflab.pro/g' "${FILES_TO_UPDATE[@]}" 2>/dev/null

# Update project names
echo "📝 Updating project names..."
sed -i 's/pdflab\.Pro/PDFLab.Pro/g' "${FILES_TO_UPDATE[@]}" 2>/dev/null
sed -i 's/PDFLab Pro/PDFLab Pro/g' "${FILES_TO_UPDATE[@]}" 2>/dev/null

# Update email addresses
echo "📧 Updating email addresses..."
sed -i 's/@pdflab\.pro/@pdflab.pro/g' "${FILES_TO_UPDATE[@]}" 2>/dev/null

# Update directory paths
echo "📁 Updating directory paths..."
sed -i 's/\/var\/www\/pdflab/\/var\/www\/pdflab/g' "${FILES_TO_UPDATE[@]}" 2>/dev/null
sed -i 's/\/pdflab\//\/pdflab\//g' "${FILES_TO_UPDATE[@]}" 2>/dev/null

echo "✅ Domain update complete!"
echo ""
echo "Updated files:"
for file in "${FILES_TO_UPDATE[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    fi
done

echo ""
echo "⚠️  Please manually verify:"
echo "  1. backend/.env.production"
echo "  2. backend/.env.development"
echo "  3. backend/src/config/index.ts"
echo "  4. backend/src/controllers/payfast.controller.ts"
echo ""
echo "🎯 Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Update PayFast dashboard URLs"
echo "  3. Test locally"
echo "  4. Deploy to production"
