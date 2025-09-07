import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { AnchoredNotesStore } from '../src/pure-core/stores/AnchoredNotesStore';
import { InMemoryFileSystemAdapter } from './test-adapters/InMemoryFileSystemAdapter';
import { CodebaseViewsStore } from '../src/pure-core/stores/CodebaseViewsStore';
import { MemoryPalace } from '../src/MemoryPalace';
import type { ValidatedRepositoryPath, CodebaseView } from '../src/pure-core/types';

describe('Configuration System', () => {
  let fs: InMemoryFileSystemAdapter;
  let store: AnchoredNotesStore;
  let codebaseViewsStore: CodebaseViewsStore;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;

  beforeEach(() => {
    // Initialize in-memory filesystem and stores
    fs = new InMemoryFileSystemAdapter();
    store = new AnchoredNotesStore(fs);
    codebaseViewsStore = new CodebaseViewsStore(fs);

    // Set up test repository
    fs.setupTestRepo(testRepoPath);
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fs, testRepoPath);

    // Create a test view
    const testView: CodebaseView = {
      id: 'test-view',
      version: '1.0.0',
      name: 'Test View',
      description: 'Test view for testing',
      overviewPath: 'README.md',
      cells: {},
      timestamp: new Date().toISOString(),
    };
    codebaseViewsStore.saveView(validatedRepoPath, testView);
  });

  afterEach(() => {
    // Clean up is handled automatically by InMemoryFileSystemAdapter
  });

  it('should create default configuration on first access', () => {
    const config = store.getConfiguration(validatedRepoPath);

    expect(config).toEqual({
      version: 1,
      limits: {
        noteMaxLength: 500,
        maxTagsPerNote: 3,
        maxAnchorsPerNote: 5,
        tagDescriptionMaxLength: 500,
      },
      storage: {
        compressionEnabled: false,
      },
      tags: {
        enforceAllowedTags: false,
      },
      enabled_mcp_tools: {
        create_repository_note: true,
        get_notes: true,
        get_repository_tags: true,
        get_repository_types: true,
        get_repository_guidance: true,
        delete_repository_note: true,
        get_repository_note: true,
        get_stale_notes: true,
        get_tag_usage: true,
        delete_tag: true,
        replace_tag: true,
        get_note_coverage: true,
        list_codebase_views: true,
      },
    });

    // Check that configuration file was created
    const configFile = fs.join(testRepoPath, '.a24z', 'config.json');
    // The configuration file might not be created until first write
    // Let's trigger a configuration update to ensure it's created
    store.updateConfiguration(validatedRepoPath, {});
    expect(fs.exists(configFile)).toBe(true);
  });

  it('should update configuration values', () => {
    const updatedConfig = store.updateConfiguration(validatedRepoPath, {
      limits: {
        noteMaxLength: 5000,
        maxTagsPerNote: 5,
        maxAnchorsPerNote: 10,
        tagDescriptionMaxLength: 500,
      },
    });

    expect(updatedConfig.limits.noteMaxLength).toBe(5000);
    expect(updatedConfig.limits.maxTagsPerNote).toBe(5);
    expect(updatedConfig.limits.maxAnchorsPerNote).toBe(10);

    // Verify persistence
    const reloadedConfig = store.getConfiguration(validatedRepoPath);
    expect(reloadedConfig.limits.noteMaxLength).toBe(5000);
  });

  it('should validate note content length', () => {
    // Set a small note limit
    store.updateConfiguration(validatedRepoPath, {
      limits: {
        noteMaxLength: 50,
        maxTagsPerNote: 3,
        maxAnchorsPerNote: 5,
        tagDescriptionMaxLength: 500,
      },
    });

    const longNote = {
      note: 'This is a very long note that exceeds the configured limit of 50 characters and should be rejected',
      anchors: ['test.ts'],
      tags: ['test'],
      codebaseViewId: 'test-view',
      metadata: {},
      directoryPath: validatedRepoPath,
    };

    expect(() => store.saveNote(longNote)).toThrow('Validation failed: Note is too long');
  });

  it('should validate number of tags', () => {
    // Set a small tag limit
    store.updateConfiguration(validatedRepoPath, {
      limits: {
        noteMaxLength: 500,
        maxTagsPerNote: 2,
        maxAnchorsPerNote: 5,
        tagDescriptionMaxLength: 500,
      },
    });

    const manyTagsNote = {
      note: 'Test note',
      anchors: ['test.ts'],
      tags: ['tag1', 'tag2', 'tag3', 'tag4'],
      codebaseViewId: 'test-view',
      metadata: {},
      directoryPath: validatedRepoPath,
    };

    expect(() => store.saveNote(manyTagsNote)).toThrow('Validation failed: Too many tags');
  });

  it('should validate number of anchors', () => {
    // Set a small anchor limit
    store.updateConfiguration(validatedRepoPath, {
      limits: {
        noteMaxLength: 500,
        maxTagsPerNote: 3,
        maxAnchorsPerNote: 2,
        tagDescriptionMaxLength: 500,
      },
    });

    const manyAnchorsNote = {
      note: 'Test note',
      anchors: ['file1.ts', 'file2.ts', 'file3.ts'],
      tags: ['test'],
      codebaseViewId: 'test-view',
      metadata: {},
      directoryPath: validatedRepoPath,
    };

    expect(() => store.saveNote(manyAnchorsNote)).toThrow('Validation failed: Too many anchors');
  });

  it('should validate note without saving', () => {
    store.updateConfiguration(validatedRepoPath, {
      limits: {
        noteMaxLength: 50,
        maxTagsPerNote: 2,
        maxAnchorsPerNote: 5,
        tagDescriptionMaxLength: 500,
      },
    });

    const invalidNote = {
      note: 'This is a very long note that exceeds the configured limit of 50 characters',
      anchors: ['test.ts'],
      tags: ['tag1', 'tag2', 'tag3'],
      codebaseViewId: 'test-view',
      metadata: {},
      directoryPath: validatedRepoPath,
    };

    const errors = store.validateNote(invalidNote, validatedRepoPath);

    expect(errors).toHaveLength(2);
    expect(errors[0].type).toBe('noteTooLong');
    expect(errors[0].message).toContain('too long');
    expect(errors[1].type).toBe('tooManyTags');
    expect(errors[1].message).toContain('Too many tags');
  });

  it('should allow valid notes within limits', () => {
    const validNote = {
      note: 'This is a valid note within all limits',
      anchors: ['test.ts'],
      tags: ['valid', 'test'],
      codebaseViewId: 'test-view',
      metadata: {},
      directoryPath: validatedRepoPath,
    };

    expect(() => store.saveNote(validNote)).not.toThrow();
  });

  it('should handle partial configuration updates', () => {
    // First set some custom values
    store.updateConfiguration(validatedRepoPath, {
      limits: {
        noteMaxLength: 5000,
        maxTagsPerNote: 3,
        maxAnchorsPerNote: 5,
        tagDescriptionMaxLength: 500,
      },
      storage: { compressionEnabled: false },
    });

    // Then update only one value
    const updatedConfig = store.updateConfiguration(validatedRepoPath, {
      limits: {
        noteMaxLength: 500,
        maxTagsPerNote: 15,
        maxAnchorsPerNote: 5,
        tagDescriptionMaxLength: 500,
      },
    });

    // Should preserve other values
    expect(updatedConfig.limits.noteMaxLength).toBe(500); // Updated value
    expect(updatedConfig.limits.maxTagsPerNote).toBe(15);
    expect(updatedConfig.storage.compressionEnabled).toBe(false);
  });

  it('should handle corrupted configuration gracefully', () => {
    // Create a corrupted config file
    const configFile = fs.join(testRepoPath, '.a24z', 'config.json');
    const configDir = fs.join(testRepoPath, '.a24z');
    fs.createDir(configDir);
    fs.writeFile(configFile, 'invalid json content');

    // Should fall back to defaults
    const config = store.getConfiguration(validatedRepoPath);
    expect(config.limits.noteMaxLength).toBe(500); // Default value
  });

  // TODO: MCP tools configuration is not fully implemented in the current store
  // it('should update enabled_mcp_tools configuration', () => {
  //   // Disable specific tools
  //   const updatedConfig = store.updateConfiguration(validatedRepoPath, {
  //     enabled_mcp_tools: {
  //       delete_repository_note: false,
  //       get_tag_usage: false,
  //     },
  //   });

  //   // Check that tools were disabled
  //   expect(updatedConfig.enabled_mcp_tools?.delete_repository_note).toBe(false);
  //   expect(updatedConfig.enabled_mcp_tools?.get_tag_usage).toBe(false);

  //   // Check that other tools remain enabled (default)
  //   expect(updatedConfig.enabled_mcp_tools?.create_repository_note).toBe(true);
  // });

  // it('should merge enabled_mcp_tools with defaults', () => {
  //   // Create config with only some tools specified
  //   const configFile = fs.join(testRepoPath, '.a24z', 'configuration.json');
  //   const configDir = fs.join(testRepoPath, '.a24z');
  //   fs.createDir(configDir);
  //   fs.writeFile(
  //     configFile,
  //     JSON.stringify({
  //       version: 1,
  //       enabled_mcp_tools: {
  //         create_repository_note: false,
  //       },
  //     })
  //   );

  //   const config = store.getConfiguration(validatedRepoPath);

  //   // Specified tool should be disabled
  //   expect(config.enabled_mcp_tools?.create_repository_note).toBe(false);

  //   // Unspecified tools should default to true
  //   expect(config.enabled_mcp_tools?.get_notes).toBe(true);
  // });
});
