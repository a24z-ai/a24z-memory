// Test file - any types used for mock data
/* eslint-disable @typescript-eslint/no-explicit-any */

import { CreateRepositoryAnchoredNoteTool } from '../../src/mcp/tools/CreateRepositoryAnchoredNoteTool';
import { GetAnchoredNotesTool } from '../../src/mcp/tools/GetAnchoredNotesTool';
import { GetRepositoryTagsTool } from '../../src/mcp/tools/GetRepositoryTagsTool';
import { InMemoryFileSystemAdapter } from '../test-adapters/InMemoryFileSystemAdapter';
import { CodebaseViewsStore } from '../../src/pure-core/stores/CodebaseViewsStore';
import { MemoryPalace } from '../../src/MemoryPalace';
import type { ValidatedRepositoryPath, CodebaseView } from '../../src/pure-core/types';

describe('File Operations Integration', () => {
  const testPath = '/file-ops-test';

  let fsAdapter: InMemoryFileSystemAdapter;
  let codebaseViewsStore: CodebaseViewsStore;
  let validatedRepoPath: ValidatedRepositoryPath;

  beforeEach(() => {
    // Initialize in-memory filesystem and stores
    fsAdapter = new InMemoryFileSystemAdapter();
    codebaseViewsStore = new CodebaseViewsStore(fsAdapter);

    // Set up test repository
    fsAdapter.setupTestRepo(testPath);
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fsAdapter, testPath);

    // Create a test view
    const testView: CodebaseView = {
      id: 'test-view',
      version: '1.0.0',
      name: 'Test View',
      description: 'Test view for testing',
      overviewPath: 'README.md',
      cells: {
        'cell-1': {
          patterns: ['src/**/*.ts'],
          coordinates: [0, 0],
        },
      },
      timestamp: Date.now().toString(),
    };
    codebaseViewsStore.saveView(validatedRepoPath, testView);
  });

  afterEach(() => {
    // Clean up is handled automatically by InMemoryFileSystemAdapter
  });

  it('should complete full create-retrieve-query workflow', async () => {
    // Step 1: Create a note
    const createTool = new CreateRepositoryAnchoredNoteTool(fsAdapter);
    const createResult = await createTool.execute({
      note: '# Integration Test\\n\\nThis tests file operations.',
      directoryPath: testPath,
      anchors: [testPath],
      tags: ['integration', 'file-ops'],
      codebaseViewId: 'test-view',
      metadata: { test: true },
    });

    expect(createResult.content[0].text).toContain('Note saved successfully');

    // Step 2: Verify note was written to filesystem
    const notesDir = fsAdapter.join(testPath, '.a24z', 'notes');
    expect(fsAdapter.exists(notesDir)).toBe(true);

    // Step 3: Retrieve notes
    const getTool = new GetAnchoredNotesTool(fsAdapter);
    const getResult = await getTool.execute({
      path: testPath,
      includeParentNotes: true,
      filterReviewed: 'all',
      includeStale: true,
      sortBy: 'timestamp',
      limit: 10,
      offset: 0,
      includeMetadata: true,
    });
    const getData = JSON.parse(getResult.content[0].text!);

    expect(getData.pagination.total).toBe(1);
    expect(getData.notes[0].note).toContain('Integration Test');

    // Step 4: Get tags
    const tagsTool = new GetRepositoryTagsTool(fsAdapter);
    const tagsResult = await tagsTool.execute({
      path: testPath,
      includeUsedTags: true,
      includeGuidance: false,
    });
    const tagsData = JSON.parse(tagsResult.content[0].text!);

    const tagNames = tagsData.usedTags.map((tag: any) => tag.name);
    expect(tagNames).toContain('integration');
    expect(tagNames).toContain('file-ops');
  });

  it('should handle concurrent file writes safely', async () => {
    const createTool = new CreateRepositoryAnchoredNoteTool(fsAdapter);

    // Create 10 notes concurrently
    const promises = Array.from({ length: 10 }, (_: unknown, i: number) =>
      createTool.execute({
        note: `Concurrent note ${i}`,
        directoryPath: testPath,
        anchors: [testPath],
        tags: [`tag-${i}`],
        codebaseViewId: 'test-view',
        metadata: { index: i },
      })
    );

    const results = await Promise.all(promises);

    // All should succeed
    results.forEach((result) => {
      expect(result.content[0].text).toContain('Note saved successfully');
    });

    // Verify all were saved
    const getTool = new GetAnchoredNotesTool(fsAdapter);
    const getResult = await getTool.execute({
      path: testPath,
      includeParentNotes: true,
      filterReviewed: 'all',
      includeStale: true,
      sortBy: 'timestamp',
      limit: 20,
      offset: 0,
      includeMetadata: true,
    });
    const data = JSON.parse(getResult.content[0].text!);

    expect(data.pagination.total).toBe(10);
  });

  it('should persist notes across tool instances', async () => {
    // Create note with first tool instance
    const fs = new InMemoryFileSystemAdapter();
    fs.setupTestRepo(testPath);
    const validatedPath = MemoryPalace.validateRepositoryPath(fs, testPath);

    // Create a test view for the new instance
    const codebaseViewsStore = new CodebaseViewsStore(fs);
    const testView: CodebaseView = {
      id: 'test-view',
      version: '1.0.0',
      name: 'Test View',
      description: 'Test view for testing',
      overviewPath: 'README.md',
      cells: {
        'cell-1': {
          patterns: ['src/**/*.ts'],
          coordinates: [0, 0],
        },
      },
      timestamp: Date.now().toString(),
    };
    codebaseViewsStore.saveView(validatedPath, testView);

    const tool1 = new CreateRepositoryAnchoredNoteTool(fs);
    await tool1.execute({
      note: 'Persistence test',
      directoryPath: testPath,
      anchors: [testPath],
      tags: ['persistence'],
      codebaseViewId: 'test-view',
      metadata: {},
    });

    // Retrieve with new tool instance
    const tool2 = new GetAnchoredNotesTool(fs);
    const result = await tool2.execute({
      path: testPath,
      includeParentNotes: true,
      filterReviewed: 'all',
      includeStale: true,
      sortBy: 'timestamp',
      limit: 10,
      offset: 0,
      includeMetadata: true,
    });
    const data = JSON.parse(result.content[0].text!);

    expect(data.pagination.total).toBe(1);
    expect(data.notes[0].note).toBe('Persistence test');
  });
});
