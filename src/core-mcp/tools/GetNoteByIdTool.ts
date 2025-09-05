import { z } from 'zod';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { getNoteById } from '../store/notesStore';
import { findGitRoot } from '../utils/pathNormalization';

export class GetNoteByIdTool extends BaseTool {
  name = 'get_repository_note';
  description = 'Get a repository note by its unique ID';

  schema = z.object({
    noteId: z
      .string()
      .describe('The unique ID of the note to retrieve (e.g., "note-1734567890123-abc123def")'),
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

    const note = getNoteById(gitRoot, parsed.noteId);

    if (!note) {
      throw new Error(
        `Note with ID "${parsed.noteId}" not found in repository "${gitRoot}". ` +
          `Please verify the note ID is correct.`
      );
    }

    // Format the note for display
    const output: string[] = [
      `# Note ID: ${note.id}`,
      '',
      `**Tags:** ${note.tags.join(', ')}`,
      `**Created:** ${new Date(note.timestamp).toISOString()}`,
      '',
      '## Anchors',
      ...note.anchors.map((anchor) => `- ${anchor}`),
      '',
      '## Content',
      note.note,
    ];

    // Add metadata if present
    if (note.metadata && Object.keys(note.metadata).length > 0) {
      output.push('', '## Metadata');
      for (const [key, value] of Object.entries(note.metadata)) {
        output.push(`- **${key}:** ${JSON.stringify(value)}`);
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: output.join('\n'),
        },
      ],
    };
  }
}
