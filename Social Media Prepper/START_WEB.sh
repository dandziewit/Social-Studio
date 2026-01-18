#!/bin/bash

echo "========================================"
echo "  Social Studio - Web Interface"
echo "========================================"
echo ""
echo "Starting browser interface..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8 or later"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo ""
fi

# Activate virtual environment
source venv/bin/activate

# Install/update requirements
echo "Checking requirements..."
pip install -r requirements.txt --quiet
echo ""

# Run Streamlit app
echo "Opening Social Studio in your browser..."
echo ""
echo "Press Ctrl+C to stop the server when done."
echo ""
streamlit run social_studio_web.py

# Deactivate virtual environment
deactivate

echo ""
echo "Social Studio closed."
