@echo off
echo ========================================
echo  pdflab.pro - Ghostscript Installation
echo ========================================
echo.

echo Checking current Ghostscript status...
gswin64c.exe -v 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Ghostscript is already installed and working!
    goto :end
)

echo ❌ Ghostscript not found. Installation required.
echo.

echo 📥 Download Ghostscript from:
echo https://www.ghostscript.com/download/gsdnld.html
echo.
echo 🎯 Choose: "GPL Ghostscript 10.04.0 for Windows (64 bit)"
echo.

echo Manual Installation Steps:
echo 1. Download Ghostscript installer
echo 2. Run installer as Administrator
echo 3. Choose default installation path: C:\Program Files\gs\gs10.04.0\bin
echo 4. Make sure "Add to PATH" is checked
echo 5. Restart Command Prompt after installation
echo.

echo Alternative - Quick Install with winget (Windows 10/11):
echo.
echo winget install --id AGPL.Ghostscript
echo.

:end
echo.
echo After installation, run: node simple-image-test.js
echo This will verify the image processing pipeline works correctly.
echo.
pause
