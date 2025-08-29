import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { getRepositoryGuidance, getAllowedTypes, getTypeDescriptions } from '../store/notesStore';
import { GuidanceTokenManager } from '../services/guidance-token-manager';

export class GetRepositoryTypesTool extends BaseTool {
  name = 'get_repository_types';
  description =
    'Get available note types for categorizing notes in a repository path, including repository-specific guidance';

  private tokenManager: GuidanceTokenManager;

  constructor() {
    super();
    this.tokenManager = new GuidanceTokenManager();
  }

  schema = z.object({
    path: z
      .string()
      .describe(
        'The file or directory path to get types for. Can be any path within the repository - the tool will find the repository root and analyze note types.'
      ),
    includeGuidance: z
      .boolean()
      .optional()
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

    // Get type descriptions
    const typeDescriptions = getTypeDescriptions(input.path);

    // Check for type restrictions and include descriptions
    const allowedTypesInfo = getAllowedTypes(input.path);
    if (allowedTypesInfo.enforced && allowedTypesInfo.types.length > 0) {
      // Include descriptions with allowed types
      const allowedTypesWithDescriptions = allowedTypesInfo.types.map((typeName) => ({
        name: typeName,
        description: typeDescriptions[typeName],
      }));

      result.typeRestrictions = {
        enforced: true,
        allowedTypes: allowedTypesWithDescriptions,
        message:
          'This repository enforces type restrictions. Only the allowed types listed above can be used for notes.',
      };
    } else {
      result.typeRestrictions = {
        enforced: false,
        message: 'This repository does not enforce type restrictions. Any types can be used.',
      };

      // If no restrictions, show available type descriptions as suggestions
      if (Object.keys(typeDescriptions).length > 0) {
        const availableTypes = Object.entries(typeDescriptions).map(([name, description]) => ({
          name,
          description,
        }));
        result.availableTypes = availableTypes;
      }
    }

    // Include common note types with descriptions
    const commonTypes = [
      {
        name: 'explanation',
        description: 'Explains how something works or why it was implemented in a particular way',
      },
      {
        name: 'decision',
        description: 'Documents architectural decisions, trade-offs, or important choices made',
      },
      {
        name: 'pattern',
        description: 'Describes reusable patterns, conventions, or best practices in the codebase',
      },
      {
        name: 'gotcha',
        description:
          'Warns about potential pitfalls, edge cases, or things that are easy to get wrong',
      },
    ];

    result.commonTypes = commonTypes;

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
