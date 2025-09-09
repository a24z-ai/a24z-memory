import { AlexandriaConfig, ValidationResult, ValidationError, ValidationWarning } from './types';

export class ConfigValidator {
  validate(config: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!this.isObject(config)) {
      errors.push({
        path: 'root',
        message: 'Configuration must be an object',
      });
      return { valid: false, errors, warnings };
    }

    const cfg = config as Partial<AlexandriaConfig>;

    // Validate version
    if (!cfg.version) {
      errors.push({
        path: 'version',
        message: 'Version is required',
      });
    } else if (cfg.version !== '1.0.0') {
      errors.push({
        path: 'version',
        message: `Unsupported version: ${cfg.version}. Expected 1.0.0`,
        value: cfg.version,
      });
    }

    // Validate project
    if (!cfg.project) {
      errors.push({
        path: 'project',
        message: 'Project configuration is required',
      });
    } else if (!cfg.project.name || typeof cfg.project.name !== 'string') {
      errors.push({
        path: 'project.name',
        message: 'Project name is required and must be a string',
        value: cfg.project?.name,
      });
    }

    // Basic type checks for optional sections
    if (cfg.context && !this.isObject(cfg.context)) {
      errors.push({
        path: 'context',
        message: 'Context must be an object',
        value: cfg.context,
      });
    }

    if (cfg.ai && !this.isObject(cfg.ai)) {
      errors.push({
        path: 'ai',
        message: 'AI configuration must be an object',
        value: cfg.ai,
      });
    }

    if (cfg.reporting && !this.isObject(cfg.reporting)) {
      errors.push({
        path: 'reporting',
        message: 'Reporting configuration must be an object',
        value: cfg.reporting,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private isObject(value: unknown): value is object {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
