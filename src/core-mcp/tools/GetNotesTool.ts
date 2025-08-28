import { z } from 'zod';
import * as path from 'node:path';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { getNotesForPath, checkStaleNotes, type NoteType } from '../store/notesStore';
import { normalizeRepositoryPath } from '../utils/pathNormalization';

type NoteResponse = {
  id: string;
  note: string;
  anchors: string[];
  tags: string[];
  confidence: 'high' | 'medium' | 'low';
  type: 'decision' | 'pattern' | 'gotcha' | 'explanation';
  timestamp: number;
  reviewed: boolean;
  metadata?: Record<string, unknown>;
  staleAnchors?: string[];
};

interface GetNotesResponse {
  notes: NoteResponse[];

  pagination: {
    total: number;
    returned: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };

  filters: {
    applied: {
      tags?: string[];
      types?: string[];
      reviewStatus: 'reviewed' | 'unreviewed' | 'all';
      includeStale: boolean;
      includeParentNotes: boolean;
    };
    available: {
      tags: string[];
      types: string[];
      reviewedCount: number;
      unreviewedCount: number;
    };
  };
}

export class GetNotesTool extends BaseTool {
  name = 'get_notes';
  description =
    'Retrieve raw notes from the repository without AI processing. Returns the actual note content, metadata, and anchors. Use this when you want to see the exact notes stored, browse through knowledge, or need the raw data for further processing. For AI-synthesized answers, use askA24zMemory instead.';

  schema = z.object({
    path: z
      .string()
      .describe(
        'The absolute path to a file or directory to get notes for. Notes from this path and parent directories will be included. Must be an absolute path starting with /'
      ),

    includeParentNotes: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        'Whether to include notes from parent directories. Set to false to only get notes directly anchored to the specified path'
      ),

    filterTags: z
      .array(z.string())
      .optional()
      .describe(
        'Filter results to only notes containing at least one of these tags. Leave empty to include all tags'
      ),

    filterTypes: z
      .array(z.enum(['decision', 'pattern', 'gotcha', 'explanation']))
      .optional()
      .describe('Filter results to only these note types. Leave empty to include all types'),

    filterReviewed: z
      .enum(['reviewed', 'unreviewed', 'all'])
      .optional()
      .default('all')
      .describe(
        'Filter by review status. "reviewed" = only reviewed notes, "unreviewed" = only unreviewed notes, "all" = include both'
      ),

    includeStale: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        'Whether to include notes with stale anchors (files that no longer exist). Set to false to exclude stale notes'
      ),

    sortBy: z
      .enum(['timestamp', 'reviewed', 'type', 'relevance'])
      .optional()
      .default('timestamp')
      .describe(
        'How to sort the results. "timestamp" = newest first, "reviewed" = reviewed notes first, "type" = grouped by type, "relevance" = by path proximity'
      ),

    limit: z
      .number()
      .optional()
      .default(50)
      .describe(
        'Maximum number of notes to return. Use a smaller number for preview, larger for comprehensive retrieval'
      ),

    offset: z
      .number()
      .optional()
      .default(0)
      .describe(
        'Number of notes to skip for pagination. Use with limit to paginate through large result sets'
      ),

    includeMetadata: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        'Whether to include full metadata for each note. Set to false for a more compact response'
      ),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    const parsed = this.schema.parse(input);

    // Validate that path is absolute
    if (!path.isAbsolute(parsed.path)) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Error: Path must be absolute. Received: "${parsed.path}"`,
          },
        ],
      };
    }

    // Get the repository root
    let repoRoot: string;
    try {
      repoRoot = normalizeRepositoryPath(parsed.path);
    } catch {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Error: Could not find repository for path "${parsed.path}". Make sure the path is within a git repository.`,
          },
        ],
      };
    }

    // Fetch all notes for the path
    let allNotes = getNotesForPath(parsed.path, parsed.includeParentNotes);

    // Get stale note information if needed
    let staleNoteMap: Map<string, string[]> = new Map();
    if (!parsed.includeStale) {
      const staleNotes = checkStaleNotes(repoRoot);
      for (const staleNote of staleNotes) {
        staleNoteMap.set(staleNote.note.id, staleNote.staleAnchors);
      }

      // Filter out completely stale notes if not including stale
      allNotes = allNotes.filter((note) => {
        const staleAnchors = staleNoteMap.get(note.id);
        return !staleAnchors || staleAnchors.length < note.anchors.length;
      });
    } else {
      // Still get stale info for display purposes
      const staleNotes = checkStaleNotes(repoRoot);
      for (const staleNote of staleNotes) {
        if (staleNote.staleAnchors.length > 0) {
          staleNoteMap.set(staleNote.note.id, staleNote.staleAnchors);
        }
      }
    }

    // Track available tags and types before filtering
    const availableTags = new Set<string>();
    const availableTypes = new Set<string>();
    let totalReviewedCount = 0;
    let totalUnreviewedCount = 0;

    for (const note of allNotes) {
      note.tags.forEach((tag) => availableTags.add(tag));
      availableTypes.add(note.type);
      if (note.reviewed) {
        totalReviewedCount++;
      } else {
        totalUnreviewedCount++;
      }
    }

    // Apply filters
    let filteredNotes = [...allNotes];

    // Filter by tags
    if (parsed.filterTags && parsed.filterTags.length > 0) {
      filteredNotes = filteredNotes.filter((note) =>
        parsed.filterTags!.some((tag) => note.tags.includes(tag))
      );
    }

    // Filter by types
    if (parsed.filterTypes && parsed.filterTypes.length > 0) {
      filteredNotes = filteredNotes.filter((note) =>
        parsed.filterTypes!.includes(note.type as NoteType)
      );
    }

    // Filter by reviewed status
    if (parsed.filterReviewed !== 'all') {
      filteredNotes = filteredNotes.filter((note) =>
        parsed.filterReviewed === 'reviewed' ? note.reviewed : !note.reviewed
      );
    }

    // Apply sorting
    filteredNotes.sort((a, b) => {
      switch (parsed.sortBy) {
        case 'timestamp':
          return b.timestamp - a.timestamp; // Newest first

        case 'reviewed':
          // Reviewed notes first, then by timestamp
          if (a.reviewed === b.reviewed) {
            return b.timestamp - a.timestamp;
          }
          return a.reviewed ? -1 : 1;

        case 'type':
          // Group by type, then by timestamp
          if (a.type === b.type) {
            return b.timestamp - a.timestamp;
          }
          return a.type.localeCompare(b.type);

        case 'relevance': {
          // Sort by path proximity (exact matches first, then parents)
          // This is simplified - could be enhanced with better relevance scoring
          const aIsExact = a.anchors.some((anchor) => path.join(repoRoot, anchor) === parsed.path);
          const bIsExact = b.anchors.some((anchor) => path.join(repoRoot, anchor) === parsed.path);

          if (aIsExact !== bIsExact) {
            return aIsExact ? -1 : 1;
          }
          return b.timestamp - a.timestamp;
        }

        default:
          return b.timestamp - a.timestamp;
      }
    });

    // Apply pagination
    const total = filteredNotes.length;
    const start = parsed.offset;
    const end = Math.min(start + parsed.limit, total);
    const paginatedNotes = filteredNotes.slice(start, end);

    // Format response
    const formattedNotes = paginatedNotes.map((note) => {
      const formatted: NoteResponse = {
        id: note.id,
        note: note.note,
        anchors: note.anchors,
        tags: note.tags,
        confidence: note.confidence,
        type: note.type,
        timestamp: note.timestamp,
        reviewed: note.reviewed || false,
      };

      // Add metadata if requested
      if (parsed.includeMetadata) {
        formatted.metadata = note.metadata;
      }

      // Add stale anchors if any
      const staleAnchors = staleNoteMap.get(note.id);
      if (staleAnchors && staleAnchors.length > 0) {
        formatted.staleAnchors = staleAnchors;
      }

      return formatted;
    });

    const response: GetNotesResponse = {
      notes: formattedNotes,
      pagination: {
        total,
        returned: formattedNotes.length,
        offset: parsed.offset,
        limit: parsed.limit,
        hasMore: end < total,
      },
      filters: {
        applied: {
          tags: parsed.filterTags,
          types: parsed.filterTypes,
          reviewStatus: parsed.filterReviewed,
          includeStale: parsed.includeStale,
          includeParentNotes: parsed.includeParentNotes,
        },
        available: {
          tags: Array.from(availableTags).sort(),
          types: Array.from(availableTypes).sort(),
          reviewedCount: totalReviewedCount,
          unreviewedCount: totalUnreviewedCount,
        },
      },
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
