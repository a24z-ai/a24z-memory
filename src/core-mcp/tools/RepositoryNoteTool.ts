import * as http from 'http';
import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';

export class RepositoryNoteTool extends BaseTool {
  name = 'repository_note';
  description = 'Store tribal knowledge associated with repository paths';

  schema = z.object({
    note: z.string().describe('Markdown content'),
    directoryPath: z.string().describe('Primary directory path'),
    anchors: z.array(z.string()).optional().describe('Additional paths (supports globs)'),
    tags: z.array(z.string()).min(1, 'At least one tag is required.'),
    confidence: z.enum(['high', 'medium', 'low']).optional().default('medium'),
    type: z.enum(['decision', 'pattern', 'gotcha', 'explanation']).optional().default('explanation'),
    metadata: z.record(z.any()).optional(),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    return new Promise(resolve => {
      const bridgeHost = process.env.MCP_BRIDGE_HOST || 'localhost';
      const bridgePort = parseInt(process.env.MCP_BRIDGE_PORT || '3042');
      const noteId = `note-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const anchors = [input.directoryPath, ...(input.anchors || [])];
      const requestData = { id: noteId, note: input.note, directoryPath: input.directoryPath, anchors, tags: input.tags, confidence: input.confidence || 'medium', type: input.type || 'explanation', metadata: { ...(input.metadata || {}), toolVersion: '2.0.0', createdBy: 'repository_note_tool' }, timestamp: Date.now() };
      const postData = JSON.stringify(requestData);
      const options: http.RequestOptions = { hostname: bridgeHost, port: bridgePort, path: '/mcp-repository-note', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }, timeout: 10000 };
      const req = http.request(options, res => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          try { const response = JSON.parse(data); resolve(response.success ? { content: [{ type: 'text', text: `Saved note ${response.noteId || noteId}` }] } : { content: [{ type: 'text', text: JSON.stringify({ success: false, error: response.error || 'Failed to store note' }, null, 2) }], isError: true }); } catch (e) { resolve({ content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Invalid response from MCP Bridge: ${data}` }, null, 2) }], isError: true }); }
        });
      });
      req.on('error', (err: Error) => resolve({ content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message }, null, 2) }], isError: true }));
      req.on('timeout', () => { req.destroy(); resolve({ content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Request timed out' }, null, 2) }], isError: true }); });
      req.write(postData); req.end();
    });
  }
}


