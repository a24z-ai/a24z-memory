import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { MemoryPalace } from '../../MemoryPalace';
import { FileSystemAdapter } from '../../pure-core/abstractions/filesystem';

export class GetRepositoryGuidanceTool extends BaseTool {
  name = 'get_repository_guidance';
  description =
    'Get comprehensive repository configuration including note guidance, tag restrictions, and tag descriptions';

  private fs: FileSystemAdapter;

  constructor(fs: FileSystemAdapter) {
    super();
    this.fs = fs;
  }

  schema = z.object({
    path: z
      .string()
      .describe(
        'The file or directory path to get guidance for. Can be any path within the repository - the tool will find the repository root and provide comprehensive configuration.'
      ),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    // Check if path exists
    if (!this.fs.exists(input.path)) {
      throw new Error(`Path does not exist: ${input.path}`);
    }

    // Find the repository root
    let repoRoot: string;
    try {
      repoRoot = this.fs.normalizeRepositoryPath(input.path);
    } catch {
      throw new Error(`Not a git repository: ${input.path}. This tool requires a git repository.`);
    }

    // Create MemoryPalace instance and generate full guidance content
    const memoryPalace = new MemoryPalace(repoRoot, this.fs);
    const fullContent = memoryPalace.getFullGuidance();

    const result: McpToolResult = {
      content: [
        {
          type: 'text',
          text: JSON.stringify(fullContent, null, 2),
        },
      ],
    };

    return result;
  }
}
