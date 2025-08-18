import * as http from 'http';
import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';

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

  private async fetchRelevantNotes(filePath: string, query: string, taskContext?: string): Promise<TribalNote[]> {
    return new Promise((resolve) => {
      const bridgeHost = process.env.MCP_BRIDGE_HOST || 'localhost';
      const bridgePort = parseInt(process.env.MCP_BRIDGE_PORT || '3042');
      const postData = JSON.stringify({ path: filePath, query, taskContext, config: this.defaultConfig.noteFetching });
      const options: http.RequestOptions = { hostname: bridgeHost, port: bridgePort, path: '/mcp-a24z-memory-query-notes', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }, timeout: 10000 };
      const req = http.request(options, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try { const response = JSON.parse(data); resolve(response.success ? (response.notes || []) : []); } catch { resolve([]); }
        });
      });
      req.on('error', () => resolve([]));
      req.on('timeout', () => { req.destroy(); resolve([]); });
      req.write(postData); req.end();
    });
  }

  private async generateA24zMemoryResponse(query: string, filePath: string, taskContext: string, notes: TribalNote[]): Promise<string> {
    return new Promise((resolve) => {
      const bridgeHost = process.env.MCP_BRIDGE_HOST || 'localhost';
      const bridgePort = parseInt(process.env.MCP_BRIDGE_PORT || '3042');
      const formattedNotes = notes.map(n => ({ anchors: n.anchors.join(', '), tags: n.tags.join(', '), content: n.content, confidence: n.context.confidence, type: n.context.type, relevance: n.relevanceScore || 0 }));
      const postData = JSON.stringify({ query, filePath, taskContext, notes: formattedNotes, config: this.defaultConfig });
      const options: http.RequestOptions = { hostname: bridgeHost, port: bridgePort, path: '/mcp-a24z-memory-generate', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }, timeout: 30000 };
      const req = http.request(options, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => { try { const response = JSON.parse(data); resolve(response.success ? response.message : this.generateFallbackResponse(query, filePath, notes)); } catch { resolve(this.generateFallbackResponse(query, filePath, notes)); } });
      });
      req.on('error', () => resolve(this.generateFallbackResponse(query, filePath, notes)));
      req.on('timeout', () => { req.destroy(); resolve(this.generateFallbackResponse(query, filePath, notes)); });
      req.write(postData); req.end();
    });
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
