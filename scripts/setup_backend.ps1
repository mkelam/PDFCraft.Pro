# PDF SaaS Platform Backend Setup Script
# Installs Python, dependencies, and starts the development server

Write-Host "🚀 Setting up PDF SaaS Platform Backend..." -ForegroundColor Cyan

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Python not found. Please install Python 3.8+ from python.org" -ForegroundColor Yellow
    Write-Host "📥 Download: https://www.python.org/downloads/" -ForegroundColor Blue
    Start-Process "https://www.python.org/downloads/"
    exit 1
}

# Navigate to backend directory
Set-Location "backend"

# Create virtual environment
Write-Host "🔧 Creating virtual environment..." -ForegroundColor Cyan
python -m venv venv

# Activate virtual environment
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Cyan
& ".\venv\Scripts\Activate.ps1"

# Upgrade pip
Write-Host "📦 Upgrading pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt

# Verify MuPDF installation
Write-Host "🔍 Verifying MuPDF installation..." -ForegroundColor Cyan
python -c "import fitz; print(f'✅ PyMuPDF version: {fitz.version[0]}'); print(f'✅ MuPDF version: {fitz.version[1]}')"

Write-Host "✅ Backend setup complete!" -ForegroundColor Green
Write-Host "🚀 To start the server, run: uvicorn main:app --reload --port 8080" -ForegroundColor Cyan