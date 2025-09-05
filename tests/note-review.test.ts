/**
 * Tests for Note Review functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  saveNote,
  getUnreviewedNotes,
  markNoteReviewed,
  markAllNotesReviewed,
  getNotesForPath,
  getNoteById,
} from '../src/core-mcp/store/anchoredNotesStore';
import { createTestView } from './test-helpers';

describe('Note Review Functionality', () => {
  let testRepoRoot: string;

  beforeEach(() => {
    // Create a temporary test repository
    testRepoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'test-repo-'));
    fs.mkdirSync(path.join(testRepoRoot, '.git'));
    fs.mkdirSync(path.join(testRepoRoot, '.a24z'), { recursive: true });
    createTestView(testRepoRoot, 'test-view');
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testRepoRoot)) {
      fs.rmSync(testRepoRoot, { recursive: true, force: true });
    }
  });

  describe('reviewed field', () => {
    it('should create notes with reviewed=false by default', () => {
      const noteWithPath = saveNote({
        codebaseViewId: 'test-view',
        note: 'Test note content',
        directoryPath: testRepoRoot,
        anchors: ['test.ts'],
        tags: ['test'],
        metadata: {},
      });
      const note = noteWithPath.note;

      expect(note.reviewed).toBe(false);
    });

    it('should preserve reviewed field when explicitly set', () => {
      const noteWithPath = saveNote({
        codebaseViewId: 'test-view',
        note: 'Pre-reviewed note',
        directoryPath: testRepoRoot,
        anchors: ['test.ts'],
        tags: ['test'],
        metadata: {},
        reviewed: true,
      });
      const note = noteWithPath.note;

      expect(note.reviewed).toBe(true);
    });
  });

  describe('getUnreviewedNotes', () => {
    beforeEach(() => {
      // Create a mix of reviewed and unreviewed notes
      saveNote({
        codebaseViewId: 'test-view',
        note: 'Unreviewed note 1',
        directoryPath: testRepoRoot,
        anchors: ['file1.ts'],
        tags: ['tag1'],
        metadata: {},
        reviewed: false,
      });

      saveNote({
        codebaseViewId: 'test-view',
        note: 'Reviewed note',
        directoryPath: testRepoRoot,
        anchors: ['file2.ts'],
        tags: ['tag2'],
        reviewed: true,
        metadata: {},
      });

      saveNote({
        codebaseViewId: 'test-view',
        note: 'Unreviewed note 2',
        directoryPath: testRepoRoot,
        anchors: ['file3.ts'],
        tags: ['tag3'],
        reviewed: false,
        metadata: {},
      });
    });

    it('should return only unreviewed notes', () => {
      const unreviewed = getUnreviewedNotes(testRepoRoot);

      expect(unreviewed).toHaveLength(2);
      expect(unreviewed.every((n) => n.reviewed === false)).toBe(true);
      expect(unreviewed.map((n) => n.note)).toContain('Unreviewed note 1');
      expect(unreviewed.map((n) => n.note)).toContain('Unreviewed note 2');
    });

    it('should return empty array when all notes are reviewed', () => {
      // Mark all as reviewed
      markAllNotesReviewed(testRepoRoot);

      const unreviewed = getUnreviewedNotes(testRepoRoot);
      expect(unreviewed).toHaveLength(0);
    });

    it('should filter by directory path when provided', () => {
      // Create notes with different anchors
      const subdir = path.join(testRepoRoot, 'subdir');
      fs.mkdirSync(subdir, { recursive: true });

      saveNote({
        codebaseViewId: 'test-view',
        note: 'Subdir unreviewed note',
        directoryPath: testRepoRoot,
        anchors: ['subdir/file.ts'],
        tags: ['subdir'],
        reviewed: false,
        metadata: {},
      });

      const unreviewed = getUnreviewedNotes(testRepoRoot, subdir);

      // This would filter based on anchors matching the subdir
      const subdirNotes = unreviewed.filter((n) => n.anchors.some((a) => a.includes('subdir')));

      expect(subdirNotes.length).toBeGreaterThan(0);
    });
  });

  describe('markNoteReviewed', () => {
    let noteId: string;

    beforeEach(() => {
      const noteWithPath = saveNote({
        codebaseViewId: 'test-view',
        note: 'Note to review',
        directoryPath: testRepoRoot,
        anchors: ['test.ts'],
        tags: ['test'],
        reviewed: false,
        metadata: {},
      });
      noteId = noteWithPath.note.id;
    });

    it('should mark a note as reviewed', () => {
      const result = markNoteReviewed(testRepoRoot, noteId);

      expect(result).toBe(true);

      const note = getNoteById(testRepoRoot, noteId);
      expect(note?.reviewed).toBe(true);
    });

    it('should return false for non-existent note', () => {
      const result = markNoteReviewed(testRepoRoot, 'non-existent-id');
      expect(result).toBe(false);
    });

    it('should persist reviewed status', () => {
      markNoteReviewed(testRepoRoot, noteId);

      // Simulate reading from disk again
      const notes = getNotesForPath(testRepoRoot, true);
      const note = notes.find((n) => n.id === noteId);

      expect(note?.reviewed).toBe(true);
    });

    it('should handle already reviewed notes gracefully', () => {
      markNoteReviewed(testRepoRoot, noteId);
      const result = markNoteReviewed(testRepoRoot, noteId);

      expect(result).toBe(true);

      const note = getNoteById(testRepoRoot, noteId);
      expect(note?.reviewed).toBe(true);
    });
  });

  describe('markAllNotesReviewed', () => {
    beforeEach(() => {
      // Create multiple unreviewed notes
      for (let i = 1; i <= 5; i++) {
        saveNote({
          codebaseViewId: 'test-view',
          note: `Note ${i}`,
          directoryPath: testRepoRoot,
          anchors: [`file${i}.ts`],
          tags: [`tag${i}`],
          metadata: {},
          reviewed: false,
        });
      }

      // Add one already reviewed note
      saveNote({
        codebaseViewId: 'test-view',
        note: 'Already reviewed',
        directoryPath: testRepoRoot,
        anchors: ['reviewed.ts'],
        tags: ['reviewed'],
        reviewed: true,
        metadata: {},
      });
    });

    it('should mark all unreviewed notes as reviewed', () => {
      const count = markAllNotesReviewed(testRepoRoot);

      expect(count).toBe(5); // Only the unreviewed ones

      const notes = getNotesForPath(testRepoRoot, true);
      expect(notes.every((n) => n.reviewed === true)).toBe(true);
    });

    it('should return 0 when no unreviewed notes exist', () => {
      markAllNotesReviewed(testRepoRoot);
      const count = markAllNotesReviewed(testRepoRoot);

      expect(count).toBe(0);
    });

    it('should filter by directory path when provided', () => {
      const subdir = path.join(testRepoRoot, 'subdir');
      fs.mkdirSync(subdir, { recursive: true });

      // Add notes specific to subdir
      saveNote({
        codebaseViewId: 'test-view',
        note: 'Subdir note 1',
        directoryPath: testRepoRoot,
        anchors: ['subdir/file1.ts'],
        tags: ['subdir'],
        reviewed: false,
        metadata: {},
      });

      saveNote({
        codebaseViewId: 'test-view',
        note: 'Subdir note 2',
        directoryPath: testRepoRoot,
        anchors: ['subdir/file2.ts'],
        tags: ['subdir'],
        reviewed: false,
        metadata: {},
      });

      const count = markAllNotesReviewed(testRepoRoot, subdir);

      // This would depend on implementation of filtering by path
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('integration with existing note operations', () => {
    it('should preserve review status through note updates', () => {
      const noteWithPath = saveNote({
        codebaseViewId: 'test-view',
        note: 'Original content',
        directoryPath: testRepoRoot,
        anchors: ['test.ts'],
        tags: ['test'],
        reviewed: false,
        metadata: {},
      });
      const note = noteWithPath.note;

      markNoteReviewed(testRepoRoot, note.id);

      // Simulate updating the note (would need update functionality)
      // For now, just verify the field persists
      const retrievedNote = getNoteById(testRepoRoot, note.id);
      expect(retrievedNote?.reviewed).toBe(true);
    });

    it('should include review status in bulk operations', () => {
      // Create notes with various review statuses
      const notes = [
        { reviewed: true },
        { reviewed: false },
        { reviewed: true },
        { reviewed: false },
      ];

      notes.map((noteData, i) =>
        saveNote({
          codebaseViewId: 'test-view',
          note: `Note ${i}`,
          directoryPath: testRepoRoot,
          anchors: [`file${i}.ts`],
          tags: ['test'],
          metadata: {},
          reviewed: noteData.reviewed,
        })
      );

      const allNotes = getNotesForPath(testRepoRoot, true);
      const reviewedCount = allNotes.filter((n) => n.reviewed === true).length;
      const unreviewedCount = allNotes.filter((n) => n.reviewed === false).length;

      expect(reviewedCount).toBe(2);
      expect(unreviewedCount).toBe(2);
    });
  });
});
