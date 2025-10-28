const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('pdflab.pro → PDFLab.Pro Domain Change');
console.log('========================================\n');

// Replacement patterns
const replacements = [
    { old: /pdflab\.pro/g, new: 'pdflab.pro', desc: 'Domain (lowercase with dot)' },
    { old: /pdflab\.pro/gi, new: 'pdflab.pro', desc: 'Domain (case insensitive)' },
    { old: /pdflab\.PRO/g, new: 'PDFLAB.PRO', desc: 'Domain (uppercase with dot)' },
    { old: /pdflab\.PRO/gi, new: 'PDFLAB.PRO', desc: 'Domain (uppercase)' },
    { old: /pdflab\.Pro/g, new: 'PDFLab.Pro', desc: 'Project name (mixed case with dot)' },
    { old: /pdflab\.Pro/gi, new: 'PDFLab.Pro', desc: 'Project name (mixed case)' },
    { old: /PDFLab Pro/g, new: 'PDFLab Pro', desc: 'Display name with space' },
    { old: /PDF Lab Pro/g, new: 'PDF Lab Pro', desc: 'Display name with spaces' },
    { old: /pdflab(?!\.pro)/gi, new: 'pdflab', desc: 'Project name (no .pro suffix)' },
    { old: /pdflab(?!\.Pro)/g, new: 'PDFLab', desc: 'Project name (PascalCase)' },
    { old: /pdflab(?!\.PRO)/g, new: 'PDFLAB', desc: 'Project name (uppercase)' },
];

// Directories to exclude
const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'uploads', 'temp', 'logs', 'coverage', 'test-screenshots', '.bmad-core'];

// File extensions to process
const includeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.yml', '.yaml', '.env', '.example', '.sql', '.sh', '.bat', '.ps1', '.html', '.css', '.config', '.template'];

let filesChanged = 0;
let totalReplacements = 0;

function shouldProcessFile(filePath) {
    // Check if in excluded directory
    for (const dir of excludeDirs) {
        if (filePath.includes(path.sep + dir + path.sep) || filePath.includes(path.sep + dir)) {
            return false;
        }
    }

    // Check if has valid extension
    const ext = path.extname(filePath);
    return includeExtensions.includes(ext) || includeExtensions.some(e => filePath.endsWith(e));
}

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        let fileReplacements = 0;

        // Apply each replacement
        for (const replacement of replacements) {
            const matches = content.match(replacement.old);
            if (matches) {
                content = content.replace(replacement.old, replacement.new);
                fileReplacements += matches.length;
            }
        }

        // Save if changed
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            filesChanged++;
            totalReplacements += fileReplacements;
            const relativePath = filePath.replace(process.cwd() + path.sep, '');
            console.log(`✓ ${relativePath} - ${fileReplacements} replacement(s)`);
        }
    } catch (error) {
        console.log(`✗ Error processing ${filePath}: ${error.message}`);
    }
}

function walkDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Check if should skip this directory
            if (!excludeDirs.includes(file)) {
                walkDirectory(filePath);
            }
        } else if (stat.isFile()) {
            if (shouldProcessFile(filePath)) {
                processFile(filePath);
            }
        }
    }
}

console.log('Scanning files...\n');
walkDirectory(process.cwd());

console.log('\n========================================');
console.log('Domain Change Complete!');
console.log('========================================');
console.log(`Files Changed: ${filesChanged}`);
console.log(`Total Replacements: ${totalReplacements}`);
console.log('\nNext Steps:');
console.log('1. Review changes with: git diff');
console.log('2. Test the application');
console.log('3. Commit the changes to git\n');
