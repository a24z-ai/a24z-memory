import { AnchoredNotesStore } from '../../../src/pure-core/stores/AnchoredNotesStore';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { MemoryPalace } from '../../../src/MemoryPalace';
import type { ValidatedRepositoryPath } from '../../../src/pure-core/types';

describe('Note Management Functions', () => {
  let store: AnchoredNotesStore;
  let fs: InMemoryFileSystemAdapter;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;

  beforeEach(() => {
    // Initialize in-memory filesystem and store
    fs = new InMemoryFileSystemAdapter();
    store = new AnchoredNotesStore(fs);

    // Set up test repository
    fs.setupTestRepo(testRepoPath);
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fs, testRepoPath);
  });

  describe('getNoteById', () => {
    it('should retrieve a note by its ID', () => {
      // Save a test note
      const note = {
        note: 'Test note for retrieval',
        anchors: ['src/test.ts'],
        tags: ['testing', 'retrieval'],
        metadata: { testKey: 'testValue' },
        directoryPath: validatedRepoPath,
        codebaseViewId: 'test-view',
      };

      const savedNoteWithPath = store.saveNote(note);
      const savedNote = savedNoteWithPath.note;

      // Retrieve the note by ID
      const retrievedNote = store.getNoteById(validatedRepoPath, savedNote.id);

      expect(retrievedNote).toBeDefined();
      expect(retrievedNote?.id).toBe(savedNote.id);
      expect(retrievedNote?.note).toBe('Test note for retrieval');
      expect(retrievedNote?.tags).toEqual(['testing', 'retrieval']);
      expect(retrievedNote?.metadata).toEqual({ testKey: 'testValue' });
    });

    it('should return null for non-existent note ID', () => {
      const retrievedNote = store.getNoteById(validatedRepoPath, 'non-existent-id');
      expect(retrievedNote).toBeNull();
    });

    it('should handle repository with no notes', () => {
      const retrievedNote = store.getNoteById(validatedRepoPath, 'any-id');
      expect(retrievedNote).toBeNull();
    });
  });

  describe('deleteNoteById', () => {
    it('should delete a note by its ID', () => {
      // Save a test note
      const note = {
        note: 'Test note for deletion',
        anchors: ['src/delete-test.ts'],
        tags: ['testing', 'deletion'],
        metadata: {},
        directoryPath: validatedRepoPath,
        codebaseViewId: 'test-view',
      };

      const savedNoteWithPath = store.saveNote(note);
      const savedNote = savedNoteWithPath.note;

      // Verify note exists
      const existsBefore = store.getNoteById(validatedRepoPath, savedNote.id);
      expect(existsBefore).toBeDefined();

      // Delete the note
      const deleted = store.deleteNoteById(validatedRepoPath, savedNote.id);
      expect(deleted).toBe(true);

      // Verify note no longer exists
      const existsAfter = store.getNoteById(validatedRepoPath, savedNote.id);
      expect(existsAfter).toBeNull();

      // Verify the file is actually deleted
      const date = new Date(savedNote.timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const notePath = fs.join(
        testRepoPath,
        '.a24z',
        'notes',
        year.toString(),
        month,
        `${savedNote.id}.json`
      );
      expect(fs.exists(notePath)).toBe(false);
    });

    it('should return false when deleting non-existent note', () => {
      const deleted = store.deleteNoteById(validatedRepoPath, 'non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should handle multiple deletions correctly', () => {
      // Save multiple notes
      const notes = [];
      for (let i = 0; i < 3; i++) {
        const note = {
          note: `Test note ${i}`,
          anchors: [`src/test${i}.ts`],
          tags: ['testing'],
          metadata: {},
          directoryPath: validatedRepoPath,
          codebaseViewId: 'test-view',
        };
        const savedNoteWithPath = store.saveNote(note);
        notes.push(savedNoteWithPath.note);
      }

      // Delete the middle note
      const deleted = store.deleteNoteById(validatedRepoPath, notes[1].id);
      expect(deleted).toBe(true);

      // Verify the correct notes remain
      expect(store.getNoteById(validatedRepoPath, notes[0].id)).toBeDefined();
      expect(store.getNoteById(validatedRepoPath, notes[1].id)).toBeNull();
      expect(store.getNoteById(validatedRepoPath, notes[2].id)).toBeDefined();
    });
  });

  describe('checkStaleNotes', () => {
    it('should identify notes with stale anchors', () => {
      // Create some test files
      const validFile1 = fs.join(testRepoPath, 'valid1.ts');
      const validFile2 = fs.join(testRepoPath, 'valid2.ts');
      fs.writeFile(validFile1, 'content1');
      fs.writeFile(validFile2, 'content2');

      // Save notes with various anchor configurations
      const noteWithValidAnchorsWithPath = store.saveNote({
        note: 'Note with all valid anchors',
        anchors: ['valid1.ts', 'valid2.ts'],
        tags: ['valid'],
        metadata: {},
        codebaseViewId: 'test-view',
        directoryPath: validatedRepoPath,
      });
      const noteWithValidAnchors = noteWithValidAnchorsWithPath.note;

      const noteWithMixedAnchorsWithPath = store.saveNote({
        note: 'Note with mixed anchors',
        anchors: ['valid1.ts', 'stale1.ts', 'stale2.ts'],
        tags: ['mixed'],
        metadata: {},
        codebaseViewId: 'test-view',
        directoryPath: validatedRepoPath,
      });
      const noteWithMixedAnchors = noteWithMixedAnchorsWithPath.note;

      const noteWithAllStaleAnchorsWithPath = store.saveNote({
        note: 'Note with all stale anchors',
        anchors: ['stale3.ts', 'stale4.ts'],
        tags: ['stale'],
        metadata: {},
        codebaseViewId: 'test-view',
        directoryPath: validatedRepoPath,
      });
      const noteWithAllStaleAnchors = noteWithAllStaleAnchorsWithPath.note;

      // Check for stale notes
      const staleNotes = store.checkStaleAnchoredNotes(validatedRepoPath);

      // Should find 2 notes with stale anchors
      expect(staleNotes).toHaveLength(2);

      // Find the mixed anchor note
      const mixedNote = staleNotes.find((sn) => sn.note.id === noteWithMixedAnchors.id);
      expect(mixedNote).toBeDefined();
      expect(mixedNote?.staleAnchors).toEqual(['stale1.ts', 'stale2.ts']);
      expect(mixedNote?.validAnchors).toEqual(['valid1.ts']);

      // Find the all-stale note
      const allStaleNote = staleNotes.find((sn) => sn.note.id === noteWithAllStaleAnchors.id);
      expect(allStaleNote).toBeDefined();
      expect(allStaleNote?.staleAnchors).toEqual(['stale3.ts', 'stale4.ts']);
      expect(allStaleNote?.validAnchors).toEqual([]);

      // The note with all valid anchors should not be in the results
      const validNote = staleNotes.find((sn) => sn.note.id === noteWithValidAnchors.id);
      expect(validNote).toBeUndefined();
    });

    it('should return empty array when all anchors are valid', () => {
      // Create test files
      const file1 = fs.join(testRepoPath, 'file1.ts');
      const file2 = fs.join(testRepoPath, 'file2.ts');
      fs.writeFile(file1, 'content');
      fs.writeFile(file2, 'content');

      // Save notes with valid anchors
      store.saveNote({
        note: 'Note 1',
        anchors: ['file1.ts'],
        tags: ['test'],
        metadata: {},
        codebaseViewId: 'test-view',
        directoryPath: validatedRepoPath,
      });

      store.saveNote({
        note: 'Note 2',
        anchors: ['file2.ts'],
        tags: ['test'],
        metadata: {},
        codebaseViewId: 'test-view',
        directoryPath: validatedRepoPath,
      });

      const staleNotes = store.checkStaleAnchoredNotes(validatedRepoPath);
      expect(staleNotes).toEqual([]);
    });

    it('should handle directories as anchors', () => {
      // Create a directory
      const testDir = fs.join(testRepoPath, 'src');
      fs.createDir(testDir);

      // Save notes with directory anchors
      store.saveNote({
        note: 'Note with valid directory anchor',
        anchors: ['src'],
        tags: ['directory'],
        metadata: {},
        codebaseViewId: 'test-view',
        directoryPath: validatedRepoPath,
      });

      const noteWithStaleDirWithPath = store.saveNote({
        note: 'Note with stale directory anchor',
        anchors: ['non-existent-dir'],
        tags: ['directory'],
        metadata: {},
        codebaseViewId: 'test-view',
        directoryPath: validatedRepoPath,
      });
      const noteWithStaleDir = noteWithStaleDirWithPath.note;

      const staleNotes = store.checkStaleAnchoredNotes(validatedRepoPath);

      // Should only find the note with stale directory
      expect(staleNotes).toHaveLength(1);
      expect(staleNotes[0].note.id).toBe(noteWithStaleDir.id);
      expect(staleNotes[0].staleAnchors).toEqual(['non-existent-dir']);
    });

    it('should handle empty repository', () => {
      const staleNotes = store.checkStaleAnchoredNotes(validatedRepoPath);
      expect(staleNotes).toEqual([]);
    });
  });
});
