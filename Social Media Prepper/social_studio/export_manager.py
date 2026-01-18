"""
Export Manager
Handles exporting content for schedulers
"""

import logging
import csv
import json
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class ExportManager:
    """Manages content export"""
    
    def __init__(self, config_manager):
        """Initialize export manager"""
        self.config = config_manager
        logger.info("Export manager initialized")
    
    def export_to_csv(self, posts: List[Dict[str, Any]], scheduler: str = "buffer") -> Path:
        """Export posts to CSV format"""
        export_dir = Path("scheduler_export")
        export_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_file = export_dir / f"{scheduler}_posts_{timestamp}.csv"
        
        with open(csv_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['platform', 'caption', 'hashtags'])
            writer.writeheader()
            writer.writerows(posts)
        
        logger.info(f"Exported to {csv_file}")
        return csv_file
    
    def export_to_json(self, posts: List[Dict[str, Any]], scheduler: str = "buffer") -> Path:
        """Export posts to JSON format"""
        export_dir = Path("scheduler_export")
        export_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        json_file = export_dir / f"{scheduler}_posts_{timestamp}.json"
        
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(posts, f, indent=2)
        
        logger.info(f"Exported to {json_file}")
        return json_file
