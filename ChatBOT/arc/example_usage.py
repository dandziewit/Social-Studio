"""
Example usage of the ARC platform
"""

import asyncio
from arc import Task, ARCResponse, ModelAdapter, Orchestrator


# Example: Mock adapter implementation
class MockGPTAdapter(ModelAdapter):
    """Example adapter for demonstration purposes."""
    
    async def call(self, task: Task) -> ARCResponse:
        """Simulate an API call with a simple response."""
        await asyncio.sleep(0.1)  # Simulate network delay
        
        return ARCResponse(
            task_id=task.task_id,
            output=f"[{self.name}] Processed: {task.payload.get('prompt', 'No prompt')}",
            metadata={
                "model": self.name,
                "tokens": 150
            }
        )
    
    def supports_task_type(self, task_type: str) -> bool:
        """This mock adapter supports text generation tasks."""
        return task_type in ["text-generation", "completion"]


class MockClaudeAdapter(ModelAdapter):
    """Another example adapter for demonstration."""
    
    async def call(self, task: Task) -> ARCResponse:
        """Simulate a different model's response."""
        await asyncio.sleep(0.15)  # Simulate network delay
        
        return ARCResponse(
            task_id=task.task_id,
            output=f"[{self.name}] Analysis: {task.payload.get('content', 'No content')}",
            metadata={
                "model": self.name,
                "confidence": 0.95
            }
        )
    
    def supports_task_type(self, task_type: str) -> bool:
        """This mock adapter supports analysis tasks."""
        return task_type in ["analysis", "summarization"]


async def main():
    """Demonstrate ARC platform capabilities."""
    
    # Initialize orchestrator
    orchestrator = Orchestrator()
    
    # Register adapters
    gpt_adapter = MockGPTAdapter("gpt-4", {"api_key": "mock-key"})
    claude_adapter = MockClaudeAdapter("claude-3", {"api_key": "mock-key"})
    
    orchestrator.add_adapter(gpt_adapter)
    orchestrator.add_adapter(claude_adapter)
    
    # Set explicit routing rule
    orchestrator.set_routing_rule("text-generation", "gpt-4")
    
    print("\n=== Single Task Routing ===")
    task1 = Task(
        task_id="task-001",
        task_type="text-generation",
        payload={"prompt": "Write a poem about AI"}
    )
    
    response1 = await orchestrator.route_task(task1)
    print(f"Response: {response1.output}")
    
    print("\n=== Parallel Task Execution ===")
    tasks = [
        Task(
            task_id=f"task-{i:03d}",
            task_type="analysis" if i % 2 else "text-generation",
            payload={"content": f"Task {i} content"}
        )
        for i in range(4)
    ]
    
    responses = await orchestrator.route_tasks_parallel(tasks)
    for response in responses:
        print(f"{response.task_id}: {response.output[:50]}...")
    
    print("\n=== Merging Outputs ===")
    merged = orchestrator.merge_outputs(responses, strategy="concat")
    print(f"Merged {merged['successful_responses']} responses")
    print(f"Strategy: {merged['strategy']}")
    
    print("\n=== Orchestrator Status ===")
    status = orchestrator.get_adapter_status()
    print(f"Total adapters: {status['total_adapters']}")
    print(f"Registered: {status['adapters']}")
    print(f"Routing rules: {status['routing_rules']}")


if __name__ == "__main__":
    asyncio.run(main())
