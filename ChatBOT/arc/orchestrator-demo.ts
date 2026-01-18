/**
 * Complete example demonstrating ARC Orchestrator with routing and merging
 * 
 * FIXES APPLIED:
 * - Added global declarations for Node.js runtime (console, setTimeout, process)
 * - All types properly imported
 * - All async functions correctly typed
 */

import Orchestrator from './Orchestrator';
import GPTAdapter from './GPTAdapter';
import { Task, ModelAdapter, ARCResponse } from './types';

// TypeScript compatibility: Declare Node.js runtime globals
declare const console: any;
declare function setTimeout(callback: () => void, ms: number): any;
declare const process: any;

/**
 * Mock adapters for demonstration (replace with real implementations)
 */
class MockGeminiAdapter implements ModelAdapter {
  name: string;
  config: Record<string, any>;

  constructor(name: string, config: Record<string, any>) {
    this.name = name;
    this.config = config;
  }

  async call(task: Task): Promise<ARCResponse> {
    await this.sleep(100);
    return {
      taskId: task.taskId,
      output: `[Gemini] Processed: ${task.payload.prompt || 'No prompt'}`,
      confidence: 0.88,
      metadata: { model: 'gemini-pro', adapter: this.name },
      success: true,
      timestamp: new Date()
    };
  }

  supportsTaskType(taskType: string): boolean {
    return ['multi-modal', 'factual', 'creative'].includes(taskType);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class MockQwenAdapter implements ModelAdapter {
  name: string;
  config: Record<string, any>;

  constructor(name: string, config: Record<string, any>) {
    this.name = name;
    this.config = config;
  }

  async call(task: Task): Promise<ARCResponse> {
    await this.sleep(80);
    return {
      taskId: task.taskId,
      output: `[Qwen] Analysis: ${task.payload.prompt || 'No prompt'}`,
      confidence: 0.85,
      metadata: { model: 'qwen-max', adapter: this.name },
      success: true,
      timestamp: new Date()
    };
  }

  supportsTaskType(taskType: string): boolean {
    return ['coding', 'factual', 'reasoning'].includes(taskType);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class MockClaudeAdapter implements ModelAdapter {
  name: string;
  config: Record<string, any>;

  constructor(name: string, config: Record<string, any>) {
    this.name = name;
    this.config = config;
  }

  async call(task: Task): Promise<ARCResponse> {
    await this.sleep(120);
    return {
      taskId: task.taskId,
      output: `[Claude] Response: ${task.payload.prompt || 'No prompt'}`,
      confidence: 0.92,
      metadata: { model: 'claude-3', adapter: this.name },
      success: true,
      timestamp: new Date()
    };
  }

  supportsTaskType(taskType: string): boolean {
    return ['creative', 'reasoning', 'coding'].includes(taskType);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  console.log('=== ARC Orchestrator Demo ===\n');

  // Initialize orchestrator
  const orchestrator = new Orchestrator({
    maxRetries: 2,
    retryDelay: 500,
    enableFallback: true,
    defaultMergeStrategy: { type: 'best' }
  });

  // Register adapters
  // In production, use real API keys and configs
  const gptAdapter = new GPTAdapter('gpt-4', {
    apiKey: process.env.OPENAI_API_KEY || 'mock-key'
  });
  const geminiAdapter = new MockGeminiAdapter('gemini', {});
  const qwenAdapter = new MockQwenAdapter('qwen', {});
  const claudeAdapter = new MockClaudeAdapter('claude', {});

  orchestrator.addAdapter(gptAdapter);
  orchestrator.addAdapter(geminiAdapter);
  orchestrator.addAdapter(qwenAdapter);
  orchestrator.addAdapter(claudeAdapter);

  console.log('\n--- Orchestrator Status ---');
  console.log(JSON.stringify(orchestrator.getStatus(), null, 2));

  // Example 1: Reasoning task (routed to GPT-4)
  console.log('\n\n=== Example 1: Reasoning Task ===');
  const reasoningTask: Task = {
    taskId: 'task-001',
    taskType: 'reasoning',
    payload: {
      prompt: 'If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?'
    }
  };

  const response1 = await orchestrator.routeTask(reasoningTask);
  console.log(`Success: ${response1.success}`);
  console.log(`Output: ${response1.output?.substring(0, 100)}...`);
  console.log(`Confidence: ${response1.confidence}`);
  console.log(`Adapter: ${response1.metadata?.adapter}`);

  // Example 2: Coding task (routed to GPT-4)
  console.log('\n\n=== Example 2: Coding Task ===');
  const codingTask: Task = {
    taskId: 'task-002',
    taskType: 'coding',
    payload: {
      prompt: 'Write a function to implement binary search in Python'
    }
  };

  const response2 = await orchestrator.routeTask(codingTask);
  console.log(`Success: ${response2.success}`);
  console.log(`Output: ${response2.output?.substring(0, 100)}...`);
  console.log(`Confidence: ${response2.confidence}`);

  // Example 3: Creative task (routed to GPT-4/Claude)
  console.log('\n\n=== Example 3: Creative Task ===');
  const creativeTask: Task = {
    taskId: 'task-003',
    taskType: 'creative',
    payload: {
      prompt: 'Write a short poem about artificial intelligence'
    }
  };

  const response3 = await orchestrator.routeTask(creativeTask);
  console.log(`Success: ${response3.success}`);
  console.log(`Output: ${response3.output?.substring(0, 150)}...`);
  console.log(`Confidence: ${response3.confidence}`);

  // Example 4: Factual task with ensemble (multiple adapters)
  console.log('\n\n=== Example 4: Factual Task (Ensemble) ===');
  
  // Enable ensemble merging
  orchestrator.setMergeStrategy({ type: 'consensus' });
  
  const factualTask: Task = {
    taskId: 'task-004',
    taskType: 'factual',
    payload: {
      prompt: 'What is the capital of France?'
    }
  };

  const response4 = await orchestrator.routeTask(factualTask);
  console.log(`Success: ${response4.success}`);
  console.log(`Merge Strategy: ${response4.metadata?.mergeStrategy}`);
  console.log(`Total Responses: ${response4.metadata?.totalResponses}`);
  console.log(`Agreement Ratio: ${response4.metadata?.agreementRatio}`);
  console.log(`Confidence: ${response4.confidence}`);

  // Example 5: Batch processing
  console.log('\n\n=== Example 5: Batch Processing ===');
  const batchTasks: Task[] = [
    {
      taskId: 'batch-001',
      taskType: 'reasoning',
      payload: { prompt: 'Calculate 15% of 240' }
    },
    {
      taskId: 'batch-002',
      taskType: 'coding',
      payload: { prompt: 'What is a closure in JavaScript?' }
    },
    {
      taskId: 'batch-003',
      taskType: 'creative',
      payload: { prompt: 'Generate a tagline for a tech startup' }
    }
  ];

  const batchResponses = await orchestrator.routeTasksBatch(batchTasks);
  console.log(`Processed ${batchResponses.length} tasks`);
  batchResponses.forEach((resp, i) => {
    console.log(`  ${i + 1}. ${resp.taskId}: ${resp.success ? 'SUCCESS' : 'FAILED'} (confidence: ${resp.confidence})`);
  });

  // Example 6: Automatic task type classification
  console.log('\n\n=== Example 6: Auto-Classification ===');
  const autoClassifyTask: Task = {
    taskId: 'task-006',
    taskType: 'default', // Will be auto-classified
    payload: {
      prompt: 'Debug this code: function sum(a,b) { return a+b } // why does sum("1","2") return "12"?'
    }
  };

  const response6 = await orchestrator.routeTask(autoClassifyTask);
  console.log(`Auto-classified as coding task`);
  console.log(`Success: ${response6.success}`);

  console.log('\n\n=== Demo Complete ===');
}

// Run the demo
main().catch(error => {
  console.error('Demo error:', error);
  process.exit(1);
});
