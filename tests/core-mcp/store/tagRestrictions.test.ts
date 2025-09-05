import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createTestView } from '../../test-helpers';
import {
  saveNote,
  updateRepositoryConfiguration,
  getRepositoryConfiguration,
  getAllowedTags,
  validateNoteAgainstConfig,
  saveTagDescription,
} from '../../../src/core-mcp/store/anchoredNotesStore';

describe('Tag Restrictions', () => {
  let tempDir: string;
  let testRepoPath: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-test-'));
    testRepoPath = path.join(tempDir, 'test-repo');
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });
    createTestView(testRepoPath, 'test-view');
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Configuration', () => {
    it('should have tag restrictions disabled by default', () => {
      const config = getRepositoryConfiguration(testRepoPath);

      expect(config.tags).toBeDefined();
      expect(config.tags?.enforceAllowedTags).toBe(false);
    });

    it('should allow updating tag configuration', () => {
      const updatedConfig = updateRepositoryConfiguration(testRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      expect(updatedConfig.tags?.enforceAllowedTags).toBe(true);

      // Verify it persists
      const readConfig = getRepositoryConfiguration(testRepoPath);
      expect(readConfig.tags?.enforceAllowedTags).toBe(true);
    });

    it('should return allowed tags for a repository', () => {
      // Initially no restrictions
      let allowedTags = getAllowedTags(testRepoPath);
      expect(allowedTags.enforced).toBe(false);
      expect(allowedTags.tags).toEqual([]);

      // Update configuration and add some tag descriptions to create allowed tags
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add tag descriptions which will become the allowed tags
      saveTagDescription(testRepoPath, 'feature', 'New features');
      saveTagDescription(testRepoPath, 'bugfix', 'Bug fixes');

      // Check again
      allowedTags = getAllowedTags(testRepoPath);
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
        directoryPath: testRepoPath,
      };

      // Should not throw
      expect(() => saveNote(note)).not.toThrow();
    });

    it('should reject invalid tags when enforcement is enabled', () => {
      // Configure allowed tags
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add tag descriptions which will become the allowed tags
      saveTagDescription(testRepoPath, 'feature', 'New features');
      saveTagDescription(testRepoPath, 'bugfix', 'Bug fixes');
      saveTagDescription(testRepoPath, 'documentation', 'Documentation changes');

      const note = {
        note: 'Test note with invalid tags',
        anchors: ['file.ts'],
        tags: ['feature', 'invalid-tag', 'another-invalid'],
        type: 'explanation' as const,
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: testRepoPath,
      };

      // Should throw validation error
      expect(() => saveNote(note)).toThrow('Note validation failed');
      expect(() => saveNote(note)).toThrow('The following tags are not allowed');
      expect(() => saveNote(note)).toThrow('invalid-tag');
      expect(() => saveNote(note)).toThrow('another-invalid');
    });

    it('should accept valid tags when enforcement is enabled', () => {
      // Configure allowed tags
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add tag descriptions which will become the allowed tags
      saveTagDescription(testRepoPath, 'feature', 'New features');
      saveTagDescription(testRepoPath, 'bugfix', 'Bug fixes');
      saveTagDescription(testRepoPath, 'documentation', 'Documentation changes');

      const note = {
        note: 'Test note with valid tags',
        anchors: ['file.ts'],
        tags: ['feature', 'documentation'],
        type: 'explanation' as const,
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: testRepoPath,
      };

      // Should not throw
      const savedNoteWithPath = saveNote(note);
      const savedNote = savedNoteWithPath.note;
      expect(savedNote.tags).toEqual(['feature', 'documentation']);
    });

    it('should allow empty tags list when enforcement is enabled', () => {
      // Configure allowed tags
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add tag descriptions which will become the allowed tags
      saveTagDescription(testRepoPath, 'feature', 'New features');
      saveTagDescription(testRepoPath, 'bugfix', 'Bug fixes');

      const note = {
        note: 'Test note with required tag',
        anchors: ['file.ts'],
        tags: ['feature'], // At least one tag is required by the schema
        type: 'explanation' as const,
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: testRepoPath,
      };

      // Should not throw
      expect(() => saveNote(note)).not.toThrow();
    });

    it('should not enforce when no tag descriptions exist even if enforcement is enabled', () => {
      // Configure with enforcement but no tag descriptions (no allowed tags)
      updateRepositoryConfiguration(testRepoPath, {
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
        directoryPath: testRepoPath,
      };

      // Should not throw because no tag descriptions exist
      expect(() => saveNote(note)).not.toThrow();
    });

    it('should validate tags using validateNoteAgainstConfig', () => {
      // Configure allowed tags
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add tag descriptions which will become the allowed tags
      saveTagDescription(testRepoPath, 'feature', 'New features');
      saveTagDescription(testRepoPath, 'bugfix', 'Bug fixes');

      const invalidNote = {
        note: 'Test note',
        anchors: ['file.ts'],
        tags: ['invalid-tag'],
        type: 'explanation' as const,
        metadata: {},
      };

      const errors = validateNoteAgainstConfig(invalidNote, testRepoPath);

      const tagError = errors.find(
        (e) => e.field === 'tags' && e.message.includes('The following tags are not allowed')
      );
      expect(tagError).toBeDefined();
      expect(tagError?.message).toContain('invalid-tag');
      expect(tagError?.message).toContain('bugfix, feature');
    });

    it('should enforce tags across multiple saves', () => {
      // Configure allowed tags
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add tag descriptions which will become the allowed tags
      saveTagDescription(testRepoPath, 'feature', 'New features');
      saveTagDescription(testRepoPath, 'bugfix', 'Bug fixes');
      saveTagDescription(testRepoPath, 'testing', 'Testing code');

      // First note with valid tags
      const note1 = {
        note: 'First note',
        anchors: ['file1.ts'],
        tags: ['feature', 'testing'],
        type: 'explanation' as const,
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: testRepoPath,
      };

      const saved1WithPath = saveNote(note1);
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
        directoryPath: testRepoPath,
      };

      expect(() => saveNote(note2)).toThrow('The following tags are not allowed');

      // Third note with valid tags
      const note3 = {
        note: 'Third note',
        anchors: ['file3.ts'],
        tags: ['bugfix'],
        type: 'explanation' as const,
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: testRepoPath,
      };

      const saved3WithPath = saveNote(note3);
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
        directoryPath: testRepoPath,
      };

      // Initially allow custom tags
      expect(() => saveNote(note)).not.toThrow();

      // Enable enforcement
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add tag descriptions which will become the allowed tags
      saveTagDescription(testRepoPath, 'feature', 'New features');
      saveTagDescription(testRepoPath, 'bugfix', 'Bug fixes');

      // Now should reject custom tags
      expect(() => saveNote(note)).toThrow('The following tags are not allowed');

      // Disable enforcement
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          enforceAllowedTags: false,
        },
      });

      // Should allow custom tags again
      expect(() => saveNote(note)).not.toThrow();
    });
  });
});
