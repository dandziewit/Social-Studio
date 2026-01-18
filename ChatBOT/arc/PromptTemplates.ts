/**
 * PromptTemplates Module for ARC Platform
 * 
 * Manages structured prompts optimized for different models and task types.
 * Provides template interpolation, model-specific formatting, and best practices.
 * 
 * DESIGN PRINCIPLES:
 * - Model-specific optimization (GPT, Gemini, Claude, Qwen)
 * - Task-type specialization (reasoning, coding, creative, factual, multi-modal)
 * - Template variable support
 * - Domain-agnostic content
 * - Easy orchestrator integration
 */

import { TaskType } from './types';

/**
 * Template variable type
 */
export interface TemplateVariables {
  [key: string]: string | number | boolean | any;
}

/**
 * Prompt template structure
 */
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt?: string;
  userPromptTemplate: string;
  variables?: string[];
  modelOptimized?: string[];
  taskType: TaskType;
  examples?: Array<{
    input: TemplateVariables;
    expectedOutput?: string;
  }>;
}

/**
 * PromptTemplates class for managing and rendering templates
 */
export class PromptTemplates {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default templates for common use cases
   */
  private initializeDefaultTemplates(): void {
    // ===== GPT-4 Optimized Templates =====

    // GPT-4: Creative Writing
    this.registerTemplate({
      id: 'gpt-creative-writing',
      name: 'GPT-4 Creative Writing',
      description: 'Optimized for creative content generation with GPT-4',
      systemPrompt: 'You are a creative writer with expertise in various literary styles. Produce engaging, original content that captures the specified tone and style.',
      userPromptTemplate: `Create {{contentType}} about {{topic}}.

Requirements:
- Style: {{style}}
- Tone: {{tone}}
- Length: {{length}} words
- Target audience: {{audience}}

Focus on originality and engaging storytelling.`,
      variables: ['contentType', 'topic', 'style', 'tone', 'length', 'audience'],
      modelOptimized: ['gpt-4', 'gpt-4-turbo'],
      taskType: 'creative',
      examples: [{
        input: {
          contentType: 'a short story',
          topic: 'artificial intelligence discovering emotions',
          style: 'science fiction',
          tone: 'thoughtful and optimistic',
          length: 500,
          audience: 'general readers'
        }
      }]
    });

    // GPT-4: Code Generation
    this.registerTemplate({
      id: 'gpt-coding-generation',
      name: 'GPT-4 Code Generation',
      description: 'Optimized for code generation with best practices',
      systemPrompt: 'You are an expert software engineer. Write clean, efficient, well-documented code following industry best practices and coding standards.',
      userPromptTemplate: `Write {{language}} code to {{taskDescription}}.

Requirements:
- Language: {{language}}
- Include comments and documentation
- Follow {{language}} best practices
- Consider edge cases and error handling
{{#if constraints}}
- Constraints: {{constraints}}
{{/if}}

Provide the complete, runnable code.`,
      variables: ['language', 'taskDescription', 'constraints'],
      modelOptimized: ['gpt-4', 'gpt-4-turbo'],
      taskType: 'coding',
      examples: [{
        input: {
          language: 'Python',
          taskDescription: 'implement a binary search algorithm',
          constraints: 'must handle empty arrays and return -1 if not found'
        }
      }]
    });

    // GPT-4: Reasoning and Analysis
    this.registerTemplate({
      id: 'gpt-reasoning-analysis',
      name: 'GPT-4 Reasoning',
      description: 'Optimized for complex reasoning and logical analysis',
      systemPrompt: 'You are a logical reasoning expert. Break down complex problems step-by-step, show your reasoning clearly, and arrive at well-supported conclusions.',
      userPromptTemplate: `Analyze and solve the following problem:

{{problem}}

Please:
1. Break down the problem into components
2. Show your reasoning step-by-step
3. Consider alternative approaches
4. Provide a clear, justified conclusion

Be thorough and precise in your analysis.`,
      variables: ['problem'],
      modelOptimized: ['gpt-4', 'gpt-4-turbo'],
      taskType: 'reasoning',
      examples: [{
        input: {
          problem: 'If a train travels 120 miles in 2 hours, and another train travels 180 miles in 3 hours, which train is faster and by how much?'
        }
      }]
    });

    // ===== Gemini Optimized Templates =====

    // Gemini: Multi-modal Analysis
    this.registerTemplate({
      id: 'gemini-multimodal-analysis',
      name: 'Gemini Multi-modal',
      description: 'Optimized for Gemini\'s multi-modal capabilities',
      systemPrompt: 'You are an expert at analyzing visual content. Provide detailed, accurate descriptions and insights from images, combining visual understanding with contextual knowledge.',
      userPromptTemplate: `Analyze the provided image and {{task}}.

Focus on:
{{#each focusAreas}}
- {{this}}
{{/each}}

Provide a comprehensive analysis with specific details.`,
      variables: ['task', 'focusAreas'],
      modelOptimized: ['gemini', 'gemini-pro', 'gemini-pro-vision'],
      taskType: 'multi-modal',
      examples: [{
        input: {
          task: 'identify all objects and their spatial relationships',
          focusAreas: ['main subjects', 'background elements', 'colors and composition', 'any text visible']
        }
      }]
    });

    // Gemini: Factual Information
    this.registerTemplate({
      id: 'gemini-factual-research',
      name: 'Gemini Factual Research',
      description: 'Optimized for factual information retrieval',
      systemPrompt: 'You are a knowledgeable research assistant. Provide accurate, well-sourced information with clear explanations. When uncertain, acknowledge limitations.',
      userPromptTemplate: `Research and explain: {{query}}

Requirements:
- Provide accurate, up-to-date information
- Structure the response logically
- Include relevant context and background
{{#if depth}}
- Depth level: {{depth}}
{{/if}}

Be comprehensive yet concise.`,
      variables: ['query', 'depth'],
      modelOptimized: ['gemini', 'gemini-pro'],
      taskType: 'factual',
      examples: [{
        input: {
          query: 'How does photosynthesis work?',
          depth: 'intermediate'
        }
      }]
    });

    // ===== Claude Optimized Templates =====

    // Claude: Creative Writing
    this.registerTemplate({
      id: 'claude-creative-narrative',
      name: 'Claude Creative Narrative',
      description: 'Optimized for Claude\'s narrative and creative abilities',
      systemPrompt: 'You are a skilled storyteller and creative writer. Craft engaging narratives with rich detail, compelling characters, and thoughtful themes.',
      userPromptTemplate: `Write a {{format}} on the theme of {{theme}}.

Style preferences:
- Voice: {{voice}}
- Pacing: {{pacing}}
{{#if additionalElements}}
- Additional elements: {{additionalElements}}
{{/if}}

Create something memorable and meaningful.`,
      variables: ['format', 'theme', 'voice', 'pacing', 'additionalElements'],
      modelOptimized: ['claude', 'claude-3'],
      taskType: 'creative',
      examples: [{
        input: {
          format: 'short scene',
          theme: 'unexpected friendship',
          voice: 'warm and humorous',
          pacing: 'moderate'
        }
      }]
    });

    // Claude: Reasoning
    this.registerTemplate({
      id: 'claude-analytical-reasoning',
      name: 'Claude Analytical Reasoning',
      description: 'Optimized for Claude\'s analytical capabilities',
      systemPrompt: 'You are an analytical thinker skilled at examining complex issues from multiple perspectives. Provide balanced, nuanced analysis with clear reasoning.',
      userPromptTemplate: `Analyze the following from multiple angles:

{{topic}}

Consider:
- Different viewpoints and perspectives
- Underlying assumptions
- Potential implications
- Strengths and weaknesses of each view

Provide a balanced, thoughtful analysis.`,
      variables: ['topic'],
      modelOptimized: ['claude', 'claude-3'],
      taskType: 'reasoning',
      examples: [{
        input: {
          topic: 'The impact of remote work on team collaboration and productivity'
        }
      }]
    });

    // ===== Qwen Optimized Templates =====

    // Qwen: Code Understanding
    this.registerTemplate({
      id: 'qwen-code-analysis',
      name: 'Qwen Code Analysis',
      description: 'Optimized for Qwen\'s code understanding',
      systemPrompt: 'You are a code analysis expert. Examine code for functionality, potential issues, and improvements. Provide clear, actionable feedback.',
      userPromptTemplate: `Analyze the following {{language}} code:

\`\`\`{{language}}
{{code}}
\`\`\`

Please provide:
1. Functionality explanation
2. Potential issues or bugs
3. Performance considerations
4. Suggested improvements

Be specific and constructive.`,
      variables: ['language', 'code'],
      modelOptimized: ['qwen', 'qwen-max', 'qwen-plus'],
      taskType: 'coding',
      examples: [{
        input: {
          language: 'Python',
          code: 'def factorial(n):\n    if n == 0: return 1\n    return n * factorial(n-1)'
        }
      }]
    });

    // Qwen: Multi-modal
    this.registerTemplate({
      id: 'qwen-visual-qa',
      name: 'Qwen Visual Q&A',
      description: 'Optimized for Qwen\'s visual understanding',
      systemPrompt: 'You are a visual understanding expert. Analyze images accurately and answer questions with specific details drawn from the visual content.',
      userPromptTemplate: `Based on the provided image, answer: {{question}}

Provide:
- Direct answer based on visual evidence
- Specific details from the image that support your answer
- Any relevant context or interpretation

Be precise and reference specific visual elements.`,
      variables: ['question'],
      modelOptimized: ['qwen-vl', 'qwen-vl-plus'],
      taskType: 'multi-modal',
      examples: [{
        input: {
          question: 'What is the main activity happening in this image?'
        }
      }]
    });

    // ===== Generic Templates (Model-agnostic) =====

    // Generic: Task Completion
    this.registerTemplate({
      id: 'generic-task-completion',
      name: 'Generic Task Completion',
      description: 'General-purpose task completion template',
      systemPrompt: 'You are a helpful AI assistant. Complete the requested task accurately and efficiently.',
      userPromptTemplate: `{{instruction}}

{{#if context}}
Context: {{context}}
{{/if}}

{{#if format}}
Output format: {{format}}
{{/if}}`,
      variables: ['instruction', 'context', 'format'],
      modelOptimized: [],
      taskType: 'default',
      examples: [{
        input: {
          instruction: 'Summarize the key points from the following text',
          context: 'This is for a business presentation',
          format: 'bullet points'
        }
      }]
    });

    // Generic: Question Answering
    this.registerTemplate({
      id: 'generic-qa',
      name: 'Generic Q&A',
      description: 'Simple question-answering template',
      systemPrompt: 'You are a knowledgeable assistant. Provide accurate, helpful answers to questions.',
      userPromptTemplate: `{{question}}

{{#if constraints}}
Please note: {{constraints}}
{{/if}}`,
      variables: ['question', 'constraints'],
      modelOptimized: [],
      taskType: 'factual',
      examples: [{
        input: {
          question: 'What are the main components of a computer?'
        }
      }]
    });
  }

  /**
   * Register a new template
   */
  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get templates by task type
   */
  getTemplatesByTaskType(taskType: TaskType): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(
      t => t.taskType === taskType
    );
  }

  /**
   * Get templates optimized for specific model
   */
  getTemplatesByModel(model: string): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(
      t => t.modelOptimized?.includes(model)
    );
  }

  /**
   * Get best template for model and task type combination
   */
  getBestTemplate(model: string, taskType: TaskType): PromptTemplate | null {
    // First try: exact match (model + task type)
    const exactMatch = Array.from(this.templates.values()).find(
      t => t.modelOptimized?.includes(model) && t.taskType === taskType
    );
    if (exactMatch) return exactMatch;

    // Second try: any template for the task type
    const taskMatch = this.getTemplatesByTaskType(taskType)[0];
    if (taskMatch) return taskMatch;

    // Fallback: generic template
    return this.getTemplate('generic-task-completion') || null;
  }

  /**
   * Render template with variables
   * 
   * Simple template interpolation: {{variable}} syntax
   */
  renderTemplate(
    templateId: string,
    variables: TemplateVariables
  ): { system?: string; user: string } | null {
    const template = this.getTemplate(templateId);
    if (!template) return null;

    const system = template.systemPrompt
      ? this.interpolate(template.systemPrompt, variables)
      : undefined;

    const user = this.interpolate(template.userPromptTemplate, variables);

    return { system, user };
  }

  /**
   * Simple template interpolation
   * Supports {{variable}} syntax
   */
  private interpolate(template: string, variables: TemplateVariables): string {
    let result = template;

    // Replace {{variable}} with values
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }

    // Handle conditional blocks {{#if variable}}...{{/if}}
    result = result.replace(
      /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, varName, content) => {
        return variables[varName] ? content.trim() : '';
      }
    );

    // Handle array iteration {{#each array}}...{{/each}}
    result = result.replace(
      /\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (match, varName, itemTemplate) => {
        const array = variables[varName];
        if (!Array.isArray(array)) return '';
        
        return array.map(item => {
          return itemTemplate.replace(/\{\{this\}\}/g, String(item));
        }).join('\n');
      }
    );

    return result.trim();
  }

  /**
   * List all available templates
   */
  listTemplates(): Array<{
    id: string;
    name: string;
    description: string;
    taskType: TaskType;
    modelOptimized: string[];
  }> {
    return Array.from(this.templates.values()).map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      taskType: t.taskType,
      modelOptimized: t.modelOptimized || []
    }));
  }

  /**
   * Validate template variables
   */
  validateVariables(templateId: string, variables: TemplateVariables): {
    valid: boolean;
    missing: string[];
    extra: string[];
  } {
    const template = this.getTemplate(templateId);
    if (!template) {
      return { valid: false, missing: [], extra: [] };
    }

    const required = new Set(template.variables || []);
    const provided = new Set(Object.keys(variables));

    const missing = Array.from(required).filter(v => !provided.has(v));
    const extra = Array.from(provided).filter(v => !required.has(v));

    return {
      valid: missing.length === 0,
      missing,
      extra
    };
  }
}

/**
 * Singleton instance
 */
let globalTemplates: PromptTemplates | null = null;

/**
 * Get global templates instance
 */
export function getPromptTemplates(): PromptTemplates {
  if (!globalTemplates) {
    globalTemplates = new PromptTemplates();
  }
  return globalTemplates;
}

/**
 * INTEGRATION WITH ORCHESTRATOR:
 * 
 * The Orchestrator can use PromptTemplates to optimize prompts for each adapter:
 * 
 * 1. BASIC INTEGRATION:
 * 
 * import { getPromptTemplates } from './PromptTemplates';
 * 
 * class Orchestrator {
 *   private templates = getPromptTemplates();
 *   
 *   async routeTask(task: Task): Promise<ARCResponse> {
 *     // Determine adapter
 *     const adapter = this.selectAdapter(task);
 *     
 *     // Get optimal template
 *     const template = this.templates.getBestTemplate(
 *       adapter.name,
 *       task.taskType
 *     );
 *     
 *     if (template) {
 *       // Render template with task payload
 *       const rendered = this.templates.renderTemplate(
 *         template.id,
 *         task.payload
 *       );
 *       
 *       // Update task payload with rendered prompts
 *       task.payload.systemPrompt = rendered?.system;
 *       task.payload.prompt = rendered?.user;
 *     }
 *     
 *     return adapter.call(task);
 *   }
 * }
 * 
 * 
 * 2. ADVANCED: TEMPLATE SELECTION BASED ON TASK METADATA:
 * 
 * async routeTask(task: Task): Promise<ARCResponse> {
 *   const adapter = this.selectAdapter(task);
 *   
 *   // Allow override via metadata
 *   const templateId = task.metadata?.templateId;
 *   
 *   const template = templateId
 *     ? this.templates.getTemplate(templateId)
 *     : this.templates.getBestTemplate(adapter.name, task.taskType);
 *   
 *   if (template) {
 *     const rendered = this.templates.renderTemplate(
 *       template.id,
 *       task.payload
 *     );
 *     
 *     task.payload = {
 *       ...task.payload,
 *       systemPrompt: rendered?.system,
 *       prompt: rendered?.user
 *     };
 *   }
 *   
 *   return adapter.call(task);
 * }
 * 
 * 
 * 3. USAGE IN TASK CREATION:
 * 
 * import Task from './Task';
 * import { getPromptTemplates } from './PromptTemplates';
 * 
 * const templates = getPromptTemplates();
 * 
 * // Create task with template
 * const task = new Task({
 *   taskType: 'creative',
 *   payload: {
 *     contentType: 'a blog post',
 *     topic: 'sustainable technology',
 *     style: 'informative',
 *     tone: 'optimistic',
 *     length: 800,
 *     audience: 'tech enthusiasts'
 *   },
 *   metadata: {
 *     templateId: 'gpt-creative-writing'
 *   }
 * });
 * 
 * 
 * 4. ADAPTER-SPECIFIC FORMATTING:
 * 
 * class GPTAdapter extends ModelAdapter {
 *   async call(task: Task): Promise<ARCResponse> {
 *     // Template might be pre-rendered by orchestrator
 *     const messages = [];
 *     
 *     if (task.payload.systemPrompt) {
 *       messages.push({
 *         role: 'system',
 *         content: task.payload.systemPrompt
 *       });
 *     }
 *     
 *     messages.push({
 *       role: 'user',
 *       content: task.payload.prompt || task.payload.content
 *     });
 *     
 *     return this.callAPI(messages);
 *   }
 * }
 * 
 * 
 * 5. DYNAMIC TEMPLATE CREATION:
 * 
 * // Application can register custom templates at runtime
 * const templates = getPromptTemplates();
 * 
 * templates.registerTemplate({
 *   id: 'custom-data-analysis',
 *   name: 'Custom Data Analysis',
 *   description: 'Domain-specific data analysis template',
 *   systemPrompt: 'You are a data analyst specializing in {{domain}}.',
 *   userPromptTemplate: `Analyze the following data: {{data}}
 *   
 *   Focus on: {{focusAreas}}
 *   Provide insights and recommendations.`,
 *   variables: ['domain', 'data', 'focusAreas'],
 *   modelOptimized: ['gpt-4'],
 *   taskType: 'reasoning'
 * });
 * 
 * 
 * 6. CLIENT-SIDE USAGE (Browser/API):
 * 
 * // Client can request specific templates
 * const response = await fetch('/api/task', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     task: {
 *       taskId: 'task-123',
 *       taskType: 'creative',
 *       payload: {
 *         // Template variables
 *         contentType: 'story',
 *         topic: 'space exploration',
 *         style: 'science fiction',
 *         tone: 'adventurous',
 *         length: 1000,
 *         audience: 'young adults'
 *       },
 *       metadata: {
 *         templateId: 'gpt-creative-writing' // Optional: specify template
 *       }
 *     }
 *   })
 * });
 */

export default PromptTemplates;
