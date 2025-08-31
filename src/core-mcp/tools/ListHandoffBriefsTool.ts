import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { getHandoffBriefsWithTitles } from '../store/handoffStore';
import { findGitRoot } from '../utils/pathNormalization';

export class ListHandoffBriefsTool extends BaseTool {
  name = 'list_handoff_briefs';
  description = 'List all handoff briefs with their titles for a repository';

  schema = z.object({
    directoryPath: z
      .string()
      .describe('The absolute path to the git repository root directory or any path within it'),
    limit: z.number().optional().describe('Maximum number of briefs to return (optional)'),
    since: z
      .number()
      .optional()
      .describe('Only return briefs created after this timestamp (optional)'),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    try {
      // Find the repository root from the provided path
      const repositoryRoot = findGitRoot(input.directoryPath);
      if (!repositoryRoot) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ **Error:** The specified path is not within a git repository.',
            },
          ],
          isError: true,
        };
      }

      // Get handoff briefs with titles
      const briefs = getHandoffBriefsWithTitles(repositoryRoot, {
        limit: input.limit,
        since: input.since,
      });

      if (briefs.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '📋 **No handoff briefs found**\n\nNo handoff briefs have been created for this repository yet.',
            },
          ],
        };
      }

      // Format the response
      const lines: string[] = [
        `📋 **Handoff Briefs for Repository**`,
        `📁 Repository: ${repositoryRoot}`,
        `📊 Found ${briefs.length} handoff brief${briefs.length === 1 ? '' : 's'}`,
        '',
      ];

      // Add each brief with its title
      for (const brief of briefs) {
        const date = new Date(brief.timestamp);
        const formattedDate = date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        lines.push(`### ${brief.title}`);
        lines.push(`- **ID:** \`${brief.id}\``);
        lines.push(`- **Created:** ${formattedDate}`);
        lines.push(`- **Path:** \`${brief.filepath}\``);
        lines.push('');
      }

      if (input.limit && briefs.length === input.limit) {
        lines.push(
          `*Note: Results limited to ${input.limit} briefs. There may be more available.*`
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: lines.join('\n'),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Error listing handoff briefs:** ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
}
