import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { getCommonTags, getSuggestedTagsForPath, getUsedTagsForPath, getRepositoryGuidance } from '../store/notesStore';

export class GetRepositoryTagsTool extends BaseTool {
  name = 'get_repository_tags';
  description = 'Get available tags for categorizing notes in a repository path, including repository-specific guidance';

  schema = z.object({
    path: z.string().describe('The file or directory path to get tags for. Can be any path within the repository - the tool will find the repository root and analyze notes.'),
    includeUsedTags: z.boolean().optional().default(true).describe('Include tags that have been used in existing notes for this repository. Helps maintain consistency with established tagging patterns.'),
    includeSuggestedTags: z.boolean().optional().default(true).describe('Include AI-suggested tags based on the file path. For example, paths containing "auth" will suggest "authentication" tag.'),
    includeGuidance: z.boolean().optional().default(true).describe('Include repository-specific note guidance. Shows either custom guidance from .a24z/note-guidance.md or falls back to default guidance.'),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    const result: Record<string, unknown> = { success: true, path: input.path };
    if (input.includeUsedTags !== false) {
      result.usedTags = getUsedTagsForPath(input.path);
    }
    if (input.includeSuggestedTags !== false) {
      result.suggestedTags = getSuggestedTagsForPath(input.path);
    }
    result.commonTags = getCommonTags();
    
    if (input.includeGuidance !== false) {
      const guidance = getRepositoryGuidance(input.path);
      if (guidance) {
        result.repositoryGuidance = guidance;
      } else {
        result.guidanceNote = 'No repository-specific guidance found. Consider creating a note-guidance.md file in your .a24z directory to help team members understand what types of notes are most valuable for this project.';
      }
    }
    
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
}
