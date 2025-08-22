import { z } from 'zod';
import * as path from 'node:path';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { readAllNotes, type StoredNote } from '../store/notesStore';
import {
  findSimilarNotePairs,
  clusterSimilarNotes,
  isNoteStale,
  DEFAULT_THRESHOLDS
} from '../utils/noteSimilarity';
import { normalizeRepositoryPath } from '../utils/pathNormalization';

export class ReviewDuplicatesTool extends BaseTool {
  name = 'review_duplicates';
  description = 'Comprehensive duplicate analysis with actionable recommendations';

  schema = z.object({
    repositoryPath: z.string().describe('Path to the git repository to analyze'),
    threshold: z.enum(['high', 'medium', 'low']).optional().default('medium').describe('Similarity threshold for duplicate detection'),
    includeStale: z.boolean().optional().default(true).describe('Include stale notes in analysis'),
    maxAgeDays: z.number().optional().default(365).describe('Maximum age in days for considering a note stale'),
    focus: z.enum(['all', 'stale', 'recent', 'high-confidence']).optional().default('all').describe('Focus analysis on specific types of notes')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    try {
      const normalizedRepo = normalizeRepositoryPath(input.repositoryPath);
      let allNotes = readAllNotes(normalizedRepo);

      if (allNotes.length < 2) {
        return {
          content: [{
            type: 'text',
            text: `Not enough notes to analyze. Found ${allNotes.length} notes in repository.`
          }]
        };
      }

      // Apply focus filter
      switch (input.focus) {
        case 'stale':
          allNotes = allNotes.filter((n: StoredNote) => isNoteStale(n, input.maxAgeDays));
          break;
        case 'recent':
          const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
          allNotes = allNotes.filter((n: StoredNote) => n.timestamp > thirtyDaysAgo);
          break;
        case 'high-confidence':
          allNotes = allNotes.filter((n: StoredNote) => n.confidence === 'high');
          break;
      }

      if (allNotes.length < 2) {
        return {
          content: [{
            type: 'text',
            text: `Not enough ${input.focus} notes to analyze. Found ${allNotes.length} matching notes.`
          }]
        };
      }

      const thresholds: Record<string, number> = {
        high: DEFAULT_THRESHOLDS.high,
        medium: DEFAULT_THRESHOLDS.medium,
        low: DEFAULT_THRESHOLDS.low
      };

      const thresholdValue = thresholds[input.threshold];

      // Get duplicate analysis
      const similarPairs = findSimilarNotePairs(allNotes, thresholdValue);
      const clusters = clusterSimilarNotes(allNotes, thresholdValue);
      const duplicateClusters = clusters.filter(c => c.length > 1);

      // Analyze staleness
      const staleNotes = allNotes.filter((n: StoredNote) => isNoteStale(n, input.maxAgeDays));

      const analysis = this.generateAnalysis(
        normalizedRepo,
        similarPairs,
        duplicateClusters,
        staleNotes,
        input.threshold,
        thresholdValue
      );

      return {
        content: [{
          type: 'text',
          text: analysis
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error analyzing duplicates: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private generateAnalysis(
    repoPath: string,
    similarPairs: any[],
    duplicateClusters: StoredNote[][],
    staleNotes: StoredNote[],
    threshold: string,
    thresholdValue: number
  ): string {
    let analysis = `🔍 Duplicate Analysis Report for ${path.basename(repoPath)}\n`;
    analysis += `═`.repeat(60) + '\n\n';

    // Summary statistics
    analysis += `📊 SUMMARY\n`;
    analysis += `Threshold: ${threshold} (${(thresholdValue * 100).toFixed(0)}% similarity)\n`;
    analysis += `Total notes analyzed: ${similarPairs.length + (duplicateClusters.reduce((sum, c) => sum + c.length, 0) - duplicateClusters.length)}\n`;
    analysis += `Similar pairs found: ${similarPairs.length}\n`;
    analysis += `Duplicate clusters: ${duplicateClusters.length}\n`;
    analysis += `Stale notes: ${staleNotes.length}\n\n`;

    // Priority recommendations
    analysis += `🎯 PRIORITY RECOMMENDATIONS\n`;

    if (duplicateClusters.length > 0) {
      analysis += `1. Merge duplicate clusters: ${duplicateClusters.length} groups of similar notes\n`;
    }

    if (staleNotes.length > 0) {
      analysis += `2. Review stale notes: ${staleNotes.length} potentially outdated notes\n`;
    }

    if (similarPairs.length > 0) {
      const highSimilarityPairs = similarPairs.filter(p => p.score >= 0.8);
      if (highSimilarityPairs.length > 0) {
        analysis += `3. Immediate duplicates: ${highSimilarityPairs.length} pairs with >80% similarity\n`;
      }
    }

    analysis += '\n';

    // Detailed findings
    if (duplicateClusters.length > 0) {
      analysis += `📋 DETAILED FINDINGS\n\n`;

      for (let i = 0; i < Math.min(duplicateClusters.length, 5); i++) {
        const cluster = duplicateClusters[i];
        analysis += `Cluster ${i + 1}: ${cluster.length} notes\n`;

        // Find common elements
        const allAnchors = cluster.flatMap(n => n.anchors);
        const allTags = cluster.flatMap(n => n.tags);
        const commonAnchors = this.findCommonItems(allAnchors);
        const commonTags = this.findCommonItems(allTags);

        if (commonAnchors.length > 0) {
          analysis += `  Common anchors: ${commonAnchors.join(', ')}\n`;
        }
        if (commonTags.length > 0) {
          analysis += `  Common tags: ${commonTags.join(', ')}\n`;
        }

        analysis += `  Note types: ${this.uniqueItems(cluster.map(n => n.type)).join(', ')}\n`;
        analysis += `  Confidence levels: ${this.uniqueItems(cluster.map(n => n.confidence)).join(', ')}\n\n`;
      }
    }

    // Action plan
    analysis += `🛠️ SUGGESTED ACTIONS\n`;
    if (duplicateClusters.length > 0) {
      analysis += `• Use merge_notes tool to consolidate similar notes\n`;
    }
    analysis += `• Use find_similar_notes with different thresholds to explore\n`;
    analysis += `• Use delete_note tool to remove redundant notes\n`;
    analysis += `• Consider updating stale notes with fresh information\n`;

    return analysis;
  }

  private findCommonItems(items: string[]): string[] {
    const itemCounts = new Map<string, number>();
    for (const item of items) {
      itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
    }
    return Array.from(itemCounts.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([item]) => item);
  }

  private uniqueItems(items: string[]): string[] {
    return [...new Set(items)];
  }
}
