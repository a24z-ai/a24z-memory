import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { ConfigLoader } from '../../src/config/loader';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ConfigLoader', () => {
  let testDir: string;
  let loader: ConfigLoader;

  beforeEach(() => {
    testDir = join(tmpdir(), `config-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    loader = new ConfigLoader();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    loader.clearCache();
  });

  describe('findConfigFile', () => {
    test('finds .alexandriarc.json in current directory', () => {
      const configPath = join(testDir, '.alexandriarc.json');
      writeFileSync(configPath, '{}');

      const found = loader.findConfigFile(testDir);
      expect(found).toBe(configPath);
    });

    test('finds config in parent directory', () => {
      const subDir = join(testDir, 'subdir');
      mkdirSync(subDir);
      const configPath = join(testDir, '.alexandriarc.json');
      writeFileSync(configPath, '{}');

      const found = loader.findConfigFile(subDir);
      expect(found).toBe(configPath);
    });

    test('tries alternative config filenames', () => {
      const configPath = join(testDir, 'alexandria.config.json');
      writeFileSync(configPath, '{}');

      const found = loader.findConfigFile(testDir);
      expect(found).toBe(configPath);
    });

    test('returns null when no config found', () => {
      const found = loader.findConfigFile(testDir);
      expect(found).toBeNull();
    });

    test('prefers .alexandriarc.json over other names', () => {
      const preferredPath = join(testDir, '.alexandriarc.json');
      const alternativePath = join(testDir, 'alexandria.json');
      writeFileSync(preferredPath, '{}');
      writeFileSync(alternativePath, '{}');

      const found = loader.findConfigFile(testDir);
      expect(found).toBe(preferredPath);
    });
  });

  describe('loadConfig', () => {
    test('loads and parses valid config', () => {
      const configPath = join(testDir, '.alexandriarc.json');
      const configData = {
        version: '1.0.0',
        project: {
          name: 'test-project',
          description: 'Test description',
        },
      };
      writeFileSync(configPath, JSON.stringify(configData));

      const config = loader.loadConfig(configPath);
      expect(config).not.toBeNull();
      expect(config?.project.name).toBe('test-project');
      expect(config?.project.description).toBe('Test description');
    });

    test('merges with default config', () => {
      const configPath = join(testDir, '.alexandriarc.json');
      const configData = {
        version: '1.0.0',
        project: {
          name: 'test-project',
        },
      };
      writeFileSync(configPath, JSON.stringify(configData));

      const config = loader.loadConfig(configPath);
      expect(config).not.toBeNull();
      // Should have defaults
      expect(config?.context.maxDepth).toBe(10);
      expect(config?.ai.contextWindow?.target).toBe(100000);
      expect(config?.reporting?.format).toBe('text');
    });

    test('caches loaded config', () => {
      const configPath = join(testDir, '.alexandriarc.json');
      const configData = {
        version: '1.0.0',
        project: { name: 'test-project' },
      };
      writeFileSync(configPath, JSON.stringify(configData));

      const config1 = loader.loadConfig(configPath);
      const config2 = loader.loadConfig(configPath);

      // Should be the same object reference (cached)
      expect(config1).toBe(config2);
    });

    test('returns null for invalid JSON', () => {
      const configPath = join(testDir, '.alexandriarc.json');
      writeFileSync(configPath, 'invalid json');

      const config = loader.loadConfig(configPath);
      expect(config).toBeNull();
    });

    test('returns null when no config found', () => {
      const config = loader.loadConfig();
      expect(config).toBeNull();
    });

    test('finds config automatically when no path provided', () => {
      const configPath = join(testDir, '.alexandriarc.json');
      const configData = {
        version: '1.0.0',
        project: { name: 'auto-found' },
      };
      writeFileSync(configPath, JSON.stringify(configData));

      // Change to test directory
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const config = loader.loadConfig();
        expect(config).not.toBeNull();
        expect(config?.project.name).toBe('auto-found');
      } finally {
        process.chdir(originalCwd);
      }
    });

    test('clearCache removes cached configs', () => {
      const configPath = join(testDir, '.alexandriarc.json');
      const configData = {
        version: '1.0.0',
        project: { name: 'original' },
      };
      writeFileSync(configPath, JSON.stringify(configData));

      const config1 = loader.loadConfig(configPath);
      expect(config1?.project.name).toBe('original');

      // Update file
      configData.project.name = 'updated';
      writeFileSync(configPath, JSON.stringify(configData));

      // Should still get cached version
      const config2 = loader.loadConfig(configPath);
      expect(config2?.project.name).toBe('original');

      // Clear cache and reload
      loader.clearCache();
      const config3 = loader.loadConfig(configPath);
      expect(config3?.project.name).toBe('updated');
    });
  });
});
