import * as fs from 'node:fs';
import * as path from 'node:path';
import { RepositoryNoteTool } from '../src/core-mcp/tools/RepositoryNoteTool';
import { TEST_DIR } from './setup';

describe('Minimal File Operations Test', () => {
  it('should create a note file on disk', async () => {
    const testPath = path.join(TEST_DIR, 'minimal-test');
    fs.mkdirSync(testPath, { recursive: true });

    const tool = new RepositoryNoteTool();
    const result = await tool.execute({
      note: 'Test note',
      directoryPath: testPath,
      tags: ['test'],
      confidence: 'medium' as const,
      type: 'explanation' as const
    });

    // Should succeed
    expect(result.content[0].text).toMatch(/^Saved note/);

    // Should create file
    const dataDir = process.env.A24Z_TEST_DATA_DIR!;
    const notesFile = path.join(dataDir, 'repository-notes.json');
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

    const tool = new RepositoryNoteTool();
    
    // Create 5 notes concurrently
    const promises = Array.from({ length: 5 }, (_, i) =>
      tool.execute({
        note: `Concurrent note ${i}`,
        directoryPath: testPath,
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
    const dataDir = process.env.A24Z_TEST_DATA_DIR!;
    const notesFile = path.join(dataDir, 'repository-notes.json');
    const data = JSON.parse(fs.readFileSync(notesFile, 'utf8'));
    expect(data.notes.length).toBeGreaterThanOrEqual(5);
  });
});