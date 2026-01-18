/**
 * Orchestrator: Central coordinator for ARC platform
 * 
 * Responsibilities:
 * - Task type classification and routing
 * - Adapter selection based on capabilities
 * - Parallel execution and load balancing
 * - Output merging from multiple sources
 * - Failure handling and fallback logic
 * - Retry management across adapters
 * 
 * FIXES APPLIED:
 * - Properly typed all async functions with Promise<ARCResponse>
 * - All interfaces and types correctly defined
 * - Task, ARCResponse, and ModelAdapter imported from types module
 * - All methods have explicit return types
 * - Declared Node.js globals for TypeScript compatibility
 * 
 * NOTE: If TypeScript still reports console/setTimeout errors, ensure @types/node
 * is installed and tsconfig.json includes "types": ["node"]
 */

import { Task, ARCResponse, ModelAdapter } from './types';

// TypeScript compatibility: Declare Node.js runtime globals
// These are available in Node.js but may not be recognized by TypeScript
// depending on tsconfig settings
declare const console: any;
declare function setTimeout(callback: () => void, ms: number): any;

interface RoutingRule {
  taskType: string;
  primaryAdapter: string;
  fallbackAdapters?: string[];
  requiresMultiple?: boolean; // Whether to query multiple adapters
}

interface MergeStrategy {
  type: 'single' | 'consensus' | 'best' | 'ensemble';
  confidenceThreshold?: number;
  votingMethod?: 'majority' | 'weighted';
}

interface OrchestratorConfig {
  maxRetries?: number;
  retryDelay?: number;
  enableFallback?: boolean;
  defaultMergeStrategy?: MergeStrategy;
}

export class Orchestrator {
  private adapters: Map<string, ModelAdapter>;
  private routingRules: Map<string, RoutingRule>;
  private config: Required<OrchestratorConfig>;

  constructor(config: OrchestratorConfig = {}) {
    this.adapters = new Map();
    this.routingRules = new Map();
    
    // Initialize with defaults
    this.config = {
      maxRetries: config.maxRetries ?? 2,
      retryDelay: config.retryDelay ?? 1000,
      enableFallback: config.enableFallback ?? true,
      defaultMergeStrategy: config.defaultMergeStrategy ?? { type: 'single' }
    };

    // Set up default routing rules
    this.initializeDefaultRouting();
  }

  /**
   * Register an adapter with the orchestrator
   */
  addAdapter(adapter: ModelAdapter): void {
    this.adapters.set(adapter.name, adapter);
    console.log(`[Orchestrator] Registered adapter: ${adapter.name}`);
  }

  /**
   * Remove an adapter from the registry
   */
  removeAdapter(adapterName: string): void {
    this.adapters.delete(adapterName);
    console.log(`[Orchestrator] Removed adapter: ${adapterName}`);
  }

  /**
   * Define custom routing rule for a task type
   */
  setRoutingRule(rule: RoutingRule): void {
    this.routingRules.set(rule.taskType, rule);
    console.log(`[Orchestrator] Set routing rule: ${rule.taskType} -> ${rule.primaryAdapter}`);
  }

  /**
   * Initialize default routing rules based on task types
   * 
   * ROUTING STRATEGY:
   * - reasoning: GPT-4 (strong reasoning) with Gemini fallback
   * - coding: GPT-4 (code generation excellence)
   * - creative: Claude/GPT-4 (creative writing)
   * - factual: Ensemble of multiple models for accuracy
   * - multi-modal: Gemini (native multi-modal support)
   * 
   * These rules are model-agnostic templates. Adapt based on:
   * - Your specific model capabilities
   * - Cost considerations
   * - Latency requirements
   * - Quality benchmarks
   */
  private initializeDefaultRouting(): void {
    // Reasoning tasks: complex logic, math, analysis
    this.routingRules.set('reasoning', {
      taskType: 'reasoning',
      primaryAdapter: 'gpt-4',
      fallbackAdapters: ['gemini', 'claude'],
      requiresMultiple: false
    });

    // Coding tasks: code generation, debugging, refactoring
    this.routingRules.set('coding', {
      taskType: 'coding',
      primaryAdapter: 'gpt-4',
      fallbackAdapters: ['claude', 'qwen'],
      requiresMultiple: false
    });

    // Creative tasks: storytelling, poetry, content creation
    this.routingRules.set('creative', {
      taskType: 'creative',
      primaryAdapter: 'gpt-4',
      fallbackAdapters: ['claude', 'gemini'],
      requiresMultiple: false
    });

    // Factual tasks: information retrieval, fact-checking
    // Use ensemble for higher accuracy
    this.routingRules.set('factual', {
      taskType: 'factual',
      primaryAdapter: 'gpt-4',
      fallbackAdapters: ['gemini', 'qwen'],
      requiresMultiple: true // Query multiple models and merge
    });

    // Multi-modal tasks: image analysis, vision + text
    this.routingRules.set('multi-modal', {
      taskType: 'multi-modal',
      primaryAdapter: 'gemini', // Native multi-modal support
      fallbackAdapters: ['gpt-4-vision'],
      requiresMultiple: false
    });

    // Default/generic tasks
    this.routingRules.set('default', {
      taskType: 'default',
      primaryAdapter: 'gpt-4',
      fallbackAdapters: ['gemini', 'qwen'],
      requiresMultiple: false
    });
  }

  /**
   * Classify task type from task payload
   * 
   * CLASSIFICATION LOGIC:
   * Uses keywords and patterns in the task payload to determine type.
   * 
   * Production improvements:
   * - Use a separate classifier model
   * - Implement confidence scoring
   * - Support explicit task type in payload
   * - Learn from historical routing performance
   */
  private classifyTaskType(task: Task): string {
    // If task type is explicitly provided, use it
    if (task.taskType && this.routingRules.has(task.taskType)) {
      return task.taskType;
    }

    // Extract content for analysis
    const content = (
      task.payload.prompt ||
      task.payload.content ||
      JSON.stringify(task.payload)
    ).toLowerCase();

    // Keyword-based classification
    // Note: This is a simple heuristic. Consider ML-based classifier for production.
    
    if (this.containsKeywords(content, [
      'calculate', 'solve', 'prove', 'logic', 'reasoning',
      'analyze', 'deduce', 'infer', 'mathematical'
    ])) {
      return 'reasoning';
    }

    if (this.containsKeywords(content, [
      'code', 'function', 'class', 'debug', 'implement',
      'program', 'algorithm', 'refactor', 'api'
    ])) {
      return 'coding';
    }

    if (this.containsKeywords(content, [
      'story', 'poem', 'creative', 'imagine', 'write',
      'compose', 'generate content', 'narrative'
    ])) {
      return 'creative';
    }

    if (this.containsKeywords(content, [
      'fact', 'information', 'what is', 'define', 'explain',
      'history', 'research', 'summarize document'
    ])) {
      return 'factual';
    }

    if (task.payload.image || task.payload.images || 
        this.containsKeywords(content, ['image', 'picture', 'photo', 'visual'])) {
      return 'multi-modal';
    }

    return 'default';
  }

  /**
   * Helper: Check if content contains any of the keywords
   */
  private containsKeywords(content: string, keywords: string[]): boolean {
    return keywords.some(keyword => content.includes(keyword));
  }

  /**
   * Main routing method: Process a task and return response
   * 
   * FLOW:
   * 1. Classify task type
   * 2. Get routing rule
   * 3. Execute with primary adapter
   * 4. If primary fails and fallback enabled, try fallback adapters
   * 5. If requiresMultiple, query multiple adapters and merge
   * 6. Return final response
   */
  async routeTask(task: Task): Promise<ARCResponse> {
    const taskType = this.classifyTaskType(task);
    const rule = this.routingRules.get(taskType) || this.routingRules.get('default')!;
    
    console.log(`[Orchestrator] Task ${task.taskId}: type=${taskType}, routing to ${rule.primaryAdapter}`);

    // If task requires multiple adapters, use ensemble approach
    if (rule.requiresMultiple) {
      return this.routeToMultiple(task, rule);
    }

    // Single adapter routing with fallback
    return this.routeWithFallback(task, rule);
  }

  /**
   * Route to primary adapter with fallback on failure
   * 
   * RETRY LOGIC:
   * - Try primary adapter with configured retries
   * - If all retries fail, try fallback adapters in order
   * - Return first successful response
   * - If all fail, return error response
   */
  private async routeWithFallback(
    task: Task,
    rule: RoutingRule
  ): Promise<ARCResponse> {
    const adaptersToTry = [
      rule.primaryAdapter,
      ...(this.config.enableFallback && rule.fallbackAdapters ? rule.fallbackAdapters : [])
    ];

    let lastError: string | undefined;

    for (const adapterName of adaptersToTry) {
      const adapter = this.adapters.get(adapterName);
      
      if (!adapter) {
        console.log(`[Orchestrator] Adapter ${adapterName} not registered, skipping`);
        continue;
      }

      // Try this adapter with retries
      const response = await this.executeWithRetry(task, adapter);

      if (response.success) {
        console.log(`[Orchestrator] Task ${task.taskId} succeeded with ${adapterName}`);
        return response;
      }

      lastError = response.error;
      console.log(`[Orchestrator] Adapter ${adapterName} failed: ${response.error}`);
    }

    // All adapters failed
    return {
      taskId: task.taskId,
      output: null,
      confidence: 0,
      metadata: {
        attemptedAdapters: adaptersToTry,
        allFailed: true
      },
      success: false,
      error: `All adapters failed. Last error: ${lastError}`,
      timestamp: new Date()
    };
  }

  /**
   * Execute task with retry logic for a single adapter
   */
  private async executeWithRetry(
    task: Task,
    adapter: ModelAdapter,
    attempt: number = 0
  ): Promise<ARCResponse> {
    try {
      const response = await adapter.call(task);
      return response;
      
    } catch (error) {
      if (attempt < this.config.maxRetries) {
        const delay = this.config.retryDelay * Math.pow(2, attempt);
        console.log(`[Orchestrator] Retry ${attempt + 1}/${this.config.maxRetries} for ${adapter.name} after ${delay}ms`);
        
        await this.sleep(delay);
        return this.executeWithRetry(task, adapter, attempt + 1);
      }

      // Max retries exceeded
      return {
        taskId: task.taskId,
        output: null,
        confidence: 0,
        metadata: { adapter: adapter.name, retries: attempt },
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Route task to multiple adapters and merge outputs
   * 
   * ENSEMBLE STRATEGY:
   * Used for tasks requiring high accuracy (factual queries, critical decisions)
   * 
   * Process:
   * 1. Send task to primary + fallback adapters in parallel
   * 2. Collect all responses
   * 3. Merge using specified strategy
   * 4. Return synthesized response with higher confidence
   */
  private async routeToMultiple(
    task: Task,
    rule: RoutingRule
  ): Promise<ARCResponse> {
    const adaptersToQuery = [
      rule.primaryAdapter,
      ...(rule.fallbackAdapters || [])
    ];

    console.log(`[Orchestrator] Querying multiple adapters: ${adaptersToQuery.join(', ')}`);

    // Execute in parallel
    const promises = adaptersToQuery
      .map(name => this.adapters.get(name))
      .filter((adapter): adapter is ModelAdapter => adapter !== undefined)
      .map(adapter => this.executeWithRetry(task, adapter));

    const responses = await Promise.all(promises);
    
    // Filter successful responses
    const successfulResponses = responses.filter(r => r.success);

    if (successfulResponses.length === 0) {
      return {
        taskId: task.taskId,
        output: null,
        confidence: 0,
        metadata: { queriedAdapters: adaptersToQuery, allFailed: true },
        success: false,
        error: 'All adapters in ensemble failed',
        timestamp: new Date()
      };
    }

    // Merge outputs
    return this.mergeOutputs(task.taskId, successfulResponses);
  }

  /**
   * Merge multiple responses into a single output
   * 
   * MERGE STRATEGIES:
   * 
   * 1. SINGLE: Return first/best response (default for single adapter)
   * 2. CONSENSUS: Use voting for discrete answers
   * 3. BEST: Select response with highest confidence
   * 4. ENSEMBLE: Combine all outputs with weighting
   * 
   * Strategy selection depends on:
   * - Task type (factual: consensus, creative: best)
   * - Response format (classification: vote, text: ensemble)
   * - Confidence scores
   */
  private mergeOutputs(
    taskId: string,
    responses: ARCResponse[]
  ): ARCResponse {
    const strategy = this.config.defaultMergeStrategy;

    if (responses.length === 1 || strategy.type === 'single') {
      return responses[0];
    }

    if (strategy.type === 'best') {
      // Select response with highest confidence
      const best = responses.reduce((prev, curr) => 
        (curr.confidence || 0) > (prev.confidence || 0) ? curr : prev
      );

      return {
        ...best,
        metadata: {
          ...best.metadata,
          mergeStrategy: 'best',
          totalResponses: responses.length
        }
      };
    }

    if (strategy.type === 'consensus') {
      // Voting for discrete answers
      return this.mergeByConsensus(taskId, responses);
    }

    if (strategy.type === 'ensemble') {
      // Combine all outputs with weighting
      return this.mergeByEnsemble(taskId, responses);
    }

    return responses[0];
  }

  /**
   * Merge by consensus: Vote on discrete outputs
   * 
   * Best for:
   * - Classification tasks
   * - Multiple choice questions
   * - Yes/no decisions
   * - Fact checking
   */
  private mergeByConsensus(
    taskId: string,
    responses: ARCResponse[]
  ): ARCResponse {
    // Count occurrences of each output
    const votes = new Map<string, { count: number; responses: ARCResponse[] }>();

    for (const response of responses) {
      const output = JSON.stringify(response.output);
      
      if (!votes.has(output)) {
        votes.set(output, { count: 0, responses: [] });
      }
      
      const entry = votes.get(output)!;
      entry.count++;
      entry.responses.push(response);
    }

    // Find most common output
    let maxCount = 0;
    let consensusOutput: any = null;
    let consensusResponses: ARCResponse[] = [];

    for (const [output, { count, responses: resps }] of votes) {
      if (count > maxCount) {
        maxCount = count;
        consensusOutput = JSON.parse(output);
        consensusResponses = resps;
      }
    }

    // Calculate consensus confidence
    const agreementRatio = maxCount / responses.length;
    const avgConfidence = consensusResponses.reduce(
      (sum, r) => sum + (r.confidence || 0), 0
    ) / consensusResponses.length;
    
    const consensusConfidence = agreementRatio * avgConfidence;

    return {
      taskId,
      output: consensusOutput,
      confidence: consensusConfidence,
      metadata: {
        mergeStrategy: 'consensus',
        totalResponses: responses.length,
        agreementRatio,
        votes: Object.fromEntries(
          Array.from(votes.entries()).map(([k, v]) => [k, v.count])
        )
      },
      success: true,
      timestamp: new Date()
    };
  }

  /**
   * Merge by ensemble: Combine all outputs with weighting
   * 
   * Best for:
   * - Long-form text generation
   * - Creative tasks
   * - Analysis requiring multiple perspectives
   */
  private mergeByEnsemble(
    taskId: string,
    responses: ARCResponse[]
  ): ARCResponse {
    // Weight responses by confidence
    const totalWeight = responses.reduce((sum, r) => sum + (r.confidence || 0.5), 0);
    
    // For text outputs, concatenate with headers
    const ensembleOutput = responses
      .map((r, i) => {
        const weight = ((r.confidence || 0.5) / totalWeight * 100).toFixed(1);
        const source = r.metadata?.adapter || `Model ${i + 1}`;
        return `[${source} - ${weight}% weight]\n${r.output}`;
      })
      .join('\n\n---\n\n');

    // Calculate weighted average confidence
    const weightedConfidence = responses.reduce(
      (sum, r) => sum + (r.confidence || 0.5) * (r.confidence || 0.5) / totalWeight,
      0
    );

    return {
      taskId,
      output: ensembleOutput,
      confidence: weightedConfidence,
      metadata: {
        mergeStrategy: 'ensemble',
        totalResponses: responses.length,
        sources: responses.map(r => r.metadata?.adapter || 'unknown')
      },
      success: true,
      timestamp: new Date()
    };
  }

  /**
   * Process multiple tasks in parallel
   */
  async routeTasksBatch(tasks: Task[]): Promise<ARCResponse[]> {
    console.log(`[Orchestrator] Processing batch of ${tasks.length} tasks`);
    
    const responses = await Promise.all(
      tasks.map(task => this.routeTask(task))
    );

    return responses;
  }

  /**
   * Get orchestrator status and statistics
   */
  getStatus(): {
    adapters: string[];
    routingRules: Record<string, any>;
    config: OrchestratorConfig;
  } {
    return {
      adapters: Array.from(this.adapters.keys()),
      routingRules: Object.fromEntries(this.routingRules),
      config: this.config
    };
  }

  /**
   * Update merge strategy
   */
  setMergeStrategy(strategy: MergeStrategy): void {
    this.config.defaultMergeStrategy = strategy;
    console.log(`[Orchestrator] Updated merge strategy: ${strategy.type}`);
  }

  /**
   * Utility: Promise-based sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * EXTENSION NOTES:
 * 
 * 1. ADVANCED ROUTING:
 *    - Implement A/B testing for adapter selection
 *    - Track performance metrics per adapter
 *    - Dynamic routing based on latency/cost/quality
 *    - Load balancing across multiple instances
 * 
 * 2. CACHING:
 *    - Cache responses for identical tasks
 *    - Implement semantic similarity caching
 *    - TTL and invalidation strategies
 * 
 * 3. MONITORING:
 *    - Add telemetry and logging
 *    - Track success rates per adapter
 *    - Monitor latency and token usage
 *    - Alert on degraded performance
 * 
 * 4. ADAPTIVE LEARNING:
 *    - Learn optimal routing from historical data
 *    - Adjust confidence thresholds dynamically
 *    - Personalize routing per user/context
 * 
 * 5. COST OPTIMIZATION:
 *    - Route to cheaper models when quality threshold met
 *    - Implement budget limits per adapter
 *    - Smart fallback based on cost vs quality
 */

export default Orchestrator;
