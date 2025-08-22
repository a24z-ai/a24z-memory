import * as fs from 'node:fs';
import * as path from 'node:path';
import { RepositoryNoteTool } from '../src/core-mcp/tools/RepositoryNoteTool';
import { TEST_DIR } from './setup';

describe('Minimal File Operations Test', () => {
  it('should create a note file on disk', async () => {
    const testPath = path.join(TEST_DIR, 'minimal-test');
    fs.mkdirSync(testPath, { recursive: true });
    
    // Create a .git directory to make this a git repository
    fs.mkdirSync(path.join(testPath, '.git'), { recursive: true });

    const tool = new RepositoryNoteTool();
    const result = await tool.execute({
      note: 'Test note',
      directoryPath: testPath,
      anchors: ['test-file.ts'],
      tags: ['test'],
      confidence: 'medium' as const,
      type: 'explanation' as const
    });

    // Should succeed
    expect(result.content[0].text).toMatch(/^Saved note/);

    // Should create .a24z directory and notes file
    const notesFile = path.join(testPath, '.a24z', 'repository-notes.json');
    expect(fs.existsSync(notesFile)).toBe(true);

    // Should contain our data
    const fileContent = fs.readFileSync(notesFile, 'utf8');
    const data = JSON.parse(fileContent);
    expect(data.notes).toHaveLength(1);
    expect(data.notes[0].note).toBe('Test note');
  });

  it('should handle concurrent writes', async () => {
    const testPath = path.join(TEST_DIR, 'concurrent-test');
    fs.mkdirSync(testPath, { recursive: true });
    
    // Create a .git directory to make this a git repository
    fs.mkdirSync(path.join(testPath, '.git'), { recursive: true });

    const tool = new RepositoryNoteTool();
    
    // Create 5 notes concurrently
    const promises = Array.from({ length: 5 }, (_, i) =>
      tool.execute({
        note: `Concurrent note ${i}`,
        directoryPath: testPath,
        anchors: [`file-${i}.ts`],
        tags: ['concurrent'],
        confidence: 'medium' as const,
        type: 'explanation' as const
      })
    );

    const results = await Promise.all(promises);
    
    // All should succeed
    results.forEach(result => {
      expect(result.content[0].text).toMatch(/^Saved note/);
    });

    // All should be saved
    const notesFile = path.join(testPath, '.a24z', 'repository-notes.json');
    const data = JSON.parse(fs.readFileSync(notesFile, 'utf8'));
    expect(data.notes.length).toBeGreaterThanOrEqual(5);
  });
});