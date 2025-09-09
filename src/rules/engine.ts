import {
  LibraryRule,
  LibraryRuleContext,
  LibraryRuleViolation,
  LibraryLintResult,
  LibraryRuleSet,
  FileInfo,
} from './types';
import { requireViewAssociation } from './rules/require-view-association';
import { orphanedReferences } from './rules/orphaned-references';
import { staleContext } from './rules/stale-context';
import { statSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { AlexandriaConfig } from '../config/types';
import { ConfigLoader } from '../config/loader';
import { ValidatedRepositoryPath } from '../pure-core/types';
import { MemoryPalace } from '../MemoryPalace';
import { NodeFileSystemAdapter } from '../node-adapters/NodeFileSystemAdapter';

export class LibraryRulesEngine {
  private rules: Map<string, LibraryRule> = new Map();
  private configLoader = new ConfigLoader();

  constructor() {
    // Register built-in rules
    this.registerRule(requireViewAssociation);
    this.registerRule(orphanedReferences);
    this.registerRule(staleContext);
  }

  registerRule(rule: LibraryRule): void {
    this.rules.set(rule.id, rule);
  }

  private async scanFiles(
    projectRoot: ValidatedRepositoryPath,
    _gitignorePatterns?: string[]
  ): Promise<{ files: FileInfo[]; markdownFiles: FileInfo[] }> {
    const files: FileInfo[] = [];
    const markdownFiles: FileInfo[] = [];

    const scan = (dir: string) => {
      try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const relativePath = relative(projectRoot, fullPath);

          // Skip hidden directories and common ignore patterns
          if (entry.startsWith('.') || entry === 'node_modules') {
            continue;
          }

          // TODO: Apply gitignore patterns if provided

          const stats = statSync(fullPath);
          if (stats.isDirectory()) {
            scan(fullPath);
          } else if (stats.isFile()) {
            const fileInfo: FileInfo = {
              path: fullPath,
              relativePath,
              exists: true,
              lastModified: stats.mtime,
              size: stats.size,
              isMarkdown: entry.endsWith('.md'),
            };

            files.push(fileInfo);
            if (fileInfo.isMarkdown) {
              markdownFiles.push(fileInfo);
            }
          }
        }
      } catch (error) {
        console.warn(`Error scanning directory ${dir}:`, error);
      }
    };

    scan(projectRoot);
    return { files, markdownFiles };
  }

  async lint(
    projectRoot?: string,
    options: {
      config?: AlexandriaConfig;
      enabledRules?: string[];
      disabledRules?: string[];
      fix?: boolean;
    } = {}
  ): Promise<LibraryLintResult> {
    // Create MemoryPalace instance
    const fs = new NodeFileSystemAdapter();
    const validatedPath = MemoryPalace.validateRepositoryPath(fs, projectRoot || process.cwd());
    const memoryPalace = new MemoryPalace(validatedPath, fs);

    // Load configuration
    const config = options.config || this.configLoader.loadConfig();

    // Prepare gitignore patterns if enabled
    let gitignorePatterns: string[] | undefined;
    if (config?.context?.useGitignore) {
      // TODO: Load and parse .gitignore file
    }

    // Scan files
    const { files, markdownFiles } = await this.scanFiles(validatedPath, gitignorePatterns);

    // Load views and notes using MemoryPalace public API
    const views = memoryPalace.listViews();
    const notes = memoryPalace.getNotes();

    // Build rule context
    const context: LibraryRuleContext = {
      projectRoot: validatedPath,
      views,
      notes,
      files,
      markdownFiles,
      gitignorePatterns,
    };

    // Run enabled rules
    const violations: LibraryRuleViolation[] = [];
    for (const [ruleId, rule] of this.rules) {
      // Skip disabled rules
      if (options.disabledRules?.includes(ruleId)) {
        continue;
      }

      // Only run enabled rules (or all if no specific list provided)
      if (!options.enabledRules || options.enabledRules.includes(ruleId)) {
        if (rule.enabled) {
          const ruleViolations = await rule.check(context);
          violations.push(...ruleViolations);
        }
      }
    }

    // Count violations by severity
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    let fixableCount = 0;

    for (const violation of violations) {
      switch (violation.severity) {
        case 'error':
          errorCount++;
          break;
        case 'warning':
          warningCount++;
          break;
        case 'info':
          infoCount++;
          break;
      }
      if (violation.fixable) {
        fixableCount++;
      }
    }

    // Apply fixes if requested
    if (options.fix && fixableCount > 0) {
      // TODO: Implement fix application
      console.log(`Would fix ${fixableCount} violations (not yet implemented)`);
    }

    return {
      violations,
      errorCount,
      warningCount,
      infoCount,
      fixableCount,
    };
  }

  getRuleSet(): LibraryRuleSet {
    return {
      rules: Array.from(this.rules.values()),
      enabledRules: Array.from(this.rules.keys()).filter((id) => this.rules.get(id)?.enabled),
    };
  }
}
