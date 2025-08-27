import { z } from 'zod';
import { McpTool, McpToolResult } from '../types';
import { zodToJsonSchema } from '../utils/zod-to-json-schema';

// Tool capability information
export interface ToolCapability {
  name: string;
  description: string;
  useCases: string[];
  parameters: string[];
  examples: string[];
}

export abstract class BaseTool<TParams = unknown, TResult = unknown>
  implements McpTool<TParams, TResult>
{
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
      console.error(`[${this.name}] DEBUG: Error occurred:`, error);

      if (error instanceof z.ZodError) {
        const errorMessages = error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ');
        return {
          content: [
            {
              type: 'text',
              text:
                `❌ **Validation Error**\n\n` +
                `The provided parameters don't match the expected format:\n` +
                `${errorMessages}\n\n` +
                `💡 **Tip:** Check the parameter types and ensure all required fields are provided. ` +
                `Use the tool description to see the correct format.`,
            },
          ],
          isError: true,
        };
      }

      // Handle custom errors with emojis and tips
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        content: [
          {
            type: 'text',
            text:
              `❌ **Error in ${this.name}**\n\n` +
              `${errorMessage}\n\n` +
              `💡 **Debug Info:**\n` +
              `- Tool: ${this.name}\n` +
              `- Working Directory: ${process.cwd()}\n` +
              `- Timestamp: ${new Date().toISOString()}\n\n` +
              `If this error persists, please check:\n` +
              `1. File/directory paths are absolute and exist\n` +
              `2. Git repository is properly initialized\n` +
              `3. Required permissions are available`,
          },
        ],
        isError: true,
      };
    }
  }
}
