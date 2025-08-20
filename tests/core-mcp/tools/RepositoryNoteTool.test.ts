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
    // Create a .git directory to make it a valid git repo
    fs.mkdirSync(path.join(testPath, '.git'), { recursive: true });
  });

  describe('Schema Validation', () => {
    it('should validate required fields', () => {
      const validInput = {
        note: 'Test note content',
        directoryPath: testPath,
        anchors: ['src/test.ts'],
        tags: ['test']
      };

      expect(() => tool.schema.parse(validInput)).not.toThrow();
    });

    it('should require at least one tag', () => {
      const invalidInput = {
        note: 'Test note',
        directoryPath: testPath,
        anchors: ['src/test.ts'],
        tags: []
      };

      expect(() => tool.schema.parse(invalidInput)).toThrow('At least one tag is required');
    });
    
    it('should require at least one anchor', () => {
      const invalidInput = {
        note: 'Test note',
        directoryPath: testPath,
        anchors: [],
        tags: ['test']
      };

      expect(() => tool.schema.parse(invalidInput)).toThrow('At least one anchor path is required');
    });

    it('should set default values for optional fields', () => {
      const input = {
        note: 'Test note',
        directoryPath: testPath,
        anchors: ['src/test.ts'],
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
        anchors: ['src/test.ts'],
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
        anchors: ['src/test.ts'],
        tags: ['file-test']
      };

      await tool.execute(input);

      const notesFile = path.join(testPath, '.a24z', 'repository-notes.json');
      
      expect(fs.existsSync(notesFile)).toBe(true);
      
      const fileContent = JSON.parse(fs.readFileSync(notesFile, 'utf8'));
      expect(fileContent.notes).toHaveLength(1);
      expect(fileContent.notes[0].note).toBe('File creation test');
    });

    it('should normalize anchors to relative paths', async () => {
      const input = {
        note: 'Anchor test',
        directoryPath: testPath,
        tags: ['anchor-test'],
        anchors: ['custom-anchor', 'src/file.ts']
      };

      await tool.execute(input);

      const notes = getNotesForPath(testPath, true, 10);
      expect(notes).toHaveLength(1);
      // Anchors should be normalized to relative paths to repo root
      expect(notes[0].anchors).toHaveLength(2);
      expect(path.isAbsolute(notes[0].anchors[0])).toBe(false);
      expect(path.isAbsolute(notes[0].anchors[1])).toBe(false);
      expect(notes[0].anchors[0]).toBe('custom-anchor');
      expect(notes[0].anchors[1]).toBe('src/file.ts');
    });

    it('should add metadata with tool information', async () => {
      const input = {
        note: 'Metadata test',
        directoryPath: testPath,
        anchors: ['src/test.ts'],
        tags: ['metadata-test'],
        metadata: { userField: 'userValue' }
      };

      await tool.execute(input);

      const notes = getNotesForPath(testPath, true, 10);
      expect(notes).toHaveLength(1);
      
      const savedNote = notes[0];
      expect(savedNote.metadata).toHaveProperty('userField', 'userValue');
      expect(savedNote.metadata).toHaveProperty('toolVersion', '2.0.0');
      expect(savedNote.metadata).toHaveProperty('createdBy', 'create_repository_note_tool');
    });

    it('should write notes to the git root .a24z directory', async () => {
      // Create a subdirectory structure
      const subDir = path.join(testPath, 'src', 'components');
      fs.mkdirSync(subDir, { recursive: true });
      
      const input = {
        note: 'Test note for git root storage',
        directoryPath: testPath,  // Git root
        anchors: ['src/components/Button.tsx'],
        tags: ['test']
      };

      await tool.execute(input);

      // Verify the note is stored in the git root's .a24z directory
      const gitRootNotesFile = path.join(testPath, '.a24z', 'repository-notes.json');
      expect(fs.existsSync(gitRootNotesFile)).toBe(true);
      
      // Verify no .a24z directory was created in subdirectories
      const subDirA24z = path.join(subDir, '.a24z');
      expect(fs.existsSync(subDirA24z)).toBe(false);
      
      // Verify the note content
      const fileContent = JSON.parse(fs.readFileSync(gitRootNotesFile, 'utf8'));
      expect(fileContent.notes).toHaveLength(1);
      expect(fileContent.notes[0].note).toBe('Test note for git root storage');
    });

    it('should handle multiple notes in same directory', async () => {
      const inputs = [
        {
          note: 'First note',
          directoryPath: testPath,
          anchors: ['src/first.ts'],
          tags: ['first']
        },
        {
          note: 'Second note', 
          directoryPath: testPath,
          anchors: ['src/second.ts'],
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
    it('should reject relative directory paths', async () => {
      const input = {
        note: 'Test note',
        directoryPath: '.',
        anchors: ['src/test.ts'],
        tags: ['test']
      };

      await expect(tool.execute(input)).rejects.toThrow('directoryPath must be an absolute path');
    });

    it('should reject non-existent directory paths', async () => {
      const input = {
        note: 'Test note',
        directoryPath: '/invalid/path/that/does/not/exist',
        anchors: ['src/test.ts'],
        tags: ['test']
      };

      await expect(tool.execute(input)).rejects.toThrow('directoryPath does not exist');
    });

    it('should reject non-git-root paths', async () => {
      const subDir = path.join(testPath, 'src');
      fs.mkdirSync(subDir, { recursive: true });
      
      const input = {
        note: 'Test note',
        directoryPath: subDir,
        anchors: ['test.ts'],
        tags: ['test']
      };

      await expect(tool.execute(input)).rejects.toThrow('directoryPath must be the git repository root');
    });

    it('should reject paths outside git repositories', async () => {
      const nonGitPath = path.join(TEST_DIR, 'non-git-repo');
      fs.mkdirSync(nonGitPath, { recursive: true });
      
      const input = {
        note: 'Test note',
        directoryPath: nonGitPath,
        anchors: ['test.ts'],
        tags: ['test']
      };

      await expect(tool.execute(input)).rejects.toThrow('directoryPath is not within a git repository');
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
      expect(saved.anchors).toContain('src/**/*.ts');
      expect(saved.anchors).toContain('docs/');
      expect(saved.metadata.author).toBe('test-user');
      expect(saved.metadata.complexity).toBe('high');
    });
    
    it('should store notes in separate .a24z directories for different repositories', async () => {
      // Create a second repository
      const repo2Path = path.join(TEST_DIR, 'test-repo-2');
      fs.mkdirSync(repo2Path, { recursive: true });
      fs.mkdirSync(path.join(repo2Path, '.git'), { recursive: true });
      
      // Save note in first repository
      const input1 = {
        note: 'Note in repo 1',
        directoryPath: testPath,
        anchors: ['file1.ts'],
        tags: ['repo1']
      };
      await tool.execute(input1);
      
      // Save note in second repository
      const input2 = {
        note: 'Note in repo 2',
        directoryPath: repo2Path,
        anchors: ['file2.ts'],
        tags: ['repo2']
      };
      await tool.execute(input2);
      
      // Verify each repository has its own .a24z directory with the correct note
      const repo1NotesFile = path.join(testPath, '.a24z', 'repository-notes.json');
      const repo2NotesFile = path.join(repo2Path, '.a24z', 'repository-notes.json');
      
      expect(fs.existsSync(repo1NotesFile)).toBe(true);
      expect(fs.existsSync(repo2NotesFile)).toBe(true);
      
      // Verify repo 1 has only its note
      const repo1Content = JSON.parse(fs.readFileSync(repo1NotesFile, 'utf8'));
      expect(repo1Content.notes).toHaveLength(1);
      expect(repo1Content.notes[0].note).toBe('Note in repo 1');
      
      // Verify repo 2 has only its note
      const repo2Content = JSON.parse(fs.readFileSync(repo2NotesFile, 'utf8'));
      expect(repo2Content.notes).toHaveLength(1);
      expect(repo2Content.notes[0].note).toBe('Note in repo 2');
      
      // Clean up
      fs.rmSync(repo2Path, { recursive: true, force: true });
    });
  });
});