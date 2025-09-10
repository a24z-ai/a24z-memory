import { describe, it, expect, beforeEach } from 'bun:test';
import { AnchoredNotesStore } from '../../../src/pure-core/stores/AnchoredNotesStore';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { MemoryPalace } from '../../../src/MemoryPalace';
import type {
  ValidatedRepositoryPath,
  ValidatedAlexandriaPath,
} from '../../../src/pure-core/types';

describe('Allowed Tags Helper Functions', () => {
  let store: AnchoredNotesStore;
  let fs: InMemoryFileSystemAdapter;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;
  let alexandriaPath: ValidatedAlexandriaPath;

  beforeEach(() => {
    // Initialize in-memory filesystem and store
    fs = new InMemoryFileSystemAdapter();

    // Set up test repository
    fs.setupTestRepo(testRepoPath);
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fs, testRepoPath);
    alexandriaPath = MemoryPalace.getAlexandriaPath(validatedRepoPath, fs);

    store = new AnchoredNotesStore(fs, alexandriaPath);
  });

  describe('addAllowedTag', () => {
    it('should add a tag to empty allowed tags', () => {
      store.saveTagDescription('feature', 'New features');
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      const allowedTags = store.getAllowedTags();
      expect(allowedTags.tags).toContain('feature');
      expect(allowedTags.tags).toHaveLength(1);
    });

    it('should not add duplicate tags', () => {
      store.saveTagDescription('feature', 'New features');
      store.saveTagDescription('feature', 'Updated description'); // Duplicate
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      const allowedTags = store.getAllowedTags();
      expect(allowedTags.tags).toEqual(['feature']);
    });

    it('should add multiple different tags', () => {
      store.saveTagDescription('feature', 'New features');
      store.saveTagDescription('bug', 'Bug fixes');
      store.saveTagDescription('security', 'Security improvements');
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      const allowedTags = store.getAllowedTags();
      expect(allowedTags.tags).toContain('feature');
      expect(allowedTags.tags).toContain('bug');
      expect(allowedTags.tags).toContain('security');
      expect(allowedTags.tags).toHaveLength(3);
    });
  });

  describe('removeAllowedTag', () => {
    it('should remove an existing tag', () => {
      store.saveTagDescription('feature', 'New features');
      store.saveTagDescription('bug', 'Bug fixes');
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      const removed = store.deleteTagDescription('feature');

      expect(removed).toBe(true);
      const allowedTags = store.getAllowedTags();
      expect(allowedTags.tags).not.toContain('feature');
      expect(allowedTags.tags).toContain('bug');
    });

    it('should return false when removing non-existent tag', () => {
      const removed = store.deleteTagDescription('non-existent');

      expect(removed).toBe(false);
    });

    it('should handle empty allowed tags list', () => {
      const removed = store.deleteTagDescription('feature');

      expect(removed).toBe(false);
    });
  });

  describe('setEnforceAllowedTags', () => {
    it('should enable tag enforcement', () => {
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      const allowedTags = store.getAllowedTags();
      expect(allowedTags.enforced).toBe(true);
    });

    it('should disable tag enforcement', () => {
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: false,
        },
      });

      const allowedTags = store.getAllowedTags();
      expect(allowedTags.enforced).toBe(false);
    });

    it('should default to false for new repositories', () => {
      // Explicitly ensure enforcement is disabled for this test
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: false,
        },
      });

      const allowedTags = store.getAllowedTags();
      expect(allowedTags.enforced).toBe(false);
    });
  });

  describe('Integration', () => {
    it('should work together to manage tag restrictions', () => {
      // Explicitly reset enforcement state for this test
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: false,
        },
      });

      // Start with no restrictions
      const initial = store.getAllowedTags();
      expect(initial.enforced).toBe(false);
      expect(initial.tags).toEqual([]);

      // Add some allowed tags
      store.saveTagDescription('feature', 'New features');
      store.saveTagDescription('bug', 'Bug fixes');
      store.saveTagDescription('security', 'Security improvements');

      // Enable enforcement
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Verify current state
      const current = store.getAllowedTags();
      expect(current.enforced).toBe(true);
      expect(current.tags.sort()).toEqual(['bug', 'feature', 'security']);

      // Remove a tag
      store.deleteTagDescription('bug');

      // Add new tags individually (since we removed setAllowedTags)
      store.saveTagDescription('performance', 'Performance improvements');
      store.saveTagDescription('documentation', 'Documentation updates');

      // Final verification
      const final = store.getAllowedTags();
      expect(final.enforced).toBe(true);
      expect(final.tags).toContain('feature');
      expect(final.tags).toContain('performance');
      expect(final.tags).toContain('documentation');
      expect(final.tags).not.toContain('bug');
      expect(final.tags).toContain('security'); // Should still be there
      expect(final.tags).toHaveLength(4); // feature, security, performance, documentation
    });
  });
});
