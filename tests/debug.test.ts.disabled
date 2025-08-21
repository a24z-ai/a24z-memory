import * as fs from 'node:fs';
import * as path from 'node:path';
import { saveNote } from '../src/core-mcp/store/notesStore';
import { TEST_DIR } from './setup';

describe('Debug Test', () => {
  it('should save note directly', () => {
    const testPath = path.join(TEST_DIR, 'debug-test');
    fs.mkdirSync(testPath, { recursive: true });

    console.log('TEST_DIR:', process.env.A24Z_TEST_DATA_DIR);
    
    const note = saveNote({
      note: 'Debug test',
      directoryPath: testPath,
      tags: ['debug'],
      anchors: [testPath],
      confidence: 'medium',
      type: 'explanation',
      metadata: {}
    });

    console.log('Saved note:', note.id);
    
    const dataDir = process.env.A24Z_TEST_DATA_DIR!;
    const notesFile = path.join(dataDir, 'repository-notes.json');
    
    console.log('Expected notes file:', notesFile);
    console.log('File exists:', fs.existsSync(notesFile));
    
    if (fs.existsSync(notesFile)) {
      const content = fs.readFileSync(notesFile, 'utf8');
      console.log('File content:', content);
    }

    expect(fs.existsSync(notesFile)).toBe(true);
  });
});