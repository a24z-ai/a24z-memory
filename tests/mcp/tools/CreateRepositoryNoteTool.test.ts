import { CreateRepositoryAnchoredNoteTool } from '../../../src/mcp/tools/CreateRepositoryAnchoredNoteTool';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { AnchoredNotesStore } from '../../../src/pure-core/stores/AnchoredNotesStore';
import { CodebaseViewsStore } from '../../../src/pure-core/stores/CodebaseViewsStore';
import { MemoryPalace } from '../../../src/MemoryPalace';
import type {
  ValidatedRepositoryPath,
  ValidatedRelativePath,
  CodebaseView,
} from '../../../src/pure-core/types';

describe('CreateRepositoryAnchoredNoteTool', () => {
  let tool: CreateRepositoryAnchoredNoteTool;
  let notesStore: AnchoredNotesStore;
  let fs: InMemoryFileSystemAdapter;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    tool = new CreateRepositoryAnchoredNoteTool(fs);
    notesStore = new AnchoredNotesStore(fs);
    fs.setupTestRepo(testRepoPath);
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fs, testRepoPath);

    // Create a test view using CodebaseViewsStore
    const codebaseViewsStore = new CodebaseViewsStore(fs);
    const testView: CodebaseView = {
      id: 'test-view',
      version: '1.0.0',
      name: 'Test View',
      description: 'Test view for testing',
      overviewPath: 'README.md',
      cells: {},
      timestamp: new Date().toISOString(),
    };
    codebaseViewsStore.saveView(validatedRepoPath, testView);
  });

  describe('Schema Validation', () => {
    it('should validate required fields', () => {
      const validInput = {
        note: 'Test note content',
        directoryPath: testRepoPath,
        anchors: ['src/test.ts'],
        codebaseViewId: 'test-view',
        tags: ['test'],
      };

      expect(() => tool.schema.parse(validInput)).not.toThrow();
    });

    it('should require at least one tag', () => {
      const invalidInput = {
        note: 'Test note',
        directoryPath: testRepoPath,
        anchors: ['src/test.ts'],
        codebaseViewId: 'test-view',
        tags: [],
      };

      expect(() => tool.schema.parse(invalidInput)).toThrow('At least one tag is required');
    });

    it('should require at least one anchor', () => {
      const invalidInput = {
        note: 'Test note',
        directoryPath: testRepoPath,
        anchors: [],
        tags: ['test'],
      };

      expect(() => tool.schema.parse(invalidInput)).toThrow('At least one anchor path is required');
    });

    it('should set default values for optional fields', () => {
      const input = {
        note: 'Test note',
        directoryPath: testRepoPath,
        anchors: ['src/test.ts'],
        codebaseViewId: 'test-view',
        tags: ['test'],
      };

      const parsed = tool.schema.parse(input);
      // Type field has been removed from the schema
      expect(parsed).toBeDefined();
    });

    // Test removed - type field is no longer part of the schema
  });

  describe('Note Storage', () => {
    it('should save note with correct structure', async () => {
      const input = {
        note: 'Test repository note',
        directoryPath: testRepoPath,
        tags: ['test', 'example'],
        anchors: ['additional-path'],
        codebaseViewId: 'test-view',
        metadata: { customField: 'value' },
      };

      const result = await tool.execute(input);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Note saved successfully');
    });

    it('should create note file on disk', async () => {
      const input = {
        note: 'File creation test',
        directoryPath: testRepoPath,
        anchors: ['src/test.ts'],
        codebaseViewId: 'test-view',
        tags: ['file-test'],
      };

      await tool.execute(input);

      const notesDir = fs.join(testRepoPath, '.a24z', 'notes');

      expect(fs.exists(notesDir)).toBe(true);

      // Verify note can be retrieved
      const rootPath = '' as ValidatedRelativePath;
      const notes = notesStore.getNotesForPath(validatedRepoPath, rootPath, true);
      expect(notes).toHaveLength(1);
      expect(notes[0].note.note).toBe('File creation test');
    });

    it('should normalize anchors to relative paths', async () => {
      const input = {
        note: 'Anchor test',
        directoryPath: testRepoPath,
        tags: ['anchor-test'],
        anchors: ['custom-anchor', 'src/file.ts'],
        codebaseViewId: 'test-view',
      };

      await tool.execute(input);

      const rootPath = '' as ValidatedRelativePath;
      const notes = notesStore.getNotesForPath(validatedRepoPath, rootPath, true);
      expect(notes).toHaveLength(1);
      // Anchors should be normalized to relative paths to repo root
      expect(notes[0].note.anchors).toHaveLength(2);
      expect(fs.isAbsolute(notes[0].note.anchors[0])).toBe(false);
      expect(fs.isAbsolute(notes[0].note.anchors[1])).toBe(false);
      expect(notes[0].note.anchors[0]).toBe('custom-anchor');
      expect(notes[0].note.anchors[1]).toBe('src/file.ts');
    });

    it('should add metadata with tool information', async () => {
      const input = {
        note: 'Metadata test',
        directoryPath: testRepoPath,
        anchors: ['src/test.ts'],
        codebaseViewId: 'test-view',
        tags: ['metadata-test'],
        metadata: { userField: 'userValue' },
      };

      await tool.execute(input);

      const rootPath = '' as ValidatedRelativePath;
      const notes = notesStore.getNotesForPath(validatedRepoPath, rootPath, true);
      expect(notes).toHaveLength(1);

      const savedNote = notes[0].note;
      expect(savedNote.metadata).toHaveProperty('userField', 'userValue');
      expect(savedNote.metadata).toHaveProperty('toolVersion', '2.0.0');
      expect(savedNote.metadata).toHaveProperty('createdBy', 'create_repository_note_tool');
    });

    it('should write notes to the git root .a24z directory', async () => {
      // Create a subdirectory structure
      const subDir = fs.join(testRepoPath, 'src', 'components');
      fs.createDir(subDir);

      const input = {
        note: 'Test note for git root storage',
        directoryPath: testRepoPath, // Git root
        anchors: ['src/components/Button.tsx'],
        codebaseViewId: 'test-view',
        tags: ['test'],
      };

      await tool.execute(input);

      // Verify the note is stored in the git root's .a24z directory
      const gitRootNotesDir = fs.join(testRepoPath, '.a24z', 'notes');
      expect(fs.exists(gitRootNotesDir)).toBe(true);

      // Verify no .a24z directory was created in subdirectories
      const subDirA24z = fs.join(subDir, '.a24z');
      expect(fs.exists(subDirA24z)).toBe(false);

      // Verify the note can be retrieved
      const rootPath = '' as ValidatedRelativePath;
      const notes = notesStore.getNotesForPath(validatedRepoPath, rootPath, true);
      expect(notes).toHaveLength(1);
      expect(notes[0].note.note).toBe('Test note for git root storage');
    });

    it('should handle multiple notes in same directory', async () => {
      const inputs = [
        {
          note: 'First note',
          directoryPath: testRepoPath,
          anchors: ['src/first.ts'],
          codebaseViewId: 'test-view',
          tags: ['first'],
        },
        {
          note: 'Second note',
          directoryPath: testRepoPath,
          anchors: ['src/second.ts'],
          codebaseViewId: 'test-view',
          tags: ['second'],
        },
      ];

      for (const input of inputs) {
        await tool.execute(input);
      }

      const rootPath = '' as ValidatedRelativePath;
      const notes = notesStore.getNotesForPath(validatedRepoPath, rootPath, true);
      expect(notes).toHaveLength(2);

      const noteTexts = notes.map((n) => n.note.note);
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
        codebaseViewId: 'test-view',
        tags: ['test'],
      };

      await expect(tool.execute(input)).rejects.toThrow('directoryPath must be an absolute path');
    });

    it('should reject non-existent directory paths', async () => {
      const input = {
        note: 'Test note',
        directoryPath: '/invalid/path/that/does/not/exist',
        anchors: ['src/test.ts'],
        codebaseViewId: 'test-view',
        tags: ['test'],
      };

      await expect(tool.execute(input)).rejects.toThrow('directoryPath does not exist');
    });

    it('should reject non-git-root paths', async () => {
      const subDir = fs.join(testRepoPath, 'src');
      fs.createDir(subDir);

      const input = {
        note: 'Test note',
        directoryPath: subDir,
        anchors: ['test.ts'],
        codebaseViewId: 'test-view',
        tags: ['test'],
      };

      await expect(tool.execute(input)).rejects.toThrow(
        'directoryPath must be a git repository root containing a .git directory'
      );
    });

    it('should reject paths outside git repositories', async () => {
      const nonGitPath = '/non-git-repo';
      fs.createDir(nonGitPath);

      const input = {
        note: 'Test note',
        directoryPath: nonGitPath,
        anchors: ['test.ts'],
        codebaseViewId: 'test-view',
        tags: ['test'],
      };

      await expect(tool.execute(input)).rejects.toThrow(
        'directoryPath must be a git repository root containing a .git directory'
      );
    });

    it('should preserve all input data in saved note', async () => {
      const input = {
        note: '# Test Note\\n\\nThis is **markdown** content.',
        directoryPath: testRepoPath,
        anchors: ['src/**/*.ts', 'docs/'],
        tags: ['markdown', 'documentation', 'typescript'],
        codebaseViewId: 'test-view',
        metadata: {
          author: 'test-user',
          complexity: 'high',
          relatedIssues: [123, 456],
        },
      };

      await tool.execute(input);

      const rootPath = '' as ValidatedRelativePath;
      const notes = notesStore.getNotesForPath(validatedRepoPath, rootPath, true);
      const saved = notes[0].note;

      expect(saved.note).toBe(input.note);
      expect(saved.tags).toEqual(input.tags);
      expect(saved.anchors).toContain('src/**/*.ts');
      expect(saved.anchors).toContain('docs/');
      expect(saved.metadata.author).toBe('test-user');
      expect(saved.metadata.complexity).toBe('high');
    });

    it('should store notes in separate .a24z directories for different repositories', async () => {
      // Create a second repository
      const repo2Path = '/test-repo-2';
      fs.setupTestRepo(repo2Path);
      const validatedRepo2Path = MemoryPalace.validateRepositoryPath(fs, repo2Path);

      // Create a test view for the second repository
      const codebaseViewsStore = new CodebaseViewsStore(fs);
      const testView2: CodebaseView = {
        id: 'test-view',
        version: '1.0.0',
        name: 'Test View 2',
        description: 'Test view for testing repo 2',
        overviewPath: 'README.md',
        cells: {},
        timestamp: new Date().toISOString(),
      };
      codebaseViewsStore.saveView(validatedRepo2Path, testView2);

      // Save note in first repository
      const input1 = {
        note: 'Note in repo 1',
        directoryPath: testRepoPath,
        anchors: ['file1.ts'],
        codebaseViewId: 'test-view',
        tags: ['repo1'],
      };
      await tool.execute(input1);

      // Save note in second repository
      const input2 = {
        note: 'Note in repo 2',
        directoryPath: repo2Path,
        anchors: ['file2.ts'],
        codebaseViewId: 'test-view',
        tags: ['repo2'],
      };
      await tool.execute(input2);

      // Verify each repository has its own .a24z directory with the correct note
      const repo1NotesDir = fs.join(testRepoPath, '.a24z', 'notes');
      const repo2NotesDir = fs.join(repo2Path, '.a24z', 'notes');

      expect(fs.exists(repo1NotesDir)).toBe(true);
      expect(fs.exists(repo2NotesDir)).toBe(true);

      // Verify repo 1 has only its note
      const rootPath = '' as ValidatedRelativePath;
      const repo1Notes = notesStore.getNotesForPath(validatedRepoPath, rootPath, true);
      expect(repo1Notes).toHaveLength(1);
      expect(repo1Notes[0].note.note).toBe('Note in repo 1');

      // Verify repo 2 has only its note
      const repo2Notes = notesStore.getNotesForPath(validatedRepo2Path, rootPath, true);
      expect(repo2Notes).toHaveLength(1);
      expect(repo2Notes[0].note.note).toBe('Note in repo 2');
    });
  });
});
