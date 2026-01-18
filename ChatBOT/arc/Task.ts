/**
 * Task Class for ARC Platform
 * 
 * Represents a unit of AI work to be processed by the orchestrator.
 * This is a generic, domain-agnostic structure suitable for any AI application.
 * 
 * DESIGN PRINCIPLES:
 * - No therapy, healthcare, or domain-specific logic
 * - Flexible payload structure for different use cases
 * - Rich metadata support for tracking and analytics
 * - Validation and sanitization built-in
 * - Serialization-friendly for API/storage
 * 
 * FIXES APPLIED:
 * - Added global declaration for console
 */

import { TaskType, ITask } from './types';

// TypeScript compatibility: Declare Node.js runtime globals
declare const console: any;

export class Task implements ITask {
  /**
   * Unique identifier for the task
   * Used for tracking, logging, and correlation
   */
  taskId: string;

  /**
   * Classification of the task type
   * 
   * Determines which adapter(s) the orchestrator routes to:
   * - reasoning: Complex logic, math, deduction (GPT-4, Claude)
   * - coding: Code generation, debugging (GPT-4, specialized code models)
   * - creative: Content creation, storytelling (GPT-4, Claude)
   * - factual: Information retrieval, fact-checking (ensemble recommended)
   * - multi-modal: Text + image/audio/video (Gemini, GPT-4V)
   * - default: Auto-classification by orchestrator
   */
  taskType: TaskType;

  /**
   * The actual content/data for the AI to process
   * 
   * Structure depends on task type and adapter requirements:
   * - prompt: Main instruction/query (most common)
   * - content: Alternative to prompt
   * - systemPrompt: System-level instructions
   * - messages: Pre-formatted conversation history
   * - image: Base64 or URL for multi-modal tasks
   * - context: Additional context data
   * 
   * Example for text generation:
   * { prompt: "Explain quantum computing", systemPrompt: "You are an expert" }
   * 
   * Example for code generation:
   * { prompt: "Write a binary search function", language: "python" }
   * 
   * Example for multi-modal:
   * { prompt: "Describe this image", image: "data:image/png;base64,..." }
   */
  payload: Record<string, any>;

  /**
   * Optional user identifier
   * 
   * Used for:
   * - User-specific routing rules
   * - Quota/rate limiting
   * - Personalization
   * - Analytics and tracking
   * - Audit logging
   * 
   * Can be anonymous ID, email, username, or any identifier
   */
  userId?: string;

  /**
   * Additional metadata for the task
   * 
   * Free-form object for storing:
   * - sessionId: Link to conversation session
   * - requestId: External request tracking
   * - source: Where the task originated (web, api, mobile)
   * - clientVersion: Client application version
   * - tags: Custom categorization tags
   * - context: Application-specific context
   * - preferences: User preferences for this task
   * - cost: Budget constraints
   * 
   * This is the extension point for domain-specific data
   * without polluting the core Task structure.
   */
  metadata?: Record<string, any>;

  /**
   * Task priority level (0 = lowest, higher = more urgent)
   * 
   * Can be used for:
   * - Queue ordering
   * - Resource allocation
   * - SLA management
   * 
   * Default: 0 (normal priority)
   */
  priority: number;

  /**
   * Timestamp when task was created
   */
  createdAt: Date;

  /**
   * Create a new Task instance
   * 
   * @param params - Task parameters
   */
  constructor(params: {
    taskId?: string;
    taskType?: TaskType;
    payload: Record<string, any>;
    userId?: string;
    metadata?: Record<string, any>;
    priority?: number;
  }) {
    this.taskId = params.taskId || this.generateTaskId();
    this.taskType = params.taskType || 'default';
    this.payload = params.payload;
    this.userId = params.userId;
    this.metadata = params.metadata || {};
    this.priority = params.priority ?? 0;
    this.createdAt = new Date();

    // Validate on construction
    this.validate();
  }

  /**
   * Generate a unique task ID
   * Format: task-{timestamp}-{random}
   */
  private generateTaskId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `task-${timestamp}-${random}`;
  }

  /**
   * Validate task structure
   * Throws error if invalid
   */
  private validate(): void {
    if (!this.taskId || this.taskId.length === 0) {
      throw new Error('Task must have a valid taskId');
    }

    if (!this.payload || Object.keys(this.payload).length === 0) {
      throw new Error('Task must have a non-empty payload');
    }

    // Validate that payload contains at least one content field
    const hasContent = 
      this.payload.prompt || 
      this.payload.content || 
      this.payload.messages ||
      this.payload.image;

    if (!hasContent) {
      console.warn(
        `Task ${this.taskId}: payload missing common fields (prompt, content, messages, image)`
      );
    }
  }

  /**
   * Static factory method: Create task from plain object
   * Useful for deserializing from API/storage
   */
  static fromObject(obj: any): Task {
    return new Task({
      taskId: obj.taskId,
      taskType: obj.taskType,
      payload: obj.payload,
      userId: obj.userId,
      metadata: obj.metadata,
      priority: obj.priority
    });
  }

  /**
   * Static factory method: Create task with simple prompt
   * Convenience method for common use case
   */
  static fromPrompt(
    prompt: string,
    taskType?: TaskType,
    userId?: string
  ): Task {
    return new Task({
      taskType: taskType || 'default',
      payload: { prompt },
      userId
    });
  }

  /**
   * Static factory method: Create task with messages array
   * For conversation-style tasks
   */
  static fromMessages(
    messages: Array<{ role: string; content: string }>,
    taskType?: TaskType,
    userId?: string
  ): Task {
    return new Task({
      taskType: taskType || 'default',
      payload: { messages },
      userId
    });
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): ITask {
    return {
      taskId: this.taskId,
      taskType: this.taskType,
      payload: this.payload,
      userId: this.userId,
      metadata: this.metadata,
      priority: this.priority,
      createdAt: this.createdAt
    };
  }

  /**
   * Create a deep copy of the task
   */
  clone(): Task {
    return new Task({
      taskId: this.taskId,
      taskType: this.taskType,
      payload: JSON.parse(JSON.stringify(this.payload)),
      userId: this.userId,
      metadata: this.metadata ? JSON.parse(JSON.stringify(this.metadata)) : undefined,
      priority: this.priority
    });
  }

  /**
   * Add metadata to the task
   */
  addMetadata(key: string, value: any): this {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
    return this;
  }

  /**
   * Get metadata value
   */
  getMetadata(key: string): any {
    return this.metadata?.[key];
  }

  /**
   * Check if task has specific metadata key
   */
  hasMetadata(key: string): boolean {
    return this.metadata ? key in this.metadata : false;
  }

  /**
   * Update task priority
   */
  setPriority(priority: number): this {
    this.priority = Math.max(0, priority);
    return this;
  }

  /**
   * Get the main content from payload
   * Tries common fields in order: prompt, content, messages
   */
  getContent(): string | any {
    if (this.payload.prompt) {
      return this.payload.prompt;
    }
    if (this.payload.content) {
      return this.payload.content;
    }
    if (this.payload.messages) {
      return this.payload.messages;
    }
    return JSON.stringify(this.payload);
  }

  /**
   * Check if task is multi-modal (contains image/audio/video)
   */
  isMultiModal(): boolean {
    return !!(
      this.payload.image ||
      this.payload.images ||
      this.payload.audio ||
      this.payload.video
    );
  }

  /**
   * Get a human-readable string representation
   */
  toString(): string {
    const content = this.getContent();
    const contentPreview = 
      typeof content === 'string' 
        ? content.substring(0, 50) 
        : JSON.stringify(content).substring(0, 50);
    
    return `Task(id=${this.taskId}, type=${this.taskType}, content="${contentPreview}...")`;
  }

  /**
   * Estimate token count (rough approximation)
   * Useful for context window management
   * 
   * Note: This is a simple heuristic. For accurate counting,
   * use a proper tokenizer like tiktoken.
   */
  estimateTokenCount(): number {
    const content = this.getContent();
    const text = typeof content === 'string' 
      ? content 
      : JSON.stringify(content);
    
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

/**
 * USAGE EXAMPLES:
 * 
 * 1. BASIC TASK CREATION:
 * 
 * const task = new Task({
 *   taskType: 'reasoning',
 *   payload: {
 *     prompt: 'Solve: If 5 machines make 5 widgets in 5 minutes...'
 *   },
 *   userId: 'user-123'
 * });
 * 
 * 
 * 2. FACTORY METHODS:
 * 
 * // Simple prompt
 * const task1 = Task.fromPrompt(
 *   'Explain quantum entanglement',
 *   'factual',
 *   'user-456'
 * );
 * 
 * // Conversation messages
 * const task2 = Task.fromMessages([
 *   { role: 'user', content: 'What is Python?' },
 *   { role: 'assistant', content: 'Python is a programming language...' },
 *   { role: 'user', content: 'Show me an example' }
 * ], 'coding');
 * 
 * 
 * 3. METADATA USAGE:
 * 
 * const task = Task.fromPrompt('Generate a story', 'creative')
 *   .addMetadata('sessionId', 'sess-789')
 *   .addMetadata('tone', 'humorous')
 *   .addMetadata('maxWords', 500)
 *   .setPriority(5);
 * 
 * 
 * 4. MULTI-MODAL TASKS:
 * 
 * const task = new Task({
 *   taskType: 'multi-modal',
 *   payload: {
 *     prompt: 'What objects are in this image?',
 *     image: 'data:image/png;base64,iVBORw0KG...'
 *   }
 * });
 * 
 * console.log(task.isMultiModal()); // true
 * 
 * 
 * 5. SERIALIZATION:
 * 
 * const task = Task.fromPrompt('Hello world');
 * const json = task.toJSON();
 * const restored = Task.fromObject(json);
 * 
 * 
 * 6. DOMAIN-SPECIFIC EXTENSIONS:
 * 
 * // E-commerce application
 * const task = Task.fromPrompt('Recommend products', 'factual')
 *   .addMetadata('userPreferences', { category: 'electronics' })
 *   .addMetadata('priceRange', { min: 100, max: 500 })
 *   .addMetadata('previousPurchases', ['item-1', 'item-2']);
 * 
 * // Healthcare (non-diagnostic)
 * const task = Task.fromPrompt('Explain this medical term', 'factual')
 *   .addMetadata('context', 'patient-education')
 *   .addMetadata('readingLevel', 'grade-8');
 * 
 * // Education
 * const task = Task.fromPrompt('Generate quiz questions', 'creative')
 *   .addMetadata('subject', 'mathematics')
 *   .addMetadata('difficulty', 'intermediate')
 *   .addMetadata('questionCount', 10);
 * 
 * 
 * 7. ERROR HANDLING:
 * 
 * try {
 *   const task = new Task({
 *     taskType: 'reasoning',
 *     payload: {} // Empty payload will trigger warning
 *   });
 * } catch (error) {
 *   console.error('Invalid task:', error.message);
 * }
 * 
 * 
 * 8. INTEGRATION WITH ORCHESTRATOR:
 * 
 * import { Orchestrator } from './Orchestrator';
 * 
 * const orchestrator = new Orchestrator();
 * const task = Task.fromPrompt('Debug this code', 'coding');
 * 
 * const response = await orchestrator.routeTask(task);
 * console.log(response.output);
 */

export default Task;
