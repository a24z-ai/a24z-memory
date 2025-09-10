/**
 * Pure CodebaseViewsStore - Platform-agnostic view storage
 *
 * This version uses dependency injection with FileSystemAdapter to work in any environment
 * No Node.js dependencies - can run in browsers, Deno, Bun, or anywhere JavaScript runs
 */

import { FileSystemAdapter } from '../abstractions/filesystem';
import { CodebaseView, ValidatedRepositoryPath, CodebaseViewCell } from '../types';
import { ValidatedAlexandriaPath } from '../types/repository';

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
  private alexandriaPath: ValidatedAlexandriaPath;
  private viewsDir: string;

  constructor(fileSystemAdapter: FileSystemAdapter, alexandriaPath: ValidatedAlexandriaPath) {
    this.fs = fileSystemAdapter;
    this.alexandriaPath = alexandriaPath;
    this.viewsDir = this.fs.join(alexandriaPath, 'views');
    // Ensure views directory exists
    this.fs.createDir(this.viewsDir);
  }

  // ============================================================================
  // Path Utilities
  // ============================================================================

  /**
   * Get the directory where view configurations are stored.
   */
  private getViewsDirectory(): string {
    return this.viewsDir;
  }

  /**
   * Ensure the views directory exists.
   */
  private ensureViewsDirectory(): void {
    // Already ensured in constructor, but keep for compatibility
    if (!this.fs.exists(this.viewsDir)) {
      this.fs.createDir(this.viewsDir);
    }
  }

  /**
   * Get the file path for a specific view.
   */
  private getViewFilePath(repositoryRootPath: ValidatedRepositoryPath, viewId: string): string {
    return this.fs.join(this.getViewsDirectory(), `${viewId}.json`);
  }

  // ============================================================================
  // Core CRUD Operations
  // ============================================================================

  /**
   * Get the next available display order for a category.
   */
  private getNextDisplayOrder(
    repositoryRootPath: ValidatedRepositoryPath,
    category: string
  ): number {
    const views = this.listViews(repositoryRootPath);
    const categoryViews = views.filter((v) => v.category === category);

    if (categoryViews.length === 0) {
      return 0;
    }

    const maxOrder = Math.max(...categoryViews.map((v) => v.displayOrder || 0));
    return maxOrder + 1;
  }

  /**
   * Save a view configuration to storage.
   */
  saveView(repositoryRootPath: ValidatedRepositoryPath, view: CodebaseView): void {
    this.ensureViewsDirectory();

    const filePath = this.getViewFilePath(repositoryRootPath, view.id);

    // Auto-assign displayOrder if not provided
    let displayOrder = view.displayOrder;
    if (displayOrder === undefined || displayOrder === null) {
      displayOrder = this.getNextDisplayOrder(repositoryRootPath, view.category || 'other');
    }

    // Add defaults for required fields if not present
    const viewToSave = {
      ...view,
      version: view.version || '1.0.0', // Default to 1.0.0 if not specified
      timestamp: view.timestamp || new Date().toISOString(),
      displayOrder,
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
    const viewsDir = this.getViewsDirectory();

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

    // Sort by category first, then by displayOrder, then by name as fallback
    return views.sort((a, b) => {
      const catA = a.category || 'other';
      const catB = b.category || 'other';

      if (catA !== catB) {
        return catA.localeCompare(catB);
      }

      const orderA = a.displayOrder ?? 999999;
      const orderB = b.displayOrder ?? 999999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.name.localeCompare(b.name);
    });
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

    // If category changed but displayOrder wasn't provided, recalculate it
    let displayOrder = updates.displayOrder;
    if (
      updates.category &&
      updates.category !== existingView.category &&
      displayOrder === undefined
    ) {
      displayOrder = this.getNextDisplayOrder(repositoryRootPath, updates.category);
    }

    const updatedView: CodebaseView = {
      ...existingView,
      ...updates,
      id: viewId, // Ensure ID cannot be changed
      timestamp: new Date().toISOString(),
    };

    if (displayOrder !== undefined) {
      updatedView.displayOrder = displayOrder;
    }

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
