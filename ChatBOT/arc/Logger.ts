/**
 * Logger Module for ARC Platform
 * 
 * Provides structured logging for monitoring, debugging, and analytics.
 * Tracks model calls, performance metrics, failures, and session activity.
 * 
 * DESIGN PRINCIPLES:
 * - Model-agnostic and domain-agnostic
 * - Structured logging with consistent format
 * - Performance tracking built-in
 * - Easy integration with external monitoring services
 * - Thread-safe and async-friendly
 * 
 * FIXES APPLIED:
 * - Added global declaration for console
 */

import { Task, ARCResponse } from './types';

// TypeScript compatibility: Declare Node.js runtime globals
declare const console: any;

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, any>;
  context?: {
    taskId?: string;
    sessionId?: string;
    userId?: string;
    requestId?: string;
  };
}

/**
 * Model performance metrics
 */
export interface ModelPerformance {
  adapter: string;
  model?: string;
  taskId: string;
  taskType: string;
  startTime: Date;
  endTime: Date;
  latencyMs: number;
  success: boolean;
  confidence?: number;
  tokensUsed?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Session activity tracking
 */
export interface SessionActivity {
  sessionId: string;
  userId?: string;
  startTime: Date;
  lastActivityTime: Date;
  taskCount: number;
  successCount: number;
  failureCount: number;
  totalLatencyMs: number;
  averageLatencyMs: number;
  adaptersUsed: string[];
}

/**
 * Logger statistics
 */
export interface LoggerStats {
  totalLogs: number;
  logsByLevel: Record<string, number>;
  totalModelCalls: number;
  totalFailures: number;
  averageLatency: number;
  activeSessions: number;
  uptime: number;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  minLevel?: LogLevel;
  enableConsole?: boolean;
  enableFile?: boolean;
  filePath?: string;
  maxEntries?: number;
  enableMetrics?: boolean;
  prettyPrint?: boolean;
}

/**
 * Logger class for ARC platform
 */
export class Logger {
  private config: Required<LoggerConfig>;
  private logs: LogEntry[] = [];
  private performanceMetrics: ModelPerformance[] = [];
  private sessionTracking: Map<string, SessionActivity> = new Map();
  private startTime: Date;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      minLevel: config.minLevel ?? LogLevel.INFO,
      enableConsole: config.enableConsole ?? true,
      enableFile: config.enableFile ?? false,
      filePath: config.filePath ?? './arc-logs.json',
      maxEntries: config.maxEntries ?? 10000,
      enableMetrics: config.enableMetrics ?? true,
      prettyPrint: config.prettyPrint ?? false
    };

    this.startTime = new Date();
  }

  /**
   * Log informational message
   * 
   * @param message - Log message
   * @param data - Additional structured data
   * @param context - Contextual identifiers
   */
  logInfo(
    message: string,
    data?: Record<string, any>,
    context?: LogEntry['context']
  ): void {
    this.log(LogLevel.INFO, 'general', message, data, context);
  }

  /**
   * Log warning message
   * 
   * @param message - Warning message
   * @param data - Additional structured data
   * @param context - Contextual identifiers
   */
  logWarn(
    message: string,
    data?: Record<string, any>,
    context?: LogEntry['context']
  ): void {
    this.log(LogLevel.WARN, 'general', message, data, context);
  }

  /**
   * Log error message
   * 
   * @param message - Error message
   * @param error - Error object or additional data
   * @param context - Contextual identifiers
   */
  logError(
    message: string,
    error?: Error | Record<string, any>,
    context?: LogEntry['context']
  ): void {
    const data = error instanceof Error
      ? {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack
        }
      : error;

    this.log(LogLevel.ERROR, 'error', message, data, context);
  }

  /**
   * Log debug message (only if debug level enabled)
   * 
   * @param message - Debug message
   * @param data - Additional structured data
   * @param context - Contextual identifiers
   */
  logDebug(
    message: string,
    data?: Record<string, any>,
    context?: LogEntry['context']
  ): void {
    this.log(LogLevel.DEBUG, 'debug', message, data, context);
  }

  /**
   * Log model performance metrics
   * 
   * @param metrics - Performance data from model execution
   */
  logModelPerformance(metrics: ModelPerformance): void {
    if (!this.config.enableMetrics) return;

    this.performanceMetrics.push(metrics);

    // Enforce max entries
    if (this.performanceMetrics.length > this.config.maxEntries) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.config.maxEntries);
    }

    // Update session tracking
    if (metrics.metadata?.sessionId) {
      this.trackSessionActivity(
        metrics.metadata.sessionId,
        metrics.adapter,
        metrics.latencyMs,
        metrics.success,
        metrics.metadata.userId
      );
    }

    // Log as structured entry
    this.log(
      metrics.success ? LogLevel.INFO : LogLevel.ERROR,
      'model-performance',
      `Model call ${metrics.success ? 'succeeded' : 'failed'}`,
      {
        adapter: metrics.adapter,
        model: metrics.model,
        taskType: metrics.taskType,
        latencyMs: metrics.latencyMs,
        success: metrics.success,
        confidence: metrics.confidence,
        tokensUsed: metrics.tokensUsed,
        error: metrics.error
      },
      { taskId: metrics.taskId, sessionId: metrics.metadata?.sessionId }
    );
  }

  /**
   * Track task start time and return completion handler
   * 
   * Usage:
   * const complete = logger.startTask(task, 'gpt-4');
   * const response = await adapter.call(task);
   * complete(response);
   */
  startTask(
    task: Task,
    adapterName: string,
    model?: string
  ): (response: ARCResponse) => void {
    const startTime = new Date();

    this.logDebug('Task started', {
      taskId: task.taskId,
      taskType: task.taskType,
      adapter: adapterName
    }, {
      taskId: task.taskId,
      sessionId: task.metadata?.sessionId,
      userId: task.userId
    });

    return (response: ARCResponse) => {
      const endTime = new Date();
      const latencyMs = endTime.getTime() - startTime.getTime();

      const metrics: ModelPerformance = {
        adapter: adapterName,
        model,
        taskId: task.taskId,
        taskType: task.taskType,
        startTime,
        endTime,
        latencyMs,
        success: response.success,
        confidence: response.confidence,
        tokensUsed: response.metadata?.tokens?.total,
        error: response.error,
        metadata: {
          sessionId: task.metadata?.sessionId,
          userId: task.userId
        }
      };

      this.logModelPerformance(metrics);
    };
  }

  /**
   * Track session activity
   */
  private trackSessionActivity(
    sessionId: string,
    adapter: string,
    latencyMs: number,
    success: boolean,
    userId?: string
  ): void {
    let session = this.sessionTracking.get(sessionId);

    if (!session) {
      session = {
        sessionId,
        userId,
        startTime: new Date(),
        lastActivityTime: new Date(),
        taskCount: 0,
        successCount: 0,
        failureCount: 0,
        totalLatencyMs: 0,
        averageLatencyMs: 0,
        adaptersUsed: []
      };
      this.sessionTracking.set(sessionId, session);
    }

    // Update metrics
    session.lastActivityTime = new Date();
    session.taskCount++;
    session.totalLatencyMs += latencyMs;
    session.averageLatencyMs = session.totalLatencyMs / session.taskCount;

    if (success) {
      session.successCount++;
    } else {
      session.failureCount++;
    }

    if (!session.adaptersUsed.includes(adapter)) {
      session.adaptersUsed.push(adapter);
    }
  }

  /**
   * Get session activity summary
   */
  getSessionActivity(sessionId: string): SessionActivity | null {
    return this.sessionTracking.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): SessionActivity[] {
    return Array.from(this.sessionTracking.values());
  }

  /**
   * Core logging function
   */
  private log(
    level: LogLevel,
    category: string,
    message: string,
    data?: Record<string, any>,
    context?: LogEntry['context']
  ): void {
    // Check minimum log level
    if (level < this.config.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      context
    };

    // Store log entry
    this.logs.push(entry);

    // Enforce max entries
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(-this.config.maxEntries);
    }

    // Console output
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // File output (in production, implement proper file logging)
    if (this.config.enableFile) {
      this.outputToFile(entry);
    }
  }

  /**
   * Output log to console with formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${levelName}] [${entry.category}]`;

    // Color coding based on level (Node.js console colors)
    const colors: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: '\x1b[36m',   // Cyan
      [LogLevel.INFO]: '\x1b[32m',    // Green
      [LogLevel.WARN]: '\x1b[33m',    // Yellow
      [LogLevel.ERROR]: '\x1b[31m',   // Red
      [LogLevel.FATAL]: '\x1b[35m'    // Magenta
    };
    const reset = '\x1b[0m';

    const color = colors[entry.level] || '';
    const formattedPrefix = `${color}${prefix}${reset}`;

    if (this.config.prettyPrint && entry.data) {
      console.log(`${formattedPrefix} ${entry.message}`);
      console.log(JSON.stringify(entry.data, null, 2));
    } else {
      const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
      console.log(`${formattedPrefix} ${entry.message}${dataStr}`);
    }
  }

  /**
   * Output log to file (placeholder - implement actual file writing)
   */
  private outputToFile(entry: LogEntry): void {
    // In production, use proper file logging library (winston, pino, etc.)
    // This is a simplified placeholder
    const logLine = JSON.stringify(entry) + '\n';
    // fs.appendFileSync(this.config.filePath, logLine);
  }

  /**
   * Get recent logs
   */
  getLogs(
    limit?: number,
    level?: LogLevel,
    category?: string
  ): LogEntry[] {
    let filtered = [...this.logs];

    if (level !== undefined) {
      filtered = filtered.filter(log => log.level === level);
    }

    if (category) {
      filtered = filtered.filter(log => log.category === category);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(
    adapter?: string,
    taskType?: string,
    limit?: number
  ): ModelPerformance[] {
    let metrics = [...this.performanceMetrics];

    if (adapter) {
      metrics = metrics.filter(m => m.adapter === adapter);
    }

    if (taskType) {
      metrics = metrics.filter(m => m.taskType === taskType);
    }

    if (limit) {
      metrics = metrics.slice(-limit);
    }

    return metrics;
  }

  /**
   * Get logger statistics
   */
  getStats(): LoggerStats {
    const logsByLevel: Record<string, number> = {};
    for (const level in LogLevel) {
      if (!isNaN(Number(level))) {
        logsByLevel[LogLevel[Number(level)]] = 0;
      }
    }

    this.logs.forEach(log => {
      const levelName = LogLevel[log.level];
      logsByLevel[levelName]++;
    });

    const totalLatency = this.performanceMetrics.reduce(
      (sum, m) => sum + m.latencyMs,
      0
    );
    const averageLatency = this.performanceMetrics.length > 0
      ? totalLatency / this.performanceMetrics.length
      : 0;

    const totalFailures = this.performanceMetrics.filter(m => !m.success).length;

    const uptime = Date.now() - this.startTime.getTime();

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      totalModelCalls: this.performanceMetrics.length,
      totalFailures,
      averageLatency,
      activeSessions: this.sessionTracking.size,
      uptime
    };
  }

  /**
   * Export logs for analysis
   */
  exportLogs(): {
    logs: LogEntry[];
    metrics: ModelPerformance[];
    sessions: SessionActivity[];
    stats: LoggerStats;
  } {
    return {
      logs: this.logs,
      metrics: this.performanceMetrics,
      sessions: Array.from(this.sessionTracking.values()),
      stats: this.getStats()
    };
  }

  /**
   * Clear old logs and metrics
   */
  clearOldData(olderThanMs: number = 86400000): void {
    const cutoff = Date.now() - olderThanMs;

    this.logs = this.logs.filter(log => log.timestamp.getTime() > cutoff);
    this.performanceMetrics = this.performanceMetrics.filter(
      m => m.endTime.getTime() > cutoff
    );

    // Clear inactive sessions
    for (const [sessionId, session] of this.sessionTracking.entries()) {
      if (session.lastActivityTime.getTime() < cutoff) {
        this.sessionTracking.delete(sessionId);
      }
    }

    this.logInfo('Cleared old data', { cutoffMs: olderThanMs });
  }

  /**
   * Set minimum log level
   */
  setLogLevel(level: LogLevel): void {
    this.config.minLevel = level;
    this.logInfo('Log level changed', { newLevel: LogLevel[level] });
  }
}

/**
 * Singleton logger instance
 */
let globalLogger: Logger | null = null;

/**
 * Get or create global logger instance
 */
export function getLogger(config?: LoggerConfig): Logger {
  if (!globalLogger) {
    globalLogger = new Logger(config);
  }
  return globalLogger;
}

/**
 * INTEGRATION WITH EXTERNAL MONITORING SERVICES:
 * 
 * 1. DATADOG INTEGRATION:
 * 
 * import { datadogLogs } from '@datadog/browser-logs';
 * 
 * class DatadogLogger extends Logger {
 *   private log(...args) {
 *     super.log(...args);
 *     
 *     // Send to Datadog
 *     datadogLogs.logger.log(
 *       entry.message,
 *       {
 *         ...entry.data,
 *         level: LogLevel[entry.level],
 *         category: entry.category
 *       },
 *       LogLevel[entry.level].toLowerCase()
 *     );
 *   }
 *   
 *   logModelPerformance(metrics: ModelPerformance) {
 *     super.logModelPerformance(metrics);
 *     
 *     // Send custom metrics to Datadog
 *     datadogRum.addAction('model_call', {
 *       adapter: metrics.adapter,
 *       latency: metrics.latencyMs,
 *       success: metrics.success
 *     });
 *   }
 * }
 * 
 * 
 * 2. NEW RELIC INTEGRATION:
 * 
 * import newrelic from 'newrelic';
 * 
 * class NewRelicLogger extends Logger {
 *   logModelPerformance(metrics: ModelPerformance) {
 *     super.logModelPerformance(metrics);
 *     
 *     // Record custom event
 *     newrelic.recordCustomEvent('ModelCall', {
 *       adapter: metrics.adapter,
 *       taskType: metrics.taskType,
 *       latency: metrics.latencyMs,
 *       success: metrics.success,
 *       confidence: metrics.confidence
 *     });
 *     
 *     // Record metric
 *     newrelic.recordMetric('Custom/ModelLatency', metrics.latencyMs);
 *   }
 * }
 * 
 * 
 * 3. CLOUDWATCH INTEGRATION (AWS):
 * 
 * import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs';
 * 
 * class CloudWatchLogger extends Logger {
 *   private cloudwatch: CloudWatchLogs;
 *   
 *   constructor(config) {
 *     super(config);
 *     this.cloudwatch = new CloudWatchLogs({ region: 'us-east-1' });
 *   }
 *   
 *   async logModelPerformance(metrics: ModelPerformance) {
 *     super.logModelPerformance(metrics);
 *     
 *     await this.cloudwatch.putLogEvents({
 *       logGroupName: '/arc/model-performance',
 *       logStreamName: metrics.adapter,
 *       logEvents: [{
 *         message: JSON.stringify(metrics),
 *         timestamp: metrics.endTime.getTime()
 *       }]
 *     });
 *   }
 * }
 * 
 * 
 * 4. PROMETHEUS INTEGRATION:
 * 
 * import { register, Counter, Histogram } from 'prom-client';
 * 
 * class PrometheusLogger extends Logger {
 *   private modelCalls: Counter;
 *   private modelLatency: Histogram;
 *   
 *   constructor(config) {
 *     super(config);
 *     
 *     this.modelCalls = new Counter({
 *       name: 'arc_model_calls_total',
 *       help: 'Total model calls',
 *       labelNames: ['adapter', 'task_type', 'success']
 *     });
 *     
 *     this.modelLatency = new Histogram({
 *       name: 'arc_model_latency_ms',
 *       help: 'Model call latency in milliseconds',
 *       labelNames: ['adapter', 'task_type'],
 *       buckets: [10, 50, 100, 500, 1000, 5000]
 *     });
 *   }
 *   
 *   logModelPerformance(metrics: ModelPerformance) {
 *     super.logModelPerformance(metrics);
 *     
 *     this.modelCalls.inc({
 *       adapter: metrics.adapter,
 *       task_type: metrics.taskType,
 *       success: metrics.success.toString()
 *     });
 *     
 *     this.modelLatency.observe({
 *       adapter: metrics.adapter,
 *       task_type: metrics.taskType
 *     }, metrics.latencyMs);
 *   }
 * }
 * 
 * 
 * 5. SENTRY INTEGRATION (Error Tracking):
 * 
 * import * as Sentry from '@sentry/node';
 * 
 * class SentryLogger extends Logger {
 *   logError(message: string, error?: Error | Record<string, any>, context?) {
 *     super.logError(message, error, context);
 *     
 *     if (error instanceof Error) {
 *       Sentry.captureException(error, {
 *         tags: {
 *           taskId: context?.taskId,
 *           sessionId: context?.sessionId
 *         },
 *         extra: { message }
 *       });
 *     }
 *   }
 *   
 *   logModelPerformance(metrics: ModelPerformance) {
 *     super.logModelPerformance(metrics);
 *     
 *     if (!metrics.success) {
 *       Sentry.captureMessage(`Model call failed: ${metrics.adapter}`, {
 *         level: 'error',
 *         tags: {
 *           adapter: metrics.adapter,
 *           taskType: metrics.taskType
 *         },
 *         extra: metrics
 *       });
 *     }
 *   }
 * }
 * 
 * 
 * 6. ELASTICSEARCH/KIBANA INTEGRATION:
 * 
 * import { Client } from '@elastic/elasticsearch';
 * 
 * class ElasticsearchLogger extends Logger {
 *   private client: Client;
 *   
 *   constructor(config) {
 *     super(config);
 *     this.client = new Client({ node: 'http://localhost:9200' });
 *   }
 *   
 *   async logModelPerformance(metrics: ModelPerformance) {
 *     super.logModelPerformance(metrics);
 *     
 *     await this.client.index({
 *       index: 'arc-model-performance',
 *       document: {
 *         ...metrics,
 *         '@timestamp': metrics.endTime
 *       }
 *     });
 *   }
 * }
 * 
 * 
 * 7. GRAFANA/LOKI INTEGRATION:
 * 
 * import axios from 'axios';
 * 
 * class LokiLogger extends Logger {
 *   async log(...args) {
 *     super.log(...args);
 *     
 *     // Push to Loki
 *     await axios.post('http://localhost:3100/loki/api/v1/push', {
 *       streams: [{
 *         stream: {
 *           job: 'arc-platform',
 *           level: LogLevel[entry.level]
 *         },
 *         values: [[
 *           `${entry.timestamp.getTime()}000000`,
 *           JSON.stringify(entry)
 *         ]]
 *       }]
 *     });
 *   }
 * }
 * 
 * 
 * 8. GENERIC HTTP WEBHOOK INTEGRATION:
 * 
 * class WebhookLogger extends Logger {
 *   private webhookUrl: string;
 *   
 *   constructor(config, webhookUrl: string) {
 *     super(config);
 *     this.webhookUrl = webhookUrl;
 *   }
 *   
 *   async logModelPerformance(metrics: ModelPerformance) {
 *     super.logModelPerformance(metrics);
 *     
 *     await fetch(this.webhookUrl, {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({
 *         type: 'model_performance',
 *         timestamp: new Date().toISOString(),
 *         data: metrics
 *       })
 *     });
 *   }
 * }
 */

export default Logger;
