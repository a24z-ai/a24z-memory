import { z } from 'zod';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { AnchoredNotesStore } from '../../pure-core/stores/AnchoredNotesStore';
import { NodeFileSystemAdapter } from '../../node-adapters/NodeFileSystemAdapter';
import { findGitRoot } from '../../node-adapters/NodeFileSystemAdapter';
import { FileSystemAdapter } from '../../pure-core/abstractions/filesystem';

export class DeleteAnchoredNoteTool extends BaseTool {
  name = 'delete_repository_note';
  description = 'Delete a repository note by its ID';
  
  // Allow injection of a custom filesystem adapter for testing
  private fsAdapter?: FileSystemAdapter;
  
  constructor(fsAdapter?: FileSystemAdapter) {
    super();
    this.fsAdapter = fsAdapter;
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

    // Use injected adapter for testing, or default to NodeFileSystemAdapter
    const nodeFs = this.fsAdapter || new NodeFileSystemAdapter();
    
    // For in-memory testing, we trust the provided path
    // For production, we validate using the real filesystem
    let gitRoot: string;
    
    if (this.fsAdapter) {
      // Testing mode - trust the provided directory path as the git root
      gitRoot = parsed.directoryPath;
      if (!nodeFs.exists(gitRoot)) {
        throw new Error(`Path does not exist: ${gitRoot}`);
      }
      if (!nodeFs.exists(nodeFs.join(gitRoot, '.git'))) {
        throw new Error(
          `Not a git repository: ${gitRoot}. This tool requires a git repository.`
        );
      }
    } else {
      // Production mode - use real filesystem validation
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
      const foundRoot = findGitRoot(parsed.directoryPath);
      if (!foundRoot) {
        throw new Error(
          `directoryPath is not within a git repository: "${parsed.directoryPath}". ` +
            `Please provide a path within a git repository.`
        );
      }
      gitRoot = foundRoot;
    }

    // Create MemoryPalace instance
    const notesStore = new AnchoredNotesStore(gitRoot, nodeFs);

    // Check if the note exists before attempting deletion
    const note = notesStore.getNoteById(parsed.noteId);
    if (!note) {
      throw new Error(
        `Note with ID "${parsed.noteId}" not found in repository "${gitRoot}". ` +
          `Please verify the note ID is correct.`
      );
    }

    // Delete the note
    const deleted = notesStore.deleteNoteById(parsed.noteId);

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
