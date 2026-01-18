# 🚀 Quick Start Guide - Social Studio

**Get started in 5 minutes!**

---

## ⚡ Super Quick Start

### Windows Users
1. **Double-click**: `SOCIAL_STUDIO.bat`
2. **Wait**: First time takes ~2 minutes
3. **Done**: Social Studio opens!

### Mac/Linux Users
1. **Open Terminal**
2. **Run**: `chmod +x SOCIAL_STUDIO.sh && ./SOCIAL_STUDIO.sh`
3. **Done**: Social Studio opens!

---

## 📝 First Time Setup (One-Time)

### Step 1: Check Python (2 minutes)

**Do you have Python?**
```bash
python --version
```

**If you see "Python 3.8" or higher**: ✅ You're good!

**If not**: Download from [python.org](https://python.org)
- Click "Downloads"
- Install latest version
- **Important**: Check "Add Python to PATH" during install

### Step 2: Install FFmpeg (Optional, 3 minutes)

**For video/audio processing:**

#### Windows
```bash
# Run the included installer
INSTALL_FFMPEG.bat
```

#### Mac
```bash
brew install ffmpeg
```

#### Linux
```bash
sudo apt-get install ffmpeg
```

**Skip this?** You can still use Social Studio for images only.

---

## 🎬 Your First Project (5 minutes)

### 1. Launch Social Studio
- Windows: Double-click `SOCIAL_STUDIO.bat`
- Mac/Linux: Run `./SOCIAL_STUDIO.sh`

### 2. Import Media
- Click "📁 Browse and Import Files"
- Choose your media type:
  - 🎵 Audio (MP3, WAV)
  - 🎬 Video (MP4, MOV)
  - 📸 Images (JPG, PNG)
- Select 1-5 files
- Click "Next: Auto-Generate →"

### 3. Auto-Generate Content
- Select platforms: Instagram, TikTok, YouTube
- Set clip duration: 7-15 seconds
- Click "✨ Auto-Generate Suggestions"
- Wait ~10 seconds
- Click "Next: Manual Edit →"

### 4. Edit (Optional)
- Select a clip from the list
- Adjust timeline start/end if needed
- Choose crop preset (9:16 for vertical)
- Add text overlay (optional)
- Click "✓ Apply Changes"
- Click "Next: Preview Platforms →"

### 5. Preview & Approve
- Click through platform tabs
- Review captions and hashtags
- Edit if needed
- Click "Next: Export →"

### 6. Export
- Click "Browse..." to choose export folder
- Recommended: Desktop or Documents
- Click "🚀 Start Export"
- Wait for completion
- **Done!** Your content is ready!

---

## 📂 What You Get

After export, you'll have:

```
YourExportFolder/
├── instagram/
│   ├── mysong_instagram_20260118.mp4
│   └── instagram_scheduler_import.csv
├── tiktok/
│   ├── mysong_tiktok_20260118.mp4
│   └── tiktok_scheduler_import.csv
└── youtube/
    ├── mysong_youtube_20260118.mp4
    └── youtube_scheduler_import.csv
```

---

## 📤 Upload to Scheduler (2 minutes)

### Using Buffer

1. **Open Buffer** → [buffer.com](https://buffer.com)
2. Click "Import" or "Bulk Upload"
3. Select `instagram_scheduler_import.csv`
4. Upload the video files when prompted
5. Schedule your posts!
6. Repeat for other platforms

### Using Publer

1. **Open Publer** → [publer.io](https://publer.io)
2. Click "Bulk Create"
3. Import `instagram_scheduler_import.csv`
4. Upload media files
5. Set schedule
6. Publish!

### Manual Upload

**No CSV support?** No problem!
1. Open CSV file in Excel/Notepad
2. Copy caption + hashtags
3. Upload video manually to your scheduler
4. Paste caption
5. Schedule!

---

## 🎯 Quick Tips

### ✅ Do This
- Import 1-5 files at a time (not 100!)
- Use high-quality source files
- Preview before exporting
- Save exports to Desktop (easy to find)
- Use CSV imports when possible (faster!)

### ❌ Avoid This
- Don't import 50 files at once (slow!)
- Don't skip the preview step
- Don't export to weird locations
- Don't close app during export
- Don't panic if FFmpeg warning appears (images still work!)

---

## 🆘 Common First-Time Issues

### "Python not found"
**Fix**: Install Python from [python.org](https://python.org)
- ✅ Check "Add to PATH" during install
- Restart computer after install

### "FFmpeg not found" Warning
**Fix**: This is OK! You can:
- Option 1: Skip video/audio (use images only)
- Option 2: Install FFmpeg (see Step 2 above)

### Application Won't Start
**Fix**: 
1. Right-click `SOCIAL_STUDIO.bat`
2. Select "Run as Administrator"
3. If still fails, check `logs/social_studio.log`

### Slow on First Run
**Normal!** First run installs packages (~2 minutes)
- Subsequent runs are instant
- Be patient on first launch

---

## 📚 Learn More

- **Full Manual**: Read `SOCIAL_STUDIO_README.md`
- **Configuration**: Edit `config/config.yaml`
- **Troubleshooting**: See README troubleshooting section
- **Logs**: Check `logs/social_studio.log` for errors

---

## 🎉 You're Ready!

That's it! You're now ready to create professional social media content.

**Workflow Summary**:
1. Import → 2. Auto-Generate → 3. Edit → 4. Preview → 5. Export → 6. Schedule

**Time per project**: 5-10 minutes
**Result**: Professional, scheduler-ready content for multiple platforms!

---

## 💡 Next Steps

### Beginner
- Create your first project (follow steps above)
- Export to 2-3 platforms
- Try CSV import with Buffer/Publer

### Intermediate
- Customize captions in config.yaml
- Add text overlays to videos
- Set up brand name and logo

### Advanced
- Enable AI captions (OpenAI API)
- Create custom hashtag sets
- Batch process multiple projects

---

**Happy Creating!** 🎬✨

Remember: Social Studio never auto-posts. You control everything. Your content, your schedule, your way.
