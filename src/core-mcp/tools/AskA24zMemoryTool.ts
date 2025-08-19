import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { getNotesForPath } from '../store/notesStore';

export interface A24zMemoryConfig {
  llm: { model: string; temperature: number; systemPrompt: string; maxTokens: number };
  noteFetching: { maxNotesPerQuery: number; relevanceThreshold: number; includeParentPaths: boolean; searchDepth: number };
  responseStyle: { acknowledgeLimitations: boolean; suggestNoteSaving: boolean; includeConfidence: boolean; conversationalTone: 'mentor' | 'peer' | 'expert' };
}

interface TribalNote {
  id: string;
  anchors: string[];
  tags: string[];
  content: string;
  context: { when: Date; confidence: 'high' | 'medium' | 'low'; type: 'decision' | 'pattern' | 'gotcha' | 'explanation' };
  relevanceScore?: number;
}

export class AskA24zMemoryTool extends BaseTool {
  public name = 'askA24zMemory';
  public description = 'Ask the a24z memory for contextual guidance based on tribal knowledge';

  public schema = z.object({
    filePath: z.string().describe('The path to the file or directory relevant to the query'),
    query: z.string().describe('The question for the a24z memory'),
    taskContext: z.string().optional().describe('Additional context about what you are trying to accomplish'),
  });

  private defaultConfig: A24zMemoryConfig = {
    llm: { model: 'gpt-4', temperature: 0.3, systemPrompt: 'You are a principal engineer with deep knowledge of this codebase.', maxTokens: 1000 },
    noteFetching: { maxNotesPerQuery: 20, relevanceThreshold: 0.3, includeParentPaths: true, searchDepth: 3 },
    responseStyle: { acknowledgeLimitations: true, suggestNoteSaving: true, includeConfidence: true, conversationalTone: 'mentor' },
  };

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    const { filePath, query, taskContext } = input;
    try {
      const relevantNotes = await this.fetchRelevantNotes(filePath, query, taskContext);
      if (relevantNotes.length === 0) {
        return { content: [{ type: 'text', text: this.getNoKnowledgeResponse(filePath, query) }] };
      }
      const response = await this.generateA24zMemoryResponse(query, filePath, taskContext || '', relevantNotes);
      return { content: [{ type: 'text', text: response }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown'}` }], isError: true };
    }
  }

  private async fetchRelevantNotes(filePath: string, query?: string, taskContext?: string): Promise<TribalNote[]> {
    const notes = getNotesForPath(filePath, true, this.defaultConfig.noteFetching.maxNotesPerQuery);
    return notes.map(n => ({ id: n.id, anchors: n.anchors, tags: n.tags, content: n.note, context: { when: new Date(n.timestamp), confidence: n.confidence, type: n.type }, relevanceScore: Math.max(0, 1 - (n.pathDistance || 0) / 10) }));
  }

  private async generateA24zMemoryResponse(query: string, filePath: string, _taskContext: string, notes: TribalNote[]): Promise<string> {
    // Simple local synthesis: summarize tags and recent notes.
    const topNotes = notes.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)).slice(0, 5);
    const tagCounts = new Map<string, number>();
    for (const n of topNotes) for (const t of n.tags) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
    let response = `Context-aware guidance for ${filePath}:\n`;
    response += `Question: ${query}\n\n`;
    if (topTags.length > 0) response += `Relevant tags: ${topTags.join(', ')}\n\n`;
    if (topNotes.length > 0) {
      response += `Recent related notes:\n`;
      for (const n of topNotes) {
        response += `- (${n.context.type}/${n.context.confidence}) ${n.content}\n`;
      }
    } else {
      response += `No prior notes found. Consider documenting findings once done.`;
    }
    return response;
  }

  private generateFallbackResponse(query: string, filePath: string, notes: TribalNote[]): string {
    if (notes.length === 0) { return this.getNoKnowledgeResponse(filePath, query); }
    const patterns = notes.filter(n => n.context.type === 'pattern').slice(0, 3).map(n => `- ${n.content}`).join('\n');
    const decisions = notes.filter(n => n.context.type === 'decision').slice(0, 2).map(n => `- ${n.content}`).join('\n');
    const gotchas = notes.filter(n => n.context.type === 'gotcha').slice(0, 3).map(n => `- ${n.content}`).join('\n');
    let response = `Based on our tribal knowledge:\n\n`;
    if (patterns) response += `**Relevant Patterns:**\n${patterns}\n\n`;
    if (decisions) response += `**Past Decisions:**\n${decisions}\n\n`;
    if (gotchas) response += `**Watch Out For:**\n${gotchas}\n\n`;
    return response;
  }

  private getNoKnowledgeResponse(filePath: string, query: string): string {
    return `I don't have any tribal knowledge about this area yet.\n\nYour question: "${query}"\nWorking on: ${filePath}`;
  }
}
