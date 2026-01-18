/**
 * GeminiAdapter Demo - Usage examples for Google Gemini integration
 */

import GeminiAdapter from './GeminiAdapter';
import Task from './Task';

// TypeScript compatibility: Declare Node.js runtime globals
declare const console: any;
declare const process: any;

async function main() {
  console.log('=== GeminiAdapter Demo ===\n');

  // Initialize Gemini adapter
  const gemini = new GeminiAdapter('gemini-reasoning', {
    apiKey: process.env.GOOGLE_API_KEY || 'demo-key',
    model: 'gemini-1.5-pro-latest',
    temperature: 0.4  // Lower temperature for analytical tasks
  });

  console.log(`Adapter: ${gemini.name}`);
  console.log(`Model: ${gemini.config.model}\n`);

  // Example 1: Reasoning Task
  console.log('--- Example 1: Complex Reasoning ---');
  
  const reasoningTask = new Task({
    taskType: 'reasoning',
    payload: {
      systemPrompt: 'You are an analytical engine focused on logical reasoning.',
      prompt: `Analyze the following problem step by step:
      
A farmer needs to transport a fox, a chicken, and a bag of grain across a river.
The boat can only carry the farmer and one item at a time.
If left alone, the fox will eat the chicken, and the chicken will eat the grain.
How should the farmer proceed?

Please provide:
1. Step-by-step reasoning
2. The optimal solution
3. Why this solution works`
    }
  });

  console.log('Task:', reasoningTask.taskId);
  console.log('Type:', reasoningTask.taskType);
  
  const response1 = await gemini.call(reasoningTask);
  console.log(`Success: ${response1.success}`);
  console.log(`Confidence: ${(response1.confidence! * 100).toFixed(0)}%`);
  console.log(`Output preview: ${response1.output?.substring(0, 150)}...`);
  console.log(`Latency: ${response1.metadata.latencyMs}ms\n`);

  // Example 2: Factual Analysis
  console.log('--- Example 2: Factual Research ---');
  
  const factualTask = new Task({
    taskType: 'factual',
    payload: {
      prompt: 'What are the key differences between quantum computing and classical computing? Include technical details about qubits, superposition, and entanglement.'
    }
  });

  const response2 = await gemini.call(factualTask);
  console.log(`Success: ${response2.success}`);
  console.log(`Confidence: ${(response2.confidence! * 100).toFixed(0)}%`);
  console.log(`Tokens used: ${response2.metadata.tokens?.totalTokenCount || 'N/A'}`);
  console.log(`Output length: ${response2.output?.length || 0} chars\n`);

  // Example 3: Code Analysis
  console.log('--- Example 3: Code Analysis ---');
  
  const codingTask = new Task({
    taskType: 'coding',
    payload: {
      prompt: `Analyze this Python function and identify potential issues:

def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)

Provide:
1. What the code does
2. Potential bugs or edge cases
3. Improved version with error handling`
    }
  });

  const response3 = await gemini.call(codingTask);
  console.log(`Success: ${response3.success}`);
  console.log(`Finish reason: ${response3.metadata.finishReason}`);
  console.log(`Output preview: ${response3.output?.substring(0, 200)}...\n`);

  // Example 4: Multi-step Planning
  console.log('--- Example 4: Planning Task ---');
  
  const planningTask = new Task({
    taskType: 'reasoning',
    payload: {
      systemPrompt: 'You are a strategic planning assistant.',
      prompt: `Create a high-level project plan for migrating a monolithic application to microservices.
      
Requirements:
- Application has 500k lines of code
- 50 developers on the team
- 6-month timeline
- Must maintain zero downtime

Provide:
1. Key phases with milestones
2. Risk assessment
3. Resource allocation strategy
4. Success criteria`
    }
  });

  const response4 = await gemini.call(planningTask);
  console.log(`Success: ${response4.success}`);
  console.log(`Confidence: ${(response4.confidence! * 100).toFixed(0)}%`);
  console.log(`Model: ${response4.metadata.model}\n`);

  // Example 5: Task Type Support
  console.log('--- Example 5: Supported Task Types ---');
  
  const taskTypes = ['reasoning', 'factual', 'coding', 'creative', 'multi-modal', 'default'];
  
  taskTypes.forEach(type => {
    const supported = gemini.supportsTaskType(type);
    console.log(`  ${type.padEnd(15)}: ${supported ? '✓ Supported' : '✗ Not supported'}`);
  });

  // Example 6: Error Handling
  console.log('\n--- Example 6: Error Handling ---');
  
  const invalidTask = new Task({
    taskType: 'reasoning',
    payload: {
      prompt: ''  // Empty prompt should be handled gracefully
    }
  });

  const response6 = await gemini.call(invalidTask);
  console.log(`Success: ${response6.success}`);
  if (!response6.success) {
    console.log(`Error: ${response6.error}`);
  }

  // Example 7: Comparison of Configurations
  console.log('\n--- Example 7: Temperature Comparison ---');
  
  const prompt = 'What is the capital of France?';
  
  const lowTemp = new GeminiAdapter('gemini-factual', {
    apiKey: process.env.GOOGLE_API_KEY || 'demo-key',
    temperature: 0.1
  });
  
  const highTemp = new GeminiAdapter('gemini-creative', {
    apiKey: process.env.GOOGLE_API_KEY || 'demo-key',
    temperature: 0.9
  });
  
  console.log('Low temp (0.1) - Factual/Deterministic');
  console.log('High temp (0.9) - Creative/Varied');
  console.log('Both configurations ready for use\n');

  // Example 8: Multi-modal Placeholder
  console.log('--- Example 8: Multi-modal Support ---');
  
  console.log('Gemini supports image analysis:');
  console.log('  • Image + text queries');
  console.log('  • Object detection');
  console.log('  • Visual reasoning');
  console.log('  • Document analysis');
  console.log('\nExample usage:');
  console.log(`
  const task = new Task({
    taskType: 'multi-modal',
    payload: {
      prompt: 'What objects are in this image?',
      image: {
        mimeType: 'image/jpeg',
        data: base64EncodedImageData
      }
    }
  });
  `);

  console.log('\n=== Demo Complete ===');
  console.log('\nKey Capabilities:');
  console.log('  ✓ Complex reasoning and analysis');
  console.log('  ✓ Factual grounding');
  console.log('  ✓ Multi-step planning');
  console.log('  ✓ Code generation and review');
  console.log('  ✓ Multi-modal processing (text + images)');
  console.log('  ✓ Large context windows (up to 1M tokens)');
}

main().catch(console.error);
