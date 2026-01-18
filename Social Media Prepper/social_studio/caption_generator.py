"""
Caption Generator
Generates captions and hashtags for social media posts
Includes OpenAI integration with fallback to template-based generation
"""

import os
import random
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)


class CaptionGenerator:
    """Generates captions and hashtags for social media content"""
    
    def __init__(self, config_manager):
        """
        Initialize the caption generator
        
        Args:
            config_manager: ConfigManager instance
        """
        self.config = config_manager
        self.hashtag_rotation_counter = {}  # Track which hashtag set to use next
        self._openai_client = None
        
        # Try to initialize OpenAI if enabled
        if self.config.is_openai_enabled():
            self._init_openai()
    
    def _init_openai(self):
        """Initialize OpenAI client if available"""
        try:
            import openai
            openai_config = self.config.get_openai_config()
            api_key = openai_config.get('api_key')
            
            if api_key:
                self._openai_client = openai.OpenAI(api_key=api_key)
                logger.info("OpenAI client initialized successfully")
            else:
                logger.warning("OpenAI API key not found")
        except ImportError:
            logger.warning("OpenAI package not installed. Using template-based captions.")
        except Exception as e:
            logger.warning(f"Failed to initialize OpenAI: {e}")
    
    def generate_caption(self, content_type: str, platform: str, 
                        filename: str = "", use_ai: bool = True) -> str:
        """
        Generate a caption for social media post
        
        Args:
            content_type: Type of content ('music', 'image', 'video')
            platform: Target platform
            filename: Original filename for context
            use_ai: Whether to try AI generation first
            
        Returns:
            Generated caption
        """
        # Try AI generation if enabled and requested
        if use_ai and self._openai_client:
            ai_caption = self._generate_ai_caption(content_type, platform, filename)
            if ai_caption:
                return self._trim_caption_for_platform(ai_caption, platform)
        
        # Fall back to template-based generation
        return self._generate_template_caption(content_type, platform, filename)
    
    def _generate_ai_caption(self, content_type: str, platform: str, 
                            filename: str = "") -> Optional[str]:
        """Generate caption using OpenAI"""
        try:
            openai_config = self.config.get_openai_config()
            brand_name = self.config.get_brand_name()
            artist_name = self.config.get_artist_name()
            
            # Create prompt
            prompt = self._create_ai_prompt(content_type, platform, brand_name, 
                                           artist_name, filename)
            
            # Call OpenAI API
            response = self._openai_client.chat.completions.create(
                model=openai_config.get('model', 'gpt-3.5-turbo'),
                messages=[
                    {"role": "system", "content": "You are a social media content creator specializing in engaging captions."},
                    {"role": "user", "content": prompt}
                ],
                temperature=openai_config.get('temperature', 0.7),
                max_tokens=openai_config.get('max_tokens', 150)
            )
            
            caption = response.choices[0].message.content.strip()
            logger.info(f"AI caption generated for {content_type}")
            return caption
            
        except Exception as e:
            logger.warning(f"AI caption generation failed: {e}")
            return None
    
    def _create_ai_prompt(self, content_type: str, platform: str, 
                         brand_name: str, artist_name: str, filename: str) -> str:
        """Create prompt for AI caption generation"""
        platform_info = {
            'instagram': 'Instagram (casual, engaging, use emojis)',
            'tiktok': 'TikTok (trendy, energetic, youth-focused)',
            'facebook': 'Facebook (informative, community-focused)',
            'twitter': 'Twitter (concise, witty, under 280 characters)'
        }
        
        platform_desc = platform_info.get(platform, platform)
        
        prompt = f"""Create an engaging social media caption for {platform_desc}.

Brand: {brand_name}
Artist: {artist_name}
Content Type: {content_type}
Filename: {filename}

Requirements:
- Engaging and authentic
- Include 2-3 relevant emojis
- Brand-appropriate tone
- Do NOT include hashtags (they will be added separately)
- Keep it concise and impactful
"""
        
        if platform == 'twitter':
            prompt += "\n- Must be under 200 characters (hashtags added separately)"
        
        return prompt
    
    def _generate_template_caption(self, content_type: str, platform: str, 
                                   filename: str = "") -> str:
        """Generate caption using templates from config"""
        templates = self.config.get_caption_templates(content_type)
        
        if not templates:
            # Default template if none configured
            brand_name = self.config.get_brand_name()
            return f"Check out this {content_type} from {brand_name}! ≡ƒöÑ"
        
        # Select random template
        template = random.choice(templates)
        
        # Replace placeholders
        brand_name = self.config.get_brand_name()
        artist_name = self.config.get_artist_name()
        
        # Generate emotion/vibe words
        emotions = ['fresh', 'fire', 'vibing', 'amazing', 'stunning', 'incredible', 
                   'epic', 'powerful', 'smooth', 'energetic', 'creative', 'inspiring']
        emotion = random.choice(emotions)
        
        caption = template.replace('{brand}', brand_name)
        caption = caption.replace('{artist}', artist_name)
        caption = caption.replace('{content_type}', content_type)
        caption = caption.replace('{emotion}', emotion)
        
        return self._trim_caption_for_platform(caption, platform)
    
    def _trim_caption_for_platform(self, caption: str, platform: str) -> str:
        """Trim caption to platform's character limit"""
        platform_config = self.config.get_platform_config(platform)
        max_length = platform_config.get('max_caption_length', 2200)
        
        if len(caption) > max_length:
            # Trim and add ellipsis
            caption = caption[:max_length-3] + '...'
        
        return caption
    
    def generate_hashtags(self, content_type: str, platform: str, 
                         count: Optional[int] = None) -> List[str]:
        """
        Generate hashtags for a post
        
        Args:
            content_type: Type of content ('music', 'image', 'video')
            platform: Target platform
            count: Number of hashtags (None = use platform max)
            
        Returns:
            List of hashtags (without # prefix)
        """
        # Get platform's max hashtags
        platform_config = self.config.get_platform_config(platform)
        max_hashtags = platform_config.get('max_hashtags', 30)
        
        if count is None:
            # Use a reasonable number (not always max)
            count = min(random.randint(10, 20), max_hashtags)
        else:
            count = min(count, max_hashtags)
        
        # Get hashtag sets for this content type
        hashtag_sets = self.config.get_hashtag_sets(content_type)
        
        if not hashtag_sets:
            logger.warning(f"No hashtag sets configured for {content_type}")
            return []
        
        # Get next set to use (rotation to avoid repetition)
        rotation_key = f"{content_type}_{platform}"
        current_index = self.hashtag_rotation_counter.get(rotation_key, 0)
        set_keys = sorted(hashtag_sets.keys())
        
        if not set_keys:
            return []
        
        # Get the hashtag set
        set_key = set_keys[current_index % len(set_keys)]
        hashtags = hashtag_sets[set_key].copy()
        
        # Update rotation counter
        self.hashtag_rotation_counter[rotation_key] = current_index + 1
        
        # If we need more hashtags, add from other sets
        if len(hashtags) < count:
            for other_key in set_keys:
                if other_key != set_key:
                    hashtags.extend(hashtag_sets[other_key])
        
        # Shuffle and select
        random.shuffle(hashtags)
        selected_hashtags = hashtags[:count]
        
        logger.info(f"Generated {len(selected_hashtags)} hashtags for {content_type}/{platform}")
        return selected_hashtags
    
    def format_hashtags(self, hashtags: List[str]) -> str:
        """
        Format hashtags for posting
        
        Args:
            hashtags: List of hashtag strings
            
        Returns:
            Formatted hashtag string with # prefix
        """
        return ' '.join([f"#{tag}" for tag in hashtags])
    
    def generate_full_post_text(self, caption: str, hashtags: List[str], 
                               platform: str = 'instagram') -> str:
        """
        Generate complete post text (caption + hashtags)
        
        Args:
            caption: The caption text
            hashtags: List of hashtags
            platform: Target platform
            
        Returns:
            Full post text
        """
        # Format hashtags
        hashtag_text = self.format_hashtags(hashtags)
        
        # Combine caption and hashtags
        # For most platforms, add hashtags after caption with line breaks
        if platform == 'twitter':
            # Twitter: hashtags on same line if space permits
            full_text = f"{caption} {hashtag_text}"
        else:
            # Other platforms: caption, line breaks, then hashtags
            full_text = f"{caption}\n\n{hashtag_text}"
        
        # Trim if necessary
        full_text = self._trim_caption_for_platform(full_text, platform)
        
        return full_text
    
    def get_suggested_post_time(self, date: datetime = None) -> Tuple[str, str]:
        """
        Get suggested post time based on config
        
        Args:
            date: Date to get time for (None = today)
            
        Returns:
            Tuple of (date_string, time_string)
        """
        if date is None:
            date = datetime.now()
        
        # Get day of week
        day_name = date.strftime('%A').lower()
        
        # Get preferred times for this day
        times = self.config.get_preferred_post_times(day_name)
        
        if not times:
            times = ['09:00', '13:00', '18:00']  # Default times
        
        # Select random time
        time_str = random.choice(times)
        
        # Format date
        date_str = date.strftime('%Y-%m-%d')
        
        return date_str, time_str
    
    def create_post_metadata(self, content_type: str, platform: str, 
                            filename: str, media_path: str,
                            use_ai: bool = True) -> Dict:
        """
        Create complete post metadata
        
        Args:
            content_type: Type of content
            platform: Target platform
            filename: Original filename
            media_path: Path to processed media file
            use_ai: Whether to use AI for caption generation
            
        Returns:
            Dictionary with post metadata
        """
        # Generate caption
        caption = self.generate_caption(content_type, platform, filename, use_ai)
        
        # Generate hashtags
        hashtags = self.generate_hashtags(content_type, platform)
        
        # Get suggested post time
        date_str, time_str = self.get_suggested_post_time()
        
        # Create metadata
        metadata = {
            'platform': platform,
            'content_type': content_type,
            'caption': caption,
            'hashtags': hashtags,
            'hashtags_formatted': self.format_hashtags(hashtags),
            'full_text': self.generate_full_post_text(caption, hashtags, platform),
            'suggested_date': date_str,
            'suggested_time': time_str,
            'media_file': media_path,
            'original_filename': filename,
            'created_at': datetime.now().isoformat()
        }
        
        return metadata
