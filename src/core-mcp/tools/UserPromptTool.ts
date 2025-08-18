import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import * as readline from 'node:readline/promises';
import * as process from 'node:process';

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
    // For standalone stdio servers, we fallback to terminal input for prompts.
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    const ask = async (query: string): Promise<string> => rl.question(query);
    try {
      let value: string | boolean | undefined;
      const title = input.title || 'MCP Prompt';
      switch (input.type || 'text') {
        case 'confirm':
          {
            const ans = (await ask(`${title} [y/N]: ${input.message} `)).trim().toLowerCase();
            value = ans === 'y' || ans === 'yes';
          }
          break;
        case 'select':
          {
            const opts = (input.options || []).map((o, i) => `${i + 1}) ${o}`).join('\n');
            const ans = await ask(`${title}: ${input.message}\n${opts}\nSelect number: `);
            const idx = Math.max(1, Math.min(parseInt(ans, 10) || 1, (input.options || []).length));
            value = (input.options || [])[idx - 1];
          }
          break;
        case 'multiline':
          value = await ask(`${title}: ${input.message}\n> `);
          break;
        case 'text':
        default:
          value = await ask(`${title}: ${input.message} `);
      }
      rl.close();
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, value }, null, 2) }] };
    } catch (e) {
      rl.close();
      return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: (e as Error).message }, null, 2) }], isError: true };
    }
  }
}
