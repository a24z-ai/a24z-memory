import * as http from 'http';
import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';

export class GetRepositoryNotesTool extends BaseTool {
  name = 'get_repository_notes';
  description = 'Get all notes associated with a file or directory path, including parents';

  schema = z.object({
    path: z.string(),
    includeParentNotes: z.boolean().optional().default(true),
    maxResults: z.number().optional().default(50),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    return new Promise(resolve => {
      const bridgeHost = process.env.MCP_BRIDGE_HOST || 'localhost';
      const bridgePort = parseInt(process.env.MCP_BRIDGE_PORT || '3042');
      const postData = JSON.stringify({ path: input.path, includeParentNotes: input.includeParentNotes ?? true, maxResults: input.maxResults ?? 50 });
      const options: http.RequestOptions = { hostname: bridgeHost, port: bridgePort, path: '/mcp-get-repository-notes', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }, timeout: 10000 };
      const req = http.request(options, res => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          try { const response = JSON.parse(data); resolve(response.success ? { content: [{ type: 'text', text: JSON.stringify({ success: true, path: input.path, repository: response.repository, totalNotes: (response.notes || []).length, notes: (response.notes || []).map((n: any) => ({ id: n.id, note: n.note, path: n.relativePath, timestamp: new Date(n.timestamp).toISOString(), isParent: n.isParentDirectory || false, distance: n.pathDistance || 0 })) }, null, 2) }] } : { content: [{ type: 'text', text: JSON.stringify({ success: false, error: response.error || 'Failed to get notes' }, null, 2) }], isError: true }); } catch (e) { resolve({ content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Invalid response from MCP Bridge: ${data}` }, null, 2) }], isError: true }); }
        });
      });
      req.on('error', (err: Error) => resolve({ content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message }, null, 2) }], isError: true }));
      req.on('timeout', () => { req.destroy(); resolve({ content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Request timed out' }, null, 2) }], isError: true }); });
      req.write(postData); req.end();
    });
  }
}


