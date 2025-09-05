import { z } from 'zod';
import * as path from 'node:path';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { codebaseViewsStore } from '../store/codebaseViewsStore';
import { normalizeRepositoryPath } from '../utils/pathNormalization';

/**
 * Summary of a codebase view for user browsing and selection.
 * Contains only the essential information needed for choosing a view.
 */
export interface CodebaseViewSummary {
  id: string;
  name: string;
  description: string;
}

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
    if (!path.isAbsolute(repositoryPath)) {
      throw new Error(
        `❌ repositoryPath must be an absolute path starting with '/'. ` +
          `Received relative path: "${repositoryPath}". ` +
          `💡 Tip: Use absolute paths like /Users/username/projects/my-repo or /home/user/project.`
      );
    }

    // Normalize to repository root
    const normalizedRepoPath = normalizeRepositoryPath(repositoryPath);

    // Get all views from the store
    const allCodebaseViews = codebaseViewsStore.listViews(normalizedRepoPath);

    // Transform to our summary format
    const codebaseViewSummaries: CodebaseViewSummary[] = allCodebaseViews.map((view) => ({
      id: view.id,
      name: view.name,
      description: view.description,
    }));

    return {
      codebaseViews: codebaseViewSummaries,
      repositoryPath: normalizedRepoPath,
      totalCount: codebaseViewSummaries.length,
    };
  }
}
