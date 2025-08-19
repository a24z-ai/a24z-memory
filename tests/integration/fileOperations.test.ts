import * as fs from 'node:fs';
import * as path from 'node:path';
import { RepositoryNoteTool } from '../../src/core-mcp/tools/RepositoryNoteTool';
import { GetRepositoryNotesTool } from '../../src/core-mcp/tools/GetRepositoryNotesTool';
import { GetRepositoryTagsTool } from '../../src/core-mcp/tools/GetRepositoryTagsTool';
import { TEST_DIR } from '../setup';

describe('File Operations Integration', () => {
  const testPath = path.join(TEST_DIR, 'file-ops-test');
  
  beforeEach(() => {
    fs.mkdirSync(testPath, { recursive: true });
  });

  it('should complete full create-retrieve-query workflow', async () => {
    // Step 1: Create a note
    const createTool = new RepositoryNoteTool();
    const createResult = await createTool.execute({
      note: '# Integration Test\\n\\nThis tests file operations.',
      directoryPath: testPath,
      tags: ['integration', 'file-ops'],
      confidence: 'high',
      type: 'explanation',
      metadata: { test: true }
    });

    expect(createResult.content[0].text).toMatch(/^Saved note/);

    // Step 2: Verify note was written to filesystem
    const dataDir = process.env.A24Z_TEST_DATA_DIR!;
    const notesFile = path.join(dataDir, 'repository-notes.json');
    expect(fs.existsSync(notesFile)).toBe(true);

    const fileContent = JSON.parse(fs.readFileSync(notesFile, 'utf8'));
    expect(fileContent.notes).toHaveLength(1);
    expect(fileContent.notes[0].note).toContain('Integration Test');

    // Step 3: Retrieve notes
    const getTool = new GetRepositoryNotesTool();
    const getResult = await getTool.execute({ path: testPath });
    const getData = JSON.parse(getResult.content[0].text!);

    expect(getData.success).toBe(true);
    expect(getData.totalNotes).toBe(1);
    expect(getData.notes[0].note).toContain('Integration Test');

    // Step 4: Get tags
    const tagsTool = new GetRepositoryTagsTool();
    const tagsResult = await tagsTool.execute({ path: testPath });
    const tagsData = JSON.parse(tagsResult.content[0].text!);

    expect(tagsData.success).toBe(true);
    expect(tagsData.usedTags).toContain('integration');
    expect(tagsData.usedTags).toContain('file-ops');
  });

  it('should handle concurrent file writes safely', async () => {
    const createTool = new RepositoryNoteTool();
    
    // Create 10 notes concurrently
    const promises = Array.from({ length: 10 }, (_, i) =>
      createTool.execute({
        note: `Concurrent note ${i}`,
        directoryPath: testPath,
        tags: [`tag-${i}`],
        confidence: 'medium',
        type: 'explanation',
        metadata: { index: i }
      })
    );

    const results = await Promise.all(promises);
    
    // All should succeed
    results.forEach(result => {
      expect(result.content[0].text).toMatch(/^Saved note/);
    });

    // Verify all were saved
    const getTool = new GetRepositoryNotesTool();
    const getResult = await getTool.execute({ path: testPath });
    const data = JSON.parse(getResult.content[0].text!);
    
    expect(data.totalNotes).toBe(10);
  });

  it('should persist notes across tool instances', async () => {
    // Create note with first tool instance
    const tool1 = new RepositoryNoteTool();
    await tool1.execute({
      note: 'Persistence test',
      directoryPath: testPath,
      tags: ['persistence'],
      confidence: 'high',
      type: 'explanation',
      metadata: {}
    });

    // Retrieve with new tool instance
    const tool2 = new GetRepositoryNotesTool();
    const result = await tool2.execute({ path: testPath });
    const data = JSON.parse(result.content[0].text!);

    expect(data.totalNotes).toBe(1);
    expect(data.notes[0].note).toBe('Persistence test');
  });
});