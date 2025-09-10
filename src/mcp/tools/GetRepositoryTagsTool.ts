import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { MemoryPalace } from '../../MemoryPalace';
import { FileSystemAdapter } from '../../pure-core/abstractions/filesystem';
import { ALEXANDRIA_DIRS } from '../../constants/paths';

export class GetRepositoryTagsTool extends BaseTool {
  name = 'get_repository_tags';
  description =
    'Get available tags for categorizing notes in a repository path, including repository-specific guidance';

  private fs: FileSystemAdapter;

  constructor(fs: FileSystemAdapter) {
    super();
    this.fs = fs;
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
    includeGuidance: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        `Include repository-specific note guidance. Shows either custom guidance from ${ALEXANDRIA_DIRS.PRIMARY}/note-guidance.md or falls back to default guidance.`
      ),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    // Find repository root from the input path using the filesystem adapter
    let repositoryRoot: string;

    try {
      repositoryRoot = this.fs.normalizeRepositoryPath(input.path);
    } catch {
      throw new Error('Not a git repository (or any parent up to mount point)');
    }

    // Create MemoryPalace instance
    const memoryPalace = new MemoryPalace(repositoryRoot, this.fs);

    const result: Record<string, unknown> = { success: true, path: input.path };

    // Get tag descriptions
    const tagDescriptions = memoryPalace.getTagDescriptions();

    // Check for tag restrictions and include descriptions
    const config = memoryPalace.getConfiguration();
    const enforced = config.tags?.enforceAllowedTags || false;
    const allowedTags = Object.keys(tagDescriptions);

    if (enforced && allowedTags.length > 0) {
      // Include descriptions with allowed tags
      const allowedTagsWithDescriptions = allowedTags.map((tagName: string) => ({
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
      const usedTags = memoryPalace.getUsedTags();
      // Include descriptions for used tags
      result.usedTags = usedTags.map((tagName) => ({
        name: tagName,
        description: tagDescriptions[tagName],
      }));
    }

    // No common tags - users manage their own tags

    if (input.includeGuidance !== false) {
      const guidance = memoryPalace.getGuidance();
      if (guidance) {
        result.repositoryGuidance = guidance;
      } else {
        result.guidanceNote = `No repository-specific guidance found. Consider creating a note-guidance.md file in your ${ALEXANDRIA_DIRS.PRIMARY} directory to help team members understand what types of notes are most valuable for this project.`;
      }
    }

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
}
