/**
 * Test for pure AnchoredNotesStore using InMemoryFileSystemAdapter
 * This demonstrates that the store now works without any Node.js dependencies
 */

import { AnchoredNotesStore } from '../../../src/pure-core/stores/AnchoredNotesStore';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { MemoryPalace } from '../../../src/MemoryPalace';
import type { ValidatedRepositoryPath } from '../../../src/pure-core/types';

describe('Pure AnchoredNotesStore', () => {
  let store: AnchoredNotesStore;
  let fs: InMemoryFileSystemAdapter;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    store = new AnchoredNotesStore(fs);

    // Set up the test repository structure
    fs.setupTestRepo(testRepoPath);

    // Validate the repository path
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fs, testRepoPath);
  });

  describe('Configuration Management', () => {
    it('should return default config when none exists', () => {
      const config = store.getConfiguration(validatedRepoPath);

      expect(config.version).toBe(1);
      expect(config.limits.noteMaxLength).toBe(500);
      expect(config.limits.maxTagsPerNote).toBe(3);
      expect(config.storage.compressionEnabled).toBe(false);
    });

    it('should save and load custom configuration', () => {
      const updates = {
        limits: {
          noteMaxLength: 5000,
          maxTagsPerNote: 5,
          maxAnchorsPerNote: 15,
          tagDescriptionMaxLength: 1500,
        },
        storage: { compressionEnabled: true },
      };

      const updated = store.updateConfiguration(validatedRepoPath, updates);

      expect(updated.limits.noteMaxLength).toBe(5000);
      expect(updated.limits.maxTagsPerNote).toBe(5);
      expect(updated.limits.maxAnchorsPerNote).toBe(15);
      expect(updated.storage.compressionEnabled).toBe(true);

      // Verify it's persisted
      const loaded = store.getConfiguration(validatedRepoPath);
      expect(loaded.limits.noteMaxLength).toBe(5000);
      expect(loaded.limits.maxAnchorsPerNote).toBe(15);
      expect(loaded.storage.compressionEnabled).toBe(true);
    });
  });

  describe('Note CRUD Operations', () => {
    it('should save and retrieve notes', () => {
      const noteInput = {
        note: 'This is a test note',
        anchors: ['src/test.ts'],
        tags: ['test', 'example'],
        codebaseViewId: 'test-view',
        metadata: { priority: 'high' },
        directoryPath: validatedRepoPath,
      };

      // Save the note
      const saved = store.saveNote(noteInput);

      expect(saved.note.note).toBe('This is a test note');
      expect(saved.note.anchors).toEqual(['src/test.ts']);
      expect(saved.note.tags).toEqual(['test', 'example']);
      expect(saved.note.codebaseViewId).toBe('test-view');
      expect(saved.note.metadata).toEqual({ priority: 'high' });
      expect(saved.note.id).toBeTruthy();
      expect(saved.note.timestamp).toBeTruthy();

      // Retrieve the note
      const retrieved = store.getNoteById(validatedRepoPath, saved.note.id);
      expect(retrieved).toEqual(saved.note);
    });

    it('should delete notes', () => {
      const noteInput = {
        note: 'Note to delete',
        anchors: ['src/delete-me.ts'],
        tags: ['temporary'],
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      // Save and then delete
      const saved = store.saveNote(noteInput);
      const deleted = store.deleteNoteById(validatedRepoPath, saved.note.id);

      expect(deleted).toBe(true);

      // Verify it's gone
      const retrieved = store.getNoteById(validatedRepoPath, saved.note.id);
      expect(retrieved).toBe(null);
    });

    it('should return null for non-existent notes', () => {
      const result = store.getNoteById(validatedRepoPath, 'non-existent-id');
      expect(result).toBe(null);
    });

    it('should return false when deleting non-existent notes', () => {
      const result = store.deleteNoteById(validatedRepoPath, 'non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate note length', () => {
      // Create a very long note
      const longNote = 'x'.repeat(11000);

      const noteInput = {
        note: longNote,
        anchors: ['src/test.ts'],
        tags: ['test'],
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      expect(() => store.saveNote(noteInput)).toThrow('Note is too long');
    });

    it('should validate anchor count', () => {
      const noteInput = {
        note: 'Test note',
        anchors: [], // No anchors
        tags: ['test'],
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      expect(() => store.saveNote(noteInput)).toThrow('Notes must have at least one anchor');
    });

    it('should validate tag count', () => {
      const noteInput = {
        note: 'Test note',
        anchors: ['src/test.ts'],
        tags: Array(12).fill('tag'), // Too many tags
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      expect(() => store.saveNote(noteInput)).toThrow('Too many tags');
    });

    it('should reject anchors with glob patterns', () => {
      const noteInput = {
        note: 'Test note',
        anchors: ['src/**/*.ts'], // Glob pattern
        tags: ['test'],
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      expect(() => store.saveNote(noteInput)).toThrow('Invalid anchor paths detected');
      expect(() => store.saveNote(noteInput)).toThrow('glob patterns');
    });

    it('should reject anchors with wildcard characters', () => {
      const noteInput = {
        note: 'Test note',
        anchors: ['src/*.ts', 'test/file?.js', 'config/[abc].json'],
        tags: ['test'],
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      expect(() => store.saveNote(noteInput)).toThrow('Invalid anchor paths detected');
    });

    it('should reject absolute paths in anchors', () => {
      const noteInput = {
        note: 'Test note',
        anchors: ['/absolute/path/file.ts'],
        tags: ['test'],
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      expect(() => store.saveNote(noteInput)).toThrow('Invalid anchor paths detected');
    });

    it('should accept valid relative paths without glob patterns', () => {
      const noteInput = {
        note: 'Test note',
        anchors: ['src/test.ts', 'lib/utils.js', 'config/app.json'],
        tags: ['test'],
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      expect(() => store.saveNote(noteInput)).not.toThrow();
    });
  });

  describe('File System Usage', () => {
    it('should use the provided file system adapter', () => {
      const noteInput = {
        note: 'Testing filesystem usage',
        anchors: ['src/test.ts'],
        tags: ['test'],
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: validatedRepoPath,
      };

      store.saveNote(noteInput);

      // Check that files were created in our in-memory filesystem
      const files = fs.getFiles();
      const configExists = Array.from(files.keys()).some((key) => key.includes('config.json'));
      const noteExists = Array.from(files.keys()).some(
        (key) => key.includes('.json') && key.includes('note-')
      );

      expect(configExists).toBe(false); // No config was created (using defaults)
      expect(noteExists).toBe(true); // Note file was created
    });
  });
});
