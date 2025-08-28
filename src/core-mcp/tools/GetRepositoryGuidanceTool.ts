import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { GuidanceTokenManager } from '../services/guidance-token-manager';
import { generateFullGuidanceContent } from '../utils/guidanceGenerator';

export class GetRepositoryGuidanceTool extends BaseTool {
  name = 'get_repository_guidance';
  description =
    'Get comprehensive repository configuration including note guidance, tag restrictions, and tag descriptions';

  private tokenManager: GuidanceTokenManager;

  constructor() {
    super();
    this.tokenManager = new GuidanceTokenManager();
  }

  schema = z.object({
    path: z
      .string()
      .describe(
        'The file or directory path to get guidance for. Can be any path within the repository - the tool will find the repository root and provide comprehensive configuration.'
      ),
    includeToken: z
      .boolean()
      .optional()
      .describe('Whether to include a guidance token for note validation (default: true)'),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    // Generate the full guidance content using the shared function
    const fullContent = generateFullGuidanceContent(input.path);

    // Split into lines for building output
    const output = fullContent.split('\n');

    // Generate guidance token if requested (default to true)
    const includeToken = input.includeToken !== false;
    let token: string | undefined;

    if (includeToken) {
      // Generate token based on the full guidance content
      token = this.tokenManager.generateToken(fullContent, input.path);

      output.push('');
      output.push('## Guidance Token');
      output.push('This token proves you have read the current guidance:');
      output.push(`\`${token}\``);
      output.push('');
      output.push('Include this token when creating notes to verify guidance compliance.');
      output.push('Token expires in 24 hours.');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {
      // Dynamic result shape with optional guidanceToken
      content: [
        {
          type: 'text',
          text: output.join('\n'),
        },
      ],
    };

    // Include token in structured response if generated
    if (token) {
      result.guidanceToken = token;
    }

    return result;
  }
}
