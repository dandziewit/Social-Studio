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

# Page config must be first
st.set_page_config(page_title="Social Studio", layout="wide")

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
        config_file = Path(__file__).parent / 'social_studio' / 'config' / 'config.yaml'
        st.session_state.config = ConfigManager(str(config_file))
        st.session_state.processor = ContentProcessor(st.session_state.config)
        st.session_state.caption_gen = CaptionGenerator(st.session_state.config)
        st.session_state.export_mgr = ExportManager(st.session_state.config)


def show_header():
    """Display header"""
    st.markdown("""
        <div style='background-color: #2c3e50; padding: 20px; border-radius: 10px; margin-bottom: 20px;'>
            <h1 style='color: white; margin: 0;'>🎬 Social Studio</h1>
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
                st.success(f"✓ {step_name}")
            elif i == current:
                st.info(f"▶ {step_name}")
            else:
                st.text(f"  {step_name}")


# Main app entry point
if __name__ == "__main__":
    init_components()
    show_header()
    show_step_indicator()
    
    # Show appropriate step
    if st.session_state.step == 1:
        st.header("📁 Step 1: Import Media")
        st.info("Upload audio or image files to begin creating social media content")
    elif st.session_state.step == 2:
        st.header("✨ Step 2: Auto-Generate")
        st.info("AI suggestions coming soon")
    else:
        st.header("🚀 Social Studio")
        st.success("Full app functionality will be available soon!")
