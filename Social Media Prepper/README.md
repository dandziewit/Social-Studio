# Social Studio

🎵 **Audio Clips + Photos** with **Auto Hashtags** for Social Media Schedulers

A web-based tool that prepares audio clips and photos for social media, complete with auto-generated captions and hashtags. Export to Buffer, Publer, Later, or Meta Business Suite.

**🚨 IMPORTANT: This tool does NOT post directly to social media. It only prepares scheduler-ready content.**

[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## 🚀 Quick Start

**Windows users**: Double-click `START_WEB.bat`  
**Mac/Linux users**: Run `./START_WEB.sh`  
**Or manually**: `streamlit run app.py`

Then open: **http://localhost:8501**

---

## 📋 Table of Contents

- [Quick Start](#-quick-start-for-non-technical-users) ⭐ **Start Here!**
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Workflow](#-workflow)
- [Scheduler Upload Guide](#-scheduler-upload-guide)
- [Project Structure](#-project-structure)
- [FAQ](#-faq)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### Core Functionality
- **Multi-Platform Support**: Instagram, TikTok, Facebook, Twitter
- **Content Processing**:
  - 🎵 Audio clipping (10-15 seconds)
  - 🖼️ Image resizing per platform
  - 🎬 Video format conversion (1080x1920 vertical)
  - 🎨 Optional watermark/logo overlay
  - 📝 Text overlay on images

### Caption Generation
- **AI-Powered**: OpenAI integration for engaging captions
- **Template Fallback**: Works without API keys
- **Platform-Specific**: Character limits and tone adjustments
- **Hashtag Rotation**: Avoid repetitive hashtags across posts

### Export Options
- **CSV Export**: Compatible with Buffer, Publer, Later, etc.
- **JSON Export**: Structured data for custom integrations
- **Scheduler-Specific Formats**: Optimized for each platform
- **Upload Instructions**: Step-by-step guides included

### User Experience
- **Approval Mode**: Review and edit before export
- **Batch Processing**: Process all content at once
- **Config-Driven**: Customize via YAML file
- **Comprehensive Logging**: Track all operations

---

## 🛠️ Tech Stack

- **Python 3.7+**: Core application
- **Pillow**: Image processing and manipulation
- **FFmpeg**: Audio/video clipping and conversion
- **PyYAML**: Configuration management
- **OpenAI API** *(optional)*: AI-powered captions

---

## 📦 Installation

### Prerequisites

1. **Python 3.7 or higher**
   ```bash
   python --version
   ```

2. **FFmpeg** (required for audio/video processing)
   
   **Windows:**
   - Download from [ffmpeg.org](https://ffmpeg.org/download.html)
   - Extract and add to PATH
   - Verify: `ffmpeg -version`
   
   **macOS:**
   ```bash
   brew install ffmpeg
   ```
   
   **Linux:**
   ```bash
   sudo apt-get update
   sudo apt-get install ffmpeg
   ```

### Easy Setup (Recommended)

**For non-technical users:**

**Windows:**
1. Double-click `INSTALL.bat` (one-time setup)
2. Put your content in `input/` folders
3. Double-click `START.bat` to run the app
4. That's it!

**Mac/Linux:**
1. Run `./INSTALL.sh` in terminal (one-time setup)
2. Put your content in `input/` folders  
3. Double-click `START.sh` to run the app
4. That's it!

See [START_HERE.md](START_HERE.md) for the complete beginner guide.

### Manual Setup (For Developers)

1. **Clone or download the project**
   ```bash
   cd "Social Media Prepper"
   ```

2. **Create a virtual environment** (recommended)
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure the application**
   - Edit `config/config.yaml` with your brand details
   - (Optional) Add OpenAI API key for AI captions

5. **Verify installation**
   ```bash
   python main.py
   ```

---

## ⚙️ Configuration

### Edit `config/config.yaml`

#### Basic Settings
```yaml
brand:
  name: "Your Brand Name"
  artist_name: "Your Artist Name"
  logo_path: ""  # Optional: path to logo for watermark

default_platforms:
  - instagram
  - tiktok
  - facebook
```

#### Caption Templates
Customize templates with placeholders:
- `{brand}` - Your brand name
- `{artist}` - Your artist name
- `{emotion}` - Auto-generated vibe word

```yaml
caption_templates:
  music:
    - "🎵 New vibes from {brand}! {emotion} 🎶"
    - "🔥 Fresh beat alert! {brand} bringing the heat 🔥"
```

#### Hashtag Sets
Configure multiple sets that rotate to avoid repetition:
```yaml
hashtag_sets:
  music:
    set_1:
      - music
      - newmusic
      - beats
    set_2:
      - musician
      - producer
      - audio
```

#### OpenAI Integration (Optional)
```yaml
openai:
  enabled: true
  api_key: "your-api-key-here"  # Or set OPENAI_API_KEY env variable
  model: "gpt-3.5-turbo"
```

**Getting an API Key:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up/login
3. Navigate to API Keys
4. Create new key
5. Add to config.yaml or set as environment variable

---

## 🚀 Usage

### Quick Start

1. **Add your content files**
   ```
   input/
   ├── music/    # .mp3, .wav, .m4a, .flac
   ├── images/   # .jpg, .png, .gif, .bmp
   └── videos/   # .mp4, .mov, .avi, .mkv
   ```

2. **Run the application**
   ```bash
   python main.py
   ```

3. **Follow the menu**
   - Choose content type to prep
   - Select platforms
   - Review and approve posts
   - Export to your scheduler

### CLI Menu Options

```
1. Prep Music Content        → Process audio files
2. Prep Image Content        → Process images
3. Prep Video Content        → Process videos
4. Batch Process All         → Process everything at once
5. Preview & Approve Posts   → Review before export
6. Export to Scheduler       → Generate CSV/JSON files
7. Check Configuration       → Verify settings
8. View Help                 → Detailed guidance
0. Exit                      → Close application
```

---

## 🔄 Workflow

### Complete Workflow Example

#### Step 1: Prepare Content
```
📁 Add files to input folders:
   input/music/my_beat.mp3
   input/images/cover_art.jpg
```

#### Step 2: Process Content
```
Run: python main.py
Select: "1. Prep Music Content"
Platforms: Instagram, TikTok
AI Captions: Yes
```

**What happens:**
- Audio clipped to 10-15 seconds
- Video created with cover art background
- Resized for each platform (1080x1920)
- Caption and hashtags generated
- Suggested post times assigned

#### Step 3: Review & Approve
```
Select: "5. Preview & Approve Posts"
Review: Caption, hashtags, media
Actions: Approve, edit, or reject
```

#### Step 4: Export
```
Select: "6. Export to Scheduler"
Scheduler: Buffer (or Publer, Later, etc.)
Output: CSV + JSON + instructions
```

#### Step 5: Upload to Scheduler
```
📁 scheduler_export/
   ├── buffer_posts_20260106_143022.csv
   ├── buffer_posts_20260106_143022.json
   └── buffer_INSTRUCTIONS_20260106_143022.txt

Follow the instructions file to upload to Buffer
```

---

## 📤 Scheduler Upload Guide

### Buffer

1. Log in to [buffer.com](https://buffer.com)
2. Go to **Settings → Posting Schedule**
3. Click **Bulk Upload** or **Import Posts**
4. Upload the CSV file
5. Map columns:
   - `text` → Post Text
   - `media_path` → Media
   - `profile` → Profile/Account
   - `scheduled_at` → Schedule Time
6. Upload media files to Buffer
7. Review and confirm

### Publer

1. Log in to [publer.io](https://publer.io)
2. Navigate to **Posts** section
3. Click **Bulk Upload** or **Import**
4. Select the CSV file
5. Upload media to media library
6. Map columns and schedule

### Later

1. Log in to [later.com](https://later.com)
2. Upload media to **Media Library**
3. Use CSV data to manually schedule via calendar
4. Drag media to calendar grid
5. Copy captions and hashtags from CSV

### Meta Business Suite

1. Log in to [business.facebook.com](https://business.facebook.com)
2. Go to **Content → Posts**
3. Manually create posts using CSV data
4. Upload media for each post
5. Set schedule times as specified

### Generic CSV Format

The generic export includes all data fields:
```csv
platform,caption,hashtags,suggested_date,suggested_time,media_file_path
instagram,"Great caption here","#music #newmusic",2026-01-06,09:00,output/instagram/file.jpg
```

Use this format for any scheduler that accepts CSV imports.

---

## 📁 Project Structure

```
Social Media Prepper/
│
├── config/
│   └── config.yaml              # Configuration file
│
├── input/                       # Your content files
│   ├── music/
│   ├── images/
│   └── videos/
│
├── output/                      # Processed content
│   ├── instagram/
│   ├── tiktok/
│   ├── facebook/
│   └── twitter/
│
├── scheduler_export/            # CSV/JSON exports
│
├── logs/
│   └── app.log                  # Application logs
│
├── src/
│   ├── __init__.py
│   ├── config_manager.py        # Configuration handling
│   ├── content_processor.py     # Image/video/audio processing
│   ├── caption_generator.py     # Caption & hashtag generation
│   ├── export_manager.py        # CSV/JSON export
│   └── cli.py                   # Command-line interface
│
├── main.py                      # Entry point
├── requirements.txt             # Python dependencies
├── .gitignore
└── README.md                    # This file
```

---

## ❓ FAQ

### General Questions

**Q: Does this tool post directly to social media?**  
A: No. It only prepares content for you to upload to schedulers manually.

**Q: Do I need to pay for anything?**  
A: The app is free. OpenAI API (optional) has costs. FFmpeg is free.

**Q: Can I use this without FFmpeg?**  
A: Yes, but audio/video processing won't work. Image processing still works.

**Q: Can I use this without OpenAI?**  
A: Yes! It falls back to template-based captions automatically.

### Technical Questions

**Q: What if my video is too long?**  
A: The app will process it, but you may need to trim longer videos manually first for best results.

**Q: Can I customize caption templates?**  
A: Yes! Edit `config/config.yaml` and add your own templates.

**Q: How do hashtag sets rotate?**  
A: The app cycles through sets (set_1, set_2, set_3) to avoid using the same hashtags repeatedly.

**Q: Can I process content for multiple brands?**  
A: Yes! Create separate config files and specify which to use, or edit config.yaml between runs.

### Troubleshooting

**Q: "FFmpeg not found" error**  
A: Install FFmpeg and ensure it's in your system PATH. Restart terminal after installation.

**Q: "Configuration file not found"**  
A: Ensure `config/config.yaml` exists in the config folder.

**Q: Images look distorted**  
A: Images are cropped to fit platform dimensions. Ensure source images are high quality.

**Q: OpenAI API errors**  
A: Check your API key and ensure you have credits. App will fall back to templates on error.

---

## 🤝 Contributing

This is a portfolio project, but suggestions and improvements are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🎯 Use Cases

### Musicians & Producers
- Clip beats to 15-second previews
- Create vertical videos with cover art
- Generate engaging captions for music posts
- Schedule releases across platforms

### Content Creators
- Batch process photoshoots
- Add branding to all images
- Generate platform-specific content
- Maintain consistent posting schedule

### Small Businesses
- Prepare product photos for multiple platforms
- Create promotional content in bulk
- Schedule social media calendar
- Maintain brand consistency

### Social Media Managers
- Process client content efficiently
- Generate posts for multiple accounts
- Create scheduler-ready exports
- Save time on repetitive tasks

---

## 🔮 Future Enhancements

Potential features for future versions:
- [ ] Video thumbnail extraction
- [ ] Automatic color palette detection
- [ ] Analytics integration
- [ ] Cloud storage integration
- [ ] Mobile app version
- [ ] GUI interface option

---

## 💡 Tips for Best Results

### Content Quality
- Use high-resolution images (1080px+ width)
- Use clean audio files (no clipping/distortion)
- Keep videos under 60 seconds for easier processing
- Name files descriptively for better organization

### Captions
- Edit AI-generated captions to match your voice
- Test different templates to see what resonates
- Keep platform character limits in mind
- Use emojis strategically

### Hashtags
- Regularly update hashtag sets based on trends
- Mix popular and niche hashtags
- Research competitor hashtags
- Rotate sets to avoid repetition

### Scheduling
- Post during peak engagement times
- Spread posts throughout the week
- Test different times and track performance
- Use scheduler analytics to optimize

---

## 📞 Support

For issues, questions, or suggestions:
- Check the FAQ section above
- Review logs in `logs/app.log`
- Open an issue on GitHub
- Consult your scheduler's documentation

---

## 🙏 Acknowledgments

- **Pillow Team**: Image processing library
- **FFmpeg Project**: Audio/video processing
- **OpenAI**: AI caption generation
- **Open Source Community**: Various tools and libraries

---

## 📊 Project Stats

- **Lines of Code**: ~2,500+
- **Modules**: 5 core modules
- **Supported Formats**: 15+ file types
- **Platforms**: 4 major social networks
- **Schedulers**: 5+ compatible schedulers

---

**Made with ❤️ for content creators, musicians, and social media managers**

*This is a portfolio project demonstrating professional Python development, modular architecture, comprehensive documentation, and real-world problem-solving.*
