import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { AnchoredNotesStore } from '../src/pure-core/stores/AnchoredNotesStore';
import { createNodeFileSystemAdapter } from '../src/node-adapters/NodeFileSystemAdapter';
import { createTestView } from './test-helpers';

describe('File-based note storage', () => {
  let tempDir: string;
  let testRepoPath: string;
  let store: AnchoredNotesStore;

  beforeEach(() => {
    // Create the store with Node.js filesystem adapter
    const nodeFs = createNodeFileSystemAdapter();
    store = new AnchoredNotesStore(nodeFs);
    
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-test-'));
    testRepoPath = path.join(tempDir, 'test-repo');
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });
    // Create a test view
    createTestView(testRepoPath, 'test-view');
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should save notes as individual files', () => {
    const note = {
      note: 'Test note content',
      anchors: ['src/test.ts'],
      tags: ['testing'],
      codebaseViewId: 'test-view',
      metadata: {},
      directoryPath: testRepoPath,
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
    const notePath = path.join(
      testRepoPath,
      '.a24z',
      'notes',
      year.toString(),
      month,
      `${savedNote.id}.json`
    );

    expect(fs.existsSync(notePath)).toBe(true);

    // Read the file and verify its contents
    const fileContent = JSON.parse(fs.readFileSync(notePath, 'utf8'));
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
      directoryPath: testRepoPath,
    });

    const note2 = store.saveNote({
      note: 'Second note',
      anchors: ['file2.ts'],
      tags: ['tag2'],
      codebaseViewId: 'test-view',
      metadata: {},
      directoryPath: testRepoPath,
    });

    // Verify both notes can be retrieved individually
    const retrieved1 = store.getNoteById(testRepoPath, note1.note.id);
    const retrieved2 = store.getNoteById(testRepoPath, note2.note.id);
    
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
          directoryPath: testRepoPath,
        })
      )
    );

    const savedNotes = await Promise.all(promises);

    // All notes should have unique IDs
    const ids = savedNotes.map((n) => n.note.id);
    expect(new Set(ids).size).toBe(5);

    // All notes should be readable individually
    for (const savedNote of savedNotes) {
      const retrieved = store.getNoteById(testRepoPath, savedNote.note.id);
      expect(retrieved).toBeTruthy();
    }
  });
});
