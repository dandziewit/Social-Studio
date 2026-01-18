/**
 * Task Class Demo - Examples and usage patterns
 * 
 * FIXES APPLIED:
 * - Added global declaration for console
 */

import Task from './Task';
import { TaskType } from './types';

// TypeScript compatibility: Declare Node.js runtime globals
declare const console: any;

console.log('=== ARC Task Class Demo ===\n');

// Example 1: Basic task creation
console.log('--- Example 1: Basic Task Creation ---');
const task1 = new Task({
  taskType: 'reasoning',
  payload: {
    prompt: 'If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?'
  },
  userId: 'user-123',
  priority: 5
});

console.log(task1.toString());
console.log(`Task ID: ${task1.taskId}`);
console.log(`Type: ${task1.taskType}`);
console.log(`Priority: ${task1.priority}`);
console.log(`Estimated tokens: ${task1.estimateTokenCount()}`);

// Example 2: Factory methods
console.log('\n--- Example 2: Factory Methods ---');

const task2 = Task.fromPrompt(
  'Write a function to reverse a string in JavaScript',
  'coding',
  'user-456'
);
console.log(task2.toString());

const task3 = Task.fromMessages([
  { role: 'user', content: 'What is recursion?' },
  { role: 'assistant', content: 'Recursion is when a function calls itself...' },
  { role: 'user', content: 'Give me an example' }
], 'coding');
console.log(task3.toString());

// Example 3: Metadata usage
console.log('\n--- Example 3: Metadata Usage ---');

const task4 = Task.fromPrompt('Generate a creative story about AI', 'creative')
  .addMetadata('sessionId', 'session-789')
  .addMetadata('tone', 'optimistic')
  .addMetadata('maxWords', 500)
  .addMetadata('targetAudience', 'general')
  .setPriority(3);

console.log('Task with metadata:');
console.log(`  Session ID: ${task4.getMetadata('sessionId')}`);
console.log(`  Tone: ${task4.getMetadata('tone')}`);
console.log(`  Max words: ${task4.getMetadata('maxWords')}`);
console.log(`  Has "tone" metadata: ${task4.hasMetadata('tone')}`);

// Example 4: Multi-modal tasks
console.log('\n--- Example 4: Multi-Modal Task ---');

const task5 = new Task({
  taskType: 'multi-modal',
  payload: {
    prompt: 'Describe what you see in this image',
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  }
});

console.log(`Task ID: ${task5.taskId}`);
console.log(`Is multi-modal: ${task5.isMultiModal()}`);
console.log(`Type: ${task5.taskType}`);

// Example 5: Serialization
console.log('\n--- Example 5: Serialization ---');

const originalTask = Task.fromPrompt('Explain blockchain technology', 'factual');
console.log('Original task:', originalTask.taskId);

// Convert to JSON
const json = originalTask.toJSON();
console.log('Serialized:', JSON.stringify(json, null, 2));

// Restore from JSON
const restoredTask = Task.fromObject(json);
console.log('Restored task:', restoredTask.taskId);

// Example 6: Cloning
console.log('\n--- Example 6: Task Cloning ---');

const original = Task.fromPrompt('Original prompt')
  .addMetadata('key', 'value');

const cloned = original.clone();
cloned.addMetadata('key', 'modified');

console.log(`Original metadata: ${original.getMetadata('key')}`);
console.log(`Cloned metadata: ${cloned.getMetadata('key')}`);
console.log('Tasks are independent:', original.getMetadata('key') !== cloned.getMetadata('key'));

// Example 7: Domain-specific applications
console.log('\n--- Example 7: Domain-Specific Applications ---');

// E-commerce
const ecommerceTask = Task.fromPrompt(
  'Recommend products similar to my recent purchase',
  'factual'
).addMetadata('domain', 'e-commerce')
  .addMetadata('userPreferences', {
    category: 'electronics',
    priceRange: { min: 100, max: 500 }
  })
  .addMetadata('previousPurchases', ['laptop-123', 'mouse-456']);

console.log('E-commerce task:', ecommerceTask.taskId);
console.log('Domain:', ecommerceTask.getMetadata('domain'));

// Education
const educationTask = Task.fromPrompt(
  'Generate 10 multiple choice questions about photosynthesis',
  'creative'
).addMetadata('domain', 'education')
  .addMetadata('subject', 'biology')
  .addMetadata('difficulty', 'intermediate')
  .addMetadata('gradeLevel', '9-10');

console.log('Education task:', educationTask.taskId);
console.log('Subject:', educationTask.getMetadata('subject'));

// Content creation
const contentTask = Task.fromPrompt(
  'Write a blog post about sustainable living',
  'creative'
).addMetadata('domain', 'content-creation')
  .addMetadata('wordCount', 1000)
  .addMetadata('seoKeywords', ['sustainability', 'eco-friendly', 'green living'])
  .addMetadata('tone', 'informative');

console.log('Content task:', contentTask.taskId);
console.log('Word count:', contentTask.getMetadata('wordCount'));

// Example 8: All task types
console.log('\n--- Example 8: All Task Types ---');

const taskTypes: TaskType[] = ['reasoning', 'coding', 'creative', 'factual', 'multi-modal', 'default'];

taskTypes.forEach(type => {
  const task = Task.fromPrompt(`Sample ${type} task`, type);
  console.log(`  ${type.padEnd(12)}: ${task.taskId}`);
});

// Example 9: Priority ordering
console.log('\n--- Example 9: Priority Ordering ---');

const tasks = [
  Task.fromPrompt('Low priority', 'default').setPriority(1),
  Task.fromPrompt('High priority', 'default').setPriority(10),
  Task.fromPrompt('Medium priority', 'default').setPriority(5),
  Task.fromPrompt('Urgent', 'default').setPriority(15)
];

const sorted = tasks.sort((a, b) => b.priority - a.priority);
console.log('Tasks sorted by priority:');
sorted.forEach(task => {
  console.log(`  Priority ${task.priority}: ${task.getContent()}`);
});

// Example 10: Error handling
console.log('\n--- Example 10: Error Handling ---');

try {
  const invalidTask = new Task({
    taskType: 'reasoning',
    payload: {} // Empty payload
  });
} catch (error) {
  console.log('Caught error:', (error as Error).message);
}

console.log('\n=== Demo Complete ===');
