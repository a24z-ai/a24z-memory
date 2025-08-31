import { z } from 'zod';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import {
  saveNote,
  getRepositoryConfiguration,
  getTagDescriptions,
  saveTagDescription,
  getTypeDescriptions,
  saveTypeDescription,
  getAllowedTags,
  getAllowedTypes,
} from '../store/notesStore';
import { findGitRoot } from '../utils/pathNormalization';
import { GuidanceTokenManager } from '../services/guidance-token-manager';

export class CreateRepositoryNoteTool extends BaseTool {
  name = 'create_repository_note';
  description =
    'Document tribal knowledge, architectural decisions, implementation patterns, and important lessons learned. This tool creates searchable notes that help future developers understand context and avoid repeating mistakes. Notes are stored locally in your repository and can be retrieved using the askA24zMemory tool.';

  private tokenManager: GuidanceTokenManager;

  constructor() {
    super();
    this.tokenManager = new GuidanceTokenManager();
  }

  schema = z.object({
    note: z
      .string()
      .describe(
        'The tribal knowledge content in Markdown format. Use code blocks with ``` for code snippets, **bold** for emphasis, and [file.ts](path/to/file.ts) for file references'
      ),
    directoryPath: z
      .string()
      .describe(
        'The absolute path to the git repository root directory (the directory containing .git). This determines which repository the note belongs to. Must be an absolute path starting with / and must point to a valid git repository root.'
      ),
    anchors: z
      .array(z.string())
      .min(1, 'At least one anchor path is required.')
      .describe(
        'File or directory paths that this note relates to. These paths enable cross-referencing and help surface relevant notes when working in different parts of the codebase. Include all paths that should trigger this note to appear, such as the files or directories the note is about.'
      ),
    tags: z
      .array(z.string())
      .min(1, 'At least one tag is required.')
      .describe(
        "Required semantic tags for categorization. Use get_repository_tags tool to see available tags. New tags will be created automatically if they don't exist."
      ),
    type: z
      .string()
      .optional()
      .default('explanation')
      .describe(
        'The type of knowledge being documented. Common types: "decision" for architectural choices, "pattern" for reusable solutions, "gotcha" for tricky issues/bugs, "explanation" for general documentation. Custom types are also supported.'
      ),
    metadata: z
      .record(z.any())
      .optional()
      .describe(
        'Additional structured data about the note. Can include custom fields like author, related PRs, issue numbers, or any other contextual information that might be useful for future reference.'
      ),
    guidanceToken: z
      .string()
      .optional()
      .describe('Token from get_repository_guidance proving you have read the current guidance'),
  });

  async execute(input: z.input<typeof this.schema>): Promise<McpToolResult> {
    const parsed = this.schema.parse(input);

    // Validate that directoryPath is absolute
    if (!path.isAbsolute(parsed.directoryPath)) {
      throw new Error(
        `❌ directoryPath must be an absolute path starting with '/'. ` +
          `Received relative path: "${parsed.directoryPath}". ` +
          `💡 Tip: Use absolute paths like /Users/username/projects/my-repo or /home/user/project. ` +
          `You can get the current working directory and build the absolute path from there.`
      );
    }

    // Validate that directoryPath exists
    if (!fs.existsSync(parsed.directoryPath)) {
      throw new Error(
        `❌ directoryPath does not exist: "${parsed.directoryPath}". ` +
          `💡 Tip: Make sure the path exists and you have read access to it. ` +
          `Check your current working directory and build the correct absolute path.`
      );
    }

    // Validate that directoryPath is a git repository root
    const gitRoot = findGitRoot(parsed.directoryPath);
    if (!gitRoot) {
      throw new Error(
        `❌ directoryPath is not within a git repository: "${parsed.directoryPath}". ` +
          `💡 Tip: Initialize a git repository with 'git init' in your project root, or navigate to an existing git repository. ` +
          `The directoryPath should be the root of your git project (where .git folder is located).`
      );
    }

    // Validate that the provided path IS the git root, not a subdirectory
    if (gitRoot !== parsed.directoryPath) {
      throw new Error(
        `❌ directoryPath must be the git repository root, not a subdirectory. ` +
          `You provided: "${parsed.directoryPath}" ` +
          `But the git root is: "${gitRoot}". ` +
          `💡 Tip: Use the git root path (${gitRoot}) instead of the subdirectory. ` +
          `This ensures all notes are stored in the same location and can be found consistently.`
      );
    }

    // Check configuration for tag/type enforcement
    const config = getRepositoryConfiguration(parsed.directoryPath);
    const tagEnforcement = config.tags?.enforceAllowedTags || false;
    const typeEnforcement = config.types?.enforceAllowedTypes || false;

    // Validate guidance token (always required)
    if (!parsed.guidanceToken) {
      throw new Error(
        `❌ Guidance token required. Please read repository guidance first using get_repository_guidance tool.\n` +
          `💡 The guidance token proves you have read and understood the current repository guidelines.`
      );
    }

    // Validate token using the validateTokenForPath method which checks against full guidance
    try {
      this.tokenManager.validateTokenForPath(parsed.guidanceToken, parsed.directoryPath);
    } catch {
      throw new Error(
        `❌ Invalid or expired guidance token.\n` +
          `💡 Please read the current repository guidance using get_repository_guidance tool to get a fresh token.\n` +
          `Tokens expire after 24 hours or when guidance content changes.`
      );
    }

    // Check for new tags that don't have descriptions
    const existingTagDescriptions = getTagDescriptions(parsed.directoryPath);
    const existingTags = Object.keys(existingTagDescriptions);
    const newTags = parsed.tags.filter((tag) => !existingTags.includes(tag));

    // Check for new types that don't have descriptions
    const existingTypeDescriptions = getTypeDescriptions(parsed.directoryPath);
    const existingTypes = Object.keys(existingTypeDescriptions);
    const isNewType = parsed.type && !existingTypes.includes(parsed.type);

    // Handle tag enforcement
    if (tagEnforcement && newTags.length > 0) {
      // When enforcement is on, reject new tags
      const allowedTagsInfo = getAllowedTags(parsed.directoryPath);
      const tagList =
        allowedTagsInfo.tags.length > 0
          ? allowedTagsInfo.tags
              .map((tag) => {
                const desc = existingTagDescriptions[tag];
                return desc
                  ? `• **${tag}**: ${desc.split('\n')[0].substring(0, 50)}...`
                  : `• **${tag}**`;
              })
              .join('\n')
          : 'No tags with descriptions exist yet.';

      throw new Error(
        `❌ Tag creation is not allowed when tag enforcement is enabled.\n\n` +
          `The following tags do not exist: ${newTags.join(', ')}\n\n` +
          `**Available tags with descriptions:**\n${tagList}\n\n` +
          `💡 To use new tags, either:\n` +
          `1. Use one of the existing tags above\n` +
          `2. Ask an administrator to create the tag with a proper description\n` +
          `3. Disable tag enforcement in .a24z/configuration.json`
      );
    }

    // Handle type enforcement
    if (typeEnforcement && isNewType) {
      // When enforcement is on, reject new types
      const allowedTypesInfo = getAllowedTypes(parsed.directoryPath);
      const typeList =
        allowedTypesInfo.types.length > 0
          ? allowedTypesInfo.types
              .map((type) => {
                const desc = existingTypeDescriptions[type];
                return desc
                  ? `• **${type}**: ${desc.split('\n')[0].substring(0, 50)}...`
                  : `• **${type}**`;
              })
              .join('\n')
          : 'No types with descriptions exist yet.';

      throw new Error(
        `❌ Type creation is not allowed when type enforcement is enabled.\n\n` +
          `The type "${parsed.type}" does not exist.\n\n` +
          `**Available types with descriptions:**\n${typeList}\n\n` +
          `💡 To use new types, either:\n` +
          `1. Use one of the existing types above\n` +
          `2. Ask an administrator to create the type with a proper description\n` +
          `3. Disable type enforcement in .a24z/configuration.json`
      );
    }

    // When enforcement is OFF, auto-create empty descriptions for new tags/types
    const autoCreatedTags: string[] = [];
    let autoCreatedType: string | null = null;

    if (!tagEnforcement && newTags.length > 0) {
      // Auto-create empty descriptions for new tags
      for (const tag of newTags) {
        try {
          saveTagDescription(parsed.directoryPath, tag, '');
          autoCreatedTags.push(tag);
        } catch (error) {
          console.error(`Failed to auto-create tag description for "${tag}":`, error);
        }
      }
    }

    if (!typeEnforcement && isNewType && parsed.type) {
      // Auto-create empty description for new type
      try {
        saveTypeDescription(parsed.directoryPath, parsed.type, '');
        autoCreatedType = parsed.type;
      } catch (error) {
        console.error(`Failed to auto-create type description for "${parsed.type}":`, error);
      }
    }

    const savedWithPath = saveNote({
      note: parsed.note,
      directoryPath: parsed.directoryPath,
      anchors: parsed.anchors,
      tags: parsed.tags,
      type: parsed.type,
      metadata: {
        ...(parsed.metadata || {}),
        toolVersion: '2.0.0',
        createdBy: 'create_repository_note_tool',
      },
      reviewed: false, // New notes start as unreviewed
    });

    const saved = savedWithPath.note;

    // Build response message with guidance about auto-created tags/types
    let response =
      `✅ **Note saved successfully!**\n\n` +
      `🆔 **Note ID:** ${saved.id}\n` +
      `📁 **Repository:** ${parsed.directoryPath}\n` +
      `🏷️ **Tags:** ${parsed.tags.join(', ')}\n` +
      `📋 **Type:** ${parsed.type}\n` +
      `\n`;

    // Add warnings about auto-created tags
    if (autoCreatedTags.length > 0) {
      response += `⚠️ **New tags created with empty descriptions:**\n`;
      response += autoCreatedTags.map((tag) => `• ${tag}`).join('\n') + '\n\n';
      response += `**IMPORTANT:** Please update these tag descriptions immediately:\n`;
      response += `• Use the library API: \`saveTagDescription(repoPath, tagName, description)\`\n`;
      response += `• Or create markdown files: \`.a24z/tags/${autoCreatedTags[0]}.md\`\n`;
      response += `• Description limit: ${config.limits.tagDescriptionMaxLength} characters\n\n`;
    }

    // Add warnings about auto-created type
    if (autoCreatedType) {
      response += `⚠️ **New type created with empty description:** ${autoCreatedType}\n\n`;
      response += `**IMPORTANT:** Please update this type description immediately:\n`;
      response += `• Use the library API: \`saveTypeDescription(repoPath, typeName, description)\`\n`;
      response += `• Or create markdown file: \`.a24z/types/${autoCreatedType}.md\`\n`;
      response += `• Description limit: ${config.limits.tagDescriptionMaxLength} characters\n\n`;
    }

    response += `💡 **Next steps:**\n`;
    if (autoCreatedTags.length > 0 || autoCreatedType) {
      response += `- **Update the empty descriptions created above**\n`;
    }
    response +=
      `- Use \`askA24zMemory\` to retrieve this note later\n` +
      `- Share this knowledge with your team by committing the \`.a24z/\` directory\n` +
      `- Consider adding more context or examples to make this note even more valuable!`;

    return { content: [{ type: 'text', text: response }] };
  }
}
