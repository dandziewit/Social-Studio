#!/bin/bash
# Social Studio - Linux/Mac Setup Script
# This script automatically sets up and runs the Social Studio project

echo ""
echo "============================================================"
echo "   SOCIAL STUDIO - AUTOMATED SETUP"
echo "============================================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ ERROR: Python 3 is not installed"
    echo "Please install Python 3.10+ from python.org"
    exit 1
fi

echo "[1/5] Running setup script..."
python3 restore_project.py
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERROR: Setup script failed"
    exit 1
fi

echo ""
echo "[2/5] Checking dependencies..."
python3 -m pip install -r requirements.txt --quiet
if [ $? -ne 0 ]; then
    echo "⚠️  WARNING: Some dependencies may have failed to install"
fi

echo ""
echo "[3/5] Validating project structure..."
if [ ! -f "social_studio/__init__.py" ]; then
    echo "❌ ERROR: social_studio package not found"
    exit 1
fi

echo ""
echo "[4/5] Testing imports..."
python3 -c "import streamlit; import yaml; print('✅ Core dependencies OK')"
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Core dependencies missing"
    exit 1
fi

echo ""
echo "[5/5] Starting Streamlit app..."
echo ""
echo "============================================================"
echo "   App will open in your browser at http://localhost:8501"
echo "   Press Ctrl+C to stop the server"
echo "============================================================"
echo ""

streamlit run app.py
