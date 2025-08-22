import { TEST_DIR } from './setup';

describe('Environment Debug', () => {
  it('should verify test environment setup', () => {
    console.log('TEST_DIR constant:', TEST_DIR);
    console.log('A24Z_TEST_DATA_DIR env var:', process.env.A24Z_TEST_DATA_DIR);
    
    // Import the store after setup has run
    const { saveNote } = require('../src/core-mcp/store/notesStore');
    
    console.log('About to save note...');
    const note = saveNote({
      note: 'Env test',
      directoryPath: TEST_DIR,
      tags: ['env-test'],
      anchors: [TEST_DIR],
      confidence: 'medium',
      type: 'explanation',
      metadata: {}
    });
    
    console.log('Note saved with ID:', note.id);
    
    // Check where the file actually got written
    const fs = require('fs');
    const path = require('path');
    
    const testDataDir = process.env.A24Z_TEST_DATA_DIR!;
    const userDataDir = path.join(require('os').homedir(), '.a24z');
    
    const testNotesFile = path.join(testDataDir, 'repository-notes.json');
    const userNotesFile = path.join(userDataDir, 'repository-notes.json');
    
    console.log('Test notes file exists:', fs.existsSync(testNotesFile));
    console.log('User notes file exists:', fs.existsSync(userNotesFile));
    
    expect(fs.existsSync(testNotesFile)).toBe(true);
  });
});