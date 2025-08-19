import * as fs from 'node:fs';
import * as path from 'node:path';
import { RepositoryNoteTool } from '../../src/core-mcp/tools/RepositoryNoteTool';
import { GetRepositoryNotesTool } from '../../src/core-mcp/tools/GetRepositoryNotesTool';
import { GetRepositoryTagsTool } from '../../src/core-mcp/tools/GetRepositoryTagsTool';
import { TEST_DIR } from '../setup';

describe('Basic File Operations', () => {
  const testPath = path.join(TEST_DIR, 'basic-ops');

  beforeEach(() => {
    fs.mkdirSync(testPath, { recursive: true });
  });

  describe('Repository Note Creation', () => {
    it('should create and save a note to filesystem', async () => {
      const tool = new RepositoryNoteTool();
      const result = await tool.execute({
        note: 'Test note content',
        directoryPath: testPath,
        tags: ['test']
      });

      // Should return success message
      expect(result.content[0].text).toMatch(/^Saved note note-/);

      // Should create notes file
      const dataDir = process.env.A24Z_TEST_DATA_DIR!;
      const notesFile = path.join(dataDir, 'repository-notes.json');
      expect(fs.existsSync(notesFile)).toBe(true);

      // Should contain our note
      const fileData = JSON.parse(fs.readFileSync(notesFile, 'utf8'));
      expect(fileData.notes).toHaveLength(1);
      expect(fileData.notes[0].note).toBe('Test note content');
      expect(fileData.notes[0].tags).toEqual(['test']);
    });

    it('should handle multiple notes', async () => {
      const tool = new RepositoryNoteTool();
      
      await tool.execute({
        note: 'First note',
        directoryPath: testPath,
        tags: ['first']
      });

      await tool.execute({
        note: 'Second note',
        directoryPath: testPath,
        tags: ['second']
      });

      const dataDir = process.env.A24Z_TEST_DATA_DIR!;
      const notesFile = path.join(dataDir, 'repository-notes.json');
      const fileData = JSON.parse(fs.readFileSync(notesFile, 'utf8'));
      
      expect(fileData.notes).toHaveLength(2);
    });
  });

  describe('Note Retrieval', () => {
    it('should retrieve notes via GetRepositoryNotesTool', async () => {
      // First create a note
      const createTool = new RepositoryNoteTool();
      await createTool.execute({
        note: 'Retrievable note',
        directoryPath: testPath,
        tags: ['retrieve']
      });

      // Then retrieve it
      const getTool = new GetRepositoryNotesTool();
      const result = await getTool.execute({
        path: testPath,
        includeParentNotes: true,
        maxResults: 10
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data.success).toBe(true);
      expect(data.totalNotes).toBe(1);
      expect(data.notes[0].note).toBe('Retrievable note');
    });
  });

  describe('Tag Operations', () => {
    it('should retrieve tags via GetRepositoryTagsTool', async () => {
      // Create a note first
      const createTool = new RepositoryNoteTool();
      await createTool.execute({
        note: 'Tagged note',
        directoryPath: testPath,
        tags: ['custom-tag']
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
      expect(data.usedTags).toContain('custom-tag');
      expect(data.commonTags).toBeDefined();
    });
  });

  describe('Data Directory Management', () => {
    it('should create data directory if it does not exist', async () => {
      const dataDir = process.env.A24Z_TEST_DATA_DIR!;
      
      // Remove data directory
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true });
      }
      
      // Create a note - should recreate directory
      const tool = new RepositoryNoteTool();
      await tool.execute({
        note: 'Directory creation test',
        directoryPath: testPath,
        tags: ['dir-test']
      });

      expect(fs.existsSync(dataDir)).toBe(true);
      expect(fs.existsSync(path.join(dataDir, 'repository-notes.json'))).toBe(true);
    });

    it('should use atomic file writes', async () => {
      const dataDir = process.env.A24Z_TEST_DATA_DIR!;
      const notesFile = path.join(dataDir, 'repository-notes.json');
      const tempFile = `${notesFile}.tmp`;

      const tool = new RepositoryNoteTool();
      
      // Mock rename to see if temp file is used
      const originalRename = fs.renameSync;
      const renameSpy = jest.spyOn(fs, 'renameSync');
      
      await tool.execute({
        note: 'Atomic write test',
        directoryPath: testPath,
        tags: ['atomic']
      });

      expect(renameSpy).toHaveBeenCalledWith(tempFile, notesFile);
      renameSpy.mockRestore();
    });
  });
});