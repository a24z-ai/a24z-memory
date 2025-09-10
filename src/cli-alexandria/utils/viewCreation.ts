/**
 * View Creation Utilities - Reusable functions for creating views from documentation
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { globby } from 'globby';
import ignore from 'ignore';
import { MemoryPalace } from '../../MemoryPalace.js';
import { NodeFileSystemAdapter } from '../../node-adapters/NodeFileSystemAdapter.js';
import { generateViewIdFromName } from '../../pure-core/stores/CodebaseViewsStore.js';
import { extractStructureFromMarkdown } from './documentParser.js';
import type { CodebaseView, ValidatedRepositoryPath } from '../../pure-core/types/index.js';

export interface UntrackedDocumentInfo {
  filePath: string;
  relativePath: string;
  fullPath: string;
}

export interface ViewCreationResult {
  file: string;
  success: boolean;
  viewName?: string;
  viewId?: string;
  error?: string;
  issues?: number;
  view?: CodebaseView;
}

export interface ViewCreationOptions {
  category?: string;
  skipValidation?: boolean;
  dryRun?: boolean;
  name?: string;
  description?: string;
}

/**
 * Find all untracked documentation files in a repository
 */
export async function findUntrackedDocuments(
  repositoryPath: string
): Promise<UntrackedDocumentInfo[]> {
  // Load gitignore
  const gitignorePath = path.join(repositoryPath, '.gitignore');
  let ig = ignore();
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    ig = ig.add(gitignoreContent);
  }

  // Find all markdown files in the repository
  const allMarkdownFiles = await globby(['**/*.md', '**/*.markdown', '**/*.mdx'], {
    cwd: repositoryPath,
    gitignore: true,
    absolute: false,
    onlyFiles: true,
  });

  // Filter out files that are gitignored
  const gitFilteredFiles = allMarkdownFiles.filter((file) => !ig.ignores(file));

  // Filter out files in .a24z directory
  const nonA24zFiles = gitFilteredFiles.filter((file) => !file.startsWith('.a24z/'));

  // Get existing views to find which docs are already tracked
  const fileSystemAdapter = new NodeFileSystemAdapter();
  const palace = new MemoryPalace(repositoryPath, fileSystemAdapter);
  const views = palace.listViews();
  const overviewPaths = new Set<string>();

  views.forEach((view) => {
    if (view.overviewPath) {
      // Normalize the path (remove leading ./ if present)
      const normalizedPath = view.overviewPath.replace(/^\.\//, '');
      overviewPaths.add(normalizedPath);
    }
  });

  // Filter out files that are part of CodebaseViews
  const untrackedFiles = nonA24zFiles.filter((file) => !overviewPaths.has(file));

  return untrackedFiles.map((file) => ({
    filePath: file,
    relativePath: file,
    fullPath: path.join(repositoryPath, file),
  }));
}

/**
 * Generate a meaningful view name from a file path
 */
export function generateViewNameFromPath(filePath: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  const dirName = path.dirname(filePath);

  if (dirName === '.') {
    // File is in root directory
    return fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  } else {
    // File is in a subdirectory
    const formattedDir = dirName.replace(/[-_/]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    const formattedFile = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    return `${formattedDir} - ${formattedFile}`;
  }
}

/**
 * Create a codebase view from a documentation file
 */
export function createViewFromDocument(
  repositoryPath: string,
  docInfo: UntrackedDocumentInfo,
  options: ViewCreationOptions = {}
): ViewCreationResult {
  const fileSystemAdapter = new NodeFileSystemAdapter();
  const palace = new MemoryPalace(repositoryPath, fileSystemAdapter);
  const category = options.category || 'docs';

  try {
    // Validate the documentation file is within the repository
    let relativePath: string;
    try {
      const validatedRelPath = MemoryPalace.validateRelativePath(
        repositoryPath as ValidatedRepositoryPath,
        docInfo.fullPath,
        fileSystemAdapter
      );
      relativePath = validatedRelPath;
    } catch {
      return {
        file: docInfo.filePath,
        success: false,
        error: 'File must be within repository',
      };
    }

    if (!fileSystemAdapter.exists(docInfo.fullPath)) {
      return {
        file: docInfo.filePath,
        success: false,
        error: 'File not found',
      };
    }

    // Read and parse the documentation
    let docContent: string;
    try {
      docContent = fs.readFileSync(docInfo.fullPath, 'utf8');
    } catch (error) {
      return {
        file: docInfo.filePath,
        success: false,
        error: `Cannot read file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Extract structure from the markdown with file validation
    const extracted = extractStructureFromMarkdown(docContent, repositoryPath);

    // Use provided name or extract from document
    let viewName = options.name || extracted.name;
    if (viewName === 'Codebase View' || !viewName) {
      viewName = generateViewNameFromPath(docInfo.filePath);
    }

    // Use provided description or extract from document
    const description =
      options.description ||
      extracted.description ||
      `Documentation-based view for ${docInfo.filePath}`;

    // Create the codebase view
    const view: CodebaseView = {
      id: generateViewIdFromName(viewName),
      version: '1.0.0',
      name: viewName,
      description: description,
      rows: extracted.rows || 1,
      cols: extracted.cols || 1,
      cells: extracted.cells,
      overviewPath: relativePath,
      category: category,
      displayOrder: 0, // Will be auto-assigned when saved
      timestamp: new Date().toISOString(),
      metadata: {
        generationType: 'user',
        ui: {
          enabled: true,
          rows: extracted.rows || 1,
          cols: extracted.cols || 1,
          showCellLabels: true,
          cellLabelPosition: 'top',
        },
      },
    };

    if (options.dryRun) {
      // Just return the view without saving
      return {
        file: docInfo.filePath,
        success: true,
        viewName: viewName,
        viewId: view.id,
        view: view,
      };
    }

    // Save the view
    if (options.skipValidation) {
      palace.saveView(view);
      return {
        file: docInfo.filePath,
        success: true,
        viewName: viewName,
        viewId: view.id,
        view: view,
      };
    } else {
      const validationResult = palace.saveViewWithValidation(view);
      return {
        file: docInfo.filePath,
        success: true,
        viewName: viewName,
        viewId: view.id,
        issues: validationResult.issues.length,
        view: validationResult.validatedView,
      };
    }
  } catch (error) {
    return {
      file: docInfo.filePath,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create views from multiple documents
 */
export async function createViewsFromDocuments(
  repositoryPath: string,
  documents: UntrackedDocumentInfo[],
  options: ViewCreationOptions = {}
): Promise<ViewCreationResult[]> {
  const results: ViewCreationResult[] = [];

  for (const docInfo of documents) {
    const result = createViewFromDocument(repositoryPath, docInfo, options);
    results.push(result);
  }

  return results;
}

/**
 * Get statistics about view creation results
 */
export function getViewCreationStats(results: ViewCreationResult[]) {
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const totalIssues = results.reduce((sum, r) => sum + (r.issues || 0), 0);
  const totalFiles = results.reduce((sum, r) => {
    if (r.view) {
      return (
        sum + Object.values(r.view.cells).reduce((cellSum, cell) => cellSum + cell.files.length, 0)
      );
    }
    return sum;
  }, 0);
  const totalCells = results.reduce((sum, r) => {
    if (r.view) {
      return sum + Object.keys(r.view.cells).length;
    }
    return sum;
  }, 0);

  return {
    successful,
    failed,
    total: results.length,
    totalIssues,
    totalFiles,
    totalCells,
    failures: results.filter((r) => !r.success),
    successes: results.filter((r) => r.success),
  };
}
