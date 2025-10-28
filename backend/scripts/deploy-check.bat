@echo off
REM pdflab.pro Development Deployment Check Script (Windows)
REM Prevents deployment of code with compilation errors

setlocal enabledelayedexpansion

echo 🔍 pdflab.pro Deployment Check Starting...

REM Step 1: TypeScript Compilation Check
echo 📝 Step 1: Checking TypeScript compilation...
cd /d "%~dp0\.."

npm run build >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ TypeScript compilation successful
) else (
    echo ❌ TypeScript compilation failed!
    echo 🚫 DEPLOYMENT BLOCKED - Fix compilation errors first
    exit /b 1
)

REM Step 2: Check for Critical Service Files
echo 📂 Step 2: Checking critical service files...
set "files_missing=0"
set "critical_files=src\services\pdf.service.ts src\services\canvas-pdf.service.ts src\services\fixed-enhanced-pdf.service.ts src\controllers\convert.controller.ts src\server.ts"

for %%f in (%critical_files%) do (
    if not exist "%%f" (
        echo ❌ Critical file missing: %%f
        set "files_missing=1"
    )
)

if !files_missing! equ 1 (
    exit /b 1
)
echo ✅ All critical files present

REM Step 3: Check for Node Modules
echo 📦 Step 3: Checking node_modules integrity...
if not exist "node_modules" (
    echo ❌ node_modules missing - run npm install
    exit /b 1
)

if not exist "node_modules\.package-lock.json" (
    echo ⚠️  Outdated node_modules - consider npm ci
)

echo ✅ Node modules check passed

REM Step 4: Port Check
echo 🌐 Step 4: Checking port 3060...
netstat -an | findstr ":3060" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  Port 3060 is in use - server may need restart
) else (
    echo ✅ Port 3060 available
)

echo.
echo 🎉 pdflab.pro Deployment Check PASSED!
echo ✅ Ready for deployment to production
echo.
echo Next steps:
echo 1. Kill existing servers: npm run kill-servers
echo 2. Start production server: npm run start:prod
echo 3. Test API endpoints: curl http://localhost:3060/health

exit /b 0