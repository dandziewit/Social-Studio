/**
 * Logger Module Demo - Complete usage examples
 * 
 * FIXES APPLIED:
 * - Added global declarations for console and setTimeout
 */

import Logger, { getLogger, LogLevel } from './Logger';
import { Task, ARCResponse } from './types';

// TypeScript compatibility: Declare Node.js runtime globals
declare const console: any;
declare function setTimeout(callback: (...args: any[]) => void, ms: number): any;

console.log('=== ARC Logger Demo ===\n');

// Initialize logger
const logger = new Logger({
  minLevel: LogLevel.DEBUG,
  enableConsole: true,
  enableMetrics: true,
  prettyPrint: false
});

// Example 1: Basic logging
console.log('--- Example 1: Basic Logging ---');
logger.logInfo('ARC platform started');
logger.logDebug('Debug information', { config: { mode: 'development' } });
logger.logWarn('Rate limit approaching', { current: 95, limit: 100 });
logger.logError('Connection failed', new Error('Network timeout'));

// Example 2: Logging with context
console.log('\n--- Example 2: Contextual Logging ---');
logger.logInfo(
  'User submitted task',
  { taskType: 'coding', promptLength: 150 },
  { userId: 'user-123', sessionId: 'session-456', taskId: 'task-001' }
);

// Example 3: Model performance tracking
console.log('\n--- Example 3: Model Performance Tracking ---');

// Simulate model call
const mockTask: Task = {
  taskId: 'task-001',
  taskType: 'reasoning',
  payload: { prompt: 'Solve this math problem' },
  userId: 'user-123',
  metadata: { sessionId: 'session-456' }
};

const mockResponse: ARCResponse = {
  taskId: 'task-001',
  output: 'The answer is 42',
  confidence: 0.95,
  metadata: {
    adapter: 'gpt-4',
    model: 'gpt-4-turbo-preview',
    tokens: { prompt: 10, completion: 15, total: 25 }
  },
  success: true,
  timestamp: new Date()
};

logger.logModelPerformance({
  adapter: 'gpt-4',
  model: 'gpt-4-turbo-preview',
  taskId: mockTask.taskId,
  taskType: mockTask.taskType,
  startTime: new Date(Date.now() - 1250),
  endTime: new Date(),
  latencyMs: 1250,
  success: true,
  confidence: 0.95,
  tokensUsed: 25,
  metadata: {
    sessionId: 'session-456',
    userId: 'user-123'
  }
});

console.log('✓ Model performance logged');

// Example 4: Using startTask helper
console.log('\n--- Example 4: Task Tracking Helper ---');

const task2: Task = {
  taskId: 'task-002',
  taskType: 'coding',
  payload: { prompt: 'Write a function' },
  userId: 'user-123',
  metadata: { sessionId: 'session-456' }
};

const completeTask = logger.startTask(task2, 'gemini', 'gemini-pro');

// Simulate async work
await new Promise(resolve => setTimeout(resolve, 800));

const response2: ARCResponse = {
  taskId: 'task-002',
  output: 'function example() { return true; }',
  confidence: 0.88,
  metadata: { adapter: 'gemini' },
  success: true,
  timestamp: new Date()
};

completeTask(response2);
console.log('✓ Task completion logged automatically');

// Example 5: Simulating multiple model calls
console.log('\n--- Example 5: Multiple Model Calls ---');

const adapters = ['gpt-4', 'gemini', 'claude', 'qwen'];
const taskTypes = ['reasoning', 'coding', 'creative', 'factual'];

for (let i = 0; i < 10; i++) {
  const adapter = adapters[i % adapters.length];
  const taskType = taskTypes[i % taskTypes.length];
  const success = Math.random() > 0.2; // 80% success rate
  const latency = Math.floor(Math.random() * 2000) + 500;
  
  logger.logModelPerformance({
    adapter,
    taskId: `task-${100 + i}`,
    taskType,
    startTime: new Date(Date.now() - latency),
    endTime: new Date(),
    latencyMs: latency,
    success,
    confidence: success ? Math.random() * 0.3 + 0.7 : undefined,
    tokensUsed: Math.floor(Math.random() * 500) + 50,
    error: success ? undefined : 'Rate limit exceeded',
    metadata: { sessionId: 'session-456' }
  });
}

console.log('✓ Logged 10 model calls');

// Example 6: Session tracking
console.log('\n--- Example 6: Session Activity ---');

const sessionActivity = logger.getSessionActivity('session-456');
if (sessionActivity) {
  console.log('Session ID:', sessionActivity.sessionId);
  console.log('Task count:', sessionActivity.taskCount);
  console.log('Success rate:', `${(sessionActivity.successCount / sessionActivity.taskCount * 100).toFixed(1)}%`);
  console.log('Average latency:', `${sessionActivity.averageLatencyMs.toFixed(0)}ms`);
  console.log('Adapters used:', sessionActivity.adaptersUsed.join(', '));
  console.log('Duration:', `${Math.floor((Date.now() - sessionActivity.startTime.getTime()) / 1000)}s`);
}

// Example 7: Retrieving logs
console.log('\n--- Example 7: Retrieving Logs ---');

const recentErrors = logger.getLogs(5, LogLevel.ERROR);
console.log(`Recent errors: ${recentErrors.length}`);

const modelLogs = logger.getLogs(undefined, undefined, 'model-performance');
console.log(`Model performance logs: ${modelLogs.length}`);

// Example 8: Performance metrics analysis
console.log('\n--- Example 8: Performance Metrics ---');

const allMetrics = logger.getPerformanceMetrics();
console.log(`Total metrics: ${allMetrics.length}`);

const gptMetrics = logger.getPerformanceMetrics('gpt-4');
const avgGptLatency = gptMetrics.reduce((sum, m) => sum + m.latencyMs, 0) / gptMetrics.length;
console.log(`GPT-4 calls: ${gptMetrics.length}, avg latency: ${avgGptLatency.toFixed(0)}ms`);

const codingMetrics = logger.getPerformanceMetrics(undefined, 'coding');
console.log(`Coding tasks: ${codingMetrics.length}`);

// Example 9: Logger statistics
console.log('\n--- Example 9: Logger Statistics ---');

const stats = logger.getStats();
console.log('Total logs:', stats.totalLogs);
console.log('Logs by level:', stats.logsByLevel);
console.log('Total model calls:', stats.totalModelCalls);
console.log('Total failures:', stats.totalFailures);
console.log('Average latency:', `${stats.averageLatency.toFixed(0)}ms`);
console.log('Active sessions:', stats.activeSessions);
console.log('Uptime:', `${(stats.uptime / 1000).toFixed(1)}s`);

// Example 10: All sessions
console.log('\n--- Example 10: All Sessions ---');

const allSessions = logger.getAllSessions();
console.log(`Active sessions: ${allSessions.length}`);
allSessions.forEach(session => {
  const successRate = session.successCount / session.taskCount * 100;
  console.log(`  ${session.sessionId}: ${session.taskCount} tasks, ${successRate.toFixed(0)}% success`);
});

// Example 11: Export logs
console.log('\n--- Example 11: Export Data ---');

const exportedData = logger.exportLogs();
console.log('Exported data:');
console.log(`  - Logs: ${exportedData.logs.length}`);
console.log(`  - Metrics: ${exportedData.metrics.length}`);
console.log(`  - Sessions: ${exportedData.sessions.length}`);
console.log(`  - Stats:`, exportedData.stats);

// Example 12: Log level changes
console.log('\n--- Example 12: Dynamic Log Level ---');

logger.setLogLevel(LogLevel.WARN);
logger.logDebug('This will not appear'); // Below threshold
logger.logInfo('This will not appear either'); // Below threshold
logger.logWarn('This will appear'); // At or above threshold

logger.setLogLevel(LogLevel.DEBUG); // Reset

// Example 13: Error logging with stack traces
console.log('\n--- Example 13: Error with Stack Trace ---');

try {
  throw new Error('Simulated error for demo');
} catch (error) {
  logger.logError(
    'Caught exception during task processing',
    error as Error,
    { taskId: 'task-error', sessionId: 'session-456' }
  );
}

// Example 14: Singleton pattern
console.log('\n--- Example 14: Global Logger ---');

const logger1 = getLogger();
const logger2 = getLogger();

console.log('Same instance:', logger1 === logger2);
logger1.logInfo('Using global logger');

// Example 15: Cleanup old data
console.log('\n--- Example 15: Data Cleanup ---');

console.log('Before cleanup:', logger.getStats().totalLogs, 'logs');
// Clear data older than 1 second (for demo purposes)
await new Promise(resolve => setTimeout(resolve, 1100));
logger.clearOldData(1000);
console.log('After cleanup:', logger.getStats().totalLogs, 'logs');

console.log('\n=== Demo Complete ===');
console.log('\nFinal Statistics:');
const finalStats = logger.getStats();
console.log(JSON.stringify(finalStats, null, 2));
