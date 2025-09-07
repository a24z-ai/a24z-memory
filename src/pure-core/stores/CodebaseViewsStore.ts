/**
 * Pure CodebaseViewsStore - Platform-agnostic view storage
 *
 * This version uses dependency injection with FileSystemAdapter to work in any environment
 * No Node.js dependencies - can run in browsers, Deno, Bun, or anywhere JavaScript runs
 */

import { FileSystemAdapter } from '../abstractions/filesystem';
import { CodebaseView, ValidatedRepositoryPath, CodebaseViewCell } from '../types';

// Re-export types for convenience
export {
  CodebaseView,
  CodebaseViewCell,
  CodebaseViewFileCell,
  CodebaseViewScope,
  CodebaseViewLinks,
  ViewValidationResult,
  PatternValidationResult,
  FileListValidationResult,
} from '../types';

/**
 * Compute grid dimensions from cell coordinates.
 * Returns the minimum grid size needed to contain all cells.
 */
export function computeGridDimensions(cells: Record<string, CodebaseViewCell>): {
  rows: number;
  cols: number;
} {
  let maxRow = 0;
  let maxCol = 0;

  for (const cell of Object.values(cells)) {
    const [row, col] = cell.coordinates;
    maxRow = Math.max(maxRow, row);
    maxCol = Math.max(maxCol, col);
  }

  // Add 1 since coordinates are 0-indexed
  return { rows: maxRow + 1, cols: maxCol + 1 };
}

/**
 * Pure CodebaseViewsStore - Platform-agnostic view storage using FileSystemAdapter
 */
export class CodebaseViewsStore {
  private fs: FileSystemAdapter;

  constructor(fileSystemAdapter: FileSystemAdapter) {
    this.fs = fileSystemAdapter;
  }

  // ============================================================================
  // Path Utilities
  // ============================================================================

  /**
   * Get the directory where view configurations are stored.
   * Views are stored in .a24z/views/ for consistency with other a24z data.
   */
  private getViewsDirectory(repositoryRootPath: ValidatedRepositoryPath): string {
    return this.fs.join(repositoryRootPath, '.a24z', 'views');
  }

  /**
   * Ensure the views directory exists.
   */
  private ensureViewsDirectory(repositoryRootPath: ValidatedRepositoryPath): void {
    const viewsDir = this.getViewsDirectory(repositoryRootPath);
    this.fs.createDir(viewsDir);
  }

  /**
   * Get the file path for a specific view.
   */
  private getViewFilePath(repositoryRootPath: ValidatedRepositoryPath, viewId: string): string {
    return this.fs.join(this.getViewsDirectory(repositoryRootPath), `${viewId}.json`);
  }

  // ============================================================================
  // Core CRUD Operations
  // ============================================================================

  /**
   * Save a view configuration to storage.
   */
  saveView(repositoryRootPath: ValidatedRepositoryPath, view: CodebaseView): void {
    this.ensureViewsDirectory(repositoryRootPath);

    const filePath = this.getViewFilePath(repositoryRootPath, view.id);

    // Add defaults for required fields if not present
    const viewToSave = {
      ...view,
      version: view.version || '1.0.0', // Default to 1.0.0 if not specified
      timestamp: view.timestamp || new Date().toISOString(),
    };

    this.fs.writeFile(filePath, JSON.stringify(viewToSave, null, 2));
  }

  /**
   * Retrieve a view configuration by ID.
   */
  getView(repositoryRootPath: ValidatedRepositoryPath, viewId: string): CodebaseView | null {
    const filePath = this.getViewFilePath(repositoryRootPath, viewId);

    if (!this.fs.exists(filePath)) {
      return null;
    }

    try {
      const content = this.fs.readFile(filePath);
      return JSON.parse(content) as CodebaseView;
    } catch (error) {
      console.error(`Error reading view ${viewId}:`, error);
      return null;
    }
  }

  /**
   * List all available views in a repository.
   */
  listViews(repositoryRootPath: ValidatedRepositoryPath): CodebaseView[] {
    const viewsDir = this.getViewsDirectory(repositoryRootPath);

    if (!this.fs.exists(viewsDir)) {
      return [];
    }

    const files = this.fs.readDir(viewsDir).filter((f) => f.endsWith('.json'));
    const views: CodebaseView[] = [];

    for (const file of files) {
      const viewId = file.replace(/\.json$/, ''); // Remove .json extension
      const view = this.getView(repositoryRootPath, viewId);

      if (view) {
        views.push(view);
      }
    }

    return views.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Delete a view configuration.
   */
  deleteView(repositoryRootPath: ValidatedRepositoryPath, viewId: string): boolean {
    const filePath = this.getViewFilePath(repositoryRootPath, viewId);

    if (this.fs.exists(filePath)) {
      this.fs.deleteFile(filePath);
      return true;
    }

    return false;
  }

  /**
   * Update an existing view configuration.
   */
  updateView(
    repositoryRootPath: ValidatedRepositoryPath,
    viewId: string,
    updates: Partial<CodebaseView>
  ): boolean {
    const existingView = this.getView(repositoryRootPath, viewId);

    if (!existingView) {
      return false;
    }

    const updatedView: CodebaseView = {
      ...existingView,
      ...updates,
      id: viewId, // Ensure ID cannot be changed
      timestamp: new Date().toISOString(),
    };

    this.saveView(repositoryRootPath, updatedView);
    return true;
  }

  /**
   * Check if a view exists.
   */
  viewExists(repositoryRootPath: ValidatedRepositoryPath, viewId: string): boolean {
    const filePath = this.getViewFilePath(repositoryRootPath, viewId);
    return this.fs.exists(filePath);
  }

  /**
   * Get the default view for a repository, if it exists.
   */
  getDefaultView(repositoryRootPath: ValidatedRepositoryPath): CodebaseView | null {
    return this.getView(repositoryRootPath, 'default');
  }

  /**
   * Set a view as the default view.
   */
  setDefaultView(repositoryRootPath: ValidatedRepositoryPath, viewId: string): boolean {
    const view = this.getView(repositoryRootPath, viewId);
    if (!view) {
      return false;
    }

    // Copy the view to 'default.json'
    const defaultView: CodebaseView = {
      ...view,
      id: 'default',
      name: view.name,
      description: view.description || `Default view based on ${viewId}`,
    };

    this.saveView(repositoryRootPath, defaultView);
    return true;
  }
}

/**
 * Generate a URL-safe ID from a view name.
 * Converts the name to lowercase, replaces spaces and special characters with hyphens,
 * and removes any leading/trailing hyphens.
 *
 * @param name - The human-readable name to convert
 * @returns A URL-safe ID suitable for use as a filename
 *
 * @example
 * generateViewIdFromName("My Architecture View") // returns "my-architecture-view"
 * generateViewIdFromName("Frontend (React + Redux)") // returns "frontend-react-redux"
 */
export function generateViewIdFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length for filesystem safety
}
