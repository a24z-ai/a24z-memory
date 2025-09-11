import {
  LibraryRule,
  LibraryRuleContext,
  LibraryRuleViolation,
  LibraryLintResult,
  LibraryRuleSet,
  FileInfo,
} from './types';
import { requireReferences } from './implementations/require-references';
import { orphanedReferences } from './implementations/orphaned-references';
import { staleReferences } from './implementations/stale-references';
import { documentOrganization } from './implementations/document-organization';
import { filenameConvention } from './implementations/filename-convention';
import { statSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { AlexandriaConfig, RuleSeverity } from '../config/types';
import { ConfigLoader } from '../config/loader';
import { ValidatedRepositoryPath } from '../pure-core/types';
import { MemoryPalace } from '../MemoryPalace';
import { NodeFileSystemAdapter } from '../node-adapters/NodeFileSystemAdapter';

export class LibraryRulesEngine {
  private rules: Map<string, LibraryRule> = new Map();
  private configLoader: ConfigLoader;
  private fsAdapter: NodeFileSystemAdapter;

  constructor() {
    // Create file system adapter
    this.fsAdapter = new NodeFileSystemAdapter();
    this.configLoader = new ConfigLoader(this.fsAdapter);

    // Register built-in rules
    this.registerRule(requireReferences);
    this.registerRule(orphanedReferences);
    this.registerRule(staleReferences);
    this.registerRule(documentOrganization);
    this.registerRule(filenameConvention);
  }

  registerRule(rule: LibraryRule): void {
    this.rules.set(rule.id, rule);
  }

  getAllRules(): Map<string, LibraryRule> {
    return this.rules;
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
      config: config || undefined,
    };

    // Build a map of rule configuration overrides from config
    const ruleOverrides = new Map<string, { severity?: RuleSeverity; enabled?: boolean }>();
    if (config?.context?.rules) {
      for (const ruleConfig of config.context.rules) {
        ruleOverrides.set(ruleConfig.id, {
          severity: ruleConfig.severity,
          enabled: ruleConfig.enabled,
        });
      }
    }

    // Run enabled rules
    const violations: LibraryRuleViolation[] = [];
    for (const [ruleId, rule] of this.rules) {
      // Skip disabled rules
      if (options.disabledRules?.includes(ruleId)) {
        continue;
      }

      // Check if rule is enabled (with config override)
      const override = ruleOverrides.get(ruleId);
      const isEnabled = override?.enabled ?? rule.enabled;

      // Only run enabled rules (or all if no specific list provided)
      if (!options.enabledRules || options.enabledRules.includes(ruleId)) {
        if (isEnabled) {
          const ruleViolations = await rule.check(context);

          // Apply severity override from config
          if (override?.severity) {
            for (const violation of ruleViolations) {
              violation.severity = override.severity;
            }
          }

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
