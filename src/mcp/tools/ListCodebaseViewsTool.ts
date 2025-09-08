import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { MemoryPalace } from '../../MemoryPalace';
import { FileSystemAdapter } from '../../pure-core/abstractions/filesystem';
import type { CodebaseViewSummary } from '../../pure-core/types/summary';
import { extractCodebaseViewSummary } from '../../pure-core/types/summary';

/**
 * Response type for the ListCodebaseViewsTool.
 */
export interface ListCodebaseViewsResponse {
  codebaseViews: CodebaseViewSummary[];
  repositoryPath: string;
  totalCount: number;
}

export class ListCodebaseViewsTool extends BaseTool {
  public name = 'list_codebase_views';
  public description =
    'List all available codebase views in a repository. Returns a summary of each view with id, name, and description for browsing and selection.';

  private fs: FileSystemAdapter;

  constructor(fs: FileSystemAdapter) {
    super();
    this.fs = fs;
  }

  public schema = z.object({
    repositoryPath: z
      .string()
      .describe(
        'The path to the repository to list views for. Can be any path within the repository - will find the repository root automatically.'
      ),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    const result = await this.executeWithMetadata(input);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  async executeWithMetadata(
    input: z.infer<typeof this.schema>
  ): Promise<ListCodebaseViewsResponse> {
    const { repositoryPath } = input;

    // Validate that repositoryPath is absolute
    if (!this.fs.isAbsolute(repositoryPath)) {
      throw new Error(
        `❌ repositoryPath must be an absolute path starting with '/'. ` +
          `Received relative path: "${repositoryPath}". ` +
          `💡 Tip: Use absolute paths like /Users/username/projects/my-repo or /home/user/project.`
      );
    }

    // Find the repository root
    let repositoryRoot: string;

    try {
      repositoryRoot = this.fs.normalizeRepositoryPath(repositoryPath);
    } catch {
      throw new Error(
        `❌ Could not find git repository at path: "${repositoryPath}". ` +
          `💡 Tip: Ensure the path is within a git repository.`
      );
    }

    // Create MemoryPalace and get all views
    const memoryPalace = new MemoryPalace(repositoryRoot, this.fs);
    const allCodebaseViews = memoryPalace.listViews();

    // Transform to our summary format using the shared function
    const codebaseViewSummaries: CodebaseViewSummary[] = allCodebaseViews.map(
      extractCodebaseViewSummary
    );

    return {
      codebaseViews: codebaseViewSummaries,
      repositoryPath: repositoryRoot,
      totalCount: codebaseViewSummaries.length,
    };
  }
}
