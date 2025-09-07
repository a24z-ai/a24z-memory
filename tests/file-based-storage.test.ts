import { AnchoredNotesStore } from '../src/pure-core/stores/AnchoredNotesStore';
import { InMemoryFileSystemAdapter } from './test-adapters/InMemoryFileSystemAdapter';
import { CodebaseViewsStore } from '../src/pure-core/stores/CodebaseViewsStore';
import { MemoryPalace } from '../src/MemoryPalace';
import type { ValidatedRepositoryPath, CodebaseView } from '../src/pure-core/types';

describe('File-based note storage', () => {
  let fs: InMemoryFileSystemAdapter;
  let store: AnchoredNotesStore;
  let codebaseViewsStore: CodebaseViewsStore;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;

  beforeEach(() => {
    // Initialize in-memory filesystem and stores
    fs = new InMemoryFileSystemAdapter();
    store = new AnchoredNotesStore(fs);
    codebaseViewsStore = new CodebaseViewsStore(fs);

    // Set up test repository
    fs.setupTestRepo(testRepoPath);
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fs, testRepoPath);

    // Create a test view
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

  afterEach(() => {
    // Clean up is handled automatically by InMemoryFileSystemAdapter
  });

  it('should save notes as individual files', () => {
    const note = {
      note: 'Test note content',
      anchors: ['src/test.ts'],
      tags: ['testing'],
      codebaseViewId: 'test-view',
      metadata: {},
      directoryPath: validatedRepoPath,
    };

    const savedNoteWithPath = store.saveNote(note);
    const savedNote = savedNoteWithPath.note;

    // Check that the note was saved
    expect(savedNote.id).toBeDefined();
    expect(savedNote.timestamp).toBeDefined();

    // Check that the file exists in the correct location with date-based directories
    const date = new Date(savedNote.timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const notePath = fs.join(
      testRepoPath,
      '.a24z',
      'notes',
      year.toString(),
      month,
      `${savedNote.id}.json`
    );

    expect(fs.exists(notePath)).toBe(true);

    // Read the file and verify its contents
    const fileContent = JSON.parse(fs.readFile(notePath));
    expect(fileContent.note).toBe('Test note content');
    expect(fileContent.id).toBe(savedNote.id);
  });

  it('should save multiple notes as individual files', () => {
    // Save multiple notes
    const note1 = store.saveNote({
      note: 'First note',
      anchors: ['file1.ts'],
      tags: ['tag1'],
      codebaseViewId: 'test-view',
      metadata: {},
      directoryPath: validatedRepoPath,
    });

    const note2 = store.saveNote({
      note: 'Second note',
      anchors: ['file2.ts'],
      tags: ['tag2'],
      codebaseViewId: 'test-view',
      metadata: {},
      directoryPath: validatedRepoPath,
    });

    // Verify both notes can be retrieved individually
    const retrieved1 = store.getNoteById(validatedRepoPath, note1.note.id);
    const retrieved2 = store.getNoteById(validatedRepoPath, note2.note.id);

    expect(retrieved1?.note).toBe('First note');
    expect(retrieved2?.note).toBe('Second note');
  });

  it('should handle concurrent note creation without conflicts', async () => {
    // Simulate concurrent note creation
    const promises = Array.from({ length: 5 }, (_, i) =>
      Promise.resolve(
        store.saveNote({
          note: `Concurrent note ${i}`,
          anchors: [`file${i}.ts`],
          tags: ['concurrent'],
          codebaseViewId: 'test-view',
          metadata: {},
          directoryPath: validatedRepoPath,
        })
      )
    );

    const savedNotes = await Promise.all(promises);

    // All notes should have unique IDs
    const ids = savedNotes.map((n) => n.note.id);
    expect(new Set(ids).size).toBe(5);

    // All notes should be readable individually
    for (const savedNote of savedNotes) {
      const retrieved = store.getNoteById(validatedRepoPath, savedNote.note.id);
      expect(retrieved).toBeTruthy();
    }
  });
});
