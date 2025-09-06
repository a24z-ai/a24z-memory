import { z } from 'zod';
import * as path from 'node:path';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { AnchoredNotesStore } from '../../pure-core/stores/AnchoredNotesStore';
import { NodeFileSystemAdapter } from '../../node-adapters/NodeFileSystemAdapter';
import { findGitRoot } from '../../node-adapters/NodeFileSystemAdapter';
import { FileSystemAdapter } from '../../pure-core/abstractions/filesystem';
import { existsSync } from 'fs';

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

  // Allow injection of a custom filesystem adapter for testing
  private nodeFs: FileSystemAdapter;

  constructor(nodeFs?: FileSystemAdapter) {
    super();
    this.nodeFs = nodeFs || new NodeFileSystemAdapter();
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
    if (!path.isAbsolute(repositoryPath)) {
      throw new Error(
        `❌ repositoryPath must be an absolute path starting with '/'. ` +
          `Received relative path: "${repositoryPath}". ` +
          `💡 Tip: Use absolute paths like /Users/username/projects/my-repo or /home/user/project.`
      );
    }

    // Find the repository root
    let repositoryRoot: string;
    
    if (this.nodeFs) {
      // When using dependency injection (testing), find git root using the adapter
      repositoryRoot = repositoryPath;
      let currentPath = repositoryPath;
      while (currentPath && currentPath !== '/' && currentPath !== this.nodeFs.dirname(currentPath)) {
        if (this.nodeFs.exists(this.nodeFs.join(currentPath, '.git'))) {
          repositoryRoot = currentPath;
          break;
        }
        currentPath = this.nodeFs.dirname(currentPath);
      }
      if (!this.nodeFs.exists(this.nodeFs.join(repositoryRoot, '.git'))) {
        throw new Error(
          `❌ Could not find git repository at path: "${repositoryPath}". ` +
            `💡 Tip: Ensure the path is within a git repository.`
        );
      }
    } else {
      // Production mode - use Node.js filesystem functions  
      const foundRoot = findGitRoot(repositoryPath);
      if (!foundRoot || !existsSync(foundRoot)) {
        throw new Error(
          `❌ Could not find git repository at path: "${repositoryPath}". ` +
            `💡 Tip: Ensure the path is within a git repository.`
        );
      }
      repositoryRoot = foundRoot;
    }

    // Create MemoryPalace and get all views
    const notesStore = new AnchoredNotesStore(repositoryRoot, this.nodeFs || new NodeFileSystemAdapter());
    const allCodebaseViews = notesStore.listViews();

    // Transform to our summary format
    const codebaseViewSummaries: CodebaseViewSummary[] = allCodebaseViews.map((view) => ({
      id: view.id,
      name: view.name,
      description: view.description,
    }));

    return {
      codebaseViews: codebaseViewSummaries,
      repositoryPath: repositoryRoot,
      totalCount: codebaseViewSummaries.length,
    };
  }
}
