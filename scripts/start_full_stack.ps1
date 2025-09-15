# PDF SaaS Platform - Full Stack Startup Script
# Starts both frontend and backend services for development

Write-Host "🚀 Starting PDF SaaS Platform Full Stack..." -ForegroundColor Cyan
Write-Host "   Target: Sub-6 second processing (10x faster than Adobe)" -ForegroundColor Green

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect('localhost', $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Check if ports are available
$frontendPort = 5173
$backendPort = 8080

if (Test-Port $frontendPort) {
    Write-Host "⚠️ Port $frontendPort already in use (Frontend)" -ForegroundColor Yellow
}

if (Test-Port $backendPort) {
    Write-Host "⚠️ Port $backendPort already in use (Backend)" -ForegroundColor Yellow
}

Write-Host "`n📝 Setup Instructions:" -ForegroundColor Cyan
Write-Host "1. 🐍 Install Python 3.8+ from python.org" -ForegroundColor White
Write-Host "2. 📦 Run setup_backend.ps1 to install Python dependencies" -ForegroundColor White
Write-Host "3. 🎯 Choose your configuration:" -ForegroundColor White
Write-Host "   • Mock Backend (Demo): Set VITE_ENABLE_MOCK_BACKEND=true" -ForegroundColor Gray
Write-Host "   • Real Backend (Production): Set VITE_ENABLE_MOCK_BACKEND=false" -ForegroundColor Gray

Write-Host "`n🔧 Starting Services..." -ForegroundColor Cyan

# Start frontend in a new PowerShell window
Write-Host "🌐 Starting Frontend (Vite Dev Server)..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"

# Wait a moment
Start-Sleep -Seconds 2

# Check if Python backend should be started
$startBackend = Read-Host "🐍 Start Python Backend? (y/n) [Default: y]"
if ($startBackend -eq "" -or $startBackend -eq "y" -or $startBackend -eq "Y") {
    Write-Host "🐍 Starting Python Backend (FastAPI)..." -ForegroundColor Green

    # Check if virtual environment exists
    if (Test-Path "backend\venv\Scripts\activate.bat") {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; .\venv\Scripts\Activate.ps1; uvicorn main:app --reload --port 8080"
    } else {
        Write-Host "⚠️ Backend virtual environment not found." -ForegroundColor Yellow
        Write-Host "   Please run scripts\setup_backend.ps1 first" -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; python -m uvicorn main:app --reload --port 8080"
    }
} else {
    Write-Host "📝 Backend not started - using mock mode" -ForegroundColor Yellow
    Write-Host "   Set VITE_ENABLE_MOCK_BACKEND=true in .env file" -ForegroundColor Gray
}

Write-Host "`n✅ Services Starting!" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:5173" -ForegroundColor Blue
Write-Host "🐍 Backend:  http://localhost:8080" -ForegroundColor Green
Write-Host "📚 API Docs: http://localhost:8080/api/docs" -ForegroundColor Cyan

Write-Host "`n🎯 Performance Targets:" -ForegroundColor Cyan
Write-Host "• PDF Processing: < 6 seconds" -ForegroundColor White
Write-Host "• Speed Advantage: 10x faster than Adobe" -ForegroundColor White
Write-Host "• Real-time Progress: WebSocket updates" -ForegroundColor White

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")