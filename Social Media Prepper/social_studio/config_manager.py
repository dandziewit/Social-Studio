"""
Configuration Manager
Handles loading and validating configuration
"""

import logging
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger(__name__)


class ConfigManager:
    """Manages application configuration"""
    
    def __init__(self, config_path: str = None):
        """Initialize configuration manager"""
        self.config_path = config_path
        self.config = self._load_default_config()
        logger.info("Configuration loaded")
    
    def _load_default_config(self) -> Dict[str, Any]:
        """Load default configuration"""
        return {
            'platforms': {
                'instagram': {'enabled': True},
                'tiktok': {'enabled': True},
                'facebook': {'enabled': True},
                'youtube': {'enabled': True},
                'twitter': {'enabled': True}
            },
            'audio': {
                'default_duration': 15,
                'max_duration': 60
            },
            'export': {
                'schedulers': ['buffer', 'publer', 'later', 'meta']
            }
        }
    
    def get(self, key: str, default=None):
        """Get configuration value"""
        return self.config.get(key, default)
