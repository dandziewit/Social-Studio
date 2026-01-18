"""
ARCResponse: Generic container for AI outputs
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ARCResponse:
    """
    Generic response from an AI adapter.
    
    Standardized output format allowing orchestration layer to handle
    responses uniformly regardless of the underlying model.
    
    Attributes:
        task_id: ID of the originating task
        output: The primary result data
        metadata: Additional information (model used, timing, tokens, etc.)
        success: Whether the task completed successfully
        error: Error message if success=False
        timestamp: When the response was generated
    """
    
    task_id: str
    output: Any
    metadata: Dict[str, Any] = field(default_factory=dict)
    success: bool = True
    error: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)
    
    def __repr__(self) -> str:
        status = "Success" if self.success else f"Failed: {self.error}"
        return f"ARCResponse(task_id={self.task_id}, status={status})"
