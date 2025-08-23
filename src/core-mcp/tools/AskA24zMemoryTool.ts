import { z } from 'zod';
import * as path from 'node:path';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { getNotesForPathWithLimit } from '../store/notesStore';
import { normalizeRepositoryPath } from '../utils/pathNormalization';
import { LLMService, type LLMContext } from '../services/llm-service';
import { readAnchorFiles, selectOptimalContent } from '../utils/fileReader';

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

export interface AskMemoryResponse {
  response: string;
  metadata: {
    llmUsed: boolean;
    llmProvider?: string;
    notesFound: number;
    notesUsed: number;
    filesRead: number;
    filters: {
      tags?: string[];
      types?: string[];
    };
  };
  notes: TribalNote[];
}

export class AskA24zMemoryTool extends BaseTool {
  public name = 'askA24zMemory';
  public description = 'Search and retrieve tribal knowledge, architectural decisions, patterns, and gotchas from the repository. Use this tool to understand existing context, get guidance on implementation approaches, and avoid repeating past mistakes. Supports filtering by tags and note types for targeted searches.';

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
  
  private llmService: LLMService;
  
  constructor(llmConfig?: any) {
    super();
    // Initialize LLM service with config if available
    const config = llmConfig || LLMService.loadConfig();
    this.llmService = new LLMService(config);
  }

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    const result = await this.executeWithMetadata(input);
    // For MCP tool interface, just return the text response
    return { content: [{ type: 'text', text: result.response }] };
  }
  
  async executeWithMetadata(input: z.infer<typeof this.schema>): Promise<AskMemoryResponse> {
    const { filePath, query, taskContext, filterTags, filterTypes } = input;
    try {
      
      // Validate that filePath is absolute
      if (!path.isAbsolute(filePath)) {
        throw new Error(
          `❌ filePath must be an absolute path starting with '/'. ` +
          `Received relative path: "${filePath}". ` +
          `💡 Tip: Use absolute paths like /Users/username/projects/my-repo/src/file.ts or /home/user/project/src/component.tsx. ` +
          `You can get the current working directory and build the absolute path from there.`
        );
      }
      
      const relevantNotes = await this.fetchRelevantNotes(filePath, query, taskContext, filterTags, filterTypes);
      
      
      if (relevantNotes.length === 0) {
        const filterInfo = this.getFilterDescription(filterTags, filterTypes);
        return {
          response: this.getNoKnowledgeResponse(filePath, query, filterInfo),
          metadata: {
            llmUsed: false,
            notesFound: 0,
            notesUsed: 0,
            filesRead: 0,
            filters: {
              tags: filterTags,
              types: filterTypes
            }
          },
          notes: []
        };
      }
      
      const result = await this.generateA24zMemoryResponseWithMetadata(query, filePath, taskContext || '', relevantNotes, filterTags, filterTypes);
      return result;
    } catch (error) {
      throw error;
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
    
    const result = getNotesForPathWithLimit(filePath, true, 'count', fetchLimit);
    const notes = result.notes;
    
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

  private async generateA24zMemoryResponseWithMetadata(
    query: string, 
    filePath: string, 
    taskContext: string, 
    notes: TribalNote[],
    filterTags?: string[],
    filterTypes?: Array<'decision' | 'pattern' | 'gotcha' | 'explanation'>
  ): Promise<AskMemoryResponse> {
    // Try to get repository path for file reading
    const repoPath = normalizeRepositoryPath(filePath);
    let filesRead = 0;
    let llmUsed = false;
    let llmProvider: string | undefined;
    
    // Prepare notes with optional file contents for LLM
    const notesWithContext = await Promise.all(notes.map(async (n) => {
      const noteContext = {
        id: n.id,
        content: n.content,
        type: n.context.type,
        confidence: n.context.confidence,
        tags: n.tags,
        anchors: n.anchors,
        anchorContents: undefined as any
      };
      
      // Only try to read files if LLM config says to include them
      const llmConfig = LLMService.loadConfig();
      if (llmConfig?.includeFileContents) {
        // Limit to first 3 anchors to avoid token explosion
        const anchorsToRead = n.anchors.slice(0, 3);
        
        try {
          const fileContents = await readAnchorFiles(anchorsToRead, repoPath, {
            maxFileSize: 5 * 1024,   // 5KB per file
            maxTotalSize: 15 * 1024, // 15KB total per note
            maxFiles: 3
          });
          
          filesRead += fileContents.filter(f => !f.error).length;
          
          // Select optimal content based on token budget
          const tokenBudget = Math.floor((llmConfig.fileContentBudget || 2000) / notes.length);
          const optimal = selectOptimalContent(fileContents, tokenBudget);
          
          if (optimal.length > 0) {
            noteContext.anchorContents = optimal.map(f => ({
              path: f.path,
              content: f.content,
              error: f.error
            }));
          }
        } catch (error) {
          // If file reading fails, continue without file contents
          console.error('Failed to read anchor files:', error);
        }
      }
      
      return noteContext;
    }));
    
    // Try to use LLM service first if available
    const llmContext: LLMContext = {
      query,
      filePath,
      taskContext: taskContext || undefined,
      notes: notesWithContext
    };
    
    const llmResponse = await this.llmService.synthesizeNotes(llmContext);
    
    let responseText: string;
    
    if (llmResponse && llmResponse.content) {
      llmUsed = true;
      llmProvider = llmResponse.provider;
      
      // Got an LLM-enhanced response - include both synthesis and source notes
      let enhancedResponse = `🤖 **AI-Enhanced Synthesis** (via ${llmResponse.provider})\n\n`;
      enhancedResponse += llmResponse.content;
      enhancedResponse += `\n\n---\n\n📚 **Source Notes Referenced:**\n\n`;
      
      // Include the actual notes with their paths for transparency
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        enhancedResponse += `**[Note ${i + 1}]** \`${note.id}\`\n`;
        enhancedResponse += `📁 Anchored to: ${note.anchors.map(a => `\`${a}\``).join(', ')}\n`;
        enhancedResponse += `🏷️ Tags: ${note.tags.join(', ')} | Type: ${note.context.type} | Confidence: ${note.context.confidence}\n`;
        enhancedResponse += `💡 ${note.content}\n\n`;
      }
      
      responseText = enhancedResponse;
    } else {
      // Fall back to local synthesis
      const topNotes = notes.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)).slice(0, 5);
      const tagCounts = new Map<string, number>();
      for (const n of topNotes) for (const t of n.tags) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
      
      let response = `🎯 **Context-aware guidance for:** ${filePath}\n`;
      response += `❓ **Your question:** ${query}\n`;

      // Show active filters
      if (filterTags && filterTags.length > 0) {
        response += `🏷️ **Tag filters applied:** ${filterTags.join(', ')}\n`;
      }
      if (filterTypes && filterTypes.length > 0) {
        response += `📋 **Type filters applied:** ${filterTypes.join(', ')}\n`;
      }
      response += '\n';

      if (topTags.length > 0) {
        response += `🔑 **Most relevant tags in this area:** ${topTags.join(', ')}\n\n`;
      }

      if (topNotes.length > 0) {
        response += `📚 **Found ${notes.length} related notes** (showing top ${topNotes.length}):\n\n`;
        for (let i = 0; i < topNotes.length; i++) {
          const n = topNotes[i];
          response += `**${i + 1}. ${n.context.type.toUpperCase()}** [${n.context.confidence} confidence]\n`;
          response += `   ${n.content}\n\n`;
        }

        response += `💡 **Pro tip:** Use this information to guide your implementation. If you discover something new or make a decision, consider documenting it with \`create_repository_note\` so future developers can benefit!\n`;
      } else {
        response += `No prior notes found matching criteria. Consider documenting findings once done.`;
      }
      
      responseText = response;
    }
    
    return {
      response: responseText,
      metadata: {
        llmUsed,
        llmProvider,
        notesFound: notes.length,
        notesUsed: Math.min(notes.length, 5), // We use top 5 for local synthesis, all for LLM
        filesRead,
        filters: {
          tags: filterTags,
          types: filterTypes
        }
      },
      notes
    };
  }
  
  private async generateA24zMemoryResponse(
    query: string, 
    filePath: string, 
    taskContext: string, 
    notes: TribalNote[],
    filterTags?: string[],
    filterTypes?: Array<'decision' | 'pattern' | 'gotcha' | 'explanation'>
  ): Promise<string> {
    // Try to get repository path for file reading
    const repoPath = normalizeRepositoryPath(filePath);
    
    // Prepare notes with optional file contents for LLM
    const notesWithContext = await Promise.all(notes.map(async (n) => {
      const noteContext = {
        id: n.id,
        content: n.content,
        type: n.context.type,
        confidence: n.context.confidence,
        tags: n.tags,
        anchors: n.anchors,
        anchorContents: undefined as any
      };
      
      // Only try to read files if LLM config says to include them
      const llmConfig = LLMService.loadConfig();
      if (llmConfig?.includeFileContents) {
        // Limit to first 3 anchors to avoid token explosion
        const anchorsToRead = n.anchors.slice(0, 3);
        
        try {
          const fileContents = await readAnchorFiles(anchorsToRead, repoPath, {
            maxFileSize: 5 * 1024,   // 5KB per file
            maxTotalSize: 15 * 1024, // 15KB total per note
            maxFiles: 3
          });
          
          // Select optimal content based on token budget
          const tokenBudget = Math.floor((llmConfig.fileContentBudget || 2000) / notes.length);
          const optimal = selectOptimalContent(fileContents, tokenBudget);
          
          if (optimal.length > 0) {
            noteContext.anchorContents = optimal.map(f => ({
              path: f.path,
              content: f.content,
              error: f.error
            }));
          }
        } catch (error) {
          // If file reading fails, continue without file contents
          console.error('Failed to read anchor files:', error);
        }
      }
      
      return noteContext;
    }));
    
    // Try to use LLM service first if available
    const llmContext: LLMContext = {
      query,
      filePath,
      taskContext: taskContext || undefined,
      notes: notesWithContext
    };
    
    const llmResponse = await this.llmService.synthesizeNotes(llmContext);
    
    if (llmResponse && llmResponse.content) {
      // Got an LLM-enhanced response - include both synthesis and source notes
      let enhancedResponse = `🤖 **AI-Enhanced Synthesis** (via ${llmResponse.provider})\n\n`;
      enhancedResponse += llmResponse.content;
      enhancedResponse += `\n\n---\n\n📚 **Source Notes Referenced:**\n\n`;
      
      // Include the actual notes with their paths for transparency
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        enhancedResponse += `**[Note ${i + 1}]** \`${note.id}\`\n`;
        enhancedResponse += `📁 Anchored to: ${note.anchors.map(a => `\`${a}\``).join(', ')}\n`;
        enhancedResponse += `🏷️ Tags: ${note.tags.join(', ')} | Type: ${note.context.type} | Confidence: ${note.context.confidence}\n`;
        enhancedResponse += `💡 ${note.content}\n\n`;
      }
      
      return enhancedResponse;
    }
    
    // Fall back to local synthesis
    const topNotes = notes.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)).slice(0, 5);
    const tagCounts = new Map<string, number>();
    for (const n of topNotes) for (const t of n.tags) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
    
    let response = `🎯 **Context-aware guidance for:** ${filePath}\n`;
    response += `❓ **Your question:** ${query}\n`;

    // Show active filters
    if (filterTags && filterTags.length > 0) {
      response += `🏷️ **Tag filters applied:** ${filterTags.join(', ')}\n`;
    }
    if (filterTypes && filterTypes.length > 0) {
      response += `📋 **Type filters applied:** ${filterTypes.join(', ')}\n`;
    }
    response += '\n';

    if (topTags.length > 0) {
      response += `🔑 **Most relevant tags in this area:** ${topTags.join(', ')}\n\n`;
    }

    if (topNotes.length > 0) {
      response += `📚 **Found ${notes.length} related notes** (showing top ${topNotes.length}):\n\n`;
      for (let i = 0; i < topNotes.length; i++) {
        const n = topNotes[i];
        response += `**${i + 1}. ${n.context.type.toUpperCase()}** [${n.context.confidence} confidence]\n`;
        response += `   ${n.content}\n\n`;
      }

      response += `💡 **Pro tip:** Use this information to guide your implementation. If you discover something new or make a decision, consider documenting it with \`create_repository_note\` so future developers can benefit!\n`;
    } else {
      response += `No prior notes found matching criteria. Consider documenting findings once done.`;
    }
    return response;
  }

  private getNoKnowledgeResponse(filePath: string, query: string, filterInfo?: string): string {
    let response = `📝 **No existing knowledge found** for this area`;
    if (filterInfo) {
      response += ` matching your filters (${filterInfo})`;
    }
    response += `.\n\n**Your question:** "${query}"\n**Working on:** ${filePath}\n\n`;

    if (filterInfo) {
      response += `💡 **Tip:** Try broadening your search by removing some filters or using different tags/types.\n`;
    }

    response += `🎯 **Suggestion:** After you work on this, consider documenting your findings using the \`create_repository_note\` tool so future developers (including yourself) can benefit from your experience!\n\n`;

    response += `**Example of documenting your work:**\n`;
    response += `\`\`\`javascript
create_repository_note({
  note: "Implemented [brief description of what you did]",
  directoryPath: "/path/to/your/repository",
  anchors: ["${filePath}"],
  tags: ["relevant", "tags", "here"],
  confidence: "high",
  type: "pattern" // or "decision", "gotcha", "explanation"
});
\`\`\``;

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
