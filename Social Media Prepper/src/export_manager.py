"""
Export Manager
Handles exporting post metadata to CSV and JSON for social media schedulers
"""

import csv
import json
import logging
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class ExportManager:
    """Manages exporting post data to scheduler-compatible formats"""
    
    def __init__(self, config_manager):
        """
        Initialize the export manager
        
        Args:
            config_manager: ConfigManager instance
        """
        self.config = config_manager
        self.project_root = Path(__file__).parent.parent
        self.export_dir = self.project_root / "scheduler_export"
        
        # Ensure export directory exists
        self.export_dir.mkdir(parents=True, exist_ok=True)
    
    def export_posts(self, posts: List[Dict], scheduler: str = 'generic') -> Dict[str, Path]:
        """
        Export posts to scheduler-compatible format
        
        Args:
            posts: List of post metadata dictionaries
            scheduler: Target scheduler ('buffer', 'publer', 'later', 'meta', 'generic')
            
        Returns:
            Dictionary with paths to exported files
        """
        export_config = self.config.get_export_config()
        exported_files = {}
        
        # Export CSV if enabled
        if export_config.get('include_csv', True):
            csv_path = self.export_to_csv(posts, scheduler)
            if csv_path:
                exported_files['csv'] = csv_path
        
        # Export JSON if enabled
        if export_config.get('include_json', True):
            json_path = self.export_to_json(posts, scheduler)
            if json_path:
                exported_files['json'] = json_path
        
        logger.info(f"Exported {len(posts)} posts for {scheduler}")
        return exported_files
    
    def export_to_csv(self, posts: List[Dict], scheduler: str = 'generic') -> Path | None:
        """
        Export posts to CSV format
        
        Args:
            posts: List of post metadata dictionaries
            scheduler: Target scheduler
            
        Returns:
            Path to exported CSV file or None if error
        """
        try:
            # Generate filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{scheduler}_posts_{timestamp}.csv"
            filepath = self.export_dir / filename
            
            # Define CSV fields based on scheduler
            if scheduler == 'buffer':
                fields = self._get_buffer_fields()
            elif scheduler == 'publer':
                fields = self._get_publer_fields()
            elif scheduler == 'later':
                fields = self._get_later_fields()
            elif scheduler == 'meta':
                fields = self._get_meta_fields()
            else:
                fields = self._get_generic_fields()
            
            # Write CSV
            with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fields)
                writer.writeheader()
                
                for post in posts:
                    row = self._format_post_for_scheduler(post, scheduler, fields)
                    writer.writerow(row)
            
            logger.info(f"CSV exported to {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error exporting to CSV: {e}")
            return None
    
    def export_to_json(self, posts: List[Dict], scheduler: str = 'generic') -> Path | None:
        """
        Export posts to JSON format
        
        Args:
            posts: List of post metadata dictionaries
            scheduler: Target scheduler
            
        Returns:
            Path to exported JSON file or None if error
        """
        try:
            # Generate filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{scheduler}_posts_{timestamp}.json"
            filepath = self.export_dir / filename
            
            # Format posts for JSON
            formatted_posts = []
            for post in posts:
                formatted_post = self._format_post_for_json(post, scheduler)
                formatted_posts.append(formatted_post)
            
            # Create export data
            export_data = {
                'scheduler': scheduler,
                'exported_at': datetime.now().isoformat(),
                'total_posts': len(formatted_posts),
                'posts': formatted_posts
            }
            
            # Write JSON
            with open(filepath, 'w', encoding='utf-8') as jsonfile:
                json.dump(export_data, jsonfile, indent=2, ensure_ascii=False)
            
            logger.info(f"JSON exported to {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error exporting to JSON: {e}")
            return None
    
    def _get_buffer_fields(self) -> List[str]:
        """Get CSV fields for Buffer"""
        return [
            'text',  # Caption + hashtags
            'media_path',  # Path to media file
            'profile',  # Platform/profile name
            'scheduled_at',  # Date and time (YYYY-MM-DD HH:MM:SS)
            'status'  # Usually 'scheduled'
        ]
    
    def _get_publer_fields(self) -> List[str]:
        """Get CSV fields for Publer"""
        return [
            'platform',  # Platform name
            'caption',  # Caption text
            'media_url',  # Path or URL to media
            'scheduled_date',  # Date (YYYY-MM-DD)
            'scheduled_time',  # Time (HH:MM)
            'hashtags'  # Hashtags (space-separated with #)
        ]
    
    def _get_later_fields(self) -> List[str]:
        """Get CSV fields for Later"""
        return [
            'caption',  # Caption + hashtags
            'media_path',  # Path to media file
            'platform',  # Platform name
            'schedule_date',  # Date (YYYY-MM-DD)
            'schedule_time'  # Time (HH:MM)
        ]
    
    def _get_meta_fields(self) -> List[str]:
        """Get CSV fields for Meta Business Suite"""
        return [
            'message',  # Caption text
            'media_path',  # Path to media file
            'platform',  # 'facebook' or 'instagram'
            'scheduled_publish_time',  # Unix timestamp or ISO format
            'page_id'  # Optional page ID
        ]
    
    def _get_generic_fields(self) -> List[str]:
        """Get generic CSV fields"""
        return [
            'platform',
            'caption',
            'hashtags',
            'suggested_date',
            'suggested_time',
            'media_file_path',
            'content_type',
            'original_filename'
        ]
    
    def _format_post_for_scheduler(self, post: Dict, scheduler: str, 
                                   fields: List[str]) -> Dict:
        """Format a post for specific scheduler CSV"""
        row = {}
        
        if scheduler == 'buffer':
            row['text'] = post.get('full_text', '')
            row['media_path'] = post.get('media_file', '')
            row['profile'] = post.get('platform', '')
            row['scheduled_at'] = f"{post.get('suggested_date', '')} {post.get('suggested_time', '')}"
            row['status'] = 'scheduled'
            
        elif scheduler == 'publer':
            row['platform'] = post.get('platform', '')
            row['caption'] = post.get('caption', '')
            row['media_url'] = post.get('media_file', '')
            row['scheduled_date'] = post.get('suggested_date', '')
            row['scheduled_time'] = post.get('suggested_time', '')
            row['hashtags'] = post.get('hashtags_formatted', '')
            
        elif scheduler == 'later':
            row['caption'] = post.get('full_text', '')
            row['media_path'] = post.get('media_file', '')
            row['platform'] = post.get('platform', '')
            row['schedule_date'] = post.get('suggested_date', '')
            row['schedule_time'] = post.get('suggested_time', '')
            
        elif scheduler == 'meta':
            row['message'] = post.get('caption', '')
            row['media_path'] = post.get('media_file', '')
            row['platform'] = post.get('platform', '')
            # Convert to ISO format for Meta
            date_str = post.get('suggested_date', '')
            time_str = post.get('suggested_time', '')
            if date_str and time_str:
                row['scheduled_publish_time'] = f"{date_str}T{time_str}:00"
            else:
                row['scheduled_publish_time'] = ''
            row['page_id'] = ''  # User must fill this in
            
        else:  # generic
            for field in fields:
                row[field] = post.get(field, '')
        
        return row
    
    def _format_post_for_json(self, post: Dict, scheduler: str) -> Dict:
        """Format a post for JSON export"""
        # JSON export includes all post data
        formatted = post.copy()
        
        # Add scheduler-specific formatting
        formatted['scheduler'] = scheduler
        formatted['ready_to_upload'] = True
        
        return formatted
    
    def create_upload_instructions(self, scheduler: str, exported_files: Dict[str, Path]) -> str:
        """
        Create instructions for uploading to scheduler
        
        Args:
            scheduler: Target scheduler name
            exported_files: Dictionary of exported file paths
            
        Returns:
            Instructions text
        """
        instructions = f"\n{'='*60}\n"
        instructions += f"UPLOAD INSTRUCTIONS FOR {scheduler.upper()}\n"
        instructions += f"{'='*60}\n\n"
        
        # List exported files
        instructions += "Exported Files:\n"
        for file_type, filepath in exported_files.items():
            instructions += f"  - {file_type.upper()}: {filepath}\n"
        instructions += "\n"
        
        # Scheduler-specific instructions
        if scheduler == 'buffer':
            instructions += self._get_buffer_instructions()
        elif scheduler == 'publer':
            instructions += self._get_publer_instructions()
        elif scheduler == 'later':
            instructions += self._get_later_instructions()
        elif scheduler == 'meta':
            instructions += self._get_meta_instructions()
        else:
            instructions += self._get_generic_instructions()
        
        instructions += f"\n{'='*60}\n"
        
        return instructions
    
    def _get_buffer_instructions(self) -> str:
        """Get upload instructions for Buffer"""
        return """How to Upload to Buffer:
1. Log in to your Buffer account (buffer.com)
2. Go to Settings → Posting Schedule
3. Click 'Bulk Upload' or 'Import Posts'
4. Upload the CSV file
5. Map the CSV columns to Buffer fields:
   - text → Post Text
   - media_path → Media
   - profile → Profile/Account
   - scheduled_at → Schedule Time
6. Review posts and confirm upload
7. Manually upload media files if required

Note: You may need to upload media files separately depending on your Buffer plan.
"""
    
    def _get_publer_instructions(self) -> str:
        """Get upload instructions for Publer"""
        return """How to Upload to Publer:
1. Log in to your Publer account (publer.io)
2. Navigate to the 'Posts' section
3. Click 'Bulk Upload' or 'Import'
4. Select the CSV file
5. Map columns:
   - platform → Platform
   - caption → Caption
   - media_url → Media
   - scheduled_date & scheduled_time → Schedule
   - hashtags → Hashtags
6. Upload media files to Publer's media library
7. Review and schedule posts

Note: Media files must be uploaded to Publer separately or via URL.
"""
    
    def _get_later_instructions(self) -> str:
        """Get upload instructions for Later"""
        return """How to Upload to Later:
1. Log in to your Later account (later.com)
2. Go to your Media Library
3. Upload all media files from the output folder
4. Use the CSV file to manually schedule posts, OR
5. Use Later's bulk upload if available on your plan
6. Match media files to captions using the CSV data
7. Set schedule times as specified in the CSV

Note: Later primarily works through drag-and-drop calendar interface.
"""
    
    def _get_meta_instructions(self) -> str:
        """Get upload instructions for Meta Business Suite"""
        return """How to Upload to Meta Business Suite:
1. Log in to Meta Business Suite (business.facebook.com)
2. Go to 'Content' → 'Posts'
3. Click 'Create Post' or 'Schedule Post'
4. Use the CSV data to manually create posts:
   - Copy caption from 'message' field
   - Upload media from 'media_path'
   - Set schedule time from 'scheduled_publish_time'
   - Select platform (Facebook/Instagram)
5. Review and schedule each post

Note: Meta Business Suite doesn't support bulk CSV import.
You'll need to create posts manually using the CSV as reference.
"""
    
    def _get_generic_instructions(self) -> str:
        """Get generic upload instructions"""
        return """How to Use These Files:
1. Open the CSV file in a spreadsheet application
2. Review all post data:
   - Platform: Target social media platform
   - Caption: Post caption text
   - Hashtags: Hashtags to include
   - Media File Path: Location of media file
   - Suggested Date/Time: Recommended posting time
3. Upload to your preferred scheduler:
   - Import CSV if supported
   - Or manually create posts using CSV data as reference
4. Upload media files from the output folder
5. Match media files to posts using the filename reference
6. Set schedule times as suggested in the CSV

Note: Each scheduler has different import capabilities.
Refer to your scheduler's documentation for specific import instructions.
"""
    
    def save_instructions(self, scheduler: str, exported_files: Dict[str, Path]) -> Path | None:
        """
        Save upload instructions to a text file
        
        Args:
            scheduler: Target scheduler name
            exported_files: Dictionary of exported file paths
            
        Returns:
            Path to instructions file or None if error
        """
        try:
            instructions = self.create_upload_instructions(scheduler, exported_files)
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{scheduler}_INSTRUCTIONS_{timestamp}.txt"
            filepath = self.export_dir / filename
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(instructions)
            
            logger.info(f"Instructions saved to {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error saving instructions: {e}")
            return None
