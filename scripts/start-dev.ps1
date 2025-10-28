# BMAD Development Environment Startup Script
# Ensures both frontend and backend start with correct configuration
# Validates environment before starting services

param(
    [switch]$SkipValidation = $false,
    [switch]$Force = $false
)

Write-Host "🚀 BMAD Development Environment Startup" -ForegroundColor Green
Write-Host "=" * 50

# Configuration from shared config
$BACKEND_PORT = 3001
$FRONTEND_PORT = 3000

function Test-PortInUse {
    param([int]$Port)

    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        return $connection.Count -gt 0
    }
    catch {
        return $false
    }
}

function Stop-ProcessOnPort {
    param([int]$Port, [string]$ServiceName)

    Write-Host "🔍 Checking port $Port for $ServiceName..." -ForegroundColor Yellow

    if (Test-PortInUse -Port $Port) {
        Write-Host "⚠️  Port $Port is in use" -ForegroundColor Yellow

        if ($Force) {
            Write-Host "🛑 Force mode: Stopping processes on port $Port" -ForegroundColor Red

            # Find and kill processes using the port
            $processes = Get-NetTCPConnection -LocalPort $Port | ForEach-Object {
                Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
            }

            foreach ($process in $processes) {
                if ($process) {
                    Write-Host "   Stopping process: $($process.ProcessName) (PID: $($process.Id))"
                    Stop-Process -Id $process.Id -Force
                }
            }

            Start-Sleep -Seconds 2
        }
        else {
            Write-Host "❌ Port $Port is already in use. Use -Force to stop existing processes." -ForegroundColor Red
            return $false
        }
    }
    else {
        Write-Host "✅ Port $Port is available" -ForegroundColor Green
    }

    return $true
}

function Start-ValidationScript {
    Write-Host "🔍 Running environment validation..." -ForegroundColor Cyan

    try {
        & npx tsx scripts/validate-environment.ts

        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Environment validation failed" -ForegroundColor Red
            return $false
        }

        Write-Host "✅ Environment validation passed" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "⚠️  Could not run validation script: $_" -ForegroundColor Yellow
        Write-Host "   Continuing without validation..." -ForegroundColor Yellow
        return $true
    }
}

function Start-BackendService {
    Write-Host "🔧 Starting backend service on port $BACKEND_PORT..." -ForegroundColor Blue

    # Change to backend directory and start the service
    $backendJob = Start-Job -ScriptBlock {
        param($BackendPort)
        Set-Location -Path "$using:PWD\backend"
        $env:PORT = $BackendPort
        & npm run dev
    } -ArgumentList $BACKEND_PORT

    Write-Host "   Backend job started with ID: $($backendJob.Id)" -ForegroundColor Gray

    # Wait for backend to be ready
    Write-Host "⏳ Waiting for backend to be ready..." -ForegroundColor Yellow

    $attempts = 0
    $maxAttempts = 30

    do {
        Start-Sleep -Seconds 1
        $attempts++

        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Backend is ready!" -ForegroundColor Green
                return $backendJob
            }
        }
        catch {
            # Backend not ready yet
        }

        Write-Host "." -NoNewline -ForegroundColor Gray

    } while ($attempts -lt $maxAttempts)

    Write-Host ""
    Write-Host "❌ Backend failed to start within $maxAttempts seconds" -ForegroundColor Red
    Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob -ErrorAction SilentlyContinue
    return $null
}

function Start-FrontendService {
    Write-Host "🎨 Starting frontend service on port $FRONTEND_PORT..." -ForegroundColor Blue

    $frontendJob = Start-Job -ScriptBlock {
        param($FrontendPort)
        Set-Location -Path $using:PWD
        $env:PORT = $FrontendPort
        & npm run dev
    } -ArgumentList $FRONTEND_PORT

    Write-Host "   Frontend job started with ID: $($frontendJob.Id)" -ForegroundColor Gray

    # Wait a moment for frontend to start
    Start-Sleep -Seconds 3

    Write-Host "✅ Frontend is starting..." -ForegroundColor Green
    return $frontendJob
}

function Show-ServiceInfo {
    param($BackendJob, $FrontendJob)

    Write-Host ""
    Write-Host "🎉 BMAD Development Environment Started!" -ForegroundColor Green
    Write-Host "=" * 50
    Write-Host "🌐 Frontend: http://localhost:$FRONTEND_PORT" -ForegroundColor Cyan
    Write-Host "🔧 Backend:  http://localhost:$BACKEND_PORT" -ForegroundColor Cyan
    Write-Host "📊 Health:   http://localhost:$BACKEND_PORT/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Job Information:" -ForegroundColor Yellow
    Write-Host "   Backend Job ID:  $($BackendJob.Id)" -ForegroundColor Gray
    Write-Host "   Frontend Job ID: $($FrontendJob.Id)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 To stop services:" -ForegroundColor Yellow
    Write-Host "   Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📋 To view logs:" -ForegroundColor Yellow
    Write-Host "   Receive-Job -Id $($BackendJob.Id) -Keep" -ForegroundColor Gray
    Write-Host "   Receive-Job -Id $($FrontendJob.Id) -Keep" -ForegroundColor Gray
}

# Main execution
try {
    # Step 1: Check port availability
    if (-not (Stop-ProcessOnPort -Port $BACKEND_PORT -ServiceName "Backend")) {
        exit 1
    }

    if (-not (Stop-ProcessOnPort -Port $FRONTEND_PORT -ServiceName "Frontend")) {
        exit 1
    }

    # Step 2: Run validation (unless skipped)
    if (-not $SkipValidation) {
        if (-not (Start-ValidationScript)) {
            Write-Host "❌ Validation failed. Use -SkipValidation to bypass." -ForegroundColor Red
            exit 1
        }
    }
    else {
        Write-Host "⚠️  Skipping environment validation" -ForegroundColor Yellow
    }

    # Step 3: Start backend service
    $backendJob = Start-BackendService
    if (-not $backendJob) {
        Write-Host "❌ Failed to start backend service" -ForegroundColor Red
        exit 1
    }

    # Step 4: Start frontend service
    $frontendJob = Start-FrontendService
    if (-not $frontendJob) {
        Write-Host "❌ Failed to start frontend service" -ForegroundColor Red
        Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job -Job $backendJob -ErrorAction SilentlyContinue
        exit 1
    }

    # Step 5: Show service information
    Show-ServiceInfo -BackendJob $backendJob -FrontendJob $frontendJob

    # Keep script running to monitor jobs
    Write-Host "⌨️  Press Ctrl+C to stop all services" -ForegroundColor Yellow

    try {
        while ($true) {
            Start-Sleep -Seconds 5

            # Check if jobs are still running
            if ($backendJob.State -eq "Failed" -or $backendJob.State -eq "Completed") {
                Write-Host "❌ Backend service stopped unexpectedly" -ForegroundColor Red
                break
            }

            if ($frontendJob.State -eq "Failed" -or $frontendJob.State -eq "Completed") {
                Write-Host "❌ Frontend service stopped unexpectedly" -ForegroundColor Red
                break
            }
        }
    }
    catch {
        # Ctrl+C pressed
        Write-Host ""
        Write-Host "🛑 Stopping services..." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ Script failed: $_" -ForegroundColor Red
    exit 1
}
finally {
    # Cleanup jobs
    Write-Host "🧹 Cleaning up background jobs..." -ForegroundColor Yellow
    Get-Job | Where-Object { $_.Id -eq $backendJob.Id -or $_.Id -eq $frontendJob.Id } | Stop-Job -ErrorAction SilentlyContinue
    Get-Job | Where-Object { $_.Id -eq $backendJob.Id -or $_.Id -eq $frontendJob.Id } | Remove-Job -ErrorAction SilentlyContinue
    Write-Host "✅ Cleanup complete" -ForegroundColor Green
}