"""
Social Studio - Web Interface
Browser-based version of Social Studio
"""

import yaml
import streamlit as st
import logging
from pathlib import Path
import tempfile
import base64
from datetime import datetime

# Validation check for Streamlit Cloud
st.write("YAML version:", yaml.__version__)

from social_studio.config_manager import ConfigManager
from social_studio.content_processor import ContentProcessor
from social_studio.caption_generator import CaptionGenerator
from social_studio.export_manager import ExportManager

# Configure logging - minimize console output
logging.basicConfig(
    level=logging.WARNING,  # Only show warnings and errors
    format='%(message)s'
)
logger = logging.getLogger(__name__)


# Initialize session state
if 'step' not in st.session_state:
    st.session_state.step = 1
if 'media_files' not in st.session_state:
    st.session_state.media_files = []
if 'media_type' not in st.session_state:
    st.session_state.media_type = None
if 'generated_clips' not in st.session_state:
    st.session_state.generated_clips = []
if 'processed_clips' not in st.session_state:
    st.session_state.processed_clips = {}  # Store processed media bytes
if 'selected_platforms' not in st.session_state:
    st.session_state.selected_platforms = ['instagram', 'tiktok']
if 'captions' not in st.session_state:
    st.session_state.captions = {}
if 'hashtags' not in st.session_state:
    st.session_state.hashtags = {}
if 'hashtags_generated' not in st.session_state:
    st.session_state.hashtags_generated = False  # Track if hashtags have been auto-generated


def init_components():
    """Initialize components"""
    if 'config' not in st.session_state:
        config_file = Path(__file__).parent / 'config' / 'config.yaml'
        st.session_state.config = ConfigManager(str(config_file))
        st.session_state.processor = ContentProcessor(st.session_state.config)
        st.session_state.caption_gen = CaptionGenerator(st.session_state.config)
        st.session_state.export_mgr = ExportManager(st.session_state.config)


def show_header():
    """Display header"""
    st.markdown("""
        <div style='background-color: #2c3e50; padding: 20px; border-radius: 10px; margin-bottom: 20px;'>
            <h1 style='color: white; margin: 0;'>∩┐╜ Social Studio</h1>
            <p style='color: #bdc3c7; margin: 0;'>Audio Clips + Photos with Auto Hashtags for Schedulers</p>
        </div>
    """, unsafe_allow_html=True)


def show_step_indicator():
    """Display step indicator"""
    steps = ["Import", "Auto-Generate", "Edit", "Preview", "Export"]
    current = st.session_state.step
    
    cols = st.columns(5)
    for i, (col, step_name) in enumerate(zip(cols, steps), 1):
        with col:
            if i < current:
                st.success(f"Γ£ô {step_name}")
            elif i == current:
                st.info(f"Γû╢ {step_name}")
            else:
                st.text(f"  {step_name}")


def step_import():
    """Step 1: Import media files"""
    st.header("≡ƒôü Step 1: Import Media")
    st.write("Upload your audio, video, or image files to get started.")
    
    # Media type selection
    media_type = st.radio(
        "Media Type:",
        ["≡ƒÄ╡ Audio (MP3, WAV, M4A)", "≡ƒô╕ Images (JPG, PNG)"],
        horizontal=True
    )
    
    type_map = {
        "≡ƒÄ╡ Audio (MP3, WAV, M4A)": "audio",
        "≡ƒô╕ Images (JPG, PNG)": "image"
    }
    st.session_state.media_type = type_map[media_type]
    
    # File uploader
    file_types = {
        "audio": ["mp3", "wav", "m4a", "aac"],
        "image": ["jpg", "jpeg", "png", "webp"]
    }
    
    uploaded_files = st.file_uploader(
        "Upload files:",
        type=file_types[st.session_state.media_type],
        accept_multiple_files=True
    )
    
    if uploaded_files:
        st.session_state.media_files = uploaded_files
        st.success(f"Γ£ô {len(uploaded_files)} files uploaded")
        
        for file in uploaded_files:
            st.text(f"≡ƒôä {file.name}")
    
    st.divider()
    
    col1, col2 = st.columns([1, 1])
    with col2:
        if st.button("Next: Auto-Generate ΓåÆ", type="primary", disabled=len(st.session_state.media_files) == 0):
            st.session_state.step = 2
            st.rerun()


def step_generate():
    """Step 2: Auto-generate content"""
    st.header("Γ£¿ Step 2: Auto-Generate Content")
    st.write("AI will suggest best clips, crops, and captions. You can edit everything manually next.")
    
    # Platform selection
    st.subheader("Target Platforms")
    col1, col2, col3, col4, col5 = st.columns(5)
    
    platforms = {}
    with col1:
        platforms['instagram'] = st.checkbox("Instagram", value=True)
    with col2:
        platforms['tiktok'] = st.checkbox("TikTok", value=True)
    with col3:
        platforms['facebook'] = st.checkbox("Facebook", value=True)
    with col4:
        platforms['youtube'] = st.checkbox("YouTube", value=False)
    with col5:
        platforms['twitter'] = st.checkbox("Twitter", value=False)
    
    st.session_state.selected_platforms = [p for p, checked in platforms.items() if checked]
    
    # Clip duration settings - only show for audio
    if st.session_state.media_type == 'audio':
        st.subheader("Audio Clip Settings")
        
        col1, col2 = st.columns(2)
        with col1:
            start_time_default = st.number_input(
                "Start Time (seconds)", 
                min_value=0, 
                max_value=3600, 
                value=0,
                help="Choose where in the audio to start the clip (0 = beginning)"
            )
        with col2:
            duration_default = st.slider(
                "Clip Duration (seconds)", 
                5, 60, 15,
                help="How long each clip should be"
            )
    else:
        # For images, no duration needed
        start_time_default = 0
        duration_default = 0
    
    st.divider()
    
    if st.button("Γ£¿ Auto-Generate Suggestions", type="primary"):
        with st.spinner("Generating and processing content..."):
            import random
            import os
            clips = []
            st.session_state.processed_clips = {}  # Reset processed clips
            
            for file in st.session_state.media_files:
                # Use user-specified settings for audio, ignore for images
                if st.session_state.media_type == 'audio':
                    duration = duration_default
                    start_time = start_time_default
                else:
                    duration = 0
                    start_time = 0
                
                # Save uploaded file temporarily
                temp_dir = Path(tempfile.gettempdir()) / "social_studio"
                temp_dir.mkdir(exist_ok=True)
                temp_input = temp_dir / file.name
                
                with open(temp_input, 'wb') as f:
                    f.write(file.getvalue())
                
                # Process the clip based on media type
                output_name = f"processed_{file.name}"
                
                try:
                    if st.session_state.media_type == 'audio':
                        # Clip audio - returns path to output file
                        result_path = st.session_state.processor.clip_audio(
                            Path(temp_input),
                            Path(temp_dir),
                            start_time,
                            duration
                        )
                        if result_path and Path(result_path).exists():
                            with open(result_path, 'rb') as f:
                                st.session_state.processed_clips[file.name] = f.read()
                            output_name = Path(result_path).name
                        else:
                            st.session_state.processed_clips[file.name] = file.getvalue()
                            
                    elif st.session_state.media_type == 'image':
                        # Copy image (processing happens in edit step if needed)
                        st.session_state.processed_clips[file.name] = file.getvalue()
                        
                except Exception as e:
                    logger.warning(f"Processing failed for {file.name}, using original: {e}")
                    st.session_state.processed_clips[file.name] = file.getvalue()
                
                clips.append({
                    'file': file,
                    'duration': duration,
                    'start_time': start_time,
                    'crop_preset': '9:16',
                    'platforms': st.session_state.selected_platforms,
                    'processed_name': output_name
                })
            
            st.session_state.generated_clips = clips
            st.success(f"Γ£ô Generated and processed {len(clips)} clips!")
    
    if st.session_state.generated_clips:
        st.subheader("Generated Content")
        for i, clip in enumerate(st.session_state.generated_clips, 1):
            st.text(f"{i}. {clip['file'].name} ΓåÆ {clip['duration']}s clip")
    
    st.divider()
    
    col1, col2 = st.columns([1, 1])
    with col1:
        if st.button("ΓåÉ Back"):
            st.session_state.step = 1
            st.rerun()
    with col2:
        if st.button("Next: Edit ΓåÆ", type="primary", disabled=len(st.session_state.generated_clips) == 0):
            st.session_state.step = 3
            st.rerun()


def step_edit():
    """Step 3: Manual editing"""
    st.header("Γ£é∩╕Å Step 3: Manual Edit Studio")
    
    if st.session_state.media_type == 'audio':
        st.write("Fine-tune your audio clip timing")
    else:
        st.write("Review your photos (editing tools coming soon)")
    
    if st.session_state.generated_clips:
        clip_names = [f"{i}. {clip['file'].name}" for i, clip in enumerate(st.session_state.generated_clips, 1)]
        selected = st.selectbox("Select content to edit:", clip_names)
        
        if selected:
            idx = int(selected.split(".")[0]) - 1
            clip = st.session_state.generated_clips[idx]
            
            if st.session_state.media_type == 'audio':
                st.subheader("≡ƒÄ╡ Audio Timeline Controls")
                
                # Show current clip info
                st.info(f"≡ƒôä File: {clip['file'].name} | Current: {clip.get('start_time', 0)}s - {clip.get('start_time', 0) + clip.get('duration', 10)}s")
                
                col1, col2 = st.columns(2)
                with col1:
                    start_time = st.number_input(
                        "Start Time (seconds)", 
                        min_value=0, 
                        max_value=3600, 
                        value=clip.get('start_time', 0),
                        help="Select where in the audio to start (can be anywhere in the file)"
                    )
                with col2:
                    duration = st.slider(
                        "Duration (seconds)", 
                        5, 120, 
                        clip.get('duration', 10),
                        help="How long the clip should be"
                    )
                
                # Show what will be captured
                end_time = start_time + duration
                st.caption(f"≡ƒôì Will capture: {start_time}s ΓåÆ {end_time}s ({duration} seconds)")
                
            else:
                # Image editing placeholder
                start_time = 0
                duration = 0
                st.subheader("≡ƒô╕ Photo")
                st.image(clip['file'], use_column_width=True)
                st.info("≡ƒÆí Photo editing tools (crop, brightness, contrast) coming soon!")
            
            if st.session_state.media_type == 'audio':
                if st.button("Γ£ô Apply Changes & Reprocess", type="primary"):
                    # Update clip data
                    clip['start_time'] = start_time
                    clip['duration'] = duration
                    
                    # Reprocess audio clip with new settings
                    with st.spinner("Reprocessing audio clip..."):
                        temp_dir = Path(tempfile.gettempdir()) / "social_studio"
                        temp_dir.mkdir(exist_ok=True)
                        temp_input = temp_dir / clip['file'].name
                        
                        # Save uploaded file
                        with open(temp_input, 'wb') as f:
                            f.write(clip['file'].getvalue())
                        
                        try:
                            result_path = st.session_state.processor.clip_audio(
                                Path(temp_input),
                                Path(temp_dir),
                                start_time,
                                duration
                            )
                            if result_path and Path(result_path).exists():
                                with open(result_path, 'rb') as f:
                                    st.session_state.processed_clips[clip['file'].name] = f.read()
                                clip['processed_name'] = Path(result_path).name
                            
                            # Regenerate hashtags when clip is edited
                            st.session_state.hashtags_generated = False
                            st.success("Γ£à Changes applied! Audio reprocessed and hashtags will regenerate.")
                            
                        except Exception as e:
                            st.error(f"Γ¥î Error reprocessing clip: {e}")
    
    st.divider()
    
    col1, col2 = st.columns([1, 1])
    with col1:
        if st.button("ΓåÉ Back"):
            st.session_state.step = 2
            st.rerun()
    with col2:
        if st.button("Next: Preview ΓåÆ", type="primary"):
            st.session_state.step = 4
            st.rerun()


def step_preview():
    """Step 4: Platform previews"""
    st.header("≡ƒô▒ Step 4: Platform Previews")
    st.write("Review how your content will look on each platform. Edit captions and hashtags.")
    
    # Media Preview Section
    if st.session_state.generated_clips:
        st.subheader("≡ƒÄ¼ Media Preview")
        
        clip_to_preview = st.selectbox(
            "Select clip to preview:",
            [f"{i+1}. {clip['file'].name}" for i, clip in enumerate(st.session_state.generated_clips)]
        )
        
        if clip_to_preview:
            idx = int(clip_to_preview.split(".")[0]) - 1
            clip = st.session_state.generated_clips[idx]
            uploaded_file = clip['file']
            
            # Display media based on type
            if st.session_state.media_type == 'audio':
                st.audio(uploaded_file)
                st.info(f"≡ƒÄ╡ Clip Duration: {clip.get('duration', 10)}s | Start: {clip.get('start_time', 0)}s")
            elif st.session_state.media_type == 'image':
                st.image(uploaded_file, use_container_width=True)
                st.info(f"≡ƒô╕ Image ready for posting")
            
        st.divider()
    
    # Platform Tabs
    tabs = st.tabs([p.title() for p in st.session_state.selected_platforms])
    
    # Auto-generate hashtags for all platforms if not done yet
    if not st.session_state.hashtags_generated:
        with st.spinner("≡ƒÅ╖∩╕Å Generating hashtags..."):
            for platform in st.session_state.selected_platforms:
                if platform not in st.session_state.captions:
                    caption = st.session_state.caption_gen.generate_caption(
                        st.session_state.media_type,
                        platform,
                        use_ai=False
                    )
                    st.session_state.captions[platform] = caption
                
                # Always generate hashtags
                hashtags = st.session_state.caption_gen.generate_hashtags(
                    st.session_state.media_type,
                    platform
                )
                st.session_state.hashtags[platform] = " ".join([f"#{tag}" for tag in hashtags[:10]])
        
        st.session_state.hashtags_generated = True
        st.success("Γ£à Hashtags generated for all platforms!")
    
    for tab, platform in zip(tabs, st.session_state.selected_platforms):
        with tab:
            st.subheader(f"≡ƒô▒ {platform.title()}")
            
            # Editable caption
            caption_value = st.text_area(
                "Caption:",
                value=st.session_state.captions.get(platform, ""),
                key=f"caption_{platform}",
                height=100
            )
            st.session_state.captions[platform] = caption_value
            
            # Editable hashtags (auto-generated but editable)
            current_hashtags = st.session_state.hashtags.get(platform, "")
            hashtag_value = st.text_area(
                "Hashtags (auto-generated, editable):",
                value=current_hashtags,
                key=f"hashtags_{platform}",
                height=80,
                help="Edit or add hashtags. Each hashtag should start with #"
            )
            st.session_state.hashtags[platform] = hashtag_value
            
            # Show count
            if hashtag_value:
                hashtag_count = len([h for h in hashtag_value.split() if h.startswith('#')])
                st.caption(f"≡ƒÅ╖∩╕Å {hashtag_count} hashtags")
            
            col1, col2 = st.columns(2)
            with col1:
                if st.button("≡ƒöä Regenerate Hashtags", key=f"regen_{platform}"):
                    hashtags = st.session_state.caption_gen.generate_hashtags(
                        st.session_state.media_type, platform
                    )
                    st.session_state.hashtags[platform] = " ".join([f"#{tag}" for tag in hashtags[:10]])
                    st.rerun()
            with col2:
                if st.button("Γ£ô Approve", key=f"approve_{platform}", type="primary"):
                    st.success("Approved!")
    
    st.divider()
    
    col1, col2 = st.columns([1, 1])
    with col1:
        if st.button("ΓåÉ Back"):
            st.session_state.step = 3
            st.rerun()
    with col2:
        if st.button("Next: Export ΓåÆ", type="primary"):
            st.session_state.step = 5
            st.rerun()


def step_export():
    """Step 5: Export content"""
    st.header("≡ƒÜÇ Step 5: Export Content")
    st.write("Download your content and export scheduler-compatible CSV files")
    
    # Export Options
    st.subheader("≡ƒôª Export Options")
    
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**≡ƒÆ╛ Download Media Files**")
        st.caption("Save your audio clips and photos to your computer")
        download_media = st.checkbox("Enable Media Downloads", value=True)
    with col2:
        st.markdown("**≡ƒôà Scheduler Import File**")
        st.caption("Generate CSV with captions & hashtags for Buffer/Publer")
        scheduler_type = st.selectbox(
            "Scheduler Type:",
            ["Buffer", "Publer", "Later", "Meta Business Suite", "Generic CSV"]
        )
    
    st.divider()
    
    # Direct Download Section
    if download_media:
        st.subheader("≡ƒÆ╛ Download Your Media Files")
        st.caption("Click to save each audio clip or photo to your computer")
        
        if st.session_state.generated_clips and st.session_state.processed_clips:
            for i, clip in enumerate(st.session_state.generated_clips, 1):
                col1, col2 = st.columns([3, 1])
                
                with col1:
                    processed_name = clip.get('processed_name', clip['file'].name)
                    st.text(f"{i}. {processed_name} ({clip['duration']}s clip)")
                
                with col2:
                    # Get processed clip bytes
                    original_name = clip['file'].name
                    file_bytes = st.session_state.processed_clips.get(original_name, clip['file'].getvalue())
                    
                    # Determine mime type
                    if st.session_state.media_type == 'audio':
                        mime_type = 'audio/mpeg'
                    else:
                        mime_type = clip['file'].type
                    
                    st.download_button(
                        label="Γ¼ç∩╕Å Download",
                        data=file_bytes,
                        file_name=clip.get('processed_name', clip['file'].name),
                        mime=mime_type,
                        key=f"download_{i}"
                    )
        else:
            st.warning("No processed clips available for download. Generate clips first!")
    
    st.divider()
    
    # Scheduler Export Section
    st.subheader("≡ƒôà Generate Scheduler Import File")
    st.caption("CSV file includes captions, hashtags, and filenames - import this into your scheduler")
    
    if st.button("≡ƒÜÇ Generate Scheduler Export", type="primary"):
        with st.spinner("Creating scheduler files..."):
            # Prepare posts data with all required fields
            posts = []
            for clip in st.session_state.generated_clips:
                for platform in st.session_state.selected_platforms:
                    caption = st.session_state.captions.get(platform, '')
                    hashtags = st.session_state.hashtags.get(platform, '')
                    
                    # Get processed filename
                    processed_name = clip.get('processed_name', clip['file'].name)
                    
                    # Combine caption and hashtags for full_text
                    full_text = f"{caption}\n\n{hashtags}" if hashtags else caption
                    
                    post_data = {
                        'platform': platform,
                        'caption': caption,
                        'hashtags': hashtags,
                        'hashtags_formatted': hashtags,
                        'full_text': full_text,
                        'media_file': processed_name,
                        'file_path': processed_name,
                        'media_file_path': processed_name,
                        'content_type': st.session_state.media_type,
                        'original_filename': clip['file'].name,
                        'duration': clip.get('duration', 10),
                        'media_type': st.session_state.media_type,
                        'suggested_date': datetime.now().strftime('%Y-%m-%d'),
                        'suggested_time': '09:00'  # Default time
                    }
                    posts.append(post_data)
            
            # Export to CSV
            scheduler_map = {
                'Buffer': 'buffer',
                'Publer': 'publer',
                'Later': 'later',
                'Meta Business Suite': 'meta',
                'Generic CSV': 'generic'
            }
            
            scheduler_key = scheduler_map[scheduler_type]
            export_files = st.session_state.export_mgr.export_posts(posts, scheduler_key)
            
            st.success("Γ£à Export Complete!")
            st.write(f"**Total Posts:** {len(posts)}")
            st.write(f"**Platforms:** {', '.join(st.session_state.selected_platforms)}")
            
            # Provide download links for CSV/JSON files
            if export_files:
                st.markdown("**≡ƒôä Download Export Files:**")
                for file_type, file_path in export_files.items():
                    if Path(file_path).exists():
                        with open(file_path, 'rb') as f:
                            st.download_button(
                                label=f"Γ¼ç∩╕Å Download {file_type.upper()}",
                                data=f.read(),
                                file_name=Path(file_path).name,
                                mime='text/csv' if file_type == 'csv' else 'application/json',
                                key=f"export_{file_type}"
                            )
            
            st.info(f"≡ƒÆí **Next Steps:**\n1. Γ¼ç∩╕Å Download your audio clips/photos above (if not done yet)\n2. Γ¼ç∩╕Å Download the {scheduler_type} CSV file\n3. ≡ƒôñ Import CSV into {scheduler_type}\n4. ≡ƒôñ Upload your audio clips/photos to {scheduler_type}\n5. ≡ƒôà Schedule your posts!")
    
    st.divider()
    
    col1, col2 = st.columns([1, 1])
    with col1:
        if st.button("ΓåÉ Back"):
            st.session_state.step = 4
            st.rerun()
    with col2:
        if st.button("≡ƒöä Start New Project", type="primary"):
            # Reset session state
            for key in list(st.session_state.keys()):
                del st.session_state[key]
            st.rerun()


def main():
    """Main application"""
    st.set_page_config(
        page_title="Social Studio",
        page_icon="≡ƒÄ¼",
        layout="wide",
        initial_sidebar_state="collapsed"
    )
    
    # Custom CSS
    st.markdown("""
        <style>
        .stButton>button {
            width: 100%;
        }
        </style>
    """, unsafe_allow_html=True)
    
    # Initialize components
    init_components()
    
    # Header
    show_header()
    
    # Step indicator
    show_step_indicator()
    
    st.divider()
    
    # Show current step
    steps = {
        1: step_import,
        2: step_generate,
        3: step_edit,
        4: step_preview,
        5: step_export
    }
    
    steps[st.session_state.step]()
    
    # Footer
    st.divider()
    st.markdown("""
        <div style='text-align: center; color: #7f8c8d; padding: 20px;'>
            <p>Offline-first ΓÇó No auto-posting ΓÇó Scheduler-ready exports</p>
        </div>
    """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
