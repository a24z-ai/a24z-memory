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
  getAllowedTags,
} from '../store/anchoredNotesStore';
import { codebaseViewsStore } from '../store/codebaseViewsStore';
import { findGitRoot } from '../utils/pathNormalization';
import { SessionViewCreator } from '../services/sessionViewCreator';

export class CreateRepositoryAnchoredNoteTool extends BaseTool {
  name = 'create_repository_note';
  description =
    'Document tribal knowledge, architectural decisions, implementation patterns, and important lessons learned. This tool creates searchable notes that help future developers understand context and avoid repeating mistakes. Notes are stored locally in your repository and can be retrieved using the askA24zMemory tool.';

  constructor() {
    super();
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
    metadata: z
      .record(z.any())
      .optional()
      .describe(
        'Additional structured data about the note. Can include custom fields like author, related PRs, issue numbers, or any other contextual information that might be useful for future reference.'
      ),
    codebaseViewId: z
      .string()
      .optional()
      .describe(
        'Optional CodebaseView ID to associate this note with. If not provided, a session view will be auto-created based on your file anchors.'
      ),
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

    // Check for new tags that don't have descriptions
    const existingTagDescriptions = getTagDescriptions(parsed.directoryPath);
    const existingTags = Object.keys(existingTagDescriptions);
    const newTags = parsed.tags.filter((tag) => !existingTags.includes(tag));

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

    // When enforcement is OFF, auto-create empty descriptions for new tags/types
    const autoCreatedTags: string[] = [];

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

    // Get or create the CodebaseView (after all validations pass)
    let view;
    let actualCodebaseViewId: string;

    if (parsed.codebaseViewId) {
      // User provided a view ID - validate it exists
      view = codebaseViewsStore.getView(parsed.directoryPath, parsed.codebaseViewId);
      if (!view) {
        const availableViews = codebaseViewsStore.listViews(parsed.directoryPath);
        const viewsList =
          availableViews.length > 0
            ? availableViews.map((v) => `• ${v.id}: ${v.name}`).join('\n')
            : 'No views found. Please create a view first.';

        throw new Error(
          `❌ CodebaseView with ID "${parsed.codebaseViewId}" not found.\n\n` +
            `**Available views:**\n${viewsList}\n\n` +
            `💡 Tip: Use an existing view ID from the list above, or create a new view first.`
        );
      }
      actualCodebaseViewId = parsed.codebaseViewId;
    } else {
      // No view ID provided - auto-create a session view
      const sessionResult = SessionViewCreator.createFromAnchors(
        parsed.directoryPath,
        parsed.anchors
      );
      view = sessionResult.view;
      actualCodebaseViewId = sessionResult.viewId;
    }

    const savedWithPath = saveNote({
      note: parsed.note,
      directoryPath: parsed.directoryPath,
      anchors: parsed.anchors,
      tags: parsed.tags,
      metadata: {
        ...(parsed.metadata || {}),
        toolVersion: '2.0.0',
        createdBy: 'create_repository_note_tool',
      },
      reviewed: false, // New notes start as unreviewed
      codebaseViewId: actualCodebaseViewId,
    });

    const saved = savedWithPath.note;

    // Log activity for session views
    if (view.metadata?.generationType === 'session') {
      SessionViewCreator.appendActivity(
        parsed.directoryPath,
        actualCodebaseViewId,
        saved.id,
        parsed.note,
        parsed.anchors[0] || 'unknown'
      );
    }

    // Build response message with guidance about auto-created tags/types
    let response =
      `✅ **Note saved successfully!**\n\n` +
      `🆔 **Note ID:** ${saved.id}\n` +
      `📁 **Repository:** ${parsed.directoryPath}\n` +
      `📊 **View:** ${view.name} (${actualCodebaseViewId})\n` +
      `🏷️ **Tags:** ${parsed.tags.join(', ')}\n`;

    // Add info about session view creation
    if (!parsed.codebaseViewId) {
      response += `🔄 **Session View:** Auto-created based on your file anchors\n`;
    }

    // Add guidance about using the view ID for future notes in this session
    if (!parsed.codebaseViewId) {
      response += `\n💡 **For future notes in this session:** Use \`codebaseViewId: "${actualCodebaseViewId}"\` to group related notes together.\n`;
    }

    return { content: [{ type: 'text', text: response }] };
  }
}
