/**
 * CodebaseView Storage and Types
 *
 * This module defines the types and storage mechanisms for CodebaseView configurations,
 * which organize repository files into spatial grid layouts. Notes can be associated
 * with specific views and cells, creating a "memory palace" for knowledge organization.
 *
 * Views are stored in .a24z/views/ directory alongside other a24z-memory data.
 */

import * as fs from 'fs';
import * as path from 'path';
import { normalizeRepositoryPath } from '../../node-adapters/NodeFileSystemAdapter';
import {
  CodebaseView,
  CodebaseViewFileCell,
  CodebaseViewScope,
  CodebaseViewLinks,
  ViewValidationResult,
  PatternValidationResult
} from '../../pure-core/types';

// Re-export the types for backward compatibility
export {
  CodebaseView,
  CodebaseViewFileCell,
  CodebaseViewScope,
  CodebaseViewLinks,
  ViewValidationResult,
  PatternValidationResult
};

/**
 * Compute grid dimensions from cell coordinates.
 * Returns the minimum grid size needed to contain all cells.
 */
export function computeGridDimensions(cells: Record<string, CodebaseViewFileCell>): {
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
 * Storage class for managing CodebaseView configurations.
 */
export class CodebaseViewsStore {
  /**
   * Get the directory where view configurations are stored.
   * Views are stored in .a24z/views/ for consistency with other a24z data.
   */
  private getViewsDirectory(repositoryPath: string): string {
    const normalizedRepo = normalizeRepositoryPath(repositoryPath);
    return path.join(normalizedRepo, '.a24z', 'views');
  }

  /**
   * Ensure the views directory exists.
   */
  private ensureViewsDirectory(repositoryPath: string): void {
    const viewsDir = this.getViewsDirectory(repositoryPath);
    if (!fs.existsSync(viewsDir)) {
      fs.mkdirSync(viewsDir, { recursive: true });
    }
  }

  /**
   * Save a view configuration to disk.
   */
  saveView(repositoryPath: string, view: CodebaseView): void {
    this.ensureViewsDirectory(repositoryPath);

    const filePath = path.join(this.getViewsDirectory(repositoryPath), `${view.id}.json`);

    // Add timestamp if not present
    if (!view.timestamp) {
      view.timestamp = new Date().toISOString();
    }

    fs.writeFileSync(filePath, JSON.stringify(view, null, 2), 'utf8');
  }

  /**
   * Retrieve a view configuration by ID.
   */
  getView(repositoryPath: string, viewId: string): CodebaseView | null {
    const filePath = path.join(this.getViewsDirectory(repositoryPath), `${viewId}.json`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content) as CodebaseView;
    } catch (error) {
      console.error(`Error reading view ${viewId}:`, error);
      return null;
    }
  }

  /**
   * List all available views in a repository.
   */
  listViews(repositoryPath: string): CodebaseView[] {
    const viewsDir = this.getViewsDirectory(repositoryPath);

    if (!fs.existsSync(viewsDir)) {
      return [];
    }

    const files = fs.readdirSync(viewsDir).filter((f) => f.endsWith('.json'));
    const views: CodebaseView[] = [];

    for (const file of files) {
      const viewId = path.basename(file, '.json');
      const view = this.getView(repositoryPath, viewId);

      if (view) {
        views.push(view);
      }
    }

    return views.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Delete a view configuration.
   */
  deleteView(repositoryPath: string, viewId: string): boolean {
    const filePath = path.join(this.getViewsDirectory(repositoryPath), `${viewId}.json`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }

    return false;
  }

  /**
   * Update an existing view configuration.
   */
  updateView(repositoryPath: string, viewId: string, updates: Partial<CodebaseView>): boolean {
    const existingView = this.getView(repositoryPath, viewId);

    if (!existingView) {
      return false;
    }

    const updatedView: CodebaseView = {
      ...existingView,
      ...updates,
      id: viewId, // Ensure ID cannot be changed
      timestamp: new Date().toISOString(),
    };

    this.saveView(repositoryPath, updatedView);
    return true;
  }

  /**
   * Check if a view exists.
   */
  viewExists(repositoryPath: string, viewId: string): boolean {
    const filePath = path.join(this.getViewsDirectory(repositoryPath), `${viewId}.json`);
    return fs.existsSync(filePath);
  }

  /**
   * Get the default view for a repository, if it exists.
   */
  getDefaultView(repositoryPath: string): CodebaseView | null {
    return this.getView(repositoryPath, 'default');
  }

  /**
   * Set a view as the default view.
   */
  setDefaultView(repositoryPath: string, viewId: string): boolean {
    const view = this.getView(repositoryPath, viewId);
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

    this.saveView(repositoryPath, defaultView);
    return true;
  }
}

// Export a singleton instance
export const codebaseViewsStore = new CodebaseViewsStore();

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
