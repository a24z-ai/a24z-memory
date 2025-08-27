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
    // Ensure TEST_DIR exists first
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(testPath, { recursive: true });

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(testPath, '.git'), { recursive: true });

    // Create a package.json to make it look like a proper project root
    fs.writeFileSync(path.join(testPath, 'package.json'), '{}');
  });

  it('should return JSON response', async () => {
    const result = await tool.handler({ path: testPath });

    expect(result.content[0].type).toBe('text');
    const data = JSON.parse(result.content[0].text!);
    expect(data.success).toBe(true);
    expect(data.suggestedTags).toBeDefined();
    expect(Array.isArray(data.suggestedTags)).toBe(true);
  });

  it('should include used tags when notes exist', async () => {
    saveNote({
      note: 'Test note',
      directoryPath: testPath,
      tags: ['custom-tag'],
      anchors: [testPath],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
    });

    const result = await tool.handler({ path: testPath });
    const data = JSON.parse(result.content[0].text!);

    expect(data.usedTags.some((tag: { name: string }) => tag.name === 'custom-tag')).toBe(true);
  });

  it('should return empty suggested tags (user-managed)', async () => {
    const authPath = path.join(testPath, 'auth');
    fs.mkdirSync(authPath, { recursive: true });

    const result = await tool.handler({ path: authPath });
    const data = JSON.parse(result.content[0].text!);

    expect(data.suggestedTags).toBeDefined();
    expect(Array.isArray(data.suggestedTags)).toBe(true);
    expect(data.suggestedTags).toHaveLength(0);
  });

  it('should include repository guidance by default', async () => {
    const result = await tool.handler({ path: testPath });
    const data = JSON.parse(result.content[0].text!);

    // Should include either repositoryGuidance or guidanceNote
    expect(data.repositoryGuidance || data.guidanceNote).toBeDefined();

    // Since no custom guidance exists, should have guidanceNote suggesting to create one
    if (data.guidanceNote) {
      expect(data.guidanceNote).toContain('No repository-specific guidance found');
    }
  });

  it('should include custom repository guidance when it exists', async () => {
    // Create custom guidance
    const a24zDir = path.join(testPath, '.a24z');
    fs.mkdirSync(a24zDir, { recursive: true });
    const customGuidance = '# Custom Project Guidance\n\nThis is specific to our project.';
    fs.writeFileSync(path.join(a24zDir, 'note-guidance.md'), customGuidance);

    const result = await tool.handler({ path: testPath });
    const data = JSON.parse(result.content[0].text!);

    expect(data.repositoryGuidance).toBe(customGuidance);
    expect(data.guidanceNote).toBeUndefined();
  });

  it('should exclude guidance when includeGuidance is false', async () => {
    const result = await tool.handler({
      path: testPath,
      includeGuidance: false,
    });
    const data = JSON.parse(result.content[0].text!);

    expect(data.repositoryGuidance).toBeUndefined();
    expect(data.guidanceNote).toBeUndefined();
  });

  it('should allow selective inclusion of tag types', async () => {
    const result = await tool.handler({
      path: testPath,
      includeUsedTags: false,
      includeSuggestedTags: false,
      includeGuidance: false,
    });
    const data = JSON.parse(result.content[0].text!);

    expect(data.usedTags).toBeUndefined();
    expect(data.suggestedTags).toBeUndefined(); // Excluded since includeSuggestedTags: false
    expect(data.repositoryGuidance).toBeUndefined();
    expect(data.guidanceNote).toBeUndefined();
  });
});
