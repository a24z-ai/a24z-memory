import { z } from 'zod';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { saveNote } from '../store/notesStore';
import { findGitRoot } from '../utils/pathNormalization';

export class RepositoryNoteTool extends BaseTool {
  name = 'create_repository_note';
  description = 'Document tribal knowledge, architectural decisions, implementation patterns, and important lessons learned. This tool creates searchable notes that help future developers understand context and avoid repeating mistakes. Notes are stored locally in your repository and can be retrieved using the askA24zMemory tool.';

  schema = z.object({
    note: z.string().describe('The tribal knowledge content in Markdown format. Use code blocks with ``` for code snippets, **bold** for emphasis, and [file.ts](path/to/file.ts) for file references'),
    directoryPath: z.string().describe('The absolute path to the git repository root directory (the directory containing .git). This determines which repository the note belongs to. Must be an absolute path starting with / and must point to a valid git repository root.'),
    anchors: z.array(z.string()).min(1, 'At least one anchor path is required.').describe('File or directory paths that this note relates to. These paths enable cross-referencing and help surface relevant notes when working in different parts of the codebase. Include all paths that should trigger this note to appear, such as the files or directories the note is about.'),
    tags: z.array(z.string()).min(1, 'At least one tag is required.').describe('Required semantic tags for categorization. Use get_repository_tags tool to see available tags. New tags will be created automatically if they don\'t exist.'),
    confidence: z.enum(['high', 'medium', 'low']).optional().default('medium').describe('Your confidence level in the accuracy and completeness of this note. Use "high" for well-tested solutions, "medium" for reasonable assumptions, and "low" for experimental or uncertain information.'),
    type: z.enum(['decision', 'pattern', 'gotcha', 'explanation']).optional().default('explanation').describe('The type of knowledge being documented. "decision" for architectural choices, "pattern" for reusable solutions, "gotcha" for tricky issues/bugs, "explanation" for general documentation.'),
    metadata: z.record(z.any()).optional().describe('Additional structured data about the note. Can include custom fields like author, related PRs, issue numbers, or any other contextual information that might be useful for future reference.'),
  });

  async execute(input: z.input<typeof this.schema>): Promise<McpToolResult> {
    const parsed = this.schema.parse(input);
    
    // Log working directory for debugging
    console.error('[RepositoryNoteTool] DEBUG: current working directory:', process.cwd());
    console.error('[RepositoryNoteTool] DEBUG: __dirname:', __dirname);
    console.error('[RepositoryNoteTool] DEBUG: input directoryPath:', parsed.directoryPath);
    
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
    
    const saved = saveNote({
      note: parsed.note,
      directoryPath: parsed.directoryPath,
      anchors: parsed.anchors,  // Now required, no need for fallback
      tags: parsed.tags,
      confidence: parsed.confidence,
      type: parsed.type,
      metadata: { ...(parsed.metadata || {}), toolVersion: '2.0.0', createdBy: 'create_repository_note_tool' }
    });

    const response = `✅ **Note saved successfully!**\n\n` +
      `🆔 **Note ID:** ${saved.id}\n` +
      `📁 **Repository:** ${parsed.directoryPath}\n` +
      `🏷️ **Tags:** ${parsed.tags.join(', ')}\n` +
      `📋 **Type:** ${parsed.type}\n` +
      `🎯 **Confidence:** ${parsed.confidence}\n\n` +
      `💡 **Next steps:**\n` +
      `- Use \`askA24zMemory\` to retrieve this note later\n` +
      `- Share this knowledge with your team by committing the \`.a24z/repository-notes.json\` file\n` +
      `- Consider adding more context or examples to make this note even more valuable!`;

    return { content: [{ type: 'text', text: response }] };
  }
}
