import { z } from 'zod';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { deleteNoteById, getNoteById } from '../store/notesStore';
import { findGitRoot } from '../utils/pathNormalization';

export class DeleteNoteTool extends BaseTool {
  name = 'delete_repository_note';
  description = 'Delete a repository note by its ID';

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
    if (!path.isAbsolute(parsed.directoryPath)) {
      throw new Error(
        `directoryPath must be an absolute path. ` +
          `Received relative path: "${parsed.directoryPath}". ` +
          `Please provide the full absolute path (e.g., /Users/username/projects/my-repo).`
      );
    }

    // Validate that directoryPath exists
    if (!fs.existsSync(parsed.directoryPath)) {
      throw new Error(
        `directoryPath does not exist: "${parsed.directoryPath}". ` +
          `Please provide a valid absolute path to an existing directory.`
      );
    }

    // Find the git repository root
    const gitRoot = findGitRoot(parsed.directoryPath);
    if (!gitRoot) {
      throw new Error(
        `directoryPath is not within a git repository: "${parsed.directoryPath}". ` +
          `Please provide a path within a git repository.`
      );
    }

    // Check if the note exists before attempting deletion
    const note = getNoteById(gitRoot, parsed.noteId);
    if (!note) {
      throw new Error(
        `Note with ID "${parsed.noteId}" not found in repository "${gitRoot}". ` +
          `Please verify the note ID is correct.`
      );
    }

    // Delete the note
    const deleted = deleteNoteById(gitRoot, parsed.noteId);

    if (deleted) {
      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted note ${parsed.noteId}\n\nDeleted note preview:\nType: ${note.type} | Tags: ${note.tags.join(', ')}\n${note.note.substring(0, 200)}${note.note.length > 200 ? '...' : ''}`,
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
