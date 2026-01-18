/**
 * MergeOutputs Demo - Testing all merge strategies
 * 
 * FIXES APPLIED:
 * - Added global declaration for console
 */

import MergeOutputs, { mergeResponses, MergeStrategy } from './MergeOutputs';
import { ARCResponse } from './types';

// TypeScript compatibility: Declare Node.js runtime globals
declare const console: any;

console.log('=== MergeOutputs Utility Demo ===\n');

// Helper to create mock responses
function createResponse(
  taskId: string,
  output: any,
  confidence: number,
  adapter: string,
  success: boolean = true
): ARCResponse {
  return {
    taskId,
    output,
    confidence,
    metadata: { adapter },
    success,
    error: success ? undefined : 'Model failed',
    timestamp: new Date()
  };
}

// Example 1: Highest Confidence Strategy
console.log('--- Example 1: Highest Confidence ---');
const responses1 = [
  createResponse('task-001', 'Paris is the capital of France.', 0.95, 'gpt-4'),
  createResponse('task-001', 'The capital of France is Paris.', 0.88, 'gemini'),
  createResponse('task-001', 'Paris.', 0.75, 'qwen')
];

const merged1 = mergeResponses(responses1, 'highest-confidence');
console.log(`Output: ${merged1.output}`);
console.log(`Confidence: ${merged1.confidence}`);
console.log(`Selected from: ${merged1.mergeMetadata.sourceCount} sources`);
console.log(`Quality: ${(merged1.mergeMetadata.qualityAssessment.reliabilityScore * 100).toFixed(0)}%`);

// Example 2: Consensus Strategy (voting)
console.log('\n--- Example 2: Consensus (Voting) ---');
const responses2 = [
  createResponse('task-002', 'Yes', 0.90, 'gpt-4'),
  createResponse('task-002', 'Yes', 0.85, 'gemini'),
  createResponse('task-002', 'Yes', 0.88, 'claude'),
  createResponse('task-002', 'No', 0.70, 'qwen')
];

const merged2 = mergeResponses(responses2, 'consensus');
console.log(`Output: ${merged2.output}`);
console.log(`Confidence: ${(merged2.confidence! * 100).toFixed(0)}%`);
console.log(`Agreement ratio: ${(merged2.metadata.agreementRatio * 100).toFixed(0)}%`);
console.log(`Votes:`, merged2.metadata.votes);

// Example 3: Weighted Average Strategy (numeric)
console.log('\n--- Example 3: Weighted Average ---');
const responses3 = [
  createResponse('task-003', 7.5, 0.95, 'gpt-4'),
  createResponse('task-003', 8.0, 0.90, 'gemini'),
  createResponse('task-003', 7.8, 0.85, 'claude'),
  createResponse('task-003', 7.2, 0.80, 'qwen')
];

const merged3 = mergeResponses(responses3, 'weighted-average');
console.log(`Weighted average: ${(merged3.output as number).toFixed(2)}`);
console.log(`Confidence: ${(merged3.confidence! * 100).toFixed(0)}%`);
console.log(`Standard deviation: ${merged3.metadata.standardDeviation.toFixed(2)}`);

// Example 4: Concatenation Strategy
console.log('\n--- Example 4: Concatenation ---');
const responses4 = [
  createResponse('task-004', 'Quantum computing uses quantum bits or qubits.', 0.92, 'gpt-4'),
  createResponse('task-004', 'It leverages quantum superposition for parallel processing.', 0.88, 'gemini'),
  createResponse('task-004', 'Quantum entanglement enables faster computations.', 0.85, 'claude')
];

const merged4 = mergeResponses(responses4, 'concatenate');
console.log('Combined output:');
console.log(merged4.output);
console.log(`\nAverage confidence: ${(merged4.confidence! * 100).toFixed(0)}%`);

// Example 5: Ensemble Strategy (structured)
console.log('\n--- Example 5: Ensemble (Structured) ---');
const responses5 = [
  createResponse('task-005', 'The answer is 42', 0.90, 'gpt-4'),
  createResponse('task-005', '42 is the answer', 0.88, 'gemini')
];

const merged5 = mergeResponses(responses5, 'ensemble');
console.log('Ensemble structure:');
console.log(JSON.stringify(merged5.output, null, 2));

// Example 6: Contradiction Detection
console.log('\n--- Example 6: Contradiction Detection ---');
const responses6 = [
  createResponse('task-006', 'The Earth is approximately 4.5 billion years old.', 0.95, 'gpt-4'),
  createResponse('task-006', 'The Earth is about 6,000 years old.', 0.60, 'biased-model'),
  createResponse('task-006', 'Earth formed 4.54 billion years ago.', 0.93, 'gemini')
];

const merged6 = MergeOutputs.merge(responses6, {
  strategy: 'highest-confidence',
  detectContradictions: true
});

console.log(`Output: ${merged6.output}`);
console.log(`Contradictions detected: ${merged6.mergeMetadata.contradiction?.detected}`);
if (merged6.mergeMetadata.contradiction?.detected) {
  console.log(`Conflicting: ${merged6.mergeMetadata.contradiction.conflictingResponses.join(', ')}`);
  console.log(`Similarity: ${(merged6.mergeMetadata.contradiction.similarity * 100).toFixed(0)}%`);
}

// Example 7: Quality Assessment
console.log('\n--- Example 7: Quality Assessment ---');
const responses7 = [
  createResponse('task-007', 'Result A', 0.95, 'gpt-4'),
  createResponse('task-007', 'Result A', 0.92, 'gemini'),
  createResponse('task-007', 'Result A', 0.88, 'claude')
];

const merged7 = mergeResponses(responses7, 'consensus');
const quality = merged7.mergeMetadata.qualityAssessment;

console.log(`Overall confidence: ${(quality.overallConfidence * 100).toFixed(0)}%`);
console.log(`Agreement score: ${(quality.agreementScore * 100).toFixed(0)}%`);
console.log(`Reliability score: ${(quality.reliabilityScore * 100).toFixed(0)}%`);
console.log(`Has contradictions: ${quality.hasContradictions}`);
console.log(`Warnings: ${quality.warnings.length > 0 ? quality.warnings.join(', ') : 'None'}`);

// Example 8: Confidence Threshold Filtering
console.log('\n--- Example 8: Confidence Threshold ---');
const responses8 = [
  createResponse('task-008', 'High confidence answer', 0.95, 'gpt-4'),
  createResponse('task-008', 'Low confidence answer', 0.40, 'weak-model'),
  createResponse('task-008', 'Medium confidence answer', 0.75, 'gemini')
];

const merged8 = MergeOutputs.merge(responses8, {
  strategy: 'highest-confidence',
  confidenceThreshold: 0.6 // Only include responses with >60% confidence
});

console.log(`Output: ${merged8.output}`);
console.log(`Used ${merged8.mergeMetadata.sourceCount} total sources`);
console.log(`Qualified: ${merged8.mergeMetadata.sourceSummary.filter(s => s.confidence! >= 0.6).length}`);

// Example 9: Handling Failures
console.log('\n--- Example 9: Handling Failures ---');
const responses9 = [
  createResponse('task-009', 'Success', 0.90, 'gpt-4', true),
  createResponse('task-009', null, 0, 'broken-model', false),
  createResponse('task-009', 'Success', 0.85, 'gemini', true)
];

const merged9 = mergeResponses(responses9, 'highest-confidence');
console.log(`Output: ${merged9.output}`);
console.log(`Success: ${merged9.success}`);
console.log(`Successful sources: ${merged9.mergeMetadata.successfulSources}`);
console.log(`Failed sources: ${merged9.mergeMetadata.failedSources}`);

// Example 10: Minimum Sources Requirement
console.log('\n--- Example 10: Minimum Sources Requirement ---');
const responses10 = [
  createResponse('task-010', 'Only one succeeded', 0.90, 'gpt-4', true),
  createResponse('task-010', null, 0, 'failed-1', false),
  createResponse('task-010', null, 0, 'failed-2', false)
];

const merged10 = MergeOutputs.merge(responses10, {
  strategy: 'consensus',
  requireMinimumSources: 2 // Require at least 2 successful responses
});

console.log(`Success: ${merged10.success}`);
console.log(`Error: ${merged10.error}`);
console.log(`Warnings: ${merged10.mergeMetadata.qualityAssessment.warnings.join(', ')}`);

// Example 11: All Strategies Comparison
console.log('\n--- Example 11: Strategy Comparison ---');
const testResponses = [
  createResponse('task-011', 'Answer A', 0.95, 'gpt-4'),
  createResponse('task-011', 'Answer A', 0.90, 'gemini'),
  createResponse('task-011', 'Answer B', 0.70, 'qwen')
];

const strategies: MergeStrategy[] = [
  'highest-confidence',
  'consensus',
  'concatenate',
  'ensemble',
  'first-success'
];

strategies.forEach(strategy => {
  const result = mergeResponses(testResponses, strategy);
  const outputPreview = typeof result.output === 'string' 
    ? result.output.substring(0, 50) 
    : JSON.stringify(result.output).substring(0, 50);
  
  console.log(`${strategy.padEnd(20)}: confidence=${(result.confidence! * 100).toFixed(0)}%, output="${outputPreview}..."`);
});

console.log('\n=== Demo Complete ===');
