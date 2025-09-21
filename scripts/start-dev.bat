@echo off
REM BMAD Development Environment Startup (Windows Batch)
REM Simple wrapper for PowerShell script

echo 🚀 Starting BMAD Development Environment...

REM Check if PowerShell is available
where powershell >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PowerShell not found. Please install PowerShell or use manual startup.
    pause
    exit /b 1
)

REM Execute PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1" %*

REM Return PowerShell exit code
exit /b %errorlevel%