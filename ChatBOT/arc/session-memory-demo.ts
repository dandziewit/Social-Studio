/**
 * Example usage of SessionMemory
 * 
 * FIXES APPLIED:
 * - Added global declaration for console
 */

import SessionMemory from './SessionMemory';
import { Task, ARCResponse } from './types';

// TypeScript compatibility: Declare Node.js runtime globals
declare const console: any;

async function main() {
  console.log('=== SessionMemory Demo ===\n');

  // Initialize memory manager
  const memory = new SessionMemory({
    maxEntriesPerSession: 50,
    autoCleanupAfterMs: 3600000, // 1 hour
    compressionThreshold: 30
  });

  const sessionId = 'user-session-123';

  // Simulate a conversation
  console.log('--- Adding Tasks to Session ---');

  // Task 1: Code generation
  const task1: Task = {
    taskId: 'task-001',
    taskType: 'coding',
    payload: {
      prompt: 'Write a function to reverse a string in JavaScript'
    }
  };

  const response1: ARCResponse = {
    taskId: 'task-001',
    output: 'function reverse(str) { return str.split("").reverse().join(""); }',
    confidence: 0.95,
    metadata: { model: 'gpt-4', tokens: 45 },
    success: true,
    timestamp: new Date()
  };

  memory.addTask(sessionId, task1, response1);
  console.log('✓ Added task 1');

  // Task 2: Explanation
  const task2: Task = {
    taskId: 'task-002',
    taskType: 'reasoning',
    payload: {
      prompt: 'Explain how that function works'
    }
  };

  const response2: ARCResponse = {
    taskId: 'task-002',
    output: 'The function splits the string into an array, reverses the array, then joins it back.',
    confidence: 0.92,
    metadata: { model: 'gpt-4', tokens: 52 },
    success: true,
    timestamp: new Date()
  };

  memory.addTask(sessionId, task2, response2);
  console.log('✓ Added task 2');

  // Task 3: Error case
  const task3: Task = {
    taskId: 'task-003',
    taskType: 'factual',
    payload: {
      prompt: 'What is the capital of Atlantis?'
    }
  };

  const response3: ARCResponse = {
    taskId: 'task-003',
    output: null,
    confidence: 0,
    metadata: { model: 'gpt-4', error: 'No factual information available' },
    success: false,
    error: 'Cannot provide information about fictional locations',
    timestamp: new Date()
  };

  memory.addTask(sessionId, task3, response3);
  console.log('✓ Added task 3 (error case)');

  // Get full history
  console.log('\n--- Full History ---');
  const fullHistory = memory.getHistory(sessionId);
  console.log(`Total entries: ${fullHistory.length}`);
  fullHistory.forEach((entry, i) => {
    console.log(`  ${i + 1}. ${entry.task.taskType} - ${entry.response.success ? 'SUCCESS' : 'FAILED'}`);
  });

  // Get recent history
  console.log('\n--- Recent History (last 2) ---');
  const recentHistory = memory.getRecentHistory(sessionId, 2);
  console.log(`Recent entries: ${recentHistory.length}`);

  // Get filtered history
  console.log('\n--- Filtered History (success only) ---');
  const successOnly = memory.getHistory(sessionId, { successOnly: true });
  console.log(`Successful entries: ${successOnly.length}`);

  // Format for model
  console.log('\n--- Format for OpenAI ---');
  const openaiFormat = memory.formatForModel(sessionId, 10, 'openai');
  console.log(JSON.stringify(openaiFormat, null, 2));

  // Session statistics
  console.log('\n--- Session Statistics ---');
  const stats = memory.getSessionStats(sessionId);
  console.log(`Entries: ${stats?.entryCount}`);
  console.log(`Success rate: ${((stats?.successRate || 0) * 100).toFixed(1)}%`);
  console.log(`Created: ${stats?.createdAt?.toISOString()}`);
  console.log(`Task types: ${JSON.stringify(stats?.taskTypeDistribution)}`);

  // Session metadata
  console.log('\n--- Session Metadata ---');
  memory.setSessionMetadata(sessionId, 'userId', 'user-456');
  memory.setSessionMetadata(sessionId, 'preferences', { theme: 'dark', language: 'en' });
  const metadata = memory.getSessionMetadata(sessionId);
  console.log(JSON.stringify(metadata, null, 2));

  // Global statistics
  console.log('\n--- Global Statistics ---');
  const globalStats = memory.getGlobalStats();
  console.log(`Total sessions: ${globalStats.totalSessions}`);
  console.log(`Total entries: ${globalStats.totalEntries}`);
  console.log(`Memory usage: ~${globalStats.memoryUsageEstimateKB} KB`);

  // Export session
  console.log('\n--- Export Session ---');
  const exported = memory.exportSession(sessionId);
  console.log(`Exported session with ${exported?.entries.length} entries`);

  // Multiple sessions
  console.log('\n--- Multiple Sessions ---');
  const session2 = 'user-session-456';
  memory.addTask(session2, task1, response1);
  
  const activeSessions = memory.getActiveSessions();
  console.log(`Active sessions: ${activeSessions.join(', ')}`);

  // Clear session
  console.log('\n--- Clear Session ---');
  memory.clearSession(session2);
  console.log(`Session ${session2} cleared`);
  console.log(`Remaining sessions: ${memory.getActiveSessions().length}`);

  // Cleanup
  console.log('\n--- Cleanup ---');
  memory.destroy();
  console.log('Memory manager destroyed');

  console.log('\n=== Demo Complete ===');
}

// Run the demo
main().catch(console.error);
