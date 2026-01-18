@echo off
REM Social Studio - Windows Setup Script
REM This script automatically sets up and runs the Social Studio project

echo.
echo ============================================================
echo    SOCIAL STUDIO - AUTOMATED SETUP
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.10+ from python.org
    pause
    exit /b 1
)

echo [1/5] Running setup script...
python restore_project.py
if errorlevel 1 (
    echo.
    echo ERROR: Setup script failed
    pause
    exit /b 1
)

echo.
echo [2/5] Checking dependencies...
python -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo WARNING: Some dependencies may have failed to install
)

echo.
echo [3/5] Validating project structure...
if not exist "social_studio\__init__.py" (
    echo ERROR: social_studio package not found
    pause
    exit /b 1
)

echo.
echo [4/5] Testing imports...
python -c "import streamlit; import yaml; print('✅ Core dependencies OK')"
if errorlevel 1 (
    echo ERROR: Core dependencies missing
    pause
    exit /b 1
)

echo.
echo [5/5] Starting Streamlit app...
echo.
echo ============================================================
echo    App will open in your browser at http://localhost:8501
echo    Press Ctrl+C to stop the server
echo ============================================================
echo.

streamlit run app.py

pause
