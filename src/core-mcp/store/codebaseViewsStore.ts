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
 * Links between codebase views.
 * Key is the target view ID, value is a descriptive label for the link.
 */
export type CodebaseViewLinks = Record<string, string>;

/**
 * A cell in the grid that contains files matching specific patterns.
 * Each cell represents a logical grouping of related files in the codebase.
 */
export interface CodebaseViewFileCell {
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
   * Links to other views from this cell.
   * Enables navigation between related views.
   */
  links?: CodebaseViewLinks;

  /**
   * Official metadata with strict types for common visualization needs
   */
  metadata?: {
    /** UI configuration for this cell */
    ui?: {
      /** Color for highlighting this cell */
      color?: string;
    };
  };

  /** Experimental metadata for this cell */
  experimentalMetadata?: Record<string, unknown>;
}

/**
 * Scope configuration for filtering the file tree before grid layout.
 * Allows focusing on specific parts of the repository.
 */
export interface CodebaseViewScope {
  /**
   * Base path within the repository to scope the view to.
   * Relative to the repository root (e.g., 'src/frontend', not '/src/frontend').
   */
  basePath?: string;

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
   * Required for all views to ensure proper display.
   */
  name: string;

  /**
   * Description of what this view represents.
   * Helps users understand the organizational principle.
   */
  description?: string;

  /**
   * Number of rows in the grid.
   * If not specified, computed from maximum row coordinate in cells.
   * Recommended: 1-6 for optimal visualization.
   */
  rows?: number;

  /**
   * Number of columns in the grid.
   * If not specified, computed from maximum column coordinate in cells.
   * Recommended: 1-6 for optimal visualization.
   */
  cols?: number;

  /**
   * Cell configurations mapped by cell name/identifier.
   * Each entry defines what files belong in that cell.
   */
  cells: Record<string, CodebaseViewFileCell>;

  /**
   * Links to other views from this view.
   * Enables navigation between related views at the view level.
   */
  links?: CodebaseViewLinks;

  /**
   * Path to markdown documentation file.
   * Relative to repository root.
   */
  overviewPath?: string;

  /**
   * Optional scope filtering before grid layout.
   */
  scope?: CodebaseViewScope;

  /**
   * Creation/modification timestamp.
   */
  timestamp?: string;

  /**
   * Official metadata with strict types for common visualization needs
   */
  metadata?: {
    /** UI configuration for visualization/rendering */
    ui?: {
      /** Whether grid layout is enabled */
      enabled: boolean;
      /** Number of rows in the grid */
      rows?: number;
      /** Number of columns in the grid */
      cols?: number;
      /** Padding between cells in pixels */
      cellPadding?: number;
      /** Whether to show labels for grid cells */
      showCellLabels?: boolean;
      /** Position of cell labels relative to the cell */
      cellLabelPosition?: 'none' | 'top' | 'bottom';
      /** Height of cell labels as percentage of cell height (0-1) */
      cellLabelHeightPercent?: number;
    };
  };

  /**
   * Experimental metadata for extensions and future features.
   * Use this for testing new features before they become official.
   * No type guarantees - contents may change.
   */
  experimentalMetadata?: Record<string, unknown>;
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
        // Compute dimensions if not specified
        const dimensions =
          view.rows !== undefined && view.cols !== undefined
            ? { rows: view.rows, cols: view.cols }
            : computeGridDimensions(view.cells);

        summaries.push({
          id: view.id,
          name: view.name,
          description: view.description,
          rows: dimensions.rows,
          cols: dimensions.cols,
          cellCount: Object.keys(view.cells).length,
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
