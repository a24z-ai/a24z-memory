/**
 * Test suite for the pure A24zConfigurationStore
 * Uses InMemoryFileSystemAdapter to test platform-agnostic functionality
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { A24zConfigurationStore } from '../../../src/pure-core/stores/A24zConfigurationStore';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { MemoryPalace } from '../../../src/MemoryPalace';
import type { ValidatedRepositoryPath } from '../../../src/pure-core/types';

describe('Pure A24zConfigurationStore', () => {
  let store: A24zConfigurationStore;
  let fs: InMemoryFileSystemAdapter;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    store = new A24zConfigurationStore(fs);

    // Set up the test repository structure
    fs.setupTestRepo(testRepoPath);

    // Validate the repository path
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fs, testRepoPath);
  });

  describe('Repository Validation', () => {
    it('should create .a24z directory when it does not exist', () => {
      // Create a new fs and store without setupTestRepo to test directory creation
      const cleanFs = new InMemoryFileSystemAdapter();
      const cleanStore = new A24zConfigurationStore(cleanFs);

      // Set up just the git repo without .a24z
      cleanFs.createDir('/clean-repo');
      cleanFs.createDir('/clean-repo/.git');

      // Initially no .a24z directory
      expect(cleanFs.exists('/clean-repo/.a24z')).toBe(false);

      // Validate and use the path
      const cleanValidatedPath = MemoryPalace.validateRepositoryPath(cleanFs, '/clean-repo');

      // Accessing configuration should work (directory creation is handled by adapter)
      const config = cleanStore.getConfiguration(cleanValidatedPath);
      expect(config).toBeTruthy();
      expect(config.version).toBe(1);

      // In memory adapter, directories are implicit, but configuration should work
      expect(config.limits.noteMaxLength).toBe(500);
    });

    it('should work when .a24z directory already exists', () => {
      // Pre-create .a24z directory
      fs.createDir('/test-repo/.a24z');

      const config = store.getConfiguration(validatedRepoPath);
      expect(config).toBeTruthy();
    });

    it('should throw error for invalid repository path', () => {
      // Mock createDir to fail
      const originalCreateDir = fs.createDir.bind(fs);
      fs.createDir = () => {
        throw new Error('Permission denied');
      };

      // Since we're testing the store directly with an invalid path,
      // we need to bypass validation by casting
      const invalidPath = '/invalid/path' as ValidatedRepositoryPath;

      expect(() => {
        store.getConfiguration(invalidPath);
      }).toThrow('Invalid repository root path: /invalid/path');

      // Restore original method
      fs.createDir = originalCreateDir;
    });
  });

  describe('Configuration Management', () => {
    it('should return default configuration when none exists', () => {
      const config = store.getConfiguration(validatedRepoPath);

      expect(config.version).toBe(1);
      expect(config.limits.noteMaxLength).toBe(500);
      expect(config.limits.maxTagsPerNote).toBe(3);
      expect(config.limits.maxAnchorsPerNote).toBe(5);
      expect(config.storage.compressionEnabled).toBe(false);
    });

    it('should save and load custom configuration', () => {
      const updates = {
        limits: {
          noteMaxLength: 8000,
          maxTagsPerNote: 8,
          maxAnchorsPerNote: 15,
          tagDescriptionMaxLength: 1500,
        },
        storage: { compressionEnabled: true },
      };

      const updated = store.updateConfiguration(validatedRepoPath, updates);

      expect(updated.limits.noteMaxLength).toBe(8000);
      expect(updated.limits.maxTagsPerNote).toBe(8);
      expect(updated.storage.compressionEnabled).toBe(true);

      // Verify persistence by creating new store instance
      const newStore = new A24zConfigurationStore(fs);
      const loaded = newStore.getConfiguration(validatedRepoPath);

      expect(loaded.limits.noteMaxLength).toBe(8000);
      expect(loaded.storage.compressionEnabled).toBe(true);
    });

    it('should merge partial updates with existing config', () => {
      // First, set some custom config
      store.updateConfiguration(validatedRepoPath, {
        limits: {
          noteMaxLength: 8000,
          maxTagsPerNote: 8,
          maxAnchorsPerNote: 15,
          tagDescriptionMaxLength: 1500,
        },
      });

      // Then update only storage settings
      const updated = store.updateConfiguration(validatedRepoPath, {
        storage: { compressionEnabled: true },
      });

      // Should preserve previous limits while updating storage
      expect(updated.limits.noteMaxLength).toBe(8000);
      expect(updated.limits.maxTagsPerNote).toBe(8);
      expect(updated.storage.compressionEnabled).toBe(true);
    });

    it('should handle malformed configuration files', () => {
      // Create invalid JSON config file
      fs.createDir('/test-repo/.a24z');
      fs.writeFile('/test-repo/.a24z/config.json', 'invalid json {');

      // Should return default config when parsing fails
      const config = store.getConfiguration(validatedRepoPath);
      expect(config.limits.noteMaxLength).toBe(500); // Default value
    });
  });

  describe('Configuration File Management', () => {
    it('should check if custom configuration exists', () => {
      expect(store.hasCustomConfiguration(validatedRepoPath)).toBe(false);

      store.updateConfiguration(validatedRepoPath, { storage: { compressionEnabled: true } });
      expect(store.hasCustomConfiguration(validatedRepoPath)).toBe(true);
    });

    it('should reset configuration to defaults', () => {
      // Set custom config
      store.updateConfiguration(validatedRepoPath, {
        limits: {
          noteMaxLength: 5000,
          maxTagsPerNote: 5,
          maxAnchorsPerNote: 10,
          tagDescriptionMaxLength: 1000,
        },
      });

      // Reset to defaults
      const reset = store.resetConfiguration(validatedRepoPath);
      expect(reset.limits.noteMaxLength).toBe(500); // Default value

      // Verify it's persistent
      const loaded = store.getConfiguration(validatedRepoPath);
      expect(loaded.limits.noteMaxLength).toBe(500);
    });

    it('should delete configuration file', () => {
      // Set custom config
      store.updateConfiguration(validatedRepoPath, { storage: { compressionEnabled: true } });
      expect(store.hasCustomConfiguration(validatedRepoPath)).toBe(true);

      // Delete config
      const deleted = store.deleteConfiguration(validatedRepoPath);
      expect(deleted).toBe(true);
      expect(store.hasCustomConfiguration(validatedRepoPath)).toBe(false);

      // Should return defaults after deletion
      const config = store.getConfiguration(validatedRepoPath);
      expect(config.storage.compressionEnabled).toBe(false); // Default value
    });

    it('should return false when deleting non-existent config', () => {
      const deleted = store.deleteConfiguration(validatedRepoPath);
      expect(deleted).toBe(false);
    });
  });

  describe('Default Configuration', () => {
    it('should provide access to default configuration', () => {
      const defaults = store.getDefaultConfiguration();

      expect(defaults.version).toBe(1);
      expect(defaults.limits.noteMaxLength).toBe(500);
      expect(defaults.storage.compressionEnabled).toBe(false);

      // Should be a copy, not reference
      defaults.limits.noteMaxLength = 999;
      const freshDefaults = store.getDefaultConfiguration();
      expect(freshDefaults.limits.noteMaxLength).toBe(500);
    });
  });

  describe('FileSystemAdapter Integration', () => {
    it('should use the provided filesystem adapter', () => {
      store.updateConfiguration(validatedRepoPath, {
        limits: {
          noteMaxLength: 7500,
          maxTagsPerNote: 7,
          maxAnchorsPerNote: 12,
          tagDescriptionMaxLength: 1200,
        },
      });

      // Check that files were created through the adapter
      const files = fs.getFiles();
      const configPath = '/test-repo/.a24z/config.json';

      expect(files.has(configPath)).toBe(true);

      const content = files.get(configPath);
      expect(content).toBeTruthy();

      const parsed = JSON.parse(content!);
      expect(parsed.limits.noteMaxLength).toBe(7500);
    });
  });
});
