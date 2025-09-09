/**
 * CodebaseView Validation - Platform-agnostic validation logic
 *
 * This module provides essential validation for CodebaseView objects,
 * focusing on required fields and file path validation.
 */

import { FileSystemAdapter } from '../abstractions/filesystem';
import { CodebaseView, ValidatedRepositoryPath } from '../types';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  /** Severity level of the issue */
  severity: ValidationSeverity;
  /** Type/category of the issue for programmatic handling */
  type: string;
  /** Human-readable message describing the issue */
  message: string;
  /** Path or location where the issue was found */
  location?: string;
  /** Additional context or suggested fixes */
  context?: string;
}

export interface ValidationResult {
  /** Whether the view passed validation (no errors) */
  isValid: boolean;
  /** All validation issues found */
  issues: ValidationIssue[];
  /** The validated view, potentially with modifications (like scope removal) */
  validatedView: CodebaseView;
  /** Summary counts by severity */
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  /** Validation details about displayOrder */
  displayOrderInfo?: {
    current: number | undefined;
    category: string;
    suggestedNext?: number;
  };
}

/**
 * Validates CodebaseView objects for required fields and file existence
 */
export class CodebaseViewValidator {
  private fs: FileSystemAdapter;

  constructor(fileSystemAdapter: FileSystemAdapter) {
    this.fs = fileSystemAdapter;
  }

  /**
   * Validate a CodebaseView for essential requirements
   */
  validate(repositoryPath: ValidatedRepositoryPath, view: CodebaseView): ValidationResult {
    const issues: ValidationIssue[] = [];
    let validatedView = { ...view };

    // Required field validation
    this.validateRequiredFields(validatedView, issues);

    // File path validation
    this.validateFilePaths(repositoryPath, validatedView, issues);

    // Scope validation and cleanup
    validatedView = this.validateAndCleanScope(repositoryPath, validatedView, issues);

    // Calculate summary
    const summary = {
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      info: issues.filter((i) => i.severity === 'info').length,
    };

    // Prepare displayOrder information
    const displayOrderInfo = {
      current: validatedView.displayOrder,
      category: validatedView.category || 'other',
      suggestedNext: undefined as number | undefined,
    };

    // If displayOrder is missing, calculate suggested next value
    if (displayOrderInfo.current === undefined || displayOrderInfo.current === null) {
      // Get all views in the same category to calculate next order
      const viewsDir = this.fs.join(repositoryPath, '.a24z', 'views');
      if (this.fs.exists(viewsDir)) {
        const files = this.fs.readDir(viewsDir).filter((f) => f.endsWith('.json'));
        let maxOrder = -1;

        for (const file of files) {
          try {
            const content = this.fs.readFile(this.fs.join(viewsDir, file));
            const otherView = JSON.parse(content) as CodebaseView;
            if ((otherView.category || 'other') === displayOrderInfo.category) {
              maxOrder = Math.max(maxOrder, otherView.displayOrder || 0);
            }
          } catch {
            // Ignore parse errors
          }
        }

        displayOrderInfo.suggestedNext = maxOrder + 1;
      } else {
        displayOrderInfo.suggestedNext = 0;
      }
    }

    return {
      isValid: summary.errors === 0,
      issues,
      validatedView,
      summary,
      displayOrderInfo,
    };
  }

  /**
   * Validate required fields are present and have correct types
   */
  private validateRequiredFields(view: CodebaseView, issues: ValidationIssue[]): void {
    // ID is required
    if (!view.id || typeof view.id !== 'string') {
      issues.push({
        severity: 'error',
        type: 'missing_required_field',
        message: 'View must have a valid string ID',
        location: 'view.id',
      });
    }

    // Name is required
    if (!view.name || typeof view.name !== 'string') {
      issues.push({
        severity: 'error',
        type: 'missing_required_field',
        message: 'View must have a valid string name',
        location: 'view.name',
      });
    }

    // Version is optional - we'll add default if missing
    if (view.version && typeof view.version !== 'string') {
      issues.push({
        severity: 'error',
        type: 'invalid_field_type',
        message: 'View version must be a string if provided',
        location: 'view.version',
      });
    }

    // Description is required
    if (!view.description || typeof view.description !== 'string') {
      issues.push({
        severity: 'error',
        type: 'missing_required_field',
        message: 'View must have a description',
        location: 'view.description',
      });
    }

    // OverviewPath is required
    if (!view.overviewPath || typeof view.overviewPath !== 'string') {
      issues.push({
        severity: 'error',
        type: 'missing_required_field',
        message: 'View must have an overviewPath',
        location: 'view.overviewPath',
      });
    }

    // DisplayOrder is required
    if (
      view.displayOrder === undefined ||
      view.displayOrder === null ||
      typeof view.displayOrder !== 'number'
    ) {
      issues.push({
        severity: 'error',
        type: 'missing_required_field',
        message: 'View must have a displayOrder number',
        location: 'view.displayOrder',
        context: 'The displayOrder field determines the ordering within a category',
      });
    }

    // Cells is required and must be an object
    if (!view.cells || typeof view.cells !== 'object') {
      issues.push({
        severity: 'error',
        type: 'missing_required_field',
        message: 'View must have cells object',
        location: 'view.cells',
      });
      return; // Can't continue validating cells
    }

    // Validate basic cell structure
    Object.entries(view.cells).forEach(([cellName, cell]) => {
      const location = `view.cells.${cellName}`;

      // Cell must have coordinates
      if (!cell.coordinates || !Array.isArray(cell.coordinates) || cell.coordinates.length !== 2) {
        issues.push({
          severity: 'error',
          type: 'invalid_cell_coordinates',
          message: 'Cell must have coordinates array with [row, col]',
          location: `${location}.coordinates`,
        });
      }

      // Cell must have files array
      if (!cell.files || !Array.isArray(cell.files)) {
        issues.push({
          severity: 'error',
          type: 'missing_cell_files',
          message: 'Cell must have files array',
          location: `${location}.files`,
        });
      } else {
        // Validate file paths are strings and relative
        cell.files.forEach((filePath, index) => {
          if (typeof filePath !== 'string') {
            issues.push({
              severity: 'error',
              type: 'invalid_file_path',
              message: 'File path must be a string',
              location: `${location}.files[${index}]`,
            });
          } else if (filePath.startsWith('/')) {
            issues.push({
              severity: 'error',
              type: 'absolute_file_path',
              message: 'File paths must be relative to repository root',
              location: `${location}.files[${index}]`,
              context: `Found: "${filePath}"`,
            });
          }
        });
      }
    });

    // Validate timestamp format if present
    if (view.timestamp) {
      const parsedDate = new Date(view.timestamp);
      if (isNaN(parsedDate.getTime())) {
        issues.push({
          severity: 'warning',
          type: 'invalid_timestamp',
          message: 'View timestamp is not a valid ISO date string',
          location: 'view.timestamp',
        });
      }
    }
  }

  /**
   * Validate that referenced files exist in the repository
   */
  private validateFilePaths(
    repositoryPath: ValidatedRepositoryPath,
    view: CodebaseView,
    issues: ValidationIssue[]
  ): void {
    // Check overview file exists
    if (view.overviewPath && typeof view.overviewPath === 'string') {
      const overviewFullPath = this.fs.join(repositoryPath, view.overviewPath);
      if (!this.fs.exists(overviewFullPath)) {
        issues.push({
          severity: 'warning',
          type: 'missing_overview_file',
          message: `Overview file not found: ${view.overviewPath}`,
          location: 'view.overviewPath',
          context: "The overview file will be created if it doesn't exist",
        });
      }
    }

    // Check files in cells exist
    if (view.cells && typeof view.cells === 'object') {
      Object.entries(view.cells).forEach(([cellName, cell]) => {
        if (cell.files && Array.isArray(cell.files)) {
          cell.files.forEach((filePath, index) => {
            if (typeof filePath === 'string' && !filePath.startsWith('/')) {
              const fullPath = this.fs.join(repositoryPath, filePath);
              if (!this.fs.exists(fullPath)) {
                issues.push({
                  severity: 'warning',
                  type: 'missing_cell_file',
                  message: `File not found: ${filePath}`,
                  location: `view.cells.${cellName}.files[${index}]`,
                  context: 'Missing files will not appear in the visualization',
                });
              }
            }
          });
        }
      });
    }
  }

  /**
   * Validate scope against cell contents and remove if violations found
   */
  private validateAndCleanScope(
    repositoryPath: ValidatedRepositoryPath,
    view: CodebaseView,
    issues: ValidationIssue[]
  ): CodebaseView {
    if (!view.scope?.basePath) {
      return view; // No scope to validate
    }

    const scopeBasePath = view.scope.basePath;
    const violatingFiles: string[] = [];

    // Check if scope base path exists
    const scopePath = this.fs.join(repositoryPath, scopeBasePath);
    if (!this.fs.exists(scopePath)) {
      issues.push({
        severity: 'warning',
        type: 'scope_removed_missing_path',
        message: `Scope removed: base path not found: ${scopeBasePath}`,
        location: 'view.scope',
        context: 'Scope will be regenerated based on cell contents',
      });

      // Remove scope
      const viewWithoutScope = { ...view };
      delete viewWithoutScope.scope;
      return viewWithoutScope;
    }

    // Check if any cell files violate the scope
    if (view.cells && typeof view.cells === 'object') {
      Object.entries(view.cells).forEach(([cellName, cell]) => {
        if (cell.files && Array.isArray(cell.files)) {
          cell.files.forEach((filePath) => {
            if (typeof filePath === 'string' && !filePath.startsWith('/')) {
              // Check if file is within scope
              if (!filePath.startsWith(scopeBasePath + '/') && filePath !== scopeBasePath) {
                violatingFiles.push(`${cellName}: ${filePath}`);
              }
            }
          });
        }
      });
    }

    if (violatingFiles.length > 0) {
      issues.push({
        severity: 'info',
        type: 'scope_removed_violations',
        message: `Scope removed: ${violatingFiles.length} files outside scope "${scopeBasePath}"`,
        location: 'view.scope',
        context: `Violating files: ${violatingFiles.join(', ')}. Scope will be regenerated based on cell contents.`,
      });

      // Remove scope
      const viewWithoutScope = { ...view };
      delete viewWithoutScope.scope;
      return viewWithoutScope;
    }

    return view; // Scope is valid
  }
}
