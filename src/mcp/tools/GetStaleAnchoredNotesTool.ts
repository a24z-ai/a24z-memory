import { z } from 'zod';
import { BaseTool } from './base-tool';
import { MemoryPalace } from '../../MemoryPalace';
import { FileSystemAdapter } from '../../pure-core/abstractions/filesystem';
import { StaleAnchoredNote } from '../../pure-core/stores/AnchoredNotesStore';
import { McpToolResult } from '../types';

const GetStaleAnchoredNotesSchema = z.object({
  directoryPath: z
    .string()
    .describe(
      'The absolute path to the git repository root directory or any path within it. The tool will find the repository root automatically.'
    ),
  includeContent: z
    .boolean()
    .default(true)
    .describe(
      'Whether to include the full note content in the response. Set to false for a more compact output.'
    ),
  includeValidAnchors: z
    .boolean()
    .default(false)
    .describe(
      'Whether to include the list of valid anchors (files that still exist) for each note.'
    ),
});

interface FormattedStaleAnchoredNote {
  noteId: string;
  tags: string[];
  staleAnchors: string[];
  validAnchors?: string[];
  content?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export class GetStaleAnchoredNotesTool extends BaseTool {
  name = 'get_stale_notes';
  description =
    'Get all notes that have stale anchors (references to files that no longer exist) in a repository';
  schema = GetStaleAnchoredNotesSchema;

  private fs: FileSystemAdapter;

  constructor(fs: FileSystemAdapter) {
    super();
    this.fs = fs;
  }

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    const parsed = this.schema.parse(input);
    const { directoryPath, includeContent, includeValidAnchors } = parsed;

    // Check if path exists
    if (!this.fs.exists(directoryPath)) {
      throw new Error(`Path does not exist: ${directoryPath}`);
    }

    // Find the repository root
    let repoRoot: string;
    try {
      repoRoot = this.fs.normalizeRepositoryPath(directoryPath);
    } catch {
      throw new Error(
        `Not a git repository: ${directoryPath}. This tool requires a git repository.`
      );
    }

    // Create MemoryPalace instance for this repository
    const memoryPalace = new MemoryPalace(repoRoot, this.fs);

    // Get all stale notes
    const staleNotes = memoryPalace.getStaleNotes();

    if (staleNotes.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No notes with stale anchors found in repository: ${repoRoot}`,
          },
        ],
      };
    }

    // Format the stale notes
    const formattedNotes: FormattedStaleAnchoredNote[] = staleNotes.map(
      (staleNote: StaleAnchoredNote) => {
        const formatted: FormattedStaleAnchoredNote = {
          noteId: staleNote.note.id,
          tags: staleNote.note.tags,
          staleAnchors: staleNote.staleAnchors,
          timestamp: staleNote.note.timestamp,
        };

        if (includeValidAnchors) {
          formatted.validAnchors = staleNote.validAnchors;
        }

        if (includeContent) {
          formatted.content = staleNote.note.note;
        }

        if (staleNote.note.metadata && Object.keys(staleNote.note.metadata).length > 0) {
          formatted.metadata = staleNote.note.metadata;
        }

        return formatted;
      }
    );

    // Sort by timestamp (newest first)
    formattedNotes.sort((a, b) => b.timestamp - a.timestamp);

    // Calculate statistics
    const totalStaleAnchors = staleNotes.reduce(
      (sum: number, note) => sum + note.staleAnchors.length,
      0
    );
    const totalValidAnchors = staleNotes.reduce(
      (sum: number, note) => sum + note.validAnchors.length,
      0
    );

    const response = {
      repository: repoRoot,
      totalStaleNotes: staleNotes.length,
      totalStaleAnchors,
      totalValidAnchors,
      notes: formattedNotes,
      recommendation:
        'Consider updating or removing these notes as their referenced files no longer exist. Use delete_repository_note to remove them or update their anchors to point to existing files.',
    };

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
