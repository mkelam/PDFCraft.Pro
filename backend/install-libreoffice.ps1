# LibreOffice Installation Script for PDFCraft.Pro
Write-Host "Installing LibreOffice for PDFCraft.Pro..." -ForegroundColor Green

# Set security protocol
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Download LibreOffice
$url = "https://download.libreoffice.org/libreoffice/stable/24.8.3/win/x86_64/LibreOffice_24.8.3_Win_x64.msi"
$output = "$env:TEMP\LibreOffice.msi"

Write-Host "Downloading LibreOffice..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
    Write-Host "Download completed" -ForegroundColor Green
} catch {
    Write-Host "Download failed: $_" -ForegroundColor Red
    exit 1
}

# Install LibreOffice
Write-Host "Installing LibreOffice..." -ForegroundColor Yellow
try {
    $arguments = @("/i", $output, "/quiet", "/norestart")
    Start-Process "msiexec.exe" -ArgumentList $arguments -Wait
    Write-Host "Installation completed" -ForegroundColor Green
} catch {
    Write-Host "Installation failed: $_" -ForegroundColor Red
    exit 1
}

# Clean up
Remove-Item $output -ErrorAction SilentlyContinue

# Set environment variables
Write-Host "Setting environment variables..." -ForegroundColor Yellow
$libreOfficePath = "C:\Program Files\LibreOffice\program\soffice.exe"

# Set system environment variable
[Environment]::SetEnvironmentVariable("LIBREOFFICE_PATH", $libreOfficePath, "Machine")
[Environment]::SetEnvironmentVariable("LIBREOFFICE_AVAILABLE", "true", "Machine")

Write-Host "Environment variables set" -ForegroundColor Green

# Test installation
Write-Host "Testing LibreOffice installation..." -ForegroundColor Yellow
if (Test-Path $libreOfficePath) {
    Write-Host "LibreOffice found at: $libreOfficePath" -ForegroundColor Green

    # Test version
    try {
        $version = & $libreOfficePath --version
        Write-Host "Version: $version" -ForegroundColor Cyan
    } catch {
        Write-Host "Could not get version, but executable exists" -ForegroundColor Yellow
    }
} else {
    Write-Host "LibreOffice not found at expected location" -ForegroundColor Red
}

Write-Host ""
Write-Host "LibreOffice setup completed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Restart your terminal/IDE" -ForegroundColor White
Write-Host "   2. Restart the backend server: npm run dev" -ForegroundColor White
Write-Host "   3. Test PDF conversion with LibreOffice engine" -ForegroundColor White

# Create .env update
$envPath = "C:\Users\Mac\OneDrive\Desktop\Projects\PDFCraft.Pro\backend\.env"
Write-Host "Updating .env file..." -ForegroundColor Yellow
@"
# LibreOffice Configuration
LIBREOFFICE_AVAILABLE=true
LIBREOFFICE_PATH=C:\Program Files\LibreOffice\program\soffice.exe
NODE_ENV=development
"@ | Out-File -FilePath $envPath -Append -Encoding UTF8

Write-Host ".env file updated" -ForegroundColor Green