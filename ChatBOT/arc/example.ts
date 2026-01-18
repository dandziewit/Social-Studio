/**
 * Example usage of GPTAdapter in TypeScript
 * 
 * FIXES APPLIED:
 * - Added global declarations for Node.js runtime (console, process)
 * - Fixed taskType to use valid TaskType value
 */

import GPTAdapter from './GPTAdapter';
import { Task } from './types';

// TypeScript compatibility: Declare Node.js runtime globals
declare const console: any;
declare const process: any;

async function main() {
  // Initialize the adapter
  const gptAdapter = new GPTAdapter('gpt-4-adapter', {
    apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 1000,
    maxRetries: 3
  });

  // Create a task
  const task: Task = {
    taskId: 'task-001',
    taskType: 'default', // Changed from 'text-generation' to valid TaskType
    payload: {
      systemPrompt: 'You are a helpful assistant.',
      prompt: 'Explain quantum computing in simple terms.'
    },
    metadata: {
      userId: 'user-123',
      sessionId: 'session-456'
    }
  };

  // Call the adapter
  console.log('Sending task to GPT...');
  const response = await gptAdapter.call(task);

  // Handle the response
  if (response.success) {
    console.log('\n=== Success ===');
    console.log('Output:', response.output);
    console.log('Confidence:', response.confidence);
    console.log('Tokens used:', response.metadata.tokens);
    console.log('Latency:', response.metadata.latencyMs, 'ms');
  } else {
    console.log('\n=== Error ===');
    console.log('Error:', response.error);
  }
}

// Run the example
main().catch(console.error);
