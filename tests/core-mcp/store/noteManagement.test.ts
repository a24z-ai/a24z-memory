import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  saveNote,
  getNoteById,
  deleteNoteById,
  checkStaleNotes,
} from '../../../src/core-mcp/store/notesStore';

describe('Note Management Functions', () => {
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

  describe('getNoteById', () => {
    it('should retrieve a note by its ID', () => {
      // Save a test note
      const note = {
        note: 'Test note for retrieval',
        anchors: ['src/test.ts'],
        tags: ['testing', 'retrieval'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: { testKey: 'testValue' },
        directoryPath: testRepoPath,
      };

      const savedNote = saveNote(note);

      // Retrieve the note by ID
      const retrievedNote = getNoteById(testRepoPath, savedNote.id);

      expect(retrievedNote).toBeDefined();
      expect(retrievedNote?.id).toBe(savedNote.id);
      expect(retrievedNote?.note).toBe('Test note for retrieval');
      expect(retrievedNote?.tags).toEqual(['testing', 'retrieval']);
      expect(retrievedNote?.metadata).toEqual({ testKey: 'testValue' });
    });

    it('should return null for non-existent note ID', () => {
      const retrievedNote = getNoteById(testRepoPath, 'non-existent-id');
      expect(retrievedNote).toBeNull();
    });

    it('should handle repository with no notes', () => {
      const retrievedNote = getNoteById(testRepoPath, 'any-id');
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
        confidence: 'medium' as const,
        type: 'gotcha' as const,
        metadata: {},
        directoryPath: testRepoPath,
      };

      const savedNote = saveNote(note);

      // Verify note exists
      const existsBefore = getNoteById(testRepoPath, savedNote.id);
      expect(existsBefore).toBeDefined();

      // Delete the note
      const deleted = deleteNoteById(testRepoPath, savedNote.id);
      expect(deleted).toBe(true);

      // Verify note no longer exists
      const existsAfter = getNoteById(testRepoPath, savedNote.id);
      expect(existsAfter).toBeNull();

      // Verify the file is actually deleted
      const date = new Date(savedNote.timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const notePath = path.join(
        testRepoPath,
        '.a24z',
        'notes',
        year.toString(),
        month,
        `${savedNote.id}.json`
      );
      expect(fs.existsSync(notePath)).toBe(false);
    });

    it('should return false when deleting non-existent note', () => {
      const deleted = deleteNoteById(testRepoPath, 'non-existent-id');
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
          confidence: 'high' as const,
          type: 'explanation' as const,
          metadata: {},
          directoryPath: testRepoPath,
        };
        notes.push(saveNote(note));
      }

      // Delete the middle note
      const deleted = deleteNoteById(testRepoPath, notes[1].id);
      expect(deleted).toBe(true);

      // Verify the correct notes remain
      expect(getNoteById(testRepoPath, notes[0].id)).toBeDefined();
      expect(getNoteById(testRepoPath, notes[1].id)).toBeNull();
      expect(getNoteById(testRepoPath, notes[2].id)).toBeDefined();
    });
  });

  describe('checkStaleNotes', () => {
    it('should identify notes with stale anchors', () => {
      // Create some test files
      const validFile1 = path.join(testRepoPath, 'valid1.ts');
      const validFile2 = path.join(testRepoPath, 'valid2.ts');
      fs.writeFileSync(validFile1, 'content1');
      fs.writeFileSync(validFile2, 'content2');

      // Save notes with various anchor configurations
      const noteWithValidAnchors = saveNote({
        note: 'Note with all valid anchors',
        anchors: ['valid1.ts', 'valid2.ts'],
        tags: ['valid'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {},
        directoryPath: testRepoPath,
      });

      const noteWithMixedAnchors = saveNote({
        note: 'Note with mixed anchors',
        anchors: ['valid1.ts', 'stale1.ts', 'stale2.ts'],
        tags: ['mixed'],
        confidence: 'medium' as const,
        type: 'gotcha' as const,
        metadata: {},
        directoryPath: testRepoPath,
      });

      const noteWithAllStaleAnchors = saveNote({
        note: 'Note with all stale anchors',
        anchors: ['stale3.ts', 'stale4.ts'],
        tags: ['stale'],
        confidence: 'low' as const,
        type: 'pattern' as const,
        metadata: {},
        directoryPath: testRepoPath,
      });

      // Check for stale notes
      const staleNotes = checkStaleNotes(testRepoPath);

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
      const file1 = path.join(testRepoPath, 'file1.ts');
      const file2 = path.join(testRepoPath, 'file2.ts');
      fs.writeFileSync(file1, 'content');
      fs.writeFileSync(file2, 'content');

      // Save notes with valid anchors
      saveNote({
        note: 'Note 1',
        anchors: ['file1.ts'],
        tags: ['test'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {},
        directoryPath: testRepoPath,
      });

      saveNote({
        note: 'Note 2',
        anchors: ['file2.ts'],
        tags: ['test'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {},
        directoryPath: testRepoPath,
      });

      const staleNotes = checkStaleNotes(testRepoPath);
      expect(staleNotes).toEqual([]);
    });

    it('should handle directories as anchors', () => {
      // Create a directory
      const testDir = path.join(testRepoPath, 'src');
      fs.mkdirSync(testDir, { recursive: true });

      // Save notes with directory anchors
      saveNote({
        note: 'Note with valid directory anchor',
        anchors: ['src'],
        tags: ['directory'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {},
        directoryPath: testRepoPath,
      });

      const noteWithStaleDir = saveNote({
        note: 'Note with stale directory anchor',
        anchors: ['non-existent-dir'],
        tags: ['directory'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {},
        directoryPath: testRepoPath,
      });

      const staleNotes = checkStaleNotes(testRepoPath);

      // Should only find the note with stale directory
      expect(staleNotes).toHaveLength(1);
      expect(staleNotes[0].note.id).toBe(noteWithStaleDir.id);
      expect(staleNotes[0].staleAnchors).toEqual(['non-existent-dir']);
    });

    it('should handle empty repository', () => {
      const staleNotes = checkStaleNotes(testRepoPath);
      expect(staleNotes).toEqual([]);
    });
  });
});
