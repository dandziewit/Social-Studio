/**
 * PromptTemplates Demo - Usage examples
 * 
 * FIXES APPLIED:
 * - Added global declaration for console
 */

import PromptTemplates, { getPromptTemplates } from './PromptTemplates';

// TypeScript compatibility: Declare Node.js runtime globals
declare const console: any;

console.log('=== PromptTemplates Demo ===\n');

// Get templates instance
const templates = getPromptTemplates();

// Example 1: List all templates
console.log('--- Example 1: Available Templates ---');
const allTemplates = templates.listTemplates();
console.log(`Total templates: ${allTemplates.length}\n`);

allTemplates.forEach(t => {
  console.log(`${t.id}`);
  console.log(`  Name: ${t.name}`);
  console.log(`  Task Type: ${t.taskType}`);
  console.log(`  Optimized for: ${t.modelOptimized.join(', ') || 'generic'}`);
  console.log('');
});

// Example 2: GPT-4 Creative Writing
console.log('\n--- Example 2: GPT-4 Creative Writing ---');

const creativeTemplate = templates.getTemplate('gpt-creative-writing');
if (creativeTemplate) {
  console.log('Template:', creativeTemplate.name);
  console.log('Required variables:', creativeTemplate.variables?.join(', '));
  
  const rendered = templates.renderTemplate('gpt-creative-writing', {
    contentType: 'a short story',
    topic: 'AI discovering creativity',
    style: 'science fiction',
    tone: 'optimistic and thought-provoking',
    length: 800,
    audience: 'technology enthusiasts'
  });
  
  if (rendered) {
    console.log('\n--- System Prompt ---');
    console.log(rendered.system);
    console.log('\n--- User Prompt ---');
    console.log(rendered.user);
  }
}

// Example 3: GPT-4 Code Generation
console.log('\n\n--- Example 3: Code Generation Template ---');

const codeRendered = templates.renderTemplate('gpt-coding-generation', {
  language: 'TypeScript',
  taskDescription: 'implement a debounce function for API calls',
  constraints: 'must support TypeScript generics and handle async functions'
});

if (codeRendered) {
  console.log('System:', codeRendered.system);
  console.log('\nUser Prompt:');
  console.log(codeRendered.user);
}

// Example 4: Gemini Multi-modal
console.log('\n\n--- Example 4: Gemini Multi-modal ---');

const multimodalRendered = templates.renderTemplate('gemini-multimodal-analysis', {
  task: 'describe the scene and identify any text',
  focusAreas: [
    'main subjects and their actions',
    'environment and setting',
    'visible text or signs',
    'overall mood and atmosphere'
  ]
});

if (multimodalRendered) {
  console.log('System:', multimodalRendered.system);
  console.log('\nUser Prompt:');
  console.log(multimodalRendered.user);
}

// Example 5: Reasoning Template
console.log('\n\n--- Example 5: Reasoning Template ---');

const reasoningRendered = templates.renderTemplate('gpt-reasoning-analysis', {
  problem: `A farmer has 100 feet of fence to enclose a rectangular garden. 
  What dimensions will give the garden the maximum area?`
});

if (reasoningRendered) {
  console.log('System:', reasoningRendered.system);
  console.log('\nUser Prompt:');
  console.log(reasoningRendered.user);
}

// Example 6: Get templates by task type
console.log('\n\n--- Example 6: Templates by Task Type ---');

const creativeTemplates = templates.getTemplatesByTaskType('creative');
console.log(`Creative templates: ${creativeTemplates.length}`);
creativeTemplates.forEach(t => {
  console.log(`  - ${t.name} (${t.modelOptimized?.join(', ') || 'generic'})`);
});

const codingTemplates = templates.getTemplatesByTaskType('coding');
console.log(`\nCoding templates: ${codingTemplates.length}`);
codingTemplates.forEach(t => {
  console.log(`  - ${t.name} (${t.modelOptimized?.join(', ') || 'generic'})`);
});

// Example 7: Get templates by model
console.log('\n\n--- Example 7: Templates by Model ---');

const gptTemplates = templates.getTemplatesByModel('gpt-4');
console.log(`GPT-4 optimized: ${gptTemplates.length}`);
gptTemplates.forEach(t => console.log(`  - ${t.name}`));

const geminiTemplates = templates.getTemplatesByModel('gemini');
console.log(`\nGemini optimized: ${geminiTemplates.length}`);
geminiTemplates.forEach(t => console.log(`  - ${t.name}`));

// Example 8: Get best template for model + task type
console.log('\n\n--- Example 8: Best Template Selection ---');

const bestForGPT = templates.getBestTemplate('gpt-4', 'creative');
console.log(`Best for GPT-4 + creative: ${bestForGPT?.name}`);

const bestForGemini = templates.getBestTemplate('gemini', 'multi-modal');
console.log(`Best for Gemini + multi-modal: ${bestForGemini?.name}`);

const bestForQwen = templates.getBestTemplate('qwen', 'coding');
console.log(`Best for Qwen + coding: ${bestForQwen?.name}`);

// Example 9: Variable validation
console.log('\n\n--- Example 9: Variable Validation ---');

const validation1 = templates.validateVariables('gpt-creative-writing', {
  contentType: 'story',
  topic: 'space',
  style: 'sci-fi',
  tone: 'serious',
  length: 1000,
  audience: 'adults'
});

console.log('Valid variables:', validation1.valid);
console.log('Missing:', validation1.missing);
console.log('Extra:', validation1.extra);

const validation2 = templates.validateVariables('gpt-creative-writing', {
  contentType: 'story',
  topic: 'space'
  // Missing: style, tone, length, audience
});

console.log('\nIncomplete variables:');
console.log('Valid:', validation2.valid);
console.log('Missing:', validation2.missing);

// Example 10: Register custom template
console.log('\n\n--- Example 10: Custom Template Registration ---');

templates.registerTemplate({
  id: 'custom-summarization',
  name: 'Custom Summarization',
  description: 'Summarize content with specific focus',
  systemPrompt: 'You are an expert at creating concise, accurate summaries.',
  userPromptTemplate: `Summarize the following {{contentType}}:

{{content}}

Requirements:
- Length: {{maxWords}} words maximum
- Focus on: {{focus}}
- Format: {{format}}`,
  variables: ['contentType', 'content', 'maxWords', 'focus', 'format'],
  modelOptimized: ['gpt-4', 'claude'],
  taskType: 'factual'
});

console.log('Registered custom template: custom-summarization');

const customRendered = templates.renderTemplate('custom-summarization', {
  contentType: 'article',
  content: 'Long article text here...',
  maxWords: 100,
  focus: 'key findings and implications',
  format: 'bullet points'
});

if (customRendered) {
  console.log('\nRendered custom template:');
  console.log(customRendered.user);
}

// Example 11: Template with conditionals
console.log('\n\n--- Example 11: Conditional Rendering ---');

// With constraints
const withConstraints = templates.renderTemplate('gpt-coding-generation', {
  language: 'Python',
  taskDescription: 'sort a list',
  constraints: 'use only built-in functions'
});

console.log('With constraints:');
console.log(withConstraints?.user);

// Without constraints
const withoutConstraints = templates.renderTemplate('gpt-coding-generation', {
  language: 'Python',
  taskDescription: 'sort a list'
});

console.log('\nWithout constraints:');
console.log(withoutConstraints?.user);

// Example 12: Qwen templates
console.log('\n\n--- Example 12: Qwen Templates ---');

const qwenCode = templates.renderTemplate('qwen-code-analysis', {
  language: 'JavaScript',
  code: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`
});

if (qwenCode) {
  console.log('Qwen Code Analysis:');
  console.log(qwenCode.user);
}

// Example 13: Claude templates
console.log('\n\n--- Example 13: Claude Templates ---');

const claudeCreative = templates.renderTemplate('claude-creative-narrative', {
  format: 'short story',
  theme: 'the cost of progress',
  voice: 'contemplative and nuanced',
  pacing: 'slow and deliberate',
  additionalElements: 'multiple character perspectives'
});

if (claudeCreative) {
  console.log('Claude Creative:');
  console.log(claudeCreative.user);
}

// Example 14: Generic templates
console.log('\n\n--- Example 14: Generic Templates ---');

const genericTask = templates.renderTemplate('generic-task-completion', {
  instruction: 'Translate the following text to Spanish',
  context: 'This is for a business email',
  format: 'formal business language'
});

if (genericTask) {
  console.log('Generic Task:');
  console.log(genericTask.user);
}

// Example 15: Summary
console.log('\n\n--- Example 15: Summary ---');

const stats = {
  total: templates.listTemplates().length,
  byTaskType: {
    creative: templates.getTemplatesByTaskType('creative').length,
    coding: templates.getTemplatesByTaskType('coding').length,
    reasoning: templates.getTemplatesByTaskType('reasoning').length,
    factual: templates.getTemplatesByTaskType('factual').length,
    multiModal: templates.getTemplatesByTaskType('multi-modal').length,
    default: templates.getTemplatesByTaskType('default').length
  },
  byModel: {
    gpt4: templates.getTemplatesByModel('gpt-4').length,
    gemini: templates.getTemplatesByModel('gemini').length,
    claude: templates.getTemplatesByModel('claude').length,
    qwen: templates.getTemplatesByModel('qwen').length
  }
};

console.log('Template Statistics:');
console.log(JSON.stringify(stats, null, 2));

console.log('\n=== Demo Complete ===');
