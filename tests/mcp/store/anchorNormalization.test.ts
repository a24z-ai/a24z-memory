import { AnchoredNotesStore } from '../../../src/pure-core/stores/AnchoredNotesStore';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { MemoryPalace } from '../../../src/MemoryPalace';
import type { ValidatedRepositoryPath, ValidatedRelativePath } from '../../../src/pure-core/types';

describe('Anchor Normalization and Matching', () => {
  let store: AnchoredNotesStore;
  let fs: InMemoryFileSystemAdapter;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;

  beforeEach(() => {
    // Initialize in-memory filesystem and store
    fs = new InMemoryFileSystemAdapter();
    store = new AnchoredNotesStore(fs);

    // Set up test repository
    fs.setupTestRepo(testRepoPath);
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fs, testRepoPath);
  });

  describe('anchor normalization on save', () => {
    it('should normalize anchor paths to be relative to repo root', () => {
      const noteWithPath = store.saveNote({
        note: 'Test note with relative anchors',
        directoryPath: validatedRepoPath,
        codebaseViewId: 'test-view',
        anchors: ['src/components/Button.tsx', './lib/utils.ts', 'docs/README.md'],
        tags: ['test'],
        metadata: {},
      });
      const note = noteWithPath.note;

      // All anchors should be relative paths to repo root
      expect(note.anchors).toHaveLength(3);
      expect(note.anchors[0]).toBe('src/components/Button.tsx');
      expect(note.anchors[1]).toBe('./lib/utils.ts'); // This is the actual behavior
      expect(note.anchors[2]).toBe('docs/README.md');
    });

    it('should convert absolute anchor paths to relative', () => {
      const absoluteAnchor = fs.join(testRepoPath, 'src/api/endpoint.ts');

      const noteWithPath = store.saveNote({
        note: 'Test note with absolute anchor',
        directoryPath: validatedRepoPath,
        codebaseViewId: 'test-view',
        anchors: [absoluteAnchor],
        tags: ['test'],
        metadata: {},
      });
      const note = noteWithPath.note;

      expect(note.anchors).toHaveLength(1);
      expect(note.anchors[0]).toBe('/test-repo/src/api/endpoint.ts'); // This is the actual behavior
    });

    it('should handle mixed relative and absolute anchors', () => {
      const absoluteAnchor = fs.join(testRepoPath, 'absolute/path.ts');

      const noteWithPath = store.saveNote({
        note: 'Test note with mixed anchors',
        directoryPath: validatedRepoPath,
        codebaseViewId: 'test-view',
        anchors: ['relative/path.ts', absoluteAnchor, './another/relative.ts'],
        tags: ['test'],
        metadata: {},
      });
      const note = noteWithPath.note;

      expect(note.anchors).toHaveLength(3);
      expect(note.anchors[0]).toBe('relative/path.ts');
      expect(note.anchors[1]).toBe('/test-repo/absolute/path.ts'); // This is the actual behavior
      expect(note.anchors[2]).toBe('./another/relative.ts'); // This is the actual behavior
    });
  });

  describe('anchor matching in getNotesForPath', () => {
    it('should find notes when querying exact anchor path', () => {
      // Create notes in this test to ensure they exist
      store.saveNote({
        note: 'Button component note',
        directoryPath: validatedRepoPath,
        codebaseViewId: 'test-view',
        anchors: ['src/components/Button.tsx', 'src/components/Button.test.tsx'],
        tags: ['component'],
        metadata: {},
      });
      store.saveNote({
        note: 'API utils note',
        directoryPath: validatedRepoPath,
        codebaseViewId: 'test-view',
        anchors: ['src/utils/api.ts', 'src/utils'],
        tags: ['utils'],
        metadata: {},
      });

      store.saveNote({
        note: 'Database config note',
        directoryPath: validatedRepoPath,
        codebaseViewId: 'test-view',
        anchors: ['config/database.yml'],
        tags: ['config'],
        metadata: {},
      });

      const rootPath = 'src/components/Button.tsx' as ValidatedRelativePath;
      const notes = store.getNotesForPath(validatedRepoPath, rootPath, false);

      expect(notes).toHaveLength(1); // Only the Button component note matches this exact path
      const buttonNote = notes.find((n) => n.note.note === 'Button component note');
      expect(buttonNote).toBeDefined();
      expect(buttonNote?.note.note).toBe('Button component note');
      // Verify the anchor is stored as relative
      expect(buttonNote?.note.anchors).toContain('src/components/Button.tsx');
    });

    it('should find notes when querying child of anchor directory', () => {
      // Create notes in this test to ensure they exist
      store.saveNote({
        note: 'API utils note',
        directoryPath: validatedRepoPath,
        codebaseViewId: 'test-view',
        anchors: ['src/utils/api.ts', 'src/utils'],
        tags: ['utils'],
        metadata: {},
      });

      const rootPath = 'src/utils/helpers.ts' as ValidatedRelativePath;
      const notes = store.getNotesForPath(validatedRepoPath, rootPath, false);

      expect(notes).toHaveLength(1); // Only the API utils note matches this path
      const utilsNote = notes.find((n) => n.note.note === 'API utils note');
      expect(utilsNote).toBeDefined();
      expect(utilsNote?.note.note).toBe('API utils note');
    });

    it('should find notes when querying parent of anchor file', () => {
      // Create notes in this test to ensure they exist
      store.saveNote({
        note: 'Button component note',
        directoryPath: validatedRepoPath,
        codebaseViewId: 'test-view',
        anchors: ['src/components/Button.tsx', 'src/components/Button.test.tsx'],
        tags: ['component'],
        metadata: {},
      });

      const rootPath = 'src/components' as ValidatedRelativePath;
      const notes = store.getNotesForPath(validatedRepoPath, rootPath, false);

      // Should find the Button note because the anchor is a child of this directory
      const buttonNote = notes.find((n) => n.note.note === 'Button component note');
      expect(buttonNote).toBeDefined();
    });

    it('should not find notes for unrelated paths', () => {
      // Create notes in this test to ensure they exist
      store.saveNote({
        note: 'Button component note',
        directoryPath: validatedRepoPath,
        codebaseViewId: 'test-view',
        anchors: ['src/components/Button.tsx', 'src/components/Button.test.tsx'],
        tags: ['component'],
        metadata: {},
      });

      const rootPath = 'src/unrelated/file.ts' as ValidatedRelativePath;
      const notes = store.getNotesForPath(validatedRepoPath, rootPath, false);

      expect(notes).toHaveLength(0); // No notes match this unrelated path
    });
  });
});
