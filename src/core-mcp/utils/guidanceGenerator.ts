/**
 * Utility functions for generating guidance content
 */

import {
  getRepositoryConfiguration,
  getRepositoryGuidance,
  getAllowedTags,
  getTagDescriptions,
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
  output.push('- Note guidance: `.a24z/note-guidance.md`');
  output.push('- Notes storage: `.a24z/notes/` (organized by year/month)');

  return output.join('\n');
}
