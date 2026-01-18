# 🎬 Social Studio

**Professional Social Media Content Preparation Tool**

A complete web-based application for creating, editing, and exporting social media content with AI-powered captions and hashtags. Built with Streamlit and Python.

[![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=Streamlit&logoColor=white)](https://streamlit.io)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)

## ✨ Features

### 📁 **Import Media**
- Upload audio files (MP3, WAV, M4A, AAC)
- Upload images (JPG, PNG, WEBP)
- Batch processing support

### ✨ **Auto-Generate Content**
- AI-powered clip suggestions
- Automatic caption generation
- Smart hashtag recommendations
- Platform-specific optimization (Instagram, TikTok, Facebook, YouTube, Twitter)

### ✏️ **Edit & Customize**
- Trim audio clips with precise controls
- Crop images to platform specs
- Edit captions and hashtags
- Real-time preview

### 👁️ **Preview**
- Side-by-side content review
- Platform-specific previews
- Hashtag validation
- Caption preview

### 📤 **Export**
- One-click CSV export for schedulers:
  - Buffer
  - Publer
  - Later
  - Meta Business Suite
- JSON export support
- Batch export all posts

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- pip

### Automated Setup (Recommended)

**Windows:**
```bash
setup_and_run.bat
```

**Linux/Mac:**
```bash
chmod +x setup_and_run.sh
./setup_and_run.sh
```

The automated scripts will:
1. Check Python version
2. Create required directories
3. Install dependencies
4. Validate project structure
5. Launch the app in your browser

### Manual Installation

1. **Clone the repository:**
```bash
git clone https://github.com/dandziewit/Social-Studio.git
cd Social-Studio
```

2. **Run the restoration script:**
```bash
python restore_project.py
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Run the app:**
```bash
streamlit run app.py
```

5. **Open in browser:**
Navigate to `http://localhost:8501`

## 🔧 Troubleshooting

If you encounter any issues:

1. **Run the automated restoration script:**
```bash
python restore_project.py
```

This will:
- Validate and fix project structure
- Create missing files
- Check all dependencies
- Test imports
- Provide detailed error messages

2. **Check Python version:**
```bash
python --version  # Should be 3.10 or higher
```

3. **Reinstall dependencies:**
```bash
pip install -r requirements.txt --upgrade
```

4. **Check for import errors:**
The app will display debug information if modules fail to import

## 🌐 Streamlit Cloud Deployment

### Deploy to Streamlit Cloud

1. Fork or clone this repository to your GitHub account
2. Go to [share.streamlit.io](https://share.streamlit.io)
3. Sign in with GitHub
4. Click "New app"
5. Configure:
   - **Repository:** `your-username/Social-Studio`
   - **Branch:** `main`
   - **Main file path:** `app.py`
   - **Python version:** 3.10

6. Click "Deploy!"

## 📁 Project Structure

```
social-studio/
├── app.py                      # Main Streamlit application
├── requirements.txt            # Python dependencies
├── config/
│   └── config.yaml            # Configuration settings
├── social_studio/             # Core package
│   ├── __init__.py
│   ├── config_manager.py      # Configuration handler
│   ├── content_processor.py   # Media processing
│   ├── caption_generator.py   # AI caption/hashtag generation
│   └── export_manager.py      # Scheduler export
├── scheduler_export/          # Export output directory
└── README.md
```

## 🛠️ Configuration

Edit `config/config.yaml` to customize:

- **Brand Settings:** Your brand name and tagline
- **Platform Settings:** Enable/disable specific platforms
- **Caption Templates:** Custom caption styles
- **Hashtag Sets:** Organized hashtag collections
- **Post Times:** Optimal posting schedules
- **Processing Settings:** Audio/video/image defaults

## 🎨 Supported Platforms

| Platform | Max Duration | Aspect Ratios | Status |
|----------|-------------|---------------|---------|
| Instagram | 60s | 9:16, 1:1, 4:5 | ✅ |
| TikTok | 60s | 9:16 | ✅ |
| Facebook | 240s | 16:9, 1:1 | ✅ |
| YouTube | 600s | 16:9, 9:16 | ✅ |
| Twitter | 140s | 16:9, 1:1 | ✅ |

## 📦 Dependencies

- `streamlit>=1.28.0` - Web framework
- `pyyaml>=6.0` - Configuration management
- `pillow>=10.0.0` - Image processing
- `python-dateutil>=2.8.0` - Date utilities

## 🔧 Development

### Local Development

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run in development mode:
```bash
streamlit run app.py --server.runOnSave true
```

### Adding Features

The modular architecture makes it easy to extend:

- **New platforms:** Add to `config.yaml`
- **Custom processors:** Extend `content_processor.py`
- **AI integrations:** Enhance `caption_generator.py`
- **Export formats:** Update `export_manager.py`

## 📝 Workflow

```
1. Import → Upload your media files
2. Auto-Generate → AI suggests clips, captions, hashtags
3. Edit → Customize everything manually
4. Preview → Review before export
5. Export → Download CSV/JSON for schedulers
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

**Damiel Dziewit**
- GitHub: [@dandziewit](https://github.com/dandziewit)

## 🙏 Acknowledgments

- Built with [Streamlit](https://streamlit.io)
- Inspired by the need for efficient social media content workflows
- Designed for content creators, marketers, and social media managers

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact via GitHub profile

---

**Made with ❤️ for content creators**
