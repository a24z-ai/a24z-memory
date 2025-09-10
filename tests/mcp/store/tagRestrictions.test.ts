import { describe, it, expect, beforeEach } from 'bun:test';
import { AnchoredNotesStore } from '../../../src/pure-core/stores/AnchoredNotesStore';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { MemoryPalace } from '../../../src/MemoryPalace';
import type {
  ValidatedRepositoryPath,
  ValidatedAlexandriaPath,
} from '../../../src/pure-core/types';

describe('Tag Restrictions', () => {
  let store: AnchoredNotesStore;
  let fs: InMemoryFileSystemAdapter;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;
  let alexandriaPath: ValidatedAlexandriaPath;

  beforeEach(() => {
    // Initialize in-memory filesystem
    fs = new InMemoryFileSystemAdapter();

    // Set up the test repository structure
    fs.setupTestRepo(testRepoPath);

    // Validate the repository path and get alexandria path
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fs, testRepoPath);
    alexandriaPath = MemoryPalace.getAlexandriaPath(validatedRepoPath, fs);

    // Create store with alexandria path
    store = new AnchoredNotesStore(fs, alexandriaPath);
  });

  describe('Configuration', () => {
    it('should have tag restrictions disabled by default', () => {
      const config = store.getConfiguration();

      expect(config.tags).toBeDefined();
      expect(config.tags?.enforceAllowedTags).toBe(false);
    });

    it('should allow updating tag configuration', () => {
      const updatedConfig = store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      expect(updatedConfig.tags?.enforceAllowedTags).toBe(true);

      // Verify it persists
      const readConfig = store.getConfiguration();
      expect(readConfig.tags?.enforceAllowedTags).toBe(true);
    });

    it('should return allowed tags for a repository', () => {
      // Initially no restrictions
      let allowedTags = store.getAllowedTags();
      expect(allowedTags.enforced).toBe(false);
      expect(allowedTags.tags).toEqual([]);

      // Update configuration and add some tag descriptions to create allowed tags
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add tag descriptions which will become the allowed tags
      store.saveTagDescription('feature', 'New features');
      store.saveTagDescription('bugfix', 'Bug fixes');

      // Check again
      allowedTags = store.getAllowedTags();
      expect(allowedTags.enforced).toBe(true);
      expect(allowedTags.tags.sort()).toEqual(['bugfix', 'feature']);
    });
  });

  describe('Tag Validation', () => {
    it('should allow any tags when enforcement is disabled', () => {
      const note = {
        note: 'Test note',
        anchors: ['file.ts'],
        tags: ['custom-tag', 'another-tag'],
        type: 'explanation' as const,
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      // Should not throw
      expect(() => store.saveNote(note)).not.toThrow();
    });

    it('should reject invalid tags when enforcement is enabled', () => {
      // Configure allowed tags
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add tag descriptions which will become the allowed tags
      store.saveTagDescription('feature', 'New features');
      store.saveTagDescription('bugfix', 'Bug fixes');
      store.saveTagDescription('documentation', 'Documentation changes');

      const note = {
        note: 'Test note with invalid tags',
        anchors: ['file.ts'],
        tags: ['feature', 'invalid-tag', 'another-invalid'],
        type: 'explanation' as const,
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      // Should throw validation error
      expect(() => store.saveNote(note)).toThrow('Validation failed');
      expect(() => store.saveNote(note)).toThrow('The following tags are not allowed');
      expect(() => store.saveNote(note)).toThrow('invalid-tag');
      expect(() => store.saveNote(note)).toThrow('another-invalid');
    });

    it('should accept valid tags when enforcement is enabled', () => {
      // Configure allowed tags
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add tag descriptions which will become the allowed tags
      store.saveTagDescription('feature', 'New features');
      store.saveTagDescription('bugfix', 'Bug fixes');
      store.saveTagDescription('documentation', 'Documentation changes');

      const note = {
        note: 'Test note with valid tags',
        anchors: ['file.ts'],
        tags: ['feature', 'documentation'],
        type: 'explanation' as const,
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      // Should not throw
      const savedNoteWithPath = store.saveNote(note);
      const savedNote = savedNoteWithPath.note;
      expect(savedNote.tags).toEqual(['feature', 'documentation']);
    });

    it('should allow empty tags list when enforcement is enabled', () => {
      // Configure allowed tags
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add tag descriptions which will become the allowed tags
      store.saveTagDescription('feature', 'New features');
      store.saveTagDescription('bugfix', 'Bug fixes');

      const note = {
        note: 'Test note with required tag',
        anchors: ['file.ts'],
        tags: ['feature'], // At least one tag is required by the schema
        type: 'explanation' as const,
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      // Should not throw
      expect(() => store.saveNote(note)).not.toThrow();
    });

    it('should not enforce when no tag descriptions exist even if enforcement is enabled', () => {
      // Configure with enforcement but no tag descriptions (no allowed tags)
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      const note = {
        note: 'Test note',
        anchors: ['file.ts'],
        tags: ['any-tag', 'custom-tag'],
        type: 'explanation' as const,
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      // Should not throw because no tag descriptions exist
      expect(() => store.saveNote(note)).not.toThrow();
    });

    it('should validate tags using validateNote', () => {
      // Configure allowed tags
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add tag descriptions which will become the allowed tags
      store.saveTagDescription('feature', 'New features');
      store.saveTagDescription('bugfix', 'Bug fixes');

      const invalidNote = {
        note: 'Test note',
        anchors: ['file.ts'],
        tags: ['invalid-tag'],
        type: 'explanation' as const,
        codebaseViewId: 'test-view',
        metadata: {},
      };

      const errors = store.validateNote(invalidNote, validatedRepoPath);

      const tagError = errors.find(
        (e) => e.type === 'invalidTags' && e.message.includes('The following tags are not allowed')
      );
      expect(tagError).toBeDefined();
      expect(tagError?.message).toContain('invalid-tag');
      expect(tagError?.message).toContain('feature');
      expect(tagError?.message).toContain('bugfix');
    });

    it('should enforce tags across multiple saves', () => {
      // Configure allowed tags
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add tag descriptions which will become the allowed tags
      store.saveTagDescription('feature', 'New features');
      store.saveTagDescription('bugfix', 'Bug fixes');
      store.saveTagDescription('testing', 'Testing code');

      // First note with valid tags
      const note1 = {
        note: 'First note',
        anchors: ['file1.ts'],
        tags: ['feature', 'testing'],
        type: 'explanation' as const,
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      const saved1WithPath = store.saveNote(note1);
      const saved1 = saved1WithPath.note;
      expect(saved1.tags).toEqual(['feature', 'testing']);

      // Second note with invalid tags
      const note2 = {
        note: 'Second note',
        anchors: ['file2.ts'],
        tags: ['feature', 'invalid'],
        type: 'explanation' as const,
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      expect(() => store.saveNote(note2)).toThrow('Validation failed');

      // Third note with valid tags
      const note3 = {
        note: 'Third note',
        anchors: ['file3.ts'],
        tags: ['bugfix'],
        type: 'explanation' as const,
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      const saved3WithPath = store.saveNote(note3);
      const saved3 = saved3WithPath.note;
      expect(saved3.tags).toEqual(['bugfix']);
    });
  });

  describe('Tag enforcement toggling', () => {
    it('should allow toggling enforcement on and off', () => {
      const note = {
        note: 'Test note',
        anchors: ['file.ts'],
        tags: ['custom-tag'],
        type: 'explanation' as const,
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      // Initially allow custom tags
      expect(() => store.saveNote(note)).not.toThrow();

      // Enable enforcement
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add tag descriptions which will become the allowed tags
      store.saveTagDescription('feature', 'New features');
      store.saveTagDescription('bugfix', 'Bug fixes');

      // Now should reject custom tags
      expect(() => store.saveNote(note)).toThrow('Validation failed');

      // Disable enforcement
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: false,
        },
      });

      // Should allow custom tags again
      expect(() => store.saveNote(note)).not.toThrow();
    });
  });
});
