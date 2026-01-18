"""
Configuration Manager
Handles loading and validating the config.yaml file
"""

import os
import yaml
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class ConfigManager:
    """Manages application configuration from config.yaml"""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the configuration manager
        
        Args:
            config_path: Optional custom path to config file
        """
        if config_path is None:
            # Default to config/config.yaml in project root
            project_root = Path(__file__).parent.parent
            config_path = project_root / "config" / "config.yaml"
        
        self.config_path = Path(config_path)
        self.config = self._load_config()
        self._validate_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file"""
        try:
            if not self.config_path.exists():
                raise FileNotFoundError(
                    f"Configuration file not found at {self.config_path}"
                )
            
            with open(self.config_path, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
            
            logger.info(f"Configuration loaded from {self.config_path}")
            return config
            
        except yaml.YAMLError as e:
            logger.error(f"Error parsing YAML configuration: {e}")
            raise
        except Exception as e:
            logger.error(f"Error loading configuration: {e}")
            raise
    
    def _validate_config(self):
        """Validate required configuration fields"""
        required_fields = ['brand', 'default_platforms', 'platforms', 
                          'caption_templates', 'hashtag_sets', 
                          'preferred_post_times', 'processing']
        
        for field in required_fields:
            if field not in self.config:
                raise ValueError(f"Missing required configuration field: {field}")
        
        logger.info("Configuration validated successfully")
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get a configuration value
        
        Args:
            key: Dot-notation key (e.g., 'brand.name')
            default: Default value if key not found
            
        Returns:
            Configuration value
        """
        keys = key.split('.')
        value = self.config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    def get_brand_name(self) -> str:
        """Get the brand name"""
        return self.get('brand.name', 'Brand')
    
    def get_artist_name(self) -> str:
        """Get the artist name"""
        return self.get('brand.artist_name', self.get_brand_name())
    
    def get_default_platforms(self) -> List[str]:
        """Get the list of default platforms"""
        return self.get('default_platforms', ['instagram', 'tiktok'])
    
    def get_platform_config(self, platform: str) -> Dict[str, Any]:
        """Get configuration for a specific platform"""
        return self.get(f'platforms.{platform}', {})
    
    def get_caption_templates(self, content_type: str) -> List[str]:
        """Get caption templates for a content type"""
        return self.get(f'caption_templates.{content_type}', [])
    
    def get_hashtag_sets(self, content_type: str) -> Dict[str, List[str]]:
        """Get hashtag sets for a content type"""
        return self.get(f'hashtag_sets.{content_type}', {})
    
    def get_preferred_post_times(self, day: str = None) -> List[str]:
        """Get preferred post times for a specific day or all days"""
        if day:
            return self.get(f'preferred_post_times.{day.lower()}', ['09:00', '13:00', '18:00'])
        return self.get('preferred_post_times', {})
    
    def get_openai_config(self) -> Dict[str, Any]:
        """Get OpenAI configuration"""
        openai_config = self.get('openai', {})
        
        # Check for API key in environment variable if not in config
        if not openai_config.get('api_key'):
            openai_config['api_key'] = os.environ.get('OPENAI_API_KEY', '')
        
        return openai_config
    
    def is_openai_enabled(self) -> bool:
        """Check if OpenAI integration is enabled"""
        openai_config = self.get_openai_config()
        return openai_config.get('enabled', False) and bool(openai_config.get('api_key'))
    
    def get_processing_config(self, setting_type: str = None) -> Dict[str, Any]:
        """Get processing configuration"""
        if setting_type:
            return self.get(f'processing.{setting_type}', {})
        return self.get('processing', {})
    
    def get_watermark_config(self) -> Dict[str, Any]:
        """Get watermark configuration"""
        return self.get('processing.watermark', {'enabled': False})
    
    def get_export_config(self) -> Dict[str, Any]:
        """Get export configuration"""
        return self.get('export', {})
    
    def reload(self):
        """Reload configuration from file"""
        self.config = self._load_config()
        self._validate_config()
        logger.info("Configuration reloaded")


# Singleton instance
_config_manager = None


def get_config_manager(config_path: Optional[str] = None) -> ConfigManager:
    """
    Get or create the configuration manager singleton
    
    Args:
        config_path: Optional custom path to config file
        
    Returns:
        ConfigManager instance
    """
    global _config_manager
    if _config_manager is None:
        _config_manager = ConfigManager(config_path)
    return _config_manager
