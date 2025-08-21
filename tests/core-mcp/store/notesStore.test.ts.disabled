import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  saveNote,
  getNotesForPath,
  getUsedTagsForPath,
  getCommonTags,
  getSuggestedTagsForPath,
  type StoredNote,
  type NoteType,
  type NoteConfidence
} from '../../../src/core-mcp/store/notesStore';
import { 
  findGitRoot,
  findProjectRoot,
  normalizeRepositoryPath,
  getRepositoryName 
} from '../../../src/core-mcp/utils/pathNormalization';
import { TEST_DIR } from '../../setup';

describe('notesStore', () => {
  const testNotePath = path.join(TEST_DIR, 'test-project');
  const testNote = {
    note: 'Test note content',
    directoryPath: testNotePath,
    anchors: [testNotePath, 'test-anchor'],
    tags: ['test', 'example'],
    confidence: 'high' as NoteConfidence,
    type: 'explanation' as NoteType,
    metadata: { testData: true }
  };

  beforeEach(() => {
    // Create test directory structure
    fs.mkdirSync(testNotePath, { recursive: true });
    
    // Create a package.json to make this look like a project root
    fs.writeFileSync(path.join(testNotePath, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0'
    }));
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
      const dataDir = process.env.A24Z_TEST_DATA_DIR!;
      expect(fs.existsSync(dataDir)).toBe(true);

      saveNote(testNote);

      const notesFile = path.join(dataDir, 'repository-notes.json');
      expect(fs.existsSync(notesFile)).toBe(true);
    });

    it('should write notes to JSON file with correct structure', () => {
      saveNote(testNote);

      const dataDir = process.env.A24Z_TEST_DATA_DIR!;
      const notesFile = path.join(dataDir, 'repository-notes.json');
      const fileContent = fs.readFileSync(notesFile, 'utf8');
      const data = JSON.parse(fileContent);

      expect(data).toHaveProperty('version', 1);
      expect(data).toHaveProperty('repositories');
      expect(typeof data.repositories).toBe('object');
      
      // Should have one repository entry
      const repoKeys = Object.keys(data.repositories);
      expect(repoKeys).toHaveLength(1);
      
      // The repository should contain our note
      const repo = data.repositories[repoKeys[0]];
      expect(repo).toHaveProperty('name');
      expect(repo).toHaveProperty('notes');
      expect(Array.isArray(repo.notes)).toBe(true);
      expect(repo.notes).toHaveLength(1);
    });

    it('should use atomic writes with temporary files', () => {
      const dataDir = process.env.A24Z_TEST_DATA_DIR!;
      const notesFile = path.join(dataDir, 'repository-notes.json');
      const tmpFile = `${notesFile}.tmp`;

      // Mock fs.writeFileSync to check if temp file is used
      const originalWriteFile = fs.writeFileSync;
      const writeSpy = jest.spyOn(fs, 'writeFileSync');
      
      saveNote(testNote);

      // Should write to temp file first
      expect(writeSpy).toHaveBeenCalledWith(
        tmpFile,
        expect.any(String),
        { encoding: 'utf8' }
      );

      writeSpy.mockRestore();
    });

    it('should handle corrupted JSON gracefully', () => {
      const dataDir = process.env.A24Z_TEST_DATA_DIR!;
      const notesFile = path.join(dataDir, 'repository-notes.json');
      
      // Write corrupted JSON
      fs.writeFileSync(notesFile, 'invalid json{', 'utf8');

      // Should return empty array instead of throwing
      const notes = getNotesForPath(testNotePath, true, 10);
      expect(notes).toEqual([]);
    });
  });

  describe('saveNote', () => {
    it('should save a note and return it with id and timestamp', () => {
      const saved = saveNote(testNote);

      expect(saved).toHaveProperty('id');
      expect(saved).toHaveProperty('timestamp');
      expect(saved.id).toMatch(/^note-\d+-[a-z0-9]+$/);
      expect(saved.timestamp).toBeCloseTo(Date.now(), -2); // Within 100ms
      expect(saved.note).toBe(testNote.note);
    });

    it('should generate unique IDs for multiple notes', () => {
      const note1 = saveNote(testNote);
      const note2 = saveNote(testNote);

      expect(note1.id).not.toBe(note2.id);
      expect(note1.timestamp).not.toBe(note2.timestamp);
    });

    it('should persist notes across multiple saves', () => {
      const note1 = saveNote(testNote);
      const note2 = saveNote({ ...testNote, note: 'Second note' });

      const retrieved = getNotesForPath(testNotePath, true, 10);
      expect(retrieved).toHaveLength(2);
      expect(retrieved.map(n => n.id)).toContain(note1.id);
      expect(retrieved.map(n => n.id)).toContain(note2.id);
    });
  });

  describe('getNotesForPath', () => {
    it('should return notes for exact path match', () => {
      const saved = saveNote(testNote);
      const notes = getNotesForPath(testNotePath, true, 10);

      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe(saved.id);
      expect(notes[0].isParentDirectory).toBe(true);
      expect(notes[0].pathDistance).toBe(0);
    });

    it('should find parent directory notes for child paths', () => {
      const parentPath = testNotePath;
      const childPath = path.join(testNotePath, 'src', 'components');
      
      fs.mkdirSync(childPath, { recursive: true });
      
      const saved = saveNote({ ...testNote, directoryPath: parentPath });
      const notes = getNotesForPath(childPath, true, 10);

      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe(saved.id);
      expect(notes[0].isParentDirectory).toBe(true);
      expect(notes[0].pathDistance).toBe(2); // src + components
    });

    it('should find notes by anchor matches', () => {
      const anchorPath = path.join(testNotePath, 'special-file.ts');
      const searchPath = path.join(testNotePath, 'unrelated', 'special-file.ts');
      
      fs.mkdirSync(path.dirname(searchPath), { recursive: true });
      
      const saved = saveNote({ 
        ...testNote, 
        anchors: [testNote.directoryPath, 'special-file.ts'] 
      });
      
      const notes = getNotesForPath(searchPath, true, 10);

      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe(saved.id);
    });

    it('should respect maxResults parameter', () => {
      // Save multiple notes
      for (let i = 0; i < 5; i++) {
        saveNote({ ...testNote, note: `Note ${i}` });
      }

      const notes = getNotesForPath(testNotePath, true, 3);
      expect(notes).toHaveLength(3);
    });

    it('should sort by path distance then timestamp', async () => {
      const parentPath = testNotePath;
      const childPath = path.join(testNotePath, 'child');
      
      fs.mkdirSync(childPath, { recursive: true });

      // Save parent note first (older timestamp)
      const parentNote = saveNote({ ...testNote, directoryPath: parentPath });
      
      // Wait to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Save child note (newer timestamp)
      const childNote = saveNote({ ...testNote, directoryPath: childPath, note: 'Child note' });

      const notes = getNotesForPath(childPath, true, 10);
      
      // Child note should come first (closer path distance = 0)
      expect(notes[0].id).toBe(childNote.id);
      expect(notes[1].id).toBe(parentNote.id);
    });

    it('should filter out parent notes when includeParentNotes is false', () => {
      const parentPath = testNotePath;
      const childPath = path.join(testNotePath, 'child');
      
      fs.mkdirSync(childPath, { recursive: true });
      
      saveNote({ ...testNote, directoryPath: parentPath });
      const childNote = saveNote({ ...testNote, directoryPath: childPath, note: 'Child note' });

      const notes = getNotesForPath(childPath, false, 10);
      
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
      expect(tags[2]).toBe('rare');   // 1 use
    });

    it('should include tags from parent directories', () => {
      const childPath = path.join(testNotePath, 'child');
      fs.mkdirSync(childPath, { recursive: true });
      
      saveNote({ ...testNote, directoryPath: testNotePath, tags: ['parent-tag'] });
      saveNote({ ...testNote, directoryPath: childPath, tags: ['child-tag'] });

      const tags = getUsedTagsForPath(childPath);
      
      expect(tags).toContain('parent-tag');
      expect(tags).toContain('child-tag');
    });
  });

  describe('getCommonTags', () => {
    it('should return predefined common tags with descriptions', () => {
      const commonTags = getCommonTags();
      
      expect(commonTags.length).toBeGreaterThan(0);
      expect(commonTags.every(tag => 
        typeof tag.name === 'string' && typeof tag.description === 'string'
      )).toBe(true);
      
      // Check for some expected tags
      const tagNames = commonTags.map(t => t.name);
      expect(tagNames).toContain('feature');
      expect(tagNames).toContain('bugfix');
      expect(tagNames).toContain('typescript');
    });
  });

  describe('getSuggestedTagsForPath', () => {
    it('should suggest authentication tag for auth paths', () => {
      const suggestions = getSuggestedTagsForPath('/project/src/auth/login.ts');
      
      expect(suggestions.some(s => s.name === 'authentication')).toBe(true);
      expect(suggestions.find(s => s.name === 'authentication')?.reason).toBe('Path contains "auth"');
    });

    it('should suggest testing tag for test paths', () => {
      const suggestions = getSuggestedTagsForPath('/project/tests/unit/api.test.ts');
      
      expect(suggestions.some(s => s.name === 'testing')).toBe(true);
      expect(suggestions.find(s => s.name === 'testing')?.reason).toBe('Path contains "test"');
    });

    it('should suggest multiple tags when multiple patterns match', () => {
      const suggestions = getSuggestedTagsForPath('/project/src/auth/auth.test.ts');
      
      const tagNames = suggestions.map(s => s.name);
      expect(tagNames).toContain('authentication');
      expect(tagNames).toContain('testing');
    });

    it('should return empty array for paths with no suggestions', () => {
      const suggestions = getSuggestedTagsForPath('/project/src/utils/helpers.ts');
      
      expect(suggestions).toHaveLength(0);
    });
  });
});