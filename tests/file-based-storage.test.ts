import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { saveNote, getNotesForPath } from '../src/core-mcp/store/anchoredNotesStore';

describe('File-based note storage', () => {
  let tempDir: string;
  let testRepoPath: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-test-'));
    testRepoPath = path.join(tempDir, 'test-repo');
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should save notes as individual files in date-based directories', () => {
    const note = {
      note: 'Test note content',
      anchors: ['src/test.ts'],
      tags: ['testing'],
      metadata: {},
      directoryPath: testRepoPath,
    };

    const savedNoteWithPath = saveNote(note);
    const savedNote = savedNoteWithPath.note;

    // Check that the note was saved
    expect(savedNote.id).toBeDefined();
    expect(savedNote.timestamp).toBeDefined();

    // Check that the file exists in the correct location
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

  it('should read notes from individual files', () => {
    // Save multiple notes
    saveNote({
      note: 'First note',
      anchors: ['file1.ts'],
      tags: ['tag1'],
      metadata: {},
      directoryPath: testRepoPath,
    });

    saveNote({
      note: 'Second note',
      anchors: ['file2.ts'],
      tags: ['tag2'],
      metadata: {},
      directoryPath: testRepoPath,
    });

    // Read notes back
    const notes = getNotesForPath(testRepoPath, true);

    expect(notes.length).toBe(2);
    expect(notes.map((n) => n.note).sort()).toEqual(['First note', 'Second note'].sort());
  });

  it('should handle concurrent note creation without conflicts', async () => {
    // Simulate concurrent note creation
    const promises = Array.from({ length: 5 }, (_, i) =>
      Promise.resolve(
        saveNote({
          note: `Concurrent note ${i}`,
          anchors: [`file${i}.ts`],
          tags: ['concurrent'],
          metadata: {},
          directoryPath: testRepoPath,
        })
      )
    );

    const savedNotes = await Promise.all(promises);

    // All notes should have unique IDs
    const ids = savedNotes.map((n) => n.note.id);
    expect(new Set(ids).size).toBe(5);

    // All notes should be readable
    const notes = getNotesForPath(testRepoPath, true);
    expect(notes.length).toBe(5);
  });
});
