import { describe, test, expect } from 'bun:test';
import { ConfigValidator } from '../../src/config/validator';

describe('ConfigValidator', () => {
  const validator = new ConfigValidator();

  describe('validate', () => {
    test('accepts valid minimal config', () => {
      const config = {
        version: '1.0.0',
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects non-object config', () => {
      const result = validator.validate('not an object');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toBe('root');
      expect(result.errors[0].message).toContain('Configuration must be a valid JSON object');
    });

    test('rejects null config', () => {
      const result = validator.validate(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toBe('root');
    });

    test('rejects array config', () => {
      const result = validator.validate([]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toBe('root');
    });

    test('warns about missing version field', () => {
      const config = {
        project: {
          name: 'test',
        },
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(true); // Valid but with warning
      expect(result.warnings.some((w) => w.path === 'version')).toBe(true);
    });

    test('rejects unsupported version', () => {
      const config = {
        version: '2.0.0',
        project: {
          name: 'test',
        },
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.path === 'version' && e.message.includes('Expected "1.0.0"'))
      ).toBe(true);
    });

    test('accepts config without project field', () => {
      const config = {
        version: '1.0.0',
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('accepts project without name', () => {
      const config = {
        version: '1.0.0',
        project: {},
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects non-string project.name', () => {
      const config = {
        version: '1.0.0',
        project: {
          name: 123,
        },
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.path === 'project.name' && e.message.includes('must be a string')
        )
      ).toBe(true);
    });

    test('accepts optional fields', () => {
      const config = {
        version: '1.0.0',
        project: {
          name: 'test',
          description: 'A test project',
          type: 'library',
          language: 'typescript',
          framework: ['react', 'nextjs'],
        },
        context: {
          maxDepth: 5,
          followSymlinks: true,
        },
        ai: {
          guidelines: ['Be concise'],
          contextWindow: {
            target: 50000,
          },
        },
        reporting: {
          format: 'json',
          verbose: true,
        },
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects non-object context', () => {
      const config = {
        version: '1.0.0',
        project: { name: 'test' },
        context: 'invalid',
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.path === 'context' && e.message.includes('must be an object'))
      ).toBe(true);
    });

    test('rejects non-object reporting config', () => {
      const config = {
        version: '1.0.0',
        project: { name: 'test' },
        reporting: true,
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.path === 'reporting' && e.message.includes('must be an object'))
      ).toBe(true);
    });

    test('allows empty warnings array', () => {
      const config = {
        version: '1.0.0',
        project: { name: 'test' },
      };

      const result = validator.validate(config);
      expect(result.warnings).toHaveLength(0);
    });

    test('includes value in error when available', () => {
      const config = {
        version: '3.0.0',
        project: { name: 'test' },
      };

      const result = validator.validate(config);
      const versionError = result.errors.find((e) => e.path === 'version');
      expect(versionError?.value).toBe('3.0.0');
    });
  });
});
