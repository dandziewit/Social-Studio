"""
ModelAdapter: Abstract interface for AI model integrations
"""

from abc import ABC, abstractmethod
from typing import Optional
from .task import Task
from .response import ARCResponse


class ModelAdapter(ABC):
    """
    Abstract base class for all AI model adapters.
    
    Each adapter wraps a specific AI model/service (OpenAI, Anthropic, local models, etc.)
    and provides a uniform interface for the orchestrator to interact with.
    
    Implementations should handle:
    - Authentication/connection to the model
    - Request formatting specific to that model
    - Response parsing into ARCResponse format
    - Error handling and retry logic
    """
    
    def __init__(self, name: str, config: Optional[dict] = None):
        """
        Initialize the adapter.
        
        Args:
            name: Identifier for this adapter instance
            config: Model-specific configuration (API keys, endpoints, parameters, etc.)
        """
        self.name = name
        self.config = config or {}
    
    @abstractmethod
    async def call(self, task: Task) -> ARCResponse:
        """
        Execute a task using this adapter's AI model.
        
        This is the core method that each adapter must implement.
        
        Args:
            task: The task to process
            
        Returns:
            ARCResponse containing the model's output
            
        Raises:
            Should catch exceptions and return ARCResponse with success=False
        """
        pass
    
    def supports_task_type(self, task_type: str) -> bool:
        """
        Check if this adapter can handle a given task type.
        
        Override this method to implement custom routing logic.
        
        Args:
            task_type: The type of task to check
            
        Returns:
            True if this adapter can handle the task type
        """
        return True
    
    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(name={self.name})"
