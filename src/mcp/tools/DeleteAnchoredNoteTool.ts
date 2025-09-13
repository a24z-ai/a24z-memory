import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { MemoryPalace } from '@a24z/core-library';
import { FileSystemAdapter } from '@a24z/core-library';

export class DeleteAnchoredNoteTool extends BaseTool {
  name = 'delete_repository_note';
  description = 'Delete a repository note by its ID';

  private fs: FileSystemAdapter;

  constructor(fs: FileSystemAdapter) {
    super();
    this.fs = fs;
  }

  schema = z.object({
    noteId: z
      .string()
      .describe('The unique ID of the note to delete (e.g., "note-1734567890123-abc123def")'),
    directoryPath: z
      .string()
      .describe(
        'The absolute path to the git repository root directory or any path within it. The tool will find the repository root automatically.'
      ),
  });

  async execute(input: z.input<typeof this.schema>): Promise<McpToolResult> {
    const parsed = this.schema.parse(input);

    // Validate that directoryPath is absolute
    if (!this.fs.isAbsolute(parsed.directoryPath)) {
      throw new Error(
        `directoryPath must be an absolute path. ` +
          `Received relative path: "${parsed.directoryPath}". ` +
          `Please provide the full absolute path (e.g., /Users/username/projects/my-repo).`
      );
    }

    // Validate that directoryPath exists
    if (!this.fs.exists(parsed.directoryPath)) {
      throw new Error(
        `directoryPath does not exist: "${parsed.directoryPath}". ` +
          `Please provide a valid absolute path to an existing directory.`
      );
    }

    // Find the git repository root
    let gitRoot: string;
    try {
      gitRoot = this.fs.normalizeRepositoryPath(parsed.directoryPath);
    } catch {
      throw new Error(
        `directoryPath is not within a git repository: "${parsed.directoryPath}". ` +
          `Please provide a path within a git repository.`
      );
    }

    // Create MemoryPalace instance
    const memoryPalace = new MemoryPalace(gitRoot, this.fs);

    // Check if the note exists before attempting deletion
    const note = memoryPalace.getNoteById(parsed.noteId);
    if (!note) {
      throw new Error(
        `Note with ID "${parsed.noteId}" not found in repository "${gitRoot}". ` +
          `Please verify the note ID is correct.`
      );
    }

    // Delete the note
    const deleted = memoryPalace.deleteNoteById(parsed.noteId);

    if (deleted) {
      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted note ${parsed.noteId}\n\nDeleted note preview:\n | Tags: ${note.tags.join(', ')}\n${note.note.substring(0, 200)}${note.note.length > 200 ? '...' : ''}`,
          },
        ],
      };
    } else {
      throw new Error(
        `Failed to delete note ${parsed.noteId}. The note may have already been deleted.`
      );
    }
  }
}
