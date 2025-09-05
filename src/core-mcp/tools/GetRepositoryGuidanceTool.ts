import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { generateFullGuidanceContent } from '../utils/guidanceGenerator';

export class GetRepositoryGuidanceTool extends BaseTool {
  name = 'get_repository_guidance';
  description =
    'Get comprehensive repository configuration including note guidance, tag restrictions, and tag descriptions';

  constructor() {
    super();
  }

  schema = z.object({
    path: z
      .string()
      .describe(
        'The file or directory path to get guidance for. Can be any path within the repository - the tool will find the repository root and provide comprehensive configuration.'
      ),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    // Generate the full guidance content using the shared function
    const fullContent = generateFullGuidanceContent(input.path);

    // Split into lines for building output
    const output = fullContent.split('\n');

    const result: McpToolResult = {
      content: [
        {
          type: 'text',
          text: output.join('\n'),
        },
      ],
    };

    return result;
  }
}
