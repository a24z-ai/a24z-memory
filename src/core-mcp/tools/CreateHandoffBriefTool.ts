import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { saveHandoffBrief } from '../store/handoffStore';

export class CreateHandoffBriefTool extends BaseTool {
  name = 'create_handoff_brief';
  description = 'Create a handoff brief with overview and code references for knowledge transfer';

  schema = z.object({
    title: z.string().describe('The title of the handoff brief'),
    overview: z.string().describe('Overview section explaining the context and current state'),
    references: z
      .array(
        z.object({
          anchor: z.string().describe('File or directory path to reference'),
          context: z.string().describe('Context or notes about this code location'),
        })
      )
      .describe('Code references with context'),
    directoryPath: z
      .string()
      .describe('The directory path where the handoff should be created (repository root)'),
    ephemeral: z
      .boolean()
      .optional()
      .default(false)
      .describe('If true, the handoff will be deleted after being read once'),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    try {
      // Add ephemeral flag to the overview if requested
      let overview = input.overview;
      if (input.ephemeral) {
        overview = `[EPHEMERAL: This handoff will be deleted after reading]\n\n${overview}`;
      }

      const handoff = saveHandoffBrief({
        title: input.title,
        overview,
        references: input.references,
        directoryPath: input.directoryPath,
      });

      const ephemeralNote = input.ephemeral
        ? '\n\n⚠️ This is an EPHEMERAL handoff - it will be deleted after being read once.'
        : '';

      return {
        content: [
          {
            type: 'text',
            text: `✅ Handoff brief created successfully!

ID: ${handoff.id}
Location: ${handoff.filepath}
Timestamp: ${new Date(handoff.timestamp).toISOString()}${ephemeralNote}

The handoff brief has been saved and can be shared with team members for knowledge transfer.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to create handoff brief: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
}
