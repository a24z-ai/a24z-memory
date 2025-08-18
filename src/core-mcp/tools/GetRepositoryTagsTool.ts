import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { getCommonTags, getSuggestedTagsForPath, getUsedTagsForPath } from '../store/notesStore';

export class GetRepositoryTagsTool extends BaseTool {
  name = 'get_repository_tags';
  description = 'Get available tags for categorizing notes in a repository path';

  schema = z.object({
    path: z.string(),
    includeUsedTags: z.boolean().optional().default(true),
    includeSuggestedTags: z.boolean().optional().default(true),
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
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
}
