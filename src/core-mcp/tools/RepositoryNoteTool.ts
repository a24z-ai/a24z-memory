import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { saveNote } from '../store/notesStore';

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
    const saved = saveNote({
      note: input.note,
      directoryPath: input.directoryPath,
      anchors: [input.directoryPath, ...(input.anchors || [])],
      tags: input.tags,
      confidence: input.confidence || 'medium',
      type: input.type || 'explanation',
      metadata: { ...(input.metadata || {}), toolVersion: '2.0.0', createdBy: 'repository_note_tool' }
    });
    return { content: [{ type: 'text', text: `Saved note ${saved.id}` }] };
  }
}
