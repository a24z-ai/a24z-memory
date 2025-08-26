import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { 
  getRepositoryGuidance, 
  getRepositoryConfiguration, 
  getAllowedTags,
  getTagDescriptions,
  getTagsWithDescriptions,
  getAllowedTypes,
  getTypeDescriptions,
  getTypesWithDescriptions
} from '../store/notesStore';
import { GuidanceTokenManager } from '../services/guidance-token-manager';

export class GetRepositoryGuidanceTool extends BaseTool {
  name = 'get_repository_guidance';
  description = 'Get comprehensive repository configuration including note guidance, tag restrictions, and tag descriptions';
  
  private tokenManager: GuidanceTokenManager;

  constructor() {
    super();
    this.tokenManager = new GuidanceTokenManager();
  }

  schema = z.object({
    path: z.string().describe('The file or directory path to get guidance for. Can be any path within the repository - the tool will find the repository root and provide comprehensive configuration.'),
    includeToken: z.boolean().optional().describe('Whether to include a guidance token for note validation (default: true)'),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    // Get all configuration information
    const config = getRepositoryConfiguration(input.path);
    const guidance = getRepositoryGuidance(input.path);
    const allowedTags = getAllowedTags(input.path);
    const tagDescriptions = getTagDescriptions(input.path);
    const tagsWithDescriptions = getTagsWithDescriptions(input.path);
    const allowedTypes = getAllowedTypes(input.path);
    const typeDescriptions = getTypeDescriptions(input.path);
    const typesWithDescriptions = getTypesWithDescriptions(input.path);
    
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
      output.push('Consider creating a `note-guidance.md` file in your `.a24z` directory to help team members understand what types of notes are most valuable for this project.');
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
    
    // Generate guidance token if requested (default to true)
    const includeToken = input.includeToken !== false;
    let token: string | undefined;
    
    if (includeToken) {
      // Generate token based on the full guidance content
      const fullContent = output.join('\n');
      token = this.tokenManager.generateToken(fullContent, input.path);
      
      output.push('');
      output.push('## Guidance Token');
      output.push('This token proves you have read the current guidance:');
      output.push(`\`${token}\``);
      output.push('');
      output.push('Include this token when creating notes to verify guidance compliance.');
      output.push('Token expires in 24 hours.');
    }
    
    const result: any = { 
      content: [{ 
        type: 'text', 
        text: output.join('\n')
      }] 
    };
    
    // Include token in structured response if generated
    if (token) {
      result.guidanceToken = token;
    }
    
    return result;
  }
}