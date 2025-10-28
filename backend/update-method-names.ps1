# PowerShell script to update convertPDFToPPT to convertPDFToOffice
# Updates all PDF service implementations

$servicesPath = "src\services"
$files = Get-ChildItem -Path $servicesPath -Filter "*.service.ts" -Recurse

$updatedCount = 0
$skippedCount = 0

foreach ($file in $files) {
    # Skip files we've already updated
    if ($file.Name -match "cloudconvert-adapter|fallback-orchestrator|pdf-conversion-router") {
        Write-Host "Skipping already updated: $($file.Name)" -ForegroundColor Yellow
        $skippedCount++
        continue
    }

    $content = Get-Content $file.FullName -Raw

    # Check if file contains convertPDFToPPT
    if ($content -match "convertPDFToPPT") {
        Write-Host "Updating: $($file.Name)" -ForegroundColor Green

        # Update method definition
        $content = $content -replace "async convertPDFToPPT\(", "async convertPDFToOffice("

        # Save the file
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $updatedCount++
    } else {
        Write-Host "No changes needed: $($file.Name)" -ForegroundColor Gray
        $skippedCount++
    }
}

Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "Updated: $updatedCount files" -ForegroundColor Green
Write-Host "Skipped: $skippedCount files" -ForegroundColor Yellow
