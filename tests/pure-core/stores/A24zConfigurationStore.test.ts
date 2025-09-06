/**
 * Test suite for the pure A24zConfigurationStore
 * Uses InMemoryFileSystemAdapter to test platform-agnostic functionality
 */

import { A24zConfigurationStore } from '../../../src/pure-core/stores/A24zConfigurationStore';
import { InMemoryFileSystemAdapter } from '../../../src/pure-core/abstractions/filesystem';

describe('Pure A24zConfigurationStore', () => {
  let store: A24zConfigurationStore;
  let fs: InMemoryFileSystemAdapter;
  const testRepoPath = '/test-repo';

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    store = new A24zConfigurationStore(fs);
  });

  describe('Repository Validation', () => {
    it('should create .a24z directory when it does not exist', () => {
      // Initially no .a24z directory
      expect(fs.exists('/test-repo/.a24z')).toBe(false);
      
      // Accessing configuration should work (directory creation is handled by adapter)
      const config = store.getConfiguration(testRepoPath);
      expect(config).toBeTruthy();
      expect(config.version).toBe(1);
      
      // In memory adapter, directories are implicit, but configuration should work
      expect(config.limits.noteMaxLength).toBe(500);
    });

    it('should work when .a24z directory already exists', () => {
      // Pre-create .a24z directory
      fs.createDir('/test-repo/.a24z');
      
      const config = store.getConfiguration(testRepoPath);
      expect(config).toBeTruthy();
    });

    it('should throw error for invalid repository path', () => {
      // Mock createDir to fail
      const originalCreateDir = fs.createDir.bind(fs);
      fs.createDir = jest.fn().mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => {
        store.getConfiguration('/invalid/path');
      }).toThrow('Invalid repository root path: /invalid/path');

      // Restore original method
      fs.createDir = originalCreateDir;
    });
  });

  describe('Configuration Management', () => {
    it('should return default configuration when none exists', () => {
      const config = store.getConfiguration(testRepoPath);
      
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
          tagDescriptionMaxLength: 1500
        },
        storage: { compressionEnabled: true },
      };

      const updated = store.updateConfiguration(testRepoPath, updates);
      
      expect(updated.limits.noteMaxLength).toBe(8000);
      expect(updated.limits.maxTagsPerNote).toBe(8);
      expect(updated.storage.compressionEnabled).toBe(true);

      // Verify persistence by creating new store instance
      const newStore = new A24zConfigurationStore(fs);
      const loaded = newStore.getConfiguration(testRepoPath);
      
      expect(loaded.limits.noteMaxLength).toBe(8000);
      expect(loaded.storage.compressionEnabled).toBe(true);
    });

    it('should merge partial updates with existing config', () => {
      // First, set some custom config
      store.updateConfiguration(testRepoPath, {
        limits: { noteMaxLength: 8000, maxTagsPerNote: 8, maxAnchorsPerNote: 15, tagDescriptionMaxLength: 1500 }
      });

      // Then update only storage settings
      const updated = store.updateConfiguration(testRepoPath, {
        storage: { compressionEnabled: true }
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
      const config = store.getConfiguration(testRepoPath);
      expect(config.limits.noteMaxLength).toBe(500); // Default value
    });
  });

  describe('Configuration File Management', () => {
    it('should check if custom configuration exists', () => {
      expect(store.hasCustomConfiguration(testRepoPath)).toBe(false);
      
      store.updateConfiguration(testRepoPath, { storage: { compressionEnabled: true } });
      expect(store.hasCustomConfiguration(testRepoPath)).toBe(true);
    });

    it('should reset configuration to defaults', () => {
      // Set custom config
      store.updateConfiguration(testRepoPath, {
        limits: { noteMaxLength: 5000, maxTagsPerNote: 5, maxAnchorsPerNote: 10, tagDescriptionMaxLength: 1000 }
      });

      // Reset to defaults
      const reset = store.resetConfiguration(testRepoPath);
      expect(reset.limits.noteMaxLength).toBe(500); // Default value

      // Verify it's persistent
      const loaded = store.getConfiguration(testRepoPath);
      expect(loaded.limits.noteMaxLength).toBe(500);
    });

    it('should delete configuration file', () => {
      // Set custom config
      store.updateConfiguration(testRepoPath, { storage: { compressionEnabled: true } });
      expect(store.hasCustomConfiguration(testRepoPath)).toBe(true);

      // Delete config
      const deleted = store.deleteConfiguration(testRepoPath);
      expect(deleted).toBe(true);
      expect(store.hasCustomConfiguration(testRepoPath)).toBe(false);

      // Should return defaults after deletion
      const config = store.getConfiguration(testRepoPath);
      expect(config.storage.compressionEnabled).toBe(false); // Default value
    });

    it('should return false when deleting non-existent config', () => {
      const deleted = store.deleteConfiguration(testRepoPath);
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
      store.updateConfiguration(testRepoPath, {
        limits: { noteMaxLength: 7500, maxTagsPerNote: 7, maxAnchorsPerNote: 12, tagDescriptionMaxLength: 1200 }
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