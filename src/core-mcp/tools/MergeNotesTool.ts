import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { saveNote, deleteNoteById } from '../store/notesStore';
import { normalizeRepositoryPath } from '../utils/pathNormalization';

export class MergeNotesTool extends BaseTool {
  name = 'merge_notes';
  description = 'Merge multiple similar notes into a single consolidated note';

  schema = z.object({
    repositoryPath: z.string().describe('Path to the git repository containing the notes'),
    noteIds: z.array(z.string()).min(2).describe('IDs of the notes to merge (minimum 2)'),
    mergedNote: z
      .object({
        note: z.string().describe('Consolidated note content'),
        anchors: z.array(z.string()).min(1).describe('Combined anchor paths from all notes'),
        tags: z.array(z.string()).min(1).describe('Combined and deduplicated tags'),
        confidence: z
          .enum(['high', 'medium', 'low'])
          .default('medium')
          .describe('Confidence level for merged note'),
        type: z
          .enum(['decision', 'pattern', 'gotcha', 'explanation'])
          .default('explanation')
          .describe('Type for merged note'),
        metadata: z.record(z.any()).optional().describe('Additional metadata for merged note'),
      })
      .describe('The merged note data'),
    deleteOriginals: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether to delete the original notes after merging'),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    try {
      const normalizedRepo = normalizeRepositoryPath(input.repositoryPath);

      // In a real implementation, you'd read the original notes to validate they exist
      // For now, we'll proceed with the merge

      const mergedNoteData = {
        ...input.mergedNote,
        directoryPath: normalizedRepo,
        metadata: {
          ...input.mergedNote.metadata,
          mergedFrom: input.noteIds,
          mergedAt: new Date().toISOString(),
          mergeToolVersion: '1.0.0',
        },
      };

      const savedNote = saveNote(mergedNoteData);

      let deletionResults = '';
      if (input.deleteOriginals) {
        let deletedCount = 0;
        for (const noteId of input.noteIds) {
          if (deleteNoteById(normalizedRepo, noteId)) {
            deletedCount++;
          }
        }
        deletionResults = `\n\n🗑️ Deleted ${deletedCount} original notes`;
      }

      return {
        content: [
          {
            type: 'text',
            text:
              `✅ Successfully merged ${input.noteIds.length} notes\n\n` +
              `📝 New merged note ID: ${savedNote.id}\n` +
              `📍 Anchors: ${savedNote.anchors.join(', ')}\n` +
              `🏷️ Tags: ${savedNote.tags.join(', ')}\n` +
              `🎯 Type/Confidence: ${savedNote.type}/${savedNote.confidence}\n` +
              `📄 Content preview: ${savedNote.note.substring(0, 100)}${savedNote.note.length > 100 ? '...' : ''}\n` +
              `${deletionResults}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error merging notes: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
}
