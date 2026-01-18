"""
Task: Generic container for AI work requests
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass, field


@dataclass
class Task:
    """
    Generic task representation for AI operations.
    
    This class encapsulates any type of AI work without domain-specific logic.
    Tasks can be routed to different adapters based on their properties.
    
    Attributes:
        task_id: Unique identifier for the task
        task_type: Category or type of task (e.g., "text-generation", "analysis")
        payload: The actual data/content for processing
        metadata: Additional context or configuration
        priority: Task priority level (higher = more urgent)
    """
    
    task_id: str
    task_type: str
    payload: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = field(default_factory=dict)
    priority: int = 0
    
    def __repr__(self) -> str:
        return f"Task(id={self.task_id}, type={self.task_type}, priority={self.priority})"
