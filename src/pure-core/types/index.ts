/**
 * Pure TypeScript types for a24z-memory
 * These types have no dependencies and can be used in any JavaScript environment
 */

// ============================================================================
// Path Validation Types
// ============================================================================

/**
 * A branded type for repository paths that have been validated.
 * This ensures only properly validated paths are used in data operations.
 */
export type ValidatedRepositoryPath = string & { readonly __brand: 'ValidatedRepositoryPath' };

/**
 * A branded type for relative paths that have been validated to be within a repository.
 * These paths are always relative to the repository root, without './' prefix.
 */
export type ValidatedRelativePath = string & { readonly __brand: 'ValidatedRelativePath' };

// ============================================================================
// CodebaseView Types
// ============================================================================

/**
 * Links between codebase views.
 * Key is the target view ID, value is a descriptive label for the link.
 */
export type CodebaseViewLinks = Record<string, string>;

/**
 * Base type for all codebase view cells.
 * Contains common properties shared by all cell types.
 */
export interface CodebaseViewCell {
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
 * A cell that contains an explicit list of files.
 * Each cell represents a logical grouping of related files in the codebase.
 */
export interface CodebaseViewFileCell extends CodebaseViewCell {
  /**
   * List of file paths (relative to repository root).
   * Examples: 'src/index.ts', 'README.md', 'package.json'
   * No glob patterns or directories - just explicit file paths.
   */
  files: string[];
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
  description: string;

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
  overviewPath: string;

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
    /** How this view was created - used for cleanup and management */
    generationType?: 'user' | 'session';

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
 * Result of file list validation operations.
 */
export interface FileListValidationResult {
  valid: boolean;
  existingFiles: string[];
  missingFiles: string[];
  conflicts?: Array<{
    path: string;
    cells: string[];
  }>;
}

// ============================================================================
// Note Types
// ============================================================================

/**
 * A note stored in the a24z-memory system with anchors to specific files/directories
 */
export interface StoredAnchoredNote {
  id: string;
  note: string;
  anchors: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  timestamp: number;
  reviewed?: boolean;
  codebaseViewId: string; // Required CodebaseView identifier
  cellCoordinates?: [number, number]; // Optional - computed dynamically via anchor-to-cell pattern matching
}

/**
 * A note with its storage path information
 */
export interface AnchoredNoteWithPath {
  note: StoredAnchoredNote;
  path: string; // File system path where this note is stored (relative to repository root)
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface MemoryPalaceConfiguration {
  version: number;
  limits: {
    noteMaxLength: number;
    maxTagsPerNote: number;
    maxAnchorsPerNote: number;
    tagDescriptionMaxLength: number;
  };
  storage: {
    compressionEnabled: boolean;
  };
  tags?: {
    enforceAllowedTags?: boolean;
  };
  enabled_mcp_tools?: {
    create_repository_note?: boolean;
    get_notes?: boolean;
    get_repository_tags?: boolean;
    get_repository_types?: boolean;
    get_repository_guidance?: boolean;
    delete_repository_note?: boolean;
    get_repository_note?: boolean;
    get_stale_notes?: boolean;
    get_tag_usage?: boolean;
    delete_tag?: boolean;
    replace_tag?: boolean;
    get_note_coverage?: boolean;
    list_codebase_views?: boolean;
  };
}
