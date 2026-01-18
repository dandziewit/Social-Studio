"""
ARC (AI Orchestration Platform)
A modular, model-agnostic platform for routing and managing AI tasks across multiple adapters.
"""

from .task import Task
from .response import ARCResponse
from .adapter import ModelAdapter
from .orchestrator import Orchestrator

__all__ = ['Task', 'ARCResponse', 'ModelAdapter', 'Orchestrator']
