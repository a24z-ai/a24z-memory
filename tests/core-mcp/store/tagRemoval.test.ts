import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { 
  saveNote,
  removeTagFromNotes,
  deleteTagDescription,
  removeAllowedTag,
  addAllowedTag,
  getNotesForPath,
  type StoredNote
} from '../../../src/core-mcp/store/notesStore';
import { findGitRoot } from '../../../src/core-mcp/utils/pathNormalization';

describe('Tag Removal from Notes', () => {
  let testRepoPath: string;
  let testNote: Omit<StoredNote, 'id' | 'timestamp'>;

  beforeEach(() => {
    // Create a temporary directory for testing
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-test-'));
    testRepoPath = tmpDir;
    
    // Initialize as a git repo
    fs.mkdirSync(path.join(testRepoPath, '.git'));
    
    // Create a basic test note template
    testNote = {
      note: 'Test note content',
      anchors: ['test.ts'],
      tags: ['feature', 'bugfix', 'documentation'],
      confidence: 'high',
      type: 'explanation',
      metadata: {}
    };
  });

  afterEach(() => {
    // Clean up the temporary directory
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  describe('removeTagFromNotes', () => {
    it('should remove a tag from all notes that have it', () => {
      // Save multiple notes with overlapping tags
      saveNote({ ...testNote, directoryPath: testRepoPath, tags: ['feature', 'bugfix'] });
      saveNote({ ...testNote, directoryPath: testRepoPath, tags: ['bugfix', 'documentation'] });
      saveNote({ ...testNote, directoryPath: testRepoPath, tags: ['feature', 'documentation'] });
      
      // Remove 'bugfix' tag from all notes
      const modifiedCount = removeTagFromNotes(testRepoPath, 'bugfix');
      
      expect(modifiedCount).toBe(2); // Two notes had the 'bugfix' tag
      
      // Verify the tag was removed
      const notes = getNotesForPath(testRepoPath, true, 100);
      expect(notes).toHaveLength(3);
      
      // No note should have 'bugfix' tag anymore
      notes.forEach(note => {
        expect(note.tags).not.toContain('bugfix');
      });
      
      // Other tags should remain
      expect(notes.some(n => n.tags.includes('feature'))).toBe(true);
      expect(notes.some(n => n.tags.includes('documentation'))).toBe(true);
    });

    it('should return 0 when tag does not exist in any notes', () => {
      saveNote({ ...testNote, directoryPath: testRepoPath, tags: ['feature'] });
      
      const modifiedCount = removeTagFromNotes(testRepoPath, 'non-existent');
      
      expect(modifiedCount).toBe(0);
    });

    it('should handle empty tag arrays correctly', () => {
      saveNote({ ...testNote, directoryPath: testRepoPath, tags: ['feature'] });
      saveNote({ ...testNote, directoryPath: testRepoPath, tags: [] }); // Note with no tags
      
      const modifiedCount = removeTagFromNotes(testRepoPath, 'feature');
      
      expect(modifiedCount).toBe(1);
      
      const notes = getNotesForPath(testRepoPath, true, 100);
      expect(notes[0].tags).toEqual([]);
      expect(notes[1].tags).toEqual([]);
    });
  });

  describe('deleteTagDescription with removeFromNotes option', () => {
    beforeEach(() => {
      // Set up tag descriptions
      addAllowedTag(testRepoPath, 'feature', 'Feature tag description');
      addAllowedTag(testRepoPath, 'bugfix', 'Bugfix tag description');
    });

    it('should delete tag description and remove from notes when removeFromNotes is true', () => {
      // Save notes with the tags
      saveNote({ ...testNote, directoryPath: testRepoPath, tags: ['feature', 'bugfix'] });
      saveNote({ ...testNote, directoryPath: testRepoPath, tags: ['bugfix', 'documentation'] });
      
      // Delete tag description and remove from notes
      const deleted = deleteTagDescription(testRepoPath, 'bugfix', true);
      
      expect(deleted).toBe(true);
      
      // Verify tag was removed from notes
      const notes = getNotesForPath(testRepoPath, true, 100);
      notes.forEach(note => {
        expect(note.tags).not.toContain('bugfix');
      });
      
      // Verify tag description file was deleted
      const tagFile = path.join(testRepoPath, '.a24z', 'tags', 'bugfix.md');
      expect(fs.existsSync(tagFile)).toBe(false);
    });

    it('should only delete tag description when removeFromNotes is false', () => {
      // Save notes with the tags
      saveNote({ ...testNote, directoryPath: testRepoPath, tags: ['feature', 'bugfix'] });
      
      // Delete tag description without removing from notes
      const deleted = deleteTagDescription(testRepoPath, 'bugfix', false);
      
      expect(deleted).toBe(true);
      
      // Verify tag still exists in notes
      const notes = getNotesForPath(testRepoPath, true, 100);
      expect(notes[0].tags).toContain('bugfix');
      
      // Verify tag description file was deleted
      const tagFile = path.join(testRepoPath, '.a24z', 'tags', 'bugfix.md');
      expect(fs.existsSync(tagFile)).toBe(false);
    });

    it('should use false as default for removeFromNotes parameter', () => {
      saveNote({ ...testNote, directoryPath: testRepoPath, tags: ['feature', 'bugfix'] });
      
      // Call without the removeFromNotes parameter
      const deleted = deleteTagDescription(testRepoPath, 'bugfix');
      
      expect(deleted).toBe(true);
      
      // Tag should still be in notes (default is false)
      const notes = getNotesForPath(testRepoPath, true, 100);
      expect(notes[0].tags).toContain('bugfix');
    });
  });

  describe('removeAllowedTag with removeFromNotes option', () => {
    beforeEach(() => {
      // Set up tag descriptions
      addAllowedTag(testRepoPath, 'feature', 'Feature tag description');
      addAllowedTag(testRepoPath, 'bugfix', 'Bugfix tag description');
    });

    it('should remove tag from notes by default', () => {
      saveNote({ ...testNote, directoryPath: testRepoPath, tags: ['feature', 'bugfix'] });
      
      // Call without the removeFromNotes parameter (default is true)
      const removed = removeAllowedTag(testRepoPath, 'bugfix');
      
      expect(removed).toBe(true);
      
      // Tag should be removed from notes
      const notes = getNotesForPath(testRepoPath, true, 100);
      expect(notes[0].tags).not.toContain('bugfix');
      expect(notes[0].tags).toContain('feature');
    });

    it('should not remove tag from notes when removeFromNotes is false', () => {
      saveNote({ ...testNote, directoryPath: testRepoPath, tags: ['feature', 'bugfix'] });
      
      const removed = removeAllowedTag(testRepoPath, 'bugfix', false);
      
      expect(removed).toBe(true);
      
      // Tag should still be in notes
      const notes = getNotesForPath(testRepoPath, true, 100);
      expect(notes[0].tags).toContain('bugfix');
    });

    it('should handle non-existent tags correctly', () => {
      saveNote({ ...testNote, directoryPath: testRepoPath, tags: ['feature'] });
      
      const removed = removeAllowedTag(testRepoPath, 'non-existent', true);
      
      expect(removed).toBe(false);
      
      // Notes should remain unchanged
      const notes = getNotesForPath(testRepoPath, true, 100);
      expect(notes[0].tags).toEqual(['feature']);
    });
  });

  describe('Integration: Complete tag removal workflow', () => {
    it('should handle removing a widely-used tag', () => {
      // Set up allowed tags
      addAllowedTag(testRepoPath, 'deprecated', 'Deprecated code');
      addAllowedTag(testRepoPath, 'todo', 'TODO items');
      
      // Create many notes with the deprecated tag
      for (let i = 0; i < 10; i++) {
        saveNote({ 
          ...testNote, 
          directoryPath: testRepoPath,
          note: `Note ${i}`,
          tags: i % 2 === 0 ? ['deprecated', 'todo'] : ['deprecated']
        });
      }
      
      // Verify initial state
      let notes = getNotesForPath(testRepoPath, true, 100);
      expect(notes).toHaveLength(10);
      expect(notes.filter(n => n.tags.includes('deprecated'))).toHaveLength(10);
      
      // Remove the deprecated tag completely
      const removed = removeAllowedTag(testRepoPath, 'deprecated', true);
      
      expect(removed).toBe(true);
      
      // Verify final state
      notes = getNotesForPath(testRepoPath, true, 100);
      expect(notes).toHaveLength(10);
      expect(notes.filter(n => n.tags.includes('deprecated'))).toHaveLength(0);
      expect(notes.filter(n => n.tags.includes('todo'))).toHaveLength(5);
      
      // Verify tag description is gone
      const tagFile = path.join(testRepoPath, '.a24z', 'tags', 'deprecated.md');
      expect(fs.existsSync(tagFile)).toBe(false);
    });

    it('should handle removing last tag from notes', () => {
      // Save a note with only one tag
      saveNote({ ...testNote, directoryPath: testRepoPath, tags: ['single-tag'] });
      addAllowedTag(testRepoPath, 'single-tag', 'Only tag');
      
      // Remove the only tag
      const modifiedCount = removeTagFromNotes(testRepoPath, 'single-tag');
      
      expect(modifiedCount).toBe(1);
      
      // Note should now have empty tags array
      const notes = getNotesForPath(testRepoPath, true, 100);
      expect(notes[0].tags).toEqual([]);
    });
  });
});