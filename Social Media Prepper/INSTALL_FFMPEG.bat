@echo off
REM FFmpeg Installation Script for Windows
REM This will install FFmpeg so music and video processing works

title Installing FFmpeg

echo.
echo ============================================================
echo   FFMPEG INSTALLER
echo   Required for Music and Video Processing
echo ============================================================
echo.

echo [Step 1] Checking for winget (Windows Package Manager)...
echo.

winget --version >nul 2>&1
if errorlevel 1 (
    echo WARNING: winget not found!
    echo.
    echo MANUAL INSTALLATION:
    echo 1. Go to: https://www.gyan.dev/ffmpeg/builds/
    echo 2. Download: ffmpeg-release-essentials.zip
    echo 3. Extract to: C:\ffmpeg\
    echo 4. Add to PATH: C:\ffmpeg\bin\
    echo 5. Restart your computer
    echo.
    pause
    exit /b 1
)

echo ✓ winget found!
echo.
echo [Step 2] Installing FFmpeg...
echo This may take 2-3 minutes...
echo.

winget install Gyan.FFmpeg --accept-source-agreements --accept-package-agreements

if errorlevel 1 (
    echo.
    echo ERROR: Installation failed!
    echo.
    echo Try manual installation:
    echo 1. Go to: https://www.gyan.dev/ffmpeg/builds/
    echo 2. Download: ffmpeg-release-essentials.zip
    echo 3. Extract to: C:\ffmpeg\
    echo 4. Add to PATH: C:\ffmpeg\bin\
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   ✓ FFmpeg Installed Successfully!
echo ============================================================
echo.
echo IMPORTANT: You MUST restart your computer for this to work!
echo.
echo After restarting:
echo 1. Double-click START.bat
echo 2. Music and video processing will work!
echo.
echo ============================================================
echo.
pause

echo.
echo Do you want to restart your computer now? (Y/N)
set /p restart=
if /i "%restart%"=="Y" (
    echo Restarting in 10 seconds...
    shutdown /r /t 10
    echo Press Ctrl+C to cancel restart
    pause
) else (
    echo.
    echo Remember to restart your computer manually!
    pause
)
