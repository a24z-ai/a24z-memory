import { CreateRepositoryNoteTool } from '../../../src/core-mcp/tools/CreateRepositoryNoteTool';
import { GetRepositoryGuidanceTool } from '../../../src/core-mcp/tools/GetRepositoryGuidanceTool';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

describe('CreateRepositoryNoteTool - Token Refresh', () => {
  let tool: CreateRepositoryNoteTool;
  let guidanceTool: GetRepositoryGuidanceTool;
  let repoPath: string;
  const TEST_DIR = path.join(os.tmpdir(), 'a24z-memory-tests', Date.now().toString());

  beforeEach(() => {
    tool = new CreateRepositoryNoteTool();
    guidanceTool = new GetRepositoryGuidanceTool();

    // Set up test repository
    repoPath = path.join(TEST_DIR, 'test-repo');
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
    }
    fs.mkdirSync(repoPath, { recursive: true });
    // Create a .git directory to make it a valid git repo
    fs.mkdirSync(path.join(repoPath, '.git'), { recursive: true });
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should return a fresh guidance token when auto-creating new tags', async () => {
    // Get initial guidance token
    const guidanceResult = await guidanceTool.execute({
      path: repoPath,
      includeToken: true,
    });

    // Extract token from the response - look for the token after "Guidance Token" section
    const responseText = guidanceResult.content[0].text;
    const tokenMatch = responseText.match(/## Guidance Token[\s\S]*?`([^`]+)`/);
    expect(tokenMatch).toBeTruthy();
    const initialToken = tokenMatch![1];

    // Create a note with a new tag (which will be auto-created)
    const result = await tool.execute({
      note: 'Test note with new tag',
      directoryPath: repoPath,
      anchors: [path.join(repoPath, 'test.ts')],
      tags: ['new-auto-tag'],
      guidanceToken: initialToken,
    });

    const noteResponseText = result.content[0].text;

    // Should mention that a new tag was created
    expect(noteResponseText).toContain('New tags created with empty descriptions');
    expect(noteResponseText).toContain('new-auto-tag');

    // Should provide a fresh token
    expect(noteResponseText).toContain('Updated Guidance Token');
    expect(noteResponseText).toContain('Since new tags/types were created');

    // Extract the new token
    const newTokenMatch = noteResponseText.match(/Updated Guidance Token.*?`([^`]+)`/s);
    expect(newTokenMatch).toBeTruthy();
    const newToken = newTokenMatch![1];

    // Tokens should be different
    expect(newToken).not.toBe(initialToken);

    // The new token should be valid for another note creation
    const secondResult = await tool.execute({
      note: 'Another note using the refreshed token',
      directoryPath: repoPath,
      anchors: [path.join(repoPath, 'another.ts')],
      tags: ['new-auto-tag'], // Use the same tag, no new creation
      guidanceToken: newToken,
    });

    const secondResponseText = secondResult.content[0].text;
    expect(secondResponseText).toContain('Note saved successfully');
    // Should NOT provide another token since no new tags were created
    expect(secondResponseText).not.toContain('Updated Guidance Token');
  });

  it('should return a fresh guidance token when auto-creating new tags', async () => {
    // Get initial guidance token
    const guidanceResult = await guidanceTool.execute({
      path: repoPath,
      includeToken: true,
    });

    const responseText = guidanceResult.content[0].text;
    const tokenMatch = responseText.match(/## Guidance Token[\s\S]*?`([^`]+)`/);
    expect(tokenMatch).toBeTruthy();
    const initialToken = tokenMatch![1];

    // Create a note with a new tag (which will be auto-created)
    const result = await tool.execute({
      note: 'Test note with new tag',
      directoryPath: repoPath,
      anchors: [path.join(repoPath, 'test.ts')],
      tags: ['test-tag'], // This will be auto-created
      guidanceToken: initialToken,
    });

    const noteResponseText = result.content[0].text;

    // Should mention that a new tag was created
    expect(noteResponseText).toContain('New tags created with empty descriptions');
    expect(noteResponseText).toContain('test-tag');

    // Should provide a fresh token
    expect(noteResponseText).toContain('Updated Guidance Token');

    // Extract and verify the new token is different
    const newTokenMatch = noteResponseText.match(/Updated Guidance Token.*?`([^`]+)`/s);
    const newToken = newTokenMatch![1];
    expect(newToken).not.toBe(initialToken);
  });

  it('should not return a new token when no new tags/types are created', async () => {
    // First, create a note to establish some tags
    const guidanceResult = await guidanceTool.execute({
      path: repoPath,
      includeToken: true,
    });
    const responseText = guidanceResult.content[0].text;
    const tokenMatch = responseText.match(/## Guidance Token[\s\S]*?`([^`]+)`/);
    expect(tokenMatch).toBeTruthy();
    const initialToken = tokenMatch![1];

    // Create first note with new tags
    await tool.execute({
      note: 'First note',
      directoryPath: repoPath,
      anchors: [path.join(repoPath, 'first.ts')],
      tags: ['existing-tag'],
      guidanceToken: initialToken,
    });

    // Get a fresh token after the tags were created
    const secondGuidanceResult = await guidanceTool.execute({
      path: repoPath,
      includeToken: true,
    });
    const secondResponseText = secondGuidanceResult.content[0].text;
    const secondTokenMatch = secondResponseText.match(/## Guidance Token[\s\S]*?`([^`]+)`/);
    expect(secondTokenMatch).toBeTruthy();
    const secondToken = secondTokenMatch![1];

    // Create another note using existing tags
    const result = await tool.execute({
      note: 'Second note using existing tags',
      directoryPath: repoPath,
      anchors: [path.join(repoPath, 'second.ts')],
      tags: ['existing-tag'], // Reuse existing tag
      guidanceToken: secondToken,
    });

    const finalResponseText = result.content[0].text;

    // Should save successfully
    expect(finalResponseText).toContain('Note saved successfully');

    // Should NOT provide a new token since no new tags/types were created
    expect(finalResponseText).not.toContain('Updated Guidance Token');
    expect(finalResponseText).not.toContain('New tags created');
    expect(finalResponseText).not.toContain('New type created');
  });
});
