"""
Content Processor
Handles image, video, and audio processing for social media content
"""

import os
import logging
import random
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import subprocess
import json

logger = logging.getLogger(__name__)


class ContentProcessor:
    """Processes images, videos, and audio for social media platforms"""
    
    def __init__(self, config_manager):
        """
        Initialize the content processor
        
        Args:
            config_manager: ConfigManager instance
        """
        self.config = config_manager
        self.project_root = Path(__file__).parent.parent
        self.input_dir = self.project_root / "input"
        self.output_dir = self.project_root / "output"
        
    def check_ffmpeg(self) -> bool:
        """Check if FFmpeg is available"""
        try:
            subprocess.run(['ffmpeg', '-version'], 
                         capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("FFmpeg not found. Audio/video processing will be limited.")
            return False
    
    def process_audio(self, audio_path: Path, output_dir: Path, 
                     duration: Optional[int] = None) -> Optional[Path]:
        """
        Process audio file (clip to specified duration)
        
        Args:
            audio_path: Path to input audio file
            output_dir: Directory to save processed audio
            duration: Duration in seconds (None = use config)
            
        Returns:
            Path to processed audio file or None if failed
        """
        if not self.check_ffmpeg():
            logger.error("FFmpeg is required for audio processing")
            return None
        
        try:
            # Get duration from config if not provided
            if duration is None:
                audio_config = self.config.get_processing_config('audio')
                min_dur = audio_config.get('clip_duration_min', 10)
                max_dur = audio_config.get('clip_duration_max', 15)
                duration = random.randint(min_dur, max_dur)
            
            # Get audio format
            audio_format = self.config.get('processing.audio.format', 'mp3')
            
            # Create output filename
            output_filename = f"{audio_path.stem}_clip.{audio_format}"
            output_path = output_dir / output_filename
            
            # Ensure output directory exists
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # FFmpeg command to clip audio
            cmd = [
                'ffmpeg', '-y',  # Overwrite output file
                '-i', str(audio_path),
                '-t', str(duration),  # Duration
                '-acodec', 'libmp3lame' if audio_format == 'mp3' else 'copy',
                '-b:a', '192k',  # Bitrate
                str(output_path)
            ]
            
            logger.info(f"Clipping audio: {audio_path.name} to {duration}s")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"FFmpeg error: {result.stderr}")
                return None
            
            logger.info(f"Audio processed: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error processing audio {audio_path}: {e}")
            return None
    
    def create_video_from_audio(self, audio_path: Path, output_dir: Path, 
                                platform: str = 'instagram',
                                background_image: Optional[Path] = None) -> Optional[Path]:
        """
        Create a video with audio and static/animated background
        
        Args:
            audio_path: Path to audio file
            output_dir: Directory to save video
            platform: Target platform for dimensions
            background_image: Optional background image
            
        Returns:
            Path to created video or None if failed
        """
        if not self.check_ffmpeg():
            logger.error("FFmpeg is required for video creation")
            return None
        
        try:
            # Get platform dimensions
            platform_config = self.config.get_platform_config(platform)
            width = platform_config.get('video_dimensions', {}).get('width', 1080)
            height = platform_config.get('video_dimensions', {}).get('height', 1920)
            
            # Get video settings
            video_config = self.config.get_processing_config('video')
            fps = video_config.get('fps', 30)
            video_codec = video_config.get('video_codec', 'libx264')
            audio_codec = video_config.get('audio_codec', 'aac')
            
            # Create output filename
            output_filename = f"{audio_path.stem}_{platform}_video.mp4"
            output_path = output_dir / output_filename
            
            # Ensure output directory exists
            output_dir.mkdir(parents=True, exist_ok=True)
            
            if background_image and background_image.exists():
                # Create video from image + audio
                cmd = [
                    'ffmpeg', '-y',
                    '-loop', '1',
                    '-i', str(background_image),
                    '-i', str(audio_path),
                    '-c:v', video_codec,
                    '-c:a', audio_codec,
                    '-b:a', '192k',
                    '-vf', f'scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height}',
                    '-shortest',
                    '-r', str(fps),
                    '-pix_fmt', 'yuv420p',
                    str(output_path)
                ]
            else:
                # Create video with solid color background
                cmd = [
                    'ffmpeg', '-y',
                    '-f', 'lavfi',
                    '-i', f'color=c=black:s={width}x{height}:r={fps}',
                    '-i', str(audio_path),
                    '-c:v', video_codec,
                    '-c:a', audio_codec,
                    '-b:a', '192k',
                    '-shortest',
                    '-pix_fmt', 'yuv420p',
                    str(output_path)
                ]
            
            logger.info(f"Creating video for {platform}: {audio_path.name}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"FFmpeg error: {result.stderr}")
                return None
            
            logger.info(f"Video created: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error creating video from audio {audio_path}: {e}")
            return None
    
    def process_video(self, video_path: Path, output_dir: Path, 
                     platform: str = 'instagram') -> Optional[Path]:
        """
        Process video file (resize, clip, format conversion)
        
        Args:
            video_path: Path to input video
            output_dir: Directory to save processed video
            platform: Target platform
            
        Returns:
            Path to processed video or None if failed
        """
        if not self.check_ffmpeg():
            logger.error("FFmpeg is required for video processing")
            return None
        
        try:
            # Get platform dimensions
            platform_config = self.config.get_platform_config(platform)
            width = platform_config.get('video_dimensions', {}).get('width', 1080)
            height = platform_config.get('video_dimensions', {}).get('height', 1920)
            
            # Get video settings
            video_config = self.config.get_processing_config('video')
            fps = video_config.get('fps', 30)
            video_codec = video_config.get('video_codec', 'libx264')
            audio_codec = video_config.get('audio_codec', 'aac')
            
            # Create output filename
            output_filename = f"{video_path.stem}_{platform}.mp4"
            output_path = output_dir / output_filename
            
            # Ensure output directory exists
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # FFmpeg command to process video
            cmd = [
                'ffmpeg', '-y',
                '-i', str(video_path),
                '-c:v', video_codec,
                '-c:a', audio_codec,
                '-b:a', '192k',
                '-vf', f'scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height}',
                '-r', str(fps),
                '-pix_fmt', 'yuv420p',
                str(output_path)
            ]
            
            logger.info(f"Processing video for {platform}: {video_path.name}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"FFmpeg error: {result.stderr}")
                return None
            
            logger.info(f"Video processed: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error processing video {video_path}: {e}")
            return None
    
    def process_image(self, image_path: Path, output_dir: Path, 
                     platform: str = 'instagram',
                     add_text: Optional[str] = None) -> Optional[Path]:
        """
        Process image (resize, add watermark, add text overlay)
        
        Args:
            image_path: Path to input image
            output_dir: Directory to save processed image
            platform: Target platform
            add_text: Optional text to overlay
            
        Returns:
            Path to processed image or None if failed
        """
        try:
            # Get platform dimensions
            platform_config = self.config.get_platform_config(platform)
            dimensions = platform_config.get('image_dimensions', {'width': 1080, 'height': 1080})
            target_width = dimensions.get('width', 1080)
            target_height = dimensions.get('height', 1080)
            
            # Get image settings
            image_config = self.config.get_processing_config('image')
            img_format = image_config.get('format', 'jpg').upper()
            if img_format == 'JPG':
                img_format = 'JPEG'
            quality = image_config.get('quality', 90)
            
            # Create output filename
            output_filename = f"{image_path.stem}_{platform}.jpg"
            output_path = output_dir / output_filename
            
            # Ensure output directory exists
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Open and process image
            with Image.open(image_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Resize image (cover fit - crop to exact dimensions)
                img_ratio = img.width / img.height
                target_ratio = target_width / target_height
                
                if img_ratio > target_ratio:
                    # Image is wider, scale by height
                    new_height = target_height
                    new_width = int(new_height * img_ratio)
                else:
                    # Image is taller, scale by width
                    new_width = target_width
                    new_height = int(new_width / img_ratio)
                
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Crop to target dimensions (center crop)
                left = (new_width - target_width) // 2
                top = (new_height - target_height) // 2
                right = left + target_width
                bottom = top + target_height
                img = img.crop((left, top, right, bottom))
                
                # Add text overlay if provided
                if add_text:
                    img = self._add_text_overlay(img, add_text)
                
                # Add watermark if enabled
                watermark_config = self.config.get_watermark_config()
                if watermark_config.get('enabled', False):
                    logo_path = self.config.get('brand.logo_path')
                    if logo_path and Path(logo_path).exists():
                        img = self._add_watermark(img, Path(logo_path), watermark_config)
                
                # Save image
                img.save(output_path, img_format, quality=quality, optimize=True)
            
            logger.info(f"Image processed for {platform}: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error processing image {image_path}: {e}")
            return None
    
    def clip_video(self, video_path: Path, output_dir: Path, 
                   start_time: float, duration: float,
                   platform: str = 'instagram',
                   crop_preset: str = '9:16',
                   text_overlay: Optional[str] = None,
                   text_color: str = '#FFFFFF') -> Optional[Path]:
        """
        Clip video with start/end times, crop, and optional text overlay
        
        Args:
            video_path: Path to input video
            output_dir: Directory to save clipped video
            start_time: Start time in seconds
            duration: Duration in seconds
            platform: Target platform
            crop_preset: Crop ratio (9:16, 1:1, 4:5, 16:9)
            text_overlay: Optional text to overlay
            text_color: Text color in hex format
            
        Returns:
            Path to clipped video or None if failed
        """
        if not self.check_ffmpeg():
            logger.error("FFmpeg is required for video clipping")
            return None
        
        try:
            # Get platform dimensions based on crop preset
            dimensions_map = {
                '9:16': {'width': 1080, 'height': 1920},
                '1:1': {'width': 1080, 'height': 1080},
                '4:5': {'width': 1080, 'height': 1350},
                '16:9': {'width': 1920, 'height': 1080}
            }
            
            dims = dimensions_map.get(crop_preset, {'width': 1080, 'height': 1920})
            width = dims['width']
            height = dims['height']
            
            # Create output filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"{video_path.stem}_{platform}_{timestamp}.mp4"
            output_path = output_dir / output_filename
            
            # Ensure output directory exists
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Build FFmpeg filter chain
            vf_filters = [
                f'scale={width}:{height}:force_original_aspect_ratio=increase',
                f'crop={width}:{height}'
            ]
            
            # Add text overlay if specified
            if text_overlay:
                # Escape special characters for FFmpeg
                escaped_text = text_overlay.replace("'", "'\\\\\\''").replace(":", "\\:")
                vf_filters.append(
                    f"drawtext=text='{escaped_text}':"
                    f"fontsize=48:fontcolor={text_color}:x=(w-text_w)/2:y=(h-text_h)*0.8"
                )
            
            # FFmpeg command to clip and process video
            cmd = [
                'ffmpeg', '-y',
                '-ss', str(start_time),
                '-i', str(video_path),
                '-t', str(duration),
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-b:a', '192k',
                '-vf', ','.join(vf_filters),
                '-r', '30',
                '-pix_fmt', 'yuv420p',
                '-preset', 'medium',
                str(output_path)
            ]
            
            logger.info(f"Clipping video: {video_path.name} ({start_time}s, {duration}s, {crop_preset})")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"FFmpeg error: {result.stderr}")
                return None
            
            logger.info(f"Video clipped: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error clipping video {video_path}: {e}")
            return None
    
    def clip_audio(self, audio_path: Path, output_dir: Path,
                   start_time: float, duration: float,
                   platform: str = 'instagram') -> Optional[Path]:
        """
        Clip audio with start/end times
        
        Args:
            audio_path: Path to input audio
            output_dir: Directory to save clipped audio
            start_time: Start time in seconds
            duration: Duration in seconds
            platform: Target platform
            
        Returns:
            Path to clipped audio or None if failed
        """
        if not self.check_ffmpeg():
            logger.error("FFmpeg is required for audio clipping")
            return None
        
        try:
            # Create output filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"{audio_path.stem}_{platform}_{timestamp}.mp3"
            output_path = output_dir / output_filename
            
            # Ensure output directory exists
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # FFmpeg command to clip audio
            cmd = [
                'ffmpeg', '-y',
                '-ss', str(start_time),
                '-i', str(audio_path),
                '-t', str(duration),
                '-acodec', 'libmp3lame',
                '-b:a', '192k',
                str(output_path)
            ]
            
            logger.info(f"Clipping audio: {audio_path.name} ({start_time}s, {duration}s)")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"FFmpeg error: {result.stderr}")
                return None
            
            logger.info(f"Audio clipped: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error clipping audio {audio_path}: {e}")
            return None
    
    def _add_text_overlay(self, img: Image.Image, text: str) -> Image.Image:
        """Add text overlay to image"""
        try:
            draw = ImageDraw.Draw(img)
            
            # Try to use a nice font, fall back to default if not available
            try:
                font_size = int(img.height * 0.08)  # 8% of image height
                font = ImageFont.truetype("arial.ttf", font_size)
            except:
                font = ImageFont.load_default()
            
            # Get text bounding box
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            # Position text at bottom center
            x = (img.width - text_width) // 2
            y = img.height - text_height - int(img.height * 0.05)
            
            # Draw semi-transparent background for text
            padding = 20
            draw.rectangle(
                [x - padding, y - padding, x + text_width + padding, y + text_height + padding],
                fill=(0, 0, 0, 180)
            )
            
            # Draw text
            draw.text((x, y), text, fill=(255, 255, 255), font=font)
            
            return img
        except Exception as e:
            logger.warning(f"Could not add text overlay: {e}")
            return img
    
    def _add_watermark(self, img: Image.Image, logo_path: Path, 
                      watermark_config: Dict) -> Image.Image:
        """Add watermark/logo to image"""
        try:
            with Image.open(logo_path) as logo:
                # Resize logo to appropriate size (10% of image width)
                logo_width = int(img.width * 0.1)
                logo_ratio = logo.height / logo.width
                logo_height = int(logo_width * logo_ratio)
                logo = logo.resize((logo_width, logo_height), Image.Resampling.LANCZOS)
                
                # Adjust opacity
                if logo.mode != 'RGBA':
                    logo = logo.convert('RGBA')
                
                opacity = watermark_config.get('opacity', 0.7)
                alpha = logo.split()[3]
                alpha = ImageEnhance.Brightness(alpha).enhance(opacity)
                logo.putalpha(alpha)
                
                # Position logo
                position = watermark_config.get('position', 'bottom_right')
                padding = 20
                
                if position == 'top_left':
                    x, y = padding, padding
                elif position == 'top_right':
                    x, y = img.width - logo_width - padding, padding
                elif position == 'bottom_left':
                    x, y = padding, img.height - logo_height - padding
                elif position == 'bottom_right':
                    x, y = img.width - logo_width - padding, img.height - logo_height - padding
                else:  # center
                    x = (img.width - logo_width) // 2
                    y = (img.height - logo_height) // 2
                
                # Paste logo
                if img.mode != 'RGBA':
                    img = img.convert('RGBA')
                img.paste(logo, (x, y), logo)
                img = img.convert('RGB')
            
            return img
        except Exception as e:
            logger.warning(f"Could not add watermark: {e}")
            return img
    
    def get_input_files(self, content_type: str) -> List[Path]:
        """
        Get list of input files for a content type
        
        Args:
            content_type: 'music', 'images', or 'videos'
            
        Returns:
            List of file paths
        """
        input_subdir = self.input_dir / content_type
        
        if not input_subdir.exists():
            logger.warning(f"Input directory not found: {input_subdir}")
            return []
        
        # Define supported extensions
        extensions = {
            'music': ['.mp3', '.wav', '.m4a', '.flac', '.aac'],
            'images': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
            'videos': ['.mp4', '.mov', '.avi', '.mkv', '.webm']
        }
        
        supported_ext = extensions.get(content_type, [])
        
        # Find all supported files
        files = []
        for ext in supported_ext:
            files.extend(input_subdir.glob(f'*{ext}'))
            files.extend(input_subdir.glob(f'*{ext.upper()}'))
        
        return sorted(files)
