import { AnchoredNotesStore } from '../../../src/pure-core/stores/AnchoredNotesStore';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { MemoryPalace } from '../../../src/MemoryPalace';
import type {
  ValidatedRepositoryPath,
  ValidatedRelativePath,
  StoredAnchoredNote,
} from '../../../src/pure-core/types';

describe('Tag Removal from Notes', () => {
  let store: AnchoredNotesStore;
  let fsAdapter: InMemoryFileSystemAdapter;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;
  let testNote: Omit<StoredAnchoredNote, 'id' | 'timestamp'>;

  beforeEach(() => {
    // Initialize in-memory filesystem and store
    fsAdapter = new InMemoryFileSystemAdapter();
    store = new AnchoredNotesStore(fsAdapter);

    // Set up test repository
    fsAdapter.setupTestRepo(testRepoPath);
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fsAdapter, testRepoPath);

    // Create a basic test note template
    testNote = {
      note: 'Test note content',
      anchors: ['test.ts'],
      tags: ['feature', 'bugfix'],
      metadata: {},
      codebaseViewId: 'test-view',
    };
  });

  describe('removeTagFromNotes', () => {
    it('should remove a tag from all notes in the repository', () => {
      // Create multiple notes with the tag
      store.saveNote({ ...testNote, directoryPath: validatedRepoPath });
      store.saveNote({ ...testNote, note: 'Another note', directoryPath: validatedRepoPath });
      store.saveNote({
        ...testNote,
        note: 'Third note',
        tags: ['bugfix', 'urgent'],
        directoryPath: validatedRepoPath,
        codebaseViewId: 'test-view',
      });

      // Remove the 'bugfix' tag
      const modifiedCount = store.removeTagFromNotes(validatedRepoPath, 'bugfix');

      expect(modifiedCount).toBe(3);

      // Verify the tag was removed
      const rootPath = '' as ValidatedRelativePath;
      const notes = store.getNotesForPath(validatedRepoPath, rootPath, true);
      expect(notes).toHaveLength(3);

      for (const noteWithPath of notes) {
        expect(noteWithPath.note.tags).not.toContain('bugfix');
        // 'feature' should still be there for first two notes
        if (noteWithPath.note.note !== 'Third note') {
          expect(noteWithPath.note.tags).toContain('feature');
        }
      }
    });

    it('should handle notes with only one tag', () => {
      // Create a note with only one tag
      store.saveNote({
        ...testNote,
        tags: ['bugfix'],
        directoryPath: validatedRepoPath,
        codebaseViewId: 'test-view',
      });

      // Remove the only tag
      const modifiedCount = store.removeTagFromNotes(validatedRepoPath, 'bugfix');

      expect(modifiedCount).toBe(1);

      const rootPath = '' as ValidatedRelativePath;
      const notes = store.getNotesForPath(validatedRepoPath, rootPath, true);
      expect(notes[0].note.tags).toEqual([]);
    });

    it('should return 0 if tag does not exist', () => {
      store.saveNote({ ...testNote, directoryPath: validatedRepoPath });

      const modifiedCount = store.removeTagFromNotes(validatedRepoPath, 'nonexistent');

      expect(modifiedCount).toBe(0);
    });
  });

  describe('deleteTagDescription', () => {
    beforeEach(() => {
      // Create a note with the 'bugfix' tag
      store.saveNote({ ...testNote, directoryPath: validatedRepoPath });
    });

    it('should delete tag description file', () => {
      // First add a tag description
      store.saveTagDescription(validatedRepoPath, 'bugfix', 'Bug fix related changes');

      // Verify it exists
      const tagPath = fsAdapter.join(testRepoPath, '.a24z', 'tags', 'bugfix.md');
      expect(fsAdapter.exists(tagPath)).toBe(true);

      // Delete the tag description
      const result = store.deleteTagDescription(validatedRepoPath, 'bugfix');

      expect(result).toBe(true);
      expect(fsAdapter.exists(tagPath)).toBe(false);

      // Note: Tags in notes are not affected by deleteTagDescription
      const rootPath = '' as ValidatedRelativePath;
      const notes = store.getNotesForPath(validatedRepoPath, rootPath, true);
      expect(notes[0].note.tags).toContain('bugfix');
    });

    it('should return false when tag description does not exist', () => {
      // Try to delete a non-existent tag description
      const result = store.deleteTagDescription(validatedRepoPath, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('Performance with many notes', () => {
    it('should handle removing tags from many notes efficiently', () => {
      // Create 10 notes
      for (let i = 0; i < 10; i++) {
        store.saveNote({
          ...testNote,
          note: `Note ${i}`,
          tags: ['common-tag', `tag-${i % 5}`],
          directoryPath: validatedRepoPath,
          codebaseViewId: 'test-view',
        });
      }

      // Verify initial state
      const rootPath = '' as ValidatedRelativePath;
      let notes = store.getNotesForPath(validatedRepoPath, rootPath, true);
      expect(notes).toHaveLength(10);
      expect(notes.every((n) => n.note.tags.includes('common-tag'))).toBe(true);

      // Remove the common tag
      const start = Date.now();
      const modifiedCount = store.removeTagFromNotes(validatedRepoPath, 'common-tag');
      const duration = Date.now() - start;

      expect(modifiedCount).toBe(10);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      // Verify final state
      notes = store.getNotesForPath(validatedRepoPath, rootPath, true);
      expect(notes).toHaveLength(10);
      expect(notes.every((n) => !n.note.tags.includes('common-tag'))).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty tags array after removal', () => {
      store.saveNote({
        ...testNote,
        tags: ['only-tag'],
        directoryPath: validatedRepoPath,
        codebaseViewId: 'test-view',
      });

      const modifiedCount = store.removeTagFromNotes(validatedRepoPath, 'only-tag');
      expect(modifiedCount).toBe(1);

      // Note should now have empty tags array
      const rootPath = '' as ValidatedRelativePath;
      const notes = store.getNotesForPath(validatedRepoPath, rootPath, true);
      expect(notes[0].note.tags).toEqual([]);
    });

    it('should handle repository with no notes', () => {
      const modifiedCount = store.removeTagFromNotes(validatedRepoPath, 'any-tag');
      expect(modifiedCount).toBe(0);
    });
  });
});
