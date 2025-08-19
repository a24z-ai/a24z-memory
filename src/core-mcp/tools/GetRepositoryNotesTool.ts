import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { getNotesForPath } from '../store/notesStore';

export class GetRepositoryNotesTool extends BaseTool {
  name = 'get_repository_notes';
  description = 'Get all notes associated with a file or directory path, including parents';

  schema = z.object({
    path: z.string(),
    includeParentNotes: z.boolean().optional().default(true),
    maxResults: z.number().optional().default(50),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    console.log('[GetRepositoryNotesTool] DEBUG: input path =', input.path);
    console.log('[GetRepositoryNotesTool] DEBUG: process.cwd() =', process.cwd());
    const notes = getNotesForPath(input.path, input.includeParentNotes ?? true, input.maxResults ?? 50);
    console.log('[GetRepositoryNotesTool] DEBUG: found', notes.length, 'notes');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          path: input.path,
          repository: undefined,
          totalNotes: notes.length,
          notes: notes.map(n => ({ id: n.id, note: n.note, path: n.directoryPath, timestamp: new Date(n.timestamp).toISOString(), isParent: n.isParentDirectory, distance: n.pathDistance }))
        }, null, 2)
      }]
    };
  }
}
