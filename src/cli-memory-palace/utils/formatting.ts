/**
 * Formatting utilities for CLI output
 */

import type {
  ValidationResult,
  ValidationIssue,
} from '../../pure-core/validation/CodebaseViewValidator.js';

/**
 * Format a validation result for terminal display
 */
export function formatValidationResult(result: ValidationResult): string {
  if (result.issues.length === 0) {
    return '✅ No validation issues found';
  }

  const lines: string[] = [];

  // Group issues by severity
  const errorIssues = result.issues.filter((i) => i.severity === 'error');
  const warningIssues = result.issues.filter((i) => i.severity === 'warning');
  const infoIssues = result.issues.filter((i) => i.severity === 'info');

  // Display errors first
  if (errorIssues.length > 0) {
    lines.push('❌ Critical Issues:');
    errorIssues.forEach((issue) => {
      lines.push(formatIssue(issue, '  '));
    });

    if (!result.isValid) {
      lines.push('');
      lines.push('⚠️  This view may not render properly until these issues are fixed.');
    }
  }

  // Display warnings
  if (warningIssues.length > 0) {
    if (errorIssues.length > 0) lines.push('');
    lines.push('⚠️  Validation Warnings:');
    warningIssues.forEach((issue) => {
      lines.push(formatIssue(issue, '  '));
    });
  }

  // Display info messages
  if (infoIssues.length > 0) {
    if (errorIssues.length > 0 || warningIssues.length > 0) lines.push('');
    lines.push('ℹ️  Information:');
    infoIssues.forEach((issue) => {
      lines.push(formatIssue(issue, '  '));
    });
  }

  return lines.join('\n');
}

/**
 * Format a single validation issue
 */
function formatIssue(issue: ValidationIssue, indent: string = ''): string {
  const lines: string[] = [];

  // Main message with location
  if (issue.location) {
    lines.push(`${indent}• ${issue.message} (${issue.location})`);
  } else {
    lines.push(`${indent}• ${issue.message}`);
  }

  // Add context if provided
  if (issue.context) {
    lines.push(`${indent}  ${issue.context}`);
  }

  return lines.join('\n');
}

/**
 * Format validation summary
 */
export function formatValidationSummary(result: ValidationResult): string {
  const { summary } = result;
  const parts: string[] = [];

  if (summary.errors > 0) {
    parts.push(`${summary.errors} error${summary.errors === 1 ? '' : 's'}`);
  }

  if (summary.warnings > 0) {
    parts.push(`${summary.warnings} warning${summary.warnings === 1 ? '' : 's'}`);
  }

  if (summary.info > 0) {
    parts.push(`${summary.info} info message${summary.info === 1 ? '' : 's'}`);
  }

  if (parts.length === 0) {
    return 'No issues found';
  }

  return parts.join(', ');
}
