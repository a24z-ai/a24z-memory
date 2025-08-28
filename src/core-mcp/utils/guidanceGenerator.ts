/**
 * Utility functions for generating guidance content
 */

import {
  getRepositoryConfiguration,
  getRepositoryGuidance,
  getAllowedTags,
  getTagDescriptions,
  getAllowedTypes,
  getTypeDescriptions,
} from '../store/notesStore';

/**
 * Generate the full guidance content for a repository
 * This matches the output format of GetRepositoryGuidanceTool
 * @param repoPath The repository path
 * @returns The full guidance content as a string
 */
export function generateFullGuidanceContent(repoPath: string): string {
  // Get all configuration information
  const config = getRepositoryConfiguration(repoPath);
  const guidance = getRepositoryGuidance(repoPath);
  const allowedTags = getAllowedTags(repoPath);
  const tagDescriptions = getTagDescriptions(repoPath);
  const allowedTypes = getAllowedTypes(repoPath);
  const typeDescriptions = getTypeDescriptions(repoPath);

  // Build comprehensive output
  const output: string[] = ['# Repository Note Configuration\n'];

  // Configuration Limits
  output.push('## Configuration Limits');
  output.push(`- Max note length: ${config.limits.noteMaxLength} characters`);
  output.push(`- Max tags per note: ${config.limits.maxTagsPerNote}`);
  output.push(`- Max tag description length: ${config.limits.tagDescriptionMaxLength} characters`);
  output.push(`- Max anchors per note: ${config.limits.maxAnchorsPerNote}`);
  output.push('');

  // Tag Restrictions
  output.push('## Tag Restrictions');
  if (allowedTags.enforced && allowedTags.tags.length > 0) {
    output.push('**Status:** ENFORCED');
    output.push(`**Allowed tags (${allowedTags.tags.length}):**`);
    for (const tag of allowedTags.tags) {
      const desc = tagDescriptions[tag];
      if (desc) {
        output.push(`- **${tag}**: ${desc}`);
      } else {
        output.push(`- **${tag}**`);
      }
    }
  } else {
    output.push('**Status:** NOT ENFORCED');
    output.push('Any tags can be used for notes.');

    // Show available tag descriptions even when not enforced
    if (Object.keys(tagDescriptions).length > 0) {
      output.push('\n**Available tag descriptions:**');
      for (const [tag, desc] of Object.entries(tagDescriptions)) {
        output.push(`- **${tag}**: ${desc}`);
      }
    }
  }
  output.push('');

  // Type Restrictions
  output.push('## Type Restrictions');
  if (allowedTypes.enforced && allowedTypes.types.length > 0) {
    output.push('**Status:** ENFORCED');
    output.push(`**Allowed types (${allowedTypes.types.length}):**`);
    for (const type of allowedTypes.types) {
      const desc = typeDescriptions[type];
      if (desc) {
        // Take just the first line/paragraph for the summary
        const firstLine = desc.split('\n')[0].replace(/^#\s*/, '');
        output.push(`- **${type}**: ${firstLine}`);
      } else {
        output.push(`- **${type}**`);
      }
    }
  } else {
    output.push('**Status:** NOT ENFORCED');
    output.push('Any types can be used for notes.');

    // Show available type descriptions even when not enforced
    if (Object.keys(typeDescriptions).length > 0) {
      output.push('\n**Available type descriptions:**');
      for (const [type, desc] of Object.entries(typeDescriptions)) {
        const firstLine = desc.split('\n')[0].replace(/^#\s*/, '');
        output.push(`- **${type}**: ${firstLine}`);
      }
    }
  }
  output.push('');

  // Note Guidance
  output.push('## Note Guidance');
  if (guidance) {
    output.push(guidance);
  } else {
    output.push('No repository-specific guidance found.');
    output.push(
      'Consider creating a `note-guidance.md` file in your `.a24z` directory to help team members understand what types of notes are most valuable for this project.'
    );
  }
  output.push('');

  // Summary
  output.push('## Summary');
  output.push('### Files Location');
  output.push('- Configuration: `.a24z/configuration.json`');
  output.push('- Tag descriptions: `.a24z/tags/` (individual markdown files)');
  output.push('- Type descriptions: `.a24z/types/` (individual markdown files)');
  output.push('- Note guidance: `.a24z/note-guidance.md`');
  output.push('- Notes storage: `.a24z/notes/` (organized by year/month)');

  return output.join('\n');
}
