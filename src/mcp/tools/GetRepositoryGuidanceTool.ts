import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { AnchoredNotesStore } from '../../pure-core/stores/AnchoredNotesStore';
import { NodeFileSystemAdapter, findGitRoot } from '../../node-adapters/NodeFileSystemAdapter';
import { FileSystemAdapter } from '../../pure-core/abstractions/filesystem';
import path from 'path';
import { existsSync } from 'fs';

export class GetRepositoryGuidanceTool extends BaseTool {
  name = 'get_repository_guidance';
  description =
    'Get comprehensive repository configuration including note guidance, tag restrictions, and tag descriptions';

  // Allow injection of a custom filesystem adapter for testing
  private fsAdapter?: FileSystemAdapter;
  
  constructor(fsAdapter?: FileSystemAdapter) {
    super();
    this.fsAdapter = fsAdapter;
  }

  schema = z.object({
    path: z
      .string()
      .describe(
        'The file or directory path to get guidance for. Can be any path within the repository - the tool will find the repository root and provide comprehensive configuration.'
      ),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    // Use injected adapter for testing, or default to NodeFileSystemAdapter
    const nodeFs = this.fsAdapter || new NodeFileSystemAdapter();
    
    // For in-memory testing, we trust the provided path
    // For production, we need to find the git root
    let repoRoot: string;
    
    if (this.fsAdapter) {
      // Testing mode - trust the provided directory path as the git root
      repoRoot = input.path;
      if (!nodeFs.exists(repoRoot)) {
        throw new Error(`Path does not exist: ${repoRoot}`);
      }
      if (!nodeFs.exists(nodeFs.join(repoRoot, '.git'))) {
        throw new Error(
          `Not a git repository: ${repoRoot}. This tool requires a git repository.`
        );
      }
    } else {
      // Production mode - find git root from any path within repository
      const normalizedPath = path.resolve(input.path);

      // Check if path exists
      if (!existsSync(normalizedPath)) {
        throw new Error(`Path does not exist: ${normalizedPath}`);
      }

      // Find the git root
      const foundRoot = findGitRoot(normalizedPath);
      if (!foundRoot) {
        throw new Error(
          `Not a git repository: ${normalizedPath}. This tool requires a git repository.`
        );
      }
      repoRoot = foundRoot;
    }

    // Create MemoryPalace instance and generate full guidance content
    const notesStore = new AnchoredNotesStore(repoRoot, nodeFs);
    const fullContent = notesStore.generateFullGuidanceContent();

    const result: McpToolResult = {
      content: [
        {
          type: 'text',
          text: fullContent,
        },
      ],
    };

    return result;
  }
}
