// Test file - any types used for mock data
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CreateRepositoryAnchoredNoteTool } from '../../src/core-mcp/tools/CreateRepositoryAnchoredNoteTool';
import { GetAnchoredNotesTool } from '../../src/core-mcp/tools/GetAnchoredNotesTool';
import { GetRepositoryTagsTool } from '../../src/core-mcp/tools/GetRepositoryTagsTool';
import { TEST_DIR } from '../setup';
import { withGuidanceToken, createTestGuidanceToken, createTestView } from '../test-helpers';

describe('File Operations Integration', () => {
  const testPath = path.join(TEST_DIR, 'file-ops-test');

  beforeEach(() => {
    // Clean up any existing test directory
    if (fs.existsSync(testPath)) {
      fs.rmSync(testPath, { recursive: true, force: true });
    }

    // Ensure TEST_DIR exists first
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(testPath, { recursive: true });
    // Create git directory for validation
    fs.mkdirSync(path.join(testPath, '.git'), { recursive: true });
    fs.writeFileSync(
      path.join(testPath, '.git', 'config'),
      '[core]\nrepositoryformatversion = 0\n'
    );
    createTestView(testPath, 'test-view');
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(testPath)) {
      fs.rmSync(testPath, { recursive: true, force: true });
    }
  });

  it('should complete full create-retrieve-query workflow', async () => {
    // Step 1: Create a note
    const createTool = new CreateRepositoryAnchoredNoteTool();
    const createResult = await createTool.execute(
      withGuidanceToken({
        note: '# Integration Test\\n\\nThis tests file operations.',
        directoryPath: testPath,
        anchors: [testPath],
        tags: ['integration', 'file-ops'],
        codebaseViewId: 'test-view',
        metadata: { test: true },
      })
    );

    expect(createResult.content[0].text).toContain('Note saved successfully');

    // Step 2: Verify note was written to filesystem
    const notesDir = path.join(testPath, '.a24z', 'notes');
    expect(fs.existsSync(notesDir)).toBe(true);

    // Step 3: Retrieve notes
    const getTool = new GetAnchoredNotesTool();
    const guidanceToken = createTestGuidanceToken(testPath);
    const getResult = await getTool.execute({
      path: testPath,
      includeParentNotes: true,
      filterReviewed: 'all',
      includeStale: true,
      sortBy: 'timestamp',
      limit: 10,
      offset: 0,
      includeMetadata: true,
      guidanceToken,
    });
    const getData = JSON.parse(getResult.content[0].text!);

    expect(getData.pagination.total).toBe(1);
    expect(getData.notes[0].note).toContain('Integration Test');

    // Step 4: Get tags
    const tagsTool = new GetRepositoryTagsTool();
    const tagsResult = await tagsTool.execute({
      path: testPath,
      includeUsedTags: true,
      includeSuggestedTags: true,
      includeGuidance: false,
      guidanceToken,
    });
    const tagsData = JSON.parse(tagsResult.content[0].text!);

    const tagNames = tagsData.usedTags.map((tag: any) => tag.name);
    expect(tagNames).toContain('integration');
    expect(tagNames).toContain('file-ops');
  });

  it('should handle concurrent file writes safely', async () => {
    const createTool = new CreateRepositoryAnchoredNoteTool();

    // Create 10 notes concurrently
    const promises = Array.from({ length: 10 }, (_: unknown, i: number) =>
      createTool.execute(
        withGuidanceToken({
          note: `Concurrent note ${i}`,
          directoryPath: testPath,
          anchors: [testPath],
          tags: [`tag-${i}`],
          codebaseViewId: 'test-view',
          metadata: { index: i },
        })
      )
    );

    const results = await Promise.all(promises);

    // All should succeed
    results.forEach((result) => {
      expect(result.content[0].text).toContain('Note saved successfully');
    });

    // Verify all were saved
    const getTool = new GetAnchoredNotesTool();
    const verifyToken = createTestGuidanceToken(testPath);
    const getResult = await getTool.execute({
      path: testPath,
      includeParentNotes: true,
      filterReviewed: 'all',
      includeStale: true,
      sortBy: 'timestamp',
      limit: 20,
      offset: 0,
      includeMetadata: true,
      guidanceToken: verifyToken,
    });
    const data = JSON.parse(getResult.content[0].text!);

    expect(data.pagination.total).toBe(10);
  });

  it('should persist notes across tool instances', async () => {
    // Create note with first tool instance
    const tool1 = new CreateRepositoryAnchoredNoteTool();
    await tool1.execute(
      withGuidanceToken({
        note: 'Persistence test',
        directoryPath: testPath,
        anchors: [testPath],
        tags: ['persistence'],
        codebaseViewId: 'test-view',
        metadata: {},
      })
    );

    // Retrieve with new tool instance
    const tool2 = new GetAnchoredNotesTool();
    const guidanceToken = createTestGuidanceToken(testPath);
    const result = await tool2.execute({
      path: testPath,
      includeParentNotes: true,
      filterReviewed: 'all',
      includeStale: true,
      sortBy: 'timestamp',
      limit: 10,
      offset: 0,
      includeMetadata: true,
      guidanceToken,
    });
    const data = JSON.parse(result.content[0].text!);

    expect(data.pagination.total).toBe(1);
    expect(data.notes[0].note).toBe('Persistence test');
  });
});
