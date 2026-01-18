/**
 * GPTAdapter: OpenAI GPT model implementation
 * 
 * This adapter integrates with OpenAI's API and can be used as a template
 * for other model providers (Gemini, Qwen, Claude, etc.)
 * 
 * FIXES APPLIED:
 * - Added global declarations for Node.js runtime (console, setTimeout, fetch)
 * - Fixed optional chaining for task.metadata access
 * - All types properly imported and used
 */

import { Task, ARCResponse, ModelAdapter } from './types';

// TypeScript compatibility: Declare Node.js runtime globals
declare const console: any;
declare function setTimeout(callback: () => void, ms: number): any;
declare function fetch(url: string, init?: any): Promise<any>;

interface GPTConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
  retryDelay?: number;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
}

interface OpenAIResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class GPTAdapter implements ModelAdapter {
  name: string;
  config: GPTConfig;
  
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private maxTokens: number;
  private temperature: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(name: string, config: GPTConfig) {
    this.name = name;
    this.config = config;
    
    // Initialize configuration with defaults
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4-turbo-preview';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.7;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000; // milliseconds
  }

  /**
   * Main call method: sends task to GPT API and returns structured response
   */
  async call(task: Task): Promise<ARCResponse> {
    const startTime = Date.now();
    
    try {
      // Extract content from task payload
      const messages = this.buildMessages(task);
      
      // Make API call with retry logic
      const apiResponse = await this.callWithRetry(messages);
      
      // Parse and structure the response
      const output = apiResponse.choices[0]?.message?.content || '';
      const confidence = this.calculateConfidence(apiResponse);
      
      return {
        taskId: task.taskId,
        output,
        confidence,
        metadata: {
          model: this.model,
          adapter: this.name,
          tokens: apiResponse.usage,
          finishReason: apiResponse.choices[0]?.finish_reason,
          latencyMs: Date.now() - startTime,
          taskType: task.taskType
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
   * Build OpenAI-formatted messages from task payload
   * 
   * Adapt this method based on your task structure.
   * Different models may require different message formats.
   */
  private buildMessages(task: Task): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [];
    
    // Add system prompt if provided
    if (task.payload.systemPrompt || task.metadata?.systemPrompt) {
      messages.push({
        role: 'system',
        content: task.payload.systemPrompt || task.metadata?.systemPrompt || ''
      });
    }
    
    // Add main content as user message
    if (task.payload.prompt) {
      messages.push({
        role: 'user',
        content: task.payload.prompt
      });
    } else if (task.payload.messages) {
      // Support pre-formatted messages
      messages.push(...task.payload.messages);
    } else if (task.payload.content) {
      messages.push({
        role: 'user',
        content: task.payload.content
      });
    }
    
    return messages;
  }

  /**
   * Make API call with exponential backoff retry logic
   * 
   * Retries on rate limits, timeouts, and transient errors.
   */
  private async callWithRetry(
    messages: OpenAIMessage[],
    attempt: number = 0
  ): Promise<OpenAIResponse> {
    try {
      const response = await this.makeAPIRequest(messages);
      return response;
      
    } catch (error) {
      const isRetriable = this.isRetriableError(error);
      
      if (isRetriable && attempt < this.maxRetries) {
        // Exponential backoff: wait longer with each retry
        const delay = this.retryDelay * Math.pow(2, attempt);
        console.log(`[GPTAdapter] Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms`);
        
        await this.sleep(delay);
        return this.callWithRetry(messages, attempt + 1);
      }
      
      // Max retries exceeded or non-retriable error
      throw error;
    }
  }

  /**
   * Make the actual HTTP request to OpenAI API
   */
  private async makeAPIRequest(messages: OpenAIMessage[]): Promise<OpenAIResponse> {
    const requestBody: OpenAIRequest = {
      model: this.model,
      messages,
      max_tokens: this.maxTokens,
      temperature: this.temperature
    };
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenAI API error (${response.status}): ${errorBody}`
      );
    }
    
    return response.json();
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
   * This is a simple heuristic. For production, consider:
   * - logprobs from the API
   * - Multiple completions with temperature sampling
   * - Task-specific confidence metrics
   */
  private calculateConfidence(response: OpenAIResponse): number {
    const finishReason = response.choices[0]?.finish_reason;
    
    // Full completion = higher confidence
    if (finishReason === 'stop') {
      return 0.95;
    }
    
    // Truncated due to length
    if (finishReason === 'length') {
      return 0.7;
    }
    
    // Other cases (filtered, etc.)
    return 0.5;
  }

  /**
   * Check if this adapter supports a given task type
   */
  supportsTaskType(taskType: string): boolean {
    // GPT is versatile - supports most text-based tasks
    const supportedTypes = [
      'text-generation',
      'completion',
      'chat',
      'analysis',
      'summarization',
      'translation',
      'code-generation'
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
 * EXTENSION GUIDE FOR OTHER MODELS:
 * 
 * 1. GOOGLE GEMINI:
 *    - Change baseUrl to 'https://generativelanguage.googleapis.com/v1'
 *    - Different message format: { parts: [{ text: "..." }] }
 *    - API key in query param: ?key=${apiKey}
 *    - Response structure: response.candidates[0].content.parts[0].text
 *    - Consider safety ratings in confidence calculation
 * 
 * 2. ALIBABA QWEN (via DashScope):
 *    - baseUrl: 'https://dashscope.aliyuncs.com/api/v1'
 *    - Header: 'Authorization': `Bearer ${apiKey}`
 *    - Model names: 'qwen-turbo', 'qwen-plus', 'qwen-max'
 *    - Similar message format to OpenAI
 *    - May need to handle streaming differently
 * 
 * 3. ANTHROPIC CLAUDE:
 *    - baseUrl: 'https://api.anthropic.com/v1'
 *    - Headers: 'x-api-key' and 'anthropic-version'
 *    - System prompt separate from messages array
 *    - Response: content[0].text
 * 
 * GENERAL PATTERN:
 * 1. Extend ModelAdapter interface
 * 2. Customize buildMessages() for provider's format
 * 3. Update makeAPIRequest() for provider's endpoint/headers
 * 4. Adjust response parsing in call() method
 * 5. Update calculateConfidence() for provider-specific metrics
 * 6. Keep retry logic and error handling structure
 * 
 * Example stub for Gemini:
 * 
 * export class GeminiAdapter extends GPTAdapter {
 *   constructor(name: string, config: any) {
 *     super(name, {
 *       ...config,
 *       baseUrl: 'https://generativelanguage.googleapis.com/v1',
 *       model: config.model || 'gemini-pro'
 *     });
 *   }
 * 
 *   private buildMessages(task: Task) {
 *     // Transform to Gemini format
 *     return {
 *       contents: [{
 *         parts: [{ text: task.payload.prompt }]
 *       }]
 *     };
 *   }
 * 
 *   private async makeAPIRequest(messages: any) {
 *     // Gemini-specific request logic
 *   }
 * }
 */

export default GPTAdapter;
