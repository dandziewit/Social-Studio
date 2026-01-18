/**
 * SessionMemory: Generic session state and history management for ARC
 * 
 * Responsibilities:
 * - Store task-response pairs per session
 * - Provide conversation history for context-aware models
 * - Manage memory lifecycle (create, retrieve, clear, cleanup)
 * - Support filtering and summarization
 * 
 * This is model-agnostic and domain-agnostic - no therapy or application-specific logic.
 * 
 * FIXES APPLIED:
 * - Added global declarations for Node.js runtime (console, setInterval, clearInterval)
 * - All types properly imported and used
 */

import { Task, ARCResponse } from './types';

// TypeScript compatibility: Declare Node.js runtime globals
declare const console: any;
declare function setInterval(callback: () => void, ms: number): any;
declare function clearInterval(id: any): void;

interface SessionEntry {
  task: Task;
  response: ARCResponse;
  timestamp: Date;
}

interface SessionData {
  sessionId: string;
  entries: SessionEntry[];
  metadata: Record<string, any>;
  createdAt: Date;
  lastAccessedAt: Date;
}

interface SessionMemoryConfig {
  maxEntriesPerSession?: number;
  autoCleanupAfterMs?: number;
  enablePersistence?: boolean;
  compressionThreshold?: number;
}

export class SessionMemory {
  private sessions: Map<string, SessionData>;
  private config: Required<SessionMemoryConfig>;
  private cleanupInterval?: any; // NodeJS.Timeout type declared as any for compatibility

  constructor(config: SessionMemoryConfig = {}) {
    this.sessions = new Map();
    
    this.config = {
      maxEntriesPerSession: config.maxEntriesPerSession ?? 100,
      autoCleanupAfterMs: config.autoCleanupAfterMs ?? 3600000, // 1 hour default
      enablePersistence: config.enablePersistence ?? false,
      compressionThreshold: config.compressionThreshold ?? 50
    };

    // Start automatic cleanup if configured
    if (this.config.autoCleanupAfterMs > 0) {
      this.startAutoCleanup();
    }
  }

  /**
   * Add a task-response pair to a session
   * 
   * Creates session if it doesn't exist. Automatically manages memory limits.
   * 
   * @param sessionId - Unique identifier for the session
   * @param task - The task that was executed
   * @param response - The response from the adapter/orchestrator
   */
  addTask(sessionId: string, task: Task, response: ARCResponse): void {
    // Get or create session
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      session = {
        sessionId,
        entries: [],
        metadata: {},
        createdAt: new Date(),
        lastAccessedAt: new Date()
      };
      this.sessions.set(sessionId, session);
      console.log(`[SessionMemory] Created new session: ${sessionId}`);
    }

    // Add entry
    const entry: SessionEntry = {
      task,
      response,
      timestamp: new Date()
    };

    session.entries.push(entry);
    session.lastAccessedAt = new Date();

    // Enforce memory limits
    if (session.entries.length > this.config.maxEntriesPerSession) {
      const removed = session.entries.length - this.config.maxEntriesPerSession;
      session.entries = session.entries.slice(-this.config.maxEntriesPerSession);
      console.log(`[SessionMemory] Trimmed ${removed} old entries from session ${sessionId}`);
    }

    // Check if compression needed
    if (session.entries.length >= this.config.compressionThreshold) {
      console.log(`[SessionMemory] Session ${sessionId} approaching compression threshold`);
      // In production, implement summarization here
    }
  }

  /**
   * Retrieve complete history for a session
   * 
   * @param sessionId - The session to retrieve
   * @param options - Optional filtering/limiting parameters
   */
  getHistory(
    sessionId: string,
    options: {
      limit?: number;
      startIndex?: number;
      taskType?: string;
      successOnly?: boolean;
    } = {}
  ): SessionEntry[] {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return [];
    }

    // Update last accessed time
    session.lastAccessedAt = new Date();

    let entries = [...session.entries];

    // Apply filters
    if (options.taskType) {
      entries = entries.filter(e => e.task.taskType === options.taskType);
    }

    if (options.successOnly) {
      entries = entries.filter(e => e.response.success);
    }

    // Apply pagination
    const startIndex = options.startIndex ?? 0;
    const limit = options.limit ?? entries.length;
    
    return entries.slice(startIndex, startIndex + limit);
  }

  /**
   * Get the most recent N entries from a session
   * 
   * Useful for providing context to models with limited context windows.
   */
  getRecentHistory(sessionId: string, count: number = 10): SessionEntry[] {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return [];
    }

    session.lastAccessedAt = new Date();
    return session.entries.slice(-count);
  }

  /**
   * Format history as conversation context for language models
   * 
   * Converts task-response pairs into a format suitable for model input.
   * Can be customized per model type.
   * 
   * @param sessionId - The session to format
   * @param maxEntries - Maximum number of recent entries to include
   * @param format - Output format ('openai', 'anthropic', 'generic')
   */
  formatForModel(
    sessionId: string,
    maxEntries: number = 10,
    format: 'openai' | 'anthropic' | 'generic' = 'generic'
  ): any[] {
    const entries = this.getRecentHistory(sessionId, maxEntries);

    switch (format) {
      case 'openai':
        // OpenAI chat format: { role: 'user'|'assistant', content: string }
        return entries.flatMap(entry => [
          {
            role: 'user',
            content: entry.task.payload.prompt || entry.task.payload.content || ''
          },
          {
            role: 'assistant',
            content: entry.response.output || ''
          }
        ]);

      case 'anthropic':
        // Anthropic Claude format (similar to OpenAI but with different system handling)
        return entries.flatMap(entry => [
          {
            role: 'user',
            content: entry.task.payload.prompt || entry.task.payload.content || ''
          },
          {
            role: 'assistant',
            content: entry.response.output || ''
          }
        ]);

      case 'generic':
      default:
        // Generic format with full metadata
        return entries.map(entry => ({
          type: 'interaction',
          taskId: entry.task.taskId,
          taskType: entry.task.taskType,
          input: entry.task.payload,
          output: entry.response.output,
          success: entry.response.success,
          timestamp: entry.timestamp
        }));
    }
  }

  /**
   * Clear all history for a session
   * 
   * @param sessionId - The session to clear
   * @param keepMetadata - Whether to preserve session metadata
   */
  clearSession(sessionId: string, keepMetadata: boolean = false): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    if (keepMetadata) {
      // Clear entries but keep metadata
      session.entries = [];
      session.lastAccessedAt = new Date();
      console.log(`[SessionMemory] Cleared entries for session ${sessionId} (metadata preserved)`);
    } else {
      // Remove entire session
      this.sessions.delete(sessionId);
      console.log(`[SessionMemory] Deleted session ${sessionId}`);
    }

    return true;
  }

  /**
   * Update session metadata
   * 
   * Use this to store session-level information like:
   * - User preferences
   * - Session context
   * - Custom tags
   * - Performance metrics
   */
  setSessionMetadata(sessionId: string, key: string, value: any): void {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      // Create session if it doesn't exist
      this.sessions.set(sessionId, {
        sessionId,
        entries: [],
        metadata: { [key]: value },
        createdAt: new Date(),
        lastAccessedAt: new Date()
      });
    } else {
      session.metadata[key] = value;
      session.lastAccessedAt = new Date();
    }
  }

  /**
   * Get session metadata
   */
  getSessionMetadata(sessionId: string): Record<string, any> | null {
    const session = this.sessions.get(sessionId);
    return session ? session.metadata : null;
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): {
    exists: boolean;
    entryCount: number;
    successRate: number;
    createdAt?: Date;
    lastAccessedAt?: Date;
    taskTypeDistribution: Record<string, number>;
  } | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return {
        exists: false,
        entryCount: 0,
        successRate: 0,
        taskTypeDistribution: {}
      };
    }

    const successCount = session.entries.filter(e => e.response.success).length;
    const successRate = session.entries.length > 0 
      ? successCount / session.entries.length 
      : 0;

    // Calculate task type distribution
    const taskTypeDistribution: Record<string, number> = {};
    for (const entry of session.entries) {
      const type = entry.task.taskType;
      taskTypeDistribution[type] = (taskTypeDistribution[type] || 0) + 1;
    }

    return {
      exists: true,
      entryCount: session.entries.length,
      successRate,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt,
      taskTypeDistribution
    };
  }

  /**
   * Get all active session IDs
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Check if a session exists
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Export session data (useful for persistence or analysis)
   */
  exportSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    return session ? JSON.parse(JSON.stringify(session)) : null;
  }

  /**
   * Import session data (for loading from persistence)
   */
  importSession(sessionData: SessionData): void {
    this.sessions.set(sessionData.sessionId, {
      ...sessionData,
      createdAt: new Date(sessionData.createdAt),
      lastAccessedAt: new Date(sessionData.lastAccessedAt),
      entries: sessionData.entries.map(e => ({
        ...e,
        timestamp: new Date(e.timestamp)
      }))
    });
    console.log(`[SessionMemory] Imported session ${sessionData.sessionId} with ${sessionData.entries.length} entries`);
  }

  /**
   * Cleanup old/inactive sessions
   * 
   * Removes sessions that haven't been accessed within the threshold.
   */
  cleanupInactiveSessions(): number {
    const now = Date.now();
    const threshold = this.config.autoCleanupAfterMs;
    let removed = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveMs = now - session.lastAccessedAt.getTime();
      
      if (inactiveMs > threshold) {
        this.sessions.delete(sessionId);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[SessionMemory] Cleaned up ${removed} inactive sessions`);
    }

    return removed;
  }

  /**
   * Start automatic cleanup interval
   */
  private startAutoCleanup(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 3600000);

    console.log('[SessionMemory] Auto-cleanup enabled');
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
      console.log('[SessionMemory] Auto-cleanup disabled');
    }
  }

  /**
   * Get overall memory statistics
   */
  getGlobalStats(): {
    totalSessions: number;
    totalEntries: number;
    oldestSession: Date | null;
    newestSession: Date | null;
    memoryUsageEstimateKB: number;
  } {
    let totalEntries = 0;
    let oldestSession: Date | null = null;
    let newestSession: Date | null = null;

    for (const session of this.sessions.values()) {
      totalEntries += session.entries.length;
      
      if (!oldestSession || session.createdAt < oldestSession) {
        oldestSession = session.createdAt;
      }
      
      if (!newestSession || session.createdAt > newestSession) {
        newestSession = session.createdAt;
      }
    }

    // Rough estimate of memory usage
    const estimatedSizeBytes = JSON.stringify(Array.from(this.sessions.values())).length;
    const memoryUsageEstimateKB = Math.round(estimatedSizeBytes / 1024);

    return {
      totalSessions: this.sessions.size,
      totalEntries,
      oldestSession,
      newestSession,
      memoryUsageEstimateKB
    };
  }

  /**
   * Destroy the memory manager and cleanup resources
   */
  destroy(): void {
    this.stopAutoCleanup();
    this.sessions.clear();
    console.log('[SessionMemory] Memory manager destroyed');
  }
}

/**
 * INTEGRATION GUIDE FOR MODEL-SPECIFIC MEMORIES:
 * 
 * 1. EXTEND WITH MODEL-SPECIFIC CONTEXT:
 * 
 * class ModelAwareSessionMemory extends SessionMemory {
 *   private modelContexts: Map<string, ModelContext>;
 * 
 *   addModelContext(sessionId: string, model: string, context: any) {
 *     // Store model-specific context (embeddings, tokens, etc.)
 *   }
 * 
 *   getContextForModel(sessionId: string, model: string) {
 *     // Retrieve and format context for specific model
 *   }
 * }
 * 
 * 2. SAFE MEMORY PATTERNS:
 * 
 * - NEVER store sensitive data (passwords, API keys, PII) in memory
 * - Implement encryption for sensitive session data
 * - Use separate memory spaces for different security contexts
 * - Implement memory access controls per session
 * - Add audit logging for sensitive operations
 * 
 * 3. ADVANCED FEATURES:
 * 
 * - Vector embeddings for semantic history search
 * - Automatic summarization for long sessions
 * - Cross-session learning (with privacy controls)
 * - Multi-tenant isolation
 * - Distributed session storage
 * 
 * 4. PERSISTENCE STRATEGIES:
 * 
 * // Redis integration
 * class RedisSessionMemory extends SessionMemory {
 *   async save(sessionId: string) {
 *     const data = this.exportSession(sessionId);
 *     await redis.set(`session:${sessionId}`, JSON.stringify(data));
 *   }
 * 
 *   async load(sessionId: string) {
 *     const data = await redis.get(`session:${sessionId}`);
 *     if (data) this.importSession(JSON.parse(data));
 *   }
 * }
 * 
 * 5. MODEL-SPECIFIC CONTEXT FORMATTING:
 * 
 * // GPT-4 with function calling
 * formatForGPT4WithFunctions(sessionId: string): {
 *   messages: any[];
 *   functions: any[];
 * }
 * 
 * // Gemini with multi-modal
 * formatForGeminiMultiModal(sessionId: string): {
 *   contents: Array<{ parts: any[] }>;
 * }
 * 
 * 6. MEMORY OPTIMIZATION:
 * 
 * - Implement sliding window for long conversations
 * - Use compression for old entries
 * - Store only relevant context (not full responses)
 * - Implement token counting for context window management
 * 
 * 7. PRIVACY-SAFE PATTERNS:
 * 
 * class PrivacyAwareMemory extends SessionMemory {
 *   addTask(sessionId: string, task: Task, response: ARCResponse) {
 *     // Sanitize before storing
 *     const sanitizedTask = this.removePII(task);
 *     const sanitizedResponse = this.removePII(response);
 *     super.addTask(sessionId, sanitizedTask, sanitizedResponse);
 *   }
 * 
 *   private removePII(data: any): any {
 *     // Implement PII detection and removal
 *   }
 * }
 */

export default SessionMemory;
