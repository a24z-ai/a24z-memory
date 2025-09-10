export type ProjectType = 'library' | 'application' | 'monorepo' | 'service';
export type RuleSeverity = 'error' | 'warning' | 'info';
export type ReportingOutput = 'console' | 'file' | 'both';
export type ReportingFormat = 'text' | 'json' | 'html';
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
export type FixType = 'replace' | 'remove' | 'add';
export type ConfigValue = string | number | boolean | null | undefined;

export interface AlexandriaConfig {
  $schema?: string;
  version: '1.0.0';

  project?: {
    name: string;
    description?: string;
    version?: string;
    type?: ProjectType;
    language?: string | string[];
    framework?: string | string[];
  };

  context?: {
    rules?: ContextRule[];
    patterns?: {
      include?: string[];
      exclude?: string[];
      priority?: PriorityPattern[];
    };
    useGitignore?: boolean;
    maxDepth?: number;
    followSymlinks?: boolean;
  };

  reporting?: {
    output?: ReportingOutput;
    format?: ReportingFormat;
    path?: string;
    verbose?: boolean;
  };
}

// Rule-specific option types
export interface DocumentOrganizationOptions {
  documentFolders?: string[];
  rootExceptions?: string[];
  checkNested?: boolean;
}

export interface StaleReferencesOptions {
  maxAgeDays?: number;
}

export interface RequireReferencesOptions {
  excludeFiles?: string[];
}

export type RuleOptions =
  | DocumentOrganizationOptions
  | StaleReferencesOptions
  | RequireReferencesOptions
  | Record<string, string | number | boolean | string[]>;

export interface ContextRule {
  id: string;
  name: string;
  description?: string;
  severity: RuleSeverity;
  enabled?: boolean;
  pattern?: string;
  message?: string;
  options?: RuleOptions;
  fix?: {
    type: FixType;
    suggestion?: string;
  };
}

export interface PriorityPattern {
  pattern: string;
  priority: PriorityLevel;
  reason?: string;
}

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
};

export interface ValidationError {
  path: string;
  message: string;
  value?: ConfigValue;
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}
