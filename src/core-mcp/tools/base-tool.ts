import { z } from 'zod';
import { McpTool, McpToolResult } from '../types';
import { zodToJsonSchema } from '../utils/zod-to-json-schema';

export abstract class BaseTool<TParams = unknown, TResult = unknown> implements McpTool<TParams, TResult> {
  abstract name: string;
  abstract description: string;
  abstract schema: z.ZodType<TParams, any, any>;

  get inputSchema(): unknown {
    return zodToJsonSchema(this.schema);
  }

  abstract execute(params: TParams): Promise<McpToolResult<TResult>>;

  async handler(params: TParams): Promise<McpToolResult<TResult>> {
    try {
      const validatedParams = this.schema.parse(params);
      return await this.execute(validatedParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          content: [{ type: 'text', text: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }], isError: true };
    }
  }
}
