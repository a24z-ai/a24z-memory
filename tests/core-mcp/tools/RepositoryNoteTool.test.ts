import * as fs from 'node:fs';
import * as path from 'node:path';
import { RepositoryNoteTool } from '../../../src/core-mcp/tools/RepositoryNoteTool';
import { getNotesForPath } from '../../../src/core-mcp/store/notesStore';
import { TEST_DIR } from '../../setup';

describe('RepositoryNoteTool', () => {
  let tool: RepositoryNoteTool;
  const testPath = path.join(TEST_DIR, 'test-repo');

  beforeEach(() => {
    tool = new RepositoryNoteTool();
    fs.mkdirSync(testPath, { recursive: true });
  });

  describe('Schema Validation', () => {
    it('should validate required fields', () => {
      const validInput = {
        note: 'Test note content',
        directoryPath: testPath,
        tags: ['test']
      };

      expect(() => tool.schema.parse(validInput)).not.toThrow();
    });

    it('should require at least one tag', () => {
      const invalidInput = {
        note: 'Test note',
        directoryPath: testPath,
        tags: []
      };

      expect(() => tool.schema.parse(invalidInput)).toThrow('At least one tag is required');
    });

    it('should set default values for optional fields', () => {
      const input = {
        note: 'Test note',
        directoryPath: testPath,
        tags: ['test']
      };

      const parsed = tool.schema.parse(input);
      expect(parsed.confidence).toBe('medium');
      expect(parsed.type).toBe('explanation');
    });

    it('should accept valid enum values', () => {
      const input = {
        note: 'Test note',
        directoryPath: testPath,
        tags: ['test'],
        confidence: 'high' as const,
        type: 'decision' as const
      };

      const parsed = tool.schema.parse(input);
      expect(parsed.confidence).toBe('high');
      expect(parsed.type).toBe('decision');
    });
  });

  describe('Note Storage', () => {
    it('should save note with correct structure', async () => {
      const input = {
        note: 'Test repository note',
        directoryPath: testPath,
        tags: ['test', 'example'],
        anchors: ['additional-path'],
        confidence: 'high' as const,
        type: 'pattern' as const,
        metadata: { customField: 'value' }
      };

      const result = await tool.execute(input);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/^Saved note note-\d+-[a-z0-9]+$/);
    });

    it('should create note file on disk', async () => {
      const input = {
        note: 'File creation test',
        directoryPath: testPath,
        tags: ['file-test']
      };

      await tool.execute(input);

      const dataDir = process.env.A24Z_TEST_DATA_DIR!;
      const notesFile = path.join(dataDir, 'repository-notes.json');
      
      expect(fs.existsSync(notesFile)).toBe(true);
      
      const fileContent = JSON.parse(fs.readFileSync(notesFile, 'utf8'));
      expect(fileContent.notes).toHaveLength(1);
      expect(fileContent.notes[0].note).toBe('File creation test');
    });

    it('should include directory path in anchors automatically', async () => {
      const input = {
        note: 'Anchor test',
        directoryPath: testPath,
        tags: ['anchor-test'],
        anchors: ['custom-anchor']
      };

      await tool.execute(input);

      const notes = getNotesForPath(testPath, true, 10);
      expect(notes).toHaveLength(1);
      expect(notes[0].anchors).toContain(testPath);
      expect(notes[0].anchors).toContain('custom-anchor');
    });

    it('should add metadata with tool information', async () => {
      const input = {
        note: 'Metadata test',
        directoryPath: testPath,
        tags: ['metadata-test'],
        metadata: { userField: 'userValue' }
      };

      await tool.execute(input);

      const notes = getNotesForPath(testPath, true, 10);
      expect(notes).toHaveLength(1);
      
      const savedNote = notes[0];
      expect(savedNote.metadata).toHaveProperty('userField', 'userValue');
      expect(savedNote.metadata).toHaveProperty('toolVersion', '2.0.0');
      expect(savedNote.metadata).toHaveProperty('createdBy', 'repository_note_tool');
    });

    it('should handle multiple notes in same directory', async () => {
      const inputs = [
        {
          note: 'First note',
          directoryPath: testPath,
          tags: ['first']
        },
        {
          note: 'Second note', 
          directoryPath: testPath,
          tags: ['second']
        }
      ];

      for (const input of inputs) {
        await tool.execute(input);
      }

      const notes = getNotesForPath(testPath, true, 10);
      expect(notes).toHaveLength(2);
      
      const noteTexts = notes.map(n => n.note);
      expect(noteTexts).toContain('First note');
      expect(noteTexts).toContain('Second note');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid directory paths gracefully', async () => {
      const input = {
        note: 'Test note',
        directoryPath: '/invalid/path/that/does/not/exist',
        tags: ['test']
      };

      // Should not throw, just save the note as-is
      const result = await tool.execute(input);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/^Saved note/);
    });

    it('should preserve all input data in saved note', async () => {
      const input = {
        note: '# Test Note\\n\\nThis is **markdown** content.',
        directoryPath: testPath,
        anchors: ['src/**/*.ts', 'docs/'],
        tags: ['markdown', 'documentation', 'typescript'],
        confidence: 'low' as const,
        type: 'gotcha' as const,
        metadata: {
          author: 'test-user',
          complexity: 'high',
          relatedIssues: [123, 456]
        }
      };

      await tool.execute(input);

      const notes = getNotesForPath(testPath, true, 10);
      const saved = notes[0];

      expect(saved.note).toBe(input.note);
      expect(saved.directoryPath).toBe(input.directoryPath);
      expect(saved.tags).toEqual(input.tags);
      expect(saved.confidence).toBe(input.confidence);
      expect(saved.type).toBe(input.type);
      expect(saved.anchors).toContain(testPath);
      expect(saved.anchors).toContain('src/**/*.ts');
      expect(saved.anchors).toContain('docs/');
      expect(saved.metadata.author).toBe('test-user');
      expect(saved.metadata.complexity).toBe('high');
    });
  });
});