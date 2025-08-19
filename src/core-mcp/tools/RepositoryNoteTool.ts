import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { saveNote } from '../store/notesStore';

export class RepositoryNoteTool extends BaseTool {
  name = 'create_repository_note';
  description = 'Store tribal knowledge associated with repository paths';

  schema = z.object({
    note: z.string().describe('The tribal knowledge content in Markdown format. Use code blocks with ``` for code snippets, **bold** for emphasis, and [file.ts](path/to/file.ts) for file references'),
    directoryPath: z.string().describe('The primary directory path where the note applies'),
    anchors: z.array(z.string()).optional(),
    tags: z.array(z.string()).min(1, 'At least one tag is required.').describe('Required semantic tags for categorization. Use get_repository_tags tool to see available tags. New tags will be created automatically if they don\'t exist.'),
    confidence: z.enum(['high', 'medium', 'low']).optional().default('medium'),
    type: z.enum(['decision', 'pattern', 'gotcha', 'explanation']).optional().default('explanation'),
    metadata: z.record(z.any()).optional(),
  });

  async execute(input: z.input<typeof this.schema>): Promise<McpToolResult> {
    const parsed = this.schema.parse(input);
    const saved = saveNote({
      note: parsed.note,
      directoryPath: parsed.directoryPath,
      anchors: [parsed.directoryPath, ...(parsed.anchors || [])],
      tags: parsed.tags,
      confidence: parsed.confidence,
      type: parsed.type,
      metadata: { ...(parsed.metadata || {}), toolVersion: '2.0.0', createdBy: 'create_repository_note_tool' }
    });
    return { content: [{ type: 'text', text: `Saved note ${saved.id}` }] };
  }
}
