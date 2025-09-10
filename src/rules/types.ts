import { ValidatedRepositoryPath, CodebaseView, AnchoredNoteWithPath } from '../pure-core/types';
import { AlexandriaConfig, RuleOptions } from '../config/types';

export type LibraryRuleSeverity = 'error' | 'warning' | 'info';
export type LibraryRuleCategory = 'critical' | 'quality' | 'performance' | 'structure';

export interface LibraryRuleViolation {
  ruleId: string;
  severity: LibraryRuleSeverity;
  file?: string;
  line?: number;
  message: string;
  impact: string;
  fixable: boolean;
}

export interface FileInfo {
  path: string;
  relativePath: string;
  exists: boolean;
  lastModified?: Date;
  size?: number;
  isMarkdown: boolean;
}

export interface GitFileHistory {
  path: string;
  lastModified: Date;
  lastCommitHash: string;
  lastCommitMessage: string;
}

export interface LibraryRuleContext {
  projectRoot: ValidatedRepositoryPath;
  views: CodebaseView[];
  notes: AnchoredNoteWithPath[];
  files: FileInfo[];
  markdownFiles: FileInfo[];
  gitHistory?: Map<string, GitFileHistory>;
  gitignorePatterns?: string[];
  config?: AlexandriaConfig;
}

export interface LibraryRule {
  id: string;
  name: string;
  severity: LibraryRuleSeverity;
  category: LibraryRuleCategory;
  description: string;
  impact: string;
  fixable: boolean;
  enabled: boolean;
  options?: RuleOptions; // Default options for the rule
  check: (context: LibraryRuleContext) => Promise<LibraryRuleViolation[]>;
  fix?: (violation: LibraryRuleViolation, context: LibraryRuleContext) => Promise<void>;
}

export interface LibraryRuleSet {
  rules: LibraryRule[];
  enabledRules?: string[];
  disabledRules?: string[];
  severityOverrides?: Record<string, LibraryRuleSeverity>;
}

export interface LibraryLintResult {
  violations: LibraryRuleViolation[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  fixableCount: number;
}
