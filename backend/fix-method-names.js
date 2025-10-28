/**
 * Fix method name inconsistency across backend services
 * Replace convertPDFToPPT with convertPDFToOffice
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/services/optimized-engine-selection.service.ts',
  'src/services/enterprise-pdf.service.ts',
  'src/services/service-container.ts',
  'src/services/pdf-service-adapter.ts',
  'src/services/pdf.service.ts',
  'src/services/hybrid-editable-pdf.service.ts',
  'src/services/editable-text-pdf.service.ts',
  'src/testing/e2e-with-log-analysis.ts',
  'src/services/pdf.integration.test.ts',
  'src/tests/integration/service-integration.test.ts'
];

let totalReplacements = 0;

for (const filePath of filesToFix) {
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  Skipping ${filePath} (file not found)`);
    continue;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;

    // Replace all occurrences
    content = content.replace(/\.convertPDFToPPT\(/g, '.convertPDFToOffice(');

    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      const count = (originalContent.match(/\.convertPDFToPPT\(/g) || []).length;
      totalReplacements += count;
      console.log(`✅ Fixed ${filePath} (${count} occurrences)`);
    } else {
      console.log(`⏭️  No changes needed in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

console.log(`\n🎉 Total replacements: ${totalReplacements}`);
console.log('✨ Method name refactoring complete!');
