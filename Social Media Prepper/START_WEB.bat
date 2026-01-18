@echo off
echo ========================================
echo   Social Studio - Web Interface
echo ========================================
echo.
echo Starting browser interface...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or later from python.org
    echo.
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

REM Activate virtual environment
call venv\Scripts\activate

REM Install/update requirements
echo Checking requirements...
pip install -r requirements.txt --quiet
echo.

REM Run Streamlit app
echo Opening Social Studio in your browser...
echo.
echo Press Ctrl+C to stop the server when done.
echo.
streamlit run social_studio_web.py

REM Deactivate virtual environment
deactivate

echo.
echo Social Studio closed.
pause
