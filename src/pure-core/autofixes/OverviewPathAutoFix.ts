/**
 * Auto-fix provider for CodebaseView overview path issues
 * Handles moving misplaced overview documents and updating paths
 */

import * as path from 'node:path';
import type { MemoryPalace } from '../../MemoryPalace';
import { CodebaseView } from '../types';
import {
  AutoFixProvider,
  AutoFixSuggestion,
  AutoFixResult,
  AutoFixIssue,
  AutoFixChange,
  AutoFixPreview,
  AutoFixSeverity,
} from './types';

export interface OverviewPathAutoFixOptions {
  /** Preferred directory for overview documents */
  preferredOverviewDir?: string;
  /** Patterns to exclude from auto-fix */
  excludePatterns?: string[];
  /** Whether to create missing overview files */
  createMissing?: boolean;
  /** Whether to consolidate docs to preferred directory */
  consolidateDocs?: boolean;
}

export class OverviewPathAutoFix implements AutoFixProvider {
  name = 'OverviewPathAutoFix';
  description = 'Fixes issues with CodebaseView overview document paths';

  private palace: MemoryPalace;
  private options: OverviewPathAutoFixOptions;

  constructor(palace: MemoryPalace, options: OverviewPathAutoFixOptions = {}) {
    this.palace = palace;
    this.options = {
      preferredOverviewDir: 'docs/views',
      createMissing: true,
      consolidateDocs: false,
      ...options,
    };
  }

  async analyze(): Promise<AutoFixSuggestion[]> {
    const suggestions: AutoFixSuggestion[] = [];
    const views = this.palace.listViews();

    for (const view of views) {
      // Check for missing overview files
      const missingFix = await this.checkMissingOverview(view);
      if (missingFix) suggestions.push(missingFix);

      // Check for misplaced overview files (if consolidation is enabled)
      if (this.options.consolidateDocs) {
        const misplacedFix = await this.checkMisplacedOverview(view);
        if (misplacedFix) suggestions.push(misplacedFix);
      }

      // Check for overview files outside of excluded patterns
      const excludedFix = await this.checkExcludedOverview(view);
      if (excludedFix) suggestions.push(excludedFix);
    }

    // Check for orphaned markdown files that could be overview docs
    const orphanedFixes = await this.checkOrphanedMarkdownFiles();
    suggestions.push(...orphanedFixes);

    return suggestions;
  }

  private async checkMissingOverview(view: CodebaseView): Promise<AutoFixSuggestion | null> {
    const overviewPath = view.overviewPath;
    if (!overviewPath) return null;

    // Use palace's file system check
    const fullPath = this.palace.getRepositoryPath() + '/' + overviewPath;
    if (this.palace.fileExists(fullPath)) return null;

    const issue: AutoFixIssue = {
      type: 'missing_overview_file',
      description: `Overview file not found for view "${view.name}"`,
      location: overviewPath,
      severity: 'safe',
      context: { viewId: view.id, viewName: view.name },
    };

    return {
      issue,
      action: `Create missing overview file at ${overviewPath}`,
      apply: async () => this.createMissingOverview(view),
      canApply: async () => this.options.createMissing === true,
      preview: async () => ({
        description: `Create new markdown file at ${overviewPath}`,
        changes: [
          {
            type: 'file_created',
            path: overviewPath,
            after: this.generateOverviewContent(view),
          },
        ],
        risk: 'safe',
      }),
    };
  }

  private async checkMisplacedOverview(view: CodebaseView): Promise<AutoFixSuggestion | null> {
    const overviewPath = view.overviewPath;
    if (!overviewPath || !this.options.preferredOverviewDir) return null;

    // Check if file exists using palace
    const fullPath = this.palace.getRepositoryPath() + '/' + overviewPath;
    if (!this.palace.fileExists(fullPath)) return null;

    // Check if file is already in preferred directory
    const preferredDir = this.options.preferredOverviewDir;
    if (overviewPath.startsWith(preferredDir)) return null;

    const issue: AutoFixIssue = {
      type: 'misplaced_overview_file',
      description: `Overview file for "${view.name}" is not in preferred directory`,
      location: overviewPath,
      severity: 'moderate',
      context: { viewId: view.id, preferredDir },
    };

    const newPath = path.join(preferredDir, `${view.id}.md`);

    return {
      issue,
      action: `Move overview file from ${overviewPath} to ${newPath}`,
      apply: async () => this.moveOverviewFile(view, newPath),
      preview: async () => ({
        description: `Move file and update view configuration`,
        changes: [
          {
            type: 'file_moved',
            path: overviewPath,
            before: overviewPath,
            after: newPath,
          },
          {
            type: 'property_updated',
            path: `view.${view.id}.overviewPath`,
            before: overviewPath,
            after: newPath,
          },
        ],
        risk: 'moderate',
      }),
    };
  }

  private async checkExcludedOverview(view: CodebaseView): Promise<AutoFixSuggestion | null> {
    if (!this.options.excludePatterns || this.options.excludePatterns.length === 0) return null;

    const overviewPath = view.overviewPath;
    if (!overviewPath) return null;

    // Check if path matches any exclude pattern
    const isExcluded = this.options.excludePatterns.some((pattern) => {
      // Simple pattern matching - could be enhanced with glob support
      return overviewPath.includes(pattern);
    });

    if (!isExcluded) return null;

    const issue: AutoFixIssue = {
      type: 'excluded_overview_location',
      description: `Overview file for "${view.name}" is in an excluded location`,
      location: overviewPath,
      severity: 'moderate',
      context: { viewId: view.id, excludePatterns: this.options.excludePatterns },
    };

    const preferredDir = this.options.preferredOverviewDir || 'docs/views';
    const newPath = path.join(preferredDir, `${view.id}.md`);

    return {
      issue,
      action: `Move overview file from excluded location to ${newPath}`,
      apply: async () => this.moveOverviewFile(view, newPath),
      preview: async () => ({
        description: `Move file out of excluded location`,
        changes: [
          {
            type: 'file_moved',
            path: overviewPath,
            before: overviewPath,
            after: newPath,
          },
          {
            type: 'property_updated',
            path: `view.${view.id}.overviewPath`,
            before: overviewPath,
            after: newPath,
          },
        ],
        risk: 'moderate',
      }),
    };
  }

  private async checkOrphanedMarkdownFiles(): Promise<AutoFixSuggestion[]> {
    // This would integrate with the list-untracked-docs functionality
    // For now, returning empty array - would need to implement markdown discovery
    return [];
  }

  private async createMissingOverview(view: CodebaseView): Promise<AutoFixResult> {
    try {
      const content = this.generateOverviewContent(view);
      const fullPath = this.palace.getRepositoryPath() + '/' + view.overviewPath;

      // Ensure directory exists
      const dir = path.dirname(fullPath);
      if (!this.palace.fileExists(dir)) {
        this.palace.createDirectory(dir);
      }

      this.palace.writeFile(fullPath, content);

      return {
        success: true,
        status: 'applied',
        message: `Created overview file for view "${view.name}"`,
        changes: [
          {
            type: 'file_created',
            path: view.overviewPath,
            after: content,
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        message: `Failed to create overview file: ${error}`,
        error: String(error),
      };
    }
  }

  private async moveOverviewFile(view: CodebaseView, newPath: string): Promise<AutoFixResult> {
    try {
      const oldFullPath = this.palace.getRepositoryPath() + '/' + view.overviewPath;
      const newFullPath = this.palace.getRepositoryPath() + '/' + newPath;

      // Ensure target directory exists
      const targetDir = path.dirname(newFullPath);
      if (!this.palace.fileExists(targetDir)) {
        this.palace.createDirectory(targetDir);
      }

      // Read content
      const content = this.palace.readFile(oldFullPath);

      // Write to new location
      this.palace.writeFile(newFullPath, content);

      // Update view
      const updatedView = { ...view, overviewPath: newPath };
      this.palace.saveView(updatedView);

      // Delete old file
      this.palace.deleteFile(oldFullPath);

      return {
        success: true,
        status: 'applied',
        message: `Moved overview file from ${view.overviewPath} to ${newPath}`,
        changes: [
          {
            type: 'file_moved',
            path: view.overviewPath,
            before: view.overviewPath,
            after: newPath,
          },
          {
            type: 'property_updated',
            path: `view.${view.id}.overviewPath`,
            before: view.overviewPath,
            after: newPath,
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        message: `Failed to move overview file: ${error}`,
        error: String(error),
      };
    }
  }

  private generateOverviewContent(view: CodebaseView): string {
    const timestamp = new Date().toISOString();
    return `# ${view.name}

${view.description}

## Overview

This document provides an overview of the ${view.name} codebase view.

## Structure

${this.generateCellsDescription(view)}

## Links

${this.generateLinksDescription(view)}

---
*Generated on ${timestamp} by OverviewPathAutoFix*
`;
  }

  private generateCellsDescription(view: CodebaseView): string {
    if (!view.cells || Object.keys(view.cells).length === 0) {
      return 'No cells defined in this view.';
    }

    const cellDescriptions = Object.entries(view.cells)
      .map(([name, cell]) => {
        const fileCount = cell.files?.length || 0;
        return `- **${name}** (${fileCount} files): Located at [${cell.coordinates.join(', ')}]`;
      })
      .join('\n');

    return cellDescriptions;
  }

  private generateLinksDescription(view: CodebaseView): string {
    if (!view.links || Object.keys(view.links).length === 0) {
      return 'No links to other views.';
    }

    const linkDescriptions = Object.entries(view.links)
      .map(([targetId, description]) => `- [${description}](${targetId})`)
      .join('\n');

    return linkDescriptions;
  }

  async applyFix(suggestion: AutoFixSuggestion): Promise<AutoFixResult> {
    if (suggestion.canApply) {
      const canApply = await suggestion.canApply();
      if (!canApply) {
        return {
          success: false,
          status: 'skipped',
          message: 'Fix cannot be applied due to configuration or constraints',
        };
      }
    }

    return suggestion.apply();
  }

  async applyAllSafe(): Promise<AutoFixResult[]> {
    const suggestions = await this.analyze();
    const safeSuggestions = suggestions.filter((s) => s.issue.severity === 'safe');

    const results: AutoFixResult[] = [];
    for (const suggestion of safeSuggestions) {
      const result = await this.applyFix(suggestion);
      results.push(result);
    }

    return results;
  }
}