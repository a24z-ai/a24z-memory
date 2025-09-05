import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import {
  getSuggestedTagsForPath,
  getUsedTagsForPath,
  getRepositoryGuidance,
  getAllowedTags,
  getTagDescriptions,
} from '../store/anchoredNotesStore';
import { GuidanceTokenManager } from '../services/guidance-token-manager';

export class GetRepositoryTagsTool extends BaseTool {
  name = 'get_repository_tags';
  description =
    'Get available tags for categorizing notes in a repository path, including repository-specific guidance';

  private tokenManager: GuidanceTokenManager;

  constructor() {
    super();
    this.tokenManager = new GuidanceTokenManager();
  }

  schema = z.object({
    path: z
      .string()
      .describe(
        'The file or directory path to get tags for. Can be any path within the repository - the tool will find the repository root and analyze notes.'
      ),
    includeUsedTags: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        'Include tags that have been used in existing notes for this repository. Helps maintain consistency with established tagging patterns.'
      ),
    includeSuggestedTags: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        'Include AI-suggested tags based on the file path. For example, paths containing "auth" will suggest "authentication" tag.'
      ),
    includeGuidance: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        'Include repository-specific note guidance. Shows either custom guidance from .a24z/note-guidance.md or falls back to default guidance.'
      ),
    guidanceToken: z
      .string()
      .describe(
        'The guidance token obtained from get_repository_guidance. Required to ensure guidance has been read.'
      ),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    // Validate guidance token
    this.tokenManager.validateTokenForPath(input.guidanceToken, input.path);

    const result: Record<string, unknown> = { success: true, path: input.path };

    // Get tag descriptions
    const tagDescriptions = getTagDescriptions(input.path);

    // Check for tag restrictions and include descriptions
    const allowedTagsInfo = getAllowedTags(input.path);
    if (allowedTagsInfo.enforced && allowedTagsInfo.tags.length > 0) {
      // Include descriptions with allowed tags
      const allowedTagsWithDescriptions = allowedTagsInfo.tags.map((tagName) => ({
        name: tagName,
        description: tagDescriptions[tagName],
      }));

      result.tagRestrictions = {
        enforced: true,
        allowedTags: allowedTagsWithDescriptions,
        message:
          'This repository enforces tag restrictions. Only the allowed tags listed above can be used for notes.',
      };
    } else {
      result.tagRestrictions = {
        enforced: false,
        message: 'This repository does not enforce tag restrictions. Any tags can be used.',
      };
    }

    if (input.includeUsedTags !== false) {
      const usedTags = getUsedTagsForPath(input.path);
      // Include descriptions for used tags
      result.usedTags = usedTags.map((tagName) => ({
        name: tagName,
        description: tagDescriptions[tagName],
      }));
    }

    if (input.includeSuggestedTags !== false) {
      const suggestedTags = getSuggestedTagsForPath(input.path);
      // Enhance suggested tags with descriptions if available
      result.suggestedTags = suggestedTags.map((suggestion) => ({
        ...suggestion,
        description: tagDescriptions[suggestion.name],
      }));
    }

    // No common tags - users manage their own tags

    if (input.includeGuidance !== false) {
      const guidance = getRepositoryGuidance(input.path);
      if (guidance) {
        result.repositoryGuidance = guidance;
      } else {
        result.guidanceNote =
          'No repository-specific guidance found. Consider creating a note-guidance.md file in your .a24z directory to help team members understand what types of notes are most valuable for this project.';
      }
    }

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
}
