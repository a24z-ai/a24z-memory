import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { 
  getRepositoryGuidance, 
  getRepositoryConfiguration, 
  getAllowedTags,
  getTagDescriptions,
  getTagsWithDescriptions
} from '../store/notesStore';

export class GetRepositoryGuidanceTool extends BaseTool {
  name = 'get_repository_guidance';
  description = 'Get comprehensive repository configuration including note guidance, tag restrictions, and tag descriptions';

  schema = z.object({
    path: z.string().describe('The file or directory path to get guidance for. Can be any path within the repository - the tool will find the repository root and provide comprehensive configuration.'),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    // Get all configuration information
    const config = getRepositoryConfiguration(input.path);
    const guidance = getRepositoryGuidance(input.path);
    const allowedTags = getAllowedTags(input.path);
    const tagDescriptions = getTagDescriptions(input.path);
    const tagsWithDescriptions = getTagsWithDescriptions(input.path);
    
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
      output.push('Consider creating a `note-guidance.md` file in your `.a24z` directory to help team members understand what types of notes are most valuable for this project.');
    }
    output.push('');
    
    // Summary
    output.push('## Summary');
    output.push('### Files Location');
    output.push('- Configuration: `.a24z/configuration.json`');
    output.push('- Tag descriptions: `.a24z/tags/` (individual markdown files)');
    output.push('- Note guidance: `.a24z/note-guidance.md`');
    output.push('- Notes storage: `.a24z/notes/` (organized by year/month)');
    
    return { 
      content: [{ 
        type: 'text', 
        text: output.join('\n')
      }] 
    };
  }
}