import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_DIR } from './setup';

describe('Working File Operations', () => {
  // Import modules after setup has run
  let RepositoryNoteTool: any;
  let GetRepositoryNotesTool: any;
  let GetRepositoryTagsTool: any;

  beforeAll(() => {
    // Import after environment is set up
    RepositoryNoteTool = require('../src/core-mcp/tools/RepositoryNoteTool').RepositoryNoteTool;
    GetRepositoryNotesTool = require('../src/core-mcp/tools/GetRepositoryNotesTool').GetRepositoryNotesTool;
    GetRepositoryTagsTool = require('../src/core-mcp/tools/GetRepositoryTagsTool').GetRepositoryTagsTool;
  });

  describe('Note Creation and File Storage', () => {
    it('should create a note and store it on filesystem', async () => {
      const testPath = path.join(TEST_DIR, 'create-test');
      fs.mkdirSync(testPath, { recursive: true });

      const tool = new RepositoryNoteTool();
      const result = await tool.execute({
        note: '# Test Note\\n\\nThis is a test note for file operations.',
        directoryPath: testPath,
        tags: ['test', 'file-ops'],
        confidence: 'high',
        type: 'explanation',
        metadata: { testRun: true }
      });

      // Should return success message
      expect(result.content[0].text).toMatch(/^Saved note note-/);

      // Should create the notes file
      const dataDir = process.env.A24Z_TEST_DATA_DIR!;
      const notesFile = path.join(dataDir, 'repository-notes.json');
      expect(fs.existsSync(notesFile)).toBe(true);

      // Should contain correct data
      const fileData = JSON.parse(fs.readFileSync(notesFile, 'utf8'));
      expect(fileData.version).toBe(1);
      expect(fileData.notes).toHaveLength(1);
      
      const savedNote = fileData.notes[0];
      expect(savedNote.note).toBe('# Test Note\\n\\nThis is a test note for file operations.');
      expect(savedNote.directoryPath).toBe(testPath);
      expect(savedNote.tags).toEqual(['test', 'file-ops']);
      expect(savedNote.confidence).toBe('high');
      expect(savedNote.type).toBe('explanation');
      expect(savedNote.metadata.testRun).toBe(true);
      expect(savedNote.id).toMatch(/^note-\\d+-[a-z0-9]+$/);
      expect(savedNote.timestamp).toBeCloseTo(Date.now(), -3);
    });

    it('should handle multiple notes correctly', async () => {
      const testPath = path.join(TEST_DIR, 'multiple-test');
      fs.mkdirSync(testPath, { recursive: true });

      const tool = new RepositoryNoteTool();
      
      // Create first note
      await tool.execute({
        note: 'First note',
        directoryPath: testPath,
        tags: ['first', 'multiple'],
        confidence: 'medium',
        type: 'decision',
        metadata: { order: 1 }
      });

      // Create second note
      await tool.execute({
        note: 'Second note',
        directoryPath: testPath,
        tags: ['second', 'multiple'],
        confidence: 'low',
        type: 'gotcha',
        metadata: { order: 2 }
      });

      // Verify both are saved
      const dataDir = process.env.A24Z_TEST_DATA_DIR!;
      const notesFile = path.join(dataDir, 'repository-notes.json');
      const fileData = JSON.parse(fs.readFileSync(notesFile, 'utf8'));
      
      expect(fileData.notes.length).toBeGreaterThanOrEqual(2);
      
      // Find our specific notes
      const ourNotes = fileData.notes.filter((n: any) => 
        n.directoryPath === testPath && n.tags.includes('multiple')
      );
      expect(ourNotes).toHaveLength(2);
    });
  });

  describe('Note Retrieval', () => {
    it('should retrieve notes via MCP tool', async () => {
      const testPath = path.join(TEST_DIR, 'retrieve-test');
      fs.mkdirSync(testPath, { recursive: true });

      // Create a note
      const createTool = new RepositoryNoteTool();
      await createTool.execute({
        note: 'Retrievable note content',
        directoryPath: testPath,
        tags: ['retrieve', 'test'],
        confidence: 'high',
        type: 'pattern',
        metadata: { retrievable: true }
      });

      // Retrieve it
      const getTool = new GetRepositoryNotesTool();
      const result = await getTool.execute({
        path: testPath,
        includeParentNotes: true,
        maxResults: 10
      });

      // Should return JSON response
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text!);
      
      expect(data.success).toBe(true);
      expect(data.path).toBe(testPath);
      expect(data.totalNotes).toBeGreaterThanOrEqual(1);
      
      // Find our note in the results
      const ourNote = data.notes.find((n: any) => 
        n.note === 'Retrievable note content'
      );
      expect(ourNote).toBeDefined();
      expect(ourNote.path).toBe(testPath);
      expect(ourNote.isParent).toBe(true);
      expect(ourNote.distance).toBe(0);
    });
  });

  describe('Tag Operations', () => {
    it('should retrieve and suggest tags', async () => {
      const testPath = path.join(TEST_DIR, 'tags-test');
      fs.mkdirSync(testPath, { recursive: true });

      // Create a note with custom tags
      const createTool = new RepositoryNoteTool();
      await createTool.execute({
        note: 'Tagged note',
        directoryPath: testPath,
        tags: ['custom-tag', 'unique-tag'],
        confidence: 'medium',
        type: 'explanation',
        metadata: {}
      });

      // Get tags
      const tagsTool = new GetRepositoryTagsTool();
      const result = await tagsTool.execute({
        path: testPath,
        includeUsedTags: true,
        includeSuggestedTags: true
      });

      const data = JSON.parse(result.content[0].text!);
      
      expect(data.success).toBe(true);
      expect(data.path).toBe(testPath);
      expect(data.usedTags).toContain('custom-tag');
      expect(data.usedTags).toContain('unique-tag');
      expect(Array.isArray(data.commonTags)).toBe(true);
      expect(data.commonTags.length).toBeGreaterThan(0);
      expect(Array.isArray(data.suggestedTags)).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent writes safely', async () => {
      const testPath = path.join(TEST_DIR, 'concurrent-test');
      fs.mkdirSync(testPath, { recursive: true });

      const tool = new RepositoryNoteTool();
      
      // Create 10 notes concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        tool.execute({
          note: `Concurrent note ${i}`,
          directoryPath: testPath,
          tags: [`concurrent-${i}`, 'concurrent'],
          confidence: 'medium',
          type: 'explanation',
          metadata: { index: i }
        })
      );

      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.content[0].text).toMatch(/^Saved note/);
      });

      // All should be persisted
      const getTool = new GetRepositoryNotesTool();
      const getResult = await getTool.execute({
        path: testPath,
        includeParentNotes: true,
        maxResults: 20
      });

      const data = JSON.parse(getResult.content[0].text!);
      const concurrentNotes = data.notes.filter((n: any) => 
        n.path === testPath && n.note.startsWith('Concurrent note')
      );
      
      expect(concurrentNotes).toHaveLength(10);
    });

    it('should recover from missing data directory', async () => {
      const testPath = path.join(TEST_DIR, 'recovery-test');
      fs.mkdirSync(testPath, { recursive: true });

      const dataDir = process.env.A24Z_TEST_DATA_DIR!;
      
      // Remove entire data directory
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
      }

      expect(fs.existsSync(dataDir)).toBe(false);

      // Create a note - should recreate directory
      const tool = new RepositoryNoteTool();
      const result = await tool.execute({
        note: 'Recovery test note',
        directoryPath: testPath,
        tags: ['recovery'],
        confidence: 'high',
        type: 'explanation',
        metadata: {}
      });

      // Should succeed
      expect(result.content[0].text).toMatch(/^Saved note/);
      
      // Should recreate directory and file
      expect(fs.existsSync(dataDir)).toBe(true);
      expect(fs.existsSync(path.join(dataDir, 'repository-notes.json'))).toBe(true);
    });
  });
});