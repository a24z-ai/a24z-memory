import * as fs from 'node:fs';
import * as path from 'node:path';
import { saveNote } from '../src/core-mcp/store/notesStore';
import { TEST_DIR } from './setup';

describe('Detailed Debug Test', () => {
  it('should debug the save process step by step', () => {
    const testPath = path.join(TEST_DIR, 'detailed-debug');
    fs.mkdirSync(testPath, { recursive: true });

    const dataDir = process.env.A24Z_TEST_DATA_DIR!;
    console.log('Data directory:', dataDir);
    console.log('Data dir exists before:', fs.existsSync(dataDir));
    
    try {
      const note = saveNote({
        note: 'Detailed debug test',
        directoryPath: testPath,
        tags: ['debug'],
        anchors: [testPath],
        confidence: 'medium',
        type: 'explanation',
        metadata: {}
      });

      console.log('Save completed, note ID:', note.id);
      console.log('Data dir exists after:', fs.existsSync(dataDir));
      
      if (fs.existsSync(dataDir)) {
        const files = fs.readdirSync(dataDir);
        console.log('Files in data dir:', files);
      }
      
      const notesFile = path.join(dataDir, 'repository-notes.json');
      const tempFile = `${notesFile}.tmp`;
      
      console.log('Notes file exists:', fs.existsSync(notesFile));
      console.log('Temp file exists:', fs.existsSync(tempFile));
      
      // Try to create the directory and file manually
      console.log('Trying manual file creation...');
      fs.writeFileSync(notesFile, '{"version":1,"notes":[]}', 'utf8');
      console.log('Manual file created successfully');
      
      expect(true).toBe(true); // Always pass to see the logs
    } catch (error) {
      console.error('Error during save:', error);
      throw error;
    }
  });
});