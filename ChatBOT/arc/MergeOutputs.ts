/**
 * MergeOutputs: Intelligent response merging utility for ARC
 * 
 * Combines multiple ARCResponse objects into a single unified response.
 * Handles contradictions, confidence weighting, and quality assessment.
 * 
 * NO DOMAIN-SPECIFIC LOGIC - Generic merging for any AI application.
 */

import { ARCResponse } from './types';

/**
 * Merge strategy types
 */
export type MergeStrategy = 
  | 'highest-confidence'  // Select response with highest confidence
  | 'consensus'           // Voting/majority for discrete outputs
  | 'weighted-average'    // Weighted by confidence (for numeric outputs)
  | 'concatenate'         // Combine all outputs as text
  | 'ensemble'            // Structured combination with all sources
  | 'first-success';      // Return first successful response

/**
 * Contradiction detection result
 */
export interface Contradiction {
  detected: boolean;
  conflictingResponses: string[];
  similarity: number; // 0-1, where 1 = identical
  description: string;
}

/**
 * Quality assessment of merged output
 */
export interface QualityAssessment {
  overallConfidence: number;
  agreementScore: number; // 0-1, how much responses agree
  hasContradictions: boolean;
  reliabilityScore: number; // 0-1, overall reliability
  warnings: string[];
}

/**
 * Merge result with metadata
 */
export interface MergeResult extends ARCResponse {
  mergeMetadata: {
    strategy: MergeStrategy;
    sourceCount: number;
    successfulSources: number;
    failedSources: number;
    qualityAssessment: QualityAssessment;
    contradiction?: Contradiction;
    sourceSummary: Array<{
      taskId: string;
      adapter?: string;
      confidence?: number;
      success: boolean;
    }>;
  };
}

/**
 * Configuration for merge operation
 */
export interface MergeConfig {
  strategy: MergeStrategy;
  confidenceThreshold?: number; // Minimum confidence to include (0-1)
  requireMinimumSources?: number; // Minimum successful responses needed
  detectContradictions?: boolean;
  includeFailedInMetadata?: boolean;
}

/**
 * MergeOutputs utility class
 */
export class MergeOutputs {
  /**
   * Main merge function - intelligently combines multiple responses
   * 
   * @param responses - Array of ARCResponse objects to merge
   * @param config - Merge configuration
   * @returns Merged response with quality metadata
   */
  static merge(
    responses: ARCResponse[],
    config: MergeConfig = { strategy: 'highest-confidence' }
  ): MergeResult {
    // Validate input
    if (!responses || responses.length === 0) {
      throw new Error('Cannot merge empty response array');
    }

    // Filter and separate responses
    const successful = responses.filter(r => r.success);
    const failed = responses.filter(r => !r.success);

    // Check minimum sources requirement
    const minSources = config.requireMinimumSources || 1;
    if (successful.length < minSources) {
      return this.createFailedMerge(
        responses,
        `Insufficient successful responses: ${successful.length}/${minSources} required`,
        config.strategy
      );
    }

    // Filter by confidence threshold if specified
    const confidenceThreshold = config.confidenceThreshold || 0;
    const qualified = successful.filter(
      r => (r.confidence || 0) >= confidenceThreshold
    );

    if (qualified.length === 0) {
      return this.createFailedMerge(
        responses,
        `No responses meet confidence threshold: ${confidenceThreshold}`,
        config.strategy
      );
    }

    // Apply merge strategy
    let mergedResponse: ARCResponse;
    
    switch (config.strategy) {
      case 'highest-confidence':
        mergedResponse = this.mergeByHighestConfidence(qualified);
        break;
      
      case 'consensus':
        mergedResponse = this.mergeByConsensus(qualified);
        break;
      
      case 'weighted-average':
        mergedResponse = this.mergeByWeightedAverage(qualified);
        break;
      
      case 'concatenate':
        mergedResponse = this.mergeByConcatenation(qualified);
        break;
      
      case 'ensemble':
        mergedResponse = this.mergeByEnsemble(qualified);
        break;
      
      case 'first-success':
        mergedResponse = qualified[0];
        break;
      
      default:
        mergedResponse = this.mergeByHighestConfidence(qualified);
    }

    // Detect contradictions if enabled
    const contradiction = config.detectContradictions
      ? this.detectContradictions(qualified)
      : { detected: false, conflictingResponses: [], similarity: 1, description: 'Not checked' };

    // Assess quality
    const qualityAssessment = this.assessQuality(qualified, contradiction);

    // Build source summary
    const sourceSummary = responses.map(r => ({
      taskId: r.taskId,
      adapter: r.metadata?.adapter,
      confidence: r.confidence,
      success: r.success
    }));

    // Return merged result with metadata
    return {
      ...mergedResponse,
      mergeMetadata: {
        strategy: config.strategy,
        sourceCount: responses.length,
        successfulSources: successful.length,
        failedSources: failed.length,
        qualityAssessment,
        contradiction: contradiction.detected ? contradiction : undefined,
        sourceSummary
      }
    };
  }

  /**
   * Strategy: Select response with highest confidence
   */
  private static mergeByHighestConfidence(responses: ARCResponse[]): ARCResponse {
    const best = responses.reduce((prev, curr) => 
      (curr.confidence || 0) > (prev.confidence || 0) ? curr : prev
    );

    return {
      ...best,
      metadata: {
        ...best.metadata,
        mergeStrategy: 'highest-confidence',
        selectedFrom: responses.length
      }
    };
  }

  /**
   * Strategy: Voting/consensus for discrete outputs
   * 
   * Best for: Yes/No questions, classification, multiple choice
   */
  private static mergeByConsensus(responses: ARCResponse[]): ARCResponse {
    // Count occurrences of each output
    const voteCounts = new Map<string, {
      count: number;
      totalConfidence: number;
      responses: ARCResponse[];
    }>();

    for (const response of responses) {
      const outputKey = this.normalizeOutput(response.output);
      
      if (!voteCounts.has(outputKey)) {
        voteCounts.set(outputKey, {
          count: 0,
          totalConfidence: 0,
          responses: []
        });
      }

      const entry = voteCounts.get(outputKey)!;
      entry.count++;
      entry.totalConfidence += response.confidence || 0.5;
      entry.responses.push(response);
    }

    // Find winner by vote count (break ties with confidence)
    let winner: { key: string; data: any } | null = null;
    
    for (const [key, data] of voteCounts.entries()) {
      if (!winner || 
          data.count > winner.data.count ||
          (data.count === winner.data.count && data.totalConfidence > winner.data.totalConfidence)) {
        winner = { key, data };
      }
    }

    const winningResponse = winner!.data.responses[0];
    const agreementRatio = winner!.data.count / responses.length;
    const avgConfidence = winner!.data.totalConfidence / winner!.data.count;

    // Build vote summary
    const voteSummary: Record<string, number> = {};
    voteCounts.forEach((data, key) => {
      voteSummary[key.substring(0, 50)] = data.count;
    });

    return {
      taskId: winningResponse.taskId,
      output: winningResponse.output,
      confidence: agreementRatio * avgConfidence,
      metadata: {
        mergeStrategy: 'consensus',
        votes: voteSummary,
        agreementRatio,
        totalVotes: responses.length
      },
      success: true,
      timestamp: new Date()
    };
  }

  /**
   * Strategy: Weighted average for numeric outputs
   * 
   * Best for: Scores, ratings, numeric predictions
   */
  private static mergeByWeightedAverage(responses: ARCResponse[]): ARCResponse {
    // Try to parse outputs as numbers
    const numericValues: Array<{ value: number; confidence: number }> = [];

    for (const response of responses) {
      const value = this.extractNumericValue(response.output);
      if (value !== null) {
        numericValues.push({
          value,
          confidence: response.confidence || 0.5
        });
      }
    }

    if (numericValues.length === 0) {
      // Fallback to concatenation if no numeric values
      return this.mergeByConcatenation(responses);
    }

    // Calculate weighted average
    const totalWeight = numericValues.reduce((sum, v) => sum + v.confidence, 0);
    const weightedSum = numericValues.reduce(
      (sum, v) => sum + (v.value * v.confidence), 
      0
    );
    const weightedAverage = weightedSum / totalWeight;

    // Calculate standard deviation for confidence
    const variance = numericValues.reduce(
      (sum, v) => sum + Math.pow(v.value - weightedAverage, 2) * v.confidence,
      0
    ) / totalWeight;
    const stdDev = Math.sqrt(variance);

    // Lower confidence if high variance
    const confidenceMultiplier = 1 / (1 + stdDev);
    const avgConfidence = totalWeight / numericValues.length;

    return {
      taskId: responses[0].taskId,
      output: weightedAverage,
      confidence: avgConfidence * confidenceMultiplier,
      metadata: {
        mergeStrategy: 'weighted-average',
        values: numericValues.map(v => v.value),
        weights: numericValues.map(v => v.confidence),
        standardDeviation: stdDev
      },
      success: true,
      timestamp: new Date()
    };
  }

  /**
   * Strategy: Concatenate all outputs as text
   * 
   * Best for: Long-form content, multiple perspectives
   */
  private static mergeByConcatenation(responses: ARCResponse[]): ARCResponse {
    const concatenated = responses
      .map((r, i) => {
        const source = r.metadata?.adapter || `Source ${i + 1}`;
        const confidence = r.confidence ? ` (${(r.confidence * 100).toFixed(0)}%)` : '';
        return `[${source}${confidence}]\n${r.output}`;
      })
      .join('\n\n---\n\n');

    const avgConfidence = responses.reduce(
      (sum, r) => sum + (r.confidence || 0.5), 
      0
    ) / responses.length;

    return {
      taskId: responses[0].taskId,
      output: concatenated,
      confidence: avgConfidence,
      metadata: {
        mergeStrategy: 'concatenate',
        sourceCount: responses.length
      },
      success: true,
      timestamp: new Date()
    };
  }

  /**
   * Strategy: Ensemble - structured combination preserving all sources
   * 
   * Best for: Analysis requiring multiple viewpoints
   */
  private static mergeByEnsemble(responses: ARCResponse[]): ARCResponse {
    const ensemble = {
      summary: this.generateSummary(responses),
      sources: responses.map(r => ({
        output: r.output,
        confidence: r.confidence,
        adapter: r.metadata?.adapter,
        metadata: r.metadata
      })),
      aggregated: {
        avgConfidence: responses.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / responses.length,
        totalSources: responses.length
      }
    };

    return {
      taskId: responses[0].taskId,
      output: ensemble,
      confidence: ensemble.aggregated.avgConfidence,
      metadata: {
        mergeStrategy: 'ensemble',
        format: 'structured'
      },
      success: true,
      timestamp: new Date()
    };
  }

  /**
   * Detect contradictions between responses
   */
  private static detectContradictions(responses: ARCResponse[]): Contradiction {
    if (responses.length < 2) {
      return {
        detected: false,
        conflictingResponses: [],
        similarity: 1,
        description: 'Single response, no contradictions possible'
      };
    }

    // Calculate pairwise similarity
    const similarities: number[] = [];
    
    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const sim = this.calculateSimilarity(
          responses[i].output,
          responses[j].output
        );
        similarities.push(sim);
      }
    }

    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const minSimilarity = Math.min(...similarities);

    // Detect contradiction if similarity is low
    const contradictionThreshold = 0.3;
    const detected = minSimilarity < contradictionThreshold;

    // Find conflicting pairs
    const conflicting: string[] = [];
    if (detected) {
      for (let i = 0; i < responses.length; i++) {
        for (let j = i + 1; j < responses.length; j++) {
          const sim = this.calculateSimilarity(
            responses[i].output,
            responses[j].output
          );
          if (sim < contradictionThreshold) {
            const adapter1 = responses[i].metadata?.adapter || `Response ${i + 1}`;
            const adapter2 = responses[j].metadata?.adapter || `Response ${j + 1}`;
            conflicting.push(`${adapter1} vs ${adapter2}`);
          }
        }
      }
    }

    return {
      detected,
      conflictingResponses: conflicting,
      similarity: avgSimilarity,
      description: detected
        ? `Significant disagreement detected (similarity: ${(avgSimilarity * 100).toFixed(0)}%)`
        : `Responses generally agree (similarity: ${(avgSimilarity * 100).toFixed(0)}%)`
    };
  }

  /**
   * Assess quality of merged output
   */
  private static assessQuality(
    responses: ARCResponse[],
    contradiction: Contradiction
  ): QualityAssessment {
    const confidences = responses.map(r => r.confidence || 0.5);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const minConfidence = Math.min(...confidences);

    // Agreement score based on similarity
    const agreementScore = contradiction.similarity;

    // Reliability: combination of confidence and agreement
    const reliabilityScore = (avgConfidence * 0.6) + (agreementScore * 0.4);

    // Generate warnings
    const warnings: string[] = [];
    
    if (contradiction.detected) {
      warnings.push('Contradictions detected between responses');
    }
    
    if (minConfidence < 0.5) {
      warnings.push('Some responses have low confidence');
    }
    
    if (agreementScore < 0.5) {
      warnings.push('Low agreement between responses');
    }
    
    if (responses.length < 2) {
      warnings.push('Only one response available - no cross-validation');
    }

    return {
      overallConfidence: avgConfidence,
      agreementScore,
      hasContradictions: contradiction.detected,
      reliabilityScore,
      warnings
    };
  }

  /**
   * Calculate similarity between two outputs (0-1)
   */
  private static calculateSimilarity(output1: any, output2: any): number {
    const str1 = this.normalizeOutput(output1);
    const str2 = this.normalizeOutput(output2);

    // Exact match
    if (str1 === str2) return 1;

    // For short strings, use simple comparison
    if (str1.length < 50 || str2.length < 50) {
      return str1.toLowerCase() === str2.toLowerCase() ? 1 : 0;
    }

    // Use Jaccard similarity for longer strings
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Normalize output to string for comparison
   */
  private static normalizeOutput(output: any): string {
    if (typeof output === 'string') return output.trim();
    if (typeof output === 'number') return output.toString();
    if (typeof output === 'boolean') return output.toString();
    return JSON.stringify(output);
  }

  /**
   * Extract numeric value from output
   */
  private static extractNumericValue(output: any): number | null {
    if (typeof output === 'number') return output;
    
    if (typeof output === 'string') {
      // Try to parse as number
      const num = parseFloat(output);
      if (!isNaN(num)) return num;
      
      // Try to extract first number from string
      const match = output.match(/-?\d+\.?\d*/);
      if (match) {
        const parsed = parseFloat(match[0]);
        if (!isNaN(parsed)) return parsed;
      }
    }
    
    return null;
  }

  /**
   * Generate summary of responses
   */
  private static generateSummary(responses: ARCResponse[]): string {
    const avgConfidence = responses.reduce(
      (sum, r) => sum + (r.confidence || 0.5),
      0
    ) / responses.length;

    const adapters = [...new Set(responses.map(r => r.metadata?.adapter).filter(Boolean))];

    return `Merged ${responses.length} responses from ${adapters.length} adapters with average confidence ${(avgConfidence * 100).toFixed(0)}%`;
  }

  /**
   * Create failed merge result
   */
  private static createFailedMerge(
    responses: ARCResponse[],
    error: string,
    strategy: MergeStrategy
  ): MergeResult {
    const successful = responses.filter(r => r.success);
    const failed = responses.filter(r => !r.success);

    return {
      taskId: responses[0]?.taskId || 'unknown',
      output: null,
      confidence: 0,
      metadata: {},
      success: false,
      error,
      timestamp: new Date(),
      mergeMetadata: {
        strategy,
        sourceCount: responses.length,
        successfulSources: successful.length,
        failedSources: failed.length,
        qualityAssessment: {
          overallConfidence: 0,
          agreementScore: 0,
          hasContradictions: false,
          reliabilityScore: 0,
          warnings: [error]
        },
        sourceSummary: responses.map(r => ({
          taskId: r.taskId,
          adapter: r.metadata?.adapter,
          confidence: r.confidence,
          success: r.success
        }))
      }
    };
  }
}

/**
 * Convenience function for quick merging
 */
export function mergeResponses(
  responses: ARCResponse[],
  strategy: MergeStrategy = 'highest-confidence'
): MergeResult {
  return MergeOutputs.merge(responses, { strategy });
}

export default MergeOutputs;
