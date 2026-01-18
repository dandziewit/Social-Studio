/**
 * Express API Server for ARC Platform
 * 
 * Provides HTTP endpoints for task submission and processing.
 * Can be integrated with any frontend client (React, Vue, vanilla JS, etc.)
 * 
 * FIXES APPLIED:
 * - Added global declarations for Node.js runtime (console, process)
 * - Added type declarations for express and cors modules
 * 
 * NOTE: Requires dependencies to be installed:
 * npm install express cors
 * npm install --save-dev @types/express @types/cors @types/node
 */

// TypeScript compatibility: Declare Node.js runtime globals
declare const console: any;
declare const process: any;

// @ts-ignore - Suppress module resolution errors if dependencies not yet installed
import express, { Request, Response, NextFunction } from 'express';
// @ts-ignore - Suppress module resolution errors if dependencies not yet installed
import cors from 'cors';
import { Task, ARCResponse } from './types';
import Orchestrator from './Orchestrator';
import GPTAdapter from './GPTAdapter';
import SessionMemory from './SessionMemory';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(cors()); // Enable CORS for all origins (configure for production)

// Initialize ARC components
const orchestrator = new Orchestrator({
  maxRetries: 2,
  enableFallback: true,
  defaultMergeStrategy: { type: 'best' }
});

const sessionMemory = new SessionMemory({
  maxEntriesPerSession: 100,
  autoCleanupAfterMs: 3600000 // 1 hour
});

// Register adapters
// In production, load API keys from environment variables
const gptAdapter = new GPTAdapter('gpt-4', {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-4-turbo-preview',
  temperature: 0.7,
  maxTokens: 2000
});

orchestrator.addAdapter(gptAdapter);

// Add other adapters as needed:
// orchestrator.addAdapter(new GeminiAdapter(...));
// orchestrator.addAdapter(new ClaudeAdapter(...));

/**
 * POST /api/task
 * 
 * Main endpoint for task processing.
 * 
 * Request body:
 * {
 *   "task": {
 *     "taskId": "unique-id",
 *     "taskType": "reasoning|coding|creative|factual|multi-modal",
 *     "payload": {
 *       "prompt": "Your prompt here",
 *       "systemPrompt": "Optional system prompt"
 *     },
 *     "metadata": { ... }
 *   },
 *   "sessionId": "optional-session-id"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "taskId": "unique-id",
 *     "output": "Model response",
 *     "confidence": 0.95,
 *     "metadata": { ... },
 *     "timestamp": "2026-01-16T..."
 *   }
 * }
 */
app.post('/api/task', async (req: Request, res: Response) => {
  try {
    const { task, sessionId } = req.body;

    // Validate request
    if (!task) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: task'
      });
    }

    if (!task.taskId || !task.payload) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task format. Required: taskId, payload'
      });
    }

    // Log request (in production, use proper logging)
    console.log(`[API] Processing task ${task.taskId} (type: ${task.taskType || 'auto'})`);

    // Process task through orchestrator
    const startTime = Date.now();
    const response: ARCResponse = await orchestrator.routeTask(task);
    const processingTime = Date.now() - startTime;

    // Store in session memory if sessionId provided
    if (sessionId) {
      sessionMemory.addTask(sessionId, task, response);
    }

    // Return response
    if (response.success) {
      return res.status(200).json({
        success: true,
        data: {
          taskId: response.taskId,
          output: response.output,
          confidence: response.confidence,
          metadata: {
            ...response.metadata,
            processingTimeMs: processingTime
          },
          timestamp: response.timestamp
        }
      });
    } else {
      // Task failed but request was valid
      return res.status(200).json({
        success: false,
        error: response.error,
        data: {
          taskId: response.taskId,
          metadata: response.metadata
        }
      });
    }

  } catch (error) {
    console.error('[API] Error processing task:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/tasks/batch
 * 
 * Process multiple tasks in parallel.
 * 
 * Request body:
 * {
 *   "tasks": [Task, Task, ...],
 *   "sessionId": "optional-session-id"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "responses": [ARCResponse, ...],
 *     "summary": {
 *       "total": 5,
 *       "successful": 4,
 *       "failed": 1
 *     }
 *   }
 * }
 */
app.post('/api/tasks/batch', async (req: Request, res: Response) => {
  try {
    const { tasks, sessionId } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: tasks must be a non-empty array'
      });
    }

    console.log(`[API] Processing batch of ${tasks.length} tasks`);

    const startTime = Date.now();
    const responses = await orchestrator.routeTasksBatch(tasks);
    const processingTime = Date.now() - startTime;

    // Store in session memory if provided
    if (sessionId) {
      tasks.forEach((task, i) => {
        sessionMemory.addTask(sessionId, task, responses[i]);
      });
    }

    // Calculate summary
    const successful = responses.filter(r => r.success).length;
    const failed = responses.length - successful;

    return res.status(200).json({
      success: true,
      data: {
        responses,
        summary: {
          total: responses.length,
          successful,
          failed,
          processingTimeMs: processingTime
        }
      }
    });

  } catch (error) {
    console.error('[API] Error processing batch:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/session/:sessionId/history
 * 
 * Retrieve conversation history for a session.
 * 
 * Query parameters:
 * - limit: Maximum number of entries to return
 * - successOnly: Filter only successful responses
 * - taskType: Filter by task type
 */
app.get('/api/session/:sessionId/history', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { limit, successOnly, taskType } = req.query;

    const options = {
      limit: limit ? parseInt(limit as string) : undefined,
      successOnly: successOnly === 'true',
      taskType: taskType as string | undefined
    };

    const history = sessionMemory.getHistory(sessionId, options);

    return res.status(200).json({
      success: true,
      data: {
        sessionId,
        history,
        count: history.length
      }
    });

  } catch (error) {
    console.error('[API] Error retrieving history:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/session/:sessionId/stats
 * 
 * Get statistics for a session.
 */
app.get('/api/session/:sessionId/stats', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const stats = sessionMemory.getSessionStats(sessionId);

    if (!stats?.exists) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('[API] Error retrieving stats:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * DELETE /api/session/:sessionId
 * 
 * Clear a session's history.
 */
app.delete('/api/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const cleared = sessionMemory.clearSession(sessionId);

    if (!cleared) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Session ${sessionId} cleared`
    });

  } catch (error) {
    console.error('[API] Error clearing session:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/health
 * 
 * Health check endpoint.
 */
app.get('/api/health', (req: Request, res: Response) => {
  const status = orchestrator.getStatus();
  const memoryStats = sessionMemory.getGlobalStats();

  res.status(200).json({
    success: true,
    status: 'healthy',
    orchestrator: status,
    memory: memoryStats,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/status
 * 
 * Get detailed system status.
 */
app.get('/api/status', (req: Request, res: Response) => {
  const orchestratorStatus = orchestrator.getStatus();
  const memoryStats = sessionMemory.getGlobalStats();
  const activeSessions = sessionMemory.getActiveSessions();

  res.status(200).json({
    success: true,
    data: {
      orchestrator: orchestratorStatus,
      memory: {
        ...memoryStats,
        activeSessions: activeSessions.length
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Error handling middleware
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[API] Unhandled error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

/**
 * Start server
 */
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   ARC Platform API Server Started     ║
╠════════════════════════════════════════╣
║   Port: ${PORT}                       
║   Environment: ${process.env.NODE_ENV || 'development'}
║   Adapters: ${orchestrator.getStatus().adapters.length}
╚════════════════════════════════════════╝
  `);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('[API] SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    console.log('[API] Server closed');
    sessionMemory.destroy();
    process.exit(0);
  });
});

export default app;

/**
 * BROWSER CLIENT INTEGRATION GUIDE:
 * 
 * 1. VANILLA JAVASCRIPT:
 * 
 * async function submitTask(prompt, taskType = 'default') {
 *   const response = await fetch('http://localhost:3000/api/task', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       task: {
 *         taskId: `task-${Date.now()}`,
 *         taskType: taskType,
 *         payload: { prompt: prompt }
 *       },
 *       sessionId: 'user-session-123'
 *     })
 *   });
 *   
 *   const data = await response.json();
 *   return data;
 * }
 * 
 * // Usage
 * submitTask('Explain quantum computing', 'reasoning')
 *   .then(result => console.log(result.data.output));
 * 
 * 
 * 2. REACT COMPONENT:
 * 
 * import { useState } from 'react';
 * 
 * function ARCClient() {
 *   const [response, setResponse] = useState(null);
 *   const [loading, setLoading] = useState(false);
 * 
 *   const submitTask = async (prompt) => {
 *     setLoading(true);
 *     try {
 *       const res = await fetch('http://localhost:3000/api/task', {
 *         method: 'POST',
 *         headers: { 'Content-Type': 'application/json' },
 *         body: JSON.stringify({
 *           task: {
 *             taskId: `task-${Date.now()}`,
 *             taskType: 'default',
 *             payload: { prompt }
 *           },
 *           sessionId: sessionStorage.getItem('sessionId')
 *         })
 *       });
 *       
 *       const data = await res.json();
 *       setResponse(data.data);
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={() => submitTask('Hello!')}>
 *         Send Task
 *       </button>
 *       {loading && <p>Processing...</p>}
 *       {response && <p>{response.output}</p>}
 *     </div>
 *   );
 * }
 * 
 * 
 * 3. AXIOS/FETCH WRAPPER:
 * 
 * class ARCClient {
 *   constructor(baseUrl, sessionId) {
 *     this.baseUrl = baseUrl;
 *     this.sessionId = sessionId;
 *   }
 * 
 *   async submitTask(prompt, taskType = 'default') {
 *     const response = await fetch(`${this.baseUrl}/api/task`, {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({
 *         task: {
 *           taskId: `task-${Date.now()}`,
 *           taskType,
 *           payload: { prompt }
 *         },
 *         sessionId: this.sessionId
 *       })
 *     });
 *     
 *     return response.json();
 *   }
 * 
 *   async getHistory() {
 *     const response = await fetch(
 *       `${this.baseUrl}/api/session/${this.sessionId}/history`
 *     );
 *     return response.json();
 *   }
 * 
 *   async clearSession() {
 *     await fetch(`${this.baseUrl}/api/session/${this.sessionId}`, {
 *       method: 'DELETE'
 *     });
 *   }
 * }
 * 
 * // Usage
 * const client = new ARCClient('http://localhost:3000', 'user-123');
 * const result = await client.submitTask('Write a haiku', 'creative');
 * 
 * 
 * 4. STREAMING RESPONSES (for future implementation):
 * 
 * // Server-Sent Events (SSE)
 * app.post('/api/task/stream', async (req, res) => {
 *   res.setHeader('Content-Type', 'text/event-stream');
 *   res.setHeader('Cache-Control', 'no-cache');
 *   res.setHeader('Connection', 'keep-alive');
 *   
 *   // Stream tokens as they arrive
 *   for await (const token of processTaskStream(req.body.task)) {
 *     res.write(`data: ${JSON.stringify({ token })}\n\n`);
 *   }
 *   
 *   res.end();
 * });
 * 
 * // Client
 * const eventSource = new EventSource('/api/task/stream');
 * eventSource.onmessage = (e) => {
 *   const { token } = JSON.parse(e.data);
 *   // Update UI with streaming token
 * };
 * 
 * 
 * 5. ERROR HANDLING:
 * 
 * async function safeSubmitTask(prompt) {
 *   try {
 *     const response = await fetch('/api/task', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({
 *         task: {
 *           taskId: `task-${Date.now()}`,
 *           payload: { prompt }
 *         }
 *       })
 *     });
 *     
 *     if (!response.ok) {
 *       throw new Error(`HTTP ${response.status}`);
 *     }
 *     
 *     const data = await response.json();
 *     
 *     if (!data.success) {
 *       throw new Error(data.error);
 *     }
 *     
 *     return data.data;
 *     
 *   } catch (error) {
 *     console.error('Task failed:', error);
 *     return { error: error.message };
 *   }
 * }
 * 
 * 
 * 6. CORS CONFIGURATION (for production):
 * 
 * const corsOptions = {
 *   origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
 *   credentials: true,
 *   optionsSuccessStatus: 200
 * };
 * 
 * app.use(cors(corsOptions));
 * 
 * 
 * 7. RATE LIMITING (recommended for production):
 * 
 * import rateLimit from 'express-rate-limit';
 * 
 * const limiter = rateLimit({
 *   windowMs: 15 * 60 * 1000, // 15 minutes
 *   max: 100 // limit each IP to 100 requests per windowMs
 * });
 * 
 * app.use('/api/', limiter);
 * 
 * 
 * 8. AUTHENTICATION (example with JWT):
 * 
 * import jwt from 'jsonwebtoken';
 * 
 * const authMiddleware = (req, res, next) => {
 *   const token = req.headers.authorization?.split(' ')[1];
 *   
 *   if (!token) {
 *     return res.status(401).json({ error: 'No token provided' });
 *   }
 *   
 *   try {
 *     const decoded = jwt.verify(token, process.env.JWT_SECRET);
 *     req.user = decoded;
 *     next();
 *   } catch (error) {
 *     return res.status(401).json({ error: 'Invalid token' });
 *   }
 * };
 * 
 * app.post('/api/task', authMiddleware, async (req, res) => {
 *   // Protected endpoint
 * });
 */
