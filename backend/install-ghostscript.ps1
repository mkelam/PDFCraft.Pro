# Ghostscript Installation Script for PDFCraft.Pro
Write-Host "Installing Ghostscript for PDFCraft.Pro..." -ForegroundColor Green

# Set security protocol
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Ghostscript download URL (latest stable version)
$url = "https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs10030/gs10030w64.exe"
$output = "$env:TEMP\ghostscript-installer.exe"

Write-Host "Downloading Ghostscript..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
    Write-Host "Download completed" -ForegroundColor Green
} catch {
    Write-Host "Download failed: $_" -ForegroundColor Red
    exit 1
}

# Install Ghostscript silently
Write-Host "Installing Ghostscript..." -ForegroundColor Yellow
try {
    Start-Process $output -ArgumentList "/S" -Wait
    Write-Host "Installation completed" -ForegroundColor Green
} catch {
    Write-Host "Installation failed: $_" -ForegroundColor Red
    exit 1
}

# Clean up installer
Remove-Item $output -ErrorAction SilentlyContinue

# Set environment variables
Write-Host "Configuring environment..." -ForegroundColor Yellow

# Common Ghostscript installation paths
$ghostscriptPaths = @(
    "C:\Program Files\gs\gs10.03.0\bin\gswin64c.exe",
    "C:\Program Files (x86)\gs\gs10.03.0\bin\gswin32c.exe",
    "C:\gs\gs10.03.0\bin\gswin64c.exe"
)

$ghostscriptPath = $null
foreach ($path in $ghostscriptPaths) {
    if (Test-Path $path) {
        $ghostscriptPath = $path
        break
    }
}

if ($ghostscriptPath) {
    Write-Host "Ghostscript found at: $ghostscriptPath" -ForegroundColor Green

    # Set environment variables
    [Environment]::SetEnvironmentVariable("GHOSTSCRIPT_PATH", $ghostscriptPath, "Machine")
    [Environment]::SetEnvironmentVariable("GHOSTSCRIPT_AVAILABLE", "true", "Machine")

    # Add to PATH
    $gsDir = Split-Path $ghostscriptPath -Parent
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
    if ($currentPath -notlike "*$gsDir*") {
        [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$gsDir", "Machine")
        Write-Host "Added Ghostscript to system PATH" -ForegroundColor Green
    }

    Write-Host "Environment variables set" -ForegroundColor Green

    # Test installation
    Write-Host "Testing Ghostscript installation..." -ForegroundColor Yellow
    try {
        $version = & $ghostscriptPath --version
        Write-Host "Ghostscript version: $version" -ForegroundColor Cyan
    } catch {
        Write-Host "Version test failed, but executable exists" -ForegroundColor Yellow
    }

} else {
    Write-Host "Ghostscript executable not found in expected locations" -ForegroundColor Red
    Write-Host "Please check the installation manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Ghostscript installation completed!" -ForegroundColor Green
Write-Host "Benefits for PDFCraft.Pro:" -ForegroundColor Cyan
Write-Host "  - Advanced PDF manipulation" -ForegroundColor White
Write-Host "  - Better quality rendering" -ForegroundColor White
Write-Host "  - Support for complex PDF operations" -ForegroundColor White
Write-Host "  - Industry-standard PDF processing" -ForegroundColor White

# Update .env file
$envPath = "C:\Users\Mac\OneDrive\Desktop\Projects\PDFCraft.Pro\backend\.env"
Write-Host "Updating .env file..." -ForegroundColor Yellow

if ($ghostscriptPath) {
    $envUpdate = @"

# Ghostscript Configuration
GHOSTSCRIPT_AVAILABLE=true
GHOSTSCRIPT_PATH=$ghostscriptPath
"@

    Add-Content -Path $envPath -Value $envUpdate -Encoding UTF8
    Write-Host ".env file updated with Ghostscript configuration" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Restart your terminal/IDE" -ForegroundColor White
Write-Host "  2. Restart the backend server: npm run dev" -ForegroundColor White
Write-Host "  3. Test enhanced PDF processing capabilities" -ForegroundColor White