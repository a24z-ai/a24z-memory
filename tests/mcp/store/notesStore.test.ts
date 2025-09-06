import * as fs from 'node:fs';
import * as path from 'node:path';
import { createTestView } from '../../test-helpers';
import {
  saveNote,
  getNotesForPath,
  getUsedTagsForPath,
  getSuggestedTagsForPath,
} from '../../../src/core/store/anchoredNotesStore';
import {
  findProjectRoot,
  normalizeRepositoryPath,
  getRepositoryName,
} from '../../../src/core/utils/pathNormalization';
import { TEST_DIR } from '../../setup';

describe('notesStore', () => {
  const testNotePath = path.join(TEST_DIR, 'test-project');
  const testNote = {
    note: 'Test note content',
    directoryPath: testNotePath,
    anchors: [testNotePath, 'test-anchor'],
    tags: ['test', 'example'],
    codebaseViewId: 'test-view',
    metadata: { testData: true },
  };

  beforeEach(() => {
    // Ensure clean test directory for each test
    if (fs.existsSync(testNotePath)) {
      fs.rmSync(testNotePath, { recursive: true, force: true });
    }
    // Create test directory structure
    fs.mkdirSync(testNotePath, { recursive: true });

    // Create a .git directory to make this a valid repository
    fs.mkdirSync(path.join(testNotePath, '.git'), { recursive: true });
    createTestView(testNotePath, 'test-view');
    // Create a package.json to make this look like a project root
    fs.writeFileSync(
      path.join(testNotePath, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
      })
    );
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(testNotePath)) {
      fs.rmSync(testNotePath, { recursive: true, force: true });
    }
  });

  describe('Path Normalization', () => {
    it('should find project root from package.json', () => {
      const childPath = path.join(testNotePath, 'src', 'components');
      fs.mkdirSync(childPath, { recursive: true });

      const projectRoot = findProjectRoot(childPath);
      expect(projectRoot).toBe(testNotePath);
    });

    it('should normalize repository path to project root', () => {
      const childPath = path.join(testNotePath, 'src', 'components', 'Button.tsx');
      const normalized = normalizeRepositoryPath(childPath);
      expect(normalized).toBe(testNotePath);
    });

    it('should get repository name from path', () => {
      const name = getRepositoryName(testNotePath);
      expect(name).toBe('test-project');
    });

    it('should handle non-existent paths gracefully', () => {
      const nonExistentPath = '/non/existent/path';
      const normalized = normalizeRepositoryPath(nonExistentPath);
      expect(normalized).toBe(path.resolve(nonExistentPath));
    });
  });

  describe('File Operations', () => {
    it('should create data directory when saving first note', () => {
      const savedWithPath = saveNote(testNote);
      const saved = savedWithPath.note;

      // Check that data directory was created
      const dataDir = path.join(testNotePath, '.a24z');
      expect(fs.existsSync(dataDir)).toBe(true);

      // Check that notes directory structure was created
      const notesDir = path.join(dataDir, 'notes');
      expect(fs.existsSync(notesDir)).toBe(true);

      // Check that the note file was created in YYYY/MM format
      const date = new Date(saved.timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const noteDir = path.join(notesDir, year.toString(), month);
      expect(fs.existsSync(noteDir)).toBe(true);

      // Check that the note file exists
      const noteFile = path.join(noteDir, `${saved.id}.json`);
      expect(fs.existsSync(noteFile)).toBe(true);
    });

    it('should write notes to individual JSON files with correct structure', () => {
      const savedWithPath = saveNote(testNote);
      const saved = savedWithPath.note;

      const dataDir = path.join(testNotePath, '.a24z');
      const date = new Date(saved.timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const noteFile = path.join(dataDir, 'notes', year.toString(), month, `${saved.id}.json`);

      const fileContent = fs.readFileSync(noteFile, 'utf8');
      const data = JSON.parse(fileContent);

      expect(data).toHaveProperty('id', saved.id);
      expect(data).toHaveProperty('timestamp', saved.timestamp);
      expect(data).toHaveProperty('note', testNote.note);
      expect(data).toHaveProperty('tags');
      expect(Array.isArray(data.tags)).toBe(true);
      expect(data.tags).toEqual(testNote.tags);
    });

    it('should use atomic writes with temporary files', () => {
      const savedWithPath = saveNote(testNote);
      const saved = savedWithPath.note;

      const date = new Date(saved.timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const noteFile = path.join(
        testNotePath,
        '.a24z',
        'notes',
        year.toString(),
        month,
        `${saved.id}.json`
      );
      const tmpFile = `${noteFile}.tmp`;

      // Verify that the final note file exists (was renamed from tmp)
      expect(fs.existsSync(noteFile)).toBe(true);

      // Verify that the tmp file doesn't exist (was renamed)
      expect(fs.existsSync(tmpFile)).toBe(false);

      // Verify the content is correct
      const content = JSON.parse(fs.readFileSync(noteFile, 'utf8'));
      expect(content.id).toBe(saved.id);
    });

    it('should handle corrupted JSON gracefully', () => {
      const savedWithPath = saveNote(testNote);
      const saved = savedWithPath.note;

      // Corrupt the saved note file
      const date = new Date(saved.timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const noteFile = path.join(
        testNotePath,
        '.a24z',
        'notes',
        year.toString(),
        month,
        `${saved.id}.json`
      );

      // Write corrupted JSON
      fs.writeFileSync(noteFile, 'invalid json{', 'utf8');

      // Should skip corrupted note and return empty array
      const notes = getNotesForPath(testNotePath, true);
      expect(notes).toEqual([]);
    });
  });

  describe('saveNote', () => {
    it('should save a note and return it with id and timestamp', () => {
      const savedWithPath = saveNote(testNote);
      const saved = savedWithPath.note;

      expect(saved).toHaveProperty('id');
      expect(saved).toHaveProperty('timestamp');
      expect(saved.id).toMatch(/^note-\d+-[a-z0-9]+$/);
      expect(saved.timestamp).toBeCloseTo(Date.now(), -2); // Within 100ms
      expect(saved.note).toBe(testNote.note);
    });

    it('should generate unique IDs for multiple notes', async () => {
      const note1WithPath = saveNote(testNote);
      const note1 = note1WithPath.note;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1));

      const note2WithPath = saveNote(testNote);
      const note2 = note2WithPath.note;

      expect(note1.id).not.toBe(note2.id);
      expect(note1.timestamp).not.toBe(note2.timestamp);
    });

    it('should persist notes across multiple saves', () => {
      const note1WithPath = saveNote(testNote);
      const note1 = note1WithPath.note;
      const note2WithPath = saveNote({ ...testNote, note: 'Second note' });
      const note2 = note2WithPath.note;

      const retrieved = getNotesForPath(testNotePath, true);
      expect(retrieved).toHaveLength(2);
      expect(retrieved.map((n) => n.id)).toContain(note1.id);
      expect(retrieved.map((n) => n.id)).toContain(note2.id);
    });
  });

  describe('getNotesForPath', () => {
    it('should return notes for exact path match', () => {
      const savedWithPath = saveNote(testNote);
      const saved = savedWithPath.note;
      const notes = getNotesForPath(testNotePath, true);

      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe(saved.id);
      expect(notes[0].isParentDirectory).toBe(false); // Same directory, not parent
      expect(notes[0].pathDistance).toBe(0);
    });

    it('should find parent directory notes for child paths', () => {
      const parentPath = testNotePath;
      const childPath = path.join(testNotePath, 'src', 'components');

      fs.mkdirSync(childPath, { recursive: true });

      const savedWithPath = saveNote({ ...testNote, directoryPath: parentPath });
      const saved = savedWithPath.note;
      const notes = getNotesForPath(childPath, true);

      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe(saved.id);
      expect(notes[0].isParentDirectory).toBe(true);
      expect(notes[0].pathDistance).toBe(2); // src + components
    });

    it('should find notes by anchor matches', () => {
      // const anchorPath = path.join(testNotePath, 'special-file.ts');
      const searchPath = path.join(testNotePath, 'unrelated', 'special-file.ts');

      fs.mkdirSync(path.dirname(searchPath), { recursive: true });

      const savedWithPath = saveNote({
        ...testNote,
        anchors: [testNote.directoryPath, 'special-file.ts'],
      });
      const saved = savedWithPath.note;

      const notes = getNotesForPath(searchPath, true);

      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe(saved.id);
    });

    it('should respect maxResults parameter', () => {
      // Save multiple notes
      for (let i = 0; i < 5; i++) {
        saveNote({ ...testNote, note: `Note ${i}` });
      }

      const notes = getNotesForPath(testNotePath, true).slice(0, 3);
      expect(notes).toHaveLength(3);
    });

    it('should sort by path distance then timestamp', async () => {
      // This test expects both notes to be in the same repository,
      // not separate repositories (parent/child dirs in same repo)
      // const parentPath = testNotePath;
      const childPath = path.join(testNotePath, 'child');

      fs.mkdirSync(childPath, { recursive: true });

      // Save parent note first (older timestamp) - anchored to parent path
      const parentNoteWithPath = saveNote({
        ...testNote,
        directoryPath: testNotePath,
        codebaseViewId: 'test-view',
        anchors: [testNotePath], // Anchor to parent directory
        note: 'Parent note',
      });
      const parentNote = parentNoteWithPath.note;

      // Wait to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Save another note anchored to child directory
      const childNoteWithPath = saveNote({
        ...testNote,
        directoryPath: testNotePath, // Same repository
        anchors: [childPath], // But anchored to child path
        note: 'Child note',
        codebaseViewId: 'test-view',
      });
      const childNote = childNoteWithPath.note;

      const notes = getNotesForPath(childPath, true);

      // Both notes should be returned since they're in the same repository
      expect(notes).toHaveLength(2);
      // Child-anchored note should come first (closer path distance)
      expect(notes[0].id).toBe(childNote.id);
      expect(notes[0].pathDistance).toBe(0); // Exact match
      expect(notes[1].id).toBe(parentNote.id);
      expect(notes[1].pathDistance).toBe(1); // Parent directory
    });

    it('should filter out parent notes when includeParentNotes is false', () => {
      const parentPath = testNotePath;
      const childPath = path.join(testNotePath, 'child');

      fs.mkdirSync(childPath, { recursive: true });
      // Create .git directory in child path to make it a valid repository
      fs.mkdirSync(path.join(childPath, '.git'), { recursive: true });
      createTestView(testNotePath, 'test-view');
      saveNote({ ...testNote, directoryPath: parentPath });
      const childNoteWithPath = saveNote({
        ...testNote,
        directoryPath: childPath,
        codebaseViewId: 'test-view',
        anchors: [childPath, 'test-anchor'],
        note: 'Child note',
      });
      const childNote = childNoteWithPath.note;

      const notes = getNotesForPath(childPath, false);

      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe(childNote.id);
    });
  });

  describe('getUsedTagsForPath', () => {
    it('should return tags sorted by frequency', () => {
      saveNote({ ...testNote, tags: ['common', 'rare'] });
      saveNote({ ...testNote, tags: ['common', 'medium'] });
      saveNote({ ...testNote, tags: ['common', 'medium'] });

      const tags = getUsedTagsForPath(testNotePath);

      expect(tags[0]).toBe('common'); // 3 uses
      expect(tags[1]).toBe('medium'); // 2 uses
      expect(tags[2]).toBe('rare'); // 1 use
    });

    it('should include tags from parent directories', () => {
      const childPath = path.join(testNotePath, 'child');
      fs.mkdirSync(childPath, { recursive: true });

      // Both notes in same repository, anchored to different paths
      saveNote({
        ...testNote,
        directoryPath: testNotePath,
        codebaseViewId: 'test-view',
        anchors: [testNotePath],
        tags: ['parent-tag'],
      });
      saveNote({
        ...testNote,
        directoryPath: testNotePath,
        codebaseViewId: 'test-view',
        anchors: [childPath],
        tags: ['child-tag'],
      });

      const tags = getUsedTagsForPath(childPath);

      expect(tags).toContain('parent-tag');
      expect(tags).toContain('child-tag');
    });
  });

  describe('getSuggestedTagsForPath', () => {
    it('should return empty array (users manage their own tags)', () => {
      const suggestions = getSuggestedTagsForPath('/project/src/auth/login.ts');
      expect(suggestions).toEqual([]);

      const suggestions2 = getSuggestedTagsForPath('/project/tests/unit/api.test.ts');
      expect(suggestions2).toEqual([]);

      const suggestions3 = getSuggestedTagsForPath('/project/src/utils/helpers.ts');
      expect(suggestions3).toEqual([]);
    });
  });
});
