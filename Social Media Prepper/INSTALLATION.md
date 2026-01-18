# 🚀 Installation Instructions - Social Studio

## Quick Installation (5 Minutes)

### Prerequisites
- **Python 3.8 or later** ([Download](https://python.org))
- **FFmpeg** (for video/audio) - Optional for first test

---

## Windows Installation

### Step 1: Install Python (if needed)
1. Go to [python.org/downloads](https://python.org/downloads)
2. Download latest Python 3.x
3. **IMPORTANT**: Check "Add Python to PATH" during installation
4. Complete installation
5. Restart your computer (if prompted)

### Step 2: Install FFmpeg (Optional)
```batch
# Easy way - Run included script
INSTALL_FFMPEG.bat
```

**OR Manual Installation**:
1. Download FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html)
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to Windows PATH

### Step 3: Launch Social Studio
```batch
# Double-click this file:
SOCIAL_STUDIO.bat
```

**First run takes ~2 minutes** (installs packages)
**Subsequent runs are instant!**

---

## Mac Installation

### Step 1: Install Python (if needed)
```bash
# Check if Python is installed
python3 --version

# If not installed, download from python.org
# OR use Homebrew:
brew install python3
```

### Step 2: Install FFmpeg
```bash
# Using Homebrew (recommended)
brew install ffmpeg
```

### Step 3: Launch Social Studio
```bash
# Make script executable (first time only)
chmod +x SOCIAL_STUDIO.sh

# Run Social Studio
./SOCIAL_STUDIO.sh
```

---

## Linux Installation

### Step 1: Install Python (if needed)
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install python3 python3-pip python3-venv

# Fedora/RHEL
sudo dnf install python3 python3-pip

# Arch
sudo pacman -S python python-pip
```

### Step 2: Install FFmpeg
```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# Fedora/RHEL
sudo dnf install ffmpeg

# Arch
sudo pacman -S ffmpeg
```

### Step 3: Install Additional Dependencies
```bash
# Required for PySide6 on Linux
sudo apt-get install libxcb-cursor0
```

### Step 4: Launch Social Studio
```bash
# Make script executable (first time only)
chmod +x SOCIAL_STUDIO.sh

# Run Social Studio
./SOCIAL_STUDIO.sh
```

---

## Manual Installation (Advanced)

If the automated scripts don't work:

### 1. Create Virtual Environment
```bash
python -m venv venv
```

### 2. Activate Virtual Environment

**Windows:**
```batch
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

### 3. Install Requirements
```bash
pip install -r requirements.txt
```

### 4. Run Application
```bash
python main.py
```

---

## Verifying Installation

### Check Python
```bash
python --version
# Should show: Python 3.8.x or higher
```

### Check FFmpeg
```bash
ffmpeg -version
# Should show FFmpeg version info
```

### Check Packages
```bash
pip list
# Should show: PySide6, Pillow, PyYAML, etc.
```

---

## Common Installation Issues

### "Python not found"
**Solution**: Install Python from [python.org](https://python.org)
- ✅ Check "Add Python to PATH" during installation
- Restart computer after installation

### "pip not found"
**Solution**: 
```bash
# Windows
python -m ensurepip --default-pip

# Mac/Linux
sudo apt-get install python3-pip
```

### "FFmpeg not found" (Warning)
**Solution**: This is OK for testing! 
- You can still use Social Studio for images
- Install FFmpeg later for video/audio support

### "Permission denied" (Linux/Mac)
**Solution**: 
```bash
chmod +x SOCIAL_STUDIO.sh
```

### "Module not found" Error
**Solution**:
```bash
# Activate virtual environment first
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Then install requirements
pip install -r requirements.txt
```

### PySide6 Installation Fails
**Solution**:
```bash
# Update pip first
pip install --upgrade pip

# Try installing PySide6 separately
pip install PySide6

# If still fails, try:
pip install PySide6 --no-cache-dir
```

### Linux: "libxcb-cursor0 not found"
**Solution**:
```bash
sudo apt-get install libxcb-cursor0
```

---

## Testing Installation

### Quick Test
```bash
python -c "import PySide6; print('PySide6 OK')"
python -c "from PIL import Image; print('Pillow OK')"
python -c "import yaml; print('PyYAML OK')"
```

All should print "OK"

### Full Test
1. Run `SOCIAL_STUDIO.bat` (Windows) or `./SOCIAL_STUDIO.sh` (Mac/Linux)
2. Application window should open
3. Try importing a test image
4. If window opens → **Installation successful!** ✅

---

## System Requirements

### Minimum
- **OS**: Windows 10, macOS 10.14, Ubuntu 18.04 or later
- **RAM**: 4 GB
- **Storage**: 500 MB free space
- **Python**: 3.8 or later

### Recommended
- **OS**: Windows 11, macOS 12+, Ubuntu 22.04+
- **RAM**: 8 GB or more
- **Storage**: 2 GB free space (for projects)
- **Python**: 3.10 or later
- **FFmpeg**: Installed for full functionality

---

## What Gets Installed

### Python Packages
- **PySide6** (≥6.6.0) - Desktop UI framework
- **Pillow** (≥10.0.0) - Image processing
- **PyYAML** (≥6.0) - Configuration
- **python-dateutil** (≥2.8.0) - Date utilities
- **openai** (≥1.0.0) - Optional, for AI captions

### Total Size
- Virtual environment: ~300 MB
- Application code: ~5 MB
- Logs and cache: ~10 MB

---

## Uninstallation

### Quick Uninstall
Simply delete the Social Studio folder. That's it!

### Complete Removal
1. Delete Social Studio folder
2. Delete virtual environment: `rm -rf venv`
3. FFmpeg remains installed (can remove separately if desired)

---

## Next Steps After Installation

1. ✅ **Read Quick Start**: `QUICK_START_SOCIAL_STUDIO.md`
2. ✅ **Customize Config**: Edit `config/config.yaml`
3. ✅ **Import Test Media**: Try the Import step
4. ✅ **Read Full Manual**: `SOCIAL_STUDIO_README.md`

---

## Getting Help

### Before Asking for Help

1. Check `logs/social_studio.log` for errors
2. Try running from command line to see errors
3. Verify Python and FFmpeg are installed
4. Check this troubleshooting guide

### Include in Support Request

- Operating system and version
- Python version (`python --version`)
- Error message (exact text)
- Log file contents
- Steps to reproduce

---

## Update Instructions

### To Update Social Studio

```bash
# Navigate to Social Studio folder
cd "Social Studio"

# Activate virtual environment
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Update packages
pip install -r requirements.txt --upgrade

# Run application
python main.py
```

---

## Optional: Desktop Shortcut

### Windows
1. Right-click `SOCIAL_STUDIO.bat`
2. Select "Create shortcut"
3. Move shortcut to Desktop
4. Rename to "Social Studio"
5. Double-click to launch!

### Mac
1. Right-click `SOCIAL_STUDIO.sh`
2. Select "Make Alias"
3. Move to Desktop
4. Double-click to launch!

### Linux
Create `.desktop` file:
```ini
[Desktop Entry]
Name=Social Studio
Exec=/path/to/SOCIAL_STUDIO.sh
Type=Application
Terminal=false
```

---

## Success! 🎉

If Social Studio opens, you're ready to create content!

**Next**: Read `QUICK_START_SOCIAL_STUDIO.md` to create your first project.

---

**Having issues?** Check `logs/social_studio.log` for detailed error information.
