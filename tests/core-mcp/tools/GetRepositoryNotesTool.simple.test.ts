import * as fs from 'node:fs';
import * as path from 'node:path';
import { GetRepositoryNotesTool } from '../../../src/core-mcp/tools/GetRepositoryNotesTool';
import { saveNote } from '../../../src/core-mcp/store/notesStore';
import { TEST_DIR } from '../../setup';

describe('GetRepositoryNotesTool (Simple)', () => {
  let tool: GetRepositoryNotesTool;
  const testPath = path.join(TEST_DIR, 'test-repo');

  beforeEach(() => {
    tool = new GetRepositoryNotesTool();
    fs.mkdirSync(testPath, { recursive: true });
  });

  it('should return JSON response for empty path', async () => {
    const result = await tool.execute({ path: testPath });
    
    expect(result.content[0].type).toBe('text');
    const data = JSON.parse(result.content[0].text!);
    expect(data.success).toBe(true);
    expect(data.totalNotes).toBe(0);
  });

  it('should return notes in JSON format', async () => {
    const note = saveNote({
      note: 'Test note',
      directoryPath: testPath,
      tags: ['test'],
      anchors: [testPath],
      confidence: 'high',
      type: 'explanation',
      metadata: {}
    });

    const result = await tool.execute({ path: testPath });
    const data = JSON.parse(result.content[0].text!);
    
    expect(data.totalNotes).toBe(1);
    expect(data.notes[0].id).toBe(note.id);
  });
});