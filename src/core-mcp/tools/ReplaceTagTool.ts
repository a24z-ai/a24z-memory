import { z } from 'zod';
import { BaseTool } from './base-tool';
import {
  replaceTagInNotes,
  getTagDescriptions,
  saveTagDescription,
  deleteTagDescription,
} from '../store/anchoredNotesStore';
import { findGitRoot } from '../utils/pathNormalization';
import { McpToolResult } from '../types';
import path from 'path';
import { existsSync } from 'fs';

const ReplaceTagSchema = z.object({
  directoryPath: z
    .string()
    .describe(
      'The absolute path to the git repository root directory or any path within it. The tool will find the repository root automatically.'
    ),
  oldTag: z.string().describe('The tag name to replace in all notes.'),
  newTag: z.string().describe('The new tag name to replace the old tag with.'),
  confirmReplacement: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Must be set to true to confirm the replacement. This is a safety measure to prevent accidental replacements.'
    ),
  transferDescription: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'Whether to transfer the description from the old tag to the new tag. If the new tag already has a description, it will not be overwritten unless this is set to false.'
    ),
});

export class ReplaceTagTool extends BaseTool {
  name = 'replace_tag';
  description =
    'Replace a tag with another tag across all notes in the repository. This tool updates all notes that have the old tag to use the new tag instead.';
  schema = ReplaceTagSchema;

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    const parsed = this.schema.parse(input);
    const { directoryPath, oldTag, newTag, confirmReplacement, transferDescription } = parsed;

    // Safety check
    if (!confirmReplacement) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Replacement not confirmed',
                message: 'Set confirmReplacement to true to replace this tag.',
                oldTag,
                newTag,
                warning: `This will replace '${oldTag}' with '${newTag}' in all notes.`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Validate that old and new tags are different
    if (oldTag === newTag) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Invalid replacement',
                message: 'The old tag and new tag must be different.',
                oldTag,
                newTag,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Normalize the path
    const normalizedPath = path.resolve(directoryPath);

    // Check if path exists
    if (!existsSync(normalizedPath)) {
      throw new Error(`Path does not exist: ${normalizedPath}`);
    }

    // Find the git root
    const repoRoot = findGitRoot(normalizedPath);
    if (!repoRoot) {
      throw new Error(
        `Not a git repository: ${normalizedPath}. This tool requires a git repository.`
      );
    }

    // Get existing tag descriptions
    const tagDescriptions = getTagDescriptions(repoRoot);
    const oldTagHasDescription = oldTag in tagDescriptions;
    const oldTagDescription = oldTagHasDescription ? tagDescriptions[oldTag] : null;
    const newTagHasDescription = newTag in tagDescriptions;
    const newTagDescription = newTagHasDescription ? tagDescriptions[newTag] : null;

    // Replace the tag in all notes
    const notesModified = replaceTagInNotes(repoRoot, oldTag, newTag);

    // Handle tag descriptions
    let descriptionTransferred = false;
    let oldDescriptionDeleted = false;
    let descriptionAction = 'none';

    if (transferDescription && oldTagHasDescription) {
      if (!newTagHasDescription) {
        // Transfer the description to the new tag
        saveTagDescription(repoRoot, newTag, oldTagDescription!);
        deleteTagDescription(repoRoot, oldTag, false); // false because we already updated notes
        descriptionTransferred = true;
        oldDescriptionDeleted = true;
        descriptionAction = 'transferred';
      } else {
        // New tag already has a description, keep it and delete the old one
        deleteTagDescription(repoRoot, oldTag, false);
        oldDescriptionDeleted = true;
        descriptionAction = 'kept_existing';
      }
    } else if (oldTagHasDescription) {
      // Not transferring, just delete the old description
      deleteTagDescription(repoRoot, oldTag, false);
      oldDescriptionDeleted = true;
      descriptionAction = 'deleted';
    }

    // Build response
    const response = {
      repository: repoRoot,
      oldTag,
      newTag,
      results: {
        notesModified,
        oldTagHadDescription: oldTagHasDescription,
        newTagHadDescription: newTagHasDescription,
        descriptionTransferred,
        oldDescriptionDeleted,
        descriptionAction,
      },
      summary: '',
      descriptions: {} as Record<string, string | null | undefined>,
    };

    // Add description details
    if (oldTagDescription) {
      response.descriptions.oldTagDescription = oldTagDescription;
    }
    if (newTagDescription) {
      response.descriptions.existingNewTagDescription = newTagDescription;
    }
    if (descriptionTransferred) {
      response.descriptions.transferredDescription = oldTagDescription;
    }

    // Create summary message
    if (notesModified === 0) {
      response.summary = `No notes found with tag '${oldTag}'. Nothing was replaced.`;
    } else {
      const actions = [`replaced '${oldTag}' with '${newTag}' in ${notesModified} note(s)`];

      if (descriptionAction === 'transferred') {
        actions.push(`transferred description from '${oldTag}' to '${newTag}'`);
      } else if (descriptionAction === 'kept_existing') {
        actions.push(`kept existing description for '${newTag}'`);
      } else if (descriptionAction === 'deleted') {
        actions.push(`deleted description for '${oldTag}'`);
      }

      response.summary = `Successfully ${actions.join(' and ')}.`;
    }

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
