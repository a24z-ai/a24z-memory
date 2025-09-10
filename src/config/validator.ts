import { ValidationResult, ValidationError, ValidationWarning } from './types';

export class ConfigValidator {
  validate(config: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!this.isObject(config)) {
      errors.push({
        path: 'root',
        message: 'Configuration must be a valid JSON object',
      });
      return { valid: false, errors, warnings };
    }

    const cfg = config as Record<string, unknown>;

    // Validate version
    if (!cfg.version) {
      warnings.push({
        path: 'version',
        message: 'Version field is missing (defaulting to 1.0.0)',
        suggestion: 'Add "version": "1.0.0" to your config',
      });
    } else if (cfg.version !== '1.0.0') {
      errors.push({
        path: 'version',
        message: `Unsupported version: ${cfg.version}. Expected "1.0.0"`,
        value: cfg.version as string,
      });
    }

    // Validate project (optional)
    if (cfg.project !== undefined) {
      if (!this.isObject(cfg.project)) {
        errors.push({
          path: 'project',
          message: 'Project must be an object',
          value: cfg.project as string,
        });
      } else {
        const project = cfg.project as Record<string, unknown>;
        
        if (project.name && typeof project.name !== 'string') {
          errors.push({
            path: 'project.name',
            message: 'Project name must be a string',
            value: project.name as string,
          });
        }

        if (project.type !== undefined) {
          const validTypes = ['library', 'application', 'monorepo', 'service'];
          if (!validTypes.includes(project.type as string)) {
            errors.push({
              path: 'project.type',
              message: `Invalid project type. Must be one of: ${validTypes.join(', ')}`,
              value: project.type as string,
            });
          }
        }
      }
    }

    // Validate context
    if (cfg.context !== undefined) {
      if (!this.isObject(cfg.context)) {
        errors.push({
          path: 'context',
          message: 'Context must be an object',
          value: cfg.context as string,
        });
      } else {
        this.validateContext(cfg.context as Record<string, unknown>, errors);
      }
    }

    // Validate reporting
    if (cfg.reporting !== undefined) {
      if (!this.isObject(cfg.reporting)) {
        errors.push({
          path: 'reporting',
          message: 'Reporting configuration must be an object',
          value: cfg.reporting as string,
        });
      } else {
        this.validateReporting(cfg.reporting as Record<string, unknown>, errors);
      }
    }

    // Check for unknown top-level keys
    const knownKeys = ['$schema', 'version', 'project', 'context', 'reporting'];
    const unknownKeys = Object.keys(cfg).filter(key => !knownKeys.includes(key));
    if (unknownKeys.length > 0) {
      warnings.push({
        path: 'root',
        message: `Unknown configuration keys: ${unknownKeys.join(', ')}`,
        suggestion: 'Remove unknown keys or check for typos',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateContext(
    context: Record<string, unknown>,
    errors: ValidationError[]
  ): void {
    // Validate rules
    if (context.rules !== undefined) {
      if (!Array.isArray(context.rules)) {
        errors.push({
          path: 'context.rules',
          message: 'Rules must be an array',
          value: context.rules as string,
        });
      } else {
        context.rules.forEach((rule: unknown, index: number) => {
          if (!this.isObject(rule)) {
            errors.push({
              path: `context.rules[${index}]`,
              message: 'Each rule must be an object',
            });
          } else {
            const r = rule as Record<string, unknown>;
            
            if (!r.id) {
              errors.push({
                path: `context.rules[${index}].id`,
                message: 'Rule id is required',
              });
            }
            
            if (!r.name) {
              errors.push({
                path: `context.rules[${index}].name`,
                message: 'Rule name is required',
              });
            }
            
            if (!r.severity) {
              errors.push({
                path: `context.rules[${index}].severity`,
                message: 'Rule severity is required',
              });
            } else {
              const validSeverities = ['error', 'warning', 'info'];
              if (!validSeverities.includes(r.severity as string)) {
                errors.push({
                  path: `context.rules[${index}].severity`,
                  message: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`,
                  value: r.severity as string,
                });
              }
            }

            if (r.enabled !== undefined && typeof r.enabled !== 'boolean') {
              errors.push({
                path: `context.rules[${index}].enabled`,
                message: 'Rule enabled must be a boolean',
                value: r.enabled as string,
              });
            }
          }
        });
      }
    }

    // Validate patterns
    if (context.patterns !== undefined) {
      if (!this.isObject(context.patterns)) {
        errors.push({
          path: 'context.patterns',
          message: 'Patterns must be an object',
          value: context.patterns as string,
        });
      } else {
        const patterns = context.patterns as Record<string, unknown>;
        
        if (patterns.include !== undefined && !Array.isArray(patterns.include)) {
          errors.push({
            path: 'context.patterns.include',
            message: 'Include patterns must be an array of strings',
            value: patterns.include as string,
          });
        }
        
        if (patterns.exclude !== undefined && !Array.isArray(patterns.exclude)) {
          errors.push({
            path: 'context.patterns.exclude',
            message: 'Exclude patterns must be an array of strings',
            value: patterns.exclude as string,
          });
        }
      }
    }

    // Validate boolean fields
    if (context.useGitignore !== undefined && typeof context.useGitignore !== 'boolean') {
      errors.push({
        path: 'context.useGitignore',
        message: 'useGitignore must be a boolean',
        value: context.useGitignore as string,
      });
    }

    if (context.followSymlinks !== undefined && typeof context.followSymlinks !== 'boolean') {
      errors.push({
        path: 'context.followSymlinks',
        message: 'followSymlinks must be a boolean',
        value: context.followSymlinks as string,
      });
    }

    if (context.maxDepth !== undefined && typeof context.maxDepth !== 'number') {
      errors.push({
        path: 'context.maxDepth',
        message: 'maxDepth must be a number',
        value: context.maxDepth as string,
      });
    }
  }

  private validateReporting(
    reporting: Record<string, unknown>,
    errors: ValidationError[]
  ): void {
    if (reporting.output !== undefined) {
      const validOutputs = ['console', 'file', 'both'];
      if (!validOutputs.includes(reporting.output as string)) {
        errors.push({
          path: 'reporting.output',
          message: `Invalid output. Must be one of: ${validOutputs.join(', ')}`,
          value: reporting.output as string,
        });
      }
    }

    if (reporting.format !== undefined) {
      const validFormats = ['text', 'json', 'html'];
      if (!validFormats.includes(reporting.format as string)) {
        errors.push({
          path: 'reporting.format',
          message: `Invalid format. Must be one of: ${validFormats.join(', ')}`,
          value: reporting.format as string,
        });
      }
    }

    if (reporting.verbose !== undefined && typeof reporting.verbose !== 'boolean') {
      errors.push({
        path: 'reporting.verbose',
        message: 'verbose must be a boolean',
        value: reporting.verbose as string,
      });
    }
  }

  private isObject(value: unknown): value is object {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
