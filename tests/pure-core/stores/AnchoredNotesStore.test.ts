/**
 * Test for pure AnchoredNotesStore using InMemoryFileSystemAdapter
 * This demonstrates that the store now works without any Node.js dependencies
 */

import { AnchoredNotesStore } from '../../../src/pure-core/stores/AnchoredNotesStore';
import { InMemoryFileSystemAdapter } from '../../../src/pure-core/abstractions/filesystem';

describe('Pure AnchoredNotesStore', () => {
  let store: AnchoredNotesStore;
  let fs: InMemoryFileSystemAdapter;
  const testRepoPath = '/test-repo';

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    store = new AnchoredNotesStore(fs);
  });

  describe('Configuration Management', () => {
    it('should return default config when none exists', () => {
      const config = store.getConfiguration(testRepoPath);
      
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
          tagDescriptionMaxLength: 1500
        },
        storage: { compressionEnabled: true },
      };

      const updated = store.updateConfiguration(testRepoPath, updates);
      
      expect(updated.limits.noteMaxLength).toBe(5000);
      expect(updated.limits.maxTagsPerNote).toBe(5);
      expect(updated.limits.maxAnchorsPerNote).toBe(15);
      expect(updated.storage.compressionEnabled).toBe(true);

      // Verify it's persisted
      const loaded = store.getConfiguration(testRepoPath);
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
        directoryPath: testRepoPath,
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
      const retrieved = store.getNoteById(testRepoPath, saved.note.id);
      expect(retrieved).toEqual(saved.note);
    });

    it('should delete notes', () => {
      const noteInput = {
        note: 'Note to delete',
        anchors: ['src/delete-me.ts'],
        tags: ['temporary'],
        codebaseViewId: 'test-view',
        metadata: {},
        directoryPath: testRepoPath,
      };

      // Save and then delete
      const saved = store.saveNote(noteInput);
      const deleted = store.deleteNoteById(testRepoPath, saved.note.id);
      
      expect(deleted).toBe(true);
      
      // Verify it's gone
      const retrieved = store.getNoteById(testRepoPath, saved.note.id);
      expect(retrieved).toBe(null);
    });

    it('should return null for non-existent notes', () => {
      const result = store.getNoteById(testRepoPath, 'non-existent-id');
      expect(result).toBe(null);
    });

    it('should return false when deleting non-existent notes', () => {
      const result = store.deleteNoteById(testRepoPath, 'non-existent-id');
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
        directoryPath: testRepoPath,
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
        directoryPath: testRepoPath,
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
        directoryPath: testRepoPath,
      };

      expect(() => store.saveNote(noteInput)).toThrow('Too many tags');
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
        directoryPath: testRepoPath,
      };

      store.saveNote(noteInput);

      // Check that files were created in our in-memory filesystem
      const files = fs.getFiles();
      const configExists = Array.from(files.keys()).some(key => key.includes('config.json'));
      const noteExists = Array.from(files.keys()).some(key => key.includes('.json') && key.includes('note-'));
      
      expect(configExists).toBe(false); // No config was created (using defaults)
      expect(noteExists).toBe(true); // Note file was created
    });
  });
});