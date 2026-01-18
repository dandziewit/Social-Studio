# 🚀 Quick Reference: New Features

## ✨ What's New in Social Studio

### 1. **Trimmed Audio/Video Export**
- **Before:** Downloaded the full file
- **Now:** Downloads only the trimmed clip you selected

**How it works:**
1. Upload your audio/video
2. Set duration (e.g., 7-15 seconds)
3. Click "Auto-Generate" → FFmpeg processes clips
4. Download button gives you the **trimmed clip**

---

### 2. **Auto-Generated Hashtags**
- **Automatically generates 3-10 hashtags** per platform
- Updates when you edit clips
- Fully editable

**Where to find them:**
- Go to **Step 4: Preview**
- Hashtags appear automatically below captions
- Edit them or click "🔄 Regenerate Hashtags"

**When they regenerate:**
- First time entering Preview step
- After clicking "Apply Changes & Reprocess" in Edit step
- Manual click on "Regenerate" button

---

### 3. **Reprocess Clips After Editing**
In **Step 3: Edit**, you can now:
- Change start time and duration
- Select different crop presets
- Add text overlays
- Click "✓ Apply Changes & Reprocess"

**What happens:**
- FFmpeg re-runs with new settings
- New trimmed clip is created
- Hashtags regenerate automatically
- Preview updates with new clip

---

## 📋 Full Workflow Example

### Scenario: Prepare a podcast clip for Instagram & TikTok

```
Step 1: Import
├─ Upload: podcast_episode.mp3 (30 minutes long)
└─ Select: Audio

Step 2: Auto-Generate
├─ Select platforms: Instagram ✓, TikTok ✓
├─ Set duration: 7-15 seconds
└─ Click "Auto-Generate"
   → Creates TWO 10-second clips automatically

Step 3: Edit (Optional)
├─ Select clip to edit
├─ Adjust start time: 125s (2:05 mark)
├─ Adjust duration: 12s
└─ Click "Apply Changes & Reprocess"
   → FFmpeg creates new 12-second clip from 2:05-2:17

Step 4: Preview
├─ Listen to processed clip (actual audio player)
├─ See auto-generated hashtags:
   Instagram: #podcast #business #entrepreneurship #marketing...
   TikTok: #podcastclip #viral #fyp #businesstips...
├─ Edit captions and hashtags as needed
└─ Approve when ready

Step 5: Export
├─ Download processed clips:
   • podcast_episode_instagram_20260118_143022.mp3 (12s)
   • podcast_episode_tiktok_20260118_143022.mp3 (12s)
└─ Generate scheduler CSV:
   • buffer_posts_20260118_143022.csv
   • Includes captions, hashtags, filenames
```

---

## 🎯 Key Benefits

✅ **No more manual trimming** - FFmpeg does it automatically
✅ **Hashtags ready to go** - Auto-generated, editable
✅ **Preview actual clips** - See/hear what you're posting
✅ **Scheduler-ready** - CSV has everything Buffer/Publer needs
✅ **Fully offline** - No API calls, no internet required

---

## 🔧 Technical Notes

### FFmpeg Processing
- **Audio:** Trimmed with `libmp3lame` codec, 192k bitrate
- **Video:** Trimmed + cropped to platform specs (9:16, 1:1, etc.)
- **Output:** Timestamped filenames for uniqueness

### File Storage
- Clips processed in temp directory: `%TEMP%\social_studio\`
- Final outputs stored in memory for download
- No disk space wasted

### Hashtag Generation
- Template-based (offline, no AI API needed)
- Platform-specific rules
- 3-10 hashtags per platform
- Editable in Preview step

---

## ⚠️ Important Notes

1. **FFmpeg Required:** If you get errors, run `INSTALL_FFMPEG.bat`

2. **Original Files Safe:** Your uploads are never modified

3. **Processed Clips:** Only trimmed portions are exported

4. **CSV Format:** Compatible with Buffer, Publer, Later, Meta Business Suite

5. **Web-Based:** This is the Streamlit web version, not desktop

---

## 🆘 Troubleshooting

### "FFmpeg not found"
**Solution:** Run `INSTALL_FFMPEG.bat` in the project folder

### "No processed clips available"
**Solution:** Click "Auto-Generate Suggestions" in Step 2 first

### "Hashtags not showing"
**Solution:** Generate clips first, then go to Preview step

### "Downloaded full file instead of clip"
**Solution:** Refresh the page and regenerate clips

---

## 📚 Next Steps

Want to enhance further?
- Add AI-powered caption generation (OpenAI API)
- Custom hashtag templates per niche
- Batch processing for multiple files
- Video thumbnail selection

---

🎉 **Ready to use! Open http://localhost:8501 and start creating!**
