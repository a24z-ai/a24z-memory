/**
 * Core validation functions for CodebaseView configurations
 *
 * These functions provide validation without external dependencies,
 * focusing on structure, patterns, and logical consistency.
 */

import {
  CodebaseView,
  CodebaseViewFileCell,
  ViewValidationResult,
  PatternValidationResult,
  computeGridDimensions,
} from '../store/codebaseViewsStore';

/**
 * Validate a single CodebaseViewFileCell configuration
 */
export function validateCodebaseViewFileCell(
  cell: CodebaseViewFileCell,
  cellName: string
): ViewValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Required fields
  if (!cell.patterns || !Array.isArray(cell.patterns)) {
    errors.push(`Cell "${cellName}": patterns is required and must be an array`);
  } else if (cell.patterns.length === 0) {
    errors.push(`Cell "${cellName}": patterns array cannot be empty`);
  } else {
    // Validate individual patterns
    cell.patterns.forEach((pattern, index) => {
      if (typeof pattern !== 'string') {
        errors.push(`Cell "${cellName}": pattern at index ${index} must be a string`);
      } else if (pattern.trim() === '') {
        errors.push(`Cell "${cellName}": pattern at index ${index} cannot be empty`);
      }
    });
  }

  if (!cell.coordinates || !Array.isArray(cell.coordinates) || cell.coordinates.length !== 2) {
    errors.push(`Cell "${cellName}": coordinates must be an array of two numbers [row, col]`);
  } else {
    const [row, col] = cell.coordinates;
    if (typeof row !== 'number' || typeof col !== 'number') {
      errors.push(`Cell "${cellName}": coordinates must contain numbers`);
    } else if (row < 0 || col < 0) {
      errors.push(`Cell "${cellName}": coordinates cannot be negative`);
    } else if (!Number.isInteger(row) || !Number.isInteger(col)) {
      errors.push(`Cell "${cellName}": coordinates must be integers`);
    }
  }

  // Optional field validation
  if (cell.priority !== undefined) {
    if (typeof cell.priority !== 'number') {
      errors.push(`Cell "${cellName}": priority must be a number`);
    } else if (!Number.isInteger(cell.priority)) {
      warnings.push(`Cell "${cellName}": priority should typically be an integer`);
    }
  }

  if (cell.links !== undefined) {
    if (typeof cell.links !== 'object' || cell.links === null || Array.isArray(cell.links)) {
      errors.push(`Cell "${cellName}": links must be an object`);
    } else {
      // Validate each link
      for (const [viewId, label] of Object.entries(cell.links)) {
        if (typeof label !== 'string') {
          errors.push(`Cell "${cellName}": link label for view "${viewId}" must be a string`);
        }
        if (viewId.trim() === '') {
          errors.push(`Cell "${cellName}": link view ID cannot be empty`);
        }
      }
    }
  }

  if (cell.metadata !== undefined) {
    if (
      typeof cell.metadata !== 'object' ||
      cell.metadata === null ||
      Array.isArray(cell.metadata)
    ) {
      errors.push(`Cell "${cellName}": metadata must be an object`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Validate a complete CodebaseView configuration
 */
export function validateCodebaseView(view: CodebaseView): ViewValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Required fields
  if (!view.id || typeof view.id !== 'string') {
    errors.push('id is required and must be a non-empty string');
  } else if (view.id.trim() === '') {
    errors.push('id cannot be empty or whitespace');
  } else if (!/^[a-zA-Z0-9\-_]+$/.test(view.id)) {
    warnings.push('id should contain only letters, numbers, hyphens, and underscores');
  }

  if (!view.version || typeof view.version !== 'string') {
    errors.push('version is required and must be a string');
  }

  // Validate rows if provided
  if (view.rows !== undefined) {
    if (typeof view.rows !== 'number' || !Number.isInteger(view.rows) || view.rows < 1) {
      errors.push('rows must be a positive integer');
    } else if (view.rows > 6) {
      warnings.push('rows > 6 may not display well in visualizations');
    }
  }

  // Validate cols if provided
  if (view.cols !== undefined) {
    if (typeof view.cols !== 'number' || !Number.isInteger(view.cols) || view.cols < 1) {
      errors.push('cols must be a positive integer');
    } else if (view.cols > 6) {
      warnings.push('cols > 6 may not display well in visualizations');
    }
  }

  if (!view.cells || typeof view.cells !== 'object' || Array.isArray(view.cells)) {
    errors.push('cells must be an object');
  } else if (Object.keys(view.cells).length === 0) {
    warnings.push('view has no cells defined - it will be empty');
  }

  // Optional field validation
  if (view.name !== undefined && typeof view.name !== 'string') {
    errors.push('name must be a string');
  }

  if (view.description !== undefined && typeof view.description !== 'string') {
    errors.push('description must be a string');
  }

  if (typeof view.overviewPath !== 'string') {
    errors.push('overviewPath is required and must be a string');
  }

  if (view.links !== undefined) {
    if (typeof view.links !== 'object' || view.links === null || Array.isArray(view.links)) {
      errors.push('links must be an object');
    } else {
      // Validate each link
      for (const [viewId, label] of Object.entries(view.links)) {
        if (typeof label !== 'string') {
          errors.push(`Link label for view "${viewId}" must be a string`);
        }
        if (viewId.trim() === '') {
          errors.push('Link view ID cannot be empty');
        }
      }
    }
  }

  if (view.timestamp !== undefined && typeof view.timestamp !== 'string') {
    errors.push('timestamp must be a string');
  }

  // Validate individual cells
  if (view.cells && typeof view.cells === 'object') {
    for (const [cellName, cell] of Object.entries(view.cells)) {
      const cellValidation = validateCodebaseViewFileCell(cell, cellName);
      errors.push(...cellValidation.errors);
      warnings.push(...cellValidation.warnings);
      if (cellValidation.suggestions) {
        suggestions.push(...cellValidation.suggestions);
      }
    }
  }

  // Grid dimension validation
  if (view.cells && Object.keys(view.cells).length > 0) {
    const gridValidation = validateGridDimensions(view);
    errors.push(...gridValidation.errors);
    warnings.push(...gridValidation.warnings);
    if (gridValidation.suggestions) {
      suggestions.push(...gridValidation.suggestions);
    }
  }

  // Pattern conflict detection
  if (view.cells) {
    const conflictValidation = detectPatternConflicts(view.cells);
    if (conflictValidation.conflicts && conflictValidation.conflicts.length > 0) {
      warnings.push(`Found ${conflictValidation.conflicts.length} pattern conflicts between cells`);
      suggestions.push('Consider using priority values to resolve pattern conflicts');
    }
  }

  // Suggestions
  if (!view.name) {
    suggestions.push('Consider adding a name for better identification');
  }

  if (!view.description) {
    suggestions.push("Consider adding a description to explain the view's purpose");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Validate glob patterns for syntax and common issues
 */
export function validatePatterns(patterns: string[]): ViewValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!patterns || !Array.isArray(patterns)) {
    errors.push('patterns must be an array');
    return { valid: false, errors, warnings, suggestions };
  }

  patterns.forEach((pattern, index) => {
    if (typeof pattern !== 'string') {
      errors.push(`Pattern at index ${index}: must be a string`);
      return;
    }

    if (pattern.trim() === '') {
      errors.push(`Pattern at index ${index}: cannot be empty`);
      return;
    }

    // Check for common issues
    if (pattern.includes('//')) {
      warnings.push(
        `Pattern "${pattern}": contains double slashes which may not match as expected`
      );
    }

    if (pattern.startsWith('/')) {
      suggestions.push(
        `Pattern "${pattern}": starts with slash - consider if this is intentional for absolute paths`
      );
    }

    if (pattern.includes('\\')) {
      warnings.push(
        `Pattern "${pattern}": contains backslashes - use forward slashes for cross-platform compatibility`
      );
    }

    // Check for potentially problematic patterns
    if (pattern === '**') {
      warnings.push(`Pattern "${pattern}": matches all files - this may cause performance issues`);
    }

    if (pattern.includes('**/**')) {
      suggestions.push(`Pattern "${pattern}": contains redundant globstar - consider simplifying`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Validate that grid dimensions accommodate all cell coordinates
 */
export function validateGridDimensions(view: CodebaseView): ViewValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const { cells } = view;

  // Use provided dimensions or compute from cells
  const dimensions =
    view.rows !== undefined && view.cols !== undefined
      ? { rows: view.rows, cols: view.cols }
      : computeGridDimensions(cells);

  const { rows, cols } = dimensions;

  for (const [cellName, cell] of Object.entries(cells)) {
    const [row, col] = cell.coordinates;

    if (row >= rows) {
      errors.push(`Cell "${cellName}": row ${row} exceeds grid rows (${rows})`);
    }

    if (col >= cols) {
      errors.push(`Cell "${cellName}": column ${col} exceeds grid columns (${cols})`);
    }
  }

  // Check for empty grid positions
  const occupiedPositions = new Set<string>();
  const duplicatePositions: string[] = [];

  for (const [, cell] of Object.entries(cells)) {
    const [row, col] = cell.coordinates;
    const positionKey = `${row},${col}`;

    if (occupiedPositions.has(positionKey)) {
      duplicatePositions.push(`Position [${row}, ${col}] occupied by multiple cells`);
    } else {
      occupiedPositions.add(positionKey);
    }
  }

  if (duplicatePositions.length > 0) {
    warnings.push(...duplicatePositions);
    suggestions.push('Consider using priority values to resolve position conflicts');
  }

  // Calculate grid utilization
  const totalCells = rows * cols;
  const usedCells = occupiedPositions.size;
  const utilizationPercent = Math.round((usedCells / totalCells) * 100);

  if (utilizationPercent < 30) {
    suggestions.push(
      `Grid utilization is low (${utilizationPercent}%) - consider reducing grid size`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Detect conflicts between cell patterns
 */
export function detectPatternConflicts(
  cells: Record<string, CodebaseViewFileCell>
): PatternValidationResult {
  const conflicts: Array<{
    path: string;
    patterns: string[];
    cells: string[];
  }> = [];

  // This is a simplified conflict detection
  // In practice, you'd want to use actual file system matching
  const cellPatterns: Array<{ cellName: string; patterns: string[]; priority: number }> = [];

  for (const [cellName, cell] of Object.entries(cells)) {
    cellPatterns.push({
      cellName,
      patterns: cell.patterns,
      priority: cell.priority || 0,
    });
  }

  // Check for obvious pattern overlaps
  for (let i = 0; i < cellPatterns.length; i++) {
    for (let j = i + 1; j < cellPatterns.length; j++) {
      const cell1 = cellPatterns[i];
      const cell2 = cellPatterns[j];

      for (const pattern1 of cell1.patterns) {
        for (const pattern2 of cell2.patterns) {
          if (patternsOverlap(pattern1, pattern2)) {
            conflicts.push({
              path: `${pattern1} / ${pattern2}`,
              patterns: [pattern1, pattern2],
              cells: [cell1.cellName, cell2.cellName],
            });
          }
        }
      }
    }
  }

  return {
    valid: conflicts.length === 0,
    matchedPaths: [],
    unmatchedPatterns: [],
    conflicts,
  };
}

/**
 * Simple pattern overlap detection
 * This is a basic implementation - more sophisticated matching would require glob library
 */
function patternsOverlap(pattern1: string, pattern2: string): boolean {
  // Exact match
  if (pattern1 === pattern2) {
    return true;
  }

  // One pattern contains the other
  if (pattern1.includes(pattern2) || pattern2.includes(pattern1)) {
    return true;
  }

  // Both use wildcards and have same base
  if (pattern1.includes('*') && pattern2.includes('*')) {
    const base1 = pattern1.split('*')[0];
    const base2 = pattern2.split('*')[0];
    if (base1 && base2 && (base1.includes(base2) || base2.includes(base1))) {
      return true;
    }
  }

  return false;
}
