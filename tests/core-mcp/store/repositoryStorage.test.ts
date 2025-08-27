import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  saveNote,
  getNotesForPath,
  getUsedTagsForPath,
  type StoredNote,
  type NoteType,
  type NoteConfidence
} from '../../../src/core-mcp/store/notesStore';
import {
  normalizeRepositoryPath,
  findProjectRoot,
  getRepositoryName
} from '../../../src/core-mcp/utils/pathNormalization';

describe('Repository-Specific Storage', () => {
  const testRepoPath = '/tmp/test-repo-storage';
  const testSubPath = path.join(testRepoPath, 'src', 'components');
  
  beforeEach(() => {
    
    // Clean up any existing test data
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
    
    // Create test repository structure
    fs.mkdirSync(testSubPath, { recursive: true });
    
    // Create git directory for validation
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });
    fs.writeFileSync(path.join(testRepoPath, '.git', 'config'), '[core]\nrepositoryformatversion = 0\n');
    
    // Create package.json to make it a project root
    fs.writeFileSync(path.join(testRepoPath, 'package.json'), JSON.stringify({
      name: 'test-repo-storage',
      version: '1.0.0'
    }));
  });

  afterEach(() => {
    // Clean up test data
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  describe('Path Normalization', () => {
    it('should normalize nested paths to repository root', () => {
      const deepPath = path.join(testRepoPath, 'src', 'components', 'Button.tsx');
      const normalized = normalizeRepositoryPath(deepPath);
      expect(normalized).toBe(testRepoPath);
    });

    it('should detect project root from package.json', () => {
      const projectRoot = findProjectRoot(testSubPath);
      expect(projectRoot).toBe(testRepoPath);
    });

    it('should get correct repository name', () => {
      const name = getRepositoryName(testRepoPath);
      expect(name).toBe('test-repo-storage');
    });
  });

  describe('Repository-Specific File Storage', () => {
    const testNote = {
      note: 'Test note for repository storage',
      directoryPath: testRepoPath, // Must be repository root
      anchors: [testSubPath],
      tags: ['test', 'repository-storage'],
      confidence: 'medium' as NoteConfidence,
      type: 'explanation' as NoteType,
      metadata: { testRun: true }
    };

    it('should store notes in repository .a24z directory', () => {
      const saved = saveNote(testNote);
      
      // Check that note was saved
      expect(saved.id).toMatch(/^note-\d+-[a-z0-9]+$/);
      
      // Check that notes directory was created in correct location
      const expectedDir = path.join(testRepoPath, '.a24z', 'notes');
      expect(fs.existsSync(expectedDir)).toBe(true);
      
      // Check that individual note file exists (in current year/month)
      const currentDate = new Date();
      const year = currentDate.getFullYear().toString();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const noteFile = path.join(expectedDir, year, month, `${saved.id}.json`);
      expect(fs.existsSync(noteFile)).toBe(true);
    });

    it('should retrieve notes from repository storage', () => {
      // Save a note
      const saved = saveNote(testNote);
      
      // Retrieve notes using exact repository path
      const notes = getNotesForPath(testRepoPath, true);
      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe(saved.id);
      expect(notes[0].isParentDirectory).toBe(true);
      expect(notes[0].pathDistance).toBe(0);
    });

    it('should retrieve notes from nested paths within repository', () => {
      // Save a note
      const saved = saveNote(testNote);
      
      // Retrieve notes using nested path (should find the note at repo root)
      const nestedPath = path.join(testRepoPath, 'src', 'components', 'Button.tsx');
      const notes = getNotesForPath(nestedPath, true);
      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe(saved.id);
      // The note should match the anchor, not be a parent directory
      expect(notes[0].isParentDirectory).toBe(false);
      expect(notes[0].pathDistance).toBe(0); // Direct anchor match
    });

    it('should handle multiple notes in same repository', () => {
      // Save multiple notes
      const note1 = saveNote(testNote);
      const note2 = saveNote({
        ...testNote,
        note: 'Second test note',
        tags: ['test', 'second-note']
      });
      
      // Retrieve all notes
      const notes = getNotesForPath(testRepoPath, true);
      expect(notes).toHaveLength(2);
      
      const noteIds = notes.map(n => n.id);
      expect(noteIds).toContain(note1.id);
      expect(noteIds).toContain(note2.id);
    });

    it('should get used tags from repository', () => {
      // Save notes with different tags
      saveNote({ ...testNote, tags: ['common', 'first'] });
      saveNote({ ...testNote, tags: ['common', 'second'] });
      saveNote({ ...testNote, tags: ['common', 'third'] });
      
      const tags = getUsedTagsForPath(testRepoPath);
      expect(tags[0]).toBe('common'); // Should be most frequent
      expect(tags).toContain('first');
      expect(tags).toContain('second');
      expect(tags).toContain('third');
    });
  });

  describe('Repository Isolation', () => {
    const secondRepoPath = '/tmp/second-test-repo';
    
    beforeEach(() => {
      
      // Create second repository
      if (fs.existsSync(secondRepoPath)) {
        fs.rmSync(secondRepoPath, { recursive: true, force: true });
      }
      fs.mkdirSync(secondRepoPath, { recursive: true });
      
      // Create git directory for validation
      fs.mkdirSync(path.join(secondRepoPath, '.git'), { recursive: true });
      fs.writeFileSync(path.join(secondRepoPath, '.git', 'config'), '[core]\nrepositoryformatversion = 0\n');
      
      fs.writeFileSync(path.join(secondRepoPath, 'package.json'), JSON.stringify({
        name: 'second-test-repo',
        version: '1.0.0'
      }));
    });

    afterEach(() => {
      if (fs.existsSync(secondRepoPath)) {
        fs.rmSync(secondRepoPath, { recursive: true, force: true });
      }
    });

    it('should isolate notes between different repositories', () => {
      // Save note in first repository
      const note1 = saveNote({
        note: 'Note in first repo',
        directoryPath: testRepoPath,
        tags: ['repo1'],
        confidence: 'medium' as NoteConfidence,
        type: 'explanation' as NoteType,
        anchors: [testRepoPath],
        metadata: {}
      });

      // Save note in second repository
      const note2 = saveNote({
        note: 'Note in second repo',
        directoryPath: secondRepoPath,
        tags: ['repo2'],
        confidence: 'medium' as NoteConfidence,
        type: 'explanation' as NoteType,
        anchors: [secondRepoPath],
        metadata: {}
      });

      // Check that each repository only sees its own notes
      const repo1Notes = getNotesForPath(testRepoPath, true);
      const repo2Notes = getNotesForPath(secondRepoPath, true);

      expect(repo1Notes).toHaveLength(1);
      expect(repo2Notes).toHaveLength(1);
      expect(repo1Notes[0].id).toBe(note1.id);
      expect(repo2Notes[0].id).toBe(note2.id);

      // Check that notes directories are stored separately
      const repo1Dir = path.join(testRepoPath, '.a24z', 'notes');
      const repo2Dir = path.join(secondRepoPath, '.a24z', 'notes');
      
      expect(fs.existsSync(repo1Dir)).toBe(true);
      expect(fs.existsSync(repo2Dir)).toBe(true);
      
      // Verify tags are isolated using the notes themselves
      expect(repo1Notes[0].tags).toContain('repo1');
      expect(repo2Notes[0].tags).toContain('repo2');
    });
  });

  describe('MCP Tool Integration', () => {
    it('should save and retrieve notes through the actual MCP tools', async () => {
      // Import the actual MCP tools
      const { CreateRepositoryNoteTool } = await import('../../../src/core-mcp/tools/CreateRepositoryNoteTool');
      const { GetNotesTool } = await import('../../../src/core-mcp/tools/GetNotesTool');
      
      const saveTool = new CreateRepositoryNoteTool();
      const getTool = new GetNotesTool();
      
      // Save a note using the MCP tool
      const saveResult = await saveTool.execute({
        note: 'MCP integration test note',
        directoryPath: testRepoPath,
        tags: ['mcp-test', 'integration'],
        type: 'explanation' as NoteType,
        confidence: 'high' as NoteConfidence,
        anchors: [testSubPath],
        metadata: { mcpTest: true }
      });
      
      expect(saveResult.content[0].text).toContain('Note saved successfully');
      
      // Retrieve notes using the MCP tool
      const getResult = await getTool.execute({
        path: testRepoPath,
        includeParentNotes: true,
        filterReviewed: 'all',
        includeStale: true,
        sortBy: 'timestamp',
        limit: 10,
        offset: 0,
        includeMetadata: true
      });
      
      console.log('MCP Get Result:', JSON.stringify(getResult, null, 2));
      
      // Parse the result from the MCP tool response
      expect(getResult.content).toBeDefined();
      expect(getResult.content[0]).toBeDefined();
      expect(getResult.content[0].text).toBeDefined();
      const parsedResult = JSON.parse(getResult.content[0].text!);
      
      // This should find the note we just saved
      expect(parsedResult.pagination.total).toBe(1);
      expect(parsedResult.notes).toHaveLength(1);
      expect(parsedResult.notes[0].note).toBe('MCP integration test note');
    });
    
    it('should retrieve notes from nested paths using MCP tools', async () => {
      // Save a note first
      const saved = saveNote({
        note: 'Nested path retrieval test',
        directoryPath: testRepoPath,
        tags: ['nested-test'],
        type: 'explanation' as NoteType,
        confidence: 'medium' as NoteConfidence,
        anchors: [testSubPath],
        metadata: {}
      });
      
      // Import and use the MCP tool
      const { GetNotesTool } = await import('../../../src/core-mcp/tools/GetNotesTool');
      const getTool = new GetNotesTool();
      
      // Try to retrieve from a deeply nested path
      const deepPath = path.join(testRepoPath, 'src', 'components', 'Button.tsx');
      const getResult = await getTool.execute({
        path: deepPath,
        includeParentNotes: true,
        filterReviewed: 'all',
        includeStale: true,
        sortBy: 'timestamp',
        limit: 10,
        offset: 0,
        includeMetadata: true
      });
      
      console.log('Nested Path Get Result:', JSON.stringify(getResult, null, 2));
      
      // Parse the result from the MCP tool response
      expect(getResult.content).toBeDefined();
      expect(getResult.content[0]).toBeDefined();
      expect(getResult.content[0].text).toBeDefined();
      const parsedResult = JSON.parse(getResult.content[0].text!);
      
      expect(parsedResult.pagination.total).toBe(1);
      expect(parsedResult.notes[0].id).toBe(saved.id);
    });
  });

}); 