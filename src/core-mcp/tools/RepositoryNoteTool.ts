import { z } from 'zod';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { saveNote } from '../store/notesStore';
import { findGitRoot } from '../utils/pathNormalization';

export class RepositoryNoteTool extends BaseTool {
  name = 'create_repository_note';
  description = 'Store tribal knowledge associated with repository paths';

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
        `directoryPath must be an absolute path to a git repository root. ` +
        `Received relative path: "${parsed.directoryPath}". ` +
        `Please provide the full absolute path to the repository root directory (e.g., /Users/username/projects/my-repo).`
      );
    }
    
    // Validate that directoryPath exists
    if (!fs.existsSync(parsed.directoryPath)) {
      throw new Error(
        `directoryPath does not exist: "${parsed.directoryPath}". ` +
        `Please provide a valid absolute path to an existing git repository root.`
      );
    }
    
    // Validate that directoryPath is a git repository root
    const gitRoot = findGitRoot(parsed.directoryPath);
    if (!gitRoot) {
      throw new Error(
        `directoryPath is not within a git repository: "${parsed.directoryPath}". ` +
        `Please provide the absolute path to a git repository root directory (containing .git).`
      );
    }
    
    // Validate that the provided path IS the git root, not a subdirectory
    if (gitRoot !== parsed.directoryPath) {
      throw new Error(
        `directoryPath must be the git repository root, not a subdirectory. ` +
        `You provided: "${parsed.directoryPath}" ` +
        `But the git root is: "${gitRoot}". ` +
        `Please use the git root path instead.`
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
    return { content: [{ type: 'text', text: `Saved note ${saved.id}` }] };
  }
}
