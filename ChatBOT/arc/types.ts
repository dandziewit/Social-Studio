/**
 * Core type definitions for ARC platform (TypeScript)
 */

/**
 * Task types supported by ARC platform
 * 
 * These are domain-agnostic categories that classify AI work:
 * - reasoning: Complex logic, mathematical problems, analysis
 * - coding: Code generation, debugging, refactoring
 * - creative: Content creation, storytelling, artistic work
 * - factual: Information retrieval, fact-checking, research
 * - multi-modal: Tasks involving multiple modalities (text + image, etc.)
 * - default: Auto-classification or unspecified type
 */
export type TaskType = 
  | 'reasoning' 
  | 'coding' 
  | 'creative' 
  | 'factual' 
  | 'multi-modal' 
  | 'default';

/**
 * Task interface - represents a unit of AI work
 */
export interface ITask {
  taskId: string;
  taskType: TaskType;
  payload: Record<string, any>;
  userId?: string;
  metadata?: Record<string, any>;
  priority?: number;
  createdAt?: Date;
}

/**
 * Legacy Task interface for backward compatibility
 */
export interface Task extends ITask {}

export interface ARCResponse {
  taskId: string;
  output: any;
  confidence?: number;
  metadata: Record<string, any>;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface ModelAdapter {
  name: string;
  config: Record<string, any>;
  
  /**
   * Execute a task using this adapter's AI model
   */
  call(task: Task): Promise<ARCResponse>;
  
  /**
   * Check if this adapter can handle a given task type
   */
  supportsTaskType(taskType: string): boolean;
}
