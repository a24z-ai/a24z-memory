/**
 * Validation Utilities - Reusable functions for validating multiple views
 */

import { MemoryPalace } from '../../MemoryPalace.js';
import { NodeFileSystemAdapter } from '../../node-adapters/NodeFileSystemAdapter.js';
import type { CodebaseView } from '../../pure-core/types/index.js';
import type { ValidationResult } from '../../pure-core/validation/CodebaseViewValidator.js';

export interface ViewValidationResult {
  viewId: string;
  viewName: string;
  success: boolean;
  validationResult: ValidationResult;
  error?: string;
}

export interface ValidationSummary {
  totalViews: number;
  validViews: number;
  invalidViews: number;
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  results: ViewValidationResult[];
}

/**
 * Validate all views in a repository
 */
export function validateAllViews(repositoryPath: string): ValidationSummary {
  const fileSystemAdapter = new NodeFileSystemAdapter();
  const palace = new MemoryPalace(repositoryPath, fileSystemAdapter);

  const views = palace.listViews();
  const results: ViewValidationResult[] = [];

  for (const view of views) {
    try {
      const validationResult = palace.validateView(view);

      results.push({
        viewId: view.id,
        viewName: view.name,
        success: validationResult.isValid,
        validationResult,
      });
    } catch (error) {
      results.push({
        viewId: view.id,
        viewName: view.name,
        success: false,
        validationResult: {
          isValid: false,
          issues: [],
          validatedView: view,
          summary: { errors: 1, warnings: 0, info: 0 },
        },
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Calculate summary statistics
  const validViews = results.filter((r) => r.success).length;
  const invalidViews = results.filter((r) => !r.success).length;

  let totalIssues = 0;
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  results.forEach((result) => {
    const summary = result.validationResult.summary;
    totalIssues += result.validationResult.issues.length;
    errorCount += summary.errors;
    warningCount += summary.warnings;
    infoCount += summary.info;
  });

  return {
    totalViews: results.length,
    validViews,
    invalidViews,
    totalIssues,
    errorCount,
    warningCount,
    infoCount,
    results,
  };
}

/**
 * Validate specific views by ID or name
 */
export function validateSpecificViews(
  repositoryPath: string,
  viewIdentifiers: string[]
): ValidationSummary {
  const fileSystemAdapter = new NodeFileSystemAdapter();
  const palace = new MemoryPalace(repositoryPath, fileSystemAdapter);

  const allViews = palace.listViews();
  const results: ViewValidationResult[] = [];

  for (const identifier of viewIdentifiers) {
    const view = allViews.find((v) => v.id === identifier || v.name === identifier);

    if (!view) {
      results.push({
        viewId: identifier,
        viewName: identifier,
        success: false,
        validationResult: {
          isValid: false,
          issues: [],
          validatedView: {} as CodebaseView,
          summary: { errors: 1, warnings: 0, info: 0 },
        },
        error: `View not found: ${identifier}`,
      });
      continue;
    }

    try {
      const validationResult = palace.validateView(view);

      results.push({
        viewId: view.id,
        viewName: view.name,
        success: validationResult.isValid,
        validationResult,
      });
    } catch (error) {
      results.push({
        viewId: view.id,
        viewName: view.name,
        success: false,
        validationResult: {
          isValid: false,
          issues: [],
          validatedView: view,
          summary: { errors: 1, warnings: 0, info: 0 },
        },
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Calculate summary statistics
  const validViews = results.filter((r) => r.success).length;
  const invalidViews = results.filter((r) => !r.success).length;

  let totalIssues = 0;
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  results.forEach((result) => {
    const summary = result.validationResult.summary;
    totalIssues += result.validationResult.issues.length;
    errorCount += summary.errors;
    warningCount += summary.warnings;
    infoCount += summary.info;
  });

  return {
    totalViews: results.length,
    validViews,
    invalidViews,
    totalIssues,
    errorCount,
    warningCount,
    infoCount,
    results,
  };
}

/**
 * Get views that have validation issues
 */
export function getViewsWithIssues(repositoryPath: string): ViewValidationResult[] {
  const summary = validateAllViews(repositoryPath);
  return summary.results.filter(
    (result) => !result.success || result.validationResult.issues.length > 0
  );
}

/**
 * Get views by validation status
 */
export function getViewsByStatus(repositoryPath: string) {
  const summary = validateAllViews(repositoryPath);

  return {
    valid: summary.results.filter((r) => r.success && r.validationResult.issues.length === 0),
    validWithWarnings: summary.results.filter(
      (r) => r.success && r.validationResult.issues.length > 0
    ),
    invalid: summary.results.filter((r) => !r.success),
  };
}

/**
 * Check if all views in repository are valid
 */
export function areAllViewsValid(repositoryPath: string): boolean {
  const summary = validateAllViews(repositoryPath);
  return summary.invalidViews === 0;
}
