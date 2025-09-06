import { z } from 'zod';
import { BaseTool } from './base-tool';
import { AnchoredNotesStore } from '../../pure-core/stores/AnchoredNotesStore';
import { NodeFileSystemAdapter, findGitRoot } from '../../node-adapters/NodeFileSystemAdapter';
import { FileSystemAdapter } from '../../pure-core/abstractions/filesystem';
import { McpToolResult } from '../types';
import path from 'path';
import { existsSync } from 'fs';

const DeleteTagSchema = z.object({
  directoryPath: z
    .string()
    .describe(
      'The absolute path to the git repository root directory or any path within it. The tool will find the repository root automatically.'
    ),
  tag: z.string().describe('The tag name to delete from the repository.'),
  confirmDeletion: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Must be set to true to confirm the deletion. This is a safety measure to prevent accidental deletions.'
    ),
});

export class DeleteTagTool extends BaseTool {
  name = 'delete_tag';
  description =
    'Delete a tag from the repository, removing it from all notes and deleting its description';
  schema = DeleteTagSchema;
  
  // Allow injection of a custom filesystem adapter for testing
  private fsAdapter?: FileSystemAdapter;
  
  constructor(fsAdapter?: FileSystemAdapter) {
    super();
    this.fsAdapter = fsAdapter;
  }

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    const parsed = this.schema.parse(input);
    const { directoryPath, tag, confirmDeletion } = parsed;

    // Safety check
    if (!confirmDeletion) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Deletion not confirmed',
                message: 'Set confirmDeletion to true to delete this tag.',
                tagToDelete: tag,
                warning: 'This will remove the tag from all notes and delete its description.',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Use injected adapter for testing, or default to NodeFileSystemAdapter
    const nodeFs = this.fsAdapter || new NodeFileSystemAdapter();
    
    // For in-memory testing, we trust the provided path
    // For production, we validate using the real filesystem
    let repoRoot: string;
    
    if (this.fsAdapter) {
      // Testing mode - trust the provided directory path as the git root
      repoRoot = directoryPath;
      if (!nodeFs.exists(repoRoot)) {
        throw new Error(`Path does not exist: ${repoRoot}`);
      }
      if (!nodeFs.exists(nodeFs.join(repoRoot, '.git'))) {
        throw new Error(
          `Not a git repository: ${repoRoot}. This tool requires a git repository.`
        );
      }
    } else {
      // Production mode - use real filesystem validation
      // Normalize the path
      const normalizedPath = path.resolve(directoryPath);

      // Check if path exists
      if (!existsSync(normalizedPath)) {
        throw new Error(`Path does not exist: ${normalizedPath}`);
      }

      // Find the git root
      const foundRoot = findGitRoot(normalizedPath);
      if (!foundRoot) {
        throw new Error(
          `Not a git repository: ${normalizedPath}. This tool requires a git repository.`
        );
      }
      repoRoot = foundRoot;
    }

    // Create MemoryPalace instance
    const notesStore = new AnchoredNotesStore(repoRoot, nodeFs);

    // Check if tag has a description
    const tagDescriptions = notesStore.getTagDescriptions();
    const hadDescription = tag in tagDescriptions;
    const descriptionContent = hadDescription ? tagDescriptions[tag] : null;

    // Step 1: Remove tag from all notes (always do this first)
    const notesModified = notesStore.removeTagFromNotes(tag);

    // Step 2: Delete the tag description file (if it exists)
    let descriptionDeleted = false;
    if (hadDescription) {
      descriptionDeleted = notesStore.deleteTagDescription(tag, false); // false because we already removed from notes
    }

    // Build response
    const response = {
      repository: repoRoot,
      tag,
      results: {
        notesModified,
        descriptionDeleted,
        hadDescription,
      },
      summary: '',
    };

    // Create summary message
    if (notesModified === 0 && !hadDescription) {
      response.summary = `Tag '${tag}' was not found in any notes and had no description. Nothing was deleted.`;
    } else {
      const actions = [];
      if (notesModified > 0) {
        actions.push(`removed from ${notesModified} note(s)`);
      }
      if (descriptionDeleted) {
        actions.push('description file deleted');
      }
      response.summary = `Tag '${tag}' successfully ${actions.join(' and ')}.`;
    }

    // Add the deleted description content for reference
    if (descriptionContent) {
      const responseWithDesc = response as typeof response & { deletedDescription: string };
      responseWithDesc.deletedDescription = descriptionContent;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }
}
