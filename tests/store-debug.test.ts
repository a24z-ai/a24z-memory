import { describe, it, expect, afterAll } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Import the internal functions by copying them temporarily
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-store-debug-test-'));
const NOTES_FILE = path.join(DATA_DIR, 'repository-notes.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    console.log('Creating data directory:', DATA_DIR);
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } else {
    console.log('Data directory exists:', DATA_DIR);
  }
}

function writeAllNotes(notes: unknown[]): void {
  console.log('writeAllNotes called with', notes.length, 'notes');
  ensureDataDir();
  const payload = { version: 1, notes };
  const tmp = `${NOTES_FILE}.tmp`;

  console.log('Writing to temp file:', tmp);
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), { encoding: 'utf8' });
  console.log('Temp file written, size:', fs.statSync(tmp).size);

  console.log('Renaming', tmp, 'to', NOTES_FILE);
  fs.renameSync(tmp, NOTES_FILE);
  console.log('Rename complete, final file exists:', fs.existsSync(NOTES_FILE));
}

describe('Store Debug Test', () => {
  afterAll(() => {
    // Clean up the temp directory
    if (fs.existsSync(DATA_DIR)) {
      fs.rmSync(DATA_DIR, { recursive: true, force: true });
    }
  });

  it('should test the write process manually', () => {
    const testNotes = [
      {
        id: 'test-123',
        note: 'Test note',
        directoryPath: '/test/path',
        tags: ['test'],
        anchors: ['/test/path'],
        metadata: {},
        timestamp: Date.now(),
      },
    ];

    console.log('Starting manual write test...');
    writeAllNotes(testNotes);

    expect(fs.existsSync(NOTES_FILE)).toBe(true);

    const content = fs.readFileSync(NOTES_FILE, 'utf8');
    const data = JSON.parse(content);
    expect(data.notes).toHaveLength(1);
    expect(data.notes[0].id).toBe('test-123');
  });
});
