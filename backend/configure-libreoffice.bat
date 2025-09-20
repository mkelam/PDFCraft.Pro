@echo off
echo 🚀 Configuring PDFCraft.Pro for LibreOffice...

echo.
echo ✅ Step 1: Setting environment variable...
setx LIBREOFFICE_AVAILABLE "true"

echo.
echo ✅ Step 2: Checking LibreOffice installation...
where soffice >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ LibreOffice found in PATH
    soffice --version
) else (
    echo ❌ LibreOffice NOT found in PATH
    echo.
    echo 📝 Please ensure LibreOffice is installed and added to PATH:
    echo    1. Install LibreOffice from: https://www.libreoffice.org/download/download/
    echo    2. During installation, check "Add to PATH"
    echo    3. Or manually add LibreOffice to your system PATH
    echo.
    echo 📁 Common LibreOffice paths:
    echo    C:\Program Files\LibreOffice\program\
    echo    C:\Program Files (x86)\LibreOffice\program\
)

echo.
echo ✅ Step 3: Creating .env file...
echo LIBREOFFICE_AVAILABLE=true >> .env
echo NODE_ENV=development >> .env

echo.
echo 🎉 Configuration complete!
echo.
echo 📋 Next steps:
echo    1. Restart your terminal/command prompt
echo    2. Restart the backend server: npm run dev
echo    3. Test PDF conversion - formatting should now be preserved!
echo.
pause