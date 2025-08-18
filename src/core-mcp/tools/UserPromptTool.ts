import * as http from 'http';
import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';

export class UserPromptTool extends BaseTool {
  name = 'user_prompt';
  description = 'Request input from the user through a dialog prompt';

  schema = z.object({
    filePath: z.string(),
    message: z.string(),
    title: z.string().optional().default('MCP Prompt'),
    type: z.enum(['text', 'confirm', 'select', 'multiline']).optional().default('text'),
    options: z.array(z.string()).optional(),
    defaultValue: z.union([z.string(), z.boolean()]).optional(),
    placeholder: z.string().optional(),
    required: z.boolean().optional().default(false),
    timeout: z.number().optional(),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    return new Promise(resolve => {
      const bridgeHost = process.env.MCP_BRIDGE_HOST || 'localhost';
      const bridgePort = parseInt(process.env.MCP_BRIDGE_PORT || '3042');
      const promptId = `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const requestData = { id: promptId, filePath: input.filePath, title: input.title || 'MCP Prompt', message: input.message, type: input.type || 'text', options: input.options, defaultValue: input.defaultValue, placeholder: input.placeholder, required: input.required || false, timeout: input.timeout };
      const postData = JSON.stringify(requestData);
      const options: http.RequestOptions = { hostname: bridgeHost, port: bridgePort, path: '/mcp-prompt', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }, timeout: input.timeout || 60000 };
      const req = http.request(options, res => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          try { const response = JSON.parse(data); resolve(response.success ? { content: [{ type: 'text', text: JSON.stringify({ success: true, value: response.value, promptId: response.id }, null, 2) }] } : { content: [{ type: 'text', text: JSON.stringify({ success: false, error: response.cancelled ? 'User cancelled the prompt' : (response.error || 'Failed to get user response'), cancelled: response.cancelled || false, promptId: response.id }, null, 2) }], isError: !response.cancelled }); } catch (e) { resolve({ content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Invalid response from MCP Bridge: ${data}` }, null, 2) }], isError: true }); }
        });
      });
      req.on('error', (err: Error) => resolve({ content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message }, null, 2) }], isError: true }));
      req.on('timeout', () => { req.destroy(); resolve({ content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Request timed out' }, null, 2) }], isError: true }); });
      req.write(postData); req.end();
    });
  }
}


