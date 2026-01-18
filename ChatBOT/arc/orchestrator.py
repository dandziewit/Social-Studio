"""
Orchestrator: Core routing and coordination logic for ARC
"""

from typing import List, Dict, Optional, Any
import asyncio
from .task import Task
from .response import ARCResponse
from .adapter import ModelAdapter


class Orchestrator:
    """
    Central coordinator for routing tasks to appropriate adapters.
    
    The orchestrator maintains a registry of adapters and implements
    routing logic to send tasks to the right models. It can also
    merge outputs from multiple adapters when needed.
    
    Key responsibilities:
    - Adapter lifecycle management (register, remove)
    - Task routing based on task type or custom logic
    - Parallel execution coordination
    - Response aggregation and merging
    """
    
    def __init__(self):
        """Initialize the orchestrator with an empty adapter registry."""
        self._adapters: Dict[str, ModelAdapter] = {}
        self._routing_rules: Dict[str, str] = {}  # task_type -> adapter_name
    
    def add_adapter(self, adapter: ModelAdapter) -> None:
        """
        Register an adapter with the orchestrator.
        
        Once registered, the adapter becomes available for task routing.
        
        Args:
            adapter: The ModelAdapter instance to register
            
        Example:
            orchestrator.add_adapter(OpenAIAdapter("gpt-4"))
        """
        self._adapters[adapter.name] = adapter
        print(f"[ARC] Registered adapter: {adapter.name}")
    
    def remove_adapter(self, adapter_name: str) -> None:
        """
        Unregister an adapter from the orchestrator.
        
        Args:
            adapter_name: Name of the adapter to remove
        """
        if adapter_name in self._adapters:
            del self._adapters[adapter_name]
            print(f"[ARC] Removed adapter: {adapter_name}")
    
    def set_routing_rule(self, task_type: str, adapter_name: str) -> None:
        """
        Define explicit routing: task_type -> adapter.
        
        Args:
            task_type: The type of task to route
            adapter_name: Name of the adapter to handle this task type
        """
        if adapter_name not in self._adapters:
            raise ValueError(f"Adapter '{adapter_name}' not registered")
        self._routing_rules[task_type] = adapter_name
        print(f"[ARC] Route rule: {task_type} -> {adapter_name}")
    
    async def route_task(self, task: Task) -> ARCResponse:
        """
        Route a single task to the appropriate adapter and execute it.
        
        Routing priority:
        1. Explicit routing rules (set via set_routing_rule)
        2. First adapter that supports the task type
        3. First available adapter (fallback)
        
        Args:
            task: The task to execute
            
        Returns:
            ARCResponse from the selected adapter
            
        Raises:
            ValueError: If no suitable adapter is found
        """
        # Check explicit routing rules first
        if task.task_type in self._routing_rules:
            adapter_name = self._routing_rules[task.task_type]
            adapter = self._adapters[adapter_name]
            print(f"[ARC] Routing {task.task_id} to {adapter_name} (rule-based)")
            return await adapter.call(task)
        
        # Find first adapter that supports this task type
        for adapter in self._adapters.values():
            if adapter.supports_task_type(task.task_type):
                print(f"[ARC] Routing {task.task_id} to {adapter.name} (capability-based)")
                return await adapter.call(task)
        
        # No suitable adapter found
        raise ValueError(
            f"No adapter found for task type '{task.task_type}'. "
            f"Available adapters: {list(self._adapters.keys())}"
        )
    
    async def route_tasks_parallel(self, tasks: List[Task]) -> List[ARCResponse]:
        """
        Execute multiple tasks in parallel.
        
        Args:
            tasks: List of tasks to execute concurrently
            
        Returns:
            List of ARCResponse objects in the same order as input tasks
        """
        print(f"[ARC] Executing {len(tasks)} tasks in parallel")
        responses = await asyncio.gather(
            *[self.route_task(task) for task in tasks],
            return_exceptions=True
        )
        
        # Convert exceptions to error responses
        results = []
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                results.append(ARCResponse(
                    task_id=tasks[i].task_id,
                    output=None,
                    success=False,
                    error=str(response)
                ))
            else:
                results.append(response)
        
        return results
    
    def merge_outputs(
        self, 
        responses: List[ARCResponse], 
        strategy: str = "concat"
    ) -> Dict[str, Any]:
        """
        Merge outputs from multiple responses into a single result.
        
        Useful when tasks are split across adapters or when combining
        multiple perspectives/models for the same task.
        
        Args:
            responses: List of responses to merge
            strategy: Merging strategy to use:
                - "concat": Concatenate all outputs
                - "vote": Return most common output (for classification)
                - "first": Return first successful output
                - "all": Return all outputs as a list
                
        Returns:
            Dictionary with merged output and metadata
        """
        if not responses:
            return {"merged_output": None, "success": False, "error": "No responses to merge"}
        
        successful = [r for r in responses if r.success]
        
        if not successful:
            return {
                "merged_output": None,
                "success": False,
                "error": "All responses failed",
                "failed_tasks": [r.task_id for r in responses]
            }
        
        merged_result = {
            "success": True,
            "total_responses": len(responses),
            "successful_responses": len(successful),
            "strategy": strategy
        }
        
        # Apply merging strategy
        if strategy == "concat":
            # Concatenate all outputs as strings
            merged_result["merged_output"] = "\n\n".join(
                str(r.output) for r in successful
            )
        
        elif strategy == "vote":
            # Count occurrences and return most common
            from collections import Counter
            outputs = [r.output for r in successful]
            counter = Counter(outputs)
            merged_result["merged_output"] = counter.most_common(1)[0][0]
            merged_result["vote_counts"] = dict(counter)
        
        elif strategy == "first":
            # Return first successful output
            merged_result["merged_output"] = successful[0].output
        
        elif strategy == "all":
            # Return all outputs as a list
            merged_result["merged_output"] = [r.output for r in successful]
        
        else:
            raise ValueError(f"Unknown merge strategy: {strategy}")
        
        return merged_result
    
    def get_adapter_status(self) -> Dict[str, Any]:
        """
        Get current status of all registered adapters.
        
        Returns:
            Dictionary with adapter information
        """
        return {
            "total_adapters": len(self._adapters),
            "adapters": list(self._adapters.keys()),
            "routing_rules": self._routing_rules
        }
    
    def __repr__(self) -> str:
        return f"Orchestrator(adapters={len(self._adapters)}, rules={len(self._routing_rules)})"
