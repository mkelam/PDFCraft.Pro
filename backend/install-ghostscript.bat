@echo off
echo Installing Ghostscript for PDFCraft.Pro...
echo.

REM Download Ghostscript
echo Downloading Ghostscript installer...
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs10030/gs10030w64.exe' -OutFile '%TEMP%\gs-installer.exe'}"

if not exist "%TEMP%\gs-installer.exe" (
    echo Failed to download Ghostscript installer
    pause
    exit /b 1
)

echo Installing Ghostscript...
"%TEMP%\gs-installer.exe" /S

echo Waiting for installation to complete...
timeout /t 15 /nobreak

REM Clean up
del "%TEMP%\gs-installer.exe"

REM Find Ghostscript installation
echo Locating Ghostscript installation...
set GHOST_PATH=
if exist "C:\Program Files\gs\gs10.03.0\bin\gswin64c.exe" (
    set GHOST_PATH=C:\Program Files\gs\gs10.03.0\bin\gswin64c.exe
) else if exist "C:\Program Files (x86)\gs\gs10.03.0\bin\gswin32c.exe" (
    set GHOST_PATH=C:\Program Files (x86)\gs\gs10.03.0\bin\gswin32c.exe
) else (
    echo Ghostscript installation not found in expected locations
    echo Please check installation manually
    pause
    exit /b 1
)

echo Ghostscript found at: %GHOST_PATH%

REM Set environment variables
echo Setting environment variables...
setx GHOSTSCRIPT_PATH "%GHOST_PATH%"
setx GHOSTSCRIPT_AVAILABLE "true"

REM Test installation
echo Testing Ghostscript...
"%GHOST_PATH%" --version

echo.
echo Ghostscript installation completed!
echo.
echo Benefits for PDFCraft.Pro:
echo   - Advanced PDF manipulation
echo   - Better quality rendering
echo   - Support for complex PDF operations
echo   - Industry-standard PDF processing
echo.
pause