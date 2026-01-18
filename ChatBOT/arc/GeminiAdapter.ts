/**
 * GeminiAdapter: Google Gemini model implementation
 * 
 * This adapter integrates with Google's Gemini API and emphasizes:
 * - High-level reasoning and analytical capabilities
 * - Comprehensive planning and factual grounding
 * - Multi-modal processing support
 * 
 * Capabilities: reasoning, factual analysis, planning, multi-modal
 */

import { Task, ARCResponse, ModelAdapter } from './types';

// TypeScript compatibility: Declare Node.js runtime globals
declare const console: any;
declare function setTimeout(callback: () => void, ms: number): any;
declare function fetch(url: string, init?: any): Promise<any>;

interface GeminiConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxRetries?: number;
  retryDelay?: number;
}

interface GeminiContent {
  parts: Array<{
    text?: string;
    inline_data?: {
      mime_type: string;
      data: string;
    };
  }>;
  role?: 'user' | 'model';
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiAdapter implements ModelAdapter {
  name: string;
  config: GeminiConfig;
  
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private maxTokens: number;
  private temperature: number;
  private topP: number;
  private topK: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(name: string, config: GeminiConfig) {
    this.name = name;
    this.config = config;
    
    // Initialize configuration with defaults optimized for reasoning
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-1.5-pro-latest';
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    this.maxTokens = config.maxTokens || 8192; // Gemini supports larger contexts
    this.temperature = config.temperature || 0.4; // Lower temp for factual/reasoning tasks
    this.topP = config.topP || 0.95;
    this.topK = config.topK || 40;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000; // milliseconds
  }

  /**
   * Main call method: sends task to Gemini API and returns structured response
   * 
   * Optimized for:
   * - Reasoning and analytical tasks
   * - Factual grounding and comprehensive planning
   * - Multi-modal inputs (text + images)
   */
  async call(task: Task): Promise<ARCResponse> {
    const startTime = Date.now();
    
    try {
      // Build Gemini-formatted content
      const contents = this.buildContents(task);
      
      // Make API call with retry logic
      const apiResponse = await this.callWithRetry(contents, task);
      
      // Parse and structure the response
      const output = this.extractOutput(apiResponse);
      const confidence = this.calculateConfidence(apiResponse);
      
      return {
        taskId: task.taskId,
        output,
        confidence,
        metadata: {
          model: this.model,
          adapter: this.name,
          tokens: apiResponse.usageMetadata,
          finishReason: apiResponse.candidates[0]?.finishReason,
          latencyMs: Date.now() - startTime,
          taskType: task.taskType,
          safetyRatings: apiResponse.candidates[0]?.safetyRatings
        },
        success: true,
        timestamp: new Date()
      };
      
    } catch (error) {
      // Comprehensive error handling
      return {
        taskId: task.taskId,
        output: null,
        confidence: 0,
        metadata: {
          model: this.model,
          adapter: this.name,
          latencyMs: Date.now() - startTime,
          errorType: error instanceof Error ? error.name : 'UnknownError'
        },
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Build Gemini-formatted content from task payload
   * 
   * Supports:
   * - Text-only inputs
   * - Multi-modal inputs (text + images)
   * - System instructions via first user message
   */
  private buildContents(task: Task): GeminiContent[] {
    const contents: GeminiContent[] = [];
    
    // Handle system prompt as initial user context
    // Note: Gemini doesn't have explicit "system" role, so we prepend to first user message
    let systemContext = '';
    if (task.payload.systemPrompt || task.metadata?.systemPrompt) {
      systemContext = `${task.payload.systemPrompt || task.metadata?.systemPrompt || ''}\n\n`;
    }
    
    // Handle multi-modal content (images + text)
    if (task.payload.image || task.payload.images) {
      const parts: any[] = [];
      
      // Add text part
      const textContent = task.payload.prompt || task.payload.content || '';
      if (textContent) {
        parts.push({ text: systemContext + textContent });
      }
      
      // Add image parts
      const images = Array.isArray(task.payload.images) 
        ? task.payload.images 
        : [task.payload.image];
      
      for (const img of images) {
        if (img) {
          parts.push({
            inline_data: {
              mime_type: img.mimeType || 'image/jpeg',
              data: img.data || img
            }
          });
        }
      }
      
      contents.push({ parts, role: 'user' });
      
    } else if (task.payload.messages) {
      // Handle pre-formatted message history
      for (const msg of task.payload.messages) {
        contents.push({
          parts: [{ text: msg.content }],
          role: msg.role === 'assistant' ? 'model' : 'user'
        });
      }
      
    } else {
      // Standard text input
      const textContent = task.payload.prompt || task.payload.content || '';
      contents.push({
        parts: [{ text: systemContext + textContent }],
        role: 'user'
      });
    }
    
    return contents;
  }

  /**
   * Make API call with exponential backoff retry logic
   * 
   * Retries on rate limits, timeouts, and transient errors.
   */
  private async callWithRetry(
    contents: GeminiContent[],
    task: Task,
    attempt: number = 0
  ): Promise<GeminiResponse> {
    try {
      const response = await this.makeAPIRequest(contents, task);
      return response;
      
    } catch (error) {
      const isRetriable = this.isRetriableError(error);
      
      if (isRetriable && attempt < this.maxRetries) {
        // Exponential backoff: wait longer with each retry
        const delay = this.retryDelay * Math.pow(2, attempt);
        console.log(`[GeminiAdapter] Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms`);
        
        await this.sleep(delay);
        return this.callWithRetry(contents, task, attempt + 1);
      }
      
      // Max retries exceeded or non-retriable error
      throw error;
    }
  }

  /**
   * Make the actual HTTP request to Gemini API
   */
  private async makeAPIRequest(contents: GeminiContent[], task: Task): Promise<GeminiResponse> {
    const requestBody: GeminiRequest = {
      contents,
      generationConfig: {
        temperature: this.temperature,
        topP: this.topP,
        topK: this.topK,
        maxOutputTokens: this.maxTokens
      }
    };
    
    // Construct URL with API key as query parameter (Gemini's authentication method)
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Gemini API error (${response.status}): ${errorBody}`
      );
    }
    
    return response.json();
  }

  /**
   * Extract text output from Gemini response
   */
  private extractOutput(response: GeminiResponse): string {
    const candidate = response.candidates[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      return '';
    }
    
    // Combine all text parts
    return candidate.content.parts
      .map(part => part.text || '')
      .join('')
      .trim();
  }

  /**
   * Determine if an error should trigger a retry
   */
  private isRetriableError(error: any): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Retry on rate limits, timeouts, and server errors
      return (
        message.includes('rate limit') ||
        message.includes('quota') ||
        message.includes('429') ||
        message.includes('timeout') ||
        message.includes('503') ||
        message.includes('500')
      );
    }
    
    return false;
  }

  /**
   * Calculate confidence score from API response
   * 
   * Gemini confidence factors:
   * - Finish reason (STOP = complete, high confidence)
   * - Safety ratings (blocked content = low confidence)
   * - Token usage efficiency
   */
  private calculateConfidence(response: GeminiResponse): number {
    const candidate = response.candidates[0];
    if (!candidate) return 0.3;
    
    const finishReason = candidate.finishReason;
    
    // Check for safety blocks
    const hasSafetyIssue = candidate.safetyRatings?.some(
      rating => rating.probability === 'HIGH' || rating.probability === 'MEDIUM'
    );
    
    if (hasSafetyIssue) {
      return 0.4; // Content was filtered or flagged
    }
    
    // Full completion = higher confidence
    if (finishReason === 'STOP') {
      return 0.95; // Natural completion
    }
    
    // Truncated due to length
    if (finishReason === 'MAX_TOKENS') {
      return 0.7;
    }
    
    // Safety or other reasons
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      return 0.5;
    }
    
    // Other cases
    return 0.6;
  }

  /**
   * Check if this adapter supports a given task type
   * 
   * Gemini excels at:
   * - reasoning: Complex analytical and logical reasoning
   * - factual: Grounded, accurate information retrieval
   * - multi-modal: Native image and text processing
   * - coding: Strong code generation and analysis
   */
  supportsTaskType(taskType: string): boolean {
    const supportedTypes = [
      'reasoning',
      'factual',
      'multi-modal',
      'coding',
      'creative',
      'default'
    ];
    
    return supportedTypes.includes(taskType);
  }

  /**
   * Utility: Promise-based sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * USAGE EXAMPLES:
 * 
 * 1. BASIC TEXT REASONING:
 * 
 * const gemini = new GeminiAdapter('gemini-pro', {
 *   apiKey: process.env.GOOGLE_API_KEY || ''
 * });
 * 
 * const task = new Task({
 *   taskType: 'reasoning',
 *   payload: {
 *     prompt: 'Analyze the trade-offs between microservices and monolithic architecture.'
 *   }
 * });
 * 
 * const response = await gemini.call(task);
 * 
 * 
 * 2. MULTI-MODAL ANALYSIS:
 * 
 * const task = new Task({
 *   taskType: 'multi-modal',
 *   payload: {
 *     prompt: 'What objects are in this image?',
 *     image: {
 *       mimeType: 'image/jpeg',
 *       data: base64EncodedImage
 *     }
 *   }
 * });
 * 
 * const response = await gemini.call(task);
 * 
 * 
 * 3. FACTUAL RESEARCH:
 * 
 * const task = new Task({
 *   taskType: 'factual',
 *   payload: {
 *     systemPrompt: 'Provide accurate, well-sourced information.',
 *     prompt: 'Explain the current state of quantum computing research.'
 *   }
 * });
 * 
 * 
 * 4. INTEGRATION WITH ORCHESTRATOR:
 * 
 * import Orchestrator from './Orchestrator';
 * import GeminiAdapter from './GeminiAdapter';
 * 
 * const orchestrator = new Orchestrator();
 * 
 * const gemini = new GeminiAdapter('gemini-reasoning', {
 *   apiKey: process.env.GOOGLE_API_KEY || '',
 *   temperature: 0.3  // Lower for factual tasks
 * });
 * 
 * orchestrator.addAdapter(gemini);
 * 
 * // Set Gemini as primary for reasoning tasks
 * orchestrator.setRoutingRule({
 *   taskType: 'reasoning',
 *   primaryAdapter: 'gemini-reasoning',
 *   fallbackAdapters: ['gpt-4']
 * });
 * 
 * 
 * 5. CONFIGURATION OPTIONS:
 * 
 * const geminiConfig: GeminiConfig = {
 *   apiKey: 'your-api-key',
 *   model: 'gemini-1.5-pro-latest',  // or 'gemini-pro-vision' for multi-modal
 *   temperature: 0.4,                 // Lower = more deterministic
 *   topP: 0.95,
 *   topK: 40,
 *   maxTokens: 8192,
 *   maxRetries: 3,
 *   retryDelay: 1000
 * };
 * 
 * 
 * API KEY SETUP:
 * 
 * 1. Get API key from: https://makersuite.google.com/app/apikey
 * 2. Set environment variable:
 *    export GOOGLE_API_KEY='your-api-key'
 * 3. Or pass directly in config (not recommended for production)
 * 
 * 
 * GEMINI-SPECIFIC FEATURES:
 * 
 * - Large Context Window: Up to 1M tokens (Gemini 1.5 Pro)
 * - Multi-modal: Native image + text processing
 * - Function Calling: Supports structured outputs (future enhancement)
 * - Safety Filters: Built-in content safety ratings
 * - Grounding: Can cite sources (with Vertex AI integration)
 * 
 * 
 * COMPARISON WITH GPT-4:
 * 
 * Use Gemini for:
 * - Complex reasoning and planning tasks
 * - Multi-modal analysis (image + text)
 * - Large document analysis (1M+ tokens)
 * - Factual research requiring grounding
 * 
 * Use GPT-4 for:
 * - Creative writing and storytelling
 * - Code generation with specific frameworks
 * - Tasks requiring specific tone/style
 * - Established ecosystem integration
 */

export default GeminiAdapter;
