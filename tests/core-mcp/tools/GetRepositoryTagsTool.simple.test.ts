import * as fs from 'node:fs';
import * as path from 'node:path';
import { GetRepositoryTagsTool } from '../../../src/core-mcp/tools/GetRepositoryTagsTool';
import { saveNote } from '../../../src/core-mcp/store/notesStore';
import { TEST_DIR } from '../../setup';

describe('GetRepositoryTagsTool (Simple)', () => {
  let tool: GetRepositoryTagsTool;
  const testPath = path.join(TEST_DIR, 'test-repo');

  beforeEach(() => {
    tool = new GetRepositoryTagsTool();
    fs.mkdirSync(testPath, { recursive: true });
  });

  it('should return JSON response with common tags', async () => {
    const result = await tool.execute({ path: testPath });
    
    expect(result.content[0].type).toBe('text');
    const data = JSON.parse(result.content[0].text!);
    expect(data.success).toBe(true);
    expect(data.commonTags).toBeDefined();
    expect(Array.isArray(data.commonTags)).toBe(true);
  });

  it('should include used tags when notes exist', async () => {
    saveNote({
      note: 'Test note',
      directoryPath: testPath,
      tags: ['custom-tag'],
      anchors: [testPath],
      confidence: 'high',
      type: 'explanation',
      metadata: {}
    });

    const result = await tool.execute({ path: testPath });
    const data = JSON.parse(result.content[0].text!);
    
    expect(data.usedTags).toContain('custom-tag');
  });

  it('should suggest tags based on path', async () => {
    const authPath = path.join(testPath, 'auth');
    fs.mkdirSync(authPath, { recursive: true });

    const result = await tool.execute({ path: authPath });
    const data = JSON.parse(result.content[0].text!);
    
    expect(data.suggestedTags).toBeDefined();
    expect(data.suggestedTags.some((tag: any) => tag.name === 'authentication')).toBe(true);
  });
});