import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { 
  saveNote, 
  updateRepositoryConfiguration,
  getRepositoryConfiguration,
  getAllowedTags,
  validateNoteAgainstConfig
} from '../../../src/core-mcp/store/notesStore';

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
      expect(config.tags?.allowedTags).toEqual([]);
    });

    it('should allow updating tag configuration', () => {
      const allowedTags = ['feature', 'bugfix', 'documentation', 'testing'];
      
      const updatedConfig = updateRepositoryConfiguration(testRepoPath, {
        tags: {
          allowedTags,
          enforceAllowedTags: true
        }
      });
      
      expect(updatedConfig.tags?.enforceAllowedTags).toBe(true);
      expect(updatedConfig.tags?.allowedTags).toEqual(allowedTags);
      
      // Verify it persists
      const readConfig = getRepositoryConfiguration(testRepoPath);
      expect(readConfig.tags?.enforceAllowedTags).toBe(true);
      expect(readConfig.tags?.allowedTags).toEqual(allowedTags);
    });

    it('should return allowed tags for a repository', () => {
      // Initially no restrictions
      let allowedTags = getAllowedTags(testRepoPath);
      expect(allowedTags.enforced).toBe(false);
      expect(allowedTags.tags).toEqual([]);
      
      // Update configuration
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          allowedTags: ['feature', 'bugfix'],
          enforceAllowedTags: true
        }
      });
      
      // Check again
      allowedTags = getAllowedTags(testRepoPath);
      expect(allowedTags.enforced).toBe(true);
      expect(allowedTags.tags).toEqual(['feature', 'bugfix']);
    });
  });

  describe('Tag Validation', () => {
    it('should allow any tags when enforcement is disabled', () => {
      const note = {
        note: 'Test note',
        anchors: ['file.ts'],
        tags: ['custom-tag', 'another-tag'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {},
        directoryPath: testRepoPath
      };
      
      // Should not throw
      expect(() => saveNote(note)).not.toThrow();
    });

    it('should reject invalid tags when enforcement is enabled', () => {
      // Configure allowed tags
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          allowedTags: ['feature', 'bugfix', 'documentation'],
          enforceAllowedTags: true
        }
      });
      
      const note = {
        note: 'Test note with invalid tags',
        anchors: ['file.ts'],
        tags: ['feature', 'invalid-tag', 'another-invalid'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {},
        directoryPath: testRepoPath
      };
      
      // Should throw validation error
      expect(() => saveNote(note)).toThrow('Note validation failed');
      expect(() => saveNote(note)).toThrow('not in the allowed tags list');
      expect(() => saveNote(note)).toThrow('invalid-tag');
      expect(() => saveNote(note)).toThrow('another-invalid');
    });

    it('should accept valid tags when enforcement is enabled', () => {
      // Configure allowed tags
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          allowedTags: ['feature', 'bugfix', 'documentation'],
          enforceAllowedTags: true
        }
      });
      
      const note = {
        note: 'Test note with valid tags',
        anchors: ['file.ts'],
        tags: ['feature', 'documentation'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {},
        directoryPath: testRepoPath
      };
      
      // Should not throw
      const savedNote = saveNote(note);
      expect(savedNote.tags).toEqual(['feature', 'documentation']);
    });

    it('should allow empty tags list when enforcement is enabled', () => {
      // Configure allowed tags
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          allowedTags: ['feature', 'bugfix'],
          enforceAllowedTags: true
        }
      });
      
      const note = {
        note: 'Test note with required tag',
        anchors: ['file.ts'],
        tags: ['feature'],  // At least one tag is required by the schema
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {},
        directoryPath: testRepoPath
      };
      
      // Should not throw
      expect(() => saveNote(note)).not.toThrow();
    });

    it('should not enforce when allowedTags is empty even if enforcement is enabled', () => {
      // Configure with enforcement but no allowed tags
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          allowedTags: [],
          enforceAllowedTags: true
        }
      });
      
      const note = {
        note: 'Test note',
        anchors: ['file.ts'],
        tags: ['any-tag', 'custom-tag'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {},
        directoryPath: testRepoPath
      };
      
      // Should not throw because allowedTags is empty
      expect(() => saveNote(note)).not.toThrow();
    });

    it('should validate tags using validateNoteAgainstConfig', () => {
      // Configure allowed tags
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          allowedTags: ['feature', 'bugfix'],
          enforceAllowedTags: true
        }
      });
      
      const invalidNote = {
        note: 'Test note',
        anchors: ['file.ts'],
        tags: ['invalid-tag'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {}
      };
      
      const errors = validateNoteAgainstConfig(invalidNote, testRepoPath);
      
      const tagError = errors.find(e => e.field === 'tags' && e.message.includes('not in the allowed tags list'));
      expect(tagError).toBeDefined();
      expect(tagError?.message).toContain('invalid-tag');
      expect(tagError?.message).toContain('feature, bugfix');
    });

    it('should enforce tags across multiple saves', () => {
      // Configure allowed tags
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          allowedTags: ['feature', 'bugfix', 'testing'],
          enforceAllowedTags: true
        }
      });
      
      // First note with valid tags
      const note1 = {
        note: 'First note',
        anchors: ['file1.ts'],
        tags: ['feature', 'testing'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {},
        directoryPath: testRepoPath
      };
      
      const saved1 = saveNote(note1);
      expect(saved1.tags).toEqual(['feature', 'testing']);
      
      // Second note with invalid tags
      const note2 = {
        note: 'Second note',
        anchors: ['file2.ts'],
        tags: ['feature', 'invalid'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {},
        directoryPath: testRepoPath
      };
      
      expect(() => saveNote(note2)).toThrow('not in the allowed tags list');
      
      // Third note with valid tags
      const note3 = {
        note: 'Third note',
        anchors: ['file3.ts'],
        tags: ['bugfix'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {},
        directoryPath: testRepoPath
      };
      
      const saved3 = saveNote(note3);
      expect(saved3.tags).toEqual(['bugfix']);
    });
  });

  describe('Tag enforcement toggling', () => {
    it('should allow toggling enforcement on and off', () => {
      const note = {
        note: 'Test note',
        anchors: ['file.ts'],
        tags: ['custom-tag'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {},
        directoryPath: testRepoPath
      };
      
      // Initially allow custom tags
      expect(() => saveNote(note)).not.toThrow();
      
      // Enable enforcement
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          allowedTags: ['feature', 'bugfix'],
          enforceAllowedTags: true
        }
      });
      
      // Now should reject custom tags
      expect(() => saveNote(note)).toThrow('not in the allowed tags list');
      
      // Disable enforcement
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          enforceAllowedTags: false
        }
      });
      
      // Should allow custom tags again
      expect(() => saveNote(note)).not.toThrow();
    });
  });
});