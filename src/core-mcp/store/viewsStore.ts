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
import { normalizeRepositoryPath } from '../utils/pathNormalization';

/**
 * A cell in the grid that contains files matching specific patterns.
 * Each cell represents a logical grouping of related files in the codebase.
 */
export interface ViewFileCell {
  /**
   * List of file/directory patterns to match using glob syntax.
   * Examples: 'src/**', '*.md', 'package.json'
   */
  patterns: string[];

  /**
   * Position in the grid as [row, column].
   * Zero-indexed coordinates.
   */
  coordinates: [number, number];

  /**
   * Priority for resolving conflicts when files match multiple cells.
   * Higher values take precedence. Default: 0
   */
  priority?: number;

  /**
   * Display label for the cell.
   * Used in visualizations and UI.
   */
  label?: string;

  /**
   * Hex color for visualization.
   * Example: '#667eea'
   */
  color?: string;

  /**
   * Optional link to another view ID.
   * Enables navigation between related views.
   */
  linkedMapId?: string;

  /**
   * Tooltip or description for the linked view.
   */
  linkLabel?: string;

  /**
   * Custom metadata for extensibility.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Scope configuration for filtering the file tree before grid layout.
 * Allows focusing on specific parts of the repository.
 */
export interface ViewScope {
  /**
   * Root path to focus on within the repository.
   * Example: '/src/frontend'
   */
  rootPath?: string;

  /**
   * Patterns for files to include.
   * Only files matching these patterns will be considered.
   */
  includePatterns?: string[];

  /**
   * Patterns for files to exclude.
   * Files matching these patterns will be filtered out.
   */
  excludePatterns?: string[];
}

/**
 * Complete configuration for a grid-based spatial layout of a codebase.
 */
export interface CodebaseView {
  /**
   * Unique identifier for this view.
   * Used for referencing and storage.
   */
  id: string;

  /**
   * Version of the configuration format.
   * Helps with migration and compatibility.
   */
  version: string;

  /**
   * Human-readable name for the view.
   */
  name?: string;

  /**
   * Description of what this view represents.
   * Helps users understand the organizational principle.
   */
  description?: string;

  /**
   * Whether this grid layout is active.
   */
  enabled: boolean;

  /**
   * Number of rows in the grid.
   * Recommended: 1-6 for optimal visualization.
   */
  rows: number;

  /**
   * Number of columns in the grid.
   * Recommended: 1-6 for optimal visualization.
   */
  cols: number;

  /**
   * Cell configurations mapped by cell name/identifier.
   * Each entry defines what files belong in that cell.
   */
  cells: Record<string, ViewFileCell>;

  /**
   * Path to markdown documentation file.
   * Relative to repository root.
   */
  overviewPath?: string;

  /**
   * Optional scope filtering before grid layout.
   */
  scope?: ViewScope;

  /**
   * Space between cells in pixels for visualization.
   */
  cellPadding?: number;

  /**
   * Whether to display cell labels.
   */
  showCellLabels?: boolean;

  /**
   * Position of cell labels in visualization.
   */
  cellLabelPosition?: 'top' | 'bottom' | 'none';

  /**
   * Height of label area in pixels.
   */
  cellLabelHeight?: number;

  /**
   * Height of label area as percentage of cell height.
   * Default: 0.1 (10%)
   */
  cellLabelHeightPercent?: number;

  /**
   * Repository identifier this view belongs to.
   */
  repository?: string;

  /**
   * Creation/modification timestamp.
   */
  timestamp?: string;

  /**
   * Where to place files that don't match any cell patterns.
   */
  unassignedCell?: [number, number];

  /**
   * Strategy for handling unmatched files.
   */
  unassignedStrategy?: 'single-cell' | 'distribute' | 'hide';
}

/**
 * Lightweight summary of a view for listing operations.
 */
export interface ViewSummary {
  id: string;
  name: string;
  description?: string;
  rows: number;
  cols: number;
  cellCount: number;
  enabled: boolean;
  timestamp?: string;
}

/**
 * Result of view validation operations.
 */
export interface ViewValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

/**
 * Result of pattern validation operations.
 */
export interface PatternValidationResult {
  valid: boolean;
  matchedPaths: string[];
  unmatchedPatterns: string[];
  conflicts?: Array<{
    path: string;
    patterns: string[];
    cells: string[];
  }>;
}

/**
 * Storage class for managing CodebaseView configurations.
 */
export class ViewsStore {
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
  listViews(repositoryPath: string): ViewSummary[] {
    const viewsDir = this.getViewsDirectory(repositoryPath);

    if (!fs.existsSync(viewsDir)) {
      return [];
    }

    const files = fs.readdirSync(viewsDir).filter((f) => f.endsWith('.json'));
    const summaries: ViewSummary[] = [];

    for (const file of files) {
      const viewId = path.basename(file, '.json');
      const view = this.getView(repositoryPath, viewId);

      if (view) {
        summaries.push({
          id: view.id,
          name: view.name || view.id,
          description: view.description,
          rows: view.rows,
          cols: view.cols,
          cellCount: Object.keys(view.cells).length,
          enabled: view.enabled,
          timestamp: view.timestamp,
        });
      }
    }

    return summaries.sort((a, b) => a.name.localeCompare(b.name));
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
      name: view.name || 'Default View',
      description: view.description || `Default view based on ${viewId}`,
    };

    this.saveView(repositoryPath, defaultView);
    return true;
  }
}

// Export a singleton instance
export const viewsStore = new ViewsStore();
