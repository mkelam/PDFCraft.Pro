# Comprehensive pdflab.pro to PDFLab.Pro Domain Change Script
# This script replaces ALL occurrences across the entire codebase

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "pdflab.pro → PDFLab.Pro Domain Change" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Define replacement patterns
$replacements = @(
    @{Old = "pdflab\.pro"; New = "pdflab.pro"; Description = "Domain (lowercase with dot)"},
    @{Old = "pdflab.pro"; New = "pdflab.pro"; Description = "Domain (lowercase)"},
    @{Old = "pdflab\.PRO"; New = "PDFLAB.PRO"; Description = "Domain (uppercase with dot)"},
    @{Old = "pdflab.pro"; New = "PDFLAB.PRO"; Description = "Domain (uppercase)"},
    @{Old = "pdflab\.Pro"; New = "PDFLab.Pro"; Description = "Project name (mixed case with dot)"},
    @{Old = "pdflab.pro"; New = "PDFLab.Pro"; Description = "Project name (mixed case)"},
    @{Old = "PDFLab Pro"; New = "PDFLab Pro"; Description = "Display name with space"},
    @{Old = "PDF Lab Pro"; New = "PDF Lab Pro"; Description = "Display name with spaces"},
    @{Old = "pdflab"; New = "pdflab"; Description = "Project name (lowercase)"},
    @{Old = "pdflab"; New = "PDFLab"; Description = "Project name (PascalCase)"},
    @{Old = "pdflab"; New = "PDFLAB"; Description = "Project name (uppercase)"},
    @{Old = "pdflab-"; New = "pdflab-"; Description = "Container names"},
    @{Old = "pdflabpro"; New = "pdflabpro"; Description = "Compound name (lowercase)"}
)

# Directories to exclude
$excludeDirs = @(
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "uploads",
    "temp",
    "logs",
    "coverage",
    "test-screenshots",
    ".bmad-core"
)

# File extensions to process
$includeExtensions = @(
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".md",
    ".txt",
    ".yml",
    ".yaml",
    ".env",
    ".example",
    ".sql",
    ".sh",
    ".bat",
    ".ps1",
    ".html",
    ".css",
    ".config",
    ".template"
)

# Counter
$filesChanged = 0
$totalReplacements = 0

# Get all files
Write-Host "Scanning files..." -ForegroundColor Yellow
$files = Get-ChildItem -Path . -Recurse -File | Where-Object {
    $file = $_
    $exclude = $false

    # Check if file is in excluded directory
    foreach ($dir in $excludeDirs) {
        if ($file.FullName -like "*\$dir\*") {
            $exclude = $true
            break
        }
    }

    # Check if file has included extension
    if (-not $exclude) {
        $hasValidExtension = $false
        foreach ($ext in $includeExtensions) {
            if ($file.Extension -eq $ext -or $file.Name -like "*$ext") {
                $hasValidExtension = $true
                break
            }
        }
        $exclude = -not $hasValidExtension
    }

    -not $exclude
}

Write-Host "Found $($files.Count) files to process" -ForegroundColor Green
Write-Host ""

# Process each file
foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        $originalContent = $content
        $fileChanged = $false
        $fileReplacements = 0

        # Apply each replacement pattern
        foreach ($replacement in $replacements) {
            $pattern = $replacement.Old
            $newValue = $replacement.New

            # Count occurrences before replacement
            $matches = [regex]::Matches($content, $pattern)
            if ($matches.Count -gt 0) {
                $content = $content -replace $pattern, $newValue
                $fileReplacements += $matches.Count
                $fileChanged = $true
            }
        }

        # Save if changed
        if ($fileChanged) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            $filesChanged++
            $totalReplacements += $fileReplacements
            Write-Host "✓ $($file.FullName.Replace($PWD.Path + '\', '')) - $fileReplacements replacement(s)" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "✗ Error processing $($file.FullName): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Domain Change Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Files Changed: $filesChanged" -ForegroundColor Yellow
Write-Host "Total Replacements: $totalReplacements" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Review changes with: git diff" -ForegroundColor White
Write-Host "2. Test the application" -ForegroundColor White
Write-Host '3. Commit changes: git add . && git commit -m "chore: rename domain from pdflab.pro to PDFLab.Pro"' -ForegroundColor White
Write-Host ""
