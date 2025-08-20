import { z } from 'zod';
import * as path from 'node:path';
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
  public description = 'Ask the a24z memory for contextual guidance based on tribal knowledge. Supports filtering by tags and note types for targeted searches.';

  public schema = z.object({
    filePath: z.string().describe('The absolute path to the file or directory relevant to the query. Must be an absolute path starting with / (e.g., /Users/username/projects/my-repo/src/file.ts)'),
    query: z.string().describe('The question for the a24z memory'),
    taskContext: z.string().optional().describe('Additional context about what you are trying to accomplish'),
    filterTags: z.array(z.string()).optional().describe('Filter results to only notes with these tags. Useful for targeted searches like ["bugfix", "authentication"] or ["performance", "database"].'),
    filterTypes: z.array(z.enum(['decision', 'pattern', 'gotcha', 'explanation'])).optional().describe('Filter results to only these note types. For example, use ["gotcha", "pattern"] when debugging, or ["decision"] when understanding architecture.'),
  });

  private defaultConfig: A24zMemoryConfig = {
    llm: { model: 'gpt-4', temperature: 0.3, systemPrompt: 'You are a principal engineer with deep knowledge of this codebase.', maxTokens: 1000 },
    noteFetching: { maxNotesPerQuery: 20, relevanceThreshold: 0.3, includeParentPaths: true, searchDepth: 3 },
    responseStyle: { acknowledgeLimitations: true, suggestNoteSaving: true, includeConfidence: true, conversationalTone: 'mentor' },
  };

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    const { filePath, query, taskContext, filterTags, filterTypes } = input;
    try {
      console.error('[AskA24zMemoryTool] DEBUG: current working directory:', process.cwd());
      console.error('[AskA24zMemoryTool] DEBUG: input filePath:', filePath);
      console.error('[AskA24zMemoryTool] DEBUG: query:', query);
      
      // Validate that filePath is absolute
      if (!path.isAbsolute(filePath)) {
        throw new Error(
          `filePath must be an absolute path. ` +
          `Received relative path: "${filePath}". ` +
          `Please provide the full absolute path to the file or directory (e.g., /Users/username/projects/my-repo/src/file.ts).`
        );
      }
      
      const relevantNotes = await this.fetchRelevantNotes(filePath, query, taskContext, filterTags, filterTypes);
      
      console.error('[AskA24zMemoryTool] DEBUG: relevantNotes.length:', relevantNotes.length);
      
      if (relevantNotes.length === 0) {
        const filterInfo = this.getFilterDescription(filterTags, filterTypes);
        return { content: [{ type: 'text', text: this.getNoKnowledgeResponse(filePath, query, filterInfo) }] };
      }
      const response = await this.generateA24zMemoryResponse(query, filePath, taskContext || '', relevantNotes, filterTags, filterTypes);
      return { content: [{ type: 'text', text: response }] };
    } catch (error) {
      console.error('[AskA24zMemoryTool] DEBUG: error:', error);
      return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown'}` }], isError: true };
    }
  }

  private async fetchRelevantNotes(
    filePath: string, 
    query?: string, 
    taskContext?: string,
    filterTags?: string[],
    filterTypes?: Array<'decision' | 'pattern' | 'gotcha' | 'explanation'>
  ): Promise<TribalNote[]> {
    // Get more notes initially if we're filtering, to ensure we have enough after filtering
    const fetchLimit = (filterTags || filterTypes) 
      ? this.defaultConfig.noteFetching.maxNotesPerQuery * 3 
      : this.defaultConfig.noteFetching.maxNotesPerQuery;
    
    console.error('[AskA24zMemoryTool] DEBUG: fetchLimit:', fetchLimit);
    console.error('[AskA24zMemoryTool] DEBUG: calling getNotesForPath with filePath:', filePath);
    
    const notes = getNotesForPath(filePath, true, fetchLimit);
    
    console.error('[AskA24zMemoryTool] DEBUG: raw notes.length:', notes.length);
    
    let filteredNotes = notes;
    
    // Apply tag filter if specified
    if (filterTags && filterTags.length > 0) {
      filteredNotes = filteredNotes.filter(n => 
        filterTags.some(tag => n.tags.includes(tag))
      );
    }
    
    // Apply type filter if specified
    if (filterTypes && filterTypes.length > 0) {
      filteredNotes = filteredNotes.filter(n => 
        filterTypes.includes(n.type)
      );
    }
    
    // Convert to TribalNote format and limit to configured max
    return filteredNotes
      .slice(0, this.defaultConfig.noteFetching.maxNotesPerQuery)
      .map(n => ({ 
        id: n.id, 
        anchors: n.anchors, 
        tags: n.tags, 
        content: n.note, 
        context: { 
          when: new Date(n.timestamp), 
          confidence: n.confidence, 
          type: n.type 
        }, 
        relevanceScore: Math.max(0, 1 - (n.pathDistance || 0) / 10) 
      }));
  }

  private async generateA24zMemoryResponse(
    query: string, 
    filePath: string, 
    _taskContext: string, 
    notes: TribalNote[],
    filterTags?: string[],
    filterTypes?: Array<'decision' | 'pattern' | 'gotcha' | 'explanation'>
  ): Promise<string> {
    // Simple local synthesis: summarize tags and recent notes.
    const topNotes = notes.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)).slice(0, 5);
    const tagCounts = new Map<string, number>();
    for (const n of topNotes) for (const t of n.tags) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
    
    let response = `Context-aware guidance for ${filePath}:\n`;
    response += `Question: ${query}\n`;
    
    // Show active filters
    if (filterTags && filterTags.length > 0) {
      response += `Tag filters: ${filterTags.join(', ')}\n`;
    }
    if (filterTypes && filterTypes.length > 0) {
      response += `Type filters: ${filterTypes.join(', ')}\n`;
    }
    response += '\n';
    
    if (topTags.length > 0) response += `Relevant tags found: ${topTags.join(', ')}\n\n`;
    
    if (topNotes.length > 0) {
      response += `Related notes (${notes.length} found, showing top ${topNotes.length}):\n`;
      for (const n of topNotes) {
        response += `- [${n.context.type}/${n.context.confidence}] ${n.content}\n`;
      }
    } else {
      response += `No prior notes found matching criteria. Consider documenting findings once done.`;
    }
    return response;
  }

  private getNoKnowledgeResponse(filePath: string, query: string, filterInfo?: string): string {
    let response = `I don't have any tribal knowledge about this area`;
    if (filterInfo) {
      response += ` matching your filters (${filterInfo})`;
    }
    response += ` yet.\n\nYour question: "${query}"\nWorking on: ${filePath}`;
    
    if (filterInfo) {
      response += `\n\nTip: Try broadening your search by removing some filters or using different tags/types.`;
    }
    
    return response;
  }
  
  private getFilterDescription(filterTags?: string[], filterTypes?: Array<'decision' | 'pattern' | 'gotcha' | 'explanation'>): string {
    const parts: string[] = [];
    if (filterTags && filterTags.length > 0) {
      parts.push(`tags: ${filterTags.join(', ')}`);
    }
    if (filterTypes && filterTypes.length > 0) {
      parts.push(`types: ${filterTypes.join(', ')}`);
    }
    return parts.join(', ');
  }
}
