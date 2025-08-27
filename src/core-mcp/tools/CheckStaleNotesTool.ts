import { z } from 'zod';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { checkStaleNotes } from '../store/notesStore';
import { findGitRoot } from '../utils/pathNormalization';

export class CheckStaleNotesTool extends BaseTool {
  name = 'check_stale_notes';
  description =
    'Check for notes with stale anchors (file paths that no longer exist) in a repository';

  schema = z.object({
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

    const staleNotes = checkStaleNotes(gitRoot);

    if (staleNotes.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No stale notes found. All note anchors point to existing files.',
          },
        ],
      };
    }

    // Format the output
    const output: string[] = [`Found ${staleNotes.length} note(s) with stale anchors:\n`];

    for (const staleNote of staleNotes) {
      const { note, staleAnchors, validAnchors } = staleNote;
      output.push(`\n## Note ID: ${note.id}`);
      output.push(`Type: ${note.type} | Confidence: ${note.confidence}`);
      output.push(`Tags: ${note.tags.join(', ')}`);
      output.push(
        `\nNote preview: ${note.note.substring(0, 100)}${note.note.length > 100 ? '...' : ''}`
      );
      output.push(`\nStale anchors (${staleAnchors.length}):`);
      for (const anchor of staleAnchors) {
        output.push(`  ❌ ${anchor}`);
      }
      if (validAnchors.length > 0) {
        output.push(`\nValid anchors (${validAnchors.length}):`);
        for (const anchor of validAnchors) {
          output.push(`  ✅ ${anchor}`);
        }
      }
      output.push('---');
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
