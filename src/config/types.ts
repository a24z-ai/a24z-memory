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

  project: {
    name: string;
    description?: string;
    version?: string;
    type?: ProjectType;
    language?: string | string[];
    framework?: string | string[];
  };

  context: {
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

  ai: {
    guidelines?: string[];
    capabilities?: string[];
    restrictions?: string[];
    preferredModels?: string[];
    contextWindow?: {
      target?: number;
      max?: number;
    };
  };

  reporting?: {
    output?: ReportingOutput;
    format?: ReportingFormat;
    path?: string;
    verbose?: boolean;
  };
}

export interface ContextRule {
  id: string;
  name: string;
  description?: string;
  severity: RuleSeverity;
  enabled?: boolean;
  pattern?: string;
  message?: string;
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
