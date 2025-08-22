import { z } from 'zod';
import * as path from 'node:path';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { readAllNotes, type StoredNote } from '../store/notesStore';
import {
  findSimilarNotePairs,
  clusterSimilarNotes,
  DEFAULT_THRESHOLDS,
  type SimilarityThresholds,
  type NoteSimilarity
} from '../utils/noteSimilarity';
import { normalizeRepositoryPath } from '../utils/pathNormalization';

export class FindSimilarNotesTool extends BaseTool {
  name = 'find_similar_notes';
  description = 'Find notes that are semantically similar or potentially duplicates';

  schema = z.object({
    repositoryPath: z.string().describe('Path to the git repository to analyze'),
    threshold: z.enum(['high', 'medium', 'low']).optional().default('medium').describe('Similarity threshold: high (0.8+), medium (0.6-0.8), low (0.4-0.6)'),
    includeStale: z.boolean().optional().default(true).describe('Include potentially stale notes in analysis'),
    maxResults: z.number().optional().default(20).describe('Maximum number of similar note pairs to return'),
    groupBy: z.enum(['pairs', 'clusters']).optional().default('pairs').describe('Return format: pairs (individual pairs) or clusters (grouped similar notes)')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    try {
      const normalizedRepo = normalizeRepositoryPath(input.repositoryPath);
      const allNotes = readAllNotes(normalizedRepo);

      if (allNotes.length < 2) {
        return {
          content: [{
            type: 'text',
            text: `Not enough notes to analyze. Found ${allNotes.length} notes in repository.`
          }]
        };
      }

      const thresholds: Record<string, number> = {
        high: DEFAULT_THRESHOLDS.high,
        medium: DEFAULT_THRESHOLDS.medium,
        low: DEFAULT_THRESHOLDS.low
      };

      const thresholdValue = thresholds[input.threshold];

      let results: string;

      if (input.groupBy === 'clusters') {
        const clusters = clusterSimilarNotes(allNotes, thresholdValue);
        const relevantClusters = clusters.filter(c => c.length > 1);

        if (relevantClusters.length === 0) {
          results = `No similar note clusters found with ${input.threshold} threshold (${(thresholdValue * 100).toFixed(0)}% similarity).`;
        } else {
          results = this.formatClusters(relevantClusters, input.maxResults);
        }
      } else {
        const similarPairs = findSimilarNotePairs(allNotes, thresholdValue);

        if (similarPairs.length === 0) {
          results = `No similar note pairs found with ${input.threshold} threshold (${(thresholdValue * 100).toFixed(0)}% similarity).`;
        } else {
          results = this.formatPairs(similarPairs.slice(0, input.maxResults));
        }
      }

      return {
        content: [{
          type: 'text',
          text: `🔍 Similar Notes Analysis for ${path.basename(normalizedRepo)}\n\n${results}`
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error analyzing notes: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private formatPairs(pairs: NoteSimilarity[]): string {
    let output = `Found ${pairs.length} similar note pairs:\n\n`;

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      output += `${i + 1}. Similarity: ${(pair.score * 100).toFixed(1)}%\n`;
      output += `   Reasons: ${pair.reasons.join(', ')}\n`;
      output += `   Note 1 (${pair.note1.type}/${pair.note1.confidence}): ${this.truncateText(pair.note1.note, 100)}\n`;
      output += `   Note 2 (${pair.note2.type}/${pair.note2.confidence}): ${this.truncateText(pair.note2.note, 100)}\n`;
      output += `   Common anchors: ${this.findCommonItems(pair.note1.anchors, pair.note2.anchors).join(', ') || 'none'}\n`;
      output += `   Common tags: ${this.findCommonItems(pair.note1.tags, pair.note2.tags).join(', ') || 'none'}\n`;
      output += `   IDs: ${pair.note1.id} ↔ ${pair.note2.id}\n\n`;
    }

    return output;
  }

  private formatClusters(clusters: StoredNote[][], maxResults: number): string {
    const limitedClusters = clusters.slice(0, maxResults);
    let output = `Found ${clusters.length} note clusters (showing top ${limitedClusters.length}):\n\n`;

    for (let i = 0; i < limitedClusters.length; i++) {
      const cluster = limitedClusters[i];
      output += `Cluster ${i + 1}: ${cluster.length} notes\n`;

      for (let j = 0; j < cluster.length; j++) {
        const note = cluster[j];
        output += `  ${j + 1}. [${note.type}/${note.confidence}] ${this.truncateText(note.note, 80)}\n`;
        output += `     Tags: ${note.tags.join(', ')} | Anchors: ${note.anchors.slice(0, 2).join(', ')}${note.anchors.length > 2 ? '...' : ''}\n`;
      }
      output += '\n';
    }

    return output;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  private findCommonItems<T>(arr1: T[], arr2: T[]): T[] {
    const set1 = new Set(arr1);
    return arr2.filter(item => set1.has(item));
  }
}

