import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createTestView } from '../../test-helpers';
import {
  saveNote,
  removeTagFromNotes,
  deleteTagDescription,
  removeAllowedTag,
  addAllowedTag,
  getNotesForPath,
  type StoredAnchoredNote,
} from '../../../src/core-mcp/store/anchoredNotesStore';

describe('Tag Removal from Notes', () => {
  let testRepoPath: string;
  let testNote: Omit<StoredAnchoredNote, 'id' | 'timestamp'>;

  beforeEach(() => {
    // Create a temporary directory for testing
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-test-'));
    testRepoPath = tmpDir;

    // Initialize as a git repo
    fs.mkdirSync(path.join(testRepoPath, '.git'));
    createTestView(testRepoPath, 'test-view');
    // Create a basic test note template
    testNote = {
      note: 'Test note content',
      anchors: ['test.ts'],
      tags: ['feature', 'bugfix'],
      metadata: {},
      codebaseViewId: 'test-view',
    };
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  describe('removeTagFromNotes', () => {
    it('should remove a tag from all notes in the repository', () => {
      // Create multiple notes with the tag
      saveNote({ ...testNote, directoryPath: testRepoPath });
      saveNote({ ...testNote, note: 'Another note', directoryPath: testRepoPath });
      saveNote({
        ...testNote,
        note: 'Third note',
        tags: ['bugfix', 'urgent'],
        directoryPath: testRepoPath,
        codebaseViewId: 'test-view',
      });

      // Remove the 'bugfix' tag
      const modifiedCount = removeTagFromNotes(testRepoPath, 'bugfix');

      expect(modifiedCount).toBe(3);

      // Verify the tag was removed
      const notes = getNotesForPath(testRepoPath, true);
      expect(notes).toHaveLength(3);

      for (const note of notes) {
        expect(note.tags).not.toContain('bugfix');
        // 'feature' should still be there for first two notes
        if (note.note !== 'Third note') {
          expect(note.tags).toContain('feature');
        }
      }
    });

    it('should handle notes with only one tag', () => {
      // Create a note with only one tag
      saveNote({
        ...testNote,
        tags: ['bugfix'],
        directoryPath: testRepoPath,
        codebaseViewId: 'test-view',
      });

      // Remove the only tag
      const modifiedCount = removeTagFromNotes(testRepoPath, 'bugfix');

      expect(modifiedCount).toBe(1);

      const notes = getNotesForPath(testRepoPath, true);
      expect(notes[0].tags).toEqual([]);
    });

    it('should return 0 if tag does not exist', () => {
      saveNote({ ...testNote, directoryPath: testRepoPath });

      const modifiedCount = removeTagFromNotes(testRepoPath, 'nonexistent');

      expect(modifiedCount).toBe(0);
    });
  });

  describe('deleteTagDescription', () => {
    beforeEach(() => {
      // Create a note with the 'bugfix' tag
      saveNote({ ...testNote, directoryPath: testRepoPath });
    });

    it('should delete tag description and remove from notes when removeFromNotes is true', () => {
      // First add a tag description
      const tagPath = path.join(testRepoPath, '.a24z', 'tags', 'bugfix.md');
      fs.mkdirSync(path.dirname(tagPath), { recursive: true });
      fs.writeFileSync(tagPath, 'Bug fix related changes');

      // Delete with removeFromNotes = true
      const result = deleteTagDescription(testRepoPath, 'bugfix', true);

      expect(result).toBe(true);
      expect(fs.existsSync(tagPath)).toBe(false);

      // Verify tag was removed from notes
      const notes = getNotesForPath(testRepoPath, true);
      notes.forEach((note) => {
        expect(note.tags).not.toContain('bugfix');
      });
    });

    it('should delete tag description but keep in notes when removeFromNotes is false', () => {
      // First add a tag description
      const tagPath = path.join(testRepoPath, '.a24z', 'tags', 'bugfix.md');
      fs.mkdirSync(path.dirname(tagPath), { recursive: true });
      fs.writeFileSync(tagPath, 'Bug fix related changes');

      // Delete with removeFromNotes = false
      const result = deleteTagDescription(testRepoPath, 'bugfix', false);

      expect(result).toBe(true);
      expect(fs.existsSync(tagPath)).toBe(false);

      // Verify tag still exists in notes
      const notes = getNotesForPath(testRepoPath, true);
      expect(notes[0].tags).toContain('bugfix');
    });

    it('should default removeFromNotes to false', () => {
      // First add a tag description
      const tagPath = path.join(testRepoPath, '.a24z', 'tags', 'bugfix.md');
      fs.mkdirSync(path.dirname(tagPath), { recursive: true });
      fs.writeFileSync(tagPath, 'Bug fix related changes');

      // Delete without specifying removeFromNotes
      const result = deleteTagDescription(testRepoPath, 'bugfix');

      expect(result).toBe(true);

      // Tag should still be in notes (default is false)
      const notes = getNotesForPath(testRepoPath, true);
      expect(notes[0].tags).toContain('bugfix');
    });
  });

  describe('removeAllowedTag', () => {
    beforeEach(() => {
      // Create a note with the 'bugfix' tag
      saveNote({ ...testNote, directoryPath: testRepoPath });
      // Add to allowed tags
      addAllowedTag(testRepoPath, 'bugfix');
    });

    it('should remove from allowed tags and notes when removeFromNotes is true', () => {
      const result = removeAllowedTag(testRepoPath, 'bugfix', true);

      expect(result).toBe(true);

      // Tag should be removed from notes
      const notes = getNotesForPath(testRepoPath, true);
      expect(notes[0].tags).not.toContain('bugfix');
    });

    it('should remove from allowed tags but keep in notes when removeFromNotes is false', () => {
      const result = removeAllowedTag(testRepoPath, 'bugfix', false);

      expect(result).toBe(true);

      // Tag should still be in notes
      const notes = getNotesForPath(testRepoPath, true);
      expect(notes[0].tags).toContain('bugfix');
    });

    it('should return false if tag is not in allowed tags', () => {
      const result = removeAllowedTag(testRepoPath, 'nonexistent', true);

      expect(result).toBe(false);

      // Notes should remain unchanged
      const notes = getNotesForPath(testRepoPath, true);
      expect(notes[0].tags).toEqual(['feature', 'bugfix']);
    });
  });

  describe('Performance with many notes', () => {
    it('should handle removing tags from many notes efficiently', () => {
      // Create 100 notes
      for (let i = 0; i < 10; i++) {
        saveNote({
          ...testNote,
          note: `Note ${i}`,
          tags: ['common-tag', `tag-${i % 5}`],
          directoryPath: testRepoPath,
          codebaseViewId: 'test-view',
        });
      }

      // Verify initial state
      let notes = getNotesForPath(testRepoPath, true);
      expect(notes).toHaveLength(10);
      expect(notes.every((n) => n.tags.includes('common-tag'))).toBe(true);

      // Remove the common tag
      const start = Date.now();
      const modifiedCount = removeTagFromNotes(testRepoPath, 'common-tag');
      const duration = Date.now() - start;

      expect(modifiedCount).toBe(10);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      // Verify final state
      notes = getNotesForPath(testRepoPath, true);
      expect(notes).toHaveLength(10);
      expect(notes.every((n) => !n.tags.includes('common-tag'))).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty tags array after removal', () => {
      saveNote({
        ...testNote,
        tags: ['only-tag'],
        directoryPath: testRepoPath,
        codebaseViewId: 'test-view',
      });

      const modifiedCount = removeTagFromNotes(testRepoPath, 'only-tag');
      expect(modifiedCount).toBe(1);

      // Note should now have empty tags array
      const notes = getNotesForPath(testRepoPath, true);
      expect(notes[0].tags).toEqual([]);
    });

    it('should handle repository with no notes', () => {
      const modifiedCount = removeTagFromNotes(testRepoPath, 'any-tag');
      expect(modifiedCount).toBe(0);
    });
  });
});
