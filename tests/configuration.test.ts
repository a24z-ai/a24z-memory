import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  saveNote,
  getRepositoryConfiguration,
  updateRepositoryConfiguration,
  validateNoteAgainstConfig,
} from '../src/core-mcp/store/notesStore';

describe('Configuration System', () => {
  let tempDir: string;
  let testRepoPath: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-config-test-'));
    testRepoPath = path.join(tempDir, 'test-repo');
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should create default configuration on first access', () => {
    const config = getRepositoryConfiguration(testRepoPath);

    expect(config).toEqual({
      version: 1,
      limits: {
        noteMaxLength: 10000,
        maxTagsPerNote: 10,
        maxAnchorsPerNote: 20,
        tagDescriptionMaxLength: 2000,
      },
      storage: {
        backupOnMigration: true,
        compressionEnabled: false,
      },
      tags: {
        enforceAllowedTags: false,
      },
      types: {
        enforceAllowedTypes: false,
      },
    });

    // Check that configuration file was created
    const configFile = path.join(testRepoPath, '.a24z', 'configuration.json');
    expect(fs.existsSync(configFile)).toBe(true);
  });

  it('should update configuration values', () => {
    const updatedConfig = updateRepositoryConfiguration(testRepoPath, {
      limits: {
        noteMaxLength: 5000,
        maxTagsPerNote: 5,
        maxAnchorsPerNote: 10,
      },
    });

    expect(updatedConfig.limits.noteMaxLength).toBe(5000);
    expect(updatedConfig.limits.maxTagsPerNote).toBe(5);
    expect(updatedConfig.limits.maxAnchorsPerNote).toBe(10);

    // Verify persistence
    const reloadedConfig = getRepositoryConfiguration(testRepoPath);
    expect(reloadedConfig.limits.noteMaxLength).toBe(5000);
  });

  it('should validate note content length', () => {
    // Set a small note limit
    updateRepositoryConfiguration(testRepoPath, {
      limits: { noteMaxLength: 50 },
    });

    const longNote = {
      note: 'This is a very long note that exceeds the configured limit of 50 characters and should be rejected',
      anchors: ['test.ts'],
      tags: ['test'],
      confidence: 'high' as const,
      type: 'explanation' as const,
      metadata: {},
      directoryPath: testRepoPath,
    };

    expect(() => saveNote(longNote)).toThrow(
      'Note validation failed: Note content is too long'
    );
  });

  it('should validate number of tags', () => {
    // Set a small tag limit
    updateRepositoryConfiguration(testRepoPath, {
      limits: { maxTagsPerNote: 2 },
    });

    const manyTagsNote = {
      note: 'Test note',
      anchors: ['test.ts'],
      tags: ['tag1', 'tag2', 'tag3', 'tag4'],
      confidence: 'high' as const,
      type: 'explanation' as const,
      metadata: {},
      directoryPath: testRepoPath,
    };

    expect(() => saveNote(manyTagsNote)).toThrow(
      'Note validation failed: Note has too many tags (4). Maximum allowed: 2'
    );
  });

  it('should validate number of anchors', () => {
    // Set a small anchor limit
    updateRepositoryConfiguration(testRepoPath, {
      limits: { maxAnchorsPerNote: 2 },
    });

    const manyAnchorsNote = {
      note: 'Test note',
      anchors: ['file1.ts', 'file2.ts', 'file3.ts'],
      tags: ['test'],
      confidence: 'high' as const,
      type: 'explanation' as const,
      metadata: {},
      directoryPath: testRepoPath,
    };

    expect(() => saveNote(manyAnchorsNote)).toThrow(
      'Note validation failed: Note has too many anchors (3). Maximum allowed: 2'
    );
  });

  it('should validate note without saving', () => {
    updateRepositoryConfiguration(testRepoPath, {
      limits: { noteMaxLength: 50, maxTagsPerNote: 2 },
    });

    const invalidNote = {
      note: 'This is a very long note that exceeds the configured limit of 50 characters',
      anchors: ['test.ts'],
      tags: ['tag1', 'tag2', 'tag3'],
      confidence: 'high' as const,
      type: 'explanation' as const,
      metadata: {},
    };

    const errors = validateNoteAgainstConfig(invalidNote, testRepoPath);

    expect(errors).toHaveLength(2);
    expect(errors[0].field).toBe('note');
    expect(errors[0].message).toContain('too long');
    expect(errors[1].field).toBe('tags');
    expect(errors[1].message).toContain('too many tags');
  });

  it('should allow valid notes within limits', () => {
    const validNote = {
      note: 'This is a valid note within all limits',
      anchors: ['test.ts'],
      tags: ['valid', 'test'],
      confidence: 'high' as const,
      type: 'explanation' as const,
      metadata: {},
      directoryPath: testRepoPath,
    };

    expect(() => saveNote(validNote)).not.toThrow();
  });

  it('should handle partial configuration updates', () => {
    // First set some custom values
    updateRepositoryConfiguration(testRepoPath, {
      limits: { noteMaxLength: 5000 },
      storage: { backupOnMigration: false },
    });

    // Then update only one value
    const updatedConfig = updateRepositoryConfiguration(testRepoPath, {
      limits: { maxTagsPerNote: 15 },
    });

    // Should preserve other values
    expect(updatedConfig.limits.noteMaxLength).toBe(5000);
    expect(updatedConfig.limits.maxTagsPerNote).toBe(15);
    expect(updatedConfig.storage.backupOnMigration).toBe(false);
  });

  it('should handle corrupted configuration gracefully', () => {
    // Create a corrupted config file
    const configFile = path.join(testRepoPath, '.a24z', 'configuration.json');
    fs.mkdirSync(path.dirname(configFile), { recursive: true });
    fs.writeFileSync(configFile, 'invalid json content');

    // Should fall back to defaults
    const config = getRepositoryConfiguration(testRepoPath);
    expect(config.limits.noteMaxLength).toBe(10000); // Default value
  });
});
