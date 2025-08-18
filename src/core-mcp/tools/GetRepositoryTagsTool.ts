import * as http from 'http';
import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';

export class GetRepositoryTagsTool extends BaseTool {
  name = 'get_repository_tags';
  description = 'Get available tags for categorizing notes in a repository path';

  schema = z.object({
    path: z.string(),
    includeUsedTags: z.boolean().optional().default(true),
    includeSuggestedTags: z.boolean().optional().default(true),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    return new Promise(resolve => {
      const bridgeHost = process.env.MCP_BRIDGE_HOST || 'localhost';
      const bridgePort = parseInt(process.env.MCP_BRIDGE_PORT || '3042');
      const postData = JSON.stringify({ path: input.path, includeUsedTags: input.includeUsedTags !== false, includeSuggestedTags: input.includeSuggestedTags !== false });
      const options: http.RequestOptions = { hostname: bridgeHost, port: bridgePort, path: '/mcp-get-repository-tags', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }, timeout: 10000 };
      const req = http.request(options, res => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.success) {
              resolve({ content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] });
            } else {
              resolve({ content: [{ type: 'text', text: JSON.stringify({ success: false, error: response.error || 'Failed to get repository tags' }, null, 2) }], isError: true });
            }
          } catch (e) {
            resolve({ content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Invalid response from MCP Bridge: ${data}` }, null, 2) }], isError: true });
          }
        });
      });
      req.on('error', (err: Error) => resolve({ content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message }, null, 2) }], isError: true }));
      req.on('timeout', () => { req.destroy(); resolve({ content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Request timed out' }, null, 2) }], isError: true }); });
      req.write(postData); req.end();
    });
  }
}


